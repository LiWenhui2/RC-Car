import fs from "node:fs/promises";
import path from "node:path";
import { Workbook, SpreadsheetFile } from "@oai/artifact-tool";

const wb = Workbook.create();
const outDir = path.resolve("..");
const navy = "#17365D", blue = "#D9EAF7", green = "#E2F0D9", amber = "#FFF2CC", red = "#FCE4D6", gray = "#E7E6E6";

function title(sheet, text, subtitle, lastCol) {
  sheet.showGridLines = false;
  sheet.getRange(`A1:${lastCol}1`).merge();
  sheet.getRange("A1").values = [[text]];
  sheet.getRange("A1").format = { fill: navy, font: { bold: true, color: "#FFFFFF", size: 16 }, rowHeight: 28, verticalAlignment: "center" };
  sheet.getRange(`A2:${lastCol}2`).merge();
  sheet.getRange("A2").values = [[subtitle]];
  sheet.getRange("A2").format = { fill: blue, font: { color: "#17365D", italic: true }, wrapText: true, rowHeight: 34 };
}

function header(range) {
  range.format = { fill: navy, font: { bold: true, color: "#FFFFFF" }, wrapText: true, verticalAlignment: "center", borders: { preset: "outside", style: "thin", color: "#9EADBD" } };
}

function finish(sheet, used, widths, freezeRows=4) {
  sheet.getRange(used).format.verticalAlignment = "center";
  sheet.getRange(used).format.borders = { insideHorizontal: { style: "thin", color: "#D9E2F3" }, bottom: { style: "thin", color: "#A6A6A6" } };
  for (const [col, width] of Object.entries(widths)) sheet.getRange(`${col}:${col}`).format.columnWidth = width;
  sheet.freezePanes.freezeRows(freezeRows);
}

// Summary
const summary = wb.worksheets.add("使用说明");
title(summary, "RC-CAR-V1.0 Cadence 建库与物料清单", "范围：车辆载板 + 遥控器板 + 外部机电物料 + V1明确预留。黄色/TBC项目必须在正式封装前以实物或数据手册确认。", "H");
summary.getRange("A4:B10").values = [
  ["项目", "内容"],
  ["设计基线", "P1模块载板验证版；双层FR-4，1.6mm，1oz；优先保证首板可装、可测"],
  ["车辆板", "ESP32-C3 SuperMini + TB6612FNG模块；第二驱动与前轮接口预留"],
  ["遥控器板", "ESP32-C3 SuperMini + PS2摇杆 + OLED/按键接口；具体机械布局仍需冻结"],
  ["DNP含义", "PCB保留焊盘但首版不装配；原理图与PCB仍需创建符号和封装"],
  ["TBC含义", "型号、尺寸、针序或封装尚未冻结，禁止直接投板"],
  ["数量口径", "PCB数量按单套系统：1块车辆板 + 1块遥控器板；外部物料另列"]
];
header(summary.getRange("A4:B4"));
summary.getRange("A12:H12").values = [["关键统计", "车辆板行数", "遥控器板行数", "DNP/可选行数", "封装待确认", "外部物料行数", "安装孔", "当前最高风险"]];
header(summary.getRange("A12:H12"));
summary.getRange("A13:H13").values = [["本版快照", 22, 9, 13, 19, 14, 4, "模块针序与连接器具体型号"]];
summary.getRange("A16:H22").values = [
  ["建议建库顺序", "1", "2", "3", "4", "5", "6", "7"],
  ["对象", "通孔焊盘", "2P/3P/4P连接器", "电阻电容", "SuperMini模块", "TB6612模块", "保护器件", "安装孔/测试点"],
  ["验收", "孔径/盘径", "针序+开口方向", "数值+尺寸", "1:1套孔", "1:1套孔", "极性/散热", "孔径/禁布"],
  ["首板禁忌", "", "", "", "不要改裸芯片", "不要改裸芯片", "未验证不强装", "安装孔实测后冻结"],
  ["资料来源", "项目固定约束 agent.md", "详细接线说明", "Altium首板步骤", "实物/数据手册", "实物/数据手册", "器件数据手册", "底盘实测"],
  ["Cadence输出", ".pad", ".olb + .dra/.psm", ".olb + .dra/.psm", ".olb + .dra/.psm", ".olb + .dra/.psm", ".olb + .dra/.psm", ".pad/.dra/.psm"],
  ["放行条件", "尺寸已复核", "针序已复核", "封装已选", "实物套孔通过", "实物套孔通过", "极性正确", "板框/孔位冻结"]
];
header(summary.getRange("A16:H16"));
summary.getRange("A20:H20").format.fill = red;
finish(summary, "A4:H22", {A:18,B:22,C:18,D:18,E:20,F:20,G:20,H:28}, 3);

