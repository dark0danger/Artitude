import React from 'react';
import { motion } from 'framer-motion';

interface PatternBackgroundProps {
  activeView: string;
}

export const PatternBackground: React.FC<PatternBackgroundProps> = ({ activeView }) => {
  const gridVariants = {
    projects: {
      scale: 1,
      rotate: 0,
      opacity: 0.6,
      transition: { type: 'spring' as const, stiffness: 50, damping: 20 }
    },
    dashboard: {
      scale: 1.1,
      rotate: 45,
      opacity: 0.4,
      transition: { type: 'spring' as const, stiffness: 50, damping: 20 }
    },
    workspace: {
      scale: 0.9,
      rotate: -15,
      opacity: 0.8,
      transition: { type: 'spring' as const, stiffness: 50, damping: 20 }
    },
    guidelines: {
      scale: 1.2,
      rotate: 180,
      opacity: 0.5,
      transition: { type: 'spring' as const, stiffness: 50, damping: 20 }
    },
    guide: {
      scale: 1.05,
      rotate: -45,
      opacity: 0.7,
      transition: { type: 'spring' as const, stiffness: 50, damping: 20 }
    }
  };

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-white">
      <motion.div
        className="absolute"
        style={{ top: '-100vh', left: '-100vw', width: '300vw', height: '300vh', originX: 0.5, originY: 0.5 }}
        variants={gridVariants}
        initial="projects"
        animate={activeView}
      >
        <svg width="100%" height="100%">
          <defs>
            <pattern
              id="technical-grid"
              width="60"
              height="60"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 60 0 L 0 0 0 60"
                fill="none"
                className="stroke-red-500/10"
                strokeWidth="1"
              />
            </pattern>
            <pattern
              id="dot-grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1" className="fill-red-500/20" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#technical-grid)" />
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
          
          <motion.circle
            cx="30%"
            cy="30%"
            r="15vw"
            fill="none"
            className="stroke-red-500/5"
            strokeWidth="2"
            animate={{
              scale: activeView === 'dashboard' ? 1.5 : 1,
              x: activeView === 'workspace' ? -50 : 0
            }}
            transition={{ type: 'spring', stiffness: 40, damping: 20 }}
          />
          <motion.rect
            x="60%"
            y="60%"
            width="20vw"
            height="20vw"
            fill="none"
            className="stroke-red-500/5"
            strokeWidth="1"
            animate={{
              rotate: activeView === 'projects' ? 0 : 45,
              y: activeView === 'guide' ? -100 : 0
            }}
            transition={{ type: 'spring', stiffness: 40, damping: 20 }}
          />
        </svg>
      </motion.div>
    </div>
  );
};
