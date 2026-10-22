# RC-Car 软件目录

本目录保存 RC-CAR-V1.0 的全部固件和软件资料。

## Android 手机蓝牙控制

- 手机工程：[`android/README.md`](android/README.md)，原生 Kotlin / Compose，BLE 直连车辆。
- PCB 车辆固件：[`arduino/vehicle/rc_car_vehicle_ble/README.md`](arduino/vehicle/rc_car_vehicle_ble/README.md)，GPIO 沿用已验证车辆测试工程，100ms 失联停车，回中后主动解锁。
- BLE 固件与 ESP-NOW 固件分开烧录；原实体遥控器固件保留。

## HarmonyOS 5/6 原生手机控制

- nova14 / HarmonyOS6.1 使用 [`harmony/README.md`](harmony/README.md) 的 ArkTS 原生工程，需要 DevEco Studio 的 HarmonyOS 真机调试签名。
- 与 Android 客户端共用车辆 BLE 服务与10字节控制协议，不修改PCB引脚。

## 开发环境

- Arduino IDE 2
- `esp32 by Espressif Systems` 3.3.11
- 开发板：ESP32C3 Dev Module
- `USB CDC On Boot`：Enabled
- 串口波特率：115200

## 已确认的开发板

| 角色 | 标记 | Wi-Fi STA MAC |
|---|---|---|
| 遥控器 | A 板 | `44:B1:76:08:40:2C` |
| 车体 | B 板 | `44:B1:76:07:B4:C0` |

## 目录结构

- `arduino/tests/`：分阶段硬件与通信测试程序。
- `arduino/controller/`：后续遥控器正式固件。
- `arduino/vehicle/`：后续车体正式固件。
- `arduino/shared/`：通信数据结构、配置和公共接口。

Arduino 工程要求文件夹名称与 `.ino` 主文件名称相同。打开工程时，请直接双击对应文件夹内的 `.ino` 文件。

## 当前 ESP-NOW 台架测试

- B 板接收端：`arduino/tests/rc_car_receiver_b/rc_car_receiver_b.ino`
- A 板发送端：`arduino/tests/rc_car_sender_a/rc_car_sender_a.ino`
- 固定测试信道：6

### 100 ms 失联保护测试

- A 板 50 ms 发送端：`arduino/tests/rc_car_sender_a_failsafe/rc_car_sender_a_failsafe.ino`
- B 板 100 ms 失联接收端：`arduino/tests/rc_car_receiver_b_failsafe/rc_car_receiver_b_failsafe.ino`
# Arduino test programs

完整接线、电源和通电顺序见：[`../docs/RC-Car-V1_详细接线说明.md`](../docs/RC-Car-V1_详细接线说明.md)。

- `arduino/tests/rc_car_joystick_a_test`: controller-board PS2 joystick wiring and raw-value test.
- `arduino/tests/rc_car_vehicle_motor1_test`: vehicle-board TB6612FNG channel-A single-motor bench test.
- `arduino/tests/rc_car_vehicle_dual_motor_test`: vehicle-board TB6612FNG dual-motor direction and PWM test.
- `arduino/tests/rc_car_vehicle_remote_motor_test`: complete V1 ESP-NOW dual-rear-motor and calibrated MG995 steering test, with neutral arming, hold-to-run and 100 ms failsafe.
- `arduino/tests/rc_car_vehicle_servo_test`: MG995 steering-servo center and conservative left/right pulse test using serial commands.
