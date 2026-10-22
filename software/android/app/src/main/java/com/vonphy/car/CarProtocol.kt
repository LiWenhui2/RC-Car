package com.vonphy.car

import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.UUID

object CarProtocol {
    val SERVICE: UUID = UUID.fromString("a9140001-7e6b-4a40-a862-cb008ab14e01")
    val CONTROL: UUID = UUID.fromString("a9140002-7e6b-4a40-a862-cb008ab14e01")
    val MANAGEMENT: UUID = UUID.fromString("a9140003-7e6b-4a40-a862-cb008ab14e01")
    val STATUS: UUID = UUID.fromString("a9140004-7e6b-4a40-a862-cb008ab14e01")
    val CCCD: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
    const val ARM = 1
    const val LOCK = 2
    const val ESTOP = 3

    fun control(throttle: Int, steering: Int, sequence: Int): ByteArray =
        ByteBuffer.allocate(10).order(ByteOrder.LITTLE_ENDIAN)
            .putShort(throttle.coerceIn(-1000, 1000).toShort())
            .putShort(steering.coerceIn(-1000, 1000).toShort())
            .putShort(0.toShort()).putInt(sequence).array()

    fun status(bytes: ByteArray): VehicleStatus? {
        if (bytes.size != 12 || bytes[0].toInt() != 1) return null
        val b = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
        b.position(4)
        val applied = b.short.toInt()
        val steering = b.short.toInt()
        val sequence = b.int.toLong() and 0xffffffffL
        val state = bytes[1].toInt()
        val reason = bytes[2].toInt()
        if (state !in 0..1 || reason !in 0..7 || applied !in -1000..1000 || steering !in -1000..1000) return null
        return VehicleStatus(state == 1, reason, applied, steering, sequence)
    }
}

data class VehicleStatus(
    val armed: Boolean, val reason: Int, val applied: Int, val steering: Int, val sequence: Long
) {
    val description: String get() = if (armed) "已解锁 · 可以驾驶" else when (reason) {
        1 -> "上电锁定"
        2 -> "连接已重置，请重新解锁"
        3 -> "控制心跳超时，已停车"
        4 -> "急停已生效"
        5 -> "已锁定"
        6 -> "指令异常，已停车"
        7 -> "请松开两个控件，回中后再解锁"
        else -> "未解锁"
    }
}
