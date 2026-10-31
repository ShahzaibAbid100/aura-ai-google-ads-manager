import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Send, 
  Mic, 
  AudioWaveform, 
  Settings, 
  ChevronDown, 
  ChevronRight, 
  Check, 
  Copy, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  Play, 
  Image as ImageIcon, 
  FileText, 
  SlidersHorizontal, 
  Download, 
  PanelLeftClose, 
  PanelLeftOpen, 
  PanelRightClose, 
  PanelRightOpen,
  MapPin,
  Search,
  Youtube,
  Mail,
  Smartphone,
  Monitor,
  ShoppingBag,
  Film,
  ArrowLeft,
  Zap
} from 'lucide-react';
import { ChatSession, ChatMessage, AdCampaignDraft, PreviewTab, AutonomyLevel } from '../types';
import { ApiError, backendApi, ModelStatusResponse, pollJob } from '../services/api';

interface StudioWorkspaceProps {
  sessions: ChatSession[];
  activeSessionId: string;
  setActiveSessionId: (id: string) => void;
  onNewChat: () => void;
  credits: number;
  onOpenCredits: (suggestedTier?: number) => void;
  onOpenSettings: () => void;
  onOpenVoice: () => void;
  onReturnHome: () => void;
  autonomy: AutonomyLevel;
  onChatMessage: (sessionId: string, text: string, draft?: AdCampaignDraft) => Promise<unknown>;
  onApproveCampaign: (campaignId: string) => Promise<AdCampaignDraft>;
  onSaveCampaign: (draft: AdCampaignDraft) => Promise<AdCampaignDraft>;
  onRefreshCampaign: (campaignId: string) => Promise<AdCampaignDraft>;
}

