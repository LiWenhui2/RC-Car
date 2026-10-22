# RC-Car BLE 车辆固件

打开同目录 `rc_car_vehicle_ble.ino`。这是独立 BLE 模式，使用 ESP32-C3 自带蓝牙和 Arduino-ESP32 内置 BLE 库，无需新增硬件、无需另装 NimBLE 库。

PCB 引脚：AIN1=GPIO3、AIN2=GPIO4、PWMA=GPIO5、BIN1=GPIO7、BIN2=GPIO10、PWMB=GPIO20、STBY=GPIO6、SERVO=GPIO21。与 `tests/rc_car_vehicle_remote_motor_test` 默认配置及 PCB SOP 一致。两路电机方向均为 -1，MG995 脉宽1120/1380/1640μs，沿用已验证参数。

手机工程、协议、安装步骤和实车检查见 `software/android/README.md`（项目根目录下）。车辆串口波特率115200。

编译示例：

```powershell
arduino-cli compile --fqbn esp32:esp32:esp32c3:CDCOnBoot=cdc software/arduino/vehicle/rc_car_vehicle_ble
```

使用 Arduino IDE 上传前断开车辆电池和外部5V；只更新车辆板。原 ESP-NOW 固件未修改，重新烧录原工程即可恢复实体遥控器控制。
