import fs from 'node:fs/promises';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const outDir = 'outputs/rc_car_servo_v1_20260802';
const previewDir = `${outDir}/previews`;

const materials = [
  ['主控与调试','ESP32-C3 SuperMini开发板组合','已焊排针；1块单板+套餐四中的1块',1,'批',0,'已下单',53.58,'V1必需','遥控器与车体各1块','无需追加'],
  ['主控与调试','830孔面包板、跳线、USB数据线、0.96寸屏','已包含在已下单套餐四中',1,'套',0,'已下单',0,'V1必需','原型搭建；显示屏可选','无需追加'],
  ['机械底盘','四轮舵机转向底盘','前轮转向节+拉杆；后轮双TT电机；四轮；安装件',1,'套',0,'待买',null,'V1必需','第一版机械主体','未来用固定前电机支架替换转向前桥'],
  ['转向','MG90S金属齿9g舵机','4.8–6V；标准3线；含舵盘',1,'个',0,'待买',null,'V1必需','前轮转向','差速模式可锁中或拆除'],
  ['电机驱动','TB6612FNG双路驱动模块','已焊排针；VCC必须支持3.3V逻辑',1,'块',1,'待买',13.11,'V1必需','控制后左/后右电机','追加1块控制前左/前右电机'],
  ['遥控输入','PS2双轴10kΩ摇杆模块','3.3V供电；配5P线或已焊排针',1,'个',0,'待买',null,'V1必需','油门与转向输入','软件协议不变'],
  ['车体供电','4节AA电池盒','带开关优先；低电阻引线',1,'个',0,'待买',null,'V1必需','车体电池输入','四电机前复核触点电流能力'],
  ['车体供电','AA镍氢充电电池','同品牌同容量，建议低内阻',4,'节',0,'待买',null,'V1必需','标称约4.8V','四电机时可能需要更高放电能力'],
  ['车体供电','AA/AAA镍氢充电器','独立槽检测优先',1,'台',0,'待买',null,'V1必需','电池充电','无需追加'],
  ['舵机电源','5V升降压模块','输入覆盖4节AA；持续≥1A、瞬态≥2A',1,'块',0,'待买',null,'V1必需','独立SERVO_5V支路','未来仍保留'],
  ['遥控器供电','4节AAA电池盒+AAA镍氢电池','可先USB供电调试，后续再买',1,'组',0,'可后买',null,'整车无线必需','遥控器脱线运行','无需追加'],
  ['抗干扰','100nF陶瓷电容','50V；每台电机端子并1只',2,'只',2,'待买',null,'V1必需','后轮两电机抑制干扰','扩展前轮再加2只'],
  ['滤波','470–1000µF电解电容','耐压≥10V，低ESR优先',2,'只',1,'待买',null,'V1必需','电机VM与舵机5V各1只','第二驱动附近再加1只'],
  ['布线保护','22AWG红黑线、热缩管、连接器、电源开关','电机和电池回路不用细杜邦线',1,'批',1,'待买',null,'V1必需','可靠电源与电机布线','扩展增加前轮线束'],
  ['测试工具','数字万用表','直流电流档、通断档',1,'台',0,'按需',null,'强烈建议','电机电流与短路检查','无需追加'],
  ['测试工具','可调限流电源','0–6V范围可调，支持限流',1,'台',0,'按需',null,'强烈建议','测电机启动/堵转电流','四电机扩展前必须测量'],
];

