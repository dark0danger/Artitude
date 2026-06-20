import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EvidenceCardProps {
  id: string;
  title: string;
  snippet: string;
  score: number;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({ id, title, snippet, score }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.div
        layoutId={`card-container-${id}`}
        onClick={() => setIsOpen(true)}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        className="bg-white p-6 border border-gray-100 cursor-pointer hover:border-artitude-red transition-all group"
      >
        <motion.div layoutId={`card-header-${id}`} className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="font-black text-artitude-red uppercase text-sm tracking-widest">[ EVIDENCE ]</div>
            <h4 className="text-sm font-bold text-artitude-text uppercase">{title}</h4>
          </div>
          <span className="text-xs font-black text-white bg-artitude-red px-3 py-1 uppercase tracking-widest">
            {(score * 100).toFixed(0)}%
          </span>
        </motion.div>
        <motion.p layoutId={`card-content-${id}`} className="text-sm text-gray-500 font-light leading-relaxed line-clamp-3">
          {snippet}
        </motion.p>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 cursor-pointer"
            />
            <motion.div
              layoutId={`card-container-${id}`}
              className="bg-white p-12 border-2 border-artitude-red shadow-2xl w-full max-w-3xl relative z-10"
            >
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-8 right-8 font-black text-xl text-artitude-text hover:text-artitude-red transition-colors uppercase tracking-widest"
              >
                [ CLOSE ]
              </button>
              <motion.div layoutId={`card-header-${id}`} className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
                <div className="flex flex-col gap-2">
                  <div className="font-black text-artitude-red uppercase tracking-widest">[ EVIDENCE ]</div>
                  <h3 className="text-3xl font-black text-artitude-text uppercase tracking-tight">{title}</h3>
                </div>
                <span className="text-sm font-black text-white bg-artitude-red px-4 py-2 uppercase tracking-widest">
                  {(score * 100).toFixed(0)}% MATCH
                </span>
              </motion.div>
              <motion.div layoutId={`card-content-${id}`} className="text-gray-700 leading-relaxed font-light text-lg">
                <p>{snippet}</p>
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">System Context</h5>
                  <p className="text-sm text-gray-500 font-light">Additional context mapping from the vector database occurs in this namespace.</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
