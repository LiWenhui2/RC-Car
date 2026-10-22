@file:Suppress("DEPRECATION", "MissingPermission")

package com.vonphy.car

import android.bluetooth.*
import android.bluetooth.le.*
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.os.ParcelUuid
import android.os.SystemClock
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

data class FoundCar(val device: BluetoothDevice, val name: String, val address: String, val rssi: Int)

/** All mutable state and GATT operations are confined to the main looper. */
class CarBleClient(context: Context) {
    private val context = context.applicationContext
    private val handler = Handler(Looper.getMainLooper())
    private val adapter get() = context.getSystemService(BluetoothManager::class.java)?.adapter
    var message by mutableStateOf("打开小车电源，点击扫描")
        private set
    var cars by mutableStateOf<List<FoundCar>>(emptyList())
        private set
    var scanning by mutableStateOf(false)
        private set
    var connecting by mutableStateOf(false)
        private set
    var ready by mutableStateOf(false)
        private set
    var status by mutableStateOf<VehicleStatus?>(null)
        private set
    var throttle by mutableStateOf(0)
        private set
    var steering by mutableStateOf(0)
        private set
    var speedLimit by mutableStateOf(0.30f)
        private set
    var armRequested by mutableStateOf(false)
        private set
    private var gatt: BluetoothGatt? = null
    private var control: BluetoothGattCharacteristic? = null
    private var management: BluetoothGattCharacteristic? = null
    private var active = false
    private var sequence = 0
    private var busy = false
    private var operationStarted = 0L
    private var lastStatus = 0L
    private var neutralWrites = 0
    private var pendingManagement: Int? = null
    private var inhibitDrive = true
    private var driveRequested = false
    private var armCommandSent = false
    private var armStarted = 0L
    private val setupTimeout = Runnable { if (!ready && gatt != null) disconnect("连接超时，请靠近小车后重试") }
    private val scanTimeout = Runnable {
        stopScan()
        if (cars.isEmpty()) message = "没有发现小车：确认已烧录 BLE 固件并开启蓝牙；Android 11 及以下还需开启定位"
    }

    fun setActive(value: Boolean) {
        active = value
        if (!value) disconnect("已离开控制界面，连接已关闭并停车")
    }

    fun showMessage(value: String) { message = value }

    fun scan() {
        disconnect("")
        if (adapter?.isEnabled != true) { message = "请先打开手机蓝牙"; return }
        cars = emptyList()
        runCatching {
            val scanner = adapter?.bluetoothLeScanner ?: error("手机不支持 BLE 扫描")
            scanner.startScan(
                listOf(ScanFilter.Builder().setServiceUuid(ParcelUuid(CarProtocol.SERVICE)).build()),
                ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build(), scanCallback
            )
            scanning = true
            message = "正在扫描 RC-Car…"
            handler.postDelayed(scanTimeout, 10000)
        }.onFailure { message = "扫描失败，请检查蓝牙及附近设备权限" }
    }