const pcbPlan = [
  ['板框与安装','80mm×60mm以内；4×M3孔','保持相同板框','孔径3.2mm；建议中心距72mm×52mm','选定底盘实测后再冻结Gerber'],
  ['主控','SuperMini插座或ESP32-C3-MINI-1','不变','3V3/GND/USB/BOOT/RESET/UART测试点','天线朝板边并设置净空'],
  ['驱动A','装配1组TB6612，控制后左/后右','继续使用','M_REAR_L、M_REAR_R','VCC=3.3V；VM接VBAT_MOTOR'],
  ['驱动B','只留插座/焊盘，不装','装配后控制前左/前右','M_FRONT_L、M_FRONT_R','与驱动A共享左右逻辑网络'],
  ['左右控制网络','V1左右后轮命令相同','左侧前后同命令、右侧前后同命令','LEFT_IN1/IN2/PWM；RIGHT_IN1/IN2/PWM；STBY','不要求四轮独立闭环'],
  ['舵机接口','装配标准3针接口','保留，可锁中或停用','GND/SERVO_5V/SERVO_PWM','严禁从3V3脚给舵机供电'],
  ['电池输入','装配','不变','BAT+/BAT-/SW/FUSE/REV_PROTECT','USB 5V不得与电池硬并联'],
  ['电源分区','VBAT_MOTOR、SERVO_5V、3V3_LOGIC','增加第二驱动负载','星形回地；电源测试点','舵机和电机回流不得穿过ESP32区域'],
  ['滤波','VM 470–1000µF；SERVO_5V 1000µF','驱动B旁追加大电容','各芯片100nF+10µF','电机端每台另焊100nF'],
  ['检测与扩展','BAT_ADC、I2C显示、状态LED','保留','ADC分压、SDA/SCL、扩展排针','GPIO号码在原型验证后冻结'],
];

const softwarePlan = [
  ['通信数据包','RcPacket','throttle、steering、buttons、sequence、checksum','两种底盘模式共用，禁止携带具体舵机角度或左右轮PWM'],
  ['执行接口','DriveController','setCommand(throttle, steering)；stop()','由具体驱动策略实现'],
  ['V1策略','ServoSteeringDrive','后左=后右=throttle；steering→舵机角度','舵机中心、左右端点和方向写入配置'],
  ['扩展策略','Differential4WD','left=throttle+steering；right=throttle-steering','结果限幅；同侧前后电机共享命令'],
  ['模式选择','DriveMode','SERVO_STEERING / DIFFERENTIAL_4WD','编译配置或NVS参数切换，不改无线协议'],
  ['安全状态机','Failsafe','200ms无有效包：PWM=0、STBY=0、舵机回安全中位','重新连接时摇杆不居中禁止解锁'],
  ['电源监控','BatteryMonitor','BAT_ADC滤波、低电量状态','阈值通过配置而不是散落在控制代码中'],
  ['硬件抽象','MotorDriver / ServoDriver','控制层不直接操作GPIO','未来更换驱动器时不改通信和控制算法'],
];

const remotePlan = [
  ['板框与安装','建议≤70mm×50mm；4×M3孔','外壳和摇杆实物确认后冻结'],
  ['主控','第二块ESP32-C3 SuperMini插座或ESP32-C3-MINI-1','与车体端使用相同通信协议'],
  ['摇杆','VRX、VRY接两路ADC；SW接GPIO','每路ADC预留1kΩ串联+100nF对地滤波'],
  ['显示','0.96英寸OLED I2C接口','使用已购买显示屏；显示连接和电量状态'],
  ['按键与指示','至少2个功能按键+1个状态LED','按键上拉/下拉状态必须确定'],
  ['供电','USB调试；4×AAA镍氢脱线运行','USB与电池不得硬并联；独立3.3V稳压'],
  ['调试接口','USB-C、BOOT、RESET、UART测试点','保留烧录和日志通道'],
  ['软件边界','只输出throttle、steering、buttons','切换车体模式不改遥控器PCB'],
];

const wb = Workbook.create();
const overview = wb.worksheets.add('架构总览');
const bom = wb.worksheets.add('材料清单');
const pcb = wb.worksheets.add('车体PCB规划');
const software = wb.worksheets.add('软件接口');
const remote = wb.worksheets.add('遥控器PCB规划');

