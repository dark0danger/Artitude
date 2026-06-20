import React from 'react';
import { motion } from 'framer-motion';

interface PlaceholderViewProps {
  title: string;
  icon: React.ReactNode;
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({ title, icon }) => {
  return (
    <div className="flex items-center justify-center h-[70vh]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center bg-white p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 max-w-md w-full"
      >
        <div className="w-16 h-16 bg-artitude-blush text-artitude-red flex items-center justify-center mx-auto mb-6">
          {icon}
        </div>
        <h2 className="text-2xl font-bold text-artitude-text mb-2">{title}</h2>
        <p className="text-artitude-muted mb-8">This module is currently in development and will be available in a future update.</p>
        <button className="px-6 py-2.5 bg-gray-100 text-artitude-text font-medium hover:bg-gray-200 transition-colors">
          Return to Dashboard
        </button>
      </motion.div>
    </div>
  );
};
