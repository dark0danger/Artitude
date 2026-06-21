import React from 'react';
import { motion } from 'framer-motion';

interface HeaderProps {
  activeView: string;
  onNavigate: (view: string) => void;
  hasActiveProject: boolean;
  onClearProject: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const navItems = [
  { id: 'projects', label: 'All Projects', requiresProject: false },
  { id: 'dashboard', label: 'Project Dashboard', requiresProject: true },
  { id: 'workspace', label: 'Design Review', requiresProject: true },
  { id: 'guidelines', label: 'Brand Guidelines', requiresProject: true },
  { id: 'competitors', label: 'Competitors', requiresProject: true },
  { id: 'guide', label: 'What is Artitude', requiresProject: false },
];

export const Header: React.FC<HeaderProps> = ({ activeView, onNavigate, hasActiveProject, onClearProject, searchQuery, onSearchChange }) => {
  return (
    <header className="sticky top-0 z-30 bg-artitude-canvas/90 backdrop-blur-sm border-b border-[#1A1A1A]/10">
      <div className="flex items-center px-10 py-4 h-20 max-w-[1600px] mx-auto w-full gap-10">
        {/* Left: Logo */}
        <div className="flex items-center shrink-0">
          <div className="flex items-center gap-2 cursor-pointer" onClick={onClearProject}>
            <h1 className="text-3xl font-fraunces font-bold text-artitude-text tracking-wide">Artitude</h1>
          </div>
        </div>

        {/* Center: Nav Items — take up available space */}
        <nav className="flex items-center gap-6 flex-1 min-w-0">
          {/* Back to Projects button — inline with nav tabs */}
          {hasActiveProject && (
            <div className="relative py-2 shrink-0">
              <button
                onClick={onClearProject}
                className="flex items-center gap-1.5 text-xs tracking-widest font-general font-medium uppercase transition-colors duration-300 text-artitude-muted hover:text-artitude-red"
                title="Back to Projects"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Projects
              </button>
            </div>
          )}
          {navItems.map((item) => {
            if (item.requiresProject && !hasActiveProject) return null;
            if (hasActiveProject && item.id === 'projects') return null;
            if (hasActiveProject && item.id === 'guide') return null;

            const isActive = activeView === item.id;
            return (
              <div key={item.id} className="relative py-2 shrink-0">
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`text-xs tracking-widest font-general font-medium uppercase transition-colors duration-300 whitespace-nowrap ${
                    isActive ? 'text-artitude-red' : 'text-artitude-muted hover:text-artitude-text'
                  }`}
                >
                  {item.label}
                </button>
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-artitude-red"
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                )}
              </div>
            );
          })}

          {/* Search — fixed width */}
          <div className="relative w-72 shrink-0">
            <input
              type="text"
              placeholder="Type to search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-transparent border-b border-[#1A1A1A]/10 focus:border-artitude-red outline-none py-1 text-artitude-text placeholder:text-gray-300 transition-colors text-xs font-general font-medium"
            />
          </div>
        </nav>
      </div>
    </header>
  );
};
