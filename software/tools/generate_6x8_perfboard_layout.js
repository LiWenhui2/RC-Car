const fs = require('fs');
const path = require('path');

const workspace = process.argv[2] || process.cwd();
const vizDir = process.argv[3];
if (!vizDir) throw new Error('visualization directory is required');

const COLS = 31;
const ROWS = 23;
const S = 32;
const OX = 58;
const OY = 72;
const BW = (COLS - 1) * S;
const BH = (ROWS - 1) * S;

const xTop = c => OX + (c - 1) * S;
const xBottom = c => OX + (COLS - c) * S;
const y = r => OY + (r - 1) * S;
const p = (c, r, bottom = false) => `${bottom ? xBottom(c) : xTop(c)},${y(r)}`;

const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const espLeft = [
  ['5V', 6, 9], ['GND', 6, 10], ['3V3', 6, 11], ['GPIO4', 6, 12],
  ['GPIO3', 6, 13], ['GPIO2 NC', 6, 14], ['GPIO1 NC', 6, 15], ['GPIO0 NC', 6, 16],
];
const espRight = [
  ['GPIO10', 12, 9], ['GPIO9 NC', 12, 10], ['GPIO8 NC', 12, 11], ['GPIO7', 12, 12],
  ['GPIO6', 12, 13], ['GPIO5', 12, 14], ['GPIO21', 12, 15], ['GPIO20', 12, 16],
];
const tbLeft = [
  ['PWMA', 17, 9], ['AIN2', 17, 10], ['AIN1', 17, 11], ['STBY', 17, 12],
  ['BIN1', 17, 13], ['BIN2', 17, 14], ['PWMB', 17, 15], ['GND', 17, 16],
];
const tbRight = [
  ['VM', 23, 9], ['VCC', 23, 10], ['GND', 23, 11], ['AO1', 23, 12],
  ['AO2', 23, 13], ['BO2', 23, 14], ['BO1', 23, 15], ['GND', 23, 16],
];

const nets = [
  { name: 'VBAT+', cls: 'vb', width: 8, paths: [[[4,3],[4,21]], [[4,8],[23,8],[23,9]], [[4,7],[14,7]]] },
  { name: 'GND', cls: 'gnd', width: 8, paths: [[[2,3],[2,23],[30,23]], [[6,10],[6,23]], [[17,16],[17,23]], [[23,11],[23,23]], [[23,16],[23,23]], [[16,7],[16,23]], [[20,7],[20,23]]] },
  { name: '5V_LOGIC', cls: 'v5', width: 4, paths: [[[18,7],[18,8],[6,8],[6,9]]] },
  { name: '3V3', cls: 'v33', width: 4, paths: [[[6,11],[8,11],[8,7],[23,7],[23,10]]] },
  { name: 'PWMA GPIO10', cls: 'sig', width: 3, paths: [[[12,9],[17,9]]] },
  { name: 'STBY GPIO7', cls: 'sig', width: 3, paths: [[[12,12],[17,12]]] },
  { name: 'BIN1 GPIO6', cls: 'sig', width: 3, paths: [[[12,13],[17,13]]] },
  { name: 'BIN2 GPIO5', cls: 'sig', width: 3, paths: [[[12,14],[17,14]]] },
  { name: 'PWMB GPIO20', cls: 'sig', width: 3, paths: [[[12,16],[14,16],[14,15],[17,15]]] },
  { name: 'AIN2 GPIO4', cls: 'sig2', width: 3, paths: [[[6,12],[9,12],[9,6],[17,6],[17,10]]] },
  { name: 'AIN1 GPIO3', cls: 'sig2', width: 3, paths: [[[6,13],[10,13],[10,5],[16,5],[16,11],[17,11]]] },
  { name: 'SERVO GPIO21', cls: 'servo', width: 3, paths: [[[12,15],[13,15],[13,19],[6,19],[6,21]]] },
  { name: 'MOTOR_A AO1', cls: 'motor', width: 5, paths: [[[23,12],[28,12]]] },
  { name: 'MOTOR_A AO2', cls: 'motor', width: 5, paths: [[[23,13],[26,13],[26,12],[30,12]]] },
  { name: 'MOTOR_B BO2', cls: 'motor', width: 5, paths: [[[23,14],[26,14],[26,16],[30,16]]] },
  { name: 'MOTOR_B BO1', cls: 'motor', width: 5, paths: [[[23,15],[28,15],[28,16]]] },
  { name: 'C1+', cls: 'vb', width: 4, paths: [[[23,9],[25,9]]] },
  { name: 'C1-', cls: 'gnd', width: 4, paths: [[[23,11],[25,11]]] },
];

