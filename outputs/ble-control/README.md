# RC-Car Android / BLE 开发构建

构建日期：2026-10-22（Asia/Shanghai）。

- `RC-Car-debug.apk`：安卓调试安装包，包名 `com.vonphy.car`。
- `RC-Car-BLE-PCB-merged.bin`：ESP32-C3 / 4MB Flash 的完整合并固件，刷写起始地址为 `0x0`。不要把该合并文件按单独应用分区固件的 `0x10000` 地址刷入。
- `android-lint.txt`：Android Lint 报告，0 errors；包含原工程依赖更新/未用资源和横屏兼容等提示。
- `protocol-tests.xml`：4 项协议单元测试，无失败。
- `vehicle-before-ble-44B176086698.bin`：车辆原固件的4MB完整备份，保留用于恢复。
- `vehicle-flash.log`：COM3 写入和校验日志，MAC已确认是车辆板44:B1:76:08:66:98。
- `ble-safety-results.json`：电脑通过真实BLE执行的11项零油门/零转向检查，全部通过。
- `RC-Car-Harmony-unsigned.hap`：nova14原生ArkTS应用的未签名构建，仅供检查构建结果，完成华为真机自动签名后才能安装。
- `harmony-protocol-tests.json`：鸿蒙应用协议模块4项测试通过。

建议优先用 Arduino IDE 打开 `H:/RC-Car/software/arduino/vehicle/rc_car_vehicle_ble/rc_car_vehicle_ble.ino` 上传车辆固件，避免混淆刷写地址。PCB GPIO 与原车端固件一致，未修改原 ESP-NOW 工程。

完整使用和测试步骤：`H:/RC-Car/software/android/README.md`。

验证范围：安卓 APK 编译、协议单元测试、Android Lint；Arduino-ESP32 3.3.10-cn 的 ESP32-C3 固件完整编译通过，固件占用程序空间622067字节、静态RAM18980字节。车辆端新增7.5～15ms BLE连接间隔请求，保留100ms控制包超时。APK为debug签名，供兼容安卓的手机开发测试。

已实机完成：读取原Flash备份；确认车辆MAC；分区写入BLE固件并校验通过；串口确认启动锁定；电脑连接BLE地址44:B1:76:08:66:9A，完成连接默认锁定、主动回中解锁、主动锁定、禁止自动解锁、心跳超时锁定、重放旧包无效、急停、非法包锁定、重连保持锁定等11项检查。所有指令的有效油门/转向始终为0，没有测试车轮运动，也没有测量实际引脚撤销输出的微秒级时序。

手机部署进度：用户确认HarmonyOS6.1.0，DevEco Studio6.0.1.251及API21 SDK已安装；HDC已连接手机4UQ9K25620001475，手机报告API24。原生工程位于software/harmony，ArkTS检查、HAP构建及4项协议测试已通过；构建日志确认产品default尚未配置signingConfig。已打开工程，等待用户在DevEco登录华为账号并开启HarmonyOS自动签名；完成后可构建签名HAP并安装实机。现有Android APK不是鸿蒙原生应用。
