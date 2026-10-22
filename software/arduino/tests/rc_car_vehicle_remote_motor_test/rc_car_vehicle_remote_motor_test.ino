#include <WiFi.h>
#include <esp_now.h>

constexpr uint8_t ESPNOW_CHANNEL = 6; 
constexpr uint32_t FAILSAFE_TIMEOUT_MS = 100;
constexpr uint32_t STATUS_PRINT_INTERVAL_MS = 250;

// The tested breadboard mapping remains the default.  The 6x8 cm perfboard
// build defines RC_CAR_PERFBOARD_V1 before including this program so four
// control signals become same-row copper links on the solder side.
#if defined(RC_CAR_PERFBOARD_V1)
constexpr uint8_t MOTOR_AIN1_PIN = 3;
constexpr uint8_t MOTOR_AIN2_PIN = 4;
constexpr uint8_t MOTOR_PWMA_PIN = 10;
constexpr uint8_t MOTOR_BIN1_PIN = 6;
constexpr uint8_t MOTOR_BIN2_PIN = 5;
constexpr uint8_t MOTOR_PWMB_PIN = 20;
constexpr uint8_t MOTOR_STBY_PIN = 7;
#else
constexpr uint8_t MOTOR_AIN1_PIN = 3;
constexpr uint8_t MOTOR_AIN2_PIN = 4;
constexpr uint8_t MOTOR_PWMA_PIN = 5;
constexpr uint8_t MOTOR_BIN1_PIN = 7;
constexpr uint8_t MOTOR_BIN2_PIN = 10;
constexpr uint8_t MOTOR_PWMB_PIN = 20;
constexpr uint8_t MOTOR_STBY_PIN = 6;
#endif
// Both motors are mounted with polarity opposite to the logical vehicle
// direction. Keep separate signs so either side can be corrected later.
constexpr int8_t MOTOR_A_DIRECTION = -1;
constexpr int8_t MOTOR_B_DIRECTION = -1;
constexpr uint32_t PWM_FREQUENCY_HZ = 20000;
constexpr uint8_t PWM_RESOLUTION_BITS = 8;
constexpr uint8_t MAX_TEST_PWM = 255;  // Full-scale 8-bit PWM (100% duty cycle).
constexpr int16_t NEUTRAL_LIMIT = 50;
constexpr int16_t THROTTLE_ACCEL_STEP = 80;  // Per received 50 ms packet.
constexpr int16_t THROTTLE_DECEL_STEP = 200;

// Verified MG995 steering calibration. Increasing pulse turns right.
constexpr uint8_t SERVO_SIGNAL_PIN = 21;
constexpr uint32_t SERVO_FREQUENCY_HZ = 50;
constexpr uint8_t SERVO_RESOLUTION_BITS = 14;
constexpr uint32_t SERVO_PERIOD_US = 20000;
constexpr uint32_t SERVO_MAX_DUTY = (1UL << SERVO_RESOLUTION_BITS) - 1;
constexpr uint16_t SERVO_LEFT_US = 1120;
constexpr uint16_t SERVO_CENTER_US = 1380;
constexpr uint16_t SERVO_RIGHT_US = 1640;
// Update once per 50 Hz servo frame.  A 12 us step keeps approximately the
// same overall steering speed as the old 6 us / 10 ms setting, while avoiding
// commands that are smaller than the MG995's effective deadband.
constexpr uint32_t SERVO_UPDATE_INTERVAL_MS = 20;
constexpr uint16_t SERVO_SLEW_STEP_US = 12;

struct __attribute__((packed)) ControlPacket {
  int16_t throttle;
  int16_t steering;
  uint16_t buttons;
  uint32_t sequence;
};

ControlPacket receivedPacket = {0, 0, 0, 0};
portMUX_TYPE packetMux = portMUX_INITIALIZER_UNLOCKED;
volatile bool packetReady = false;
volatile uint32_t lastPacketMs = 0;

bool linkActive = false;
bool armed = false;
uint32_t lastStatusPrintMs = 0;
uint32_t lastServoUpdateMs = 0;
uint16_t currentServoPulseUs = SERVO_CENTER_US;
uint16_t targetServoPulseUs = SERVO_CENTER_US;
int16_t appliedThrottle = 0;

