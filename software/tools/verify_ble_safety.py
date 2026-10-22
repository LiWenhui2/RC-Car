"""Zero-motion BLE smoke test. Never sends a nonzero throttle or steering.

Usage: python verify_ble_safety.py [--deps PATH] [--output report.json]
Requires bleak and an available computer Bluetooth adapter. Does not test mechanics.
"""
import argparse
import asyncio
import json
import struct
import sys
import time
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--deps")
parser.add_argument("--output", default="ble-safety-results.json")
args = parser.parse_args()
if args.deps:
    sys.path.insert(0, args.deps)
from bleak import BleakClient, BleakScanner

SERVICE = "a9140001-7e6b-4a40-a862-cb008ab14e01"
CONTROL = SERVICE.replace("0001-", "0002-")
MANAGEMENT = SERVICE.replace("0001-", "0003-")
STATUS = SERVICE.replace("0001-", "0004-")
report = {"zero_motion_only": True, "tests": [], "started": time.strftime("%Y-%m-%d %H:%M:%S")}


async def main():
    devices = await BleakScanner.discover(timeout=8, return_adv=True)
    candidates = [device for device, adv in devices.values() if SERVICE in adv.service_uuids and adv.local_name == "RC-Car-V1"]
    if len(candidates) != 1:
        raise RuntimeError(f"Expected exactly one RC-Car-V1 with matching service, found {len(candidates)}")
    device = candidates[0]
    report["address"] = device.address
    print(f"Found {device.name}: {device.address}", flush=True)
    latest = {}
    history = []
    sequence = 0
    heartbeat = None
    operation_lock = asyncio.Lock()

    def on_status(_, value):
        if len(value) != 12:
            return
        version, armed, reason, _, applied, steering, seq = struct.unpack("<BBBBhhI", value)
        latest.update(version=version, armed=bool(armed), reason=reason, applied=applied, steering=steering, sequence=seq)
        history.append(dict(latest))
        report["recent_notifications"] = history[-20:]
        if applied != 0 or steering != 0:
            raise RuntimeError("Unexpected nonzero output during zero-motion test")

    async with BleakClient(device, timeout=20) as client:
        async def write(uuid, value):
            async with operation_lock:
                await client.write_gatt_char(uuid, value, response=True)

        async def neutral_loop():
            nonlocal sequence
            deadline = time.monotonic()
            while True:
                sequence += 1
                await write(CONTROL, struct.pack("<hhHI", 0, 0, 0, sequence))
                # Maintain a 50ms period, rather than adding 50ms to GATT RTT.
                deadline += 0.05
                if time.monotonic() - deadline > 0.05:
                    deadline = time.monotonic()
                await asyncio.sleep(max(0, deadline - time.monotonic()))

        async def wait_for(label, predicate, timeout=3):
            deadline = time.monotonic() + timeout
            while time.monotonic() < deadline:
                if latest and predicate(latest):
                    assert latest["applied"] == 0 and latest["steering"] == 0
                    report["tests"].append({"name": label, "passed": True, "status": dict(latest)})
                    print(f"PASS {label}: {latest}", flush=True)
                    return
                await asyncio.sleep(0.01)
            raise AssertionError(f"{label}: status={latest}")

        async def stop_heartbeat():
            nonlocal heartbeat
            if heartbeat:
                heartbeat.cancel()
                try:
                    await heartbeat
                except asyncio.CancelledError:
                    pass
                heartbeat = None

        await client.start_notify(STATUS, on_status)
        on_status(None, await client.read_gatt_char(STATUS))
        try:
            await wait_for("connected_is_locked", lambda s: not s["armed"])
            heartbeat = asyncio.create_task(neutral_loop())
            await asyncio.sleep(0.25)
            await write(MANAGEMENT, b"\x01")
            await wait_for("explicit_neutral_arm", lambda s: s["armed"])
            await write(MANAGEMENT, b"\x02")
            await wait_for("explicit_lock", lambda s: not s["armed"] and s["reason"] == 5)
            await asyncio.sleep(0.25)
            assert not latest["armed"], "Neutral heartbeats must not automatically rearm"
            report["tests"].append({"name": "no_automatic_rearm", "passed": True})
            await write(MANAGEMENT, b"\x01")
            await wait_for("rearm_requires_request", lambda s: s["armed"])
            await stop_heartbeat()
            await wait_for("heartbeat_timeout_locks", lambda s: not s["armed"] and s["reason"] == 3)
            old_sequence = latest["sequence"]
            for _ in range(5):
                await write(CONTROL, struct.pack("<hhHI", 0, 0, 0, old_sequence))
                await asyncio.sleep(0.03)
            await write(MANAGEMENT, b"\x01")
            await asyncio.sleep(0.1)
            assert not latest["armed"] and latest["reason"] == 3
            report["tests"].append({"name": "replayed_packets_do_not_refresh_heartbeat", "passed": True})
            heartbeat = asyncio.create_task(neutral_loop())
            await asyncio.sleep(0.2)
            await write(MANAGEMENT, b"\x01")
            await wait_for("fresh_packets_allow_explicit_rearm", lambda s: s["armed"])
            await write(MANAGEMENT, b"\x03")
            await wait_for("emergency_stop_locks", lambda s: not s["armed"] and s["reason"] == 4)
            await write(CONTROL, b"\x00")
            await wait_for("malformed_packet_locks", lambda s: not s["armed"] and s["reason"] == 6)
        finally:
            await stop_heartbeat()
            await write(MANAGEMENT, b"\x02")
            await asyncio.sleep(0.1)
    await asyncio.sleep(0.3)
    async with BleakClient(device, timeout=20) as client:
        await asyncio.sleep(0.2)
        value = await client.read_gatt_char(STATUS)
        assert len(value) == 12 and value[1] == 0
        report["tests"].append({"name": "reconnect_is_locked", "passed": True})
    report["notification_count"] = len(history)
    report["passed"] = True


try:
    asyncio.run(main())
except Exception as error:
    report["passed"] = False
    report["error"] = str(error)
    raise
finally:
    Path(args.output).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
