import React, { useState } from 'react';
import { motion } from 'framer-motion';

export type AIProvider = 'gpt4o' | 'gemini';

interface AISettingsPanelProps {
  provider: AIProvider;
  onProviderChange: (provider: AIProvider) => void;
  gptKey: string;
  onGptKeyChange: (key: string) => void;
  geminiKey: string;
  onGeminiKeyChange: (key: string) => void;
}

export const AISettingsPanel: React.FC<AISettingsPanelProps> = ({
  provider,
  onProviderChange,
  gptKey,
  onGptKeyChange,
  geminiKey,
  onGeminiKeyChange,
}) => {
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('artitude_ai_provider', provider);
    localStorage.setItem('artitude_gpt4o_key', gptKey);
    localStorage.setItem('artitude_gemini_key', geminiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const activeKey = provider === 'gpt4o' ? gptKey : geminiKey;
  const activeKeyChange = provider === 'gpt4o' ? onGptKeyChange : onGeminiKeyChange;
  const hasKey = activeKey.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full"
    >
      <div className="flex items-center gap-4 py-4 px-5 rounded-2xl border border-[#1A1A1A]/6 bg-white/60 backdrop-blur-sm">
        {/* AI Icon + Label */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-artitude-red/10 to-artitude-red/5 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-artitude-red">
              <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
              <path d="M16 11a4 4 0 0 1 0 8H8a4 4 0 0 1 0-8" />
              <line x1="9" y1="18" x2="9" y2="22" />
              <line x1="15" y1="18" x2="15" y2="22" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] tracking-widest font-general font-semibold uppercase text-artitude-text leading-none">
              AI Engine
            </p>
            <p className="text-[9px] text-artitude-muted font-general mt-0.5 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${hasKey ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              {hasKey ? 'Custom key' : 'Server default'}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-[#1A1A1A]/8 shrink-0" />

        {/* Provider Toggle */}
        <div className="flex bg-[#F5F5F3] rounded-xl p-0.5 gap-0.5 shrink-0">
          <button
            onClick={() => onProviderChange('gpt4o')}
            className={`py-1.5 px-4 rounded-[10px] text-[10px] tracking-wider font-general font-semibold uppercase transition-all duration-300 ${
              provider === 'gpt4o'
                ? 'bg-white text-artitude-text shadow-sm'
                : 'text-artitude-muted hover:text-artitude-text'
            }`}
          >
            GPT-4o
          </button>
          <button
            onClick={() => onProviderChange('gemini')}
            className={`py-1.5 px-4 rounded-[10px] text-[10px] tracking-wider font-general font-semibold uppercase transition-all duration-300 ${
              provider === 'gemini'
                ? 'bg-white text-artitude-text shadow-sm'
                : 'text-artitude-muted hover:text-artitude-text'
            }`}
          >
            Gemini
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-[#1A1A1A]/8 shrink-0" />

        {/* API Key Input — inline */}
        <div className="relative flex-1 min-w-0">
          <label className="text-[9px] tracking-wider font-general font-semibold uppercase text-artitude-muted/70 absolute -top-1 left-3 bg-white/60 px-1 z-10 leading-none">
            {provider === 'gpt4o' ? 'OpenAI / GitHub Token' : 'Gemini API Key'}
          </label>
          <input
            type={showKey ? 'text' : 'password'}
            value={activeKey}
            onChange={(e) => activeKeyChange(e.target.value)}
            placeholder={provider === 'gpt4o' ? 'sk-... or github_pat_...' : 'AIza...'}
            className="w-full bg-[#F5F5F3] rounded-xl px-3 py-2 pr-9 text-xs font-mono text-artitude-text placeholder:text-gray-300 outline-none border border-transparent focus:border-artitude-red/20 transition-colors"
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-artitude-muted hover:text-artitude-text transition-colors"
            tabIndex={-1}
          >
            {showKey ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className={`px-5 py-2 rounded-xl text-[10px] tracking-wider font-general font-semibold uppercase transition-all duration-300 shrink-0 ${
            saved
              ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
              : 'bg-artitude-text text-white hover:bg-artitude-text/85'
          }`}
        >
          {saved ? '✓ Saved' : 'Save'}
        </button>
      </div>
    </motion.div>
  );
};
