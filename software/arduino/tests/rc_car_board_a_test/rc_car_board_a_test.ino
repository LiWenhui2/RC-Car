#include <WiFi.h>

void setup() {
  Serial.begin(115200);
  delay(2000);

  WiFi.mode(WIFI_STA);
  delay(200);

  Serial.println();
  Serial.println("=== RC-Car A Board Test ===");

  Serial.print("Chip model: ");
  Serial.println(ESP.getChipModel());

  Serial.print("CPU frequency: ");
  Serial.print(ESP.getCpuFreqMHz());
  Serial.println(" MHz");

  Serial.print("WiFi STA MAC: ");
  Serial.println(WiFi.macAddress());

  Serial.println("A board started successfully.");
}

void loop() {
  Serial.print("A board running, ms = ");
  Serial.println(millis());
  delay(1000);
}