function holes(bottom) {
  let out = '';
  for (let r = 1; r <= ROWS; r++) {
    for (let c = 1; c <= COLS; c++) {
      out += `<circle cx="${bottom ? xBottom(c) : xTop(c)}" cy="${y(r)}" r="3.1" class="hole"/>`;
    }
  }
  return out;
}

function coordinates(bottom) {
  let out = '';
  for (let c = 1; c <= COLS; c++) {
    const xx = bottom ? xBottom(c) : xTop(c);
    out += `<text x="${xx}" y="48" class="coord" text-anchor="middle">${c}</text>`;
  }
  for (let r = 1; r <= ROWS; r++) {
    out += `<text x="34" y="${y(r)+4}" class="coord" text-anchor="middle">${r}</text>`;
  }
  return out;
}

function pin(cx, cy, label, side = 'right') {
  const tx = side === 'right' ? cx + 10 : cx - 10;
  return `<circle cx="${cx}" cy="${cy}" r="5.5" class="pad"/><text x="${tx}" y="${cy+4}" class="pin-label" text-anchor="${side === 'right' ? 'start' : 'end'}">${esc(label)}</text>`;
}

function modulePins(items, bottom, side) {
  return items.map(([name,c,r]) => pin(bottom ? xBottom(c) : xTop(c), y(r), name, bottom ? (side === 'right' ? 'left' : 'right') : side)).join('');
}

function rectFromGrid(c1,r1,c2,r2,bottom,cls,label,sub='') {
  const xa = bottom ? xBottom(c2) : xTop(c1);
  const xb = bottom ? xBottom(c1) : xTop(c2);
  const yy = y(r1);
  return `<rect x="${xa}" y="${yy}" width="${xb-xa}" height="${y(r2)-yy}" rx="7" class="${cls}"/><text x="${(xa+xb)/2}" y="${yy+25}" class="part-title" text-anchor="middle">${esc(label)}</text>${sub ? `<text x="${(xa+xb)/2}" y="${yy+46}" class="part-sub" text-anchor="middle">${esc(sub)}</text>` : ''}`;
}

function terminal(cells, row, label, bottom, sub) {
  const xs = cells.map(c => bottom ? xBottom(c) : xTop(c));
  const min = Math.min(...xs)-18, max = Math.max(...xs)+18;
  const yy = y(row)-28;
  let s = `<rect x="${min}" y="${yy}" width="${max-min}" height="56" rx="6" class="terminal"/><text x="${(min+max)/2}" y="${yy-7}" class="part-sub" text-anchor="middle">${esc(label)}</text>`;
  cells.forEach((c,i) => { s += `<circle cx="${bottom ? xBottom(c) : xTop(c)}" cy="${y(row)}" r="7" class="terminal-pin"/><text x="${bottom ? xBottom(c) : xTop(c)}" y="${y(row)+4}" class="terminal-text" text-anchor="middle">${i+1}</text>`; });
  if (sub) s += `<text x="${(min+max)/2}" y="${yy+48}" class="terminal-text" text-anchor="middle">${esc(sub)}</text>`;
  return s;
}

