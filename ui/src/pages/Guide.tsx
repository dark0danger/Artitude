import React from 'react';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 20 } }
};

export const Guide: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mx-auto h-full pb-20 relative z-10">
      <motion.div initial="hidden" animate="show" variants={containerVariants}>
        
        <motion.div variants={itemVariants} className="mb-16 text-center">
          <h2 className="text-5xl font-black text-artitude-text tracking-tight uppercase">What is Artitude?</h2>
          <p className="text-xl text-artitude-muted mt-6 max-w-2xl mx-auto font-light leading-relaxed">
            Artitude is an autonomous AI co-pilot designed for brand managers, art directors, and designers.{" "}
            It ensures that every design asset aligns perfectly with your brand's core identity.
          </p>
        </motion.div>

        <div className="space-y-12">
          
          <motion.section variants={itemVariants} className="bg-white p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-l-4 border-artitude-red relative group">
            <h3 className="text-3xl font-black text-artitude-text mb-6 uppercase tracking-tight">1. Ingest Brand Guidelines</h3>
            <p className="text-lg text-gray-600 mb-6 font-light leading-relaxed">
              Start by uploading your source-of-truth brand documentation (PDFs, Brand Books, Style Guides) into a Project's Guidelines manager.{" "}
              Artitude uses advanced Retrieval-Augmented Generation (RAG) to index every rule, color code, and typographic scale.
            </p>
            <div className="bg-gray-50 p-6 border border-gray-100 font-mono text-sm text-gray-500">
              [SYSTEM] Parsing typography... Indexed 'Outfit' as primary sans-serif.
            </div>
          </motion.section>

          <motion.section variants={itemVariants} className="bg-white p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-l-4 border-artitude-text relative group">
            <h3 className="text-3xl font-black text-artitude-text mb-6 uppercase tracking-tight">2. Upload Design Drafts</h3>
            <p className="text-lg text-gray-600 mb-6 font-light leading-relaxed">
              When a designer produces a new asset, upload it to the Design Review workspace. You can also provide specific instructions,{" "}
              like "Does this feel premium enough?"
            </p>
          </motion.section>

          <motion.section variants={itemVariants} className="bg-white p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-l-4 border-artitude-red relative group">
            <h3 className="text-3xl font-black text-artitude-text mb-6 uppercase tracking-tight">3. Multimodel Analysis</h3>
            <p className="text-lg text-gray-600 font-light leading-relaxed">
              Artitude looks at the image using Vision AI, retrieves the relevant brand rules from its database, and synthesizes a comprehensive review covering <strong>Brand Consistency</strong>, <strong>Market Collisions</strong>, and <strong>World-Class Enhancements</strong>.
            </p>
          </motion.section>

        </div>
      </motion.div>
    </div>
  );
};
