import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from './Header';
import { PatternBackground } from './PatternBackground';

interface AppLayoutProps {
  activeView: string;
  onNavigate: (view: string) => void;
  headerTitle: string;
  headerSubtitle?: string;
  hasActiveProject: boolean;
  onClearProject: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  children: React.ReactNode;
}

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -10 },
};

const pageTransition: import('framer-motion').Transition = {
  type: 'tween',
  ease: 'easeOut',
  duration: 0.5,
};

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeView,
  onNavigate,
  hasActiveProject,
  onClearProject,
  searchQuery,
  onSearchChange,
  children,
}) => {
  return (
    <div className="flex flex-col min-h-screen bg-artitude-canvas relative overflow-hidden font-sans">
      <PatternBackground activeView={activeView} />

      <Header 
        activeView={activeView} 
        onNavigate={onNavigate} 
        hasActiveProject={hasActiveProject}
        onClearProject={onClearProject}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
      />
      
      <main className="flex-1 flex flex-col p-10 lg:p-16 relative z-10 w-full max-w-[1600px] mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            className="w-full h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
