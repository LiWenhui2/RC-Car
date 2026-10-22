#include <WiFi.h>
#include <esp_now.h>

constexpr uint8_t ESPNOW_CHANNEL = 6;
constexpr uint32_t SEND_INTERVAL_MS = 50;
constexpr uint32_t STATUS_PRINT_INTERVAL_MS = 500;

// PS2 joystick wiring on controller board A.
constexpr uint8_t JOYSTICK_X_PIN = 0;       // VRx
constexpr uint8_t JOYSTICK_Y_PIN = 1;       // VRy
constexpr uint8_t JOYSTICK_BUTTON_PIN = 2;  // SW, active LOW

// Measured calibration values.
constexpr int X_MIN = 0;
constexpr int X_CENTER = 2210;
constexpr int X_MAX = 4095;
constexpr int Y_MIN = 0;
constexpr int Y_CENTER = 2239;
constexpr int Y_MAX = 4095;
constexpr int ADC_DEADZONE = 160;

// B board (vehicle) Wi-Fi STA MAC: 44:B1:76:08:66:98
const uint8_t RECEIVER_MAC[6] = {
  0x44, 0xB1, 0x76, 0x08, 0x66, 0x98
};

struct __attribute__((packed)) ControlPacket {
  int16_t throttle;
  int16_t steering;
  uint16_t buttons;
  uint32_t sequence;
};

ControlPacket packet = {0, 0, 0, 0};
uint32_t lastSendMs = 0;
uint32_t lastStatusPrintMs = 0;

int readAveraged(uint8_t pin) {
  int32_t sum = 0;
  for (int i = 0; i < 8; ++i) {
    sum += analogRead(pin);
  }
  return static_cast<int>(sum / 8);
}

int16_t mapAxis(int raw, int minimum, int center, int maximum) {
  if (raw > center + ADC_DEADZONE) {
    const long value = map(raw, center + ADC_DEADZONE, maximum, 0, 1000);
    return static_cast<int16_t>(constrain(value, 0L, 1000L));
  }

  if (raw < center - ADC_DEADZONE) {
    const long value = map(raw, center - ADC_DEADZONE, minimum, 0, -1000);
    return static_cast<int16_t>(constrain(value, -1000L, 0L));
  }

  return 0;
}

void setup() {
  Serial.begin(115200);
  delay(3000);
  Serial.println();
  Serial.println("STEP A1: application setup entered");
  Serial.flush();

  analogReadResolution(12);
  pinMode(JOYSTICK_BUTTON_PIN, INPUT_PULLUP);

  WiFi.mode(WIFI_STA);
  Serial.println("STEP A2: Wi-Fi STA mode enabled");
  Serial.flush();
  WiFi.setChannel(ESPNOW_CHANNEL);
  delay(200);
  Serial.println("STEP A3: Wi-Fi channel set to 6");
  Serial.flush();

  Serial.println();
  Serial.println("=== RC-Car A 50ms Sender ===");
  Serial.print("Sender MAC: ");
  Serial.println(WiFi.macAddress());

  if (esp_now_init() != ESP_OK) {
    Serial.println("ERROR: ESP-NOW initialization failed.");
    while (true) {
      delay(1000);
    }
  }
  Serial.println("STEP A4: ESP-NOW initialized");
  Serial.flush();

  esp_now_peer_info_t peerInfo = {};
  memcpy(peerInfo.peer_addr, RECEIVER_MAC, sizeof(RECEIVER_MAC));
  peerInfo.channel = ESPNOW_CHANNEL;
  peerInfo.ifidx = WIFI_IF_STA;
  peerInfo.encrypt = false;

  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    Serial.println("ERROR: failed to add B board as peer.");
    while (true) {
      delay(1000);
    }
  }
  Serial.println("STEP A5: receiver peer added");
  Serial.flush();

  Serial.println("Sender ready. Keep the joystick centered for STOP.");
}

void loop() {
  const uint32_t now = millis();
  if (now - lastSendMs < SEND_INTERVAL_MS) {
    return;
  }
  lastSendMs = now;

  const int rawX = readAveraged(JOYSTICK_X_PIN);
  const int rawY = readAveraged(JOYSTICK_Y_PIN);

  packet.steering = mapAxis(rawX, X_MIN, X_CENTER, X_MAX);
  // VRy decreases when pushed forward, so invert the mapped value.
  packet.throttle = -mapAxis(rawY, Y_MIN, Y_CENTER, Y_MAX);
  packet.buttons = digitalRead(JOYSTICK_BUTTON_PIN) == LOW ? 0x0001 : 0x0000;

  packet.sequence++;
  const esp_err_t result = esp_now_send(
    RECEIVER_MAC,
    reinterpret_cast<const uint8_t *>(&packet),
    sizeof(packet)
  );

  if (now - lastStatusPrintMs >= STATUS_PRINT_INTERVAL_MS) {
    lastStatusPrintMs = now;
    Serial.printf(
      "TX seq=%lu rawX=%d rawY=%d throttle=%d steering=%d button=%s result=%s\n",
      static_cast<unsigned long>(packet.sequence),
      rawX,
      rawY,
      packet.throttle,
      packet.steering,
      packet.buttons ? "PRESSED" : "released",
      result == ESP_OK ? "queued" : "error"
    );
  }
}