function componentSide() {
  const bottom = false;
  const board = `<rect x="${OX-22}" y="${OY-22}" width="${BW+44}" height="${BH+44}" rx="5" class="perfboard"/>`;
  const esp = rectFromGrid(5,8,13,17,bottom,'esp-board','ESP32-C3 SuperMini','排母：2×8；天线端朝下边缘');
  const tb = rectFromGrid(16,8,24,17,bottom,'tb-board','TB6612FNG','排母：2×8');
  const buck = rectFromGrid(14,1,30,6,bottom,'buck-board','5V升降压模块安装区','最大约43×16mm；超出则移到车架');
  const antenna = `<rect x="${xTop(6)-15}" y="${y(16)}" width="${xTop(12)-xTop(6)+30}" height="${y(18)-y(16)}" class="keepout"/><text x="${(xTop(6)+xTop(12))/2}" y="${y(17)+5}" class="part-sub" text-anchor="middle">天线净空，不走粗线</text>`;
  const caps = `<circle cx="${xTop(25)}" cy="${(y(9)+y(11))/2}" r="32" class="cap"/><text x="${xTop(25)}" y="${(y(9)+y(11))/2-3}" class="part-sub" text-anchor="middle">C1</text><text x="${xTop(25)}" y="${(y(9)+y(11))/2+14}" class="tiny" text-anchor="middle">1000μF</text>
    <circle cx="${(xTop(2)+xTop(4))/2}" cy="${y(18)}" r="32" class="cap"/><text x="${(xTop(2)+xTop(4))/2}" y="${y(18)-3}" class="part-sub" text-anchor="middle">C2</text><text x="${(xTop(2)+xTop(4))/2}" y="${y(18)+14}" class="tiny" text-anchor="middle">1000μF</text>`;
  const regPins = terminal([14,16,18,20],7,'JREG 四线焊点',bottom,'IN+  IN−  OUT+  OUT−');
  return `<svg viewBox="0 0 1460 850" role="img" aria-label="6乘8厘米洞洞板元件面真实布局">
    <text x="20" y="26" class="diagram-title">6×8cm洞洞板元件面（31×23孔，2.54mm孔距）</text>
    ${board}${holes(bottom)}${coordinates(bottom)}
    ${buck}${regPins}${esp}${tb}${antenna}${caps}
    ${terminal([2,4],3,'JBAT 电池输入',bottom,'1=GND  2=VBAT+')}
    ${terminal([2,4,6],21,'JSERVO 舵机',bottom,'1=GND 2=VBAT 3=SIG')}
    ${terminal([28,30],12,'JML 后左电机',bottom,'AO1 / AO2')}
    ${terminal([28,30],16,'JMR 后右电机',bottom,'BO1 / BO2')}
    ${modulePins(espLeft,bottom,'right')}${modulePins(espRight,bottom,'left')}
    ${modulePins(tbLeft,bottom,'right')}${modulePins(tbRight,bottom,'left')}
    <g transform="translate(1085 82)"><rect width="345" height="690" rx="7" class="legend-bg"/>
      <text x="18" y="30" class="legend-title">实物安装规则</text>
      <text x="18" y="62" class="legend-text">• ESP32、TB6612 均使用排母，不直接焊死</text>
      <text x="18" y="90" class="legend-text">• ESP天线朝下边缘，净空区不铺铜、不放电池</text>
      <text x="18" y="118" class="legend-text">• 5V模块用铜柱/泡棉胶固定，四线落到JREG</text>
      <text x="18" y="146" class="legend-text">• 电池、舵机、电机端子全部靠板边出线</text>
      <text x="18" y="174" class="legend-text">• C1靠VM/GND；C2直接跨接VBAT/GND母线</text>
      <text x="18" y="218" class="legend-title">优化后的车辆GPIO</text>
      <text x="18" y="250" class="legend-text">GPIO10→PWMA　GPIO4→AIN2　GPIO3→AIN1</text>
      <text x="18" y="278" class="legend-text">GPIO7→STBY　GPIO6→BIN1　GPIO5→BIN2</text>
      <text x="18" y="306" class="legend-text">GPIO20→PWMB　GPIO21→舵机SIG</text>
      <text x="18" y="350" class="legend-title">板外器件</text>
      <text x="18" y="382" class="legend-text">C3/C4：100nF，直接焊在两只TT电机端子上</text>
      <text x="18" y="410" class="legend-text">MG995：红→VBAT；棕→GND；橙→JSERVO-3</text>
      <text x="18" y="454" class="legend-title">尺寸假设</text>
      <text x="18" y="486" class="legend-text">ESP/TB：2×8排针、排距15.24mm</text>
      <text x="18" y="514" class="legend-text">端子：5.08mm；电容引脚距约5.08mm</text>
      <text x="18" y="542" class="legend-text">电源模块区：约43×16mm，实物更大则板外固定</text>
      <text x="18" y="594" class="warning-text">焊接前必须把实物放上去核对孔距和USB方向。</text>
      <text x="18" y="622" class="warning-text">模块5V输出与USB 5V禁止同时接入ESP32。</text>
    </g>
  </svg>`;
}

