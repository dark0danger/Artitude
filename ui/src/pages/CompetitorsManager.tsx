import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { scrapeWebsite, fetchCompetitors } from '../api';
import type { CompetitorKit } from '../api';
import { CropMarks } from '../components/CropMarks';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 20 } }
};

interface CompetitorsManagerProps {
  projectId: string;
}

export const CompetitorsManager: React.FC<CompetitorsManagerProps> = ({ projectId }) => {
  const [competitors, setCompetitors] = useState<CompetitorKit[]>([]);
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const loadData = async () => {
    try {
      const data = await fetchCompetitors(projectId);
      setCompetitors(data);
    } catch (err) {
      console.error("Failed to load competitors", err);
    }
  };

  const handleScrape = async () => {
    if (!competitorUrl) return;
    setIsScraping(true);
    try {
      const result = await scrapeWebsite(projectId, competitorUrl);
      setCompetitorUrl('');
      await loadData();
      if (result.warning) {
        alert(result.warning);
      }
    } catch (err) {
      console.error("Failed to scrape website", err);
      alert("Failed to scrape competitor website.");
    } finally {
      setIsScraping(false);
    }
  };

  const hasColors = (comp: CompetitorKit) =>
    (comp.primary_colors && comp.primary_colors.length > 0) ||
    (comp.secondary_colors && comp.secondary_colors.length > 0);

  const hasFonts = (comp: CompetitorKit) =>
    comp.typography && comp.typography.length > 0;

  return (
    <div className="w-full h-full relative z-10">
      <motion.div initial="hidden" animate="show" variants={containerVariants} className="max-w-6xl mx-auto">

        <motion.div variants={itemVariants} className="mb-16 border-b border-[#1A1A1A]/10 pb-8 text-center">
          <h2 className="text-5xl font-fraunces font-bold text-artitude-text tracking-wide">Competitor Intelligence</h2>
          <p className="text-xl text-artitude-muted mt-4 font-general font-light">
            Track and monitor competitor brand identities to avoid market collision.
          </p>
        </motion.div>

        {/* Scrape Input */}
        <motion.div variants={itemVariants} className="bg-transparent border border-[#1A1A1A]/10 p-12 mb-16 relative overflow-visible group">
          <CropMarks />
          <h3 className="text-sm font-general font-medium text-artitude-text mb-4 uppercase tracking-widest">Scrape Competitor Website</h3>
          <p className="text-gray-500 mb-8 font-general font-light">Input a competitor's website URL. Artitude will scrape their public messaging and extract their Brand Kit (colors, fonts).</p>

          <div className="flex gap-4 items-center">
            <input
              type="url"
              placeholder="https://competitor.com"
              value={competitorUrl}
              onChange={e => setCompetitorUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleScrape()}
              className="flex-1 p-4 bg-gray-50 border border-gray-200 outline-none focus:border-artitude-text focus:ring-1 focus:ring-artitude-text transition-all font-mono"
            />
            <button
              onClick={handleScrape}
              disabled={isScraping || !competitorUrl}
              className={`px-8 py-4 bg-artitude-text text-white font-bold uppercase tracking-widest text-sm transition-all ${isScraping || !competitorUrl ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black'}`}
            >
              {isScraping ? 'Scraping...' : 'Scrape & Extract'}
            </button>
          </div>

          {/* Loading overlay */}
          <AnimatePresence>
            {isScraping && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10"
              >
                <div className="flex flex-col items-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-12 h-12 border-4 border-gray-200 border-t-artitude-red rounded-full mb-4"
                  />
                  <span className="text-artitude-text font-bold uppercase tracking-widest text-sm">Scraping & Extracting Brand Kit...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Competitor Brand Kits */}
        <motion.div variants={itemVariants}>
          <h3 className="text-sm font-general font-medium text-artitude-text mb-8 uppercase tracking-widest">
            Known Competitors ({competitors.length})
          </h3>

          {competitors.length === 0 ? (
            <div className="p-16 border-y border-[#1A1A1A]/10 text-center">
              <p className="text-sm font-mono text-gray-400">No competitors tracked yet. Scrape a website above to start.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-12">
              {competitors.map((comp, i) => {
                const isExpanded = expandedIndex === i;
                return (
                  <motion.div
                    key={i}
                    layout
                    className="bg-transparent border border-[#1A1A1A]/10 relative group overflow-visible"
                  >
                    <CropMarks />

                    {/* Header Bar */}
                    <div
                      className="flex items-center justify-between p-8 cursor-pointer hover:bg-[#1A1A1A]/[0.02] transition-colors"
                      onClick={() => setExpandedIndex(isExpanded ? null : i)}
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-transparent border-2 border-artitude-text/20 text-artitude-text flex items-center justify-center font-fraunces font-bold text-2xl group-hover:border-artitude-red group-hover:text-artitude-red transition-colors duration-300">
                          {(comp.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-2xl font-fraunces font-bold text-artitude-text tracking-wide group-hover:text-artitude-red transition-colors">
                            {comp.name || 'Unknown Competitor'}
                          </h4>
                          <a
                            href={comp.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-mono text-artitude-muted hover:text-artitude-red hover:underline transition-colors"
                            onClick={e => e.stopPropagation()}
                          >
                            {comp.url}
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {/* Quick color preview (collapsed state) */}
                        {!isExpanded && hasColors(comp) && (
                          <div className="flex gap-1">
                            {[...(comp.primary_colors || []), ...(comp.secondary_colors || [])].slice(0, 6).map((color, idx) => (
                              <div
                                key={idx}
                                className="w-6 h-6 border border-[#1A1A1A]/10"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        )}

                        {/* Expand indicator */}
                        <motion.svg
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                          width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className="text-artitude-muted"
                        >
                          <path d="M6 9l6 6 6-6" />
                        </motion.svg>
                      </div>
                    </div>

                    {/* Expanded Brand Kit */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.4, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-[#1A1A1A]/10 p-10">

                            {!hasColors(comp) && !hasFonts(comp) ? (
                              <div className="p-12 border border-dashed border-[#1A1A1A]/20 text-center bg-[#1A1A1A]/[0.02]">
                                <p className="text-sm font-mono text-gray-400 uppercase tracking-widest mb-2">No Brand Kit Data Extracted</p>
                                <p className="text-sm font-general text-gray-400 font-light">Try re-scraping this competitor's website for better results.</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

                                {/* Left: Color Palette */}
                                <div>
                                  <h4 className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-8 pb-3 border-b border-[#1A1A1A]/10">
                                    Color Palette
                                  </h4>

                                  {/* Primary Colors */}
                                  <div className="mb-8">
                                    <h5 className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-4">Primary</h5>
                                    {comp.primary_colors && comp.primary_colors.length > 0 ? (
                                      <div className="flex flex-wrap gap-5">
                                        {comp.primary_colors.map((color, idx) => (
                                          <div key={idx} className="flex flex-col items-center gap-2">
                                            <div
                                              className="w-16 h-16 border border-[#1A1A1A]/20 shadow-sm"
                                              style={{ backgroundColor: color }}
                                            />
                                            <span className="text-[10px] font-mono text-artitude-text uppercase font-medium">{color}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs font-mono text-gray-300 italic">Not detected</p>
                                    )}
                                  </div>

                                  {/* Secondary Colors */}
                                  <div>
                                    <h5 className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-4">Secondary</h5>
                                    {comp.secondary_colors && comp.secondary_colors.length > 0 ? (
                                      <div className="flex flex-wrap gap-5">
                                        {comp.secondary_colors.map((color, idx) => (
                                          <div key={idx} className="flex flex-col items-center gap-2">
                                            <div
                                              className="w-12 h-12 border border-[#1A1A1A]/20 shadow-sm"
                                              style={{ backgroundColor: color }}
                                            />
                                            <span className="text-[10px] font-mono text-artitude-text uppercase font-medium">{color}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs font-mono text-gray-300 italic">Not detected</p>
                                    )}
                                  </div>

                                  {/* Combined Palette Strip */}
                                  {hasColors(comp) && (
                                    <div className="mt-8 pt-6 border-t border-[#1A1A1A]/10">
                                      <h5 className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-3">Full Palette</h5>
                                      <div className="flex h-8 w-full overflow-hidden border border-[#1A1A1A]/10">
                                        {[...(comp.primary_colors || []), ...(comp.secondary_colors || [])].map((color, idx) => (
                                          <div
                                            key={idx}
                                            className="flex-1 h-full"
                                            style={{ backgroundColor: color }}
                                            title={color}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Right: Typography */}
                                <div>
                                  <h4 className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-8 pb-3 border-b border-[#1A1A1A]/10">
                                    Typography
                                  </h4>

                                  {hasFonts(comp) ? (
                                    <ul className="space-y-4">
                                      {comp.typography.map((font, idx) => (
                                        <li key={idx} className="border-b border-[#1A1A1A]/10 pb-4">
                                          <span className="text-xl font-fraunces text-artitude-text block mb-1">{font}</span>
                                          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                                            {idx === 0 ? 'Primary Typeface' : idx === 1 ? 'Secondary Typeface' : `Typeface ${idx + 1}`}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <div className="p-8 border border-dashed border-[#1A1A1A]/15 text-center bg-[#1A1A1A]/[0.02]">
                                      <p className="text-xs font-mono text-gray-300 uppercase tracking-widest">No Fonts Detected</p>
                                    </div>
                                  )}

                                  {/* Font preview */}
                                  {hasFonts(comp) && (
                                    <div className="mt-8 pt-6 border-t border-[#1A1A1A]/10">
                                      <h5 className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-4">Preview</h5>
                                      <div className="space-y-2">
                                        <p className="text-3xl text-artitude-text font-bold tracking-tight">Aa Bb Cc</p>
                                        <p className="text-lg text-artitude-muted font-light">The quick brown fox jumps over the lazy dog.</p>
                                        <p className="text-xs font-mono text-gray-400 mt-2">0123456789 !@#$%</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

      </motion.div>
    </div>
  );
};
