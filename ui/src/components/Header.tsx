import React from 'react';
import { motion } from 'framer-motion';


interface HeaderProps {
  activeView: string;
  onNavigate: (view: string) => void;
  hasActiveProject: boolean;
  onClearProject: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currentUser: string | null;
  onLogout: () => void;
  onOpenAuth: () => void;
}

const navItems = [
  { id: 'projects', label: 'All Projects', requiresProject: false },
  { id: 'dashboard', label: 'Project Dashboard', requiresProject: true },
  { id: 'workspace', label: 'Design Review', requiresProject: true },
  { id: 'guidelines', label: 'Brand Guidelines', requiresProject: true },
  { id: 'competitors', label: 'Competitors', requiresProject: true },
  { id: 'guide', label: 'What is Artitude', requiresProject: false },
];

const navTooltips: Record<string, { label: string; desc: string }> = {
  projects: { label: "Campaigns Overview", desc: "View and configure all brand intelligence campaigns." },
  dashboard: { label: "Brand Dashboard", desc: "Analyze consistency score trends and critical brand stats." },
  workspace: { label: "Design Critique", desc: "Upload asset mockups and request real-time AI compliance feedback." },
  guidelines: { label: "Guidelines Manager", desc: "Ingest and structure PDF/text style guidelines for AI compliance." },
  competitors: { label: "Competitor Tracker", desc: "Scrape competitor sites and index their colors and typefaces." },
  guide: { label: "Guide & Workflow", desc: "Learn how to use Artitude in your daily design process." },
};

export const Header: React.FC<HeaderProps> = ({ 
  activeView, 
  onNavigate, 
  hasActiveProject, 
  onClearProject, 
  searchQuery, 
  onSearchChange,
  currentUser,
  onLogout,
  onOpenAuth
}) => {
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
            const tool = navTooltips[item.id] || { label: item.label, desc: "" };

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

          {/* User Profile & Logout */}
          {currentUser ? (
            <div className="flex items-center gap-3 pl-4 border-l border-[#1A1A1A]/10 shrink-0 ml-auto">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-general font-bold text-artitude-text truncate max-w-24 leading-none mb-0.5">
                  {currentUser}
                </span>
                <span className="text-[8px] font-mono text-gray-400 uppercase tracking-widest leading-none">
                  Authenticated
                </span>
              </div>
                <button
                  onClick={onLogout}
                  className="w-8 h-8 rounded-full border border-artitude-text/10 text-artitude-muted hover:text-artitude-red hover:border-artitude-red/20 flex items-center justify-center transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                  </svg>
                </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 pl-4 border-l border-[#1A1A1A]/10 shrink-0 ml-auto">
                <button
                  onClick={onOpenAuth}
                  className="px-6 py-2 bg-artitude-text text-white text-xs font-bold tracking-widest uppercase hover:bg-artitude-red transition-colors"
                >
                  Sign In
                </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