export const StudioWorkspace: React.FC<StudioWorkspaceProps> = ({
  sessions,
  activeSessionId,
  setActiveSessionId,
  onNewChat,
  credits,
  onOpenCredits,
  onOpenSettings,
  onOpenVoice,
  onReturnHome,
  autonomy,
  onChatMessage,
  onApproveCampaign,
  onSaveCampaign,
  onRefreshCampaign
}) => {
  const currentSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  
  // Layout toggles
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [cloudBannerDismissed, setCloudBannerDismissed] = useState(false);
  
  // Right panel active tab
  const [rightPanelTab, setRightPanelTab] = useState<'assets' | 'editor'>('editor');
  const [previewChannel, setPreviewChannel] = useState<PreviewTab>('search');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');

  // Chat message & AI interaction
  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [mediaMessage, setMediaMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);
  const [selectedModel, setSelectedModel] = useState('Backend-configured provider');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  // Active Draft for Live Editing
  const [campaignDraft, setCampaignDraft] = useState<AdCampaignDraft>(currentSession?.activeDraft || {
    id: '', campaignName: 'No campaign selected', goal: '', targetRoas: 0, dailyBudget: 0,
    businessName: '', finalUrl: '', headlines: [], descriptions: [], status: 'draft_paused', channels: [],
  });
  const campaignApproved = campaignDraft.status === 'approved' || campaignDraft.status === 'ready_to_publish';

  useEffect(() => {
    if (currentSession?.activeDraft) setCampaignDraft(currentSession.activeDraft);
  }, [currentSession?.id, currentSession?.activeDraft]);

  useEffect(() => {
    let active = true;
    backendApi.models().then((status) => active && setModelStatus(status)).catch(() => active && setModelStatus(null));
    return () => { active = false; };
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages, isGenerating]);

  // Handle Sending Message
  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputPrompt;
    if (!query.trim() || isGenerating || !currentSession) return;
    setInputPrompt('');
    setIsGenerating(true);
    setActionError(null);
    try {
      await onChatMessage(currentSession.id, query.trim(), campaignDraft.id ? campaignDraft : undefined);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Backend chat request failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveCampaign = async (campaignId?: string) => {
    const id = campaignId || campaignDraft.id;
    if (!id || isApproving) return;
    setActionError(null);
    setIsApproving(true);
    try {
      const saved = await onApproveCampaign(id);
      setCampaignDraft(saved);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Backend approval request failed.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleSaveCampaign = async () => {
    if (!campaignDraft.id || isSaving) return;
    setActionError(null);
    setIsSaving(true);
    try {
      setCampaignDraft(await onSaveCampaign(campaignDraft));
      setMediaMessage('Campaign changes saved to the backend. Any previous approval is invalidated when protected fields change.');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Campaign save failed.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!campaignDraft.id) return;
    setActionError(null);
    setMediaMessage('Submitting image generation request...');
    try {
      const result = await backendApi.generateImage({ prompt: `Advertising creative for ${campaignDraft.businessName}`, brand_name: campaignDraft.businessName, aspect_ratio: '1:1', campaign_id: campaignDraft.id });
      await onRefreshCampaign(campaignDraft.id);
      setMediaMessage(result.simulated
        ? 'Mock image asset metadata saved. No actual AI image was generated.'
        : `${result.provider} image generated and saved to campaign.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Image generation is unavailable.');
      setMediaMessage(null);
    }
  };

  const handleGenerateVideo = async () => {
    if (!campaignDraft.id) return;
    setActionError(null);
    setMediaMessage('Submitting video job...');
    try {
      const submitted = await backendApi.generateVideo({ prompt: `Short promotional product video for ${campaignDraft.businessName}`, duration_seconds: 4, aspect_ratio: '9:16', campaign_id: campaignDraft.id });
      const final = submitted.status === 'queued' || submitted.status === 'running' ? await pollJob(submitted.job_id) : null;
      await onRefreshCampaign(campaignDraft.id);
      setMediaMessage(final?.status === 'failed' ? `Video job failed: ${final.error}` : `${submitted.result?.provider || 'mock'} video job ${final?.status || submitted.status}${submitted.simulated ? ' (simulated metadata; no MP4 was generated)' : ''}.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Video generation is unavailable.');
      setMediaMessage(null);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0c0e16] text-[#eef1f8]">
      {/* COLUMN 1: LEFT SIDEBAR (Recent Chats & Sessions) */}
      <aside
        className={`${
          isSidebarOpen ? 'w-64 sm:w-72' : 'w-0'
        } shrink-0 bg-[#0f111a] flex flex-col justify-between transition-all duration-200 overflow-hidden z-20`}
      >
        <div className="p-4 flex flex-col h-full">
          {/* Top Sidebar Header */}
          <div className="flex items-center justify-between pb-3">
            <button
              onClick={onReturnHome}
              className="flex items-center gap-2 group text-slate-300 hover:text-white transition-colors"
              title="Return to Home Overview"
            >
              <ArrowLeft className="w-4 h-4 text-[#ec268f] group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-bold">Overview</span>
            </button>

            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={onNewChat}
            className="w-full py-2.5 px-3.5 rounded-xl border border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm mt-1"
          >
            <Plus className="w-4 h-4 text-[#ec268f] stroke-[2.5]" />
            <span>New chat</span>
          </button>

          {/* Recent Chats Section */}
          <div className="mt-6 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between px-1 mb-2 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
              <span>Recent</span>
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            </div>

            <div className="space-y-1.5">
              {sessions.map((s) => {
                const isSelected = s.id === currentSession.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSessionId(s.id)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/10 border border-[#ec268f]/50 text-white shadow-sm'
                        : 'bg-white/[0.02] hover:bg-white/[0.05] border border-transparent text-slate-300'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg overflow-hidden border border-white/20 shrink-0">
                      <img
                        src="/assets/images/aura_avatar_square_1792474096942.jpg"
                        alt="Aura"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate text-white">
                        {s.title}
                      </div>
                      <div className="text-[10px] text-pink-400 font-mono mt-0.5">
                        {s.agentName} · {s.lastActive}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar Bottom: Credits Indicator */}
          <div className="pt-4 mt-2">
            <div
              onClick={() => onOpenCredits()}
              className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-[#ec268f] fill-current" /> Credits
                </span>
                <span className="font-bold text-white tabular-nums font-mono">{credits} demo</span>
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, (credits / 300) * 100)}%` }}
                  className="bg-gradient-to-r from-[#a82bf0] to-[#ec268f] h-full rounded-full"
                />
              </div>
              <div className="mt-2 text-[10px] text-[#ec268f] font-semibold flex items-center justify-between">
                <span>Demo plans · billing unavailable</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* COLUMN 2: CENTER CHAT & CAMPAIGN CANVAS */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-[#0c0e16] relative">
        {/* Workspace Top Header Bar */}
        <header className="h-14 px-4 sm:px-6 flex items-center justify-between bg-[#0e101a]/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
                title="Open sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onReturnHome}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-pink-500/50 shadow-md">
                <img
                  src="/assets/images/aura_avatar_square_1792474096942.jpg"
                  alt="Aura"
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <div className="relative">
                  <button
                    onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                    className="flex items-center gap-1.5 text-sm font-bold text-white hover:text-pink-300 transition-colors"
                  >
                    <span>{currentSession.title}</span>
                    <span className="text-xs font-normal text-slate-400 font-mono">({selectedModel})</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {/* Model Dropdown */}
                  {isModelDropdownOpen && (
                    <div className="absolute top-7 left-0 w-52 bg-[#141622] border border-white/10 rounded-xl shadow-2xl p-1.5 z-30 text-xs">
                      {(modelStatus?.models || []).map((model) => {
                        const active = model.key === 'qwen' ? modelStatus?.providers.llm === 'local'
                          : model.key === 'sd_turbo' ? modelStatus?.providers.image === 'local'
                          : model.key === 'smolvlm' ? modelStatus?.providers.vision === 'local'
                          : model.key === 'ltx_video' ? modelStatus?.providers.video === 'local'
                          : model.key.startsWith('ocr_') ? modelStatus?.providers.ocr === 'local' : false;
                        const name = `${model.key} · ${model.readiness.replaceAll('_', ' ')}`;
                        const desc = active
                          ? model.inference_tested ? 'Successful inference test recorded' : model.runtime_ready ? 'Runtime installed; inference not verified' : `Missing: ${model.missing_dependencies.join(', ')}`
                          : 'Weights/status only; not selected as active provider';
                        return (
                        <button
                          key={model.key}
                          onClick={() => {
                            setSelectedModel(name);
                            setIsModelDropdownOpen(false);
                          }}
                          className={`w-full text-left p-2 rounded-lg transition-all ${
                            selectedModel === name
                              ? 'bg-[#ec268f]/20 text-white font-semibold'
                              : 'text-slate-300 hover:bg-white/5'
                          }`}
                        >
                          <div className="font-medium">{name}</div>
                          <div className="text-[10px] text-slate-400">{desc}</div>
                        </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${modelStatus ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span>{modelStatus ? `${modelStatus.providers.llm} provider · Ads writes disabled` : 'Backend status unavailable · Ads writes disabled'}</span>
                  <span>·</span>
                  <span className="capitalize">{autonomy.replace('_', ' ')} Autonomy</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSettings}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              title="Agent settings & memory"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              title={isRightPanelOpen ? 'Collapse inspector panel' : 'Open inspector panel'}
            >
              {isRightPanelOpen ? (
                <PanelRightClose className="w-4 h-4" />
              ) : (
                <PanelRightOpen className="w-4 h-4" />
              )}
            </button>
          </div>
        </header>

        {/* Cloud Persistence Banner */}
        {!cloudBannerDismissed && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-2xl bg-gradient-to-r from-purple-950/40 via-pink-950/30 to-[#12141f] border border-pink-500/20 flex items-center justify-between text-xs text-slate-300 shadow-sm shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="p-1 rounded-lg bg-pink-500/20 text-[#ec268f]">
                <Sparkles className="w-4 h-4" />
              </span>
              <span>
                <strong>Local backend workspace</strong> — requests run when submitted. Campaign publishing to Google Ads is disabled.
              </span>
            </div>
            <button
              onClick={() => setCloudBannerDismissed(true)}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-colors shrink-0 flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Got it</span>
            </button>
          </div>
        )}

        {/* Scrollable Message History Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
          <div className="text-center">
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500 bg-white/[0.03] px-3 py-1 rounded-full">
              Session · Backend-generated results only
            </span>
          </div>

          {currentSession.messages.map((msg) => {
            const isAura = msg.sender === 'aura';
            return (
              <div
                key={msg.id}
                className={`flex gap-3.5 max-w-3xl ${isAura ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              >
                {isAura ? (
                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-pink-500/40 shadow-md shrink-0">
                    <img
                      src="/assets/images/aura_avatar_square_1792474096942.jpg"
                      alt="Aura"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    You
                  </div>
                )}

                <div className={`space-y-3 flex-1 ${!isAura && 'text-right'}`}>
                  <div
                    className={`inline-block p-4 sm:p-5 rounded-2xl text-sm sm:text-base leading-relaxed ${
                      isAura
                        ? 'bg-[#141624] text-slate-200 text-left shadow-md'
                        : 'bg-[#ec268f] text-white text-left font-medium shadow-lg'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>

                  {/* Credit balances and billing are demonstrations only; no paid gate applies. */}
                  {/* Interactive Campaign Blueprint Card (With Larger Number Sizes) */}
                  {msg.campaignDraft && (
                    <div className="p-5 rounded-2xl bg-[#121524] border border-pink-500/30 text-left shadow-xl space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
                        <div>
                          <div className="text-[11px] font-bold text-[#ec268f] uppercase tracking-wider">
                            Campaign Architecture Blueprint
                          </div>
                          <h4 className="text-base font-bold text-white mt-0.5">
                            {msg.campaignDraft.campaignName}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-lg border border-emerald-500/30 font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            Provider: <strong className="text-sm font-mono">{msg.campaignDraft.provider || 'not reported'}</strong>{msg.campaignDraft.simulated ? ' · Simulated' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Generated Creative Assets Visual Showcase in Chat */}
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-300 font-semibold mb-2">
                          <span className="flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                            Static design previews · not generated assets
                          </span>
                          <span className="text-[11px] text-[#ec268f]">Preview only</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="rounded-xl overflow-hidden aspect-[16/9] bg-black/50 border border-white/10 group relative">
                            <img
                              src="/assets/images/ad_search_mobile_1792474059750.jpg"
                              alt="Search ad asset"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute bottom-1 left-1 text-[9px] bg-black/80 px-1 rounded text-white font-mono">1.91:1</div>
                          </div>
                          <div className="rounded-xl overflow-hidden aspect-[16/9] bg-black/50 border border-white/10 group relative">
                            <img
                              src="/assets/images/ad_youtube_screen_1792474060627.jpg"
                              alt="YouTube asset"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute bottom-1 left-1 text-[9px] bg-black/80 px-1 rounded text-white font-mono">16:9 Video</div>
                          </div>
                          <div className="rounded-xl overflow-hidden aspect-[16/9] bg-black/50 border border-white/10 group relative">
                            <img
                              src="/assets/images/ad_shopping_showcase_1792475114334.jpg"
                              alt="Shopping asset"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute bottom-1 left-1 text-[9px] bg-black/80 px-1 rounded text-white font-mono">1:1 Shelf</div>
                          </div>
                          <div className="rounded-xl overflow-hidden aspect-[16/9] bg-black/50 border border-white/10 group relative">
                            <img
                              src="/assets/images/ad_shorts_vertical_1792475115634.jpg"
                              alt="Shorts asset"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute bottom-1 left-1 text-[9px] bg-black/80 px-1 rounded text-white font-mono">9:16 Story</div>
                          </div>
                        </div>
                      </div>

                      {/* Numbers with Bigger Font Size */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                        <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                          <span className="text-slate-400 text-[11px] font-medium">Target ROAS</span>
                          <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-[#ec268f] font-mono mt-0.5">
                            {msg.campaignDraft.targetRoas}%
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                          <span className="text-slate-400 text-[11px] font-medium">Daily Budget</span>
                          <div className="text-2xl font-black text-white font-mono mt-0.5">
                            ${msg.campaignDraft.dailyBudget}
                            <span className="text-xs text-slate-400 font-normal">/day</span>
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                          <span className="text-slate-400 text-[11px] font-medium">Channels</span>
                          <div className="text-2xl font-black text-purple-300 font-mono mt-0.5">{msg.campaignDraft.channels.length}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                          <span className="text-slate-400 text-[11px] font-medium">Approval State</span>
                          <div className="text-sm font-bold text-amber-300 mt-2">
                            {msg.campaignDraft.status}
                          </div>
                        </div>
                      </div>

                      {/* Headlines preview */}
                      <div className="space-y-1.5 text-xs">
                        <div className="font-semibold text-slate-300 flex items-center justify-between">
                          <span>Saved campaign headlines ({msg.campaignDraft.headlines.length})</span>
                          <span className="text-slate-500 text-[10px]">Not a Google Ads approval score</span>
                        </div>
                        {msg.campaignDraft.headlines.map((hl, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-white/5 text-slate-300"
                          >
                            <span className="truncate">{hl}</span>
                            <button
                              onClick={() => copyToClipboard(hl, idx)}
                              className="text-slate-500 hover:text-white p-1"
                              title="Copy headline"
                            >
                              {copiedIndex === idx ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Launch & Edit Action Bar */}
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs text-slate-400">
                          {campaignApproved
                            ? '✓ Approved by backend · publishing remains disabled'
                            : `Backend status: ${msg.campaignDraft.status} · no Google Ads writes enabled.`}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setRightPanelTab('editor');
                              setIsRightPanelOpen(true);
                            }}
                            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
                          >
                            Edit in Live Studio
                          </button>

                          <button
                            disabled={campaignApproved || isApproving || !msg.campaignDraft.id}
                            onClick={() => void handleApproveCampaign(msg.campaignDraft!.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center gap-1.5 ${
                              campaignApproved
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'btn-competitor-gradient shadow-md'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{isApproving ? 'Validating…' : campaignApproved ? 'Approved' : 'Validate & Approve'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Suggested Action Chips */}
                  {msg.suggestedActions && (
                    <div className="space-y-2 pt-1 text-left">
                      <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                        TRY ⌄
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {msg.suggestedActions.map((act, i) => (
                          <button
                            key={i}
                            onClick={() => handleSendMessage(act)}
                            className="px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-pink-500/20 border border-white/10 hover:border-pink-500/40 text-xs text-slate-300 hover:text-white transition-all text-left flex items-center gap-1.5"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ec268f]" />
                            <span>{act}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isGenerating && (
            <div className="flex gap-3.5 max-w-md mr-auto">
              <div className="w-9 h-9 rounded-xl overflow-hidden border border-pink-500/40 shadow-md shrink-0">
                <img
                  src="/assets/images/aura_avatar_square_1792474096942.jpg"
                  alt="Aura"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 rounded-2xl bg-[#141624] border border-white/10 text-xs text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#ec268f] animate-ping" />
                <span>Sending request to the configured backend workflow…</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Fixed Interactive Chat Input Bar */}
        <div className="p-4 sm:p-6 bg-gradient-to-t from-[#090a10] via-[#0d0f17] to-transparent shrink-0">
          <div className="max-w-3xl mx-auto rounded-2xl bg-[#131522] border border-white/15 p-3 shadow-2xl focus-within:border-pink-500/50 transition-all">
            <textarea
              rows={2}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Tell Aura what you need... (e.g. 'Draft a Google Search & YouTube ad for my summer launch with $100/day')"
              className="w-full bg-transparent text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
            />

            <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setInputPrompt('Create a campaign recommendation. Include business name, website, objective and daily budget.')}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                  title="Attach Landing Page URL or Brand Assets"
                >
                  <Plus className="w-4 h-4" />
                </button>

                <span className="text-xs text-slate-400 px-2 py-1 rounded-lg bg-white/5 font-medium hidden sm:inline">
                  Backend workflows · Publishing disabled
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenVoice}
                  className="p-2 text-slate-400 hover:text-pink-300 rounded-xl hover:bg-white/5 transition-colors"
                  title="Voice dictation"
                >
                  <Mic className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={onOpenVoice}
                  className="p-2 text-slate-400 hover:text-cyan-300 rounded-xl hover:bg-white/5 transition-colors"
                  title="Voice feature is a nonfunctional demo"
                >
                  <AudioWaveform className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  disabled={!inputPrompt.trim() || isGenerating}
                  onClick={() => handleSendMessage()}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    inputPrompt.trim() && !isGenerating
                      ? 'btn-competitor-gradient shadow-md'
                      : 'bg-white/10 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 px-1">
              <span>Enter to send · Shift + Enter for newline</span>
              <span>{modelStatus?.providers.llm === 'local' ? 'Local provider selected · check model readiness' : 'Mock/default provider · results labeled'}</span>
            </div>
            {actionError && <div role="alert" className="px-1 pt-2 text-xs text-rose-300">{actionError}</div>}
          </div>
        </div>
      </main>

      {/* COLUMN 3: RIGHT PANEL (Assets & Live Ad Preview / Editor) */}
      <aside
        className={`${
          isRightPanelOpen ? 'w-80 sm:w-96' : 'w-0'
        } shrink-0 bg-[#0f111a] flex flex-col justify-between transition-all duration-200 overflow-hidden z-20`}
      >
        <div className="flex flex-col h-full">
          {/* Top Panel Tab Switcher */}
          <div className="h-14 px-4 flex items-center justify-between shrink-0 bg-[#0e101a]">
            <div className="flex items-center gap-2 p-1 bg-white/[0.04] rounded-xl border border-white/5">
              <button
                onClick={() => setRightPanelTab('assets')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  rightPanelTab === 'assets'
                    ? 'bg-[#ec268f] text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Assets ({currentSession.assets.length})</span>
              </button>

              <button
                onClick={() => setRightPanelTab('editor')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  rightPanelTab === 'editor'
                    ? 'bg-[#ec268f] text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Ad Studio & Editor</span>
              </button>
            </div>

            <button
              onClick={() => setIsRightPanelOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          </div>

          {/* TAB 1: ASSETS REPOSITORY */}
          {rightPanelTab === 'assets' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Saved campaign assets</span>
                <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded">Backend records</span>
              </div>

              {currentSession.assets.map((asset) => (
                <div
                  key={asset.id}
                  className="group rounded-2xl bg-[#141624] border border-white/10 overflow-hidden shadow-md hover:border-pink-500/40 transition-all"
                >
                  <div className="relative aspect-[16/9] bg-black/40 overflow-hidden">
                    {asset.type === 'video' && asset.simulated ? (
                      <div className="w-full h-full flex items-center justify-center text-xs text-amber-200 text-center px-4">
                        Simulated video metadata only · no MP4 generated
                      </div>
                    ) : asset.type === 'image' ? (
                      <img src={asset.url} alt={asset.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <video src={asset.url} controls className="w-full h-full object-contain" />
                    )}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-md text-[10px] font-mono text-white">
                      {asset.format}
                    </div>
                    {asset.type === 'video' && !asset.simulated && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-lg">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <h4 className="text-xs font-bold text-white truncate">{asset.title}{asset.simulated ? ' · SIMULATED' : ''}</h4>
                    <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                      <span>{asset.simulated ? 'Mock asset · not verified' : (asset.dimensions || asset.duration || 'Saved asset')}</span>
                      <button
                        onClick={() => window.open(asset.url, '_blank')}
                        className="text-[#ec268f] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{asset.type === 'video' && asset.simulated ? 'View metadata' : 'View asset'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                disabled={!campaignDraft.id || isGenerating}
                onClick={() => void handleGenerateImage()}
                className="w-full py-2.5 rounded-xl border border-dashed border-white/20 hover:border-pink-500/50 hover:bg-pink-500/5 text-xs text-slate-300 font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4 text-[#ec268f]" />
                <span>Generate image asset</span>
              </button>
              <button disabled={!campaignDraft.id || isGenerating} onClick={() => void handleGenerateVideo()} className="w-full py-2.5 rounded-xl border border-dashed border-white/20 hover:border-cyan-500/50 hover:bg-cyan-500/5 text-xs text-slate-300 font-semibold flex items-center justify-center gap-1.5 transition-colors">
                <Film className="w-4 h-4 text-cyan-300" />
                <span>Request video job</span>
              </button>
              {mediaMessage && <p role="status" className="text-xs text-slate-300">{mediaMessage}</p>}
            </div>
          )}

          {/* TAB 2: LIVE AD PREVIEW & MULTI-CHANNEL EDITOR */}
          {rightPanelTab === 'editor' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Channel Selector with 6 Channels */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Preview Placement Channel
                </label>
                <div className="grid grid-cols-6 gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/5">
                  {[
                    { id: 'search', label: 'Search', icon: Search },
                    { id: 'shopping', label: 'Shop', icon: ShoppingBag },
                    { id: 'youtube', label: 'Video', icon: Youtube },
                    { id: 'shorts', label: 'Shorts', icon: Film },
                    { id: 'gmail', label: 'Gmail', icon: Mail },
                    { id: 'maps', label: 'Maps', icon: MapPin }
                  ].map((ch) => {
                    const Icon = ch.icon;
                    const isSelected = previewChannel === ch.id;
                    return (
                      <button
                        key={ch.id}
                        onClick={() => setPreviewChannel(ch.id as PreviewTab)}
                        className={`p-1.5 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-pink-500 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-[9px]">{ch.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* LIVE AD SIMULATION CANVAS */}
              <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-3.5">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10 text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Static ad preview · not a live Google placement
                  </span>
                  <div className="flex items-center gap-1 text-slate-400">
                    <button
                      onClick={() => setPreviewDevice('mobile')}
                      className={`p-1 rounded ${previewDevice === 'mobile' ? 'text-pink-400 bg-white/10' : ''}`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setPreviewDevice('desktop')}
                      className={`p-1 rounded ${previewDevice === 'desktop' ? 'text-pink-400 bg-white/10' : ''}`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 1. Google Search SERP Preview */}
                {previewChannel === 'search' && (
                  <div className="p-3.5 rounded-xl bg-[#202124] text-left text-xs font-sans border border-[#3c4043] space-y-1.5 shadow-inner">
                    <div className="flex items-center gap-2 text-[11px] text-[#bdc1c6]">
                      <span className="font-bold text-white bg-[#303134] px-1.5 py-0.5 rounded text-[10px]">
                        Sponsored
                      </span>
                      <span className="truncate">{campaignDraft.finalUrl}</span>
                    </div>

                    <h5 className="text-sm font-medium text-[#8ab4f8] hover:underline cursor-pointer leading-snug">
                      {campaignDraft.headlines[0] || 'Add headline'} | {campaignDraft.headlines[1] || 'Add another headline'}
                    </h5>

                    <p className="text-[11px] text-[#bdc1c6] leading-relaxed">
                      {campaignDraft.descriptions[0]}
                    </p>

                    <div className="pt-2 grid grid-cols-2 gap-2 text-[10px] text-[#8ab4f8]">
                      <div className="p-1 rounded bg-[#303134]/50 border border-white/5 truncate">
                        Offer placeholder (unverified)
                      </div>
                      <div className="p-1 rounded bg-[#303134]/50 border border-white/5 truncate">
                        Add a verified offer here
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Google Shopping Card Preview */}
                {previewChannel === 'shopping' && (
                  <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-black border border-white/10 shadow-lg">
                    <img
                      src="/assets/images/ad_shopping_showcase_1792475114334.jpg"
                      alt="Google Shopping preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex flex-col justify-end p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">Google Shopping Shelf</div>
                          <div className="text-[11px] text-amber-300 font-mono font-bold">Example product only · no price verified</div>
                        </div>
                        <button className="btn-competitor-gradient px-3 py-1 rounded-lg text-[10px] font-bold">
                          Buy Now
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. YouTube Ad Preview */}
                {previewChannel === 'youtube' && (
                  <div className="relative rounded-xl overflow-hidden aspect-[16/9] bg-black border border-white/10 shadow-lg">
                    <img
                      src="/assets/images/ad_youtube_screen_1792474060627.jpg"
                      alt="YouTube in stream"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-between p-3">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="bg-amber-400 text-black font-extrabold px-1.5 py-0.5 rounded">
                          Ad · 0:15
                        </span>
                        <span className="bg-black/60 px-2 py-1 rounded text-white font-mono">
                          Skip in 5s
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white drop-shadow">
                            {campaignDraft.businessName}
                          </div>
                          <div className="text-[10px] text-slate-200 drop-shadow truncate max-w-[180px]">
                            {campaignDraft.headlines[0]}
                          </div>
                        </div>

                        <button className="btn-competitor-gradient px-3 py-1.5 rounded-lg text-[10px] font-bold text-white shadow">
                          Shop Now
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. YouTube Shorts Preview */}
                {previewChannel === 'shorts' && (
                  <div className="relative rounded-xl overflow-hidden aspect-[9/16] bg-black border border-white/10 max-h-[360px] mx-auto shadow-lg">
                    <img
                      src="/assets/images/ad_shorts_vertical_1792475115634.jpg"
                      alt="YouTube Shorts"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* 5. Gmail Ad Preview */}
                {previewChannel === 'gmail' && (
                  <div className="p-3 rounded-xl bg-[#1e2028] border border-white/10 text-xs text-left space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                      <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">
                        Gmail Promotions Tab
                      </span>
                      <span className="text-[10px] text-slate-400">Sponsored</span>
                    </div>
                    <div className="flex gap-2.5 items-center">
                      <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-[#ec268f] flex items-center justify-center font-bold text-xs shrink-0">
                        {campaignDraft.businessName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white truncate text-xs">
                          {campaignDraft.businessName}
                        </div>
                        <div className="text-slate-300 truncate text-[11px]">
                          {campaignDraft.headlines[0]}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. Google Maps Pin Preview */}
                {previewChannel === 'maps' && (
                  <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-black border border-white/10">
                    <img
                      src="/assets/images/ad_maps_store_1792474060709.jpg"
                      alt="Google Maps store"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 right-2 p-2.5 rounded-xl bg-black/85 backdrop-blur-md border border-white/10 text-left text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white truncate">{campaignDraft.businessName}</span>
                        <span className="text-amber-400 font-bold text-[10px]">★ 4.9 (420)</span>
                      </div>
                      <div className="text-[10px] text-slate-300 mt-0.5">
                        Promoted Store Location · Open until 9 PM
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button className="flex-1 py-1 rounded bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-white">
                          Directions
                        </button>
                        <button className="flex-1 py-1 rounded bg-[#ec268f] text-[10px] font-semibold text-white">
                          View Offers
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* INLINE EDITABLE CONTROLS */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Live Copy Tweaks</span>
                  <span className="text-amber-300 font-mono text-[11px]">Unsaved until saved</span>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">
                    Primary Headline 1
                  </label>
                  <input
                    type="text"
                    value={campaignDraft.headlines[0] || ''}
                    onChange={(e) => {
                      const newHls = [...campaignDraft.headlines];
                      newHls[0] = e.target.value;
                      setCampaignDraft({ ...campaignDraft, headlines: newHls });
                    }}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">
                    Primary Headline 2
                  </label>
                  <input
                    type="text"
                    value={campaignDraft.headlines[1] || ''}
                    onChange={(e) => {
                      const newHls = [...campaignDraft.headlines];
                      newHls[1] = e.target.value;
                      setCampaignDraft({ ...campaignDraft, headlines: newHls });
                    }}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">
                    Primary Description
                  </label>
                  <textarea
                    rows={2}
                    value={campaignDraft.descriptions[0] || ''}
                    onChange={(e) => {
                      const newDescs = [...campaignDraft.descriptions];
                      newDescs[0] = e.target.value;
                      setCampaignDraft({ ...campaignDraft, descriptions: newDescs });
                    }}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">
                    Destination URL
                  </label>
                  <input
                    type="text"
                    value={campaignDraft.finalUrl}
                    onChange={(e) => setCampaignDraft({ ...campaignDraft, finalUrl: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500 font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Bottom Quick Export */}
              <div className="pt-2">
                <button disabled={!campaignDraft.id || isSaving} onClick={() => void handleSaveCampaign()} className="w-full mb-2 py-2.5 rounded-xl bg-[#ec268f]/20 hover:bg-[#ec268f]/30 disabled:opacity-50 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving…' : 'Save campaign changes'}</span>
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(campaignDraft, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Aura_Google_Ads_${campaignDraft.campaignName.replace(/\s+/g, '_')}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="w-full py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Draft JSON (Not a Google Ads Export)</span>
                </button>
              </div>
              {mediaMessage && <p role="status" className="text-xs text-slate-300">{mediaMessage}</p>}
              {actionError && <p role="alert" className="text-xs text-rose-300">{actionError}</p>}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
