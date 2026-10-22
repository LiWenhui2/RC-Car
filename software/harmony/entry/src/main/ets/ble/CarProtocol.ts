export const SERVICE = 'a9140001-7e6b-4a40-a862-cb008ab14e01';
export const CONTROL = 'a9140002-7e6b-4a40-a862-cb008ab14e01';
export const MANAGEMENT = 'a9140003-7e6b-4a40-a862-cb008ab14e01';
export const STATUS = 'a9140004-7e6b-4a40-a862-cb008ab14e01';

export class VehicleStatus {
  armed: boolean = false;
  reason: number = 0;
  applied: number = 0;
  steering: number = 0;
  sequence: number = 0;
}

export function encodeControl(throttle: number, steering: number, sequence: number): ArrayBuffer {
  const buffer = new ArrayBuffer(10);
  const view = new DataView(buffer);
  view.setInt16(0, Math.trunc(Math.max(-1000, Math.min(1000, throttle))), true);
  view.setInt16(2, Math.trunc(Math.max(-1000, Math.min(1000, steering))), true);
  view.setUint16(4, 0, true);
  view.setUint32(6, sequence >>> 0, true);
  return buffer;
}

export function decodeStatus(buffer: ArrayBuffer): VehicleStatus | undefined {
  if (buffer.byteLength !== 12) return undefined;
  const view = new DataView(buffer);
  if (view.getUint8(0) !== 1 || view.getUint8(1) > 1 || view.getUint8(2) > 7) return undefined;
  const status = new VehicleStatus();
  status.armed = view.getUint8(1) === 1;
  status.reason = view.getUint8(2);
  status.applied = view.getInt16(4, true);
  status.steering = view.getInt16(6, true);
  status.sequence = view.getUint32(8, true);
  if (Math.abs(status.applied) > 1000 || Math.abs(status.steering) > 1000) return undefined;
  return status;
}

export function describeStatus(status: VehicleStatus): string {
  if (status.armed) return '已解锁 · 可以驾驶';
  switch (status.reason) {
    case 1: return '上电锁定';
    case 2: return '已连接 · 请回中解锁';
    case 3: return '心跳超时 · 已停车锁定';
    case 4: return '急停已生效';
    case 5: return '已锁定';
    case 6: return '指令异常 · 已停车锁定';
    case 7: return '请松开两侧控件，再点击解锁';
    default: return '未解锁';
  }
}
