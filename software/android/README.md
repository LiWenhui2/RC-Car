# RC 小车 Android BLE 控制

原生 Kotlin / Jetpack Compose 工程。手机直接连接车辆 ESP32-C3 的 BLE GATT 服务，不经过实体遥控器，不需要 HC-05/HC-06。

## 鸿蒙手机兼容性

本工程生成安卓 APK，不是鸿蒙原生 HAP。nova 14 官方规格为 HarmonyOS 5；本次实机 USB 被识别为 HDC Interface，不能用 ADB 未发现设备来判断数据线或 USB 调试未开启。HarmonyOS 5/6 原生部署需要 DevEco Studio / HDC 和签名的 HAP，需另做 ArkTS 客户端；车辆 BLE 服务和协议可共用，不需要改 PCB。具体按手机“关于手机”显示的系统版本确认。

## 首次运行

1. 车辆使用 `../arduino/vehicle/rc_car_vehicle_ble/rc_car_vehicle_ble.ino`，在 Arduino IDE 中选择 ESP32C3 Dev Module、USB CDC On Boot Enabled、4MB Flash，使用 Arduino-ESP32 3.x 编译上传。
2. PCB 引脚沿用已验证车辆程序：AIN1=3、AIN2=4、PWMA=5、BIN1=7、BIN2=10、PWMB=20、STBY=6、SERVO=21。不要为 PCB 定义 `RC_CAR_PERFBOARD_V1`，那个宏只用于另一块 6×8 洞洞板。
3. USB 烧录前断开车辆电池和开发板外部 5V，避免供电硬并联。固件只烧到车辆板，不烧到遥控器。
4. Android Studio 打开本目录，运行 `app`；或安装 `app/build/outputs/apk/debug/app-debug.apk`。
5. 手机打开蓝牙，允许“附近设备”权限。Android 11 及以下还需允许定位权限、开启系统定位，用于 BLE 扫描。本 App 不采集位置信息。
6. 小车上电后，在 App 内扫描并选择 `RC-Car-V1`，无需先在系统蓝牙设置里配对。
7. 首次架空车轮测试，默认最大油门 30%。等待车辆状态出现，松开两侧控件，点击“回中并解锁”。左控件上下控制油门，右控件左右控制方向，支持双手同时操作。
8. 点击急停后需再次回中并手动解锁。限速只能在锁定时修改。

手机接电脑 USB 调试与手机连接小车 BLE 是两条独立链路。`adb devices -l` 必须显示 `device`，电脑才能安装和自动检查 App；`unauthorized` 需要手机确认调试授权。

## 安全行为

- 上电、连接、重连后保持锁定；手机发送回中包后请求 ARM，只有收到车辆的已解锁通知才允许操作。
- 油门、方向控件松手或触摸取消即归零。普通归零使用原有减速斜坡，急停/锁定/超时绕过斜坡。
- 主界面每 50ms 发送一个控制包，控制值不变时也发送。GATT 使用有响应写入，最多一个请求在途，不缓存历史驾驶指令；管理操作在写入回调中衔接，不占用完整心跳周期。
- 急停优先于普通控制；丢失窗口焦点请求锁定，切后台/锁屏/退出直接关闭连接。车辆同时检查连接断开和 100ms 有效控制包超时，不能只依赖 Android 生命周期回调。
- Android 发送阻塞超过 250ms 或车辆状态超过 1500ms 未更新时关闭连接；车辆端更早的 100ms 超时独立生效。
- 停车动作是 PWM=0、STBY=LOW，车辆可能因惯性滑行。失联时舵机回已验证的 1380μs 中位。
- 当前为近距离开发版本，不提供蓝牙配对认证；附近兼容客户端可能先行连接。请在受控场地测试，后续对外使用前增加绑定/认证。
- 手机调度和无线干扰可能触发严格的 100ms 保护，必须实机测量；不能因误触发直接取消保护。

## 协议 v1

所有整数小端序。服务 UUID 为 `a9140001-7e6b-4a40-a862-cb008ab14e01`。

| 特征 | UUID 首段（后续相同） | 属性 | 数据 |
|---|---|---|---|
| Control | a9140002 | Write | 10 字节 |
| Management | a9140003 | Write | 1 字节：1=解锁、2=锁定、3=急停 |
| Status | a9140004 | Read / Notify | 12 字节 |

Control：`int16 throttle, int16 steering, uint16 buttons, uint32 sequence`。轴范围 -1000..1000，正油门前进、正方向右转；buttons bit0 为急停，其余位必须为零。重复/旧序号不刷新心跳；序号支持 uint32 回绕，重新连接后重置序号基准。非法包触发锁定；仅新鲜合法控制包刷新心跳。

Status：`uint8 version=1, uint8 armed, uint8 reason, uint8 reserved=0, int16 appliedThrottle, int16 targetSteering, uint32 lastSequence`。

reason：0=正常、1=上电、2=连接变化、3=心跳超时、4=急停、5=主动锁定、6=非法指令、7=未回中。方向字段是目标指令，不是舵机位置反馈。没有电池电压采样，App 不显示虚构电量。

车辆固件的安全状态机位于 `VehicleSafety.h`，执行层位于 `VehicleHardware.h`；BLE 回调只写受锁保护的邮箱，主循环执行安全判断和输出。加速每 10ms 最大变化16、减速40，对应原每50ms加速80、减速200；换向先降到零。舵机每20ms最大变化12μs。原 ESP-NOW 固件保留，可重新烧录恢复实体遥控器模式。

车辆主动请求7.5～15ms BLE连接间隔、零从机延迟；能否接受由中心设备决定，不能把该请求当成实际时延保证。电脑默认连接时序曾触发100ms保护，调整后通过零运动协议测试；手机仍需单独测量。零运动测试工具：`software/tools/verify_ble_safety.py`，需要bleak，始终只发送零油门和零转向。

## 构建和验证

Android Studio 使用内置 JDK 21。命令行可指定已安装的 JDK，例如本机 `D:/Program Files/Android Studio/jbr`，运行：

```powershell
$env:JAVA_HOME = 'D:/Program Files/Android Studio/jbr'
$env:JAVA_TOOL_OPTIONS = '-Djdk.net.unixdomain.tmpdir=H:/RC-Car/tmp'
.\gradlew.bat :app:assembleDebug :app:testDebugUnitTest :app:lintDebug --console=plain
```

本机 JDK 21/25 曾出现 `Unable to establish loopback connection`，上面的 `JAVA_TOOL_OPTIONS` 使用已有工作区内的短临时路径修复。换工作目录后请改成对应的短路径，并确保目录已创建。

首次实车验收（先架空车轮）：

- 仅连接不解锁，推控件时电机保持停止。
- 解锁后低速前后、左右正确，双手可以同时控制，松手油门归零。
- 保持油门时点击急停，电机输出立即撤掉；后续控制包不能自动解锁。
- 保持油门时锁屏、按 Home、关闭蓝牙、超出距离，车辆停止且锁定。
- 重连后保持锁定，需再次手动解锁；重连、旋转屏幕不能恢复上次油门。
- 观察串口 `reason=3` 是否频繁出现，测量有效包间隔和输出停车时刻。100ms 是固件看门狗门限，不代表车体在100ms内物理静止。
- 原始/越界/重复包不解除安全锁定，错误包不延长驾驶心跳。
