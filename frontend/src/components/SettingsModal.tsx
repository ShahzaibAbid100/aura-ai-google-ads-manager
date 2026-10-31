import React, { useEffect, useRef, useState } from 'react';
import { X, Check, ShieldCheck, Brain, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { AutonomyLevel } from '../types';
import { ApiError, backendApi } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  autonomy: AutonomyLevel;
  setAutonomy: (val: AutonomyLevel) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  autonomy,
  setAutonomy
}) => {
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleAccount, setGoogleAccount] = useState<string | null>(null);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const [connectionBusy, setConnectionBusy] = useState(false);
  const oauthPollRef = useRef<number | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [memoryInput, setMemoryInput] = useState('');
  const [memories, setMemories] = useState<string[]>([
    'Brand Voice: High-energy, direct, focused on performance and comfort.',
    'Negative Keywords: "free replica", "knockoff", "cheap wholesale", "used sneakers".',
    'Target ROAS threshold: minimum 380% before scaling daily budget.'
  ]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    backendApi.oauthConnection().then((connection) => {
      if (!active) return;
      setGoogleConnected(connection.connected);
      setGoogleAccount(connection.account_label);
    }).catch((error) => {
      if (active) setConnectionMessage(error instanceof Error ? error.message : 'Connection status unavailable');
    });
    return () => {
      active = false;
      if (oauthPollRef.current !== null) {
        window.clearInterval(oauthPollRef.current);
        oauthPollRef.current = null;
      }
    };
  }, [isOpen]);

  const startGoogleConnect = async () => {
    setConnectionBusy(true);
    setConnectionMessage(null);
    try {
      const { authorization_url } = await backendApi.oauthStart();
      const popup = window.open(authorization_url, 'aura-google-oauth', 'popup,width=560,height=760');
      if (!popup) throw new Error('The browser blocked the OAuth popup. Allow popups and retry.');
      setConnectionMessage('Complete Google OAuth in the opened window. Checking backend connection status…');
      const deadline = Date.now() + 180_000;
      if (oauthPollRef.current !== null) window.clearInterval(oauthPollRef.current);
      const timer = window.setInterval(async () => {
        try {
          const connection = await backendApi.oauthConnection();
          if (connection.connected) {
            window.clearInterval(timer);
            popup.close();
            setGoogleConnected(true);
            setGoogleAccount(connection.account_label);
            setConnectionMessage('Google OAuth connection acknowledged by backend.');
            setConnectionBusy(false);
          } else if (Date.now() > deadline || popup.closed) {
            window.clearInterval(timer);
            setConnectionMessage(Date.now() > deadline ? 'OAuth timed out. Check backend configuration and retry.' : 'OAuth window closed before the backend confirmed a connection.');
            setConnectionBusy(false);
          }
        } catch (error) {
          window.clearInterval(timer);
          setConnectionMessage(error instanceof Error ? error.message : 'Could not verify the OAuth connection.');
          setConnectionBusy(false);
        }
      }, 1500);
      oauthPollRef.current = timer;
    } catch (error) {
      setConnectionMessage(error instanceof ApiError ? error.message : 'Google OAuth is unavailable.');
      setConnectionBusy(false);
    }
  };

  const loadLiveReport = async () => {
    setReportMessage('Requesting read-only Google Ads report…');
    try {
      const report = await backendApi.googleAdsReport('live');
      if (report.simulated || report.source !== 'google_ads_live') {
        throw new Error('Backend did not return verified live Google Ads data.');
      }
      const metrics = report.metrics;
      setReportMessage(`Read-only Google Ads report · ${report.period || 'backend period'} · ${metrics.impressions ?? 0} impressions · ${metrics.clicks ?? 0} clicks · ROAS ${(metrics.roas ?? 0).toFixed(2)}x`);
    } catch (error) {
      setReportMessage(error instanceof Error ? `Live reporting unavailable: ${error.message}` : 'Live reporting unavailable.');
    }
  };

  const disconnectGoogle = async () => {
    setConnectionBusy(true);
    try {
      await backendApi.disconnectGoogleAds();
      const connection = await backendApi.oauthConnection();
      setGoogleConnected(connection.connected);
      setGoogleAccount(connection.account_label);
      setConnectionMessage('Google Ads connection removed.');
    } catch (error) {
      setConnectionMessage(error instanceof Error ? error.message : 'Disconnect failed.');
    } finally {
      setConnectionBusy(false);
    }
  };

  if (!isOpen) return null;

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoryInput.trim()) return;
    setMemories([...memories, memoryInput.trim()]);
    setMemoryInput('');
  };

  const handleRemoveMemory = (idx: number) => {
    setMemories(memories.filter((_, i) => i !== idx));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-xl bg-[#13151f] border border-white/10 rounded-2xl shadow-2xl p-6 text-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <h2 className="text-xl font-bold font-display tracking-tight text-white">Agent Settings & Autonomy</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-6">
          {/* Autonomy Section */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-[#ec268f]" />
              <h3 className="text-sm font-semibold text-white tracking-wide uppercase">Autonomy Level</h3>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  id: 'always_ask',
                  title: 'Always Ask',
                  desc: 'Approve every campaign plan and asset before it runs.'
                },
                {
                  id: 'balanced',
                    title: 'Balanced Mode',
                    desc: 'Recommendations only; backend approval is still required.'
                },
                {
                  id: 'full',
                    title: 'Full Autonomy',
                    desc: 'Unavailable: automatic live Google Ads changes are disabled.'
                }
              ].map((item) => {
                const isSelected = autonomy === item.id;
                return (
                  <button
                    key={item.id}
                    disabled={item.id === 'full'}
                    onClick={() => { if (item.id !== 'full') setAutonomy(item.id as AutonomyLevel); }}
                    className={`w-full text-left disabled:opacity-50 disabled:cursor-not-allowed p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#ec268f]/10 border-[#ec268f]/60 shadow-sm'
                        : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        <span>{item.title}</span>
                        {isSelected && (
                          <span className="text-[10px] font-mono bg-[#ec268f] text-white px-1.5 py-0.5 rounded">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#ec268f] flex items-center justify-center text-white shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Memory Section */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white tracking-wide uppercase">Agent Long-Term Memory</h3>
              </div>
              <span className="text-xs text-slate-400">{memories.length} demo entries</span>
            </div>

            <div className="space-y-2 mb-3 max-h-36 overflow-y-auto pr-1">
              {memories.map((mem, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-black/30 border border-white/5 text-xs text-slate-300"
                >
                  <span className="leading-relaxed">{mem}</span>
                  <button
                    onClick={() => handleRemoveMemory(i)}
                    className="text-slate-500 hover:text-rose-400 p-0.5 transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddMemory} className="flex gap-2">
              <input
                type="text"
                placeholder="Teach Aura new brand fact or constraint..."
                value={memoryInput}
                onChange={(e) => setMemoryInput(e.target.value)}
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-medium"
              >
                Add Memory
              </button>
            </form>
          </div>

          {/* Channels Section */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white tracking-wide uppercase">Connected Channels</h3>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Connect external channels to chat with Aura anywhere — give instructions, approve plans, and receive live results without opening your browser.
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">Google Ads account</h4>
                    <p className="text-[11px] text-slate-400">{googleConnected ? googleAccount || 'Connected' : 'Backend OAuth · credentials required'}</p>
                  </div>
                </div>

                <button
                  disabled={connectionBusy}
                  onClick={() => void (googleConnected ? disconnectGoogle() : startGoogleConnect())}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    googleConnected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {googleConnected ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Disconnect</span>
                    </>
                  ) : (
                    connectionBusy ? 'Connecting…' : 'Connect'
                  )}
                </button>
              </div>
              {connectionMessage && <p role="status" className="text-xs text-slate-300">{connectionMessage}</p>}
              {googleConnected && <button disabled={connectionBusy} onClick={() => void loadLiveReport()} className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white">Request read-only report</button>}
              {reportMessage && <p role="status" className="mt-2 text-xs text-slate-300">{reportMessage}</p>}

              <div className="p-3 rounded-xl bg-black/20 border border-white/5 opacity-70">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-300 font-medium">WhatsApp · Slack · iMessage</div>
                  <span className="text-[10px] font-mono bg-white/10 text-slate-400 px-2 py-0.5 rounded">
                    COMING SOON
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">No Telegram, Slack, or WhatsApp backend integration is configured.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
