#pragma once
#include <stdint.h>
#include <stdlib.h>

// No Arduino/BLE dependencies: one owner (loop) drives this state machine.
struct __attribute__((packed)) ControlPacket {
  int16_t throttle;
  int16_t steering;
  uint16_t buttons;
  uint32_t sequence;
};
static_assert(sizeof(ControlPacket) == 10, "Wire protocol must be 10 bytes");

class VehicleSafety {
public:
  enum Reason : uint8_t { NONE, BOOT, CONNECTION, TIMEOUT, ESTOP, LOCKED, INVALID, NOT_NEUTRAL };
  bool connected = false;
  bool armed = false;
  uint8_t reason = BOOT;
  int16_t applied = 0;
  ControlPacket target = {};
  uint32_t lastPacket = 0;
  bool havePacket = false;
  bool neutralAfterLock = false;

  void lock(uint8_t why) {
    armed = false; applied = 0; reason = why; neutralAfterLock = false;
    target.throttle = 0; target.steering = 0;
  }
  void connection(bool value) {
    connected = value; havePacket = false; target = {}; lastPacket = 0;
    lock(CONNECTION);
  }
  bool accept(const ControlPacket &packet, uint32_t now) {
    if (!connected) return false;
    if (packet.throttle < -1000 || packet.throttle > 1000 ||
        packet.steering < -1000 || packet.steering > 1000 || (packet.buttons & ~1U)) {
      lock(INVALID); return false;
    }
    if (packet.buttons & 1U) { lock(ESTOP); return false; }
    // Unsigned difference accepts wraparound but rejects duplicates/old packets.
    const uint32_t delta = packet.sequence - target.sequence;
    if (havePacket && (delta == 0 || delta >= 0x80000000UL)) return false;
    target = packet; lastPacket = now; havePacket = true;
    neutralAfterLock = abs(packet.throttle) <= 50 && abs(packet.steering) <= 50;
    return true;
  }
  void command(uint8_t opcode, uint32_t now) {
    if (opcode == 3) { lock(ESTOP); return; }
    if (opcode == 2) { lock(LOCKED); return; }
    if (opcode != 1) { lock(INVALID); return; }
    if (!connected || !havePacket || now - lastPacket > 100) { lock(TIMEOUT); return; }
    if (!neutralAfterLock || abs(target.throttle) > 50 || abs(target.steering) > 50) { lock(NOT_NEUTRAL); return; }
    armed = true; applied = 0; reason = NONE;
  }
  void checkTimeout(uint32_t now) {
    if (havePacket && now - lastPacket > 100 && reason != TIMEOUT) lock(TIMEOUT);
  }
  void step() {
    if (!armed) { applied = 0; return; }
    const bool reversing = (applied > 0 && target.throttle < 0) || (applied < 0 && target.throttle > 0);
    const int16_t destination = reversing ? 0 : target.throttle;
    const int step = (reversing || abs(destination) < abs(applied)) ? 40 : 16;
    if (destination > applied) applied += (destination - applied > step) ? step : destination - applied;
    else applied -= (applied - destination > step) ? step : applied - destination;
  }
};