// PCB BOM
const bom = wb.worksheets.add("PCB建库BOM");
title(bom, "PCB建库BOM", "本表面向 Cadence Capture/PCB Editor 建库。状态为TBC的行先建符号草稿，不冻结封装。", "P");
const bh = ["位号","板卡","分类","元件/模块","规格/建议值","数量","单位","装配状态","原理图符号","Cadence封装建议","引脚/极性要点","网络/用途","采购/来源状态","封装确认状态","需实测参数","备注"];
bom.getRange("A4:P4").values = [bh]; header(bom.getRange("A4:P4"));
const rows = [
 ["U1","车辆板","主控模块","ESP32-C3 SuperMini","2×8针，2.54mm；约22.5×18mm",1,"块","安装","自建16Pin模块符号","TH_2x08_P2.54_Row15.24_Custom","1号脚、USB端、天线端；针序须按实物","主控/ESP-NOW","已购买并验证","TBC-实物复核","板长宽、排间距、排针直径、顶视针序","天线伸向板边并设禁布区"],
 ["U2","车辆板","电机驱动","TB6612FNG红色模块","2×8针，2.54mm；约18.3×21.1mm",1,"块","安装","自建16Pin模块符号","TH_2x08_P2.54_Row15.24_Custom","VM/VCC不可互换；顶视针序逐脚核对","后左/后右电机驱动","已购买并验证","TBC-实物复核","排间距、外形、排针直径、针序","平均电流能力受模块散热限制"],
 ["U3","车辆板","扩展驱动","TB6612FNG红色模块","与U2完全相同",1,"块","DNP-预留","复用U2符号","复用U2封装","与U2同向，丝印标FRONT DRIVER","未来前左/前右驱动","可后购","随U2","与U2共用控制网络","P1不安装"],
 ["J1","车辆板","电源接口","电池输入2P","优先5.08mm螺丝端子，额定电流需复核",1,"个","安装","CONN_2","TB_2P_P5.08","1=VBAT_RAW，2=GND；正负醒目标注","4×AA镍氢电池输入","型号未冻结","TBC-选型","孔径、针距、开口方向、额定电流","开口朝板外"],
 ["J2","车辆板","电源接口","外置5V升降压模块接口","1×4，2.54mm",1,"个","安装","CONN_4","HDR_1x04_P2.54","1=IN+ 2=GND 3=5V 4=GND","板外5V模块","模块已验证/接头未冻结","TBC-选型","接插件形式、线序、防反插","与USB 5V不得硬并联"],
 ["J3","车辆板","舵机接口","MG995标准3P接口","2.54mm 1×3直针或防呆座",1,"个","安装","SERVO_CONN_3","HDR_1x03_P2.54_Custom","1=GND 2=SERVO_VBAT 3=SERVO_PWM","前轮转向舵机","舵机已购买","TBC-连接器","插头方向、壳体干涉、针序","丝印同时标颜色"],
 ["J4","车辆板","电机接口","后左电机2P","5.08mm螺丝端子",1,"个","安装","MOTOR_CONN_2","TB_2P_P5.08","1/2对应U2 AO1/AO2","M_REAR_L","型号未冻结","TBC-选型","孔径、开口方向、额定电流","开口朝板外"],
 ["J5","车辆板","电机接口","后右电机2P","5.08mm螺丝端子",1,"个","安装","MOTOR_CONN_2","TB_2P_P5.08","1/2对应U2 BO1/BO2","M_REAR_R","型号未冻结","TBC-选型","同J4","与J4同型号"],
 ["J6","车辆板","扩展接口","前左电机2P","5.08mm螺丝端子",1,"个","DNP-预留","复用电机接口符号","复用J4封装","对应U3 AO1/AO2","M_FRONT_L","可后购","随J4","同J4","P1无输出"],
 ["J7","车辆板","扩展接口","前右电机2P","5.08mm螺丝端子",1,"个","DNP-预留","复用电机接口符号","复用J4封装","对应U3 BO1/BO2","M_FRONT_R","可后购","随J4","同J4","P1无输出"],
 ["J8","车辆板","扩展接口","I2C接口4P","2.54mm 1×4",1,"个","可选-DNP","CONN_4","HDR_1x04_P2.54","1=3V3 2=GND 3=SDA 4=SCL","OLED/扩展","型号未冻结","TBC-选型","防反插、丝印方向","GPIO2为启动相关脚"],
 ["C1","车辆板","储能电容","铝电解电容","1000uF，耐压≥10V，低ESR优先",1,"只","安装","CAP_POL","CAP_RADIAL_Custom","正极接VBAT/VM，负极接GND","电机VM入口","已有/需核规格","TBC-实物","直径、高度、脚距、引脚直径","靠近U2/J1"],
 ["C2","车辆板","储能电容","铝电解电容","1000uF，耐压≥10V，低ESR优先",1,"只","安装","CAP_POL","复用C1封装或另建","正极接SERVO_VBAT，负极接GND","舵机电源入口","已有/需核规格","TBC-实物","同C1","靠近J3"],
 ["C3-C6","车辆板","抑制电容","陶瓷电容","100nF/50V",4,"只","可选-建议电机端安装","CAP","C_THT_P5.00或SMD_0805","无极性","四个电机端抑制","已有部分","TBC-安装方式","封装尺寸、是否板载","V1实装后轮2只"],
 ["R1,R2","车辆板","采样电阻","电阻","100kΩ，1%",2,"只","DNP-预留","RES","R_0805","无极性；R1上臂/R2下臂","BAT_ADC分压","待配","可用-0805","功率/尺寸","GPIO0，分压后满电约2.8V"],
 ["C7","车辆板","ADC滤波","陶瓷电容","100nF",1,"只","DNP-预留","CAP","C_0805","无极性","BAT_ADC滤波","待配","可用-0805","尺寸","靠近U1 ADC脚"],
 ["F1","车辆板","保护","自恢复保险丝/PTC","保持电流和动作电流待堵转电流实测后确定",1,"只","建议安装","FUSE","FUSE_THT_or_SMD_Custom","串联VBAT正极","总电源过流保护","未选型","TBC-电气+封装","堵转电流、尺寸、脚距","未测电流前不可冻结型号"],
 ["Q1","车辆板","保护","P沟道MOSFET","低Rds(on)，耐压≥20V，电流余量待核",1,"只","可选-验证后安装","PMOS","按最终料号","S/G/D必须按数据手册","反接保护","未选型","TBC-料号","料号、封装、引脚定义、散热","也可改用防反接模块/二极管方案"],
 ["R3","车辆板","偏置电阻","MOS栅极电阻","100kΩ建议值",1,"只","随Q1","RES","R_0805","连接Q1栅极偏置","反接保护","待配","可用-0805","最终阻值","随Q1方案冻结"],
 ["D1","车辆板","电源隔离","肖特基二极管","低压降；电流按ESP32峰值留余量",1,"只","建议安装","SCHOTTKY","按最终料号","A/K极性必须标注","REG_5V→ESP_5V防回灌","未选型","TBC-料号","料号、封装、电流、压降","USB与外部5V电源隔离"],
 ["TP1-TP6","车辆板","测试点","圆形测试焊盘","VBAT/5V/3V3/GND/STBY/SERVO",6,"个","安装","TESTPOINT","TP_THT_or_SMD_1.5mm","丝印标网络名","调试与首板上电","PCB直接实现","可用","探针尺寸","不要被模块遮挡"],
 ["H1-H4","车辆板","机械","M3安装孔","成品孔3.2mm",4,"个","安装","MOUNTING_HOLE","MH_M3_NPTH_3.2","NPTH，周围禁布/避铜","板体固定","PCB直接实现","TBC-底盘孔位","孔中心距与铜柱外径","建议初值62×42mm，实测后冻结"],
 ["U101","遥控器板","主控模块","ESP32-C3 SuperMini","与U1同型号",1,"块","安装","复用U1符号","复用U1封装","实物针序保持一致","遥控器ESP-NOW主控","已购买并验证","随U1","安装方向、USB空间","GPIO0/1/2用于摇杆"],
 ["J101","遥控器板","输入接口","PS2双轴摇杆模块接口","5P，建议2.54mm防呆连接器",1,"个","安装","JOYSTICK_5","HDR_1x05_P2.54_Custom","3V3/GND/VRx/VRy/SW，按实物复核","油门/转向/急停","模块已购买","TBC-针序+连接器","模块针序、插头、线长","摇杆模块必须3.3V供电"],
 ["J102","遥控器板","显示接口","0.96英寸I2C OLED接口","4P，2.54mm",1,"个","可选","OLED_I2C_4","HDR_1x04_P2.54_Custom","VCC/GND/SCL/SDA顺序因模块而异","状态显示","显示模块状态待确认","TBC-实物","针序、供电电压、安装孔","切勿假设常见针序"],
 ["SW101,SW102","遥控器板","人机输入","功能按键","常开轻触开关",2,"只","可选-预留","SW_PUSH","SW_TACT_Custom","上拉输入，按下接GND建议","功能/菜单","未选型","TBC-料号","帽高、按压力、焊盘尺寸","摇杆SW已承担急停"],
 ["D101","遥控器板","指示","状态LED","0603或0805",1,"只","可选","LED","LED_0805","A/K极性","状态指示","待配","可用-0805","颜色、亮度","需配限流电阻"],
 ["R101","遥控器板","限流","LED限流电阻","1kΩ建议起始值",1,"只","随D101","RES","R_0805","无极性","LED限流","待配","可用-0805","根据LED亮度调整",""],
 ["R102,R103","遥控器板","ADC滤波","串联电阻","1kΩ",2,"只","建议安装","RES","R_0805","无极性","VRx/VRy输入滤波","待配","可用-0805","","每路一只"],
 ["C101,C102","遥控器板","ADC滤波","陶瓷电容","100nF",2,"只","建议安装","CAP","C_0805","无极性，对地","VRx/VRy低通滤波","待配","可用-0805","","靠近ESP32 ADC脚"],
 ["J103","遥控器板","电源接口","外部电池/稳压接口","具体电源架构未冻结",1,"个","DNP-预留","POWER_CONN","TBC","严禁与USB电源硬并联","脱线供电","未选型","TBC-架构","电池类型、稳压模块、开关","先用USB供电可不装"],
 ["H101-H104","遥控器板","机械","M3安装孔","成品孔3.2mm",4,"个","可选","MOUNTING_HOLE","MH_M3_NPTH_3.2","NPTH","外壳固定","PCB直接实现","TBC-外壳","孔位、外壳、摇杆高度","遥控器外壳确定后冻结"]
];
bom.getRangeByIndexes(4,0,rows.length,16).values = rows;
const end = 4 + rows.length;
bom.tables.add(`A4:P${end}`, true, "CadenceBomTable").style = "TableStyleMedium2";
bom.getRange(`H5:H${end}`).dataValidation = { rule: { type: "list", values: ["安装","建议安装","可选","可选-DNP","DNP-预留","随Q1","随D101"] } };
bom.getRange(`N5:N${end}`).conditionalFormats.add("containsText", { text: "TBC", format: { fill: amber, font: { bold: true, color: "#9C5700" } } });
bom.getRange(`H5:H${end}`).conditionalFormats.add("containsText", { text: "DNP", format: { fill: gray, font: { color: "#595959" } } });
bom.getRange(`A5:P${end}`).format.wrapText = true;
finish(bom, `A4:P${end}`, {A:13,B:12,C:14,D:26,E:28,F:8,G:8,H:16,I:22,J:30,K:32,L:22,M:18,N:18,O:30,P:28}, 4);

