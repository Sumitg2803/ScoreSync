import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, Clock, ArrowLeft, AlertTriangle, Info, X } from 'lucide-react';
import { apiRequest, WS_BASE } from '../services/api';
import { useGameStore, type MaintenanceInfo } from '../store/useGameStore';

export const computeEffectiveMaintenance = (
  raw: MaintenanceInfo | null,
  nowMs: number = Date.now()
): {
  isActive: boolean;
  isUpcoming: boolean;
  startMs: number | null;
  endMs: number | null;
} => {
  if (!raw) {
    return { isActive: false, isUpcoming: false, startMs: null, endMs: null };
  }
  const startMs = raw.scheduled_start ? new Date(raw.scheduled_start).getTime() : null;
  const endMs = raw.scheduled_end ? new Date(raw.scheduled_end).getTime() : null;

  const validStart = startMs !== null && !Number.isNaN(startMs) ? startMs : null;
  const validEnd = endMs !== null && !Number.isNaN(endMs) ? endMs : null;

  let inWindow = false;
  if (validStart !== null && validEnd !== null && validEnd > validStart) {
    inWindow = nowMs >= validStart && nowMs <= validEnd;
  }

  const isActive = Boolean(raw.is_active) || inWindow;
  const isUpcoming = !isActive && validStart !== null && (validEnd === null || validEnd > validStart) && validStart > nowMs;

  return { isActive, isUpcoming, startMs: validStart, endMs: validEnd };
};

