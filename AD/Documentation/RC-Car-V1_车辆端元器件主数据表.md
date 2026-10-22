| Design Item ID | Designator | Comment | Description | Footprint | Manufacturer | Manufacturer Part Number | Supplier | Supplier Part Number | Assembly Type | Quantity | P1装配 | 备注 |
|---|---|---|---|---|---|---|---|---|---|---:|---|---|
| ESP32_C3_DZQJ_SUPERMINI | U1（库默认 U?） | ESP32-C3 SuperMini | DZQJ ESP32-C3 SuperMini开发板，双排各8针 | Module_ESP32-C3_SuperMini_2x08_P2.54mm_W15.24mm | DZQJ／第三方 | 实物型号待核对 | 自购 | 待确认 | Module-Socketed | 1 | 安装 | 符号引脚号、模块丝印、封装焊盘号须逐脚对应；排母为独立装配物料 |
| TB6612FNG_MODULE_2X8 | U2（库默认 U?） | TB6612FNG_REAR_DRIVER | TB6612FNG双路电机驱动模块，后轮左／右 | Module_TB6612FNG_2x08_P2.54mm_W15.24mm | 第三方 | 实物型号待核对 | 自购 | 待确认 | Module-Socketed | 1 | 安装 | VCC接3V3_LOGIC，VM接VBAT_PROTECTED；排距需实测 |
| TB6612FNG_MODULE_2X8 | U3（库默认 U?） | TB6612FNG_FRONT_DRIVER | TB6612FNG双路电机驱动模块，前轮扩展 | Module_TB6612FNG_2x08_P2.54mm_W15.24mm | 第三方 | 实物型号待核对 | 自购 | 待确认 | Module-Socketed | 1 | DNP | 控制输入与U2共享；P1保留焊盘，不安装模块 |
| PTC_5A_16V_C2843993 | F1（库默认 F?） | SMD1812-500-16V | 5A保持、10A动作、16V自恢复保险丝 | FUSE-SMD_1812_L4.8-W3.5 | BNstar | SMD1812-500-16V | LCSC | C2843993 | SMT | 1 | 暂定安装 | 需按电机和舵机实测峰值电流确认 |
| AO4407A_C16072 | Q1（库默认 Q?） | AO4407A | P沟道MOS管，电池反接保护 | SOIC-8_L4.9-W3.9-P1.27 | AOS | AO4407A | LCSC | C16072 | SMT | 1 | 暂定安装 | 1～3为S、4为G、5～8为D；反接保护电路方向需单独复核 |
| R_100K_0603_C25803 | R3（库默认 R?） | 100k | Q1栅极电阻 | R_0603_1608Metric | UNI-ROYAL | 0603WAF1003T5E | LCSC | C25803 | SMT | 1 | 随Q1安装 | Q1 Gate至GND；Q1不装时该支路方案需重新处理 |
| SS34_C8678 | D1（库默认 D?） | SS34 | 3A、40V肖特基二极管，外部5V防回灌 | D_SMA_DO-214AC | MDD | SS34 | LCSC | C8678 | SMT | 1 | 暂定安装 | A接REG_5V，K接ESP_5V；还需验证压降后的ESP32输入电压 |
| TERMINAL_2P_WJ500V_C8465 | J1（库默认 J?） | BATTERY_INPUT | 2P、5.08mm电池输入螺钉端子 | TerminalBlock_WJ500V_1x02_P5.08mm | KANGNEX | WJ500V-5.08-2P | LCSC | C8465 | THT-Hand | 1 | 安装 | Pin1=BAT+，Pin2=GND；核对实物与库内封装 |
| HEADER_1X4_P2P54_C492403 | J2（库默认 J?） | EXTERNAL_5V_MODULE | 外置5V升降压模块的4线连接器 | PinHeader_1x04_P2.54mm_Vertical | 待确认 | 1×4、P2.54mm排针 | LCSC | C492403 | THT-Hand | 1 | 安装 | 1=VBAT_PROTECTED，2=GND，3=REG_5V，4=GND；此连接器承受线束拉力，需固定线束 |
| CAP_1000UF_10V_C970713 | C1（库默认 C?） | 1000uF/10V | 电机电源入口储能电容 | CAP-SMD_D10.0-H10.2 | DMBJ | RVT1A102M1010 1000UF 10V | LCSC | C970713 | SMT | 1 | 安装 | 正极接VBAT_PROTECTED；核对极性和贴装方向 |
| CAP_1000UF_10V_C970713 | C2（库默认 C?） | 1000uF/10V | 舵机电源入口储能电容 | CAP-SMD_D10.0-H10.2 | DMBJ | RVT1A102M1010 1000UF 10V | LCSC | C970713 | SMT | 1 | 安装 | 正极接SERVO_VBAT；核对极性和贴装方向 |
| C_100NF_0603_C14663 | C3～C6（库默认 C?） | 100nF | 四个电机端干扰抑制电容 | C_0603_1608Metric | YAGEO | CC0603KRX7R9BB104 | LCSC | C14663 | SMT／电机端手焊 | 4 | 按需 | 优先直接跨接电机端子；若装在PCB，应靠近对应输出端子 |
| C_100NF_0603_C14663 | C7（库默认 C?） | 100nF | 电池ADC分压滤波电容 | C_0603_1608Metric | YAGEO | CC0603KRX7R9BB104 | LCSC | C14663 | SMT | 1 | DNP | BAT_ADC至GND；与R1、R2同为预留 |
| C_100NF_0603_C14663 | C8（库默认 C?） | 100nF | ESP_5V电源去耦电容 | C_0603_1608Metric | YAGEO | CC0603KRX7R9BB104 | LCSC | C14663 | SMT | 1 | 安装 | 靠近U1电源引脚 |
| C_10UF_10V_TBD | C9（库默认 C?） | 10uF/10V | ESP_5V局部储能电容 | 待选型 | 待确认 | 待确认 | LCSC | 待确认 | SMT | 1 | 待定 | 建议容量与封装确定后再入BOM |
| R_100K_0603_C25803 | R1（库默认 R?） | 100k | 电池ADC分压上臂电阻 | R_0603_1608Metric | UNI-ROYAL | 0603WAF1003T5E | LCSC | C25803 | SMT | 1 | DNP | VBAT_PROTECTED至BAT_ADC |
| R_100K_0603_C25803 | R2（库默认 R?） | 100k | 电池ADC分压下臂电阻 | R_0603_1608Metric | UNI-ROYAL | 0603WAF1003T5E | LCSC | C25803 | SMT | 1 | DNP | BAT_ADC至GND |
| HEADER_SERVO_1X3_P2P54 | J3（库默认 J?） | MG995_SERVO | 舵机三针接口 | PinHeader_1x03_P2.54mm_Vertical | 待确认 | 待确认 | LCSC | 待确认 | THT-Hand | 1 | 安装 | 1=GND，2=SERVO_VBAT，3=SERVO_PWM；用实物确认插头方向 |
| TERMINAL_2P_WJ500V_C8465 | J4（库默认 J?） | M_REAR_L | 后左电机2P端子 | TerminalBlock_WJ500V_1x02_P5.08mm | KANGNEX | WJ500V-5.08-2P | LCSC | C8465 | THT-Hand | 1 | 安装 | U2 AO1/AO2 |
| TERMINAL_2P_WJ500V_C8465 | J5（库默认 J?） | M_REAR_R | 后右电机2P端子 | TerminalBlock_WJ500V_1x02_P5.08mm | KANGNEX | WJ500V-5.08-2P | LCSC | C8465 | THT-Hand | 1 | 安装 | U2 BO1/BO2 |
| TERMINAL_2P_WJ500V_C8465 | J6（库默认 J?） | M_FRONT_L | 前左电机扩展2P端子 | TerminalBlock_WJ500V_1x02_P5.08mm | KANGNEX | WJ500V-5.08-2P | LCSC | C8465 | THT-Hand | 1 | 按需 | U3 AO1/AO2；U3 DNP时无输出 |
| TERMINAL_2P_WJ500V_C8465 | J7（库默认 J?） | M_FRONT_R | 前右电机扩展2P端子 | TerminalBlock_WJ500V_1x02_P5.08mm | KANGNEX | WJ500V-5.08-2P | LCSC | C8465 | THT-Hand | 1 | 按需 | U3 BO1/BO2；U3 DNP时无输出 |
| HEADER_I2C_1X4_P2P54 | J8（库默认 J?） | I2C_EXPANSION | 3.3V I2C扩展接口 | PinHeader_1x04_P2.54mm_Vertical | 待确认 | 1×4、P2.54mm排针 | LCSC | C492403 | THT-Hand | 1 | 按需 | 1=3V3，2=GND，3=SDA，4=SCL；GPIO分配待复核 |
| PIN_SOCKET_1X8_P2P54_H8P5 | U1插座（可不单列位号） | 1x8 Female Header | ESP32开发板两侧排母 | PinSocket_1x08_P2.54mm_Vertical_H8.5mm | 待确认 | 待确认 | LCSC | 待确认 | THT-Hand | 2 | 安装 | 排母属于装配物料；避免与U1模块焊盘重复建连接网络 |
| PIN_SOCKET_1X8_P2P54_H8P5 | U2插座（可不单列位号） | 1x8 Female Header | TB6612后轮驱动模块两侧排母 | PinSocket_1x08_P2.54mm_Vertical_H8.5mm | 待确认 | 待确认 | LCSC | 待确认 | THT-Hand | 2 | 安装 | 核对与模块排针的匹配高度 |
| PIN_SOCKET_1X8_P2P54_H8P5 | U3插座（可不单列位号） | 1x8 Female Header | TB6612前轮扩展模块两侧排母 | PinSocket_1x08_P2.54mm_Vertical_H8.5mm | 待确认 | 待确认 | LCSC | 待确认 | THT-Hand | 2 | 按需 | 依P1是否保留空插座决定装配 |
| TESTPOINT_PCB_PAD | TP1（库默认 TP?） | VBAT | 电池保护后电压测试点 | TestPoint_Pad_D2.5mm | N/A | N/A | N/A | N/A | PCB-Feature | 1 | 制板形成 | 裸露铜焊盘，不开钢网，不进入采购BOM |
| TESTPOINT_PCB_PAD | TP2（库默认 TP?） | 5V | ESP_5V测试点 | TestPoint_Pad_D2.5mm | N/A | N/A | N/A | N/A | PCB-Feature | 1 | 制板形成 | 裸露铜焊盘，不开钢网，不进入采购BOM |
| TESTPOINT_PCB_PAD | TP3（库默认 TP?） | 3V3 | 3V3_LOGIC测试点 | TestPoint_Pad_D2.5mm | N/A | N/A | N/A | N/A | PCB-Feature | 1 | 制板形成 | 裸露铜焊盘，不开钢网，不进入采购BOM |
| TESTPOINT_PCB_PAD | TP4（库默认 TP?） | GND | 公共地测试点 | TestPoint_Pad_D2.5mm | N/A | N/A | N/A | N/A | PCB-Feature | 1 | 制板形成 | 裸露铜焊盘，不开钢网，不进入采购BOM |
| TESTPOINT_PCB_PAD | TP5（库默认 TP?） | STBY | 电机驱动待机信号测试点 | TestPoint_Pad_D2.5mm | N/A | N/A | N/A | N/A | PCB-Feature | 1 | 制板形成 | 裸露铜焊盘，不开钢网，不进入采购BOM |
| TESTPOINT_PCB_PAD | TP6（库默认 TP?） | SERVO | 舵机PWM测试点 | TestPoint_Pad_D2.5mm | N/A | N/A | N/A | N/A | PCB-Feature | 1 | 制板形成 | 裸露铜焊盘，不开钢网，不进入采购BOM |
| MOUNTING_HOLE_M3_NPTH | H1～H4（库默认 H?） | M3 | M3安装孔 | MountingHole_3.2mm_M3_NPTH | N/A | N/A | N/A | N/A | PCB-Feature | 4 | 制板形成 | 3.2mm非金属化孔；不进入采购BOM |
| EXTERNAL_5V_BUCKBOOST_MODULE | 板外模块 | 5V Buck-Boost Module | 外置5V升降压模块，4线接J2 | N/A | 第三方 | 实物型号待核对 | 自购 | 待确认 | Off-board | 1 | 板外安装 | 输出接入ESP32前测量为约5V；不进入PCB贴装坐标 |
| BATTERY_HOLDER_4XAA_NIMH | 板外电池盒 | 4xAA NiMH | 4节AA镍氢电池盒 | N/A | 待确认 | 待确认 | 自购 | 待确认 | Off-board | 1 | 板外安装 | 通过J1供电；电池盒固定到底盘 |
| MG995_SERVO | 板外舵机 | MG995 | 前轮转向舵机 | N/A | 待确认 | MG995 | 自购 | 待确认 | Off-board | 1 | 板外安装 | 通过J3连接；电源不可取自ESP32的5V或3V3 |
| REAR_TT_MOTOR | 板外电机 | TT Motor | 后左／后右减速电机 | N/A | 待确认 | 待确认 | 自购 | 待确认 | Off-board | 2 | 板外安装 | 接J4/J5；电机端建议跨接100nF抑制电容 |
