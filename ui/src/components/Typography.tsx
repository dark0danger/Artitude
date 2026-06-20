import React from 'react';
import { motion } from 'framer-motion';

interface EditorialHeadingProps {
  text: string;
  className?: string;
}

const container = {
  hidden: { opacity: 0 },
  visible: (i = 1) => ({
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.04 * i },
  }),
};

const child: import('framer-motion').Variants = {
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", damping: 12, stiffness: 100 },
  },
  hidden: {
    opacity: 0,
    y: 20,
    transition: { type: "spring", damping: 12, stiffness: 100 },
  },
};

export const EditorialHeading: React.FC<EditorialHeadingProps> = ({ text, className = "" }) => {
  const words = text.split(" ");

  return (
    <motion.h1
      className={`font-black text-4xl md:text-5xl text-artitude-text tracking-tight uppercase ${className}`}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {words.map((word, index) => (
        <motion.span variants={child} key={index} className="inline-block mr-2">
          {word}
        </motion.span>
      ))}
    </motion.h1>
  );
};
