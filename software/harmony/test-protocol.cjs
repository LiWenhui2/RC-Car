// Tests the exact protocol module compiled into the Harmony app, without a phone.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const studio = process.env.DEVECO_STUDIO_HOME || 'D:/Program Files/DevEco Studio';
const ts = require(path.join(studio, 'tools/hvigor/hvigor/node_modules/typescript/lib/typescript.js'));
const source = fs.readFileSync(path.join(__dirname, 'entry/src/main/ets/ble/CarProtocol.ts'), 'utf8');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
  { exports: exportsObject, ArrayBuffer, DataView, Uint8Array, Math });
const { encodeControl, decodeStatus } = exportsObject;
const tests = [];
function test(name, fn) { fn(); tests.push({ name, passed: true }); console.log(`PASS ${name}`); }
test('ten-byte signed little-endian control', () => {
  assert.deepEqual([...new Uint8Array(encodeControl(-1000, 1000, 0x01020304))], [24, 252, 232, 3, 0, 0, 4, 3, 2, 1]);
});
test('axis limits and sequence wraparound', () => {
  assert.deepEqual([...new Uint8Array(encodeControl(-9000, 9000, 0x100000000))], [...new Uint8Array(encodeControl(-1000, 1000, 0))]);
});
test('vehicle feedback with negative throttle and unsigned sequence', () => {
  const status = decodeStatus(new Uint8Array([1, 1, 0, 0, 24, 252, 232, 3, 255, 255, 255, 255]).buffer);
  assert.equal(status.armed, true); assert.equal(status.applied, -1000);
  assert.equal(status.steering, 1000); assert.equal(status.sequence, 4294967295);
});
test('invalid length version state and ranges rejected', () => {
  assert.equal(decodeStatus(new ArrayBuffer(10)), undefined);
  assert.equal(decodeStatus(new ArrayBuffer(12)), undefined);
  assert.equal(decodeStatus(new Uint8Array([1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]).buffer), undefined);
  assert.equal(decodeStatus(new Uint8Array([1, 1, 0, 0, 255, 127, 0, 0, 0, 0, 0, 0]).buffer), undefined);
});
fs.writeFileSync(path.join(__dirname, '../../outputs/ble-control/harmony-protocol-tests.json'), JSON.stringify({ passed: true, tests }, null, 2));
