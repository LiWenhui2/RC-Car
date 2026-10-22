# RC-Car V1：Altium Designer首版PCB打样完整步骤

版本：P1（模块载板验证版）  
日期：2026-08-10  
目标：把已经在洞洞板上跑通的车辆控制电路迁移到双层PCB；优先保证第一次打样可装、可焊、可测，不在首板盲目追求极限尺寸。

---

## 1. 首板方案冻结

### 1.1 首板采用模块载板

首板继续使用已经验证的模块：

- ESP32-C3 SuperMini开发板 ×1，使用2×8排母安装。
- 红色TB6612FNG驱动模块 ×1，使用2×8排母安装。
- 预留第2块相同TB6612FNG模块插座，P1可不安装。
- 现有5V升降压模块保持板外安装，通过4条线连接PCB。
- MG995舵机、电池、两个后轮电机均通过板边连接器出线。
- 预留两个前轮电机接口，为以后四轮差速准备。

不要在P1直接改成裸ESP32-C3芯片、裸TB6612芯片或自行设计升降压电源。这些改动会一次引入射频、电源、贴片焊接和散热等多种风险，不符合“首板先把流程跑通”的目标。

### 1.2 建议PCB尺寸

- 初始外形：`70mm × 50mm`。
- 最大不得超过项目约束的`80mm × 60mm`。
- 双层板、FR-4、1.6mm板厚、1oz铜厚。
- 四角设置4个M3安装孔，成品孔径3.2mm，孔中心距建议62mm × 42mm。
- P1不要为了缩小几毫米而压缩连接器间距、天线净空或电源线宽。

70×50mm已经明显小于当前6×8cm洞洞板，同时能容纳第二驱动模块和四电机接口。大多数常见打样价格在100×100mm以内差别不大，P1应优先保证可制造性和可调试性。

### 1.3 沿用已经验证的GPIO

P1不得使用此前为了洞洞板少飞线而临时提出的优化引脚排列。双层PCB可以解决交叉走线，应沿用当前已经跑通的车辆程序：

| ESP32-C3 | 功能/模块引脚 |
|---|---|
| GPIO3 | TB6612 AIN1，左侧电机方向1 |
| GPIO4 | TB6612 AIN2，左侧电机方向2 |
| GPIO5 | TB6612 PWMA，左侧电机PWM |
| GPIO6 | TB6612 STBY |
| GPIO7 | TB6612 BIN1，右侧电机方向1 |
| GPIO10 | TB6612 BIN2，右侧电机方向2 |
| GPIO20 | TB6612 PWMB，右侧电机PWM |
| GPIO21 | MG995舵机PWM信号 |
| GPIO0 | 预留BAT_ADC，不装分压电阻时悬空 |
| GPIO1 | 预留I2C SDA |
| GPIO2 | 预留I2C SCL；属于启动相关脚，外设不得在上电时强拉错误电平 |

P1车辆端继续烧录：

```text
software/arduino/tests/rc_car_vehicle_remote_motor_test/
rc_car_vehicle_remote_motor_test.ino
```

---

## 2. 模块尺寸和封装基准

### 2.1 ESP32-C3 SuperMini

资料常见尺寸：

- 模块外形约`22.5mm × 18.0mm`。
- 两侧各8针。
- 同排针距`2.54mm`。
- 两排中心距`15.24mm`（0.6英寸）。

建议通孔焊盘：

- 孔径：1.0mm；如果排针较粗可改1.1mm。
- 焊盘：圆形1.8～2.0mm。
- 1号脚使用方形焊盘。
- 封装丝印必须标出USB方向、天线方向和1号脚。

资料参考：

