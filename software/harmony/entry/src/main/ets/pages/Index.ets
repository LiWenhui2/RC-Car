import { common } from '@kit.AbilityKit';
import { CarBleClient, FoundCar, carClient } from '../ble/CarBleClient';

@Component
struct AxisPad {
  title: string = '';
  hint: string = '';
  vertical: boolean = false;
  @Prop @Watch('resetOnDisable') padEnabled: boolean = false;
  @Prop value: number = 0;
  onChange: (value: number) => void = () => {};
  @State padWidth: number = 220;
  @State padHeight: number = 220;
  private finger: number = -1;

  private resetOnDisable(): void {
    if (!this.padEnabled) { this.finger = -1; this.onChange(0); }
  }
  aboutToDisappear(): void { this.finger = -1; this.onChange(0); }
  private radius(): number { return Math.min(this.padWidth, this.padHeight) * 0.32; }
  private touch(event: TouchEvent): void {
    if (!this.padEnabled) return;
    if (event.type === TouchType.Cancel) { this.finger = -1; this.onChange(0); return; }
    if (event.type === TouchType.Down && this.finger === -1 && event.changedTouches.length > 0) {
      this.finger = event.changedTouches[0].id;
    }
    if (event.type === TouchType.Up && event.changedTouches.some((touch: TouchObject) => touch.id === this.finger)) {
      this.finger = -1; this.onChange(0); return;
    }
    const touch = event.touches.find((item: TouchObject) => item.id === this.finger);
    if (!touch) return;
    const raw = this.vertical ? (this.padHeight / 2 - touch.y) / this.radius() : (touch.x - this.padWidth / 2) / this.radius();
    this.onChange(Math.abs(raw) < 0.08 ? 0 : Math.max(-1, Math.min(1, raw)));
  }
  build() {
    Column({ space: 4 }) {
      Text(this.title).fontSize(19).fontWeight(FontWeight.Bold).fontColor('#EBF5FA')
      Stack() {
        Circle().width(this.radius() * 2).height(this.radius() * 2)
          .fill(Color.Transparent).stroke(this.padEnabled ? '#557D7C' : '#3B4C58').strokeWidth(2)
        if (this.vertical) {
          Column().width(2).height(this.radius() * 2).backgroundColor('#405B64')
        } else {
          Row().width(this.radius() * 2).height(2).backgroundColor('#405B64')
        }
        Circle().width(64).height(64).fill(this.padEnabled ? '#285D58' : '#31434E')
          .position({ x: this.padWidth / 2 - 32 + (this.vertical ? 0 : this.value * this.radius()),
            y: this.padHeight / 2 - 32 - (this.vertical ? this.value * this.radius() : 0) })
        Circle().width(46).height(46).fill(this.padEnabled ? '#55DFC2' : '#61717D')
          .position({ x: this.padWidth / 2 - 23 + (this.vertical ? 0 : this.value * this.radius()),
            y: this.padHeight / 2 - 23 - (this.vertical ? this.value * this.radius() : 0) })
      }.width('100%').layoutWeight(1).backgroundColor('#192630').borderRadius(20)
        .onAreaChange((_old: Area, area: Area) => {
          this.padWidth = Number.parseFloat(area.width.toString());
          this.padHeight = Number.parseFloat(area.height.toString());
        })
        .onTouch((event: TouchEvent) => this.touch(event))
        .accessibilityText(`${this.title}，${this.hint}，松手回中`)
      Text(this.hint).fontSize(12).fontColor('#B3C4CC')
    }.height('100%')
  }
}

@Entry
@Component
struct Index {
  @State client: CarBleClient = carClient;

  aboutToAppear(): void { this.client.setActive(true); }
  aboutToDisappear(): void { this.client.setActive(false); }
  onPageHide(): void { this.client.setActive(false); }
  onPageShow(): void { this.client.setActive(true); }

  @Builder
  actionButton(label: string, action: () => void) {
    Button(label).fontSize(14).height(40).backgroundColor('#55DFC2').fontColor('#102521').onClick(action)
  }

