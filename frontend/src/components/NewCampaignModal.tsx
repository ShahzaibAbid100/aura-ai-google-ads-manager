import React, { useState } from 'react';
import { X, Sparkles, Globe, DollarSign, Target, Check, Sliders, Layers } from 'lucide-react';
import { AdCampaignDraft } from '../types';
import { backendApi } from '../services/api';

interface NewCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCampaign: (campaign: AdCampaignDraft) => void;
}

export const NewCampaignModal: React.FC<NewCampaignModalProps> = ({
  isOpen,
  onClose,
  onCreateCampaign
}) => {
  const [brandUrl, setBrandUrl] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [productDetails, setProductDetails] = useState('');
  const [audience, setAudience] = useState('');
  const [location, setLocation] = useState('');
  const [goal, setGoal] = useState<'conversions' | 'brand_lift' | 'store_visits' | 'lead_generation'>('conversions');
  const [dailyBudget, setDailyBudget] = useState(150);
  const [targetRoas, setTargetRoas] = useState(480);
  const [selectedChannels, setSelectedChannels] = useState<('Search' | 'YouTube' | 'Gmail' | 'Maps' | 'Discover' | 'Display')[]>([
    'Search',
    'YouTube',
    'Gmail',
    'Discover'
  ]);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleChannel = (ch: 'Search' | 'YouTube' | 'Gmail' | 'Maps' | 'Discover' | 'Display') => {
    if (selectedChannels.includes(ch)) {
      if (selectedChannels.length > 1) {
        setSelectedChannels(selectedChannels.filter(c => c !== ch));
      }
    } else {
      setSelectedChannels([...selectedChannels, ch]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsScanning(true);
    try {
      const rawWebsite = brandUrl.trim();
      const normalizedWebsite = /^https?:\/\//i.test(rawWebsite) ? rawWebsite : `https://${rawWebsite}`;
      const parsedWebsite = new URL(normalizedWebsite);
      if (!['http:', 'https:'].includes(parsedWebsite.protocol)) {
        throw new Error('Please enter an HTTP or HTTPS business website URL.');
      }
      const websiteUrl = parsedWebsite.toString();
      const analysis = await backendApi.analyzeWebsite(websiteUrl);
      const resolvedBusinessName = businessName.trim() || analysis.business_name || new URL(websiteUrl).hostname;
      const planInput = {
        website_analysis: analysis as unknown as Record<string, unknown>,
        business_name: resolvedBusinessName,
        product_details: productDetails,
        goal,
        audience,
        location,
        language: 'English',
        daily_budget: dailyBudget,
        currency: 'USD',
        target_roas: targetRoas,
        channels: selectedChannels
      } as const;
      const plan = await backendApi.planCampaign(planInput);
      const campaign = await backendApi.createCampaign({
        ...planInput,
        name: `${resolvedBusinessName} campaign`,
      });
      const generatedCopy = campaign.copy;
      const headlineItems = generatedCopy.headlines || [];
      const descriptionItems = generatedCopy.descriptions || [];
      onCreateCampaign({
        id: campaign.id,
        version: campaign.version,
        validation: campaign.validation,
        approvedVersion: campaign.approved_version,
        campaignName: campaign.name,
        goal,
        targetRoas,
        dailyBudget: campaign.budget,
        businessName: resolvedBusinessName,
        finalUrl: analysis.url,
        headlines: headlineItems.map((item) => item.text),
        descriptions: descriptionItems.map((item) => item.text),
        status: campaign.status,
        channels: selectedChannels,
        provider: String(plan.provider || 'mock'),
        simulated: plan.provider === 'mock'
      });
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Campaign could not be saved. Check the backend connection and form values.';
      setErrorMessage(message);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-4xl bg-[#12141e] border border-white/10 rounded-3xl p-6 sm:p-8 text-white shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-pink-500/20 text-[#ec268f]">
              <Sparkles className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h2 className="text-2xl font-black font-display tracking-tight text-white">Create New AI Campaign</h2>
              <p className="text-xs text-slate-400">Aura will extract your landing page, photos, and generate your Google Ads blueprint.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* STEP 1: Brand URL & Name (Large Step 1 Number Indicator) */}
          <div className="p-3 rounded-2xl bg-black/30 border border-white/5 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#a82bf0] to-[#ec268f] text-white flex items-center justify-center text-lg font-black font-mono shadow-md">
                1
              </span>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Brand & Landing Page
                </h3>
                <p className="text-xs text-slate-400">Where Aura pulls business DNA and photos from</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Brand / Store Name
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Lumina Audio"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ec268f]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Landing Page URL
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={brandUrl}
                    onChange={(e) => setBrandUrl(e.target.value)}
                    placeholder="https://yourstore.com"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ec268f]"
                  />
                </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Product / Service Details</label>
                  <input value={productDetails} onChange={(e) => setProductDetails(e.target.value)} maxLength={4000} placeholder="What are you promoting? Use verified facts only." className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ec268f]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Target Audience</label>
                  <input value={audience} onChange={(e) => setAudience(e.target.value)} maxLength={1000} placeholder="Audience suggestion" className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ec268f]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Target Location</label>
                  <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={500} placeholder="Country, region, or city" className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ec268f]" />
                </div>
              </div>
              </div>
            </div>
          </div>

          {/* STEP 2: Goal Selector */}
          <div className="p-5 rounded-2xl bg-black/30 border border-white/5 space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center text-lg font-black font-mono">
                2
              </span>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-[#ec268f]" /> Primary Campaign Objective
                </h3>
                <p className="text-xs text-slate-400">Select what Aura will optimize for</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {[
                { id: 'conversions', label: 'E-com Sales', sub: 'Max ROAS' },
                { id: 'lead_generation', label: 'Lead Gen', sub: 'Low CPA' },
                { id: 'brand_lift', label: 'YouTube Video', sub: 'High Reach' },
                { id: 'store_visits', label: 'Store Footfall', sub: 'Google Maps' }
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setGoal(item.id as any)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    goal === item.id
                      ? 'bg-[#ec268f]/15 border-[#ec268f] text-white shadow'
                      : 'bg-white/[0.03] border-white/10 text-slate-300 hover:border-white/20'
                  }`}
                >
                  <div className="text-xs font-bold">{item.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{item.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* STEP 3: Budget & Target ROAS with ENLARGED NUMBERS */}
          <div className="p-5 rounded-2xl bg-black/30 border border-white/5 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center text-lg font-black font-mono">
                3
              </span>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Target Economics & Pacing
                </h3>
                <p className="text-xs text-slate-400">Set daily limits and profitability thresholds</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Daily Budget Card */}
              <div className="p-5 rounded-2xl bg-black/50 border border-white/10">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-emerald-400" /> Daily Ad Budget
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                    Pacing
                  </span>
                </div>

                {/* Big Number Size Display */}
                <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight my-3 tabular-nums">
                  ${dailyBudget}
                  <span className="text-lg text-slate-400 font-normal ml-1">/day</span>
                </div>

                <input
                  type="range"
                  min="20"
                  max="1000"
                  step="10"
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(Number(e.target.value))}
                  className="w-full accent-[#ec268f] cursor-pointer mt-2"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1 font-mono">
                  <span>$20 (Testing)</span>
                  <span>$150 (Ideal)</span>
                  <span>$1,000 (Aggressive)</span>
                </div>
              </div>

              {/* Target ROAS Card */}
              <div className="p-5 rounded-2xl bg-black/50 border border-pink-500/30">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Sliders className="w-4 h-4 text-cyan-400" /> Target ROAS
                  </span>
                  <span className="text-[10px] bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded font-mono font-bold">
                    Efficiency
                  </span>
                </div>

                {/* Big Number Size Display */}
                <div className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-[#ec268f] font-mono tracking-tight my-3 tabular-nums">
                  {targetRoas}%
                  <span className="text-lg text-slate-400 font-normal ml-2">({(targetRoas / 100).toFixed(1)}x)</span>
                </div>

                <input
                  type="range"
                  min="200"
                  max="800"
                  step="25"
                  value={targetRoas}
                  onChange={(e) => setTargetRoas(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer mt-2"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1 font-mono">
                  <span>200% (High Volume)</span>
                  <span>480% (Sweet Spot)</span>
                  <span>800% (Max Margin)</span>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 4: Target Google Channels */}
          <div className="p-5 rounded-2xl bg-black/30 border border-white/5 space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center text-lg font-black font-mono">
                4
              </span>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-400" /> Target Google Channels
                </h3>
                <p className="text-xs text-slate-400">Placements synchronized across Google Network</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {(['Search', 'YouTube', 'Gmail', 'Maps', 'Discover', 'Display'] as const).map((ch) => {
                const isSelected = selectedChannels.includes(ch);
                return (
                  <button
                    type="button"
                    key={ch}
                    onClick={() => toggleChannel(ch)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-purple-500/20 border-purple-500/60 text-white shadow-sm'
                        : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                    <span>{ch}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <div className="text-xs text-slate-400">Saved as a backend campaign draft. No Google Ads campaign is created or published.</div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isScanning}
                className="btn-competitor-gradient px-8 py-3.5 rounded-xl text-sm font-extrabold tracking-wide flex items-center gap-2 shadow-xl"
              >
                {isScanning ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Extracting Site & Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Campaign with Aura</span>
                  </>
                )}
              </button>
            </div>
          </div>
          {errorMessage && <div role="alert" className="mt-3 text-xs text-rose-300">{errorMessage}</div>}
        </form>
      </div>
    </div>
  );
};
