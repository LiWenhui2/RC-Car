#pragma once
#include <Arduino.h>

// PCB mapping: existing rc_car_vehicle_remote_motor_test and AD PCB SOP.
// Define RC_CAR_PERFBOARD_V1 only for the separate 6x8 perfboard layout.
#if defined(RC_CAR_PERFBOARD_V1)
constexpr uint8_t AIN1 = 3, AIN2 = 4, PWMA = 10, BIN1 = 6, BIN2 = 5, PWMB = 20, STBY = 7;
#else
constexpr uint8_t AIN1 = 3, AIN2 = 4, PWMA = 5, BIN1 = 7, BIN2 = 10, PWMB = 20, STBY = 6;
#endif
constexpr uint8_t SERVO_PIN = 21;
constexpr uint16_t SERVO_LEFT = 1120, SERVO_CENTER = 1380, SERVO_RIGHT = 1640;

class VehicleHardware {
  uint16_t pulse = SERVO_CENTER;
  uint32_t lastServo = 0;
  void writeServo(uint16_t us) {
    pulse = us;
    ledcWrite(SERVO_PIN, static_cast<uint32_t>(us) * ((1UL << 14) - 1) / 20000);
  }
  void motor(uint8_t in1, uint8_t in2, uint8_t pwm, int16_t command) {
    digitalWrite(in1, command > 0 ? HIGH : LOW);
    digitalWrite(in2, command < 0 ? HIGH : LOW);
    ledcWrite(pwm, static_cast<uint32_t>(abs(command)) * 255 / 1000);
  }
public:
  bool begin() {
    for (uint8_t pin : {AIN1, AIN2, BIN1, BIN2, STBY}) { pinMode(pin, OUTPUT); digitalWrite(pin, LOW); }
    const bool a = ledcAttach(PWMA, 20000, 8);
    const bool b = ledcAttach(PWMB, 20000, 8);
    const bool s = ledcAttach(SERVO_PIN, 50, 14);
    if (!a || !b || !s) { digitalWrite(STBY, LOW); return false; }
    stop(); writeServo(SERVO_CENTER); return true;
  }
  void stop() {
    digitalWrite(STBY, LOW);
    ledcWrite(PWMA, 0); ledcWrite(PWMB, 0);
    for (uint8_t pin : {AIN1, AIN2, BIN1, BIN2}) digitalWrite(pin, LOW);
  }
  void output(int16_t throttle, int16_t steering, bool armed, uint32_t now) {
    if (!armed) { stop(); if (pulse != SERVO_CENTER) writeServo(SERVO_CENTER); return; }
    if (throttle == 0) stop();
    else {
      motor(AIN1, AIN2, PWMA, -throttle);
      motor(BIN1, BIN2, PWMB, -throttle);
      digitalWrite(STBY, HIGH);
    }
    if (now - lastServo >= 20) {
      lastServo = now;
      const int target = steering < 0 ? map(steering, -1000, 0, SERVO_LEFT, SERVO_CENTER)
                                     : map(steering, 0, 1000, SERVO_CENTER, SERVO_RIGHT);
      const int delta = constrain(target - static_cast<int>(pulse), -12, 12);
      if (delta) writeServo(pulse + delta);
    }
  }
};
