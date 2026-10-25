/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Cpu, HardDrive, Plus, RefreshCw, Server, ShieldCheck, Smartphone } from 'lucide-react';
import { AndroidVMInfo } from '../server/vmService';

interface HeaderProps {
  vms: AndroidVMInfo[];
  selectedVM: AndroidVMInfo | null;
  onOpenCreateModal: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  vms,
  selectedVM,
  onOpenCreateModal,
  onRefresh,
  isRefreshing,
}) => {
  const activeCount = vms.filter(v => v.status === 'running' || v.status === 'booting').length;

  return (
    <header className="border-b border-[#1b263b] bg-[#0d1424] px-4 py-3 sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <img
            src="https://moonstudio.us.ci/logo.jpg"
            alt="Moon Studio Logo"
            className="w-10 h-10 rounded-lg object-cover ring-2 ring-[#2f8bff]/40 shadow-sm"
            onError={(e) => {
              // Graceful fallback avatar if remote logo network is slow
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight select-none">
                <span className="text-white">Moon </span>
                <span className="text-[#2f8bff]">Studio</span>
              </h1>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-[#2f8bff]/15 text-[#2f8bff] border border-[#2f8bff]/30">
                Cloud Android
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Real Bare-Metal Virtual Machine Engine & Live Browser Control
            </p>
          </div>
        </div>

        {/* System Specs & VM Quota HUD */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Host info badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#070b14] border border-[#1e293b] text-slate-300">
            <Server className="w-3.5 h-3.5 text-[#2f8bff]" />
            <span className="font-medium">Debian 12 x86_64</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">QEMU 7.2</span>
          </div>

          {/* Real RAM & Disk Badges */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#070b14] border border-[#1e293b] text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>12 GB RAM</span>
            <span className="text-slate-500">•</span>
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
            <span>283 GB Disk</span>
          </div>

          {/* VM Quota badge (Max 3) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#070b14] border border-[#1e293b]">
            <Smartphone className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">VM Quota:</span>
            <span className={`font-semibold ${vms.length >= 3 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {vms.length}/3
            </span>
            <span className="text-[10px] text-slate-500">({activeCount} running)</span>
          </div>

          {/* Action buttons */}
          <button
            onClick={onRefresh}
            title="Refresh devices and metrics"
            disabled={isRefreshing}
            className="p-2 rounded-md bg-[#131d33] hover:bg-[#1a2642] text-slate-300 hover:text-white border border-[#233152] transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Refresh VM list"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#2f8bff]' : ''}`} />
          </button>

          <button
            onClick={onOpenCreateModal}
            disabled={vms.length >= 3}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#2f8bff] hover:bg-[#2575dc] text-white font-medium text-xs shadow-md shadow-[#2f8bff]/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>New Android VM</span>
          </button>
        </div>
      </div>
    </header>
  );
};
