/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  HardDrive,
  Loader2,
  Play,
  Power,
  RefreshCw,
  Server,
  Smartphone,
  Trash2
} from 'lucide-react';
import { AndroidVMInfo } from '../server/vmService';

interface VMListProps {
  vms: AndroidVMInfo[];
  selectedVM: AndroidVMInfo | null;
  onSelectVM: (vm: AndroidVMInfo) => void;
  onStartVM: (id: string) => Promise<any>;
  onStopVM: (id: string) => Promise<any>;
  onRestartVM: (id: string) => Promise<any>;
  onDeleteVM: (id: string) => Promise<any>;
  actionLoadingId: string | null;
}

export const VMList: React.FC<VMListProps> = ({
  vms,
  selectedVM,
  onSelectVM,
  onStartVM,
  onStopVM,
  onRestartVM,
  onDeleteVM,
  actionLoadingId,
}) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-slate-300 uppercase">
          Android VM Fleet ({vms.length}/3)
        </h2>
        <span className="text-[11px] text-slate-500">Max 3 VMs per user</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {vms.map((vm) => {
          const isSelected = selectedVM?.id === vm.id;
          const isLoading = actionLoadingId === vm.id;

          let statusBadge = (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              Stopped
            </span>
          );

          if (vm.status === 'running') {
            statusBadge = (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            );
          } else if (vm.status === 'booting') {
            statusBadge = (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-950/60 text-amber-300 border border-amber-800/80">
                <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                Booting
              </span>
            );
          }

          return (
            <div
              key={vm.id}
              onClick={() => onSelectVM(vm)}
              className={`relative flex flex-col p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#10192e] border-[#2f8bff] ring-1 ring-[#2f8bff]/40 shadow-xl shadow-[#2f8bff]/10'
                  : 'bg-[#0d1424] border-[#1b263b] hover:border-[#283859]'
              }`}
            >
              {/* Header Info */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isSelected
                        ? 'bg-[#2f8bff]/20 text-[#2f8bff] border border-[#2f8bff]/40'
                        : 'bg-[#141e33] text-slate-400'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-white leading-tight">
                      {vm.name}
                    </h3>
                    <div className="text-[10px] font-mono text-slate-400">
                      ID: {vm.id}
                    </div>
                  </div>
                </div>
                {statusBadge}
              </div>

              {/* Real Hardware & Process Specs */}
              <div className="grid grid-cols-2 gap-2 my-2.5 p-2 rounded-lg bg-[#070b14]/70 border border-[#17223b] text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">CPU ({vm.cpuCores} vCPU)</span>
                  <div className="flex items-center gap-1 text-slate-300 font-mono">
                    <Cpu className="w-3 h-3 text-[#2f8bff]" />
                    <span>{vm.status !== 'stopped' ? `${vm.cpuPercent}%` : '0%'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">RAM ({vm.ramMb} MB)</span>
                  <div className="text-slate-300 font-mono">
                    {vm.status !== 'stopped' ? `${vm.ramUsedMb} MB` : '0 MB'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">ADB Port</span>
                  <div className="font-mono text-cyan-400 text-[10px]">
                    :{vm.adbPort}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">Uptime</span>
                  <div className="font-mono text-slate-300 text-[10px]">
                    {vm.uptimeSeconds ? `${vm.uptimeSeconds}s` : 'Offline'}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-1.5 pt-2 mt-auto border-t border-[#1b263b]">
                <div className="flex items-center gap-1">
                  {vm.status === 'stopped' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartVM(vm.id);
                      }}
                      disabled={isLoading}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#2f8bff] hover:bg-[#2575dc] text-white text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                      title="Power on VM"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Start</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStopVM(vm.id);
                        }}
                        disabled={isLoading}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800 text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                        title="Shutdown VM"
                      >
                        <Power className="w-3 h-3" />
                        <span>Stop</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRestartVM(vm.id);
                        }}
                        disabled={isLoading}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-[#16233d] hover:bg-[#1e2f52] text-slate-200 border border-[#23355b] text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                        title="Reboot VM"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Reboot</span>
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Are you sure you want to delete ${vm.name}? Real disk storage will be erased.`)) {
                      onDeleteVM(vm.id);
                    }
                  }}
                  disabled={isLoading}
                  className="p-1.5 rounded hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Delete Virtual Machine"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
