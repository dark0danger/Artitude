import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadDropzoneProps {
  onFileSelected: (file: File) => void;
  selectedFileName?: string;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({ onFileSelected, selectedFileName }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelected(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [onFileSelected]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`relative w-full p-16 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer group bg-artitude-canvas overflow-hidden`}
    >
      <input
        type="file"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
        onChange={handleChange}
        accept=".pdf,.png,.jpg,.jpeg,.md,.txt"
      />
      
      {/* Lightbox Edge / Marching Ants */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <rect 
          width="100%" height="100%" fill="none" 
          stroke={isDragging ? 'var(--color-artitude-red)' : 'var(--color-artitude-text)'} 
          strokeWidth="2" 
          strokeDasharray="8 8" 
          className={`transition-colors duration-300 ${isDragging ? 'animate-marching-ants' : 'opacity-20 group-hover:opacity-40'}`} 
        />
      </svg>

      <div className="relative z-10">
        <div className="mb-4 text-4xl font-black text-artitude-text opacity-20 group-hover:opacity-40 group-hover:text-artitude-red transition-all">
          +
        </div>

        <div className="text-lg font-general font-medium text-artitude-text mb-2 uppercase tracking-tight">
          "Drag & drop a file here"
        </div>
        
        <p className="text-xs font-mono text-gray-400 uppercase tracking-widest mt-2">
          or click to browse
        </p>
      </div>

      {/* Red Stamp Overlay on Success */}
      <AnimatePresence>
        {selectedFileName && (
          <motion.div 
            initial={{ scale: 2, opacity: 0, rotate: -15 }}
            animate={{ scale: 1, opacity: 1, rotate: -5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute inset-0 bg-artitude-blush/90 backdrop-blur-sm z-30 flex items-center justify-center pointer-events-none"
          >
            <div className="border-4 border-artitude-red text-artitude-red font-mono font-bold text-3xl px-6 py-2 uppercase tracking-widest shadow-sm">
              [ RECEIVED ]
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
