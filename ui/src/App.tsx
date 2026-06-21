import { useState, useEffect } from 'react';
import { AppLayout } from './components/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { AnalysisWorkspace } from './pages/AnalysisWorkspace';
import { GuidelinesManager } from './pages/GuidelinesManager';
import { CompetitorsManager } from './pages/CompetitorsManager';
import { Guide } from './pages/Guide';
import { ProjectManager } from './pages/ProjectManager';
import { motion, AnimatePresence } from 'framer-motion';
import type { AIProvider } from './components/AISettingsPanel';
import { fetchCurrentUser, removeAuthToken, getAuthToken } from './api';
import { Auth } from './pages/Auth';

type ViewType = 'dashboard' | 'workspace' | 'guidelines' | 'competitors' | 'guide' | 'projects';

function App() {
  const [activeView, setActiveView] = useState<ViewType>('projects');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // AI settings — initialized from localStorage
  const [aiProvider, setAIProvider] = useState<AIProvider>(
    () => (localStorage.getItem('artitude_ai_provider') as AIProvider) || 'gpt4o'
  );
  const [gptKey, setGptKey] = useState(
    () => localStorage.getItem('artitude_gpt4o_key') || ''
  );
  const [geminiKey, setGeminiKey] = useState(
    () => localStorage.getItem('artitude_gemini_key') || ''
  );

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      fetchCurrentUser()
        .then((user) => {
          setCurrentUser(user.username);
          setAuthLoading(false);
        })
        .catch(() => {
          setAuthLoading(false);
        });
    } else {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    // dismiss the splash screen after 4s
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleLoginSuccess = (username: string) => {
    setCurrentUser(username);
  };

  const handleLogout = () => {
    removeAuthToken();
    setCurrentUser(null);
    setActiveProjectId(null);
    setActiveView('projects');
  };

  const handleSelectProject = (projectId: string | null) => {
    setActiveProjectId(projectId);
    if (projectId) {
      setActiveView('dashboard');
    } else {
      setActiveView('projects');
    }
  };

  const viewConfig = {
    projects: {
      title: 'Projects',
      subtitle: 'Manage your active brand intelligence campaigns.',
      component: <ProjectManager onSelectProject={handleSelectProject} searchQuery={searchQuery} />
    },
    dashboard: {
      title: 'Project Dashboard',
      subtitle: 'See how your brand is holding up.',
      component: activeProjectId ? <Dashboard projectId={activeProjectId} onNavigate={(v) => setActiveView(v as ViewType)} /> : null
    },
    workspace: {
      title: 'Design Review',
      subtitle: 'Drop a design draft here to get some AI feedback.',
      component: activeProjectId ? <AnalysisWorkspace projectId={activeProjectId} /> : null
    },
    guidelines: {
      title: 'Brand Guidelines',
      subtitle: 'Keep your brand rules in one place.',
      component: activeProjectId ? <GuidelinesManager projectId={activeProjectId} /> : null
    },
    competitors: {
      title: 'Competitors',
      subtitle: 'Track competitor brand identities to avoid collision.',
      component: activeProjectId ? <CompetitorsManager projectId={activeProjectId} /> : null
    },
    guide: {
      title: 'What is Artitude?',
      subtitle: 'Learn how to use Artitude in your daily design workflow.',
      component: <Guide />
    }
  };

  if (authLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-artitude-canvas">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-gray-200 border-t-artitude-red rounded-full mb-4"
        />
        <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">Verifying Session...</span>
      </div>
    );
  }

  if (!currentUser) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  const currentView = viewConfig[activeView] || viewConfig['projects'];

  return (
    <>
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-artitude-canvas overflow-hidden"
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.5, 2], opacity: [0, 1, 0] }}
              transition={{ duration: 3.5, ease: "easeOut" }}
              className="absolute w-[800px] h-[800px] rounded-full bg-gradient-to-br from-artitude-red/20 to-transparent blur-3xl pointer-events-none"
            />

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
              className="text-center relative z-10"
            >
              <h1 className="text-5xl md:text-7xl font-black text-artitude-text mb-6 tracking-tight uppercase">
                Welcome to Artitude
              </h1>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2, duration: 1 }}
              >
                <p className="text-2xl text-artitude-muted font-medium tracking-wide">
                  Your Premium Design Co-Pilot
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AppLayout
        activeView={activeView}
        onNavigate={(v) => setActiveView(v as ViewType)}
        headerTitle={currentView.title}
        headerSubtitle={currentView.subtitle}
        hasActiveProject={!!activeProjectId}
        onClearProject={() => handleSelectProject(null)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        aiProvider={aiProvider}
        onAIProviderChange={setAIProvider}
        gptKey={gptKey}
        onGptKeyChange={setGptKey}
        geminiKey={geminiKey}
        onGeminiKeyChange={setGeminiKey}
        currentUser={currentUser}
        onLogout={handleLogout}
      >
        {currentView.component}
      </AppLayout>
    </>
  );
}

export default App;