// Pin maps
const pins = wb.worksheets.add("模块针序与网络");
title(pins, "模块针序与网络", "编号方案必须在 Capture 符号、PCB封装和实物顶视图之间保持一致；以下为当前建议，投板前逐脚复核。", "G");
pins.getRange("A4:G4").values = [["模块","建议Pin/Pad","实物丝印/名称","车辆板网络/功能","遥控器功能","方向/注意事项","确认状态"]]; header(pins.getRange("A4:G4"));
const pinRows = [];
const esp = [[1,"5V"],[2,"GND"],[3,"3V3"],[4,"GPIO4"],[5,"GPIO3"],[6,"GPIO2"],[7,"GPIO1"],[8,"GPIO0"],[9,"GPIO20"],[10,"GPIO21"],[11,"GPIO5"],[12,"GPIO6"],[13,"GPIO7"],[14,"GPIO8"],[15,"GPIO9"],[16,"GPIO10"]];
const vehicleMap={GPIO3:"LEFT_IN1",GPIO4:"LEFT_IN2",GPIO5:"LEFT_PWM",GPIO6:"MOTOR_STBY",GPIO7:"RIGHT_IN1",GPIO10:"RIGHT_IN2",GPIO20:"RIGHT_PWM",GPIO21:"SERVO_PWM",GPIO0:"BAT_ADC",GPIO1:"I2C_SDA",GPIO2:"I2C_SCL"};
const remoteMap={GPIO0:"JOYSTICK_VRX",GPIO1:"JOYSTICK_VRY",GPIO2:"JOYSTICK_SW"};
for (const [n,name] of esp) pinRows.push(["ESP32-C3 SuperMini",n,name,vehicleMap[name]||name,remoteMap[name]||name,n===1?"方形焊盘；以实物顶视图确认起点":"", "TBC-实物复核"]);
const tb = [[1,"PWMA"],[2,"AIN2"],[3,"AIN1"],[4,"STBY"],[5,"BIN1"],[6,"BIN2"],[7,"PWMB"],[8,"GND"],[9,"GND"],[10,"BO1"],[11,"BO2"],[12,"AO2"],[13,"AO1"],[14,"GND"],[15,"VCC"],[16,"VM"]];
for (const [n,name] of tb) pinRows.push(["TB6612FNG模块",n,name,{PWMA:"LEFT_PWM",AIN2:"LEFT_IN2",AIN1:"LEFT_IN1",STBY:"MOTOR_STBY",BIN1:"RIGHT_IN1",BIN2:"RIGHT_IN2",PWMB:"RIGHT_PWM",VCC:"3V3",VM:"VBAT_MOTOR"}[name]||name,"—",n===1?"方形焊盘；VM/VCC方向重点核对":"", "TBC-实物复核"]);
pinRows.push(["MG995接口",1,"GND","GND","—","棕/黑线","待连接器选型"],["MG995接口",2,"SERVO_PWR","SERVO_VBAT","—","红线","待连接器选型"],["MG995接口",3,"PWM","SERVO_PWM","—","橙/黄线","待连接器选型"]);
pins.getRangeByIndexes(4,0,pinRows.length,7).values=pinRows;
pins.tables.add(`A4:G${4+pinRows.length}`,true,"PinMapTable").style="TableStyleMedium2";
pins.getRange(`A5:G${4+pinRows.length}`).format.wrapText=true;
finish(pins, `A4:G${4+pinRows.length}`, {A:24,B:14,C:18,D:24,E:22,F:32,G:18}, 4);