overview.getRange('A1:H1').merge(); overview.getRange('A1').values=[['RC-CAR-V1.0：舵机转向 + 四轮差速扩展预留']];
overview.getRange('A3:B8').values=[
  ['固定决策','内容'],
  ['V1转向方式','前轮舵机转向'],
  ['V1驱动方式','后轮双电机，同速输出'],
  ['未来扩展','四个固定驱动轮，左右分组差速'],
  ['V1驱动板','TB6612FNG ×1'],
  ['扩展驱动板','追加TB6612FNG ×1'],
];
overview.getRange('D3:H3').merge(); overview.getRange('D3').values=[['重要机械与电源边界']];
overview.getRange('D4:H9').values=[
  ['项目','V1实现','扩展预留','禁止事项','验收'],
  ['底盘','四轮、前轮转向节、后轮双电机','前电机支架孔/槽','固定四TT电机底盘直接用于V1','舵机可带动前轮全行程'],
  ['控制板','≤80×60mm、4×M3孔','第二驱动和前轮接口','先冻结未验证的GPIO','实物测孔后冻结Gerber'],
  ['舵机电源','独立5V升降压支路','扩展后仍保留','从3V3脚供舵机','转向时ESP32不复位'],
  ['电机电源','4×AA镍氢→保护→VM','按四电机电流复核','电机电流走面包板','堵转测试后确认余量'],
  ['软件','ServoSteeringDrive','Differential4WD','通信包绑定底盘结构','切换模式不改通信层'],
];
overview.getRange('A10:B14').values=[['采购统计','数量'],['已下单条目',null],['V1待买条目',null],['可后买/按需条目',null],['已知已花费',null]];
overview.getRange('B11').formulas=[[`=COUNTIF('材料清单'!G5:G${4+materials.length},"已下单")`]];
overview.getRange('B12').formulas=[[`=COUNTIF('材料清单'!G5:G${4+materials.length},"待买")`]];
overview.getRange('B13').formulas=[[`=COUNTIF('材料清单'!G5:G${4+materials.length},"可后买")+COUNTIF('材料清单'!G5:G${4+materials.length},"按需")`]];
overview.getRange('B14').formulas=[[`=SUMIFS('材料清单'!H5:H${4+materials.length},'材料清单'!G5:G${4+materials.length},"已下单")`]];
overview.getRange('B14').format.numberFormat='¥#,##0.00';

const titleFmt={fill:'#17365D',font:{bold:true,color:'#FFFFFF',size:17},horizontalAlignment:'center',verticalAlignment:'center'};
const headerFmt={fill:'#4472C4',font:{bold:true,color:'#FFFFFF'},horizontalAlignment:'center',verticalAlignment:'center',wrapText:true};
overview.getRange('A1:H1').format=titleFmt; overview.getRange('A3:B3').format=headerFmt; overview.getRange('D3:H3').format=headerFmt; overview.getRange('A10:B10').format=headerFmt;
overview.getRange('A4:B8').format={fill:'#F7FBFF',borders:{preset:'inside',style:'thin',color:'#D9E2F3'},wrapText:true};
overview.getRange('D4:H9').format={borders:{preset:'inside',style:'thin',color:'#D9E2F3'},wrapText:true,verticalAlignment:'top'};
overview.getRange('A11:B14').format={fill:'#F7FBFF',borders:{preset:'inside',style:'thin',color:'#D9E2F3'}};
[['A',20],['B',34],['D',18],['E',32],['F',32],['G',34],['H',32]].forEach(([c,w])=>overview.getRange(`${c}:${c}`).format.columnWidth=w);
overview.getRange('1:1').format.rowHeight=34; overview.getRange('4:9').format.rowHeight=42; overview.showGridLines=false;

