# RC 小车：HarmonyOS 原生控制器

为 nova14 / HarmonyOS6.1 提供的原生 ArkTS / ArkUI 工程，包名 `com.vonphy.car`。使用 DevEco Studio6.0.1.251 自带 API21 SDK，兼容版本API12；已连接手机报告API24。原Android工程保留在 `software/android`。

车辆使用已经烧录并经过11项电脑端零运动检查的 BLE 固件 `software/arduino/vehicle/rc_car_vehicle_ble`，无需再次修改PCB或GPIO。完整通信协议见 `software/android/README.md`。

## 打开、签名、安装

1. DevEco Studio 打开本目录 `H:/RC-Car/software/harmony`，等待同步完成。
2. 保持 nova14 USB 调试已授权、手机解锁。HDC 目标为 `4UQ9K25620001475`；COM3是ESP32，不是手机，不要选COM3作为应用安装设备。
3. 进入 **File → Project Structure → Project → Signing Configs**，启用 HarmonyOS 自动签名；界面若显示 `Support HarmonyOS` 则勾选，并勾选 `Automatically generate signature`，使用 `Sign In` 登录自己的华为账号，完成界面要求的开发者认证/授权后应用配置。
4. 点击 Run 在手机上运行；也可以在本目录执行 `./build.ps1`，生成签名包后执行 `./install.ps1`。
5. 手机首次弹出蓝牙权限时允许，在应用内扫描并连接 `RC-Car-V1`。不需要在系统蓝牙菜单配对。若手机蓝牙关闭，请先在系统设置中开启。

自动签名官方说明：https://developer.huawei.com/consumer/cn/doc/doccenter-deveco-studio/ide-signing-auto

HAP签名必须包含这台手机的调试授权。未签名包 `entry/build/default/outputs/default/entry-default-unsigned.hap` 只证明构建成功，不能当作可安装的最终包。不要通过关闭系统校验来安装，也不要把私钥、账号密码、签名材料上传或提交。

## 控制和保护

- 左侧触控区上下控制油门，右侧触控区左右控制转向，支持双手同时控制；松开、取消触摸、控件失效、离开页面均归零。
- 默认最大油门30%，只能在锁定状态修改限速。
- 手机持续每50ms发送最新控制值；GATT有响应写入最多一个请求在途，无历史控制队列。
- 点击“回中并解锁”先发送两次零油门/零转向，再请求车辆ARM；只有收到车辆确认才能控制。
- 急停/锁定立即撤销本地驾驶授权，并优先发送车辆管理指令；旧的“已解锁”通知不会重新开放控件。
- 切后台、锁屏、页面离开关闭BLE连接；窗口失去焦点请求锁定。车辆的100ms有效包超时保护独立生效。
- 手机发送阻塞250ms、车辆状态1500ms未更新时关闭连接；重新连接后必须手动解锁。
- HAP不显示没有测量的电池电量；界面“方向”是指令值，不是舵机位置反馈。

首次测试请架空车轮，先30%限速；分别检查前后、左右、松手、急停、按Home、锁屏、关闭蓝牙、超距和重连。固件停车是撤掉电机驱动，车体可能因惯性滑行。

## 验证记录

- `test-protocol.cjs` 直接转译应用使用的 `CarProtocol.ts`，覆盖10字节小端有符号轴、限幅、uint32序号回绕、状态解析和非法状态拒绝，共4项测试通过。
- `assembleHap` 已成功，ArkTS检查通过，生成约212KB未签名HAP。构建时没有账号调试签名，因此尚未安装真机。
- 电脑端真实BLE检查结果为 `outputs/ble-control/ble-safety-results.json`，覆盖车辆安全状态机；它不能代替这台手机的触控和后台行为验证。

代码入口：`entry/src/main/ets/pages/Index.ets`；BLE状态和发送调度：`ble/CarBleClient.ets`；协议：`ble/CarProtocol.ts`；后台断线：`entryability/EntryAbility.ets`。
