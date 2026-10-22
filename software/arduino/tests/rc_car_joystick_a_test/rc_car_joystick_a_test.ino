// RC-Car controller (A board) joystick input test.
// ESP32-C3 SuperMini + PS2 dual-axis joystick module.

constexpr uint8_t JOYSTICK_X_PIN = 0;       // VRx -> GPIO0
constexpr uint8_t JOYSTICK_Y_PIN = 1;       // VRy -> GPIO1
constexpr uint8_t JOYSTICK_BUTTON_PIN = 2;  // SW  -> GPIO2

// Print twice per second so the serial monitor remains easy to read.
constexpr uint32_t PRINT_INTERVAL_MS = 500;
uint32_t lastPrintMs = 0;

void setup() {
  Serial.begin(115200);
  delay(3000);

  analogReadResolution(12);  // ESP32-C3: values are normally 0..4095
  pinMode(JOYSTICK_BUTTON_PIN, INPUT_PULLUP);

  Serial.println();
  Serial.println("=== RC-Car A Joystick Test ===");
  Serial.println("Keep the joystick centered, then move it slowly in all directions.");
}

void loop() {
  const uint32_t now = millis();
  if (now - lastPrintMs < PRINT_INTERVAL_MS) {
    return;
  }
  lastPrintMs = now;

  const int rawX = analogRead(JOYSTICK_X_PIN);
  const int rawY = analogRead(JOYSTICK_Y_PIN);
  const bool pressed = digitalRead(JOYSTICK_BUTTON_PIN) == LOW;

  Serial.printf("VRx=%4d  VRy=%4d  SW=%s\n",
                rawX,
                rawY,
                pressed ? "PRESSED" : "released");
}