const bomHeaders=['类别','材料/模块','具体规格','V1数量','单位','扩展追加','采购状态','已知单价/支出(元)','阶段','V1用途','扩展说明'];
const bomLast=4+materials.length;
bom.getRange('A1:K1').merge(); bom.getRange('A1').values=[['RC-CAR-V1.0 更新材料清单']];
bom.getRange('A2:K2').merge(); bom.getRange('A2').values=[['第一版只实现舵机转向；“扩展追加”表示升级四轮差速时新增数量。未选定具体商品的价格留空。']];
bom.getRange('A4:K4').values=[bomHeaders]; bom.getRange(`A5:K${bomLast}`).values=materials;
bom.tables.add(`A4:K${bomLast}`,true,'ServoV1BomTable').style='TableStyleMedium2';
bom.getRange('A1:K1').format=titleFmt; bom.getRange('A2:K2').format={fill:'#DDEBF7',font:{italic:true,color:'#44546A'},wrapText:true}; bom.getRange('A4:K4').format=headerFmt;
bom.getRange(`A5:K${bomLast}`).format={verticalAlignment:'top',wrapText:true,borders:{preset:'inside',style:'thin',color:'#D9E2F3'}};
bom.getRange(`H5:H${bomLast}`).format.numberFormat='¥#,##0.00';
bom.getRange(`G5:G${bomLast}`).dataValidation={rule:{type:'list',values:['已下单','待买','可后买','按需']}};
bom.getRange(`G5:G${bomLast}`).conditionalFormats.add('containsText',{text:'已下单',format:{fill:'#E2F0D9',font:{color:'#375623',bold:true}}});
bom.getRange(`G5:G${bomLast}`).conditionalFormats.add('containsText',{text:'待买',format:{fill:'#FCE4D6',font:{color:'#C00000',bold:true}}});
bom.getRange(`G5:G${bomLast}`).conditionalFormats.add('containsText',{text:'可后买',format:{fill:'#FFF2CC',font:{color:'#7F6000'}}});
bom.getRange(`G5:G${bomLast}`).conditionalFormats.add('containsText',{text:'按需',format:{fill:'#F2F2F2',font:{color:'#666666'}}});
const bomWidths=[13,28,42,9,8,11,12,18,13,31,35]; bomWidths.forEach((w,i)=>bom.getRangeByIndexes(0,i,bomLast,1).format.columnWidth=w);
bom.getRange('1:1').format.rowHeight=34; bom.getRange('2:2').format.rowHeight=38; bom.getRange(`5:${bomLast}`).format.rowHeight=52; bom.freezePanes.freezeRows(4); bom.freezePanes.freezeColumns(2); bom.showGridLines=false;

const pcbHeaders=['区域','V1装配','四轮差速扩展','接口/网络','关键要求'];
const pcbLast=4+pcbPlan.length;
pcb.getRange('A1:E1').merge(); pcb.getRange('A1').values=[['RC-CAR-CONTROLLER-V1.0 车体PCB规划']];
pcb.getRange('A2:E2').merge(); pcb.getRange('A2').values=[['Driver A在V1装配；Driver B和前轮电机接口只预留。GPIO号码在开发板原型验证后冻结。']];
pcb.getRange('A4:E4').values=[pcbHeaders]; pcb.getRange(`A5:E${pcbLast}`).values=pcbPlan;
pcb.tables.add(`A4:E${pcbLast}`,true,'CarPcbPlanTable').style='TableStyleMedium2';
pcb.getRange('A1:E1').format=titleFmt; pcb.getRange('A2:E2').format={fill:'#DDEBF7',font:{italic:true,color:'#44546A'},wrapText:true}; pcb.getRange('A4:E4').format=headerFmt;
pcb.getRange(`A5:E${pcbLast}`).format={wrapText:true,verticalAlignment:'top',borders:{preset:'inside',style:'thin',color:'#D9E2F3'}};
[18,36,36,44,42].forEach((w,i)=>pcb.getRangeByIndexes(0,i,pcbLast,1).format.columnWidth=w);
pcb.getRange('1:1').format.rowHeight=34; pcb.getRange('2:2').format.rowHeight=38; pcb.getRange(`5:${pcbLast}`).format.rowHeight=54; pcb.freezePanes.freezeRows(4); pcb.showGridLines=false;