// Footprints
const fp = wb.worksheets.add("封装制作清单");
title(fp, "Cadence封装制作清单", "用于安排 Padstack Editor 与 PCB Editor 的建库顺序。‘可复用’表示多个位号共享同一封装。", "K");
fp.getRange("A4:K4").values=[["优先级","封装名称建议","适用位号","类型","焊盘/孔","关键尺寸","丝印/装配要求","Courtyard/Keepout","1:1验证","状态","备注"]]; header(fp.getRange("A4:K4"));
const fps=[
 [1,"PAD_THT_R1.9_D1.0","模块排针/排母","Padstack","孔1.0mm，盘1.9mm","按实物排针可改孔1.1mm","1脚另建方盘版本","—","打印+实物套孔","TBC","先做圆盘和方盘"],
 [2,"TH_2x08_P2.54_ROW15.24_ESP32C3SM","U1/U101","模块封装","复用Padstack","2.54mm；排间15.24mm；外形约22.5×18mm","USB/天线/1脚清晰","天线下方与外侧Keepout","必须","TBC","实物优先于网络尺寸"],
 [3,"TH_2x08_P2.54_ROW15.24_TB6612_RED","U2/U3","模块封装","复用Padstack","2.54mm；排间初值15.24mm；外形约18.3×21.1mm","标VM/VCC/1脚","四周≥0.5mm","必须","TBC","逐脚核对红色模块"],
 [4,"TB_2P_P5.08","J1/J4-J7","连接器","孔径按端子脚","针距5.08mm","开口方向/1脚","螺丝刀操作空间","必须","TBC","最终型号未选"],
 [5,"HDR_1x03_P2.54_SERVO","J3","连接器","孔约1.0mm","针距2.54mm","标GND/PWR/SIG与颜色","插头操作空间","必须","TBC","可改防呆座"],
 [6,"HDR_1x04_P2.54","J2/J8/J102","连接器","孔约1.0mm","针距2.54mm","各接口单独标针序","插拔空间","必须","TBC","同封装不同符号"],
 [7,"HDR_1x05_P2.54","J101","连接器","孔约1.0mm","针距2.54mm","摇杆信号丝印","插拔空间","必须","TBC","针序待实物"],
 [8,"CAP_RADIAL_1000UF_CUSTOM","C1/C2","电解电容","按实物","脚距/直径TBC","+号与负极阴影","直径+0.5mm","必须","TBC","两只若尺寸不同需分封装"],
 [9,"R_0805 / C_0805 / LED_0805","R/C/D小器件","SMD标准","厂家标准","2012公制","极性件标记","常规","目检","可用","适合手焊"],
 [10,"MH_M3_NPTH_3.2","H1-H4/H101-H104","机械孔","NPTH","成品孔3.2mm","安装孔标识","铜柱外径避让","底盘/外壳套孔","TBC","孔位不是封装尺寸的一部分"],
 [11,"TP_SMD_1.5","TP1-TP6","测试点","SMD裸铜","直径约1.5mm","标网络名","探针可达","探针验证","可用","可按工厂能力调整"],
 [12,"最终料号封装","F1/Q1/D1/SW101等","保护/开关","按数据手册","TBC","极性与1脚","按器件高度","必须","TBC","料号冻结后再制作"]
];
fp.getRangeByIndexes(4,0,fps.length,11).values=fps;
fp.tables.add(`A4:K${4+fps.length}`,true,"FootprintTable").style="TableStyleMedium2";
fp.getRange(`J5:J${4+fps.length}`).conditionalFormats.add("containsText",{text:"TBC",format:{fill:amber,font:{bold:true,color:"#9C5700"}}});
fp.getRange(`A5:K${4+fps.length}`).format.wrapText=true;
finish(fp,`A4:K${4+fps.length}`,{A:9,B:38,C:22,D:16,E:24,F:30,G:30,H:24,I:16,J:12,K:28},4);

