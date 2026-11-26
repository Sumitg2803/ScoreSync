import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, AlertTriangle, Bell, Clock, RefreshCw } from 'lucide-react';
import { apiRequest } from '../services/api';
import { useGameStore } from '../store/useGameStore';

interface MaintenanceState {
  is_active: boolean;
  message: string;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
}

export const MaintenanceOverlay: React.FC = () => {
  const [maintenance, setMaintenance] = useState<MaintenanceState | null>(null);
  const [globalAlert, setGlobalAlert] = useState<{ id: string; message: string; alert_type: string } | null>(null);

  // Poll maintenance status on mount & periodic
  const checkStatus = async () => {
    try {
      const res = await apiRequest('/maintenance/status');
      setMaintenance(res);
    } catch {
      // non-fatal
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Listen to WebSocket maintenance updates & global alerts
  useEffect(() => {
    const handleMaintenanceEvent = (e: any) => {
      if (e.detail?.type === 'MAINTENANCE_UPDATE' && e.detail?.data) {
        setMaintenance(e.detail.data);
      } else if (e.detail?.type === 'GLOBAL_ANNOUNCEMENT' && e.detail?.data) {
        setGlobalAlert(e.detail.data);
        setTimeout(() => setGlobalAlert(null), 8000);
      }
    };

    window.addEventListener('scoresync-broadcast' as any, handleMaintenanceEvent);
    return () => window.removeEventListener('scoresync-broadcast' as any, handleMaintenanceEvent);
  }, []);

  // Compute if scheduled maintenance is coming up soon (< 30 mins)
  const isUpcoming = (() => {
    if (!maintenance?.scheduled_start || maintenance.is_active) return false;
    const startTime = new Date(maintenance.scheduled_start).getTime();
    const now = Date.now();
    const diffMins = (startTime - now) / 60000;
    return diffMins > 0 && diffMins <= 30;
  })();

  const formattedEnd = maintenance?.scheduled_end
    ? new Date(maintenance.scheduled_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <>
      {/* 1. Global Instant Live Announcement Ticker / Toast */}
      <AnimatePresence>
        {globalAlert && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto pointer-events-auto"
          >
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-3.5 px-4 rounded-2xl shadow-2xl border border-purple-500/40 flex items-center gap-3 backdrop-blur-md">
              <div className="w-8 h-8 rounded-xl bg-purple-500/30 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 text-purple-200 animate-bounce" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 block">
                  Announcement
                </span>
                <p className="text-xs font-bold text-white truncate">{globalAlert.message}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Scheduled Countdown Banner (When maintenance starts in < 30 mins) */}
      {isUpcoming && !maintenance?.is_active && (
        <div className="bg-amber-500 text-slate-950 px-3 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 shadow-sm z-40 sticky top-0">
          <Clock className="w-3.5 h-3.5 animate-spin" />
          <span>Notice: Scheduled maintenance begins shortly. Please finish ongoing games!</span>
        </div>
      )}

      {/* 3. Fullscreen Friendly Maintenance Lockdown Screen */}
      {maintenance?.is_active && (
        <div className="fixed inset-0 z-50 bg-[#0E0620] text-white flex flex-col items-center justify-center p-6 text-center">
          {/* Ambient glow */}
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
              {maintenance.message || 'ScoreSync is temporarily offline for scheduled system upgrades.'}
            </p>

            {formattedEnd && (
              <div className="bg-purple-900/40 border border-purple-500/30 px-4 py-2.5 rounded-2xl mb-6 text-xs text-purple-200 font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                <span>Expected back online around {formattedEnd}</span>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-[#4A10A8] via-[#7016E6] to-[#8625FF] text-white font-bold text-xs shadow-lg shadow-purple-600/30 active:scale-95 transition cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Check Again</span>
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
};
