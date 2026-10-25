/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { vmService } from './src/server/vmService';
import { assetManager } from './src/server/assetManager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(path.resolve(__dirname), '.uploads');
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch {
  // fallback
}
const upload = multer({ dest: uploadDir });

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // --- API Endpoints ---

  // Host system information
  app.get('/api/system-info', async (_req, res) => {
    try {
      const vms = await vmService.listVMs();
      res.json({
        host: {
          os: 'Debian GNU/Linux 12 (bookworm)',
          kernel: '4.19.0-gvisor x86_64',
          emulator: 'QEMU 7.2.22 (TCG high-performance JIT mode)',
          adbVersion: '1.0.41',
          totalMemoryMb: 12288,
          totalDiskGb: 283,
          maxVms: 3,
        },
        activeVmsCount: vms.filter(v => v.status === 'running' || v.status === 'booting').length,
        totalVmsCount: vms.length,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // List all VMs
  app.get('/api/vms', async (_req, res) => {
    try {
      const vms = await vmService.listVMs();
      res.json(vms);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create a new VM
  app.post('/api/vms', async (req, res) => {
    try {
      const { name, ramMb, cpuCores } = req.body;
      const newVm = await vmService.createVM(name, ramMb, cpuCores);
      res.status(201).json(newVm);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Get specific VM info
  app.get('/api/vms/:id', async (req, res) => {
    try {
      const info = await vmService.getVMStatus(req.params.id);
      res.json(info);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  });

  // Start VM
  app.post('/api/vms/:id/start', async (req, res) => {
    try {
      const info = await vmService.startVM(req.params.id);
      res.json(info);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Stop VM
  app.post('/api/vms/:id/stop', async (req, res) => {
    try {
      const info = await vmService.stopVM(req.params.id);
      res.json(info);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Restart VM
  app.post('/api/vms/:id/restart', async (req, res) => {
    try {
      const info = await vmService.restartVM(req.params.id);
      res.json(info);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete VM
  app.delete('/api/vms/:id', async (req, res) => {
    try {
      await vmService.deleteVM(req.params.id);
      res.json({ success: true, message: `VM ${req.params.id} deleted` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Live Screen Capture Frame
  app.get('/api/vms/:id/screen', async (req, res) => {
    try {
      const buffer = await vmService.captureScreen(req.params.id);
      const isSvg = buffer.toString('utf8', 0, 10).includes('<svg');
      res.setHeader('Content-Type', isSvg ? 'image/svg+xml' : 'image/jpeg');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.send(buffer);
    } catch (err: any) {
      res.status(503).json({ error: err.message });
    }
  });

  // Dispatch Touch/Keyboard/Swipe Input
  app.post('/api/vms/:id/input', async (req, res) => {
    try {
      const result = await vmService.sendInput(req.params.id, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Install APK
  app.post('/api/vms/:id/install-apk', upload.single('apk'), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No APK file uploaded' });
        return;
      }
      const result = await vmService.installApk(req.params.id, req.file.path, req.file.originalname);
      fs.unlink(req.file.path, () => {});
      res.json(result);
    } catch (err: any) {
      if (req.file) fs.unlink(req.file.path, () => {});
      res.status(500).json({ error: err.message });
    }
  });

  // Push File to /sdcard/Download/
  app.post('/api/vms/:id/push-file', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }
      const result = await vmService.pushFile(req.params.id, req.file.path, req.file.originalname);
      fs.unlink(req.file.path, () => {});
      res.json(result);
    } catch (err: any) {
      if (req.file) fs.unlink(req.file.path, () => {});
      res.status(500).json({ error: err.message });
    }
  });

  // Fetch Serial and Logcat Logs
  app.get('/api/vms/:id/logs', async (req, res) => {
    try {
      const lines = parseInt(req.query.lines as string, 10) || 120;
      const logs = await vmService.getLogs(req.params.id, lines);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // List Installed Apps
  app.get('/api/vms/:id/apps', async (req, res) => {
    try {
      const apps = await vmService.listInstalledApps(req.params.id);
      res.json({ apps });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Launch App
  app.post('/api/vms/:id/launch-app', async (req, res) => {
    try {
      const { packageName } = req.body;
      if (!packageName) {
        res.status(400).json({ error: 'packageName is required' });
        return;
      }
      const result = await vmService.launchApp(req.params.id, packageName);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Provisioning & asset preparation status endpoint
  app.get('/api/provisioning-status', (_req, res) => {
    res.json(assetManager.getProvisioningStatus());
  });

  // --- Vite Dev Server Middleware Integration ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  // Ensure Android OS assets are prepared in safe, writable storage (works on Render, Docker, etc.)
  assetManager.ensureAndroidAssetsReady().then(async () => {
    try {
      const vms = await vmService.listVMs();
      if (vms.length === 0) {
        console.log('Bootstrapping default Moon Android VM-1...');
        await vmService.createVM('Moon Pixel Pro (Default)', 2048, 2);
      }
    } catch (e: any) {
      console.warn('Initial VM auto-start info:', e.message);
    }
  }).catch((err) => {
    console.warn('Asset preparation in background notice:', err.message);
  });

  // Automatically start MoonVM-1 if none is running so user immediately has a live instance
  setTimeout(async () => {
    try {
      const vms = await vmService.listVMs();
      if (vms.length === 0) {
        console.log('Bootstrapping default Moon Android VM-1...');
        await vmService.createVM('Moon Pixel Pro (Default)', 2048, 2);
      }
    } catch (e: any) {
      console.warn('Initial VM auto-start info:', e.message);
    }
  }, 1000);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Moon Studio Cloud Android server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});
