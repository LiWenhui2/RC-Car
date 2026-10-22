// RC-Car vehicle board B: MG995 steering-servo bench test.
// Commands in Serial Monitor: C=center, L=small left test, R=small right test.

constexpr uint8_t SERVO_SIGNAL_PIN = 21;
constexpr uint32_t SERVO_FREQUENCY_HZ = 50;
constexpr uint8_t SERVO_RESOLUTION_BITS = 14;
constexpr uint32_t SERVO_PERIOD_US = 20000;
constexpr uint32_t SERVO_MAX_DUTY = (1UL << SERVO_RESOLUTION_BITS) - 1;

// Conservative initial positions. Mechanical limits will be calibrated later.
constexpr uint16_t SERVO_CENTER_US = 1500;
constexpr uint16_t SERVO_LEFT_TEST_US = 1350;
constexpr uint16_t SERVO_RIGHT_TEST_US = 1650;
constexpr uint16_t SERVO_CALIBRATION_MIN_US = 1100;
constexpr uint16_t SERVO_CALIBRATION_MAX_US = 1900;
constexpr uint16_t SERVO_ADJUST_STEP_US = 10;

uint16_t currentPulseUs = SERVO_CENTER_US;

void writeServoPulse(uint16_t pulseUs) {
  pulseUs = constrain(pulseUs, SERVO_CALIBRATION_MIN_US,
                      SERVO_CALIBRATION_MAX_US);
  const uint32_t duty =
    (static_cast<uint32_t>(pulseUs) * SERVO_MAX_DUTY) / SERVO_PERIOD_US;
  ledcWrite(SERVO_SIGNAL_PIN, duty);
  currentPulseUs = pulseUs;
  Serial.printf("Servo command: %u us\n", currentPulseUs);
}

void setup() {
  Serial.begin(115200);

  // Start a valid center pulse immediately. Do not leave the servo signal
  // floating during the USB serial startup delay.
  if (!ledcAttach(SERVO_SIGNAL_PIN, SERVO_FREQUENCY_HZ,
                  SERVO_RESOLUTION_BITS)) {
    while (true) {
      delay(1000);
    }
  }

  const uint32_t centerDuty =
    (static_cast<uint32_t>(SERVO_CENTER_US) * SERVO_MAX_DUTY) /
    SERVO_PERIOD_US;
  ledcWrite(SERVO_SIGNAL_PIN, centerDuty);
  currentPulseUs = SERVO_CENTER_US;

  delay(3000);

  Serial.println();
  Serial.println("=== MG995 steering servo test ===");
  Serial.printf("Servo command: %u us (startup center)\n", currentPulseUs);
  Serial.println("Type a command in Serial Monitor, then press Enter:");
  Serial.println("C=center, L=1350 us, R=1650 us");
  Serial.println("A=-10 us, D=+10 us (fine calibration)");
}

void loop() {
  if (!Serial.available()) {
    delay(1);
    return;
  }

  const char command = static_cast<char>(Serial.read());
  if (command == 'c' || command == 'C') {
    writeServoPulse(SERVO_CENTER_US);
  } else if (command == 'l' || command == 'L') {
    writeServoPulse(SERVO_LEFT_TEST_US);
  } else if (command == 'r' || command == 'R') {
    writeServoPulse(SERVO_RIGHT_TEST_US);
  } else if (command == 'a' || command == 'A') {
    writeServoPulse(currentPulseUs - SERVO_ADJUST_STEP_US);
  } else if (command == 'd' || command == 'D') {
    writeServoPulse(currentPulseUs + SERVO_ADJUST_STEP_US);
  }
}