// External materials
const ext=wb.worksheets.add("外部机电物料");
title(ext,"外部机电与线束物料","这些物料通常不进入PCB BOM，但决定接口、电流、板框和封装选择。", "J");
ext.getRange("A4:J4").values=[["编号","类别","物料","规格/当前决定","V1数量","状态","影响的PCB对象","必须确认","是否建Cadence封装","备注"]]; header(ext.getRange("A4:J4"));
const ex=[
 ["M1-M2","执行器","后轮TT减速电机","低电流型号，实车已验证方向需软件反向",2,"已购买/已验证","J4/J5、F1、线宽","启动/堵转电流、端子形式","否","每台电机端跨接100nF"],
 ["M3-M4","扩展","前轮电机","未来四轮差速",2,"不属于V1实装","J6/J7/U3","启动/堵转电流","否","扩展前重新核算电源"],
 ["SV1","执行器","MG995舵机","脉宽1120/1380/1640us；电池大电流分支",1,"已购买/已验证","J3/C2/电源回流","插头针序、峰值电流、机械行程","仅接口","不得由ESP32供电"],
 ["BAT1","电源","4×AA镍氢电池+电池盒","标称4.8V，充满约5.2-5.6V",1,"已购买/已验证","J1/F1/Q1/线宽","电池盒插头与极性","仅接口","USB与外部5V不得并联"],
 ["REG1","电源","固定5V升降压模块","约40×16×7.8mm；输入3-36V；标称最大1A",1,"已有/已验证逻辑供电","J2/D1","实物端子顺序、线束","否-板外","当前不承担舵机主电流"],
 ["JOY1","输入","PS2双轴10kΩ摇杆模块","3.3V供电；VRx/VRy/SW",1,"已购买/已验证","J101/R102-R103/C101-C102","5P针序、模块尺寸、安装孔","仅接口/或按外壳需求","GPIO2上电时不要被按住"],
 ["DISP1","显示","0.96英寸I2C OLED","可选",1,"状态待确认","J8或J102","模块针序、3.3V兼容、孔位","仅接口/可选模块封装","不同模块VCC/GND顺序常不同"],
 ["CH1","机械","四轮舵机转向底盘","前轮转向、后轮双电机",1,"已购买/已验证","车辆板板框/H1-H4","实际孔距、净空、天线方向","否","最终板框须以实测冻结"],
 ["W1","线束","电池/电机/舵机线","20-22AWG或0.3-0.5mm²",1,"需配","全部大电流连接器","线径、端子额定电流","否","主电流不走杜邦线"],
 ["W2","线束","信号线与防呆插头","按J2/J3/J8/J101选型",1,"待选型","连接器封装","线序、压接端子、壳体","否","统一插头系列可减少错误"],
 ["SW1","电源","车辆总电源开关","电流能力需覆盖电机+舵机峰值",1,"待选型","可板外或板载接口","额定直流电流、安装方式","若板载则需要","建议板外安装便于操作"],
 ["HW1","机械","M3铜柱/螺钉/垫片","按底盘间距与板厚",4,"待配","H1-H4","铜柱外径、高度","否","避免压住天线区域"],
 ["PCB1","制造","车辆控制PCB","70×50mm初值，≤80×60mm",1,"待设计","全部车辆板器件","板框/孔位/接口边缘","—","双层FR-4 1.6mm 1oz"],
 ["PCB2","制造","遥控器PCB","尺寸待外壳与摇杆布局",1,"待设计","全部遥控器器件","外壳/摇杆/OLED孔位","—","先完成车辆板再设计"]
];
ext.getRangeByIndexes(4,0,ex.length,10).values=ex;
ext.tables.add(`A4:J${4+ex.length}`,true,"ExternalBomTable").style="TableStyleMedium2";
ext.getRange(`A5:J${4+ex.length}`).format.wrapText=true;
finish(ext,`A4:J${4+ex.length}`,{A:12,B:12,C:26,D:36,E:10,F:18,G:24,H:34,I:20,J:30},4);

