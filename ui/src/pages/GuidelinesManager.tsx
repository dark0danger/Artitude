import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CropMarks } from '../components/CropMarks';
import { fetchGuidelines, ingestGuideline, fetchBrandKit, deleteGuideline } from '../api';
import type { BrandKit } from '../api';
import { UploadDropzone } from '../components/UploadDropzone';
import { Tooltip } from '../components/Tooltip';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 20 } }
};

interface GuidelinesManagerProps {
  projectId: string;
}

export const GuidelinesManager: React.FC<GuidelinesManagerProps> = ({ projectId }) => {
  const [guidelines, setGuidelines] = useState<any[]>([]);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const loadData = async () => {
    try {
      const data = await fetchGuidelines(projectId);
      setGuidelines(data);
      const kit = await fetchBrandKit(projectId);
      setBrandKit(kit);
    } catch (err) {
      console.error("Failed to load guidelines/brand kit", err);
    }
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      await ingestGuideline(projectId, file);
      await loadData();
    } catch (err) {
      console.error("Failed to ingest guideline", err);
      alert("Failed to upload guideline.");
    } finally {
      setIsUploading(false);
    }
  };


  const requestDelete = (filename: string) => {
    setItemToDelete(filename);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteGuideline(projectId, itemToDelete);
      await loadData();
    } catch (err) {
      console.error("Failed to delete guideline", err);
      alert("Failed to delete guideline.");
    } finally {
      setItemToDelete(null);
    }
  };

  const cancelDelete = () => {
    setItemToDelete(null);
  };

  return (
    <div className="w-full h-full relative z-10">
      <motion.div initial="hidden" animate="show" variants={containerVariants} className="max-w-5xl mx-auto">
        
        <motion.div variants={itemVariants} className="mb-16 border-b border-[#1A1A1A]/10 pb-8 text-center">
          <h2 className="text-5xl font-fraunces font-bold text-artitude-text tracking-wide">Brand Guidelines</h2>
          <p className="text-xl text-artitude-muted mt-4 font-general font-light">
            Upload PDFs or Text files containing the source-of-truth brand documentation.
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-transparent border border-[#1A1A1A]/10 p-12 mb-16 relative overflow-visible group">
          <CropMarks />
          <h3 className="text-sm font-general font-medium text-artitude-text mb-8 uppercase tracking-widest">Ingest New Document</h3>
          
          <div className={`transition-opacity ${isUploading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <UploadDropzone onFileSelected={handleUpload} />
          </div>
          {isUploading && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm"
            >
              <div className="flex flex-col items-center">
                <motion.div 
                  animate={{ rotate: 360 }} 
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-12 h-12 border-4 border-gray-200 border-t-artitude-red rounded-full mb-4"
                />
                <span className="text-artitude-text font-bold uppercase tracking-widest text-sm">Processing & Indexing...</span>
              </div>
            </motion.div>
          )}
        </motion.div>

        <motion.div variants={itemVariants}>
          <h3 className="text-sm font-general font-medium text-artitude-text mb-4 uppercase tracking-widest">Active Corpus</h3>
          
          <div className="flex flex-col border-t border-[#1A1A1A]/10">
            {guidelines.map((g, i) => (
              <motion.div 
                key={i}
                className="flex items-center justify-between py-6 border-b border-[#1A1A1A]/10 group"
              >
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 flex items-center justify-center border border-artitude-text/20 text-artitude-text font-mono text-sm uppercase">
                    {g.filename.split('.').pop()?.toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-lg font-general font-medium text-artitude-text tracking-wide group-hover:text-artitude-red transition-colors">{g.filename}</h4>
                    <p className="text-xs font-mono text-gray-500 mt-1">
                      {(g.size_bytes / 1024 / 1024).toFixed(2)} MB • {new Date(g.modified_at * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="text-artitude-red font-mono text-xs uppercase tracking-widest">
                    [ INDEXED ]
                  </div>
                  <Tooltip content="Delete Guideline" description="Permanently remove this guideline file and update the brand kit compliance index.">
                    <button
                      onClick={() => requestDelete(g.filename)}
                      className="text-artitude-muted hover:text-artitude-red transition-colors"
                      title="Delete Guideline"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </Tooltip>
                </div>
              </motion.div>
            ))}

            {guidelines.length === 0 && (
              <div className="p-16 border-b border-[#1A1A1A]/10 text-center">
                <p className="text-sm font-mono text-gray-400">No guidelines ingested yet.</p>
              </div>
            )}
          </div>
        </motion.div>

        {brandKit && (
          <motion.div variants={itemVariants} className="mt-16 mb-16">
            <h3 className="text-sm font-general font-medium text-artitude-text mb-4 uppercase tracking-widest">Auto-Generated Brand Kit</h3>
            
            {brandKit.is_stale && (
              <div className="mb-6 p-4 border border-yellow-500/30 bg-yellow-500/5 flex items-center justify-between">
                <p className="text-sm font-general text-yellow-700">Brand kit may be out of date due to corpus changes. Please regenerate to ensure accuracy.</p>
              </div>
            )}
            
            <div className={`bg-transparent p-12 border border-[#1A1A1A]/10 relative overflow-visible grid grid-cols-1 md:grid-cols-2 gap-12 ${brandKit.is_stale ? 'opacity-60 grayscale-[50%]' : ''}`}>
              <CropMarks />
              
              <div>
                <h4 className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-6">Color Palette</h4>
                
                <div className="mb-6">
                  <h5 className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-3">Primary</h5>
                  <div className="flex flex-wrap gap-4">
                    {brandKit.primary_colors.map((color, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-2">
                        <div 
                          className="w-12 h-12 border border-[#1A1A1A]/20" 
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-[10px] font-mono text-artitude-text uppercase">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-3">Secondary</h5>
                  <div className="flex flex-wrap gap-4">
                    {brandKit.secondary_colors.map((color, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-2">
                        <div 
                          className="w-10 h-10 border border-[#1A1A1A]/20" 
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-[10px] font-mono text-artitude-text uppercase">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-10">
                  <h4 className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-6">Typography Hierarchy</h4>
                  <ul className="space-y-3">
                    {brandKit.typography.map((font, idx) => (
                      <li key={idx} className="text-lg font-fraunces text-artitude-text border-b border-[#1A1A1A]/10 pb-2">
                        {font}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-4">Clearance & Logo Rules</h4>
                  <p className="text-sm font-general text-gray-600 font-light leading-relaxed">
                    {brandKit.clearance_rules}
                  </p>
                </div>
              </div>

            </div>
          </motion.div>
        )}

      </motion.div>

      {/* Themed Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-artitude-canvas border border-[#1A1A1A]/10 p-10 max-w-lg w-full relative overflow-visible shadow-2xl"
          >
            <CropMarks />
            <h3 className="text-2xl font-fraunces text-artitude-text mb-4 tracking-wide">Confirm Deletion</h3>
            <p className="text-general text-artitude-text mb-8">
              Are you sure you want to permanently delete <span className="font-mono text-artitude-red font-bold">{itemToDelete}</span>? This may mark the auto-generated Brand Kit as stale.
            </p>
            <div className="flex gap-4 justify-end mt-8 border-t border-[#1A1A1A]/10 pt-6">
              <Tooltip content="Cancel" description="Close this dialog and keep the guideline file intact.">
                <button 
                  onClick={cancelDelete}
                  className="px-6 py-3 border border-[#1A1A1A]/10 text-artitude-text font-general font-medium uppercase tracking-widest text-xs hover:bg-[#1A1A1A]/5 transition-colors"
                >
                  Cancel
                </button>
              </Tooltip>
              <Tooltip content="Delete File" description="Confirm permanent deletion of this Brand Guideline file from the active index.">
                <button 
                  onClick={confirmDelete}
                  className="px-6 py-3 bg-artitude-red text-white font-general font-medium uppercase tracking-widest text-xs hover:bg-red-700 transition-colors"
                >
                  Delete File
                </button>
              </Tooltip>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};
