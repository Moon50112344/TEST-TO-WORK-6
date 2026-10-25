/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AndroidVMInfo } from '../server/vmService';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Expand,
  Loader2,
  Maximize2,
  Minimize2,
  Play,
  Power,
  RotateCw,
  Sliders,
  Wifi,
  WifiOff
} from 'lucide-react';

interface DeviceScreenProps {
  vm: AndroidVMInfo | null;
  onSendInput: (input: {
    type: 'touch' | 'swipe' | 'key' | 'text';
    x?: number;
    y?: number;
    viewWidth?: number;
    viewHeight?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
    durationMs?: number;
    action?: string;
    text?: string;
  }) => Promise<any>;
  onStartVM: (id: string) => Promise<any>;
}

export const DeviceScreen: React.FC<DeviceScreenProps> = ({ vm, onSendInput, onStartVM }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [frameSrc, setFrameSrc] = useState<string>('');
  const [fps, setFps] = useState<number>(0);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [touchFeedback, setTouchFeedback] = useState<{ x: number; y: number; visible: boolean } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Swipe gesture tracking state
  const dragStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Active streaming loop
  useEffect(() => {
    if (!vm || vm.status === 'stopped') {
      setFrameSrc('');
      setFps(0);
      return;
    }

    let isMounted = true;
    let frameCount = 0;
    let lastFpsTime = Date.now();
    let timeoutId: NodeJS.Timeout | null = null;

    const fetchNextFrame = () => {
      if (!isMounted) return;

      const startTime = Date.now();
      const nextImg = new Image();
      const targetUrl = `/api/vms/${vm.id}/screen?t=${Date.now()}`;

      nextImg.onload = () => {
        if (!isMounted) return;
        setFrameSrc(targetUrl);
        setStreamError(null);
        frameCount++;

        const now = Date.now();
        setLatencyMs(now - startTime);

        if (now - lastFpsTime >= 1000) {
          setFps(frameCount);
          frameCount = 0;
          lastFpsTime = now;
        }

        // Schedule next frame rapidly (adaptive ~100ms)
        timeoutId = setTimeout(fetchNextFrame, 120);
      };

      nextImg.onerror = () => {
        if (!isMounted) return;
        // Retry shortly if VM is still starting
        timeoutId = setTimeout(fetchNextFrame, 500);
      };

      nextImg.src = targetUrl;
    };

    fetchNextFrame();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [vm?.id, vm?.status]);

  // Handle pointer interactions (mouse & touch)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    dragStartRef.current = {
      x: clickX,
      y: clickY,
      time: Date.now(),
    };

    // Show temporary visual ripple at touch point
    setTouchFeedback({ x: clickX, y: clickY, visible: true });
    setTimeout(() => {
      setTouchFeedback(prev => (prev ? { ...prev, visible: false } : null));
    }, 450);
  };

  const handlePointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (!imageRef.current || !dragStartRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    const startX = dragStartRef.current.x;
    const startY = dragStartRef.current.y;
    const duration = Math.min(1000, Date.now() - dragStartRef.current.time);
    dragStartRef.current = null;

    const deltaX = Math.abs(endX - startX);
    const deltaY = Math.abs(endY - startY);

    if (deltaX > 25 || deltaY > 25) {
      // Dispatched swipe
      await onSendInput({
        type: 'swipe',
        x1: startX,
        y1: startY,
        x2: endX,
        y2: endY,
        durationMs: duration,
        viewWidth: rect.width,
        viewHeight: rect.height,
      });
    } else {
      // Single tap / click
      await onSendInput({
        type: 'touch',
        x: endX,
        y: endY,
        viewWidth: rect.width,
        viewHeight: rect.height,
      });
    }
  };

  const handleStart = async () => {
    if (!vm) return;
    try {
      setIsStarting(true);
      await onStartVM(vm.id);
    } finally {
      setIsStarting(false);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (!vm) {
    return (
      <div className="flex-1 min-h-[460px] flex flex-col items-center justify-center p-8 text-center bg-[#0d1424] rounded-xl border border-[#1b263b]">
        <div className="w-16 h-16 rounded-2xl bg-[#131d33] border border-[#233152] flex items-center justify-center mb-4 text-[#2f8bff]">
          <Activity className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No Android VM Selected</h3>
        <p className="text-sm text-slate-400 max-w-sm">
          Select an active virtual machine from the fleet list or create a new Android instance to start live streaming.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-[#0d1424] rounded-xl border border-[#1b263b] overflow-hidden shadow-2xl ${
        isFullscreen ? 'p-0 w-full h-full' : ''
      }`}
    >
      {/* Top Stream Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#090e1a] border-b border-[#1b263b] text-xs">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-slate-200">{vm.name}</span>
          <span className="text-slate-500">•</span>
          {vm.status === 'running' ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE STREAM
            </span>
          ) : vm.status === 'booting' ? (
            <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium">
              <Loader2 className="w-3 h-3 animate-spin" />
              {vm.statusMessage || 'BOOTING OS'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-slate-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              STOPPED
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-slate-400">
          {vm.status !== 'stopped' && (
            <>
              <span className="font-mono text-[11px] bg-[#111a2e] px-2 py-0.5 rounded border border-[#1e2a47]">
                {fps} FPS
              </span>
              <span className="font-mono text-[11px] bg-[#111a2e] px-2 py-0.5 rounded border border-[#1e2a47]">
                {latencyMs}ms
              </span>
              <span className="hidden sm:inline font-mono text-[11px] text-slate-500">
                1024×768 Native
              </span>
            </>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-1 hover:text-white rounded hover:bg-[#1a2642] transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Interactive Display Viewport */}
      <div className="relative flex-1 min-h-[460px] bg-black flex items-center justify-center select-none overflow-hidden cursor-crosshair">
        {/* Real Live Frame Image */}
        {frameSrc && vm.status !== 'stopped' ? (
          <div
            className="relative w-full h-full flex items-center justify-center"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
          >
            <img
              ref={imageRef}
              src={frameSrc}
              alt="Live Android Screen"
              className="max-w-full max-h-[580px] w-auto h-auto object-contain pointer-events-auto shadow-2xl"
              draggable={false}
            />

            {/* Visual Touch Ripple */}
            {touchFeedback && touchFeedback.visible && (
              <div
                className="absolute pointer-events-none w-8 h-8 rounded-full border-2 border-[#2f8bff] bg-[#2f8bff]/30 transform -translate-x-1/2 -translate-y-1/2 animate-ping"
                style={{ left: touchFeedback.x, top: touchFeedback.y }}
              />
            )}
          </div>
        ) : null}



        {/* Stopped State Overlay */}
        {vm.status === 'stopped' && (
          <div className="absolute inset-0 bg-[#070b14]/95 flex flex-col items-center justify-center p-6 text-center z-10">
            <div className="w-16 h-16 rounded-2xl bg-[#0d1424] border border-[#1b263b] flex items-center justify-center mb-4 text-slate-500 shadow-inner">
              <Power className="w-8 h-8" />
            </div>
            <h4 className="text-base font-semibold text-white mb-1">Virtual Machine Offline</h4>
            <p className="text-xs text-slate-400 max-w-xs mb-5">
              The virtual machine process is currently terminated to preserve container resources.
            </p>
            <button
              onClick={handleStart}
              disabled={isStarting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2f8bff] hover:bg-[#2575dc] text-white font-medium text-xs shadow-lg shadow-[#2f8bff]/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Powering On...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Power On Android VM</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Stream Hint Footer */}
        <div className="absolute bottom-2 left-2 pointer-events-none bg-black/60 backdrop-blur-xs text-[10px] text-slate-400 px-2 py-0.5 rounded border border-white/5">
          Tap or drag to interact directly with VM
        </div>
      </div>
    </div>
  );
};
