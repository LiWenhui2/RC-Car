#include <WiFi.h>
#include <esp_now.h>

constexpr uint8_t ESPNOW_CHANNEL = 6;

struct __attribute__((packed)) ControlPacket {
  int16_t throttle;
  int16_t steering;
  uint16_t buttons;
  uint32_t sequence;
};

void onDataReceived(const esp_now_recv_info_t *info,
                    const uint8_t *data,
                    int length) {
  if (length != sizeof(ControlPacket)) {
    Serial.print("Ignored packet, incorrect length: ");
    Serial.println(length);
    return;
  }

  ControlPacket packet;
  memcpy(&packet, data, sizeof(packet));

  Serial.printf(
    "RX from %02X:%02X:%02X:%02X:%02X:%02X | "
    "seq=%lu throttle=%d steering=%d buttons=0x%04X\n",
    info->src_addr[0], info->src_addr[1], info->src_addr[2],
    info->src_addr[3], info->src_addr[4], info->src_addr[5],
    static_cast<unsigned long>(packet.sequence),
    packet.throttle,
    packet.steering,
    packet.buttons
  );
}

void setup() {
  Serial.begin(115200);
  delay(2000);

  WiFi.mode(WIFI_STA);
  WiFi.setChannel(ESPNOW_CHANNEL);
  delay(200);

  Serial.println();
  Serial.println("=== RC-Car B ESP-NOW Receiver ===");
  Serial.print("Receiver MAC: ");
  Serial.println(WiFi.macAddress());
  Serial.print("Channel: ");
  Serial.println(ESPNOW_CHANNEL);

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

  Serial.println("Receiver ready. Waiting for A board...");
}

void loop() {
  delay(100);
}