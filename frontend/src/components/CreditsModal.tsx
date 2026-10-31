import React, { useState } from 'react';
import { X, Zap, Sparkles, Shield, CreditCard, Check } from 'lucide-react';

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCredits: number;
}

export const CreditsModal: React.FC<CreditsModalProps> = ({
  isOpen,
  onClose,
  currentCredits
}) => {
  const [billingCycle, setBillingCycle] = useState<'one_time' | 'monthly'>('one_time');

  if (!isOpen) return null;

  const tiers = [
    {
      id: 200,
      name: 'Starter Booster',
      credits: 200,
      price: billingCycle === 'monthly' ? 24 : 30,
      perCredit: '$0.15',
      features: [
        'Run 5 Full PMax campaigns',
        'Search & Display copy generation',
        'Standard Google Ads verification',
        'Cloud sync enabled'
      ],
      popular: false
    },
    {
      id: 500,
      name: 'Growth Scale',
      credits: 500,
      price: billingCycle === 'monthly' ? 52 : 65,
      perCredit: '$0.13',
      features: [
        'Run 15 Full PMax campaigns',
        'AI Video scripts & TV ad hooks',
        'Continuous 24/7 autonomous pacing',
        'Priority creative generation engine',
        'Telegram & Slack channel sync'
      ],
      popular: true
    },
    {
      id: 1000,
      name: 'Agency Ultra',
      credits: 1000,
      price: billingCycle === 'monthly' ? 88 : 110,
      perCredit: '$0.11',
      features: [
        'Unlimited active campaigns',
        'Full Autonomy mode access',
        'Multi-account Google Ads routing',
        'Dedicated ROAS pacing copilot',
        'Custom brand voice memory vaults'
      ],
      popular: false
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl bg-[#12141d] border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 text-white overflow-hidden">
        {/* Glow ambient */}
        <div className="absolute top-0 right-1/4 w-80 h-40 bg-[#ec268f]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-pink-500/20 text-[#ec268f]">
                <Zap className="w-5 h-5 fill-current" />
              </span>
              <h2 className="text-2xl font-bold font-display tracking-tight">Credit Plans (Demo Only)</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Current Balance:{' '}
              <span className="text-white font-semibold tabular-nums">{currentCredits.toLocaleString()} Credits</span>
              {' · '}
              Demo balance only · billing is not connected.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Billing cycle toggle */}
        <div className="flex justify-center my-6">
          <div className="inline-flex p-1 bg-white/5 border border-white/10 rounded-xl">
            <button
              onClick={() => setBillingCycle('one_time')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                billingCycle === 'one_time' ? 'bg-white/15 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pay As You Go
            </button>
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                billingCycle === 'monthly' ? 'bg-[#ec268f] text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Monthly Subscription</span>
              <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded font-mono">20% OFF</span>
            </button>
          </div>
        </div>

        {/* Tiers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative flex flex-col justify-between p-5 rounded-xl border transition-all ${
                tier.popular
                  ? 'bg-gradient-to-b from-[#ec268f]/10 to-transparent border-[#ec268f]/50 shadow-lg shadow-pink-500/10'
                  : 'bg-white/[0.03] border-white/10 hover:border-white/20'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#ec268f] text-[11px] font-bold tracking-wide uppercase text-white shadow">
                  Most Popular
                </div>
              )}

              <div>
                <h3 className="font-semibold text-base text-white">{tier.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold tracking-tight tabular-nums">${tier.price}</span>
                  <span className="text-xs text-slate-400">USD</span>
                </div>
                <div className="text-xs text-pink-400 font-medium mt-1">
                  {tier.credits} demo credits <span className="text-slate-400">({tier.perCredit}/credit example)</span>
                </div>

                <ul className="mt-4 space-y-2 text-xs text-slate-300">
                  {tier.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-[#ec268f] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6">
                <button
                  disabled
                  title="Billing is not configured: no payment will be processed"
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all opacity-50 cursor-not-allowed ${
                    tier.popular
                      ? 'btn-competitor-gradient font-bold'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Unavailable · {tier.credits} demo credits</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Security badge note */}
        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Checkout is unavailable until a billing backend is configured.</span>
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-pink-400" />
            <span>Demo credits only</span>
          </div>
        </div>
      </div>
    </div>
  );
};
