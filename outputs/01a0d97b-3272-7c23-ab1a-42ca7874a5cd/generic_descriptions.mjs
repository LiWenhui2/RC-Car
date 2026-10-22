import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const dir = 'H:/RC-Car/outputs/01a0d97b-3272-7c23-ab1a-42ca7874a5cd';
const input = path.join(dir, 'RC-Car-V1_车辆端元器件主数据表.xlsx');
const output = path.join(dir, 'RC-Car-V1_通用元器件库说明.xlsx');
const descriptions = {
  ESP32_C3_DZQJ_SUPERMINI: 'ESP32-C3 SuperMini微控制器开发板，双排各8引脚，2.54mm间距',
  TB6612FNG_MODULE_2X8: 'TB6612FNG双通道直流电机驱动模块，双排各8引脚，2.54mm间距',
  PTC_5A_16V_C2843993: '贴片自恢复保险丝，保持电流5A，动作电流10A，额定电压16V，1812封装',
  AO4407A_C16072: 'AO4407A P沟道功率MOSFET，SOIC-8封装',
  R_100K_0603_C25803: '100kΩ贴片电阻，0603封装',
  SS34_C8678: 'SS34肖特基整流二极管，3A、40V，SMA封装',
  TERMINAL_2P_WJ500V_C8465: '2位螺钉接线端子，5.08mm间距，通孔安装',
  HEADER_1X4_P2P54_C492403: '单排4位直插公排针，2.54mm间距',
  CAP_1000UF_10V_C970713: '1000µF、10V贴片铝电解电容，极性器件',
  C_100NF_0603_C14663: '100nF贴片陶瓷电容，0603封装',
  C_10UF_10V_TBD: '10µF、10V贴片电容，封装和具体型号待选定',
  HEADER_SERVO_1X3_P2P54: '单排3位直插公排针，2.54mm间距',
  HEADER_I2C_1X4_P2P54: '单排4位直插公排针，2.54mm间距',
  PIN_SOCKET_1X8_P2P54_H8P5: '单排8位直插母排座，2.54mm间距，绝缘体高度8.5mm',
  TESTPOINT_PCB_PAD: '直径2.5mm的PCB裸铜测试焊盘',
  MOUNTING_HOLE_M3_NPTH: 'M3机械安装孔，孔径3.2mm，非金属化通孔',
  EXTERNAL_5V_BUCKBOOST_MODULE: '板外5V升降压稳压电源模块',
  BATTERY_HOLDER_4XAA_NIMH: '4节AA电池盒，适用于AA尺寸镍氢电池',
  MG995_SERVO: 'MG995型号舵机，板外安装',
  REAR_TT_MOTOR: 'TT型直流减速电机，板外安装',
};
const comments = {
  ESP32_C3_DZQJ_SUPERMINI: 'ESP32-C3 SuperMini',
  TB6612FNG_MODULE_2X8: 'TB6612FNG驱动模块',
  PTC_5A_16V_C2843993: 'PTC 5A 16V',
  AO4407A_C16072: 'AO4407A',
  R_100K_0603_C25803: '100kΩ',
  SS34_C8678: 'SS34',
  TERMINAL_2P_WJ500V_C8465: '2P 5.08mm接线端子',
  HEADER_1X4_P2P54_C492403: '1×4 2.54mm排针',
  CAP_1000UF_10V_C970713: '1000µF/10V',
  C_100NF_0603_C14663: '100nF',
  C_10UF_10V_TBD: '10µF/10V',
  HEADER_SERVO_1X3_P2P54: '1×3 2.54mm排针',
  HEADER_I2C_1X4_P2P54: '1×4 2.54mm排针',
  PIN_SOCKET_1X8_P2P54_H8P5: '1×8 2.54mm排座',
  TESTPOINT_PCB_PAD: '测试点 Ø2.5mm',
  MOUNTING_HOLE_M3_NPTH: 'M3非金属化安装孔',
  EXTERNAL_5V_BUCKBOOST_MODULE: '5V升降压模块',
  BATTERY_HOLDER_4XAA_NIMH: '4×AA电池盒',
  MG995_SERVO: 'MG995舵机',
  REAR_TT_MOTOR: 'TT直流减速电机',
};
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(input));
const sheet = wb.worksheets.getItem('元器件主数据');
const before = sheet.getRange('A1:M38').values;
if (before.length !== 38 || before[0][3] !== 'Description') throw new Error('Unexpected source workbook');
for (let r = 1; r < before.length; r++) {
  const id = before[r][0];
  const desc = descriptions[id];
  const comment = comments[id];
  if (!desc || !comment) throw new Error(`Missing generic metadata for ${id}`);
  sheet.getRange(`C${r+1}`).values = [[comment]];
  sheet.getRange(`D${r+1}`).values = [[desc]];
}
sheet.getRange('D2:D38').format.wrapText = true;
sheet.getRange('A2:M38').format.rowHeight = 40;
wb.recalculate();
const after = sheet.getRange('A1:M38').values;
for (let r = 0; r < before.length; r++) for (let c = 0; c < 13; c++) {
  if (c !== 2 && c !== 3 && before[r][c] !== after[r][c]) throw new Error(`Unexpected change at row ${r+1}, col ${c+1}`);
}
const check = await wb.inspect({kind:'table',range:'元器件主数据!A1:E5',include:'values',tableMaxRows:5,tableMaxCols:5});
console.log(check.ndjson);
const preview = await wb.render({sheetName:'元器件主数据',range:'A1:F5',scale:1.5,format:'png'});
await fs.writeFile(path.join(dir,'generic_preview.png'),new Uint8Array(await preview.arrayBuffer()));
const out = await SpreadsheetFile.exportXlsx(wb);
await out.save(output);
console.log(JSON.stringify({output,rows:37,changed:37,bytes:(await fs.stat(output)).size}));