const swHeaders=['模块','接口/类','职责','扩展规则'];
const swLast=4+softwarePlan.length;
software.getRange('A1:D1').merge(); software.getRange('A1').values=[['软件架构：舵机转向与四轮差速共用通信层']];
software.getRange('A2:D2').merge(); software.getRange('A2').values=[['通过DriveMode切换执行策略，不能复制两套无线通信、失联保护或摇杆校准代码。']];
software.getRange('A4:D4').values=[swHeaders]; software.getRange(`A5:D${swLast}`).values=softwarePlan;
software.tables.add(`A4:D${swLast}`,true,'SoftwareArchitectureTable').style='TableStyleMedium2';
software.getRange('A1:D1').format=titleFmt; software.getRange('A2:D2').format={fill:'#DDEBF7',font:{italic:true,color:'#44546A'},wrapText:true}; software.getRange('A4:D4').format=headerFmt;
software.getRange(`A5:D${swLast}`).format={wrapText:true,verticalAlignment:'top',borders:{preset:'inside',style:'thin',color:'#D9E2F3'}};
[20,26,56,48].forEach((w,i)=>software.getRangeByIndexes(0,i,swLast,1).format.columnWidth=w);
software.getRange('1:1').format.rowHeight=34; software.getRange('2:2').format.rowHeight=38; software.getRange(`5:${swLast}`).format.rowHeight=54; software.freezePanes.freezeRows(4); software.showGridLines=false;

const remoteHeaders=['区域','具体设计','关键要求'];
const remoteLast=4+remotePlan.length;
remote.getRange('A1:C1').merge(); remote.getRange('A1').values=[['RC-REMOTE-V1.0 遥控器PCB规划']];
remote.getRange('A2:C2').merge(); remote.getRange('A2').values=[['遥控器硬件和数据包不绑定车体转向结构，舵机转向与四轮差速共用同一遥控器。']];
remote.getRange('A4:C4').values=[remoteHeaders]; remote.getRange(`A5:C${remoteLast}`).values=remotePlan;
remote.tables.add(`A4:C${remoteLast}`,true,'RemotePcbPlanTable').style='TableStyleMedium2';
remote.getRange('A1:C1').format=titleFmt; remote.getRange('A2:C2').format={fill:'#DDEBF7',font:{italic:true,color:'#44546A'},wrapText:true}; remote.getRange('A4:C4').format=headerFmt;
remote.getRange(`A5:C${remoteLast}`).format={wrapText:true,verticalAlignment:'top',borders:{preset:'inside',style:'thin',color:'#D9E2F3'}};
[20,58,54].forEach((w,i)=>remote.getRangeByIndexes(0,i,remoteLast,1).format.columnWidth=w);
remote.getRange('1:1').format.rowHeight=34; remote.getRange('2:2').format.rowHeight=38; remote.getRange(`5:${remoteLast}`).format.rowHeight=52; remote.freezePanes.freezeRows(4); remote.showGridLines=false;

await fs.mkdir(previewDir,{recursive:true});
for (const [name,range] of [['架构总览','A1:H14'],['材料清单',`A1:K${bomLast}`],['车体PCB规划',`A1:E${pcbLast}`],['遥控器PCB规划',`A1:C${remoteLast}`],['软件接口',`A1:D${swLast}`]]) {
  const img=await wb.render({sheetName:name,range,scale:1,format:'png'});
  await fs.writeFile(`${previewDir}/${name}.png`,new Uint8Array(await img.arrayBuffer()));
}
const inspect=await wb.inspect({kind:'region',sheetId:'架构总览',range:'A1:H14',maxChars:5000});
const errors=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',options:{useRegex:true,maxResults:100},summary:'formula errors'});
await fs.writeFile(`${outDir}/verification.txt`,`${inspect.ndjson}\n${errors.ndjson}`,'utf8');
const xlsx=await SpreadsheetFile.exportXlsx(wb);
const outputPath=`${outDir}/RC-CAR-V1.0_舵机转向_材料与PCB规划.xlsx`;
await xlsx.save(outputPath);
console.log(JSON.stringify({output:outputPath,materials:materials.length,pcbItems:pcbPlan.length}));
