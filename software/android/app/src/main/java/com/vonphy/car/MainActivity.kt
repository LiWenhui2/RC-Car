package com.vonphy.car

import android.Manifest
import android.content.Intent
import android.bluetooth.BluetoothAdapter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import kotlin.math.abs
import kotlin.math.min

class MainActivity : ComponentActivity() {
    private lateinit var car: CarBleClient
    private val permissions = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
        if (result.values.all { it }) scanWithPermissions() else car.showMessage("请允许附近设备权限；Android 11 及以下需要定位权限用于 BLE 扫描")
    }
    private val bluetoothLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) {
        scanWithPermissions()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        car = CarBleClient(this)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        setContent {
            MaterialTheme(colorScheme = darkColorScheme(
                primary = Color(0xFF55DFC2), background = Color(0xFF101820), surface = Color(0xFF192630)
            )) {
                Surface(Modifier.fillMaxSize()) { ControllerScreen(car, ::scanWithPermissions, ::enableBluetooth) }
            }
        }
    }

    private fun enableBluetooth() {
        runCatching { bluetoothLauncher.launch(Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)) }
            .onFailure { car.showMessage("请在系统设置中开启蓝牙，并允许附近设备权限") }
    }

    private fun scanWithPermissions() {
        val required = if (Build.VERSION.SDK_INT >= 31)
            arrayOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT)
        else arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)
        if (required.all { ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED }) car.scan()
        else permissions.launch(required)
    }

    override fun onResume() { super.onResume(); if (::car.isInitialized) car.setActive(true) }
    override fun onPause() { if (::car.isInitialized) car.setActive(false); super.onPause() }
    override fun onDestroy() { if (::car.isInitialized) car.disconnect(); super.onDestroy() }
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (!hasFocus && ::car.isInitialized && car.ready) car.stop()
    }
}

@Composable
private fun ControllerScreen(car: CarBleClient, scan: () -> Unit, bluetooth: () -> Unit) {
    Column(Modifier.fillMaxSize().safeDrawingPadding().padding(horizontal = 20.dp, vertical = 8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("RC / CAR", fontSize = 23.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
            Text(car.message, modifier = Modifier.weight(1f), fontSize = 13.sp,
                color = if (car.canDrive()) MaterialTheme.colorScheme.primary else Color(0xFFFFCF87))
            if (car.ready || car.connecting) OutlinedButton(onClick = { car.disconnect() }) { Text("断开") }
            else {
                TextButton(onClick = bluetooth) { Text("开启蓝牙") }
                Button(onClick = if (car.scanning) ({ car.stopScan() }) else scan) { Text(if (car.scanning) "停止扫描" else "扫描小车") }
            }
        }
        if (!car.ready) {
            Column(Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (car.cars.isEmpty()) {
                    Spacer(Modifier.height(16.dp))
                    Text("手机直连 · BLE 控制", fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    Text("车辆需先烧录配套 BLE 固件。扫描、连接后，松开两侧控件并点击解锁。", color = Color.LightGray)
                    Text("默认限速 30% · 松手归零 · 急停锁定 · 100ms 车辆失联保护", color = MaterialTheme.colorScheme.primary)
                }
                car.cars.forEach { found ->
                    OutlinedCard(Modifier.fillMaxWidth()) {
                        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) { Text(found.name); Text("${found.address}  ·  ${found.rssi} dBm", fontSize = 12.sp) }
                            Button(onClick = { car.connect(found) }, enabled = !car.connecting) { Text("连接") }
                        }
                    }
                }
            }
        } else {
            Row(Modifier.weight(1f).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                AxisPad("油门", "前进 ↑ / ↓ 后退", true, car.throttle / (car.speedLimit * 1000), car.canDrive(), Modifier.weight(1f), car::setThrottle)
                Column(Modifier.width(184.dp).fillMaxHeight(), horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.SpaceEvenly) {
                    Text("最大油门 ${(car.speedLimit * 100).toInt()}%", fontWeight = FontWeight.Bold)
                    Slider(value = car.speedLimit, onValueChange = car::setLimit, valueRange = 0.1f..1f,
                        enabled = !car.canDrive())
                    Text("油门 ${car.status?.applied ?: 0}\n方向 ${car.status?.steering ?: 0}", fontSize = 13.sp)
                    Button(onClick = { if (car.canDrive()) car.stop() else car.arm() },
                        enabled = car.status != null && !car.armRequested,
                        modifier = Modifier.fillMaxWidth()) { Text(if (car.canDrive()) "锁定停车" else "回中并解锁") }
                    Button(onClick = { car.stop(true) }, modifier = Modifier.fillMaxWidth().height(54.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFC83942), contentColor = Color.White)) {
                        Text("急 停", fontSize = 21.sp, fontWeight = FontWeight.Bold)
                    }
                }
                AxisPad("转向", "左转 ← / → 右转", false, car.steering / 1000f, car.canDrive(), Modifier.weight(1f), car::setSteering)
            }
        }
        Text("${if (car.canDrive()) "驾驶中" else "安全锁定"}  ·  松手自动回中  ·  离开界面自动断开停车",
            modifier = Modifier.padding(top = 4.dp), fontSize = 11.sp, color = Color.LightGray)
    }
}

@Composable
private fun AxisPad(title: String, hint: String, vertical: Boolean, value: Float, enabled: Boolean,
                    modifier: Modifier, change: (Float) -> Unit) {
    val accent = if (enabled) MaterialTheme.colorScheme.primary else Color(0xFF61717D)
    val currentChange by rememberUpdatedState(change)
    Column(modifier.fillMaxHeight(), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(title, fontSize = 18.sp, fontWeight = FontWeight.Bold)
        Canvas(Modifier.weight(1f).fillMaxWidth().background(Color(0xFF192630), RoundedCornerShape(20.dp))
            .pointerInput(enabled, vertical) {
                if (!enabled) return@pointerInput
                fun update(position: Offset) {
                    val radius = min(size.width, size.height) * 0.32f
                    val raw = if (vertical) (size.height / 2f - position.y) / radius else (position.x - size.width / 2f) / radius
                    currentChange(if (abs(raw) < 0.08f) 0f else raw.coerceIn(-1f, 1f))
                }
                awaitEachGesture {
                    try {
                        val down = awaitFirstDown()
                        down.consume(); update(down.position)
                        while (true) {
                            val event = awaitPointerEvent()
                            val pointer = event.changes.firstOrNull { it.id == down.id } ?: break
                            pointer.consume()
                            if (!pointer.pressed) break
                            update(pointer.position)
                        }
                    } finally { currentChange(0f) }
                }
            }) {
            val radius = min(size.width, size.height) * 0.32f
            drawCircle(accent.copy(alpha = 0.35f), radius, center, style = Stroke(2.dp.toPx()))
            val vector = if (vertical) Offset(0f, radius) else Offset(radius, 0f)
            drawLine(accent.copy(alpha = 0.3f), center - vector, center + vector, 3.dp.toPx())
            val knob = if (vertical) center - Offset(0f, radius * value.coerceIn(-1f, 1f)) else center + Offset(radius * value.coerceIn(-1f, 1f), 0f)
            drawCircle(accent.copy(alpha = 0.18f), 33.dp.toPx(), knob)
            drawCircle(accent, 23.dp.toPx(), knob)
        }
        Text(hint, fontSize = 12.sp, color = Color.LightGray, modifier = Modifier.padding(top = 4.dp))
    }
}