function netPaths(bottom) {
  return nets.map(net => net.paths.map(points => `<polyline points="${points.map(([c,r])=>p(c,r,bottom)).join(' ')}" class="net ${net.cls}" style="stroke-width:${net.width}px"/>`).join('')).join('');
}

function solderSide() {
  const bottom = true;
  const board = `<rect x="${OX-22}" y="${OY-22}" width="${BW+44}" height="${BH+44}" rx="5" class="perfboard solder-board"/>`;
  const allPins = [...espLeft,...espRight,...tbLeft,...tbRight];
  const pads = allPins.map(([name,c,r]) => `<circle cx="${xBottom(c)}" cy="${y(r)}" r="6.5" class="solder-pad"/><text x="${xBottom(c)}" y="${y(r)-10}" class="bottom-pin" text-anchor="middle">${esc(name)}</text>`).join('');
  return `<svg viewBox="0 0 1460 850" role="img" aria-label="6乘8厘米洞洞板镜像焊接面线路">
    <text x="20" y="26" class="diagram-title">焊接面（从板底看，列号已镜像；按孔坐标焊接）</text>
    ${board}${holes(bottom)}${coordinates(bottom)}${netPaths(bottom)}${pads}
    ${terminal([2,4],3,'JBAT',bottom,'GND / VBAT')}
    ${terminal([2,4,6],21,'JSERVO',bottom,'GND / VBAT / SIG')}
    ${terminal([28,30],12,'JML',bottom,'AO1 / AO2')}
    ${terminal([28,30],16,'JMR',bottom,'BO1 / BO2')}
    ${terminal([14,16,18,20],7,'JREG',bottom,'IN+ IN− OUT+ OUT−')}
    <g transform="translate(1085 72)"><rect width="345" height="710" rx="7" class="legend-bg"/>
      <text x="18" y="30" class="legend-title">焊接线分类</text>
      <line x1="20" y1="65" x2="90" y2="65" class="net vb" style="stroke-width:8px"/><text x="105" y="70" class="legend-text">VBAT：20AWG红线</text>
      <line x1="20" y1="98" x2="90" y2="98" class="net gnd" style="stroke-width:8px"/><text x="105" y="103" class="legend-text">GND：20AWG黑线</text>
      <line x1="20" y1="131" x2="90" y2="131" class="net v5" style="stroke-width:4px"/><text x="105" y="136" class="legend-text">5V逻辑</text>
      <line x1="20" y1="164" x2="90" y2="164" class="net v33" style="stroke-width:4px"/><text x="105" y="169" class="legend-text">3.3V逻辑</text>
      <line x1="20" y1="197" x2="90" y2="197" class="net sig" style="stroke-width:3px"/><text x="105" y="202" class="legend-text">短直连镀锡铜线</text>
      <line x1="20" y1="230" x2="90" y2="230" class="net sig2" style="stroke-width:3px"/><text x="105" y="235" class="legend-text">绝缘信号跨线</text>
      <line x1="20" y1="263" x2="90" y2="263" class="net motor" style="stroke-width:5px"/><text x="105" y="268" class="legend-text">电机输出粗线</text>
      <text x="18" y="315" class="legend-title">最少飞线结果</text>
      <text x="18" y="347" class="legend-text">4条同排直连：PWMA、STBY、BIN1、BIN2</text>
      <text x="18" y="375" class="legend-text">4条必要绝缘线：AIN1、AIN2、PWMB、SERVO</text>
      <text x="18" y="403" class="legend-text">2条粗母线：VBAT、GND</text>
      <text x="18" y="431" class="legend-text">电机输出均在右侧，线长约5～7孔</text>
      <text x="18" y="475" class="legend-title">施工顺序</text>
      <text x="18" y="507" class="legend-text">1. 焊排母和端子，空板核对方向</text>
      <text x="18" y="535" class="legend-text">2. 焊4条同排短直线，再焊4条绝缘跨线</text>
      <text x="18" y="563" class="legend-text">3. 焊5V/3.3V，再焊VBAT/GND粗母线</text>
      <text x="18" y="591" class="legend-text">4. 每焊完一组用通断档检查短路</text>
      <text x="18" y="619" class="legend-text">5. 不插模块测电源；正确后再插ESP/TB</text>
      <text x="18" y="661" class="warning-text">禁止用长焊锡桥代替电源线，禁止裸线交叉。</text>
    </g>
  </svg>`;
}

