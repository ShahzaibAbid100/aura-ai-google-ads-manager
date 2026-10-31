import { useEffect, useState } from 'react';
import { backendApi } from '../services/api';

/** Small diagnostic status only. This does not imply AI inference or Ads publishing is live. */
export function BackendStatus() {
  const [state, setState] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [modelsReachable, setModelsReachable] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const result = await backendApi.health();
        if (!active) return;
        const healthy = result.status === 'healthy' || result.status === 'ok' || result.status === 'running';
        setState(healthy ? 'connected' : 'offline');
        if (healthy) {
          backendApi.models().then(() => active && setModelsReachable(true))
            .catch(() => active && setModelsReachable(false));
        }
      } catch {
        if (active) { setState('offline'); setModelsReachable(false); }
      }
    };
    void check();
    const interval = window.setInterval(() => void check(), 30000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  const connected = state === 'connected';
  return (
    <div
      role="status"
      title={connected
        ? 'FastAPI connection is working; real model inference and Ads publishing remain separately gated'
        : 'FastAPI is unavailable. This UI still contains static demo actions until the campaign API contract is connected.'}
      className="fixed bottom-3 left-3 z-40 rounded-full border border-white/15 bg-[#12141e]/95 px-3 py-1.5 text-[11px] font-semibold text-slate-200 shadow-lg backdrop-blur"
    >
      <span className={connected ? 'text-emerald-400' : state === 'checking' ? 'text-amber-400' : 'text-rose-400'}>●</span>
      {' '}{connected ? 'Backend connected' : state === 'checking' ? 'Checking backend' : 'Backend offline · demo UI'}
      {connected && modelsReachable === false ? ' · models API unavailable' : ''}
    </div>
  );
}
