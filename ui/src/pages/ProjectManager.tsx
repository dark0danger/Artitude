import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchProjects, createProject, renameProject, deleteProject, type Project } from '../api';
import { CropMarks } from '../components/CropMarks';
import { Tooltip } from '../components/Tooltip';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants: import('framer-motion').Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

interface ProjectManagerProps {
  onSelectProject: (projectId: string) => void;
  searchQuery?: string;
  currentUser: string | null;
  onOpenAuth: () => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({ onSelectProject, searchQuery = '', currentUser, onOpenAuth }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects', err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    
    setIsCreating(true);
    try {
      const newProject = await createProject(newProjectName.trim());
      setProjects([...projects, newProject]);
      setNewProjectName('');
      onSelectProject(newProject.id);
    } catch (err) {
      console.error('Failed to create project', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRename = async (e: React.MouseEvent, projectId: string, currentName: string) => {
    e.stopPropagation();
    const newName = window.prompt("Enter new name for the project:", currentName);
    if (!newName || newName.trim() === '' || newName.trim() === currentName) return;
    
    try {
      const updated = await renameProject(projectId, newName.trim());
      setProjects(projects.map(p => p.id === projectId ? updated : p));
    } catch (err) {
      console.error('Failed to rename project', err);
      alert('Failed to rename project');
    }
  };

  const handleDelete = async (e: React.MouseEvent, projectId: string, projectName: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to permanently delete "${projectName}"? This action cannot be undone.`)) return;
    
    try {
      await deleteProject(projectId);
      setProjects(projects.filter(p => p.id !== projectId));
    } catch (err) {
      console.error('Failed to delete project', err);
      alert('Failed to delete project');
    }
  };

  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="w-full h-full pb-12 relative z-10">
      <motion.div initial="hidden" animate="show" variants={containerVariants} className="flex flex-col items-center">
        
        <motion.div variants={itemVariants} className="mb-16 text-center relative">
          <h2 className="text-5xl font-fraunces font-bold text-artitude-text mb-4 tracking-wide">Your Intelligence Campaigns</h2>
          <p className="text-xl text-artitude-muted max-w-2xl mx-auto font-general font-light">
            Select a project to access its dedicated brand guidelines and isolated design review workspace.
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className={`w-full max-w-4xl bg-transparent p-10 border border-[#1A1A1A]/10 border-l-4 border-l-artitude-red mb-16 relative overflow-visible group ${!currentUser ? 'opacity-50 pointer-events-none' : ''}`}>
          <CropMarks />
          <h3 className="text-2xl font-fraunces text-artitude-text mb-8 tracking-wide">Create New Project</h3>
          <form onSubmit={handleCreate} className="flex gap-6">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="e.g. Neon Coffee Rebrand..."
              className="flex-1 px-0 py-4 bg-transparent border-b-2 border-gray-200 focus:border-artitude-red outline-none transition-colors text-xl font-medium text-artitude-text placeholder:text-gray-300"
              disabled={isCreating || !currentUser}
            />
            <Tooltip content="Create Campaign" description="Generate a new isolated project database and guidelines store.">
              <motion.button
                whileHover={{ scale: 1.02, backgroundColor: "var(--color-artitude-redDark)" }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isCreating || !newProjectName.trim() || !currentUser}
                className="px-10 py-4 bg-artitude-red text-white font-bold text-lg uppercase tracking-wider transition-colors disabled:opacity-50 disabled:hover:bg-artitude-red"
              >
                {isCreating ? 'CREATING...' : 'CREATE PROJECT'}
              </motion.button>
            </Tooltip>
          </form>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 w-full max-w-7xl">
          {filteredProjects.map((project) => (
            <motion.div
              key={project.id}
              whileHover={{ y: -4 }}
              onClick={() => onSelectProject(project.id)}
              className="bg-transparent p-10 border border-[#1A1A1A]/10 cursor-pointer transition-all relative overflow-visible group min-h-[250px] flex flex-col justify-between"
            >
              <CropMarks />
              
              <div>
                <div className="w-16 h-16 bg-transparent border-2 border-artitude-text/20 text-artitude-text flex items-center justify-center font-fraunces font-bold text-3xl mb-8 group-hover:border-artitude-red group-hover:text-artitude-red transition-colors duration-300">
                  {project.name.charAt(0).toUpperCase()}
                </div>
                <h4 className="text-2xl font-fraunces text-artitude-text mb-3 group-hover:text-artitude-red transition-colors tracking-wide">
                  {project.name}
                </h4>
              </div>
              
              <div className="flex justify-between items-end relative z-10">
                <p className="text-xs font-mono text-artitude-muted tracking-widest uppercase">
                  CREATED {new Date(project.created_at).toLocaleDateString()}
                </p>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Tooltip content="Rename Campaign" description="Change the display name of this campaign.">
                    <button 
                      onClick={(e) => handleRename(e, project.id, project.name)}
                      className="p-2 text-artitude-text hover:text-artitude-red hover:bg-red-50 rounded"
                      title="Rename Project"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                  </Tooltip>
                  <Tooltip content="Delete Campaign" description="Permanently delete all reviews, assets, and guidelines associated with this project.">
                    <button 
                      onClick={(e) => handleDelete(e, project.id, project.name)}
                      className="p-2 text-artitude-text hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete Project"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </Tooltip>
                </div>
              </div>
            </motion.div>
          ))}

          {filteredProjects.length === 0 && (
            <div className="col-span-full text-center py-24 bg-transparent border-y border-[#1A1A1A]/10 w-full flex flex-col items-center gap-6">
              <p className="text-lg font-general font-light text-gray-400">
                {!currentUser 
                  ? "Sign in to view and create your intelligence campaigns."
                  : searchQuery 
                    ? "No projects match your search." 
                    : "No projects yet. Create one above to get started."}
              </p>
              {!currentUser && (
                <button
                  onClick={onOpenAuth}
                  className="px-8 py-3 bg-artitude-text text-white text-sm font-bold tracking-widest uppercase hover:bg-artitude-red transition-colors"
                >
                  Sign In to Continue
                </button>
              )}
            </div>
          )}
        </motion.div>

      </motion.div>
    </div>
  );
};
