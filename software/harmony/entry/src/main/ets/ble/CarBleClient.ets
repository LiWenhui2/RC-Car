import { ble, access, constant } from '@kit.ConnectivityKit';
import { abilityAccessCtrl, common } from '@kit.AbilityKit';
import { systemDateTime } from '@kit.BasicServicesKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { SERVICE, CONTROL, MANAGEMENT, STATUS, encodeControl, decodeStatus, describeStatus } from './CarProtocol';

export class FoundCar {
  id: string;
  name: string;
  rssi: number;
  constructor(result: ble.ScanResult) {
    this.id = result.deviceId;
    this.name = result.deviceName || 'RC-Car-V1';
    this.rssi = result.rssi;
  }
}

@Observed
export class CarBleClient {
  message: string = '小车上电后，点击扫描';
  cars: FoundCar[] = [];
  scanning: boolean = false;
  connecting: boolean = false;
  ready: boolean = false;
  armed: boolean = false;
  hasStatus: boolean = false;
  throttle: number = 0;
  steering: number = 0;
  applied: number = 0;
  vehicleSteering: number = 0;
  speedLimit: number = 30;
  armRequested: boolean = false;
  private active: boolean = false;
  private driveRequested: boolean = false;
  private armSent: boolean = false;
  private busy: boolean = false;
  private pendingCommand: number = 0;
  private sequence: number = 0;
  private neutralWrites: number = 0;
  private lastStatus: number = 0;
  private operationStarted: number = 0;
  private armStarted: number = 0;
  private scanTimer: number = -1;
  private setupTimer: number = -1;
  private timer: number = -1;
  private gatt: ble.GattClientDevice | undefined = undefined;
  private control: ble.BLECharacteristic | undefined = undefined;
  private management: ble.BLECharacteristic | undefined = undefined;

  private now(): number { return systemDateTime.getUptime(systemDateTime.TimeType.STARTUP, false); }

  setActive(active: boolean): void {
    this.active = active;
    if (!active) this.disconnect('已离开界面 · 断开并锁定');
  }

  canDrive(): boolean { return this.active && this.ready && this.armed && this.driveRequested && !this.armRequested; }

  async scan(context: common.UIAbilityContext): Promise<void> {
    this.disconnect('');
    try {
      const result = await abilityAccessCtrl.createAtManager().requestPermissionsFromUser(context, ['ohos.permission.ACCESS_BLUETOOTH']);
      if (!this.active) return;
      if (result.authResults.some((code: number) => code !== 0)) {
        this.message = '请允许蓝牙权限后重试'; return;
      }
      if (access.getState() !== access.BluetoothState.STATE_ON) {
        this.message = '请先在系统设置中开启蓝牙'; return;
      }
      this.cars = [];
      ble.on('BLEDeviceFind', this.onFound);
      this.scanning = true;
      ble.startBLEScan([{ serviceUuid: SERVICE }]);
      this.message = '正在扫描 RC-Car…';
      this.scanTimer = setTimeout(() => {
        this.stopScan();
        if (this.cars.length === 0) this.message = '未发现小车，请确认小车电源和 BLE 固件';
      }, 10000);
    } catch {
      this.stopScan(); this.message = '扫描失败，请检查蓝牙开关和权限';
    }
  }

  private onFound = (results: ble.ScanResult[]): void => {
    if (!this.scanning) return;
    results.forEach((result: ble.ScanResult) => {
      const found = new FoundCar(result);
      this.cars = this.cars.filter((car: FoundCar) => car.id !== found.id).concat([found])
        .sort((a: FoundCar, b: FoundCar) => b.rssi - a.rssi);
    });
    this.message = `发现 ${this.cars.length} 辆小车，点击连接`;
  };

  stopScan(): void {
    clearTimeout(this.scanTimer); this.scanTimer = -1;
    if (this.scanning) {
      try { ble.stopBLEScan(); } catch {}
      try { ble.off('BLEDeviceFind', this.onFound); } catch {}
    }
    this.scanning = false;
  }

