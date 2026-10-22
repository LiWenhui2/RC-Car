package com.vonphy.car

import org.junit.Assert.*
import org.junit.Test

class CarProtocolTest {
    @Test fun controlIsExactlyTenBytesLittleEndianWithSignedAxes() {
        assertArrayEquals(byteArrayOf(0x18, 0xfc.toByte(), 0xe8.toByte(), 3, 0, 0, 4, 3, 2, 1),
            CarProtocol.control(-1000, 1000, 0x01020304))
    }
    @Test fun axesCannotExceedVehicleRange() {
        assertArrayEquals(CarProtocol.control(-1000, 1000, 0), CarProtocol.control(-9000, 9000, 0))
    }
    @Test fun parsesActualVehicleStateAndUnsignedSequence() {
        val parsed = CarProtocol.status(byteArrayOf(1, 1, 0, 0, 0x18, 0xfc.toByte(), 0xe8.toByte(), 3, -1, -1, -1, -1))!!
        assertTrue(parsed.armed)
        assertEquals(-1000, parsed.applied)
        assertEquals(1000, parsed.steering)
        assertEquals(4294967295L, parsed.sequence)
    }
    @Test fun malformedOrIncompatibleTelemetryIsRejected() {
        assertNull(CarProtocol.status(ByteArray(10)))
        assertNull(CarProtocol.status(ByteArray(12)))
        assertNull(CarProtocol.status(byteArrayOf(1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)))
    }
}
