import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
        >
          <div className="bg-artitude-text text-white px-8 py-4 shadow-[0_10px_30px_rgb(0,0,0,0.15)] flex items-center gap-4 border-l-4 border-artitude-red">
            <div className="text-artitude-red font-black text-xl">!</div>
            <p className="font-medium text-sm uppercase tracking-widest">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
