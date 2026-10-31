import React from 'react';
import { X, MicOff, Volume2, Sparkles } from 'lucide-react';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceModal: React.FC<VoiceModalProps> = ({ isOpen, onClose }) => {
  const waveformBars = [15, 30, 60, 40, 75, 90, 50, 30, 20];
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#11131b] border border-white/10 rounded-3xl p-8 text-center text-white shadow-2xl overflow-hidden">
        {/* Ambient neon radial */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-to-b from-[#a82bf0]/30 via-[#ec268f]/20 to-transparent rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-[#a82bf0] via-[#ec268f] to-cyan-400 animate-pulse">
              <img
                src="/assets/images/aura_avatar_square_1792474096942.jpg"
                alt="Aura Voice AI"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-pink-500 text-white shadow-lg">
              <Volume2 className="w-4 h-4" />
            </div>
          </div>
        </div>

        <h3 className="text-xl font-bold font-display text-white">Aura Live Voice</h3>
        <p className="text-xs text-slate-400 mt-1">Voice transcription is not configured.</p>

        {/* Audio waveform visualizer */}
        <div className="flex items-center justify-center gap-1.5 h-16 my-6 px-4">
          {waveformBars.map((height, i) => (
            <div
              key={i}
              style={{ height: `${height}%` }}
              className="w-1.5 rounded-full bg-gradient-to-t from-[#a82bf0] via-[#ec268f] to-cyan-300 transition-all duration-100 ease-out"
            />
          ))}
        </div>

        {/* Live speech transcription */}
        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-sm text-slate-200 min-h-[70px] flex items-center justify-center italic">
          Voice transcription is unavailable in this build. Enter your request in the chat instead.
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            disabled
            aria-label="Microphone unavailable"
            title="Microphone transcription is not configured"
            className={`p-3.5 rounded-full transition-all ${
              'bg-rose-500/20 text-rose-300'
            }`}
          >
            <MicOff className="w-5 h-5" />
          </button>

          <button
            disabled
            title="Voice feature unavailable: use text chat"
            className="btn-competitor-gradient disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-full text-xs font-bold tracking-wide flex items-center gap-2 shadow-lg"
          >
            <Sparkles className="w-4 h-4" />
            <span>Unavailable</span>
          </button>
        </div>
      </div>
    </div>
  );
};
