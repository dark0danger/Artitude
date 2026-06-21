import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from './Header';
import { PatternBackground } from './PatternBackground';
import { AISettingsPanel } from './AISettingsPanel';
import type { AIProvider } from './AISettingsPanel';

interface AppLayoutProps {
  activeView: string;
  onNavigate: (view: string) => void;
  headerTitle: string;
  headerSubtitle?: string;
  hasActiveProject: boolean;
  onClearProject: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  aiProvider: AIProvider;
  onAIProviderChange: (provider: AIProvider) => void;
  gptKey: string;
  onGptKeyChange: (key: string) => void;
  geminiKey: string;
  onGeminiKeyChange: (key: string) => void;
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

const getMaxWidthClass = (view: string) => {
  switch (view) {
    case 'dashboard': return 'max-w-6xl mx-auto';
    case 'competitors': return 'max-w-6xl mx-auto';
    case 'guidelines': return 'max-w-5xl mx-auto';
    case 'workspace': return 'w-full';
    default: return 'max-w-6xl mx-auto';
  }
};

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeView,
  onNavigate,
  hasActiveProject,
  onClearProject,
  searchQuery,
  onSearchChange,
  aiProvider,
  onAIProviderChange,
  gptKey,
  onGptKeyChange,
  geminiKey,
  onGeminiKeyChange,
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
        {/* AI Settings — inline in page content, only when inside a project */}
        {hasActiveProject && (
          <div className={`mb-6 w-full ${getMaxWidthClass(activeView)}`}>
            <AISettingsPanel
              provider={aiProvider}
              onProviderChange={onAIProviderChange}
              gptKey={gptKey}
              onGptKeyChange={onGptKeyChange}
              geminiKey={geminiKey}
              onGeminiKeyChange={onGeminiKeyChange}
            />
          </div>
        )}

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
