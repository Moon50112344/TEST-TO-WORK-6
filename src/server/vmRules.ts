/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface VMPortConfig {
  adbPort: number;
  qmpPort: number;
  vncPort: number;
  vncDisplay: number;
}

export const MAX_VMS_PER_USER = 3;
export const BASE_ADB_PORT = 5555;
export const BASE_QMP_PORT = 4444;
export const BASE_VNC_PORT = 5901;

/**
 * Checks if a user is permitted to create a new VM based on the 3-VM quota.
 */
export function canCreateVM(currentCount: number, maxQuota: number = MAX_VMS_PER_USER): boolean {
  return currentCount < maxQuota;
}

/**
 * Allocates distinct, conflict-free ports for a new VM based on slot index (0, 1, 2).
 */
export function allocatePorts(slotIndex: number): VMPortConfig {
  if (slotIndex < 0 || slotIndex >= MAX_VMS_PER_USER) {
    throw new Error(`Slot index must be between 0 and ${MAX_VMS_PER_USER - 1}, received ${slotIndex}`);
  }
  const offset = slotIndex * 2;
  return {
    adbPort: BASE_ADB_PORT + offset,
    qmpPort: BASE_QMP_PORT + slotIndex,
    vncPort: BASE_VNC_PORT + slotIndex,
    vncDisplay: 1 + slotIndex,
  };
}

/**
 * Translates client interaction coordinates (touch/click) to guest VM native resolution.
 */
export function scaleCoordinate(
  clientX: number,
  clientY: number,
  viewWidth: number,
  viewHeight: number,
  vmWidth: number = 1024,
  vmHeight: number = 768
): { x: number; y: number } {
  if (viewWidth <= 0 || viewHeight <= 0) {
    return { x: 0, y: 0 };
  }
  const clampedX = Math.max(0, Math.min(clientX, viewWidth));
  const clampedY = Math.max(0, Math.min(clientY, viewHeight));

  const scaleX = vmWidth / viewWidth;
  const scaleY = vmHeight / viewHeight;

  return {
    x: Math.round(clampedX * scaleX),
    y: Math.round(clampedY * scaleY),
  };
}

/**
 * Maps human-readable UI actions to standard Android ADB keycodes and QEMU monitor keys.
 */
export function mapActionToKeyCode(action: string): { adbKeyCode: number; qemuKey: string } {
  switch (action.toLowerCase()) {
    case 'power':
      return { adbKeyCode: 26, qemuKey: 'power' };
    case 'home':
      return { adbKeyCode: 3, qemuKey: 'home' };
    case 'back':
      return { adbKeyCode: 4, qemuKey: 'esc' };
    case 'recent':
    case 'app_switch':
      return { adbKeyCode: 187, qemuKey: 'menu' };
    case 'volume_up':
    case 'volumeup':
      return { adbKeyCode: 24, qemuKey: 'volumeup' };
    case 'volume_down':
    case 'volumedown':
      return { adbKeyCode: 25, qemuKey: 'volumedown' };
    case 'enter':
      return { adbKeyCode: 66, qemuKey: 'ret' };
    default:
      throw new Error(`Unsupported VM action: ${action}`);
  }
}