  build() {
    Column({ space: 8 }) {
      Row({ space: 14 }) {
        Text('RC / CAR').fontSize(24).fontWeight(FontWeight.Bold).fontColor('#55DFC2')
        Text(this.client.message).fontSize(13).fontColor(this.client.canDrive() ? '#55DFC2' : '#FFCF87').layoutWeight(1)
        if (this.client.ready || this.client.connecting) {
          this.actionButton('断开', () => this.client.disconnect())
        } else {
          this.actionButton(this.client.scanning ? '停止扫描' : '扫描小车', () => {
            if (this.client.scanning) this.client.stopScan();
            else this.client.scan(this.getUIContext().getHostContext() as common.UIAbilityContext);
          })
        }
      }.width('100%').height(48)

      if (!this.client.ready) {
        Scroll() {
          Column({ space: 16 }) {
            if (this.client.cars.length === 0) {
              Text('鸿蒙原生 · 蓝牙直连').fontSize(28).fontWeight(FontWeight.Bold).fontColor('#EBF5FA')
              Text('小车上电 → 扫描连接 → 松开控件 → 回中解锁').fontSize(16).fontColor('#CBD8DF')
              Text('默认限速 30%   ·   松手回中   ·   急停锁定   ·   100ms 失联保护').fontSize(13).fontColor('#55DFC2')
              Text('请开启手机蓝牙，并在弹窗中允许蓝牙权限。首次测试请架空车轮。').fontSize(13).fontColor('#B3C4CC')
            }
            ForEach(this.client.cars, (found: FoundCar) => {
              Row({ space: 16 }) {
                Column({ space: 4 }) {
                  Text(found.name).fontSize(19).fontColor('#EBF5FA')
                  Text(`${found.id}  ·  ${found.rssi} dBm`).fontSize(12).fontColor('#B3C4CC')
                }.layoutWeight(1).alignItems(HorizontalAlign.Start)
                Button('连接').enabled(!this.client.connecting).backgroundColor('#55DFC2').fontColor('#102521')
                  .onClick(() => this.client.connect(found))
              }.width('100%').padding(16).backgroundColor('#192630').borderRadius(14)
            }, (found: FoundCar) => found.id)
          }.width('100%').alignItems(HorizontalAlign.Start).padding({ top: 16, bottom: 16 })
        }.layoutWeight(1).width('100%')
      } else {
        Row({ space: 18 }) {
          AxisPad({ title: '油门', hint: '前进 ↑ / ↓ 后退', vertical: true,
            padEnabled: this.client.canDrive(), value: this.client.throttle / (this.client.speedLimit * 10),
            onChange: (value: number) => this.client.setThrottle(value) }).layoutWeight(1)
          Column({ space: 8 }) {
            Text(`最大油门 ${this.client.speedLimit}%`).fontSize(17).fontWeight(FontWeight.Bold).fontColor('#EBF5FA')
            Slider({ value: this.client.speedLimit, min: 10, max: 100, step: 5 })
              .enabled(!this.client.canDrive() && !this.client.armRequested)
              .selectedColor('#55DFC2').onChange((value: number) => this.client.setLimit(value))
            Text(`油门 ${this.client.applied}    方向 ${this.client.vehicleSteering}`).fontSize(13).fontColor('#CBD8DF')
            Button(this.client.canDrive() ? '锁定停车' : '回中并解锁')
              .width('100%').height(42).backgroundColor('#55DFC2').fontColor('#102521')
              .enabled(this.client.hasStatus && !this.client.armRequested)
              .onClick(() => { if (this.client.canDrive()) this.client.stop(); else this.client.arm(); })
            Button('急  停').width('100%').height(56).fontSize(23).fontWeight(FontWeight.Bold)
              .backgroundColor('#C83942').fontColor(Color.White).onClick(() => this.client.stop(true))
          }.width(188).height('100%').justifyContent(FlexAlign.SpaceEvenly)
          AxisPad({ title: '转向', hint: '左转 ← / → 右转', vertical: false,
            padEnabled: this.client.canDrive(), value: this.client.steering / 1000,
            onChange: (value: number) => this.client.setSteering(value) }).layoutWeight(1)
        }.width('100%').layoutWeight(1)
      }
      Text(`${this.client.canDrive() ? '驾驶中' : '安全锁定'}  ·  松手自动回中  ·  切后台断开停车`)
        .width('100%').fontSize(11).fontColor('#B3C4CC')
    }.width('100%').height('100%').padding({ left: 24, right: 24, top: 8, bottom: 8 }).backgroundColor('#101820')
  }
}