export const MaintenanceOverlay: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const maintenance = useGameStore((state) => state.maintenance);
  const setMaintenance = useGameStore((state) => state.setMaintenance);
  const [globalAlert, setGlobalAlert] = useState<{ id: string; message: string; alert_type: string } | null>(null);
  const [roomAdminMsg, setRoomAdminMsg] = useState<{ id: string; host_name: string; message: string } | null>(null);
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const rawMaintenanceRef = useRef<MaintenanceInfo | null>(null);

  const applyServerMaintenance = (raw: MaintenanceInfo) => {
    rawMaintenanceRef.current = raw;
    const { isActive } = computeEffectiveMaintenance(raw, Date.now());
    setMaintenance({
      ...raw,
      is_active: isActive,
    });
  };

  // Poll maintenance status on mount, window focus, & periodic fallback
  const checkStatus = async () => {
    try {
      const res = await apiRequest('/api/maintenance/status');
      applyServerMaintenance(res);
    } catch {
      // non-fatal
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    const onFocus = () => checkStatus();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // 1-second local scheduler check so site auto-locks / unlocks at the exact scheduled second
  useEffect(() => {
    if (!rawMaintenanceRef.current?.scheduled_start && !rawMaintenanceRef.current?.scheduled_end) {
      return;
    }
    const timer = setInterval(() => {
      const now = Date.now();
      setNowMs(now);
      const raw = rawMaintenanceRef.current;
      if (raw) {
        const { isActive } = computeEffectiveMaintenance(raw, now);
        const currentStoreActive = Boolean(useGameStore.getState().maintenance?.is_active);
        if (currentStoreActive !== isActive) {
          setMaintenance({ ...raw, is_active: isActive });
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [maintenance?.scheduled_start, maintenance?.scheduled_end, setMaintenance]);

  // Connect to global /ws/system WebSocket for instant live maintenance & announcement pushes
  useEffect(() => {
    let ws: WebSocket | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isUnmounted = false;

    const connectSystemWs = () => {
      if (isUnmounted) return;
      try {
        ws = new WebSocket(`${WS_BASE}/ws/system`);

        ws.onopen = () => {
          pingTimer = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send('ping');
            }
          }, 20000);
        };

        ws.onmessage = (event) => {
          if (event.data === 'pong') return;
          try {
            const msg = JSON.parse(event.data);
            if (msg.event === 'MAINTENANCE_UPDATE' && msg.meta) {
              applyServerMaintenance(msg.meta);
            } else if (msg.event === 'GLOBAL_ANNOUNCEMENT' && msg.meta) {
              setGlobalAlert(msg.meta);
              setTimeout(() => setGlobalAlert(null), 8000);
            } else if (msg.event === 'ANNOUNCEMENTS_UPDATED') {
              window.dispatchEvent(
                new CustomEvent('scoresync-broadcast', { detail: { type: 'ANNOUNCEMENTS_UPDATED', data: msg.meta } })
              );
            }
          } catch {
            // ignore non-JSON
          }
        };

        ws.onclose = () => {
          if (pingTimer) clearInterval(pingTimer);
          if (!isUnmounted) {
            reconnectTimer = setTimeout(connectSystemWs, 3000);
          }
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        if (!isUnmounted) {
          reconnectTimer = setTimeout(connectSystemWs, 5000);
        }
      }
    };

    connectSystemWs();

    return () => {
      isUnmounted = true;
      if (pingTimer) clearInterval(pingTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  // Also listen to room WebSocket broadcasts if inside an active game
  useEffect(() => {
    const handleMaintenanceEvent = (e: any) => {
      if (e.detail?.type === 'MAINTENANCE_UPDATE' && e.detail?.data) {
        applyServerMaintenance(e.detail.data);
      } else if (e.detail?.type === 'GLOBAL_ANNOUNCEMENT' && e.detail?.data) {
        setGlobalAlert(e.detail.data);
        setTimeout(() => setGlobalAlert(null), 8000);
      } else if (e.detail?.type === 'ROOM_ADMIN_MESSAGE' && e.detail?.data) {
        setRoomAdminMsg(e.detail.data);
        setTimeout(() => setRoomAdminMsg(null), 10000);
      }
    };

    window.addEventListener('scoresync-broadcast' as any, handleMaintenanceEvent);
    return () => window.removeEventListener('scoresync-broadcast' as any, handleMaintenanceEvent);
  }, []);

  const { isActive: effectiveActive, isUpcoming, startMs } = computeEffectiveMaintenance(
    rawMaintenanceRef.current || maintenance,
    nowMs
  );

  const formattedStart = startMs
    ? new Date(startMs).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  const formattedEnd = maintenance?.scheduled_end
    ? new Date(maintenance.scheduled_end).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  const isEntryRoute =
    location.pathname.startsWith('/create') ||
    location.pathname.startsWith('/join');

  return (
    <>
      {/* 1. Global Instant Live Announcement Ticker / Toast */}
      <AnimatePresence>
        {globalAlert && (() => {
          const alertType = (globalAlert.alert_type || 'info').toLowerCase();
          const isWarning = alertType === 'warning';
          const isMaint = alertType === 'maintenance';

          const containerStyle = isMaint
            ? 'bg-gradient-to-r from-red-700 via-rose-700 to-red-600 text-white border-rose-400/50 shadow-red-900/40'
            : isWarning
            ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 text-slate-950 border-yellow-200 shadow-amber-900/30'
            : 'bg-gradient-to-r from-[#4A10A8] via-[#7016E6] to-[#8625FF] text-white border-purple-300/40 shadow-purple-900/40';

          const iconWrapStyle = isMaint
            ? 'bg-white/20 text-white'
            : isWarning
            ? 'bg-slate-950/15 text-slate-950'
            : 'bg-white/20 text-white';

          const badgeStyle = isMaint
            ? 'bg-white/20 text-white border-white/30'
            : isWarning
            ? 'bg-slate-950/15 text-slate-950 border-slate-950/20'
            : 'bg-white/20 text-white border-white/30';

          const labelText = isMaint ? 'Maintenance' : isWarning ? 'Warning' : 'Info';

          return (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto pointer-events-auto"
            >
              <div className={`p-4 rounded-2xl shadow-2xl border flex items-start gap-3 backdrop-blur-md ${containerStyle}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${iconWrapStyle}`}>
                  {isMaint ? (
                    <Wrench className="w-4 h-4 animate-pulse" />
                  ) : isWarning ? (
                    <AlertTriangle className="w-4 h-4 animate-bounce" />
                  ) : (
                    <Info className="w-4 h-4 animate-pulse" />
                  )}
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-black uppercase tracking-wider">
                      Msg From Admin
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${badgeStyle}`}>
                      {labelText}
                    </span>
                  </div>
                  <p className="text-xs font-bold mt-1 leading-relaxed break-words">
                    {globalAlert.message}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setGlobalAlert(null)}
                  className="opacity-70 hover:opacity-100 transition cursor-pointer p-0.5 shrink-0"
                  aria-label="Dismiss announcement"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* 1b. Room-Specific Admin Broadcast Banner */}
      <AnimatePresence>
        {roomAdminMsg && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto pointer-events-auto"
          >
            <div className="bg-gradient-to-r from-[#4A10A8] via-[#7016E6] to-[#8625FF] text-white p-4 rounded-2xl shadow-2xl border border-purple-300/40 flex items-start gap-3 backdrop-blur-md">
              <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-4 h-4 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <span className="text-[11px] font-black tracking-wide block text-purple-100">
                  Message From ADMIN to {roomAdminMsg.host_name}
                </span>
                <p className="text-xs font-bold mt-1 leading-relaxed break-words text-white">
                  {roomAdminMsg.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRoomAdminMsg(null)}
                className="opacity-75 hover:opacity-100 transition cursor-pointer p-0.5 shrink-0"
                aria-label="Dismiss room message"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Scheduled Upcoming Banner on non-home pages */}
      {isUpcoming && !effectiveActive && location.pathname !== '/' && (
        <div className="bg-amber-500 text-slate-950 px-3 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 shadow-sm z-40 sticky top-0">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            Scheduled Maintenance: {formattedStart} {formattedEnd ? `→ ${formattedEnd}` : ''}
          </span>
        </div>
      )}

      {/* 2b. Sticky Maintenance Notice on in-game pages when maintenance is active */}
      {effectiveActive && location.pathname !== '/' && !isEntryRoute && (
        <div className="bg-amber-500 text-slate-950 px-3 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 shadow-sm z-40 sticky top-0">
          <Wrench className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            Site Maintenance Active: {maintenance?.message || 'New games are temporarily disabled.'}
          </span>
        </div>
      )}

      {/* 3. Fullscreen Lockdown if user directly navigates to /create or /join during maintenance */}
      {effectiveActive && isEntryRoute && (
        <div className="fixed inset-0 z-50 bg-[#0E0620] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="absolute w-80 h-80 bg-[#7016E6]/20 rounded-full blur-3xl pointer-events-none" />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-10 max-w-sm flex flex-col items-center"
          >
            <div className="w-20 h-20 rounded-3xl bg-purple-950/80 border border-purple-700/50 flex items-center justify-center shadow-xl mb-6 shadow-purple-600/30">
              <Wrench className="w-9 h-9 text-purple-400 animate-pulse stroke-[2.2]" />
            </div>

            <h1 className="text-2xl font-black text-white mb-2 tracking-tight">
              Under Maintenance
            </h1>

            <p className="text-xs text-slate-300 leading-relaxed mb-6 font-medium">
              {maintenance?.message || 'ScoreSync is temporarily offline for scheduled system upgrades.'}
            </p>

            {formattedEnd && (
              <div className="bg-purple-900/40 border border-purple-500/30 px-4 py-2.5 rounded-2xl mb-6 text-xs text-purple-200 font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                <span>Estimated back online: {formattedEnd}</span>
              </div>
            )}

            <button
              onClick={() => navigate('/', { replace: true })}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#4A10A8] to-[#8625FF] text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer active:scale-95 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
};