// Open items
const open=wb.worksheets.add("封装前待确认");
title(open,"封装冻结前待确认清单","按优先级关闭这些问题。完成一项后把状态改为“已确认”，并在证据栏填写实测值或数据手册页码。", "H");
open.getRange("A4:H4").values=[["优先级","对象","待确认问题","确认方法","放行标准","状态","证据/实测值","责任阶段"]]; header(open.getRange("A4:H4"));
const opens=[
 ["P0","ESP32-C3 SuperMini","实际顶视针序、两排间距、排针直径、USB/天线方向","游标卡尺+万用表+实物丝印","符号/封装/实物三者完全一致","未确认","","制作U1封装前"],
 ["P0","TB6612FNG红色模块","实际顶视针序、排间距、VM/VCC方向","卡尺+实物丝印+通断复核","U2/U3可无应力插拔且针序一致","未确认","","制作U2封装前"],
 ["P0","电池/电机端子","选定具体5.08mm 2P型号","数据手册+实物","孔径/针距/开口/额定电流全部确定","未确认","","制作J1/J4-J7前"],
 ["P0","舵机3P接口","选直针还是防呆座，确认针序","用MG995插头实配","GND/PWR/SIG方向无歧义","未确认","","制作J3前"],
 ["P0","底盘安装孔","车辆板实际孔中心距与禁布空间","卡尺测量底盘/转接板","4孔与70×50mm板框均不干涉","未确认","","冻结板框前"],
 ["P1","C1/C2电解电容","直径、高度、脚距","读取料号或卡尺测量","封装可插装且不挡模块/螺丝刀","未确认","","制作电容封装前"],
 ["P1","F1自恢复保险丝","保持电流与动作电流","实测后轮电机启动/堵转+舵机峰值","正常不误动作、故障可保护","未确认","","原理图定版前"],
 ["P1","Q1/D1保护方案","是否装配及具体料号","压降/电流/热评估+台架验证","极性、封装、温升均通过","未确认","","原理图定版前"],
 ["P1","遥控器摇杆接口","5P实物针序与安装方式","万用表+实物","3.3V/VRx/VRy/SW/GND一致","未确认","","遥控器原理图前"],
 ["P1","OLED接口","模块针序与供电电压","查看实物和数据手册","VCC/GND/SDA/SCL无误","未确认","","遥控器原理图前"],
 ["P2","遥控器供电","USB-only还是电池+稳压","确定使用场景和外壳","不会与USB硬并联","未确认","","遥控器PCB前"],
 ["P2","前轮扩展","四电机电流与第二驱动散热","扩展前台架实测","电池/驱动/连接器/铜箔有余量","延后","","V2扩展前"]
];
open.getRangeByIndexes(4,0,opens.length,8).values=opens;
open.tables.add(`A4:H${4+opens.length}`,true,"OpenItemsTable").style="TableStyleMedium2";
open.getRange(`F5:F${4+opens.length}`).dataValidation={rule:{type:"list",values:["未确认","测量中","已确认","延后"]}};
open.getRange(`F5:F${4+opens.length}`).conditionalFormats.add("containsText",{text:"未确认",format:{fill:red,font:{bold:true,color:"#9C0006"}}});
open.getRange(`F5:F${4+opens.length}`).conditionalFormats.add("containsText",{text:"已确认",format:{fill:green,font:{bold:true,color:"#006100"}}});
open.getRange(`A5:H${4+opens.length}`).format.wrapText=true;
finish(open,`A4:H${4+opens.length}`,{A:10,B:24,C:38,D:30,E:36,F:14,G:28,H:20},4);