  connect(car: FoundCar): void {
    this.disconnect('');
    if (!this.active) return;
    this.connecting = true;
    this.message = `正在连接 ${car.name}…`;
    try {
      const client = ble.createGattClientDevice(car.id);
      this.gatt = client;
      client.on('BLEConnectionStateChange', (state: ble.BLEConnectionChangeState) => {
        if (this.gatt !== client) return;
        if (state.state === constant.ProfileConnectionState.STATE_CONNECTED) {
          this.prepare(client);
        } else if (state.state === constant.ProfileConnectionState.STATE_DISCONNECTED) {
          this.disconnect('蓝牙已断开 · 小车锁定');
        }
      });
      client.on('BLECharacteristicChange', (characteristic: ble.BLECharacteristic) => {
        if (this.gatt === client && characteristic.characteristicUuid.toLowerCase() === STATUS) {
          this.receive(characteristic.characteristicValue);
        }
      });
      this.setupTimer = setTimeout(() => { if (!this.ready && this.gatt === client) this.disconnect('连接超时，请靠近小车重试'); }, 12000);
      client.connect();
    } catch { this.disconnect('连接失败，请重试'); }
  }

  private async prepare(client: ble.GattClientDevice): Promise<void> {
    try {
      this.message = '正在检查服务和订阅车辆状态…';
      const services = await client.getServices();
      if (this.gatt !== client) return;
      const service = services.find((item: ble.GattService) => item.serviceUuid.toLowerCase() === SERVICE);
      if (!service) throw new Error('Missing service');
      this.control = service.characteristics.find((item: ble.BLECharacteristic) => item.characteristicUuid.toLowerCase() === CONTROL);
      this.management = service.characteristics.find((item: ble.BLECharacteristic) => item.characteristicUuid.toLowerCase() === MANAGEMENT);
      const telemetry = service.characteristics.find((item: ble.BLECharacteristic) => item.characteristicUuid.toLowerCase() === STATUS);
      if (!this.control || !this.management || !telemetry) throw new Error('Missing characteristic');
      await client.setCharacteristicChangeNotification(telemetry, true);
      if (this.gatt !== client) return;
      // Read once after subscribing, then only notifications update vehicle status.
      const initial = await client.readCharacteristicValue(telemetry);
      if (this.gatt !== client) return;
      this.receive(initial.characteristicValue);
      if (this.gatt !== client) return;
      this.ready = true; this.connecting = false; this.lastStatus = this.now();
      clearTimeout(this.setupTimer); this.setupTimer = -1;
      this.pendingCommand = 2;
      this.tick();
      this.timer = setInterval(() => this.tick(), 50);
    } catch { if (this.gatt === client) this.disconnect('车辆服务不兼容或订阅失败，请检查配套 BLE 固件'); }
  }

  private receive(buffer: ArrayBuffer): void {
    const status = decodeStatus(buffer);
    if (!status) { this.disconnect('车辆协议不匹配，请检查固件'); return; }
    this.hasStatus = true; this.lastStatus = this.now();
    this.armed = status.armed; this.applied = status.applied; this.vehicleSteering = status.steering;
    if (!status.armed) {
      this.throttle = 0; this.steering = 0;
      if (!this.armRequested) this.driveRequested = false;
    } else if (this.driveRequested && this.armSent && this.pendingCommand === 0) {
      this.armRequested = false;
    }
    this.message = describeStatus(status);
    hilog.info(0x1234, 'RCCar', 'status armed=%{public}s reason=%{public}d applied=%{public}d', `${status.armed}`, status.reason, status.applied);
  }