const css = `<style>
#perfboard-real-v2{color:var(--foreground)}
#perfboard-real-v2 .controls{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}
#perfboard-real-v2 .panel{display:none}#perfboard-real-v2 .panel.active{display:block}
#perfboard-real-v2 svg{width:100%;height:auto;display:block}
#perfboard-real-v2 text{fill:var(--foreground);font-family:"Microsoft YaHei",sans-serif}
#perfboard-real-v2 .diagram-title{font-size:22px;font-weight:500}
#perfboard-real-v2 .coord{font-size:10px;fill:var(--muted-foreground)}
#perfboard-real-v2 .perfboard{fill:color-mix(in srgb,var(--green) 12%,var(--background));stroke:var(--foreground);stroke-width:2}
#perfboard-real-v2 .solder-board{fill:color-mix(in srgb,var(--orange) 10%,var(--background))}
#perfboard-real-v2 .hole{fill:var(--background);stroke:var(--border);stroke-width:1}
#perfboard-real-v2 .esp-board{fill:color-mix(in srgb,var(--foreground) 82%,transparent);stroke:var(--foreground);stroke-width:2}
#perfboard-real-v2 .tb-board{fill:color-mix(in srgb,var(--red) 35%,var(--background));stroke:var(--red);stroke-width:2}
#perfboard-real-v2 .buck-board{fill:color-mix(in srgb,var(--blue) 25%,var(--background));stroke:var(--blue);stroke-width:2}
#perfboard-real-v2 .terminal{fill:color-mix(in srgb,var(--green) 28%,var(--background));stroke:var(--green);stroke-width:2}
#perfboard-real-v2 .terminal-pin{fill:var(--background);stroke:var(--foreground);stroke-width:2}
#perfboard-real-v2 .terminal-text{font-size:9px}.part-title{font-size:15px;font-weight:500;fill:var(--background)!important}.part-sub{font-size:11px}.tiny{font-size:9px}
#perfboard-real-v2 .esp-board+text,#perfboard-real-v2 .esp-board+text+text{fill:var(--background)}
#perfboard-real-v2 .pad{fill:var(--background);stroke:var(--yellow);stroke-width:2}.pin-label{font-size:8.5px}
#perfboard-real-v2 .cap{fill:color-mix(in srgb,var(--orange) 35%,var(--background));stroke:var(--orange);stroke-width:2}
#perfboard-real-v2 .keepout{fill:color-mix(in srgb,var(--yellow) 15%,transparent);stroke:var(--yellow);stroke-width:2;stroke-dasharray:7 5}
#perfboard-real-v2 .legend-bg{fill:color-mix(in srgb,var(--card) 85%,transparent);stroke:var(--border);stroke-width:1}
#perfboard-real-v2 .legend-title{font-size:16px;font-weight:500}.legend-text{font-size:12px}.warning-text{font-size:12px;fill:var(--red)!important;font-weight:500}
#perfboard-real-v2 .net{fill:none;stroke-linecap:round;stroke-linejoin:round}.vb{stroke:var(--red)}.gnd{stroke:var(--foreground)}.v5{stroke:var(--orange)}.v33{stroke:var(--purple)}.sig{stroke:var(--blue)}.sig2{stroke:var(--purple)}.servo{stroke:var(--yellow)}.motor{stroke:var(--green)}
#perfboard-real-v2 .solder-pad{fill:var(--orange);stroke:var(--foreground);stroke-width:1.5}.bottom-pin{font-size:7px}
</style>`;

const fragment = `<div id="perfboard-real-v2">${css}<div class="controls"><button type="button" class="btn btn-primary" data-show="top" aria-pressed="true">真实元件面</button><button type="button" class="btn" data-show="bottom" aria-pressed="false">镜像焊接面</button></div><section class="panel active" data-panel="top">${componentSide()}</section><section class="panel" data-panel="bottom">${solderSide()}</section><script>(()=>{const root=document.getElementById('perfboard-real-v2');const bs=[...root.querySelectorAll('[data-show]')];const ps=[...root.querySelectorAll('[data-panel]')];bs.forEach(b=>b.addEventListener('click',()=>{bs.forEach(x=>{const on=x===b;x.classList.toggle('btn-primary',on);x.setAttribute('aria-pressed',on?'true':'false')});ps.forEach(p=>p.classList.toggle('active',p.dataset.panel===b.dataset.show))}))})();</script></div>`;

