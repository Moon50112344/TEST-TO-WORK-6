/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  AppWindow,
  Cpu,
  FileText,
  HardDrive,
  Info,
  Layers,
  Play,
  RefreshCw,
  Terminal,
  Zap
} from 'lucide-react';
import { AndroidVMInfo } from '../server/vmService';

interface VMDetailTabsProps {
  vm: AndroidVMInfo | null;
}

export const VMDetailTabs: React.FC<VMDetailTabsProps> = ({ vm }) => {
  const [activeTab, setActiveTab] = useState<'apps' | 'logs' | 'hardware'>('apps');
  const [apps, setApps] = useState<string[]>([]);
  const [logs, setLogs] = useState<{ serial: string; logcat: string }>({ serial: '', logcat: '' });
  const [logType, setLogType] = useState<'serial' | 'logcat'>('serial');
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [launchStatus, setLaunchStatus] = useState<string | null>(null);

  // Load apps
  const fetchApps = async () => {
    if (!vm || vm.status === 'stopped') return;
    try {
      setIsLoadingApps(true);
      const res = await fetch(`/api/vms/${vm.id}/apps`);
      if (res.ok) {
        const data = await res.json();
        setApps(data.apps || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingApps(false);
    }
  };

  // Load logs
  const fetchLogs = async () => {
    if (!vm) return;
    try {
      setIsLoadingLogs(true);
      const res = await fetch(`/api/vms/${vm.id}/logs?lines=100`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (vm) {
      if (activeTab === 'apps') fetchApps();
      if (activeTab === 'logs') fetchLogs();
    }
  }, [vm?.id, activeTab]);

  const handleLaunchApp = async (pkg: string) => {
    if (!vm) return;
    try {
      setLaunchStatus(`Launching ${pkg}...`);
      const res = await fetch(`/api/vms/${vm.id}/launch-app`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageName: pkg }),
      });
      const data = await res.json();
      if (data.success) {
        setLaunchStatus(`App ${pkg} launched on device!`);
      } else {
        setLaunchStatus(`Launch failed: ${data.output}`);
      }
      setTimeout(() => setLaunchStatus(null), 4000);
    } catch (err: any) {
      setLaunchStatus(`Error: ${err.message}`);
    }
  };

  if (!vm) return null;

  return (
    <div className="bg-[#0d1424] rounded-xl border border-[#1b263b] shadow-xl overflow-hidden">
      {/* Tabs Header */}
      <div className="flex items-center justify-between px-4 border-b border-[#1b263b] bg-[#090e1a]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('apps')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'apps'
                ? 'border-[#2f8bff] text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <AppWindow className="w-3.5 h-3.5 text-[#2f8bff]" />
            <span>Installed Applications</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'logs'
                ? 'border-[#2f8bff] text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>System Logs & Telemetry</span>
          </button>

          <button
            onClick={() => setActiveTab('hardware')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'hardware'
                ? 'border-[#2f8bff] text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Info className="w-3.5 h-3.5 text-amber-400" />
            <span>VM Architecture & Sockets</span>
          </button>
        </div>

        {activeTab === 'apps' && (
          <button
            onClick={fetchApps}
            disabled={isLoadingApps}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#152038] cursor-pointer"
            title="Refresh package list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingApps ? 'animate-spin' : ''}`} />
          </button>
        )}

        {activeTab === 'logs' && (
          <button
            onClick={fetchLogs}
            disabled={isLoadingLogs}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#152038] cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Tab Body */}
      <div className="p-4">
        {/* Apps Tab */}
        {activeTab === 'apps' && (
          <div>
            {launchStatus && (
              <div className="mb-3 px-3 py-1.5 rounded-lg bg-[#2f8bff]/15 border border-[#2f8bff]/30 text-[#2f8bff] text-xs">
                {launchStatus}
              </div>
            )}

            {apps.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                {vm.status === 'stopped' ? (
                  'Start the virtual machine to view installed applications.'
                ) : !vm.adbConnected ? (
                  'Waiting for Android Package Manager to initialize...'
                ) : (
                  'Scanning packages...'
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {apps.map((pkg) => {
                  const shortName = pkg.split('.').pop() || pkg;
                  return (
                    <div
                      key={pkg}
                      className="flex items-center justify-between p-2 rounded-lg bg-[#070b14] border border-[#1b263b] hover:border-[#2f8bff]/40 transition-all text-xs"
                    >
                      <div className="overflow-hidden mr-1">
                        <div className="font-medium text-slate-200 capitalize truncate">
                          {shortName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono truncate" title={pkg}>
                          {pkg}
                        </div>
                      </div>
                      <button
                        onClick={() => handleLaunchApp(pkg)}
                        className="p-1 rounded bg-[#131d33] hover:bg-[#2f8bff] text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title={`Launch ${shortName} on screen`}
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setLogType('serial')}
                className={`px-2.5 py-1 rounded text-xs font-mono cursor-pointer ${
                  logType === 'serial'
                    ? 'bg-[#2f8bff] text-white'
                    : 'bg-[#070b14] text-slate-400 hover:text-slate-200'
                }`}
              >
                Serial Kernel Boot Log
              </button>
              <button
                onClick={() => setLogType('logcat')}
                className={`px-2.5 py-1 rounded text-xs font-mono cursor-pointer ${
                  logType === 'logcat'
                    ? 'bg-[#2f8bff] text-white'
                    : 'bg-[#070b14] text-slate-400 hover:text-slate-200'
                }`}
              >
                Android Logcat Stream
              </button>
            </div>

            <pre className="bg-[#05080f] p-3 rounded-lg border border-[#18233b] font-mono text-[11px] text-slate-300 max-h-72 overflow-y-auto leading-relaxed select-text">
              {logType === 'serial' ? (logs.serial || 'No serial logs available.') : (logs.logcat || 'No logcat logs available.')}
            </pre>
          </div>
        )}

        {/* Hardware & Process Architecture */}
        {activeTab === 'hardware' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-[#070b14] border border-[#1b263b] flex flex-col gap-2">
              <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-[#2f8bff]" />
                Process & Virtualization
              </h4>
              <div className="flex justify-between border-b border-[#141d33] py-1 text-slate-400">
                <span>Process Engine:</span>
                <span className="font-mono text-slate-200">QEMU x86_64 TCG JIT</span>
              </div>
              <div className="flex justify-between border-b border-[#141d33] py-1 text-slate-400">
                <span>Process PID:</span>
                <span className="font-mono text-cyan-400">{vm.pid || 'Not running'}</span>
              </div>
              <div className="flex justify-between border-b border-[#141d33] py-1 text-slate-400">
                <span>Virtual CPUs:</span>
                <span className="font-mono text-slate-200">{vm.cpuCores} Cores</span>
              </div>
              <div className="flex justify-between py-1 text-slate-400">
                <span>RAM Allocation:</span>
                <span className="font-mono text-slate-200">{vm.ramMb} MB ({vm.ramUsedMb} MB active RSS)</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#070b14] border border-[#1b263b] flex flex-col gap-2">
              <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                Network Sockets & Disks
              </h4>
              <div className="flex justify-between border-b border-[#141d33] py-1 text-slate-400">
                <span>ADB TCP Socket:</span>
                <span className="font-mono text-cyan-400">127.0.0.1:{vm.adbPort}</span>
              </div>
              <div className="flex justify-between border-b border-[#141d33] py-1 text-slate-400">
                <span>QMP Monitor Socket:</span>
                <span className="font-mono text-slate-200">127.0.0.1:{vm.qmpPort}</span>
              </div>
              <div className="flex justify-between border-b border-[#141d33] py-1 text-slate-400">
                <span>VNC Framebuffer:</span>
                <span className="font-mono text-slate-200">:{vm.vncDisplay} (Port {vm.vncPort})</span>
              </div>
              <div className="flex justify-between py-1 text-slate-400">
                <span>Allocated Disks:</span>
                <span className="font-mono text-slate-200">system.sfs (749M) + cache (256M)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