int16_t moveToward(int16_t current, int16_t target, int16_t step) {
  if (target > current + step) {
    return current + step;
  }
  if (target < current - step) {
    return current - step;
  }
  return target;
}

void writeServoPulse(uint16_t pulseUs) {
  pulseUs = constrain(pulseUs, SERVO_LEFT_US, SERVO_RIGHT_US);
  const uint32_t duty =
    (static_cast<uint32_t>(pulseUs) * SERVO_MAX_DUTY) / SERVO_PERIOD_US;
  ledcWrite(SERVO_SIGNAL_PIN, duty);
  currentServoPulseUs = pulseUs;
}

void setSteeringTarget(int16_t steering) {
  steering = constrain(steering, -1000, 1000);
  long pulseUs = SERVO_CENTER_US;

  if (steering < 0) {
    pulseUs = map(steering, -1000, 0, SERVO_LEFT_US, SERVO_CENTER_US);
  } else if (steering > 0) {
    pulseUs = map(steering, 0, 1000, SERVO_CENTER_US, SERVO_RIGHT_US);
  }

  targetServoPulseUs = static_cast<uint16_t>(pulseUs);
}

void updateServoMotion(uint32_t now) {
  if (now - lastServoUpdateMs < SERVO_UPDATE_INTERVAL_MS) {
    return;
  }
  lastServoUpdateMs = now;

  const int16_t nextPulseUs = moveToward(
    static_cast<int16_t>(currentServoPulseUs),
    static_cast<int16_t>(targetServoPulseUs),
    static_cast<int16_t>(SERVO_SLEW_STEP_US)
  );
  writeServoPulse(static_cast<uint16_t>(nextPulseUs));
}

void stopMotorsAndDisableDriver() {
  ledcWrite(MOTOR_PWMA_PIN, 0);
  ledcWrite(MOTOR_PWMB_PIN, 0);
  digitalWrite(MOTOR_AIN1_PIN, LOW);
  digitalWrite(MOTOR_AIN2_PIN, LOW);
  digitalWrite(MOTOR_BIN1_PIN, LOW);
  digitalWrite(MOTOR_BIN2_PIN, LOW);
  digitalWrite(MOTOR_STBY_PIN, LOW);
}

void setMotor(uint8_t in1, uint8_t in2, uint8_t pwmPin,
              int16_t command) {
  const int16_t safeCommand = constrain(command, -1000, 1000);
  const uint8_t pwm = static_cast<uint8_t>(
    map(abs(safeCommand), 0, 1000, 0, MAX_TEST_PWM)
  );

  if (safeCommand > 0) {
    digitalWrite(in1, HIGH);
    digitalWrite(in2, LOW);
  } else if (safeCommand < 0) {
    digitalWrite(in1, LOW);
    digitalWrite(in2, HIGH);
  } else {
    digitalWrite(in1, LOW);
    digitalWrite(in2, LOW);
  }

  ledcWrite(pwmPin, pwm);
}

void applyThrottle(int16_t throttle) {
  digitalWrite(MOTOR_STBY_PIN, HIGH);
  setMotor(MOTOR_AIN1_PIN, MOTOR_AIN2_PIN, MOTOR_PWMA_PIN,
           throttle * MOTOR_A_DIRECTION);
  setMotor(MOTOR_BIN1_PIN, MOTOR_BIN2_PIN, MOTOR_PWMB_PIN,
           throttle * MOTOR_B_DIRECTION);
}

void onDataReceived(const esp_now_recv_info_t *info,
                    const uint8_t *data,
                    int length) {
  if (length != sizeof(ControlPacket)) {
    return;
  }

  portENTER_CRITICAL(&packetMux);
  memcpy(&receivedPacket, data, sizeof(receivedPacket));
  lastPacketMs = millis();
  packetReady = true;
  portEXIT_CRITICAL(&packetMux);
}

