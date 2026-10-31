import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Layers, 
  Scan, 
  ShieldCheck, 
  TrendingUp, 
  RefreshCw, 
  UserCheck, 
  DollarSign, 
  BarChart3,
  CheckCircle2,
  Flame,
  ArrowUpRight
} from 'lucide-react';
import { CAPABILITIES_DATA, USE_CASES_DATA } from '../data/mockData';

interface HomePageProps {
  onHireAgent: () => void;
  onOpenCreate: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onHireAgent,
  onOpenCreate
}) => {
  // Advanced Interactive ROI Calculator State
  const [monthlySpend, setMonthlySpend] = useState(3500);
  const [industry, setIndustry] = useState<'ecommerce' | 'saas' | 'local'>('ecommerce');

  const industryMultipliers = {
    ecommerce: { roas: 4.6, cpaDrop: '-32%', convLift: '+44%' },
    saas: { roas: 3.9, cpaDrop: '-28%', convLift: '+38%' },
    local: { roas: 5.2, cpaDrop: '-41%', convLift: '+52%' }
  };

  const selectedMetrics = industryMultipliers[industry];
  // Scenario-only arithmetic: this is not based on account reports, campaign forecasts, or real ROI.
  const projectedRevenue = Math.round(monthlySpend * selectedMetrics.roas);

  const getCapabilityIcon = (iconName: string) => {
    switch (iconName) {
      case 'UserCheck': return <UserCheck className="w-5 h-5 text-[#ec268f]" />;
      case 'Layers': return <Layers className="w-5 h-5 text-purple-400" />;
      case 'Sparkles': return <Sparkles className="w-5 h-5 text-amber-400" />;
      case 'Scan': return <Scan className="w-5 h-5 text-cyan-400" />;
      case 'ShieldCheck': return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
      case 'CheckCircle2': return <CheckCircle2 className="w-5 h-5 text-pink-400" />;
      case 'TrendingUp': return <TrendingUp className="w-5 h-5 text-indigo-400" />;
      case 'RefreshCw': return <RefreshCw className="w-5 h-5 text-rose-400" />;
      default: return <Sparkles className="w-5 h-5 text-[#ec268f]" />;
    }
  };

  return (
    <div className="w-full pb-24 pt-8">
      {/* All top headers, pricing, and credits completely removed */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-28">
        {/* HERO SECTION */}
        <section className="relative">
          {/* Eyebrow & Hire CTA Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-pink-500/50 shadow-xl shadow-pink-500/20 shrink-0">
                <img
                  src="/assets/images/aura_avatar_square_1792474096942.jpg"
                  alt="Aura AI Agent"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 className="text-3xl sm:text-4xl font-black font-display text-white tracking-tight">
                  Aura
                </h2>
                <p className="text-xs sm:text-sm font-bold text-[#ec268f] tracking-widest uppercase mt-0.5">
                  AI Google Ads Manager & Creative Director
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onHireAgent}
                className="btn-competitor-gradient px-8 py-3.5 rounded-2xl text-base font-bold tracking-wide flex items-center gap-2 shadow-xl"
              >
                <span>Hire Aura</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl leading-relaxed mb-8">
            Aura helps analyze your website, prepare campaign drafts, generate creative recommendations and review Google Ads reports. A connected Google Ads account and the appropriate credentials are needed for live reports; publishing is disabled in this build.
          </p>

          {/* Main Hero Showcase Card */}
          <div className="relative rounded-3xl bg-gradient-to-br from-[#151824] via-[#10121b] to-[#0d0e14] border border-white/10 overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#ec268f]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
              {/* Left Column: Bold Copy */}
              <div className="lg:col-span-5 p-8 sm:p-12 flex flex-col justify-between z-10">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-500/10 text-xs font-semibold text-[#ec268f]">
                    <Sparkles className="w-4 h-4" />
                    <span>Next-Gen Performance Max</span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-white tracking-tight leading-[1.12]">
                    Hi, I'm Aura. <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-pink-200">
                      Your Google Ads manager,
                    </span>{' '}
                    not another tool to learn.
                  </h1>

                  <div className="space-y-3 pt-2">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#ec268f]">
                      Judge me on your results.
                    </h3>
                    <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
                      I name the real problem first. If your ads are fine and your landing page is losing the sale, I'll say so before I touch the campaign, and I won't add budget that won't pay.
                    </p>
                  </div>
                </div>

                <div className="pt-8">
                  <button
                    onClick={onOpenCreate}
                    className="btn-competitor-gradient w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-bold tracking-wide flex items-center justify-center gap-3 shadow-xl"
                  >
                    <span>Create Campaign Draft</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <p className="text-xs text-slate-400 mt-3">
                    Saves a draft for review · Google Ads publishing is disabled
                  </p>
                </div>
              </div>

              {/* Right Column: High Fidelity Agent Visual */}
              <div className="lg:col-span-7 relative min-h-[400px] lg:min-h-[540px] bg-black/40 overflow-hidden flex items-center justify-center">
                <img
                  src="/assets/images/aura_agent_hero_1792474059460.jpg"
                  alt="Aura AI Google Ads Agent Interface"
                  className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#10121b] via-transparent to-transparent opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#151824] via-transparent to-transparent hidden lg:block" />

                <div className="absolute bottom-6 left-6 right-6 sm:right-auto sm:max-w-xs p-4 rounded-2xl bg-black/85 backdrop-blur-xl border border-white/15 text-xs shadow-2xl">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                      Live PMax Pipeline
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                      Example ROAS 4.8x · demo artwork
                    </span>
                  </div>
                  <p className="text-slate-300">
                    Illustrative design preview only. These assets and figures were not generated from your business or Google Ads account.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* USE CASES SECTION - 4 IN ONE ROW */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-[#ec268f] tracking-widest uppercase">
                USE CASES
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white mt-1">
                One campaign, everywhere your customers already are
              </h2>
            </div>
            <span className="text-xs text-slate-400">Complete multi-channel coverage</span>
          </div>

          {/* 4 Cards In One Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {USE_CASES_DATA.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="group rounded-3xl bg-[#13151f] border border-white/[0.08] hover:border-pink-500/40 overflow-hidden flex flex-col shadow-xl transition-all"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-black/40">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-[10px] font-bold tracking-wide text-white border border-white/10">
                    {item.badge}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white mb-2 group-hover:text-pink-200 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-[#ec268f] font-semibold">
                    <span>Preview in Studio</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* AUTONOMOUS PERFORMANCE ENGINE */}
        <section className="relative rounded-3xl p-8 sm:p-12 bg-[#0e1019] border border-pink-500/30 overflow-hidden shadow-2xl">
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-[#a82bf0]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-[#ec268f]/20 rounded-full blur-3xl pointer-events-none" />

          {/* Header Zone */}
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ec268f]/15 text-[#ec268f] text-xs font-bold uppercase tracking-wider mb-3">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>Autonomous Performance Engine</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-white tracking-tight leading-tight">
                Simulate Your Google Ads Transformation
              </h2>
              <p className="text-base text-slate-300 mt-2 leading-relaxed">
                Illustrative scenarios only — not account forecasts, historical performance or guaranteed returns.
              </p>
            </div>

            {/* Segmented Industry Selector */}
            <div className="flex p-1.5 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 shrink-0">
              {(['ecommerce', 'saas', 'local'] as const).map((ind) => (
                <button
                  key={ind}
                  onClick={() => setIndustry(ind)}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    industry === ind
                      ? 'bg-gradient-to-r from-[#a82bf0] to-[#ec268f] text-white shadow-lg shadow-pink-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {ind === 'ecommerce' ? 'E-Commerce' : ind === 'saas' ? 'B2B SaaS' : 'Local Services'}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Cockpit Grid */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4">
            {/* Left Console: Spend Controller */}
            <div className="lg:col-span-5 p-6 sm:p-8 rounded-2xl bg-black/50 border border-white/10 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Monthly Ad Spend Budget
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                  Demo Input
                </span>
              </div>

              {/* Big Number Display */}
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight tabular-nums">
                  ${monthlySpend.toLocaleString()}
                </span>
                <span className="text-base font-semibold text-slate-400">/month</span>
              </div>

              {/* Custom Slider */}
              <div className="space-y-2">
                <input
                  type="range"
                  min="500"
                  max="25000"
                  step="250"
                  value={monthlySpend}
                  onChange={(e) => setMonthlySpend(Number(e.target.value))}
                  className="w-full accent-[#ec268f] h-2.5 bg-white/10 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-500 font-mono pt-1">
                  <span>$500/mo (Starter)</span>
                  <span>$10,000/mo</span>
                  <span>$25,000+/mo (Scale)</span>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex gap-2 pt-1">
                {[1000, 3500, 8000, 20000].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setMonthlySpend(preset)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                      monthlySpend === preset
                        ? 'bg-pink-500/20 border-pink-500 text-pink-300'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    ${preset >= 1000 ? `${preset / 1000}k` : preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Console: Holographic 3-Metric Pods */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Metric 1: Target ROAS */}
              <div className="p-6 rounded-2xl bg-gradient-to-b from-[#161828] to-[#10121d] border border-pink-500/30 text-center flex flex-col justify-between shadow-xl">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Example Target ROAS
                  </div>
                  <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-[#ec268f] font-mono mt-3">
                    {selectedMetrics.roas}x
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Illustrative scenario · not live bidding</span>
                </div>
              </div>

              {/* Metric 2: Projected Return */}
              <div className="p-6 rounded-2xl bg-gradient-to-b from-[#161828] to-[#10121d] border border-white/10 text-center flex flex-col justify-between shadow-xl">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Example Return (Not a Forecast)
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-white font-mono mt-3 tabular-nums">
                    ${projectedRevenue.toLocaleString()}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 text-xs font-semibold text-pink-400 flex items-center justify-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{selectedMetrics.convLift} example change</span>
                </div>
              </div>

              {/* Metric 3: CPA Reduction */}
              <div className="p-6 rounded-2xl bg-gradient-to-b from-[#161828] to-[#10121d] border border-cyan-500/30 text-center flex flex-col justify-between shadow-xl">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Example CPA Change
                  </div>
                  <div className="text-4xl sm:text-5xl font-black text-cyan-400 font-mono mt-3">
                    {selectedMetrics.cpaDrop}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 text-xs font-semibold text-slate-400 flex items-center justify-center gap-1">
                  <span>Illustration only · not measured</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CAPABILITIES SECTION */}
        <section className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-[#ec268f] tracking-widest uppercase">
                CAPABILITIES
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white mt-1">
                Everything Google Ads asks of you, handled end-to-end
              </h2>
            </div>
            <span className="text-xs text-slate-400">From the initial brief to the weekly check</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {CAPABILITIES_DATA.map((cap) => (
              <div
                key={cap.id}
                className="group p-6 rounded-2xl bg-[#13151f]/80 border border-white/[0.08] hover:border-pink-500/40 hover:bg-[#181a27] transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    {getCapabilityIcon(cap.iconName)}
                  </div>
                  <h3 className="text-base font-bold text-white mb-2 group-hover:text-pink-200 transition-colors">
                    {cap.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {cap.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CLOSING HIRE CTA SECTION */}
        <section className="text-center py-14 px-6 rounded-3xl bg-gradient-to-b from-[#181a28] to-[#0d0e15] border border-pink-500/30 shadow-2xl relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl overflow-hidden border-2 border-[#ec268f] shadow-lg shadow-pink-500/30">
              <img
                src="/assets/images/aura_avatar_square_1792474096942.jpg"
                alt="Aura AI Agent"
                className="w-full h-full object-cover"
              />
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-white tracking-tight">
              Ready to hand your Google Ads to Aura?
            </h2>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Bring what you're promoting and where people should land. Aura handles your Google Ads from there, one question at a time, and nothing goes live until you approve it.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={onHireAgent}
                className="btn-competitor-gradient px-8 py-4 rounded-2xl text-base font-bold tracking-wide flex items-center gap-2 shadow-2xl"
              >
                <span>Hire Aura Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenCreate}
                className="px-6 py-4 rounded-2xl text-base font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
              >
                Open Campaign Wizard
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
