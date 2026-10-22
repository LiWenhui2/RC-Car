// RC-Car vehicle board B: TB6612FNG dual-motor bench test.
// Keep both driven wheels off the ground while running this sketch.

// Motor A (one rear wheel).
constexpr uint8_t MOTOR_AIN1_PIN = 3;
constexpr uint8_t MOTOR_AIN2_PIN = 4;
constexpr uint8_t MOTOR_PWMA_PIN = 5;

// Motor B (the other rear wheel). These pins are also reserved for future
// four-wheel differential expansion in the project architecture.
constexpr uint8_t MOTOR_BIN1_PIN = 7;
constexpr uint8_t MOTOR_BIN2_PIN = 10;
constexpr uint8_t MOTOR_PWMB_PIN = 20;

constexpr uint8_t MOTOR_STBY_PIN = 6;
constexpr uint32_t PWM_FREQUENCY_HZ = 20000;
constexpr uint8_t PWM_RESOLUTION_BITS = 8;
constexpr uint8_t TEST_PWM = 180;

void stopAll() {
  ledcWrite(MOTOR_PWMA_PIN, 0);
  ledcWrite(MOTOR_PWMB_PIN, 0);
  digitalWrite(MOTOR_AIN1_PIN, LOW);
  digitalWrite(MOTOR_AIN2_PIN, LOW);
  digitalWrite(MOTOR_BIN1_PIN, LOW);
  digitalWrite(MOTOR_BIN2_PIN, LOW);
}

void motorA(int16_t command) {
  digitalWrite(MOTOR_AIN1_PIN, command > 0 ? HIGH : LOW);
  digitalWrite(MOTOR_AIN2_PIN, command < 0 ? HIGH : LOW);
  ledcWrite(MOTOR_PWMA_PIN, abs(command));
}

void motorB(int16_t command) {
  digitalWrite(MOTOR_BIN1_PIN, command > 0 ? HIGH : LOW);
  digitalWrite(MOTOR_BIN2_PIN, command < 0 ? HIGH : LOW);
  ledcWrite(MOTOR_PWMB_PIN, abs(command));
}

void runStep(const char *message, int16_t commandA, int16_t commandB,
             uint32_t durationMs) {
  Serial.println(message);
  motorA(commandA);
  motorB(commandB);
  delay(durationMs);
  stopAll();
  delay(2000);
}

void setup() {
  Serial.begin(115200);
  delay(3000);

  pinMode(MOTOR_AIN1_PIN, OUTPUT);
  pinMode(MOTOR_AIN2_PIN, OUTPUT);
  pinMode(MOTOR_BIN1_PIN, OUTPUT);
  pinMode(MOTOR_BIN2_PIN, OUTPUT);
  pinMode(MOTOR_STBY_PIN, OUTPUT);

  digitalWrite(MOTOR_STBY_PIN, LOW);
  digitalWrite(MOTOR_AIN1_PIN, LOW);
  digitalWrite(MOTOR_AIN2_PIN, LOW);
  digitalWrite(MOTOR_BIN1_PIN, LOW);
  digitalWrite(MOTOR_BIN2_PIN, LOW);

  const bool pwmAOk = ledcAttach(MOTOR_PWMA_PIN, PWM_FREQUENCY_HZ,
                                 PWM_RESOLUTION_BITS);
  const bool pwmBOk = ledcAttach(MOTOR_PWMB_PIN, PWM_FREQUENCY_HZ,
                                 PWM_RESOLUTION_BITS);
  if (!pwmAOk || !pwmBOk) {
    Serial.println("ERROR: PWM setup failed; driver will remain disabled.");
    while (true) {
      delay(1000);
    }
  }

  stopAll();
  Serial.println();
  Serial.println("=== Vehicle dual-motor bench test ===");
  Serial.println("Starting in 5 seconds. Lift both driven wheels.");
  delay(5000);
  digitalWrite(MOTOR_STBY_PIN, HIGH);
}

void loop() {
  runStep("STEP 1: motor A forward", TEST_PWM, 0, 1000);
  runStep("STEP 2: motor B forward", 0, TEST_PWM, 1000);
  runStep("STEP 3: both motors forward", TEST_PWM, TEST_PWM, 1500);
  runStep("STEP 4: both motors reverse", -TEST_PWM, -TEST_PWM, 1500);

  Serial.println("Cycle complete; stopped for 5 seconds");
  stopAll();
  delay(5000);
}