void setup() {
  Serial.begin(115200);

  // Establish safe outputs immediately after boot.
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
  const bool servoPwmOk = ledcAttach(SERVO_SIGNAL_PIN, SERVO_FREQUENCY_HZ,
                                     SERVO_RESOLUTION_BITS);
  if (!pwmAOk || !pwmBOk || !servoPwmOk) {
    Serial.println("ERROR: PWM setup failed; driver remains disabled.");
    while (true) {
      delay(1000);
    }
  }
  stopMotorsAndDisableDriver();
  writeServoPulse(SERVO_CENTER_US);
  targetServoPulseUs = SERVO_CENTER_US;

  delay(3000);

  WiFi.mode(WIFI_STA);
  WiFi.setChannel(ESPNOW_CHANNEL);
  delay(200);
  Serial.print("Vehicle Wi-Fi STA MAC: ");
  Serial.println(WiFi.macAddress());

  if (esp_now_init() != ESP_OK) {
    Serial.println("ERROR: ESP-NOW initialization failed.");
    while (true) {
      delay(1000);
    }
  }

  if (esp_now_register_recv_cb(onDataReceived) != ESP_OK) {
    Serial.println("ERROR: receive callback registration failed.");
    while (true) {
      delay(1000);
    }
  }

  Serial.println();
  Serial.println("=== V1 remote motors + MG995 steering test ===");
  Serial.println("SAFE: center joystick and release button to arm.");
  Serial.println("Joystick directly controls throttle; press button for E-STOP.");
}

void loop() {
  const uint32_t now = millis();
  ControlPacket packet = {0, 0, 0, 0};
  bool hasNewPacket = false;
  uint32_t packetTimeMs = 0;

  portENTER_CRITICAL(&packetMux);
  if (packetReady) {
    packet = receivedPacket;
    packetReady = false;
    hasNewPacket = true;
  }
  packetTimeMs = lastPacketMs;
  portEXIT_CRITICAL(&packetMux);

  if (hasNewPacket) {
    if (!linkActive) {
      linkActive = true;
      Serial.println("LINK ESTABLISHED");
    }

    const bool enableButtonHeld = (packet.buttons & 0x0001) != 0;

    if (!armed) {
      appliedThrottle = 0;
      stopMotorsAndDisableDriver();
      targetServoPulseUs = SERVO_CENTER_US;
      if (abs(packet.throttle) <= NEUTRAL_LIMIT &&
          abs(packet.steering) <= NEUTRAL_LIMIT &&
          !enableButtonHeld) {
        armed = true;
        Serial.println("ARMED: neutral confirmed; joystick controls throttle.");
      }
    } else if (enableButtonHeld) {
      armed = false;
      appliedThrottle = 0;
      stopMotorsAndDisableDriver();
      targetServoPulseUs = SERVO_CENTER_US;
      Serial.println("E-STOP: button pressed -> stopped and disarmed");
    } else {
      setSteeringTarget(packet.steering);

      const bool reversing =
        (appliedThrottle > 0 && packet.throttle < 0) ||
        (appliedThrottle < 0 && packet.throttle > 0);
      const bool slowingDown = abs(packet.throttle) < abs(appliedThrottle);
      const int16_t throttleStep =
        (reversing || slowingDown) ? THROTTLE_DECEL_STEP
                                  : THROTTLE_ACCEL_STEP;

      appliedThrottle = moveToward(
        appliedThrottle, packet.throttle, throttleStep
      );

      if (appliedThrottle != 0) {
        applyThrottle(appliedThrottle);
      } else {
        stopMotorsAndDisableDriver();
      }
    }

    if (now - lastStatusPrintMs >= STATUS_PRINT_INTERVAL_MS) {
      lastStatusPrintMs = now;
      Serial.printf(
        "RX seq=%lu target=%d applied=%d steering=%d servo=%u us button=%s state=%s\n",
        static_cast<unsigned long>(packet.sequence),
        packet.throttle,
        appliedThrottle,
        packet.steering,
        currentServoPulseUs,
        enableButtonHeld ? "E_STOP" : "released",
        armed ? (appliedThrottle != 0 ? "DRIVE" : "STOP") : "NOT_ARMED"
      );
    }
  }

  if (linkActive && now - packetTimeMs > FAILSAFE_TIMEOUT_MS) {
    linkActive = false;
    armed = false;
    appliedThrottle = 0;
    stopMotorsAndDisableDriver();
    targetServoPulseUs = SERVO_CENTER_US;
    writeServoPulse(SERVO_CENTER_US);
    Serial.println("FAILSAFE: link lost -> motors stopped, steering centered, disarmed");
  }

  updateServoMotion(now);
  delay(1);
}
