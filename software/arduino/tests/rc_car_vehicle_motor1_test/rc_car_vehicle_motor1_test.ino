// RC-Car vehicle board B: TB6612FNG channel-A single motor bench test.
// Keep the driven wheel(s) off the ground while running this sketch.

constexpr uint8_t MOTOR_AIN1_PIN = 3;
constexpr uint8_t MOTOR_AIN2_PIN = 4;
constexpr uint8_t MOTOR_PWMA_PIN = 5;
constexpr uint8_t MOTOR_STBY_PIN = 6;

constexpr uint32_t PWM_FREQUENCY_HZ = 20000;
constexpr uint8_t PWM_RESOLUTION_BITS = 8;
constexpr uint8_t TEST_PWM = 180;  // About 71% of 255, enough for TT motor startup.

void motorStop() {
  ledcWrite(MOTOR_PWMA_PIN, 0);
  digitalWrite(MOTOR_AIN1_PIN, LOW);
  digitalWrite(MOTOR_AIN2_PIN, LOW);
}

void motorForward(uint8_t pwm) {
  digitalWrite(MOTOR_AIN1_PIN, HIGH);
  digitalWrite(MOTOR_AIN2_PIN, LOW);
  ledcWrite(MOTOR_PWMA_PIN, pwm);
}

void motorReverse(uint8_t pwm) {
  digitalWrite(MOTOR_AIN1_PIN, LOW);
  digitalWrite(MOTOR_AIN2_PIN, HIGH);
  ledcWrite(MOTOR_PWMA_PIN, pwm);
}

void setup() {
  Serial.begin(115200);
  delay(3000);

  pinMode(MOTOR_AIN1_PIN, OUTPUT);
  pinMode(MOTOR_AIN2_PIN, OUTPUT);
  pinMode(MOTOR_STBY_PIN, OUTPUT);

  // Keep the driver disabled until all output pins are configured safely.
  digitalWrite(MOTOR_STBY_PIN, LOW);
  digitalWrite(MOTOR_AIN1_PIN, LOW);
  digitalWrite(MOTOR_AIN2_PIN, LOW);

  if (!ledcAttach(MOTOR_PWMA_PIN, PWM_FREQUENCY_HZ, PWM_RESOLUTION_BITS)) {
    Serial.println("ERROR: PWM setup failed; driver will remain disabled.");
    while (true) {
      delay(1000);
    }
  }
  ledcWrite(MOTOR_PWMA_PIN, 0);

  Serial.println();
  Serial.println("=== Vehicle motor 1 bench test ===");
  Serial.println("Starting in 5 seconds. Lift the wheel off the ground.");
  delay(5000);

  digitalWrite(MOTOR_STBY_PIN, HIGH);
}

void loop() {
  Serial.println("FORWARD: PWM=180 for 1 second");
  motorForward(TEST_PWM);
  delay(1000);

  Serial.println("STOP: 2 seconds");
  motorStop();
  delay(2000);

  Serial.println("REVERSE: PWM=180 for 1 second");
  motorReverse(TEST_PWM);
  delay(1000);

  Serial.println("STOP: 5 seconds");
  motorStop();
  delay(5000);
}