// Sources
const src=wb.worksheets.add("资料来源");
title(src,"资料来源与版本基线","项目内资料优先级：agent.md固定约束 > 已验证接线 > 首板设计步骤 > 采购表。", "D");
src.getRange("A4:D4").values=[["来源","位置","用途","备注"]]; header(src.getRange("A4:D4"));
src.getRange("A5:D10").values=[
 ["项目固定约束","H:\\RC-Car\\agent.md","架构、电源、接口、扩展边界","除非用户明确修改，否则作为最高优先级"],
 ["详细接线说明","H:\\RC-Car\\docs\\RC-Car-V1_详细接线说明.md","已验证GPIO、供电、舵机参数、测试点","面包板验证基线"],
 ["首版PCB步骤","H:\\RC-Car\\docs\\RC-Car-V1_Altium-Designer首版PCB打样步骤.md","P1模块载板BOM、模块尺寸、位号、封装初值","方法可迁移至Cadence"],
 ["现有采购清单","H:\\RC-Car\\outputs\\rc_car_bom_20260802","已购/待购物料参考","采购状态可能需人工更新"],
 ["ESP32参考","https://docs.espressif.com/projects/esp-hardware-design-guidelines/en/latest/esp32c3/pcb-layout-design.html","天线布局原则","本项目使用开发板模块，仍需天线净空"],
 ["TB6612官方","https://toshiba.semicon-storage.com/ap-en/semiconductor/product/motor-driver-ics/brushed-dc-motor-driver-ics/detail.TB6612FNG.html","驱动器额定值参考","模块能力可能低于裸芯片额定值"]
];
src.getRange("A5:D10").format.wrapText=true;
finish(src,"A4:D10",{A:20,B:70,C:36,D:42},4);

// Render every sheet for QA.
await fs.mkdir(outDir,{recursive:true});
for (const name of ["使用说明","PCB建库BOM","模块针序与网络","封装制作清单","外部机电物料","封装前待确认","资料来源"]) {
  const blob=await wb.render({sheetName:name,autoCrop:"all",scale:0.8,format:"png"});
  await fs.writeFile(path.join(outDir,`preview_${name}.png`),new Uint8Array(await blob.arrayBuffer()));
}
const inspect=await wb.inspect({kind:"region",sheetId:"PCB建库BOM",range:`A4:P${end}`,tableMaxRows:8,tableMaxCols:16,maxChars:6000});
console.log(inspect.ndjson);
const errors=await wb.inspect({kind:"match",searchTerm:"#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",options:{useRegex:true,maxResults:100},summary:"final formula error scan"});
console.log(errors.ndjson);
const file=await SpreadsheetFile.exportXlsx(wb);
await file.save(path.join(outDir,"RC-CAR-V1.0_Cadence建库与物料清单.xlsx"));