- [ESP32-C3 SuperMini尺寸与针距](https://protosupplies.com/product/esp32c3-supermini/)
- [ESP32-C3 SuperMini尺寸和引脚概览](https://www.espboards.dev/esp32/esp32-c3-super-mini/)

### 2.2 当前红色TB6612FNG模块

根据用户已提供的商品尺寸图和实物：

- 模块外形约`18.3mm × 21.1mm`。
- 两侧各8针。
- 同排针距`2.54mm`。
- 商品图标注排间距约14.8mm；该板实际用于2.54mm洞洞板，封装初值应按6个孔距，即`15.24mm`建立。

建议通孔焊盘同ESP32：孔径1.0～1.1mm，焊盘1.8～2.0mm。

模块顶视图常见顺序如下，必须与手中模块丝印逐脚复核：

```text
左排：PWMA, AIN2, AIN1, STBY, BIN1, BIN2, PWMB, GND
右排：VM,   VCC,  GND,  AO1,  AO2,  BO2,  BO1,  GND
```

TB6612芯片官方额定值为平均1.2A、峰值3.2A；模块PCB、排针和散热条件可能进一步降低可用电流：[Toshiba TB6612FNG官方资料](https://toshiba.semicon-storage.com/ap-en/semiconductor/product/motor-driver-ics/brushed-dc-motor-driver-ics/detail.TB6612FNG.html)。

### 2.3 当前5V升降压模块

用户实物与此前商品图相符：

- 外形约`40mm × 16mm × 7.8mm`。
- 输入约3～36V。
- 固定5V输出。
- 商品标称最大输出1A。

P1不为它制作板载插座封装，而设置一个4针接口`J_REG`：

| J_REG针脚 | 网络 | 接模块 |
|---|---|---|
| 1 | VBAT_PROTECTED | Vin+ |
| 2 | GND | Gin− |
| 3 | REG_5V | Vout+ |
| 4 | GND | Gout− |

建议使用2.54mm 1×4排针或4位可插拔端子。模块继续固定在底盘上，四根线控制在5～10cm并做好标签。

### 2.4 下单前必须做的实物复核

这些模块没有统一厂牌标准，网络尺寸只能作为建库初值。下单前必须：

1. 在Altium PCB Library中以1:1比例打印封装。
2. 将实际ESP32和TB6612排针放在纸上套孔。
3. 检查两排中心距、8针总长度、USB/天线方向和模块边界。
4. 如果不能顺畅套入，不得通过掰弯排针强行安装，应修改封装。

---

## 3. 新建Altium Designer工程

1. 执行`File → New → Project`。
2. 选择空白PCB Project。
3. 工程命名为`RC-Car-V1-P1.PrjPCB`。
4. 在工程目录增加：

```text
RC-Car-V1-P1.PrjPCB
RC-Car-V1-P1.SchDoc
RC-Car-V1-P1.PcbDoc
RC-Car-V1-P1.SchLib
RC-Car-V1-P1.PcbLib
RC-Car-V1-P1.OutJob
```

5. 单位统一切换为毫米。
6. 每完成一个阶段就保存一个版本，例如`P1_01_schematic`、`P1_02_placement`、`P1_03_routed`。

Altium官方项目说明：[Creating Projects and Documents](https://www.altium.com/documentation/altium-designer/creating-projects-documents)。

---

## 4. 建立原理图库

### 4.1 必要元件

| 位号 | 元件 | P1装配 |
|---|---|---|
| U1 | ESP32-C3 SuperMini模块 | 安装 |
| U2 | TB6612FNG模块，后轮驱动 | 安装 |
| U3 | TB6612FNG模块，未来前轮驱动 | DNP，不安装 |
| J1 | 电池输入2P | 安装 |
| J2 | 外置5V模块4P | 安装 |
| J3 | MG995舵机3P | 安装 |
| J4/J5 | 后左/后右电机2P | 安装 |
| J6/J7 | 前左/前右电机2P | 预留 |
| J8 | I2C扩展4P | 可不安装 |
| C1 | 1000μF，VM入口 | 安装 |
| C2 | 1000μF，舵机入口 | 安装 |
| C3～C6 | 100nF，电机端抑制 | 可放PCB，也建议直接焊在电机端子 |
| R1/R2/C7 | 电池ADC分压与滤波 | P1可DNP |
| F1 | 电池总保险丝/自恢复保险丝 | 建议安装 |
| Q1/R3 | P沟道MOS反接保护 | 建议安装或先验证后安装 |
| D1 | REG_5V到ESP_5V的防回灌肖特基二极管 | 建议安装 |
| TP1～TP6 | VBAT、5V、3V3、GND、STBY、SERVO测试点 | 安装焊盘 |

### 4.2 自定义模块符号

为U1、U2和U3创建符号时，符号引脚号必须与PCB封装焊盘号一一对应。引脚名称可以写GPIO或模块丝印，不能只写1～16而不保留对照表。

建议U1编号：

```text
1=5V    2=GND   3=3V3   4=GPIO4
5=GPIO3 6=GPIO2 7=GPIO1 8=GPIO0
9=GPIO20 10=GPIO21 11=GPIO5 12=GPIO6
13=GPIO7 14=GPIO8 15=GPIO9 16=GPIO10
```

上面的编号是假定从模块顶视图左上沿一侧向下，再从对侧下方向上连续编号。你也可以采用其他编号方式，但SchLib和PcbLib必须完全一致。

建议TB6612模块编号：

```text
1=PWMA 2=AIN2 3=AIN1 4=STBY
5=BIN1 6=BIN2 7=PWMB 8=GND
9=GND 10=BO1 11=BO2 12=AO2
13=AO1 14=GND 15=VCC 16=VM
```

再次强调：编号方式本身不是唯一的，唯一要求是符号、封装和实际模块方向一致。

---

## 5. 绘制原理图

### 5.1 电源网络

使用明确的网络名：

```text
VBAT_RAW
VBAT_PROTECTED
SERVO_VBAT
REG_5V
ESP_5V
3V3_LOGIC
GND
```

推荐路径：

```text
电池J1
  → F1保险丝
  → Q1反接保护
  → VBAT_PROTECTED
      ├─ U2/U3 VM
      ├─ 舵机红线 SERVO_VBAT
      ├─ J_REG Vin+
      ├─ C1/C2正极
      └─ BAT_ADC分压输入

J_REG Vout+ → REG_5V → D1 → ESP_5V → U1 5V
U1 3V3 → 3V3_LOGIC → U2/U3 VCC
所有负极 → GND
```

D1用于降低USB插入时向外置5V模块输出端回灌的风险。即便安装D1，调试时仍建议先断开电池再插USB。

### 5.2 U2后轮驱动

```text
GPIO3  → U2 AIN1
GPIO4  → U2 AIN2
GPIO5  → U2 PWMA
GPIO6  → U2 STBY
GPIO7  → U2 BIN1
GPIO10 → U2 BIN2
GPIO20 → U2 PWMB

U2 AO1/AO2 → J4 后左电机
U2 BO1/BO2 → J5 后右电机
```

### 5.3 U3四轮差速预留

U3控制输入与U2并联：

```text
U3 AIN1/AIN2/PWMA → 与U2 A通道共享
U3 BIN1/BIN2/PWMB → 与U2 B通道共享
U3 STBY           → 与U2 STBY共享
U3 AO1/AO2        → J6 前左电机
U3 BO1/BO2        → J7 前右电机
```

P1不安装U3时，J6/J7没有输出，这是正常情况。

### 5.4 舵机接口

建议J3按标准舵机顺序并在丝印上同时写颜色：

```text
1 GND         棕/黑
2 SERVO_VBAT  红
3 SERVO_PWM   橙/黄，连接GPIO21
```

不要把舵机红线接到ESP32 5V或3.3V。

### 5.5 BAT_ADC预留

建议：

```text
VBAT_PROTECTED → R1 100k → BAT_ADC(GPIO0)
BAT_ADC        → R2 100k → GND
BAT_ADC        → C7 100nF → GND
```

4节镍氢电池充满约5.6V，二分之一后约2.8V，处于ESP32 ADC范围内。P1尚未加入电池检测软件时，R1/R2/C7可以标记DNP。

### 5.6 ERC

1. 编译工程。
2. 确认所有连接器引脚都有明确网络名。
3. 电源输入必要时放置`No ERC`或合适的Power Port，但不要为了消除报错随意屏蔽整个网络。
4. 检查U1/U2/U3符号引脚号与封装焊盘号。
5. ERC报告保存到工程`reports`目录。

---

## 6. 建立PCB封装

### 6.1 ESP32封装

1. 在PcbLib中放置两排各8个Multi-Layer Pad。
2. 同排间距2.54mm。
3. 两排中心距15.24mm。
4. 孔径1.0～1.1mm；焊盘外径1.8～2.0mm。
5. Top Overlay画22.5×18mm模块边界和USB方向。
6. Top Assembly画真实外形。
7. Top Courtyard在外形四周增加至少0.5mm。
8. 天线端建立Component Keepout或单独机械层标注。
9. 1号焊盘方形，其余圆形。

### 6.2 TB6612模块封装

1. 两排各8孔，排内2.54mm。
2. 排间初值15.24mm。
3. 丝印外形18.3×21.1mm。
4. 清楚标记`VM/VCC`方向和1号脚。
5. U2、U3使用同一封装。

### 6.3 连接器封装

- 电池、电机：5.08mm 2P螺丝端子，开口朝板外。
- 舵机：2.54mm 1×3直针或防呆三针座。
- 外置电源：2.54mm 1×4，按`IN+ / GND / 5V / GND`丝印。
- I2C：2.54mm 1×4，按`3V3 / GND / SDA / SCL`丝印。

### 6.4 1:1封装检查

在开始布局前完成：

- 1:1打印ESP32和TB6612封装。
- 实物套孔。
- 实物连接器放到纸面确认开口方向。
- 检查相邻模块是否可以拔插。
- 检查USB插头、螺丝刀和舵机插头操作空间。

Altium通孔焊盘说明：[Working with Pads & Vias](https://www.altium.com/documentation/altium-designer/pcb/pads-vias)。

---

## 7. 创建PCB和层叠

1. 新建PcbDoc并加入工程。
2. 在`Design → Layer Stack Manager`设置：

```text
Top Layer       1oz copper
FR-4 dielectric 总板厚约1.6mm
Bottom Layer    1oz copper
Top/Bottom Solder Mask
Top/Bottom Overlay
```

3. 在Board Shape中建立70×50mm矩形。
4. 四角安装孔中心建议：

```text
(4,4), (66,4), (4,46), (66,46) mm
```

5. 安装孔使用3.2mm NPTH，周围至少留出直径7mm无元件区。

---

## 8. 推荐布局和出线方向

以车辆前进方向为PCB的“前侧”：

### 后侧板边

- J1电池输入。
- J2外置5V模块4线接口。
- 后左、后右电机端子靠近U2。
- C1靠近U2 VM/GND。

### 前侧板边

- J3舵机接口，插头朝前。
- 未来前左、前右电机端子靠近U3。
- C2紧邻舵机电源接口。

### 模块位置

- U2靠近后电机端子，缩短当前两路电机大电流路径。
- U3靠近前电机端子，P1可不装。
- ESP32放在一侧板边，天线端尽量伸出载板边缘。
- ESP32天线下方禁止铺铜、走线和放置器件。
- 天线附近至少15mm避免电池、电机、金属铜柱和粗导线。
- USB方向必须允许拔下模块后插线，或在底盘上留操作空间。

Espressif建议模块天线靠近或伸出基板边缘，并保持天线区域及外侧约15mm净空：[ESP32-C3 PCB Layout Design](https://docs.espressif.com/projects/esp-hardware-design-guidelines/en/latest/esp32c3/pcb-layout-design.html)。

### 布局优先级

```text
固定孔和板框
→ 板边连接器
→ U2与U3
→ ESP32及天线净空
→ C1/C2
→ 电源保护器件
→ 测试点
→ ADC/I2C预留
```

完成布局后先生成3D视图，检查模块是否相撞、插头是否朝外、螺丝刀是否可操作。

---

## 9. 设计规则

在`Design → Rules`或Constraint Manager中建立规则。不同Altium版本入口可能不同，官方规则说明见：[Defining PCB Design Rules](https://www.altium.com/documentation/altium-designer/pcb/defining-scoping-managing-design-rules)。

### 9.1 基础制造规则

| 规则 | 建议值 |
|---|---:|
| 最小线宽 | 0.20mm |
| 普通信号线 | 0.25～0.30mm |
| 最小间距 | 0.20mm |
| 普通信号过孔 | 0.6/0.3mm（盘/孔） |
| 铜到板边 | ≥0.30mm，推荐0.5mm |
| 丝印到阻焊开窗 | ≥0.15mm |

### 9.2 电源与电机规则

建立Net Class：

```text
POWER_HIGH: VBAT_PROTECTED, SERVO_VBAT, GND主干
MOTOR_OUT: AO1, AO2, BO1, BO2及未来前轮输出
LOGIC_PWR: REG_5V, ESP_5V, 3V3_LOGIC
SIGNAL: 其余GPIO
```

建议：

| 网络 | 线宽/处理 |
|---|---|
| VBAT、舵机供电主干 | 2.5～3.0mm或大面积铜皮 |
| 电机输出 | 1.5～2.0mm，尽量短 |
| REG_5V | 0.8～1.0mm |
| 3.3V | 0.5～0.8mm |
| GPIO/PWM | 0.25～0.30mm |
| GND | 双层铺铜并用过孔缝合 |

如果电源换层，不要只用一个小过孔；至少使用2～4个0.5mm孔径的过孔并联。

---

## 10. 布线顺序

1. 先锁定天线Keepout，Top/Bottom都禁止铜、走线和过孔。
2. 布VBAT、舵机供电和U2 VM。
3. 布U2到后轮电机端子的四根输出。
4. 布REG_5V、ESP_5V和3.3V。
5. 布STBY和PWM。
6. 布方向控制GPIO。
7. 布舵机PWM、BAT_ADC和I2C预留。
8. 最后在Top和Bottom铺GND Polygon。
9. 在板边、模块周围和电源回流附近增加GND stitching vias，间距可取5～10mm。
10. 重新铺铜并检查是否出现孤岛。

电机回路必须遵守“去程和回程靠近”的原则。不要让舵机或电机的大电流回流穿过ESP32 GND焊盘再回到电池。

---

## 11. 丝印与测试点

P1丝印必须比成品美观更重视防接错：

- 板名：`RC-Car V1 P1`。
- 箭头：`FRONT`。
- 电池端：`BAT+ / BAT−`。
- 舵机：`GND / + / SIG`并标颜色。
- 电机：`REAR-L / REAR-R / FRONT-L / FRONT-R`。
- U2：`REAR DRIVER`。
- U3：`FRONT DRIVER - DNP ON P1`。
- 外置电源：`VIN+ / GND / 5V / GND`。
- ESP32和TB6612都标1号脚、USB方向、VM/VCC方向。
- 电解电容同时标`+`和阴影负极。
- 测试点标`VBAT / 5V / 3V3 / GND / STBY / SERVO`。

---

## 12. PCB最终检查

### 12.1 电气检查

- [ ] 当前已验证GPIO与原理图一致。
- [ ] U2/U3 VCC接3.3V，VM接VBAT。
- [ ] 舵机红线接SERVO_VBAT，不接ESP 5V。
- [ ] 所有GND共地。
- [ ] 第2块驱动器控制输入与第1块并联。
- [ ] U3不安装时不影响U2。
- [ ] USB和外部5V不存在无保护硬并联路径。

### 12.2 机械检查

- [ ] 1:1打印套孔通过。
- [ ] ESP32和TB6612可以拔插。
- [ ] 天线端没有铜皮和走线。
- [ ] 连接器开口朝板外。
- [ ] 电解电容不会挡住模块和螺丝刀。
- [ ] 安装孔周围无铜、走线和器件。
- [ ] PCB实际尺寸可安装到底盘。

### 12.3 DRC

1. Repour所有Polygon。
2. 运行完整Design Rule Check。
3. 任何Short-Circuit、Clearance、Un-Routed Net、Hole Size和Silk-to-Solder-Mask错误都必须逐项处理。
4. 不要把错误批量改成Waived来获得“0 errors”。
5. 输出并保存DRC报告。

---

## 13. 生成打样文件

推荐建立`RC-Car-V1-P1.OutJob`，一次生成：

- Gerber或Gerber X2。
- NC Drill。
- IPC-356 Netlist（如果厂家支持）。
- PCB PDF打印图。
- Top/Bottom Assembly Drawing。
- BOM。
- Pick and Place（仅在需要贴片装配时）。

Altium官方推荐用OutJob统一生成制造输出：[Preparing Outputs and Releasing the Project](https://www.altium.com/documentation/altium-designer/tutorial/output-documentation-project-release)。

### Gerber设置

- Units：Millimeters。
- Format：建议4:6或厂家推荐格式。
- 输出Top Copper、Bottom Copper、Top/Bottom Solder Mask、Top/Bottom Overlay、Board Outline/Mechanical层。
- 启用Embedded Apertures/RS-274X或直接使用Gerber X2。

### NC Drill设置

- 单位与Gerber一致。
- Plated和Non-Plated孔按厂家要求分开或合并。
- 输出钻孔表并确认3.2mm安装孔为NPTH。

### 输出后检查

1. 新建一个完全独立的CAM查看窗口。
2. 只加载刚生成的Gerber和钻孔文件，不依赖PcbDoc显示。
3. 逐层检查板框、焊盘、阻焊、丝印和钻孔对齐。
4. 测量成品板框应为70×50mm。
5. 检查所有通孔都有铜环，安装孔没有铜环。
6. 将全部制造文件压缩为一个ZIP，ZIP根目录直接包含Gerber和钻孔文件，不嵌套多层目录。

---

## 14. 推荐下单参数

P1裸板建议：

```text
层数：2层
板材：FR-4
尺寸：约70 × 50mm
板厚：1.6mm
铜厚：1oz
阻焊：绿色
字符：白色
表面处理：无铅喷锡；预算优先也可选择普通喷锡
最小孔：不小于0.3mm
数量：5片
阻抗控制：不需要
半孔/金手指/盲埋孔：不需要
```

下单前查看厂家能力表，并保证设计规则不小于厂家最低能力。P1不要勾选不必要的高级工艺。

---

## 15. 收板后的焊接与上电顺序

### 15.1 裸板检查

1. 检查板框、孔位、丝印和阻焊。
2. 用万用表确认VBAT、5V、3.3V对GND没有持续短路。
3. 检查相邻排母焊盘没有短路。

### 15.2 焊接顺序

```text
低矮电阻/二极管
→ 测试点和小器件
→ 排母
→ 连接器
→ 保险丝/反接保护
→ 电解电容
```

先只焊一块P1，不要一次焊完全部5片。

### 15.3 分阶段通电

1. 不插ESP32、不插TB6612，连接电池，测VBAT和J_REG输入。
2. 接外置5V模块，确认REG_5V和ESP_5V正确。
3. 断电后插ESP32，确认5V和3.3V。
4. 烧录当前已验证车辆程序，确认串口和ESP-NOW。
5. 断电后插U2，不接电机，确认VM、VCC、STBY。
6. 接舵机并架空前轮，测试1120/1380/1640μs。
7. 最后接后轮电机并架空车轮测试。
8. 完成失联急停、满油门、转向和供电压降测试。

---

## 16. P1成功判据

满足以下条件才算P1完成：

- ESP32、TB6612模块无需掰针即可插拔。
- 外置5V模块四线连接正确。
- 遥控器通信、解锁、油门和舵机控制与洞洞板版本一致。
- 满油门和转向同时工作时ESP32不重启。
- 断开遥控器后100ms级失联保护有效。
- TB6612、电池线、连接器和PCB铜箔无异常发热。
- U3不安装时P1正常；安装U3后具备未来四轮差速硬件接口。
- DRC、制造文件检查和首板测试记录全部归档。

---

## 17. P1最容易犯的错误

1. 从焊接面观察模块后把左右排针镜像画反。
2. SchLib引脚号与PcbLib焊盘号不一致。
3. TB6612的VM和VCC接反。
4. 舵机电源错误地接到ESP32 5V。
5. 5V模块输出与USB 5V直接硬并联。
6. 天线下方铺铜或把电池放在天线旁边。
7. 电机与舵机主电流穿过ESP32地线回流。
8. 没有1:1打印封装就直接下单。
9. 只看PcbDoc，不用独立CAM查看器复查Gerber。
10. 收板后一次焊完所有模块，没有分阶段上电。

P1的核心原则是：**沿用已验证电路，只改变连接介质，不同时重新发明控制、电源和射频部分。**
