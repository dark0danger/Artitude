import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { fetchStats, fetchBrandKit, type DashboardStats, type BrandKit } from '../api';
import { CropMarks } from '../components/CropMarks';

const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const animation = animate(count, value, { duration: 0.8, ease: "easeOut" });
    return animation.stop;
  }, [value, count]);

  return <motion.span>{rounded}</motion.span>;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants: import('framer-motion').Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } }
};

interface DashboardProps {
  projectId: string;
  onNavigate: (view: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ projectId, onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats>({
    active_guidelines: 0,
    designs_reviewed: 0,
    enhancements_suggested: 0,
    brand_health_score: 0
  });
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchStats(projectId)
        .then(setStats)
        .catch((err) => console.error("Failed to load dashboard stats", err));
      fetchBrandKit(projectId)
        .then(setBrandKit)
        .catch((err) => console.error("Failed to load brand kit", err));
    }
  }, [projectId]);

  return (
    <div className="w-full h-full relative z-10">
      <motion.div initial="hidden" animate="show" variants={containerVariants} className="max-w-6xl mx-auto">
        
        <motion.div variants={itemVariants} className="flex justify-between items-end mb-16 border-b border-gray-200 pb-8">
          <div className="relative">
            <h2 className="text-5xl font-fraunces font-bold text-artitude-text tracking-normal">Brand Consistency & <br/><span className="text-artitude-red font-fraunces font-bold italic">Design Enhancement</span></h2>
            <p className="text-xl text-artitude-muted mt-4 font-general font-light">Your co-pilot for maintaining brand identity and elevating designs.</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('workspace')}
            className="bg-artitude-text text-white px-10 py-4 font-general font-medium text-sm tracking-widest hover:bg-black transition-colors"
          >
            REVIEW A DESIGN
          </motion.button>
        </motion.div>

        {/* Actionable Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          
          {/* Brand Health Trend */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-artitude-canvas p-8 relative overflow-visible group flex flex-col justify-between border border-[#1A1A1A]/10 h-64"
          >
            <CropMarks />
            <h4 className="text-xs font-general font-medium text-artitude-muted uppercase tracking-widest mb-4">Brand Health Trend</h4>
            
            <div className="flex-grow relative w-full mt-4 mb-4">
              {stats.recent_scores && stats.recent_scores.length > 1 ? (
                <svg width="100%" height="100%" viewBox="0 -5 100 40" preserveAspectRatio="none" className="overflow-visible text-artitude-red opacity-40 group-hover:opacity-100 transition-opacity duration-500">
                  <polyline 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    points={stats.recent_scores.map((val, i) => `${(i / Math.max(1, stats.recent_scores!.length - 1)) * 100},${30 - (val / 100) * 30}`).join(' ')} 
                    vectorEffect="non-scaling-stroke" 
                  />
                  {stats.recent_scores.map((val, i) => (
                    <circle 
                      key={i} 
                      cx={(i / Math.max(1, stats.recent_scores!.length - 1)) * 100} 
                      cy={30 - (val / 100) * 30} 
                      r="2" 
                      fill="currentColor" 
                    />
                  ))}
                </svg>
              ) : (
                <div className="w-full h-full flex items-center justify-center border border-dashed border-[#1A1A1A]/20 bg-[#1A1A1A]/5">
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest text-center px-4">Not enough historical data</span>
                </div>
              )}
            </div>
            
            <div className="flex items-end justify-between">
              <span className="text-sm font-mono text-artitude-text">LATEST SCORE</span>
              <div className="text-3xl font-mono font-bold text-artitude-red">
                {stats.designs_reviewed > 0 ? <><AnimatedNumber value={stats.brand_health_score} />/100</> : 'N/A'}
              </div>
            </div>
          </motion.div>

          {/* Most Recent Critique */}
          <motion.div 
            whileHover={{ y: -4 }}
            onClick={() => stats.last_review && onNavigate('workspace')}
            className={`bg-artitude-canvas p-8 relative overflow-visible group flex flex-col justify-between border border-[#1A1A1A]/10 h-64 ${stats.last_review ? 'cursor-pointer' : ''}`}
          >
            <CropMarks />
            <h4 className="text-xs font-general font-medium text-artitude-muted uppercase tracking-widest mb-4">Most Recent Critique</h4>
            
            {stats.last_review ? (
              <div className="flex flex-col justify-between h-full">
                <div className="mt-2">
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block mb-1">FILE</span>
                  <p className="text-lg font-general font-medium text-artitude-text truncate group-hover:text-artitude-red transition-colors">{stats.last_review.filename}</p>
                </div>
                <div className="mt-4 p-4 bg-artitude-blush/30 border-l-2 border-artitude-red">
                  <span className="text-[10px] font-mono text-artitude-red uppercase tracking-widest block mb-1">TOP ISSUE FLAGGED</span>
                  <p className="text-sm font-general text-artitude-text line-clamp-2 leading-relaxed">{stats.last_review.top_issue}</p>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex items-center justify-center">
                <span className="text-xs font-mono text-gray-400">NO REVIEWS YET</span>
              </div>
            )}
          </motion.div>

          {/* Needs Attention */}
          <motion.div 
            whileHover={{ y: -4 }}
            onClick={() => {
              if (stats.active_guidelines === 0 || brandKit?.is_stale) onNavigate('guidelines');
              else if (stats.designs_reviewed === 0) onNavigate('workspace');
            }}
            className="bg-artitude-canvas p-8 relative overflow-visible group flex flex-col justify-between border border-[#1A1A1A]/10 h-64 cursor-pointer hover:bg-[#1A1A1A]/5 transition-colors"
          >
            <CropMarks />
            <h4 className="text-xs font-general font-medium text-artitude-muted uppercase tracking-widest mb-4">Needs Attention</h4>
            
            <div className="flex-grow flex flex-col justify-center gap-4">
              {stats.active_guidelines === 0 ? (
                <>
                  <div className="text-artitude-red text-2xl font-fraunces">Missing Guidelines</div>
                  <p className="text-sm font-general text-artitude-text">Your project has no source-of-truth. Ingest brand guidelines to begin.</p>
                  <span className="text-xs font-mono text-artitude-red uppercase tracking-widest mt-2 group-hover:underline cursor-pointer">Go to Guidelines &rarr;</span>
                </>
              ) : brandKit?.is_stale ? (
                <>
                  <div className="text-yellow-600 text-2xl font-fraunces">Stale Brand Kit</div>
                  <p className="text-sm font-general text-artitude-text">Guidelines changed. Brand kit may be out of date — regenerate.</p>
                  <span className="text-xs font-mono text-yellow-600 uppercase tracking-widest mt-2 group-hover:underline cursor-pointer">Go to Guidelines &rarr;</span>
                </>
              ) : stats.designs_reviewed === 0 ? (
                <>
                  <div className="text-artitude-text text-2xl font-fraunces">Ready for Review</div>
                  <p className="text-sm font-general text-artitude-text">Guidelines are active. Run your first design critique.</p>
                  <span className="text-xs font-mono text-artitude-red uppercase tracking-widest mt-2 group-hover:underline cursor-pointer">Go to Workspace &rarr;</span>
                </>
              ) : (
                <>
                  <div className="text-artitude-text text-2xl font-fraunces">All Clear</div>
                  <p className="text-sm font-general text-artitude-text">No urgent issues flagged in your pipeline.</p>
                </>
              )}
            </div>
          </motion.div>

        </motion.div>

        <motion.div variants={itemVariants}>
          <h2 className="text-2xl font-fraunces text-artitude-text mb-8 tracking-wide">Recent Activity</h2>
          
          <div className="bg-transparent border border-artitude-text/10 p-20 flex items-center justify-center text-center relative overflow-hidden">
            <CropMarks />
            <div className="relative z-10">
              <h3 className="text-sm font-mono text-gray-400 tracking-widest uppercase">No Recent Activity</h3>
            </div>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
};