    fun stopScan() {
        handler.removeCallbacks(scanTimeout)
        if (scanning) runCatching { adapter?.bluetoothLeScanner?.stopScan(scanCallback) }
        scanning = false
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            handler.post {
                if (!scanning) return@post
                val address = result.device.address
                val car = FoundCar(result.device, result.scanRecord?.deviceName ?: "RC-Car-V1", address, result.rssi)
                cars = (cars.filterNot { it.address == address } + car).sortedByDescending { it.rssi }
                message = "发现 ${cars.size} 辆小车，点击连接"
            }
        }
        override fun onScanFailed(errorCode: Int) { handler.post { stopScan(); message = "扫描失败（$errorCode），稍后重试" } }
    }

    fun connect(car: FoundCar) {
        disconnect("")
        if (!active) return
        connecting = true
        message = "正在连接 ${car.name}…"
        runCatching {
            gatt = car.device.connectGatt(context, false, callback, BluetoothDevice.TRANSPORT_LE)
            check(gatt != null)
            handler.postDelayed(setupTimeout, 12000)
        }.onFailure { disconnect("连接失败，请检查蓝牙权限") }
    }

    fun setLimit(value: Float) {
        speedLimit = value.coerceIn(0.1f, 1f)
        throttle = 0
    }

    fun setThrottle(value: Float) { throttle = if (canDrive()) (value * speedLimit * 1000).toInt().coerceIn(-1000, 1000) else 0 }
    fun setSteering(value: Float) { steering = if (canDrive()) (value * 1000).toInt().coerceIn(-1000, 1000) else 0 }
    fun canDrive() = active && ready && status?.armed == true && driveRequested && !inhibitDrive

    fun arm() {
        if (!ready || status == null || status?.armed == true || armRequested) return
        throttle = 0; steering = 0; neutralWrites = 0
        inhibitDrive = true; driveRequested = true; armCommandSent = false
        armRequested = true; armStarted = SystemClock.elapsedRealtime()
        message = "正在发送回中指令并请求解锁…"
    }

    fun stop(emergency: Boolean = false) {
        throttle = 0; steering = 0; inhibitDrive = true; driveRequested = false; armRequested = false
        pendingManagement = if (emergency) CarProtocol.ESTOP else CarProtocol.LOCK
        if (ready && !busy) sendNext()
    }

    fun disconnect(reason: String = "已断开，小车将保持锁定") {
        stopScan()
        handler.removeCallbacks(heartbeat)
        handler.removeCallbacks(setupTimeout)
        val old = gatt
        gatt = null
        ready = false; connecting = false; busy = false; control = null; management = null
        status = null; throttle = 0; steering = 0; inhibitDrive = true; driveRequested = false; armRequested = false
        pendingManagement = null; neutralWrites = 0
        runCatching { old?.disconnect() }
        runCatching { old?.close() }
        if (reason.isNotEmpty()) message = reason
    }

    private val heartbeat = object : Runnable {
        override fun run() {
            if (!active || !ready) return
            val now = SystemClock.elapsedRealtime()
            if (now - lastStatus > 1500) { disconnect("车辆状态超时，已断开并停车"); return }
            if (busy && now - operationStarted > 250) { disconnect("蓝牙发送阻塞，已断开并停车"); return }
            if (armRequested && now - armStarted > 2000) {
                stop(); message = "解锁未确认，请检查车辆状态后重试"
            }
            if (!busy) sendNext()
            handler.postDelayed(this, 50)
        }
    }

    private fun sendNext() {
        val current = gatt ?: return
        val command = pendingManagement ?: if (armRequested && !armCommandSent && neutralWrites >= 2) CarProtocol.ARM else null
        val characteristic = if (command == null) control else management
        if (characteristic == null) return
        if (command != null) pendingManagement = null
        if (command == CarProtocol.ARM) { armCommandSent = true }
        val bytes = if (command != null) byteArrayOf(command.toByte()) else
            CarProtocol.control(if (canDrive()) throttle else 0, if (canDrive()) steering else 0, ++sequence)
        characteristic.writeType = BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
        characteristic.value = bytes
        busy = true; operationStarted = SystemClock.elapsedRealtime()
        val accepted = runCatching { current.writeCharacteristic(characteristic) }.getOrDefault(false)
        if (!accepted) disconnect("指令发送失败，已断开并停车")
    }

    private fun receiveStatus(value: ByteArray) {
        val parsed = CarProtocol.status(value) ?: run { disconnect("车辆协议不匹配，请检查固件"); return }
        status = parsed
        lastStatus = SystemClock.elapsedRealtime()
        if (!parsed.armed) {
            throttle = 0; steering = 0; inhibitDrive = true
            if (!armRequested) driveRequested = false
        } else if (driveRequested && armCommandSent && pendingManagement == null) {
            armRequested = false
            inhibitDrive = false
        }
        message = parsed.description
    }

    private val callback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(current: BluetoothGatt, result: Int, newState: Int) {
            handler.post {
                if (gatt !== current) return@post
                if (result != BluetoothGatt.GATT_SUCCESS || newState == BluetoothProfile.STATE_DISCONNECTED) {
                    disconnect("蓝牙已断开（$result），小车已锁定")
                } else if (newState == BluetoothProfile.STATE_CONNECTED) {
                    current.requestConnectionPriority(BluetoothGatt.CONNECTION_PRIORITY_HIGH)
                    message = "已连接，正在检查车辆服务…"
                    if (!current.discoverServices()) disconnect("无法读取车辆服务")
                }
            }
        }
        override fun onServicesDiscovered(current: BluetoothGatt, result: Int) {
            handler.post {
                if (gatt !== current) return@post
                val service = current.getService(CarProtocol.SERVICE)
                control = service?.getCharacteristic(CarProtocol.CONTROL)
                management = service?.getCharacteristic(CarProtocol.MANAGEMENT)
                val telemetry = service?.getCharacteristic(CarProtocol.STATUS)
                val descriptor = telemetry?.getDescriptor(CarProtocol.CCCD)
                if (result != BluetoothGatt.GATT_SUCCESS || control == null || management == null || telemetry == null || descriptor == null) {
                    disconnect("设备不兼容，请烧录配套 RC-Car BLE 固件"); return@post
                }
                if (!current.setCharacteristicNotification(telemetry, true)) { disconnect("无法开启车辆状态通知"); return@post }
                descriptor.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                if (!current.writeDescriptor(descriptor)) disconnect("无法订阅车辆状态")
            }
        }
        override fun onDescriptorWrite(current: BluetoothGatt, descriptor: BluetoothGattDescriptor, result: Int) {
            handler.post {
                if (gatt !== current) return@post
                if (result != BluetoothGatt.GATT_SUCCESS) { disconnect("订阅失败（$result）"); return@post }
                ready = true; connecting = false; lastStatus = SystemClock.elapsedRealtime()
                handler.removeCallbacks(setupTimeout)
                pendingManagement = CarProtocol.LOCK
                message = "连接完成，等待车辆状态…"
                handler.post(heartbeat)
            }
        }
        override fun onCharacteristicWrite(current: BluetoothGatt, characteristic: BluetoothGattCharacteristic, result: Int) {
            handler.post {
                if (gatt !== current) return@post
                busy = false
                if (result != BluetoothGatt.GATT_SUCCESS) { disconnect("车辆写入失败（$result），已停车"); return@post }
                if (characteristic.uuid == CarProtocol.CONTROL && throttle == 0 && steering == 0) neutralWrites++
                // Management must not consume a whole 50ms control-heartbeat slot.
                if (pendingManagement != null || (armRequested && !armCommandSent && neutralWrites >= 2) ||
                    characteristic.uuid == CarProtocol.MANAGEMENT) sendNext()
            }
        }
        override fun onCharacteristicChanged(current: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
            val value = characteristic.value?.clone() ?: return
            handler.post { if (gatt === current) receiveStatus(value) }
        }
        override fun onCharacteristicChanged(current: BluetoothGatt, characteristic: BluetoothGattCharacteristic, value: ByteArray) {
            val copy = value.clone()
            handler.post { if (gatt === current) receiveStatus(copy) }
        }
    }
}