  setThrottle(value: number): void {
    this.throttle = this.canDrive() ? Math.trunc(Math.max(-1, Math.min(1, value)) * this.speedLimit * 10) : 0;
  }
  setSteering(value: number): void {
    this.steering = this.canDrive() ? Math.trunc(Math.max(-1, Math.min(1, value)) * 1000) : 0;
  }
  setLimit(value: number): void {
    if (this.canDrive() || this.armRequested) return;
    this.speedLimit = Math.round(Math.max(10, Math.min(100, value)));
    this.throttle = 0;
  }
  arm(): void {
    if (!this.ready || !this.hasStatus || this.armed || this.armRequested) return;
    this.throttle = 0; this.steering = 0; this.neutralWrites = 0;
    this.armRequested = true; this.driveRequested = true; this.armSent = false;
    this.armStarted = this.now(); this.message = '正在回中并等待车辆解锁确认…';
  }
  stop(emergency: boolean = false): void {
    this.throttle = 0; this.steering = 0; this.driveRequested = false; this.armRequested = false;
    this.pendingCommand = emergency ? 3 : 2;
    if (this.ready && !this.busy) this.sendNext();
  }

  private tick(): void {
    if (!this.active || !this.ready) return;
    const now = this.now();
    if (now - this.lastStatus > 1500) { this.disconnect('车辆状态超时，已断开停车'); return; }
    if (this.busy && now - this.operationStarted > 250) { this.disconnect('蓝牙发送阻塞，已断开停车'); return; }
    if (this.armRequested && now - this.armStarted > 2500) {
      this.stop(); this.message = '解锁未确认，请检查状态后重试';
    }
    if (!this.busy) this.sendNext();
  }

  private async sendNext(): Promise<void> {
    const client = this.gatt;
    if (!client || this.busy || !this.ready) return;
    let command = this.pendingCommand;
    if (!command && this.armRequested && !this.armSent && this.neutralWrites >= 2) command = 1;
    const characteristic = command ? this.management : this.control;
    if (!characteristic) return;
    if (command) this.pendingCommand = 0;
    if (command === 1) this.armSent = true;
    const neutral = !this.canDrive() || (this.throttle === 0 && this.steering === 0);
    const buffer = command ? new Uint8Array([command]).buffer :
      encodeControl(this.canDrive() ? this.throttle : 0, this.canDrive() ? this.steering : 0, ++this.sequence);
    // Fresh value for each write; one operation in flight, no old-command queue.
    const outgoing: ble.BLECharacteristic = {
      serviceUuid: characteristic.serviceUuid,
      characteristicUuid: characteristic.characteristicUuid,
      characteristicValue: buffer, descriptors: characteristic.descriptors
    };
    this.busy = true; this.operationStarted = this.now();
    try {
      await client.writeCharacteristicValue(outgoing, ble.GattWriteType.WRITE);
      if (this.gatt !== client) return;
      this.busy = false;
      if (!command && neutral) this.neutralWrites++;
      if (this.pendingCommand || (this.armRequested && !this.armSent && this.neutralWrites >= 2) || command) this.sendNext();
    } catch { if (this.gatt === client) this.disconnect('写入失败，已断开并停车'); }
  }

  disconnect(message: string = '已断开 · 小车保持锁定'): void {
    this.stopScan();
    clearInterval(this.timer); clearTimeout(this.setupTimer);
    this.timer = -1; this.setupTimer = -1;
    const client = this.gatt; this.gatt = undefined;
    this.ready = false; this.connecting = false; this.armed = false; this.hasStatus = false;
    this.throttle = 0; this.steering = 0; this.applied = 0; this.vehicleSteering = 0;
    this.driveRequested = false; this.armRequested = false; this.armSent = false;
    this.pendingCommand = 0; this.neutralWrites = 0; this.busy = false;
    this.control = undefined; this.management = undefined;
    if (client) {
      try { client.off('BLEConnectionStateChange'); client.off('BLECharacteristicChange'); } catch {}
      try { client.disconnect(); } catch {}
      try { client.close(); } catch {}
    }
    if (message) this.message = message;
  }
}

export const carClient = new CarBleClient();
