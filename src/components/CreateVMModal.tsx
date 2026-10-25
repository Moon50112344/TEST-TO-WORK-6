/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Cpu, HardDrive, Loader2, Smartphone, X } from 'lucide-react';

interface CreateVMModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, ramMb: number, cpuCores: number) => Promise<any>;
  currentVmCount: number;
}

export const CreateVMModal: React.FC<CreateVMModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  currentVmCount,
}) => {
  const [name, setName] = useState<string>(`Moon Android VM ${currentVmCount + 1}`);
  const [ramMb, setRamMb] = useState<number>(2048);
  const [cpuCores, setCpuCores] = useState<number>(2);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await onCreate(name.trim(), ramMb, cpuCores);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Android VM');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-md bg-[#0d1424] border border-[#1b263b] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1b263b] bg-[#090e1a]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#2f8bff]/20 text-[#2f8bff] flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Create New Android VM</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-[#16233d] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">
              Device Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Moon Pixel Pro"
              required
              className="w-full bg-[#070b14] border border-[#1e2a47] rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#2f8bff] focus:ring-1 focus:ring-[#2f8bff]"
            />
          </div>

          {/* Memory Allocation */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5 flex items-center justify-between">
              <span>RAM Allocation</span>
              <span className="text-[#2f8bff] font-mono">{ramMb} MB</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[1536, 2048, 3072].map((mb) => (
                <button
                  type="button"
                  key={mb}
                  onClick={() => setRamMb(mb)}
                  className={`py-2 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                    ramMb === mb
                      ? 'bg-[#2f8bff]/20 border-[#2f8bff] text-white font-semibold'
                      : 'bg-[#070b14] border-[#1e2a47] text-slate-400 hover:border-[#28385e]'
                  }`}
                >
                  {mb / 1024} GB
                </button>
              ))}
            </div>
          </div>

          {/* CPU Cores */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5 flex items-center justify-between">
              <span>Virtual CPU Cores</span>
              <span className="text-cyan-400 font-mono">{cpuCores} vCPU</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[1, 2].map((cores) => (
                <button
                  type="button"
                  key={cores}
                  onClick={() => setCpuCores(cores)}
                  className={`py-2 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                    cpuCores === cores
                      ? 'bg-cyan-500/20 border-cyan-400 text-white font-semibold'
                      : 'bg-[#070b14] border-[#1e2a47] text-slate-400 hover:border-[#28385e]'
                  }`}
                >
                  {cores} {cores === 1 ? 'Core' : 'Cores (Recommended)'}
                </button>
              ))}
            </div>
          </div>

          {/* OS Image Info */}
          <div className="p-3 rounded-lg bg-[#070b14] border border-[#17223b] flex items-center justify-between text-[11px]">
            <div>
              <span className="text-slate-500 block">System Architecture</span>
              <span className="text-slate-200 font-medium">Android 7.1.2 Nougat x86_64</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Storage Disk</span>
              <span className="text-slate-200 font-medium">Ext4 Persistent (2GB)</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1b263b] mt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-[#141e33] hover:bg-[#1a2845] text-slate-300 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2f8bff] hover:bg-[#2575dc] text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 shadow-md shadow-[#2f8bff]/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Provisioning VM...</span>
                </>
              ) : (
                <span>Launch Virtual Machine</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
