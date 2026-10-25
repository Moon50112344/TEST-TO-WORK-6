/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ProvisioningStatus {
  isReady: boolean;
  isDownloading: boolean;
  progress: number;
  message: string;
  error?: string;
}

export class AssetManager {
  private static instance: AssetManager;
  private provisioningStatus: ProvisioningStatus = {
    isReady: false,
    isDownloading: false,
    progress: 0,
    message: 'Checking Android system assets...',
  };

  private constructor() {
    this.ensureStorageDirs();
    this.checkAssetsReady();
  }

  public static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }

  /**
   * Safely resolves the VM storage root directory.
   * Uses os.tmpdir()/moon-vms which is world-writable (mode 1777), preventing EACCES on Render.
   */
  public getStorageDir(): string {
    if (process.env.MOON_STORAGE_DIR) {
      const custom = process.env.MOON_STORAGE_DIR;
      if (!fs.existsSync(custom)) {
        try { fs.mkdirSync(custom, { recursive: true }); } catch {}
      }
      return custom;
    }

    const defaultDir = path.join(os.tmpdir(), 'moon-vms');
    if (!fs.existsSync(defaultDir)) {
      try {
        fs.mkdirSync(defaultDir, { recursive: true });
      } catch {
        const fallback = path.join(process.cwd(), '.data', 'moon-vms');
        if (!fs.existsSync(fallback)) {
          fs.mkdirSync(fallback, { recursive: true });
        }
        return fallback;
      }
    }
    return defaultDir;
  }

  public getImagesDir(): string {
    const dir = path.join(this.getStorageDir(), 'images');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  public getInstancesDir(): string {
    const dir = path.join(this.getStorageDir(), 'instances');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  public getProvisioningStatus(): ProvisioningStatus {
    return { ...this.provisioningStatus };
  }

  private ensureStorageDirs(): void {
    try {
      this.getImagesDir();
      this.getInstancesDir();
    } catch (e: any) {
      console.warn('[AssetManager] Failed to create storage directories:', e.message);
    }
  }

  /**
   * Checks if all required Android x86 assets exist on disk.
   */
  public checkAssetsReady(): boolean {
    const imagesDir = this.getImagesDir();
    const systemImg = path.join(imagesDir, 'system.img');
    const kernel = path.join(imagesDir, 'kernel-qemu');
    const ramdisk = path.join(imagesDir, 'ramdisk_virtio.img');

    // Also check local project android/ directory as fallback
    const localKernel = path.join(process.cwd(), 'android', 'x86', 'kernel-qemu');

    const hasSystem = fs.existsSync(systemImg);
    const hasKernel = fs.existsSync(kernel) || fs.existsSync(localKernel);
    const hasRamdisk = fs.existsSync(ramdisk) || fs.existsSync(path.join(imagesDir, 'ramdisk.img'));

    const ready = hasSystem && hasKernel && hasRamdisk;
    this.provisioningStatus.isReady = ready;
    if (ready) {
      this.provisioningStatus.message = 'Android OS assets are ready.';
      this.provisioningStatus.progress = 100;
    }
    return ready;
  }

  public getAssets(): { kernel: string; ramdisk: string; systemImg: string } {
    const imagesDir = this.getImagesDir();
    const systemImg = path.join(imagesDir, 'system.img');
    
    let kernel = path.join(imagesDir, 'kernel-qemu');
    if (!fs.existsSync(kernel)) {
      const localKernel = path.join(process.cwd(), 'android', 'x86', 'kernel-qemu');
      if (fs.existsSync(localKernel)) kernel = localKernel;
    }

    let ramdisk = path.join(imagesDir, 'ramdisk_virtio.img');
    if (!fs.existsSync(ramdisk)) {
      const rawRamdisk = path.join(imagesDir, 'ramdisk.img');
      if (fs.existsSync(rawRamdisk)) ramdisk = rawRamdisk;
    }

    return { kernel, ramdisk, systemImg };
  }

  /**
   * Downloads official Google Android AOSP x86 system images on Render or fresh environments.
   */
  public async ensureAndroidAssetsReady(): Promise<boolean> {
    if (this.checkAssetsReady()) {
      return true;
    }

    if (this.provisioningStatus.isDownloading) {
      // Already downloading, wait until finished
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          if (!this.provisioningStatus.isDownloading) {
            clearInterval(interval);
            resolve(this.provisioningStatus.isReady);
          }
        }, 1000);
      });
    }

    this.provisioningStatus.isDownloading = true;
    this.provisioningStatus.progress = 5;
    this.provisioningStatus.message = 'Downloading Android AOSP OS images from Google repository...';

    const imagesDir = this.getImagesDir();
    const tempZip = path.join(os.tmpdir(), `android_x86_${Date.now()}.zip`);
    const extractDir = path.join(os.tmpdir(), `android_extract_${Date.now()}`);

    try {
      console.log('[AssetManager] Downloading official Android x86 system image archive (198 MB)...');
      this.provisioningStatus.progress = 15;
      this.provisioningStatus.message = 'Fetching Android OS archive (198 MB)...';

      // Download from Google official repository
      await execAsync(
        `curl -L -f -s -o "${tempZip}" https://dl.google.com/android/repository/sys-img/android/x86-21_r05.zip`,
        { timeout: 300000 }
      );

      this.provisioningStatus.progress = 60;
      this.provisioningStatus.message = 'Extracting system.img, kernel, and ramdisk...';
      console.log('[AssetManager] Extracting Android image files...');

      if (!fs.existsSync(extractDir)) {
        fs.mkdirSync(extractDir, { recursive: true });
      }

      await execAsync(`unzip -q -o "${tempZip}" "x86/*" -d "${extractDir}"`);

      const extractedX86 = path.join(extractDir, 'x86');
      const targetSystem = path.join(imagesDir, 'system.img');
      const targetKernel = path.join(imagesDir, 'kernel-qemu');
      const targetRamdisk = path.join(imagesDir, 'ramdisk.img');

      if (fs.existsSync(path.join(extractedX86, 'system.img'))) {
        fs.copyFileSync(path.join(extractedX86, 'system.img'), targetSystem);
      }
      if (fs.existsSync(path.join(extractedX86, 'kernel-qemu'))) {
        fs.copyFileSync(path.join(extractedX86, 'kernel-qemu'), targetKernel);
      }
      if (fs.existsSync(path.join(extractedX86, 'ramdisk.img'))) {
        fs.copyFileSync(path.join(extractedX86, 'ramdisk.img'), targetRamdisk);
      }

      this.provisioningStatus.progress = 85;
      this.provisioningStatus.message = 'Building VirtIO-optimized Android ramdisk...';
      console.log('[AssetManager] Building VirtIO ramdisk...');

      // Build ramdisk_virtio.img
      await this.buildVirtIORamdisk(targetRamdisk, path.join(imagesDir, 'ramdisk_virtio.img'));

      this.provisioningStatus.progress = 100;
      this.provisioningStatus.isReady = true;
      this.provisioningStatus.message = 'Android OS assets prepared successfully.';
      console.log('[AssetManager] Android OS assets prepared successfully.');
      return true;
    } catch (err: any) {
      console.error('[AssetManager] Failed to prepare Android assets:', err.message);
      this.provisioningStatus.error = err.message;
      this.provisioningStatus.message = `Asset preparation failed: ${err.message}`;
      return false;
    } finally {
      this.provisioningStatus.isDownloading = false;
      try {
        if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip);
        if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
      } catch {}
    }
  }

  private async buildVirtIORamdisk(srcRamdisk: string, targetVirtIO: string): Promise<void> {
    const tmpBuild = path.join(os.tmpdir(), `rd_build_${Date.now()}`);
    try {
      if (!fs.existsSync(srcRamdisk)) return;
      fs.mkdirSync(tmpBuild, { recursive: true });

      await execAsync(
        `cd "${tmpBuild}" && zcat "${srcRamdisk}" | cpio -idmv >/dev/null && ` +
        `echo "service.adb.tcp.port=5555" >> default.prop && ` +
        `sed -i 's|/dev/block/mtdblock0|/dev/block/vda|g' fstab.goldfish 2>/dev/null || true && ` +
        `sed -i 's|/dev/block/mtdblock1|/dev/block/vdc|g' fstab.goldfish 2>/dev/null || true && ` +
        `sed -i 's|/dev/block/mtdblock2|/dev/block/vdb|g' fstab.goldfish 2>/dev/null || true && ` +
        `find . | cpio -o -H newc | gzip -9 > "${targetVirtIO}"`
      );
    } catch (e: any) {
      console.warn('[AssetManager] Notice during ramdisk patch:', e.message);
      // Fallback: if cpio patch fails, copy raw ramdisk
      if (!fs.existsSync(targetVirtIO) && fs.existsSync(srcRamdisk)) {
        fs.copyFileSync(srcRamdisk, targetVirtIO);
      }
    } finally {
      try {
        if (fs.existsSync(tmpBuild)) fs.rmSync(tmpBuild, { recursive: true, force: true });
      } catch {}
    }
  }
}

export const assetManager = AssetManager.getInstance();
