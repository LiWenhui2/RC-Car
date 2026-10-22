// ESP32-C3 / Arduino-ESP32 3.x. BLE-only firmware; ESP-NOW firmware is kept separately.
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLE2902.h>
#include "VehicleSafety.h"
#include "VehicleHardware.h"

constexpr char SERVICE_UUID[] = "a9140001-7e6b-4a40-a862-cb008ab14e01";
constexpr char CONTROL_UUID[] = "a9140002-7e6b-4a40-a862-cb008ab14e01";
constexpr char MANAGEMENT_UUID[] = "a9140003-7e6b-4a40-a862-cb008ab14e01";
constexpr char STATUS_UUID[] = "a9140004-7e6b-4a40-a862-cb008ab14e01";

VehicleSafety safety;
VehicleHardware hardware;
BLECharacteristic *statusCharacteristic = nullptr;
portMUX_TYPE mailboxMux = portMUX_INITIALIZER_UNLOCKED;
struct Mailbox {
  bool connected = false;
  bool connectionChanged = false;
  bool packetReady = false;
  ControlPacket packet = {};
  uint32_t receivedAt = 0;
  uint8_t command = 0;
  uint8_t forceLock = 0;
} mailbox;

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *) override {
    portENTER_CRITICAL(&mailboxMux);
    mailbox = {}; mailbox.connected = true; mailbox.connectionChanged = true;
    portEXIT_CRITICAL(&mailboxMux);
  }
#if defined(CONFIG_BLUEDROID_ENABLED)
  void onConnect(BLEServer *server, esp_ble_gatts_cb_param_t *param) override {
    // 1.25ms units: request 7.5-15ms events so acknowledged writes can
    // sustain 20Hz control within the independent 100ms safety deadline.
    server->updateConnParams(param->connect.remote_bda, 6, 12, 0, 200);
  }
#elif defined(CONFIG_NIMBLE_ENABLED)
  void onConnect(BLEServer *server, ble_gap_conn_desc *desc) override {
    server->updateConnParams(desc->conn_handle, 6, 12, 0, 200);
  }
#endif
  void onDisconnect(BLEServer *) override {
    portENTER_CRITICAL(&mailboxMux);
    mailbox = {}; mailbox.connectionChanged = true;
    portEXIT_CRITICAL(&mailboxMux);
  }
};

class ControlCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *characteristic) override {
    const auto bytes = characteristic->getValue();
    ControlPacket packet = {};
    uint8_t fault = 0;
    if (bytes.length() != sizeof(packet)) fault = VehicleSafety::INVALID;
    else {
      memcpy(&packet, bytes.c_str(), sizeof(packet));
      if (packet.throttle < -1000 || packet.throttle > 1000 || packet.steering < -1000 || packet.steering > 1000 || (packet.buttons & ~1U))
        fault = VehicleSafety::INVALID;
      else if (packet.buttons & 1U) fault = VehicleSafety::ESTOP;
    }
    portENTER_CRITICAL(&mailboxMux);
    if (mailbox.connected) {
      if (fault) { mailbox.forceLock = fault; mailbox.command = 0; }
      else { mailbox.packet = packet; mailbox.receivedAt = millis(); mailbox.packetReady = true; }
    }
    portEXIT_CRITICAL(&mailboxMux);
  }
};

class ManagementCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *characteristic) override {
    const auto bytes = characteristic->getValue();
    const uint8_t command = bytes.length() == 1 ? static_cast<uint8_t>(bytes[0]) : 0;
    portENTER_CRITICAL(&mailboxMux);
    if (mailbox.connected) {
      if (command == 1) { if (!mailbox.forceLock) mailbox.command = command; }
      else { mailbox.command = 0; mailbox.forceLock = command == 2 ? VehicleSafety::LOCKED : command == 3 ? VehicleSafety::ESTOP : VehicleSafety::INVALID; }
    }
    portEXIT_CRITICAL(&mailboxMux);
  }
};

void setup() {
  Serial.begin(115200);
  if (!hardware.begin()) {
    Serial.println("ERROR: PWM setup failed; STBY disabled");
    while (true) delay(1000);
  }
  BLEDevice::init("RC-Car-V1");
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());
  BLEService *service = server->createService(SERVICE_UUID);
  auto *control = service->createCharacteristic(CONTROL_UUID, BLECharacteristic::PROPERTY_WRITE);
  control->setCallbacks(new ControlCallbacks());
  auto *management = service->createCharacteristic(MANAGEMENT_UUID, BLECharacteristic::PROPERTY_WRITE);
  management->setCallbacks(new ManagementCallbacks());
  statusCharacteristic = service->createCharacteristic(STATUS_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  statusCharacteristic->addDescriptor(new BLE2902());
  uint8_t initial[12] = {1, 0, VehicleSafety::BOOT};
  statusCharacteristic->setValue(initial, sizeof(initial));
  service->start();
  auto *advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->setScanResponse(true);
  advertising->start();
  Serial.println("RC-Car-V1 BLE ready; PCB pins A=3/4/5 B=7/10/20 STBY=6 SERVO=21");
  Serial.println("SAFE: neutral control packets + explicit ARM required; 100ms failsafe");
}

void loop() {
  static uint32_t lastStep = 0, lastNotify = 0;
  static uint8_t previousReason = 255;
  static bool previousArmed = false;
  Mailbox incoming;
  portENTER_CRITICAL(&mailboxMux);
  incoming = mailbox;
  mailbox.packetReady = false; mailbox.connectionChanged = false; mailbox.command = 0; mailbox.forceLock = 0;
  portEXIT_CRITICAL(&mailboxMux);
  const uint32_t now = millis();

  if (incoming.connectionChanged) {
    safety.connection(incoming.connected);
    if (!incoming.connected) {
      hardware.stop();
      BLEDevice::startAdvertising();
    }
  }
  safety.checkTimeout(now);
  if (incoming.packetReady) safety.accept(incoming.packet, incoming.receivedAt);
  safety.checkTimeout(now);
  if (incoming.forceLock) safety.lock(incoming.forceLock);
  else if (incoming.command) safety.command(incoming.command, now);
  if (now - lastStep >= 10) { lastStep = now; safety.step(); }
  hardware.output(safety.applied, safety.target.steering, safety.armed, now);

  if (now - lastNotify >= 200 || previousReason != safety.reason || previousArmed != safety.armed) {
    lastNotify = now; previousReason = safety.reason; previousArmed = safety.armed;
    // Explicit little-endian telemetry: version/state/reason/reserved/applied/steering/sequence.
    uint8_t data[12] = {1, static_cast<uint8_t>(safety.armed), safety.reason, 0};
    const uint16_t applied = static_cast<uint16_t>(safety.applied);
    const uint16_t steering = static_cast<uint16_t>(safety.target.steering);
    data[4] = applied; data[5] = applied >> 8; data[6] = steering; data[7] = steering >> 8;
    for (int i = 0; i < 4; ++i) data[8 + i] = safety.target.sequence >> (8 * i);
    statusCharacteristic->setValue(data, sizeof(data));
    if (safety.connected) statusCharacteristic->notify();
    Serial.printf("BLE state=%s reason=%u seq=%lu target=%d applied=%d steering=%d\n",
      safety.armed ? "ARMED" : "LOCKED", safety.reason, static_cast<unsigned long>(safety.target.sequence),
      safety.target.throttle, safety.applied, safety.target.steering);
  }
  delay(1);
}
