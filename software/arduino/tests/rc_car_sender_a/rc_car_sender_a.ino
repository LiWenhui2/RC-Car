#include <WiFi.h>
#include <esp_now.h>

constexpr uint8_t ESPNOW_CHANNEL = 6;

// B board (vehicle) Wi-Fi STA MAC: 44:B1:76:07:B4:C0
const uint8_t RECEIVER_MAC[6] = {
  0x44, 0xB1, 0x76, 0x07, 0xB4, 0xC0
};

struct __attribute__((packed)) ControlPacket {
  int16_t throttle;
  int16_t steering;
  uint16_t buttons;
  uint32_t sequence;
};

ControlPacket packet = {300, -150, 0x0001, 0};

void setup() {
  Serial.begin(115200);
  delay(2000);

  WiFi.mode(WIFI_STA);
  WiFi.setChannel(ESPNOW_CHANNEL);
  delay(200);

  Serial.println();
  Serial.println("=== RC-Car A ESP-NOW Sender ===");
  Serial.print("Sender MAC: ");
  Serial.println(WiFi.macAddress());
  Serial.print("Channel: ");
  Serial.println(ESPNOW_CHANNEL);

  if (esp_now_init() != ESP_OK) {
    Serial.println("ERROR: ESP-NOW initialization failed.");
    while (true) {
      delay(1000);
    }
  }

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

  Serial.println("Sender ready. Sending test packets...");
}

void loop() {
  packet.sequence++;

  esp_err_t result = esp_now_send(
    RECEIVER_MAC,
    reinterpret_cast<const uint8_t *>(&packet),
    sizeof(packet)
  );

  Serial.printf(
    "TX seq=%lu throttle=%d steering=%d buttons=0x%04X result=%s\n",
    static_cast<unsigned long>(packet.sequence),
    packet.throttle,
    packet.steering,
    packet.buttons,
    result == ESP_OK ? "queued" : "error"
  );

  delay(500);
}
