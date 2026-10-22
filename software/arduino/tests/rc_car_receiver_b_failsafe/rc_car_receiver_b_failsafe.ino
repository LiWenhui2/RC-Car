#include <WiFi.h>
#include <esp_now.h>

constexpr uint8_t ESPNOW_CHANNEL = 6;
constexpr uint32_t FAILSAFE_TIMEOUT_MS = 100;
constexpr uint32_t STATUS_PRINT_INTERVAL_MS = 250;

struct __attribute__((packed)) ControlPacket {
  int16_t throttle;
  int16_t steering;
  uint16_t buttons;
  uint32_t sequence;
};

ControlPacket latestPacket = {0, 0, 0, 0};
volatile bool packetReady = false;
volatile uint32_t lastPacketMs = 0;

bool linkActive = false;
uint32_t lastStatusPrintMs = 0;

void onDataReceived(const esp_now_recv_info_t *info,
                    const uint8_t *data,
                    int length) {
  if (length != sizeof(ControlPacket)) {
    return;
  }

  memcpy(&latestPacket, data, sizeof(latestPacket));
  lastPacketMs = millis();
  packetReady = true;
}

void enterFailsafe() {
  // This will later become: motor PWM = 0, TB6612 STBY = LOW,
  // and servo = verified safe center position.
  latestPacket.throttle = 0;
  latestPacket.steering = 0;
  latestPacket.buttons = 0;

  Serial.println("FAILSAFE: no packet for more than 100 ms -> STOP command applied");
}

void setup() {
  Serial.begin(115200);
  delay(3000);
  Serial.println();
  Serial.println("STEP B1: application setup entered");
  Serial.flush();

  WiFi.mode(WIFI_STA);
  Serial.println("STEP B2: Wi-Fi STA mode enabled");
  Serial.flush();
  WiFi.setChannel(ESPNOW_CHANNEL);
  delay(200);
  Serial.println("STEP B3: Wi-Fi channel set to 6");
  Serial.flush();

  Serial.println();
  Serial.println("=== RC-Car B 100ms Failsafe Receiver ===");
  Serial.print("Receiver MAC: ");
  Serial.println(WiFi.macAddress());

  if (esp_now_init() != ESP_OK) {
    Serial.println("ERROR: ESP-NOW initialization failed.");
    while (true) {
      delay(1000);
    }
  }
  Serial.println("STEP B4: ESP-NOW initialized");
  Serial.flush();

  if (esp_now_register_recv_cb(onDataReceived) != ESP_OK) {
    Serial.println("ERROR: receive callback registration failed.");
    while (true) {
      delay(1000);
    }
  }
  Serial.println("STEP B5: receive callback registered");
  Serial.flush();

  Serial.println("Waiting for A board. Vehicle output is SAFE/STOP.");
}

void loop() {
  const uint32_t now = millis();

  if (packetReady) {
    packetReady = false;

    if (!linkActive) {
      linkActive = true;
      Serial.println("LINK ESTABLISHED: valid control packets received");
    }

    if (now - lastStatusPrintMs >= STATUS_PRINT_INTERVAL_MS) {
      lastStatusPrintMs = now;
      Serial.printf(
        "RX seq=%lu throttle=%d steering=%d buttons=0x%04X age=%lu ms\n",
        static_cast<unsigned long>(latestPacket.sequence),
        latestPacket.throttle,
        latestPacket.steering,
        latestPacket.buttons,
        static_cast<unsigned long>(now - lastPacketMs)
      );
    }
  }

  if (linkActive && now - lastPacketMs > FAILSAFE_TIMEOUT_MS) {
    linkActive = false;
    enterFailsafe();
  }

  delay(1);
}
