/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { DeviceScreen } from './components/DeviceScreen';
import { ControlPanel } from './components/ControlPanel';
import { VMList } from './components/VMList';
import { VMDetailTabs } from './components/VMDetailTabs';
import { CreateVMModal } from './components/CreateVMModal';
import { AndroidVMInfo } from './server/vmService';

export default function App() {
  const [vms, setVms] = useState<AndroidVMInfo[]>([]);
  const [selectedVMId, setSelectedVMId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch VM fleet
  const fetchVMs = useCallback(async (quiet: boolean = false) => {
    if (!quiet) setIsRefreshing(true);
    try {
      const res = await fetch('/api/vms');
      if (res.ok) {
        const data: AndroidVMInfo[] = await res.json();
        setVms(data);

        // Auto-select first active or first VM if none selected
        if (data.length > 0) {
          setSelectedVMId(prev => {
            if (prev && data.some(v => v.id === prev)) return prev;
            const running = data.find(v => v.status === 'running' || v.status === 'booting');
            return running ? running.id : data[0].id;
          });
        }
      }
    } catch (err: any) {
      if (!quiet) setErrorMessage(err.message || 'Failed to fetch VMs');
    } finally {
      if (!quiet) setIsRefreshing(false);
    }
  }, []);

  // Periodic polling for VM status (every 4s)
  useEffect(() => {
    fetchVMs();
    const interval = setInterval(() => {
      fetchVMs(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchVMs]);

  const selectedVM = vms.find(v => v.id === selectedVMId) || null;

  // Handlers
  const handleStartVM = async (id: string) => {
    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/vms/${id}/start`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to start VM');
      }
      await fetchVMs(true);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStopVM = async (id: string) => {
    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/vms/${id}/stop`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to stop VM');
      }
      await fetchVMs(true);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRestartVM = async (id: string) => {
    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/vms/${id}/restart`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to restart VM');
      }
      await fetchVMs(true);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteVM = async (id: string) => {
    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/vms/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete VM');
      }
      await fetchVMs(true);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreateVM = async (name: string, ramMb: number, cpuCores: number) => {
    const res = await fetch('/api/vms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ramMb, cpuCores }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create VM');
    }
    const created: AndroidVMInfo = await res.json();
    await fetchVMs(true);
    setSelectedVMId(created.id);
  };

  const handleSendInput = async (input: any) => {
    if (!selectedVM) return;
    const res = await fetch(`/api/vms/${selectedVM.id}/input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return res.json();
  };

  const handleInstallApk = async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('apk', file);
    const res = await fetch(`/api/vms/${id}/install-apk`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  };

  const handlePushFile = async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/vms/${id}/push-file`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        vms={vms}
        selectedVM={selectedVM}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onRefresh={() => fetchVMs()}
        isRefreshing={isRefreshing}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Error notification banner */}
        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white px-2 cursor-pointer font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* VM Fleet List */}
        <VMList
          vms={vms}
          selectedVM={selectedVM}
          onSelectVM={(vm) => setSelectedVMId(vm.id)}
          onStartVM={handleStartVM}
          onStopVM={handleStopVM}
          onRestartVM={handleRestartVM}
          onDeleteVM={handleDeleteVM}
          actionLoadingId={actionLoadingId}
        />

        {/* Live Device Workspace: Screen + Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Real Live Frame Display */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <DeviceScreen
              vm={selectedVM}
              onSendInput={handleSendInput}
              onStartVM={handleStartVM}
            />
          </div>

          {/* Device Hardware & Navigation Controls */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <ControlPanel
              vm={selectedVM}
              onSendInput={handleSendInput}
              onRestartVM={handleRestartVM}
              onStopVM={handleStopVM}
              onInstallApk={handleInstallApk}
              onPushFile={handlePushFile}
            />
          </div>
        </div>

        {/* Detailed Tabs: Apps, Logs, Architecture */}
        <VMDetailTabs vm={selectedVM} />
      </main>

      {/* Create VM Modal */}
      <CreateVMModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateVM}
        currentVmCount={vms.length}
      />
    </div>
  );
}
