import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  content: string;
  description?: string;
  children: React.ReactElement<any>;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ content, description, children, position = 'top' }) => {
  const [show, setShow] = useState(false);

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2.5';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2.5';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2.5';
      case 'top':
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2.5';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'bottom':
        return '-top-1 left-1/2 -translate-x-1/2 rotate-45 border-t border-l border-[#1A1A1A]/10 bg-[#1A1A1A]';
      case 'left':
        return '-right-1 top-1/2 -translate-y-1/2 rotate-45 border-t border-r border-[#1A1A1A]/10 bg-[#1A1A1A]';
      case 'right':
        return '-left-1 top-1/2 -translate-y-1/2 rotate-45 border-b border-l border-[#1A1A1A]/10 bg-[#1A1A1A]';
      case 'top':
      default:
        return '-bottom-1 left-1/2 -translate-x-1/2 rotate-45 border-b border-r border-[#1A1A1A]/10 bg-[#1A1A1A]';
    }
  };

  // Ensure children can listen to events
  const triggerElement = React.cloneElement(children, {
    onMouseEnter: (e: React.MouseEvent) => {
      if (children.props.onMouseEnter) children.props.onMouseEnter(e);
      setShow(true);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      if (children.props.onMouseLeave) children.props.onMouseLeave(e);
      setShow(false);
    },
    onFocus: (e: React.FocusEvent) => {
      if (children.props.onFocus) children.props.onFocus(e);
      setShow(true);
    },
    onBlur: (e: React.FocusEvent) => {
      if (children.props.onBlur) children.props.onBlur(e);
      setShow(false);
    }
  });

  return (
    <div className="relative inline-block">
      {triggerElement}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ 
              opacity: 0, 
              scale: 0.96, 
              y: position === 'top' ? 4 : position === 'bottom' ? -4 : 0,
              x: position === 'left' ? 4 : position === 'right' ? -4 : 0
            }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ 
              opacity: 0, 
              scale: 0.96,
              y: position === 'top' ? 4 : position === 'bottom' ? -4 : 0,
              x: position === 'left' ? 4 : position === 'right' ? -4 : 0
            }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute z-[100] w-64 p-3.5 bg-[#1A1A1A] text-white border border-white/10 rounded shadow-xl pointer-events-none text-left ${getPositionClasses()}`}
          >
            <div className="text-[10px] font-bold font-general text-artitude-red tracking-widest uppercase mb-1.5 leading-none">
              {content}
            </div>
            {description && (
              <div className="text-[10px] font-general text-gray-300 leading-normal font-light">
                {description}
              </div>
            )}
            
            {/* Indicator Arrow */}
            <div className={`absolute w-2 h-2 ${getArrowClasses()}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