const standalone = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{--background:#fff;--foreground:#171717;--card:#f5f5f5;--muted-foreground:#666;--border:#aaa;--red:#d93025;--orange:#e8710a;--purple:#7e57c2;--blue:#1a73e8;--green:#0f9d58;--yellow:#d9a000}.btn{padding:7px 12px;border:1px solid #999;border-radius:6px;background:#fff}.btn-primary{background:#171717;color:#fff}body{margin:14px;font-family:"Microsoft YaHei",sans-serif}</style></head><body>${fragment}</body></html>`;

const md = `# RC-Car V1 6×8cm洞洞板施工坐标表

板规格：80mm×60mm，2.54mm孔距，按31列×23行设计。列号从元件面左到右为1～31，行号从上到下为1～23。

## 元件坐标

| 器件 | 孔坐标/占用区 |
|---|---|
| JBAT 2P | (2,3)=GND；(4,3)=VBAT+ |
| 5V模块安装区 | 列14～30、行1～6；JREG位于(14,7)/(16,7)/(18,7)/(20,7) |
| ESP32-C3排母 | 左排列6、右排列12；行9～16，共2×8 |
| TB6612排母 | 左排列17、右排列23；行9～16，共2×8 |
| C1 1000μF | (25,9)=正；(25,11)=负 |
| C2 1000μF | (4,18)=正；(2,18)=负 |
| 后左电机端子 | (28,12)/(30,12) |
| 后右电机端子 | (28,16)/(30,16) |
| 舵机3P端子 | (2,21)=GND；(4,21)=VBAT；(6,21)=SIG |

## 为减少飞线采用的新车辆GPIO

| ESP32 | TB6612/舵机 |
|---|---|
| GPIO10 | PWMA |
| GPIO4 | AIN2 |
| GPIO3 | AIN1 |
| GPIO7 | STBY |
| GPIO6 | BIN1 |
| GPIO5 | BIN2 |
| GPIO20 | PWMB |
| GPIO21 | MG995信号 |

该映射与之前面包板程序不同。洞洞板焊好后必须使用配套的优化引脚程序，不能继续使用旧车辆端固件。

## 最少跳线

- 同排短直连4条：GPIO10-PWMA、GPIO7-STBY、GPIO6-BIN1、GPIO5-BIN2。
- 必要绝缘信号线4条：GPIO4-AIN2、GPIO3-AIN1、GPIO20-PWMB、GPIO21-SERVO。
- VBAT和GND各1条20AWG母线；电机输出使用20～22AWG短线。
- 100nF电容C3/C4直接焊在两只TT电机端子，不占洞洞板孔位。
`;

fs.mkdirSync(path.join(workspace, 'docs', 'diagrams'), { recursive: true });
fs.writeFileSync(path.join(vizDir, 'rc-car-real-perfboard-6x8.html'), fragment, 'utf8');
fs.writeFileSync(path.join(workspace, 'docs', 'RC-Car-V1_6x8洞洞板施工图.html'), standalone, 'utf8');
fs.writeFileSync(path.join(workspace, 'docs', 'RC-Car-V1_6x8洞洞板施工坐标表.md'), md, 'utf8');

const topOnly = standalone.replace('<section class="panel active" data-panel="top">','<section class="panel active" data-panel="top">').replace('<section class="panel" data-panel="bottom">','<section class="panel" data-panel="bottom">');
const bottomOnly = standalone.replace('<section class="panel active" data-panel="top">','<section class="panel" data-panel="top">').replace('<section class="panel" data-panel="bottom">','<section class="panel active" data-panel="bottom">');
fs.writeFileSync(path.join(vizDir, 'capture-real-top.html'), topOnly, 'utf8');
fs.writeFileSync(path.join(vizDir, 'capture-real-bottom.html'), bottomOnly, 'utf8');
