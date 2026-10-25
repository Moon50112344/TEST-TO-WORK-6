/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Circle,
  FileUp,
  Keyboard,
  Loader2,
  PackagePlus,
  Power,
  RefreshCw,
  Send,
  Square,
  Volume2,
  VolumeX
} from 'lucide-react';
import { AndroidVMInfo } from '../server/vmService';

interface ControlPanelProps {
  vm: AndroidVMInfo | null;
  onSendInput: (input: {
    type: 'touch' | 'swipe' | 'key' | 'text';
    action?: string;
    text?: string;
    keyCode?: number | string;
  }) => Promise<any>;
  onRestartVM: (id: string) => Promise<any>;
  onStopVM: (id: string) => Promise<any>;
  onInstallApk: (id: string, file: File) => Promise<{ success: boolean; message: string }>;
  onPushFile: (id: string, file: File) => Promise<{ success: boolean; message: string }>;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  vm,
  onSendInput,
  onRestartVM,
  onStopVM,
  onInstallApk,
  onPushFile,
}) => {
  const [textInput, setTextInput] = useState<string>('');
  const [isSendingKey, setIsSendingKey] = useState<string | null>(null);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const apkInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerKeyAction = async (action: string) => {
    if (!vm || vm.status === 'stopped') return;
    try {
      setIsSendingKey(action);
      await onSendInput({ type: 'key', action });
    } finally {
      setIsSendingKey(null);
    }
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || !vm || vm.status === 'stopped') return;

    try {
      await onSendInput({ type: 'text', text: textInput });
      setTextInput('');
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to send text' });
    }
  };

  const handleApkSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !vm) return;

    try {
      setIsInstalling(true);
      setNotification({ type: 'success', message: `Uploading & installing ${file.name} via ADB...` });
      const res = await onInstallApk(vm.id, file);
      if (res.success) {
        setNotification({ type: 'success', message: `Successfully installed ${file.name}!` });
      } else {
        setNotification({ type: 'error', message: res.message || 'Installation failed' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to install APK' });
    } finally {
      setIsInstalling(false);
      if (apkInputRef.current) apkInputRef.current.value = '';
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !vm) return;

    try {
      setIsPushing(true);
      setNotification({ type: 'success', message: `Pushing ${file.name} to /sdcard/Download/...` });
      const res = await onPushFile(vm.id, file);
      setNotification({ type: res.success ? 'success' : 'error', message: res.message });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to push file' });
    } finally {
      setIsPushing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isEnabled = vm !== null && vm.status !== 'stopped';

  return (
    <div className="flex flex-col gap-3 p-4 bg-[#0d1424] rounded-xl border border-[#1b263b] shadow-xl">
      {/* Primary Android Navigation Bar (Back, Home, Recent Apps) */}
      <div>
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Navigation Bar
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => triggerKeyAction('back')}
            disabled={!isEnabled}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-[#121c33] hover:bg-[#1a284a] text-slate-200 hover:text-white border border-[#233355] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group"
            title="Back Button (KEYCODE_BACK / ESC)"
            aria-label="Back button"
          >
            <ArrowLeft className="w-4 h-4 text-[#2f8bff] group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-xs font-medium">Back</span>
          </button>

          <button
            onClick={() => triggerKeyAction('home')}
            disabled={!isEnabled}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-[#121c33] hover:bg-[#1a284a] text-slate-200 hover:text-white border border-[#233355] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group"
            title="Home Button (KEYCODE_HOME)"
            aria-label="Home button"
          >
            <Circle className="w-4 h-4 text-[#2f8bff] group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium">Home</span>
          </button>

          <button
            onClick={() => triggerKeyAction('recent')}
            disabled={!isEnabled}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-[#121c33] hover:bg-[#1a284a] text-slate-200 hover:text-white border border-[#233355] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group"
            title="Recent Apps (KEYCODE_APP_SWITCH)"
            aria-label="Recent apps"
          >
            <Square className="w-3.5 h-3.5 text-[#2f8bff] group-hover:rotate-6 transition-transform" />
            <span className="text-xs font-medium">Recents</span>
          </button>
        </div>
      </div>

      {/* Hardware Actions (Power, Restart, Volume Up, Volume Down) */}
      <div>
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Hardware Buttons
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => triggerKeyAction('power')}
            disabled={!isEnabled}
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-[#121c33] hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 border border-[#233355] hover:border-rose-900/50 transition-all cursor-pointer disabled:opacity-40"
            title="Power key toggle screen"
          >
            <Power className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-xs">Power</span>
          </button>

          <button
            onClick={() => vm && onRestartVM(vm.id)}
            disabled={!isEnabled}
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-[#121c33] hover:bg-amber-950/40 text-slate-300 hover:text-amber-400 border border-[#233355] hover:border-amber-900/50 transition-all cursor-pointer disabled:opacity-40"
            title="Reboot Android VM process"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs">Restart</span>
          </button>

          <button
            onClick={() => triggerKeyAction('volume_up')}
            disabled={!isEnabled}
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-[#121c33] hover:bg-[#1a284a] text-slate-300 hover:text-white border border-[#233355] transition-all cursor-pointer disabled:opacity-40"
            title="Volume Up (KEYCODE_VOLUME_UP)"
          >
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs">Vol +</span>
          </button>

          <button
            onClick={() => triggerKeyAction('volume_down')}
            disabled={!isEnabled}
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-[#121c33] hover:bg-[#1a284a] text-slate-300 hover:text-white border border-[#233355] transition-all cursor-pointer disabled:opacity-40"
            title="Volume Down (KEYCODE_VOLUME_DOWN)"
          >
            <VolumeX className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs">Vol -</span>
          </button>
        </div>
      </div>

      {/* Keyboard Input Stream */}
      <div>
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5 text-[#2f8bff]" />
            Direct Keyboard Input
          </span>
          <span className="text-[10px] text-slate-500 font-normal">ADB Text Injection</span>
        </div>
        <form onSubmit={handleSendText} className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={isEnabled ? "Type text or URL to inject..." : "Device offline"}
            disabled={!isEnabled}
            className="flex-1 bg-[#070b14] border border-[#1e2a47] rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#2f8bff] focus:ring-1 focus:ring-[#2f8bff] disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={!isEnabled || !textInput.trim()}
            className="px-3 py-1.5 rounded-lg bg-[#2f8bff] hover:bg-[#2575dc] text-white text-xs font-medium flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>

      {/* APK & File Upload Actions */}
      <div>
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Package & Storage Management
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* APK Installer */}
          <input
            ref={apkInputRef}
            type="file"
            accept=".apk"
            className="hidden"
            onChange={handleApkSelected}
          />
          <button
            onClick={() => apkInputRef.current?.click()}
            disabled={!isEnabled || isInstalling}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-[#10192e] hover:bg-[#16223e] border border-[#213052] text-slate-200 hover:text-white transition-all cursor-pointer disabled:opacity-40 group"
          >
            {isInstalling ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#2f8bff]" />
            ) : (
              <PackagePlus className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            )}
            <div className="text-left">
              <div className="text-xs font-medium">Install APK</div>
              <div className="text-[10px] text-slate-400">Deploy Android package</div>
            </div>
          </button>

          {/* File Push */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelected}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!isEnabled || isPushing}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-[#10192e] hover:bg-[#16223e] border border-[#213052] text-slate-200 hover:text-white transition-all cursor-pointer disabled:opacity-40 group"
          >
            {isPushing ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#2f8bff]" />
            ) : (
              <FileUp className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            )}
            <div className="text-left">
              <div className="text-xs font-medium">Push File</div>
              <div className="text-[10px] text-slate-400">To /sdcard/Download/</div>
            </div>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-2.5 rounded-lg text-xs flex items-center justify-between border ${
            notification.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white text-xs px-1"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};
