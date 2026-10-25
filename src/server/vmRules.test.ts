/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { canCreateVM, allocatePorts, scaleCoordinate, mapActionToKeyCode, MAX_VMS_PER_USER } from './vmRules';

test('canCreateVM enforces maximum 3 VMs quota', () => {
  assert.equal(canCreateVM(0), true);
  assert.equal(canCreateVM(1), true);
  assert.equal(canCreateVM(2), true);
  assert.equal(canCreateVM(3), false);
  assert.equal(canCreateVM(4), false);
});

test('allocatePorts assigns collision-free ports for VM slots', () => {
  const p0 = allocatePorts(0);
  assert.deepEqual(p0, { adbPort: 5555, qmpPort: 4444, vncPort: 5901, vncDisplay: 1 });

  const p1 = allocatePorts(1);
  assert.deepEqual(p1, { adbPort: 5557, qmpPort: 4445, vncPort: 5902, vncDisplay: 2 });

  const p2 = allocatePorts(2);
  assert.deepEqual(p2, { adbPort: 5559, qmpPort: 4446, vncPort: 5903, vncDisplay: 3 });

  // Out of bounds slot throws
  assert.throws(() => allocatePorts(3));
  assert.throws(() => allocatePorts(-1));
});

test('scaleCoordinate translates screen touches precisely', () => {
  // Center of 500x1000 viewport to 1024x768 native resolution
  const center = scaleCoordinate(250, 500, 500, 1000, 1024, 768);
  assert.equal(center.x, 512);
  assert.equal(center.y, 384);

  // Clamping check
  const clamped = scaleCoordinate(-50, 1500, 500, 1000, 1024, 768);
  assert.equal(clamped.x, 0);
  assert.equal(clamped.y, 768);
});

test('mapActionToKeyCode returns valid Android keycodes and QEMU keys', () => {
  assert.deepEqual(mapActionToKeyCode('power'), { adbKeyCode: 26, qemuKey: 'power' });
  assert.deepEqual(mapActionToKeyCode('home'), { adbKeyCode: 3, qemuKey: 'home' });
  assert.deepEqual(mapActionToKeyCode('back'), { adbKeyCode: 4, qemuKey: 'esc' });
  assert.deepEqual(mapActionToKeyCode('recent'), { adbKeyCode: 187, qemuKey: 'menu' });
  assert.deepEqual(mapActionToKeyCode('volume_up'), { adbKeyCode: 24, qemuKey: 'volumeup' });
  assert.deepEqual(mapActionToKeyCode('volume_down'), { adbKeyCode: 25, qemuKey: 'volumedown' });

  assert.throws(() => mapActionToKeyCode('invalid_action'));
});
