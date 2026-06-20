import React from 'react';

export const CropMarks: React.FC = () => {
  const markClass = "absolute w-3 h-3 text-artitude-text opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none";
  return (
    <>
      {/* Top Left */}
      <svg className={`${markClass} -top-1.5 -left-1.5`} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 0V16M0 8H16" stroke="currentColor" strokeWidth="0.75" />
      </svg>
      {/* Top Right */}
      <svg className={`${markClass} -top-1.5 -right-1.5`} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 0V16M0 8H16" stroke="currentColor" strokeWidth="0.75" />
      </svg>
      {/* Bottom Left */}
      <svg className={`${markClass} -bottom-1.5 -left-1.5`} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 0V16M0 8H16" stroke="currentColor" strokeWidth="0.75" />
      </svg>
      {/* Bottom Right */}
      <svg className={`${markClass} -bottom-1.5 -right-1.5`} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 0V16M0 8H16" stroke="currentColor" strokeWidth="0.75" />
      </svg>
    </>
  );
};
