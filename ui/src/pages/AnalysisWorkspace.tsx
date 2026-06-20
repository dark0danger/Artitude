import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { UploadDropzone } from '../components/UploadDropzone';
import { Toast } from '../components/Toast';
import type { AnalysisResponse } from '../api';
import { analyzeRequest, fetchGuidelines } from '../api';

interface AnalysisWorkspaceProps {
  projectId: string;
}

export const AnalysisWorkspace: React.FC<AnalysisWorkspaceProps> = ({ projectId }) => {
  const [query, setQuery] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [hasGuidelines, setHasGuidelines] = useState<boolean | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  const [finalReviewData, setFinalReviewData] = useState<AnalysisResponse | null>(null);
  const [threadId, setThreadId] = useState<string>('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setThreadId(crypto.randomUUID());
    setFinalReviewData(null);
    setLoadingProgress(0);
    setLoadingStage(0);
  }, [projectId]);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setImageUrl(null);
    }
  }, [file]);

  // check for guidelines on load
  useEffect(() => {
    let cancelled = false;
    fetchGuidelines(projectId)
      .then((guidelines) => {
        if (!cancelled) setHasGuidelines(guidelines.length > 0);
      })
      .catch(() => {
        if (!cancelled) setHasGuidelines(false);
      });
    return () => { cancelled = true; };
  }, [projectId]);



  const loadingStages = [
    'Uploading design draft...',
    'Extracting visual elements...',
    'Comparing against brand guidelines...',
    'Scanning market collisions...',
    'Generating enhancement suggestions...',
    'Compiling final report...'
  ];

  const startLoadingAnimation = () => {
    setLoadingProgress(0);
    setLoadingStage(0);
    let progress = 0;
    let stage = 0;
    
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    
    progressIntervalRef.current = setInterval(() => {
      // creep toward 90% but never fully get there until the result comes in
      progress += (90 - progress) * 0.02;
      setLoadingProgress(Math.min(progress, 92));
      
      // bump the stage text based on how far along we are
      const newStage = Math.min(Math.floor(progress / 16), loadingStages.length - 1);
      if (newStage !== stage) {
        stage = newStage;
        setLoadingStage(stage);
      }
    }, 200);
  };

  const stopLoadingAnimation = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setLoadingProgress(100);
  };

  // clean up on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const handleAnalyze = async (isRevision: boolean = false) => {
    if (!file) {
      setToastMessage("A design draft is required for review.");
      return;
    }
    
    // If it's a completely new review (not a revision), generate a new thread ID
    let currentThreadId = threadId;
    if (!isRevision && finalReviewData) {
      currentThreadId = crypto.randomUUID();
      setThreadId(currentThreadId);
    }

    setIsLoading(true);
    setFinalReviewData(null);
    startLoadingAnimation();
    
    try {
      await analyzeRequest(
        projectId, 
        query, 
        file, 
        currentThreadId,
        (_token) => {},
        (data) => {
          stopLoadingAnimation();
          setFinalReviewData(data);
        }
      );
    } catch (err: any) {
      stopLoadingAnimation();
      setToastMessage(err.message || "An error occurred during analysis.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-16 relative w-full h-full z-10">
      <Toast
        message={toastMessage}
        isVisible={!!toastMessage}
        onClose={() => setToastMessage('')}
      />



      {/* Left Panel: Configuration & Upload */}
      <motion.div
        initial={{ x: -30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25 }}
        className="w-full lg:w-1/3 flex flex-col gap-8"
      >
        <div className="bg-white p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative">
          {/* red accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-artitude-red" />

          {hasGuidelines === false && (
            <div className="mb-8 p-4 bg-red-50 border-l-4 border-artitude-red">
              <h4 className="font-bold text-artitude-red uppercase text-sm mb-1">No Brand Guidelines</h4>
              <p className="text-sm text-gray-600">
                You haven't uploaded any guidelines for this project. The AI will cap the consistency score at 50 and only provide general best-practice feedback.
              </p>
            </div>
          )}

          <h3 className="font-black text-4xl text-artitude-text mb-8 tracking-tight uppercase">Design Review</h3>
          
          <div className="mb-10">
            <label className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 block">Upload Draft</label>
            <UploadDropzone
              onFileSelected={(f) => setFile(f)}
              selectedFileName={file?.name}
            />
          </div>

          <div className="mb-10">
            <label className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 block">Feedback Request</label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full p-5 bg-transparent border-2 border-gray-100 text-artitude-text text-lg focus:outline-none focus:border-artitude-red resize-none h-40 transition-colors"
              placeholder="E.g., 'Does this feel premium enough?'"
            />
          </div>

          <div className="flex flex-col gap-4">
            <motion.button
              onClick={() => handleAnalyze(false)}
              disabled={isLoading || !file}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-5 bg-artitude-text text-white text-lg font-bold tracking-widest uppercase hover:bg-artitude-red transition-colors disabled:opacity-50"
            >
              {isLoading ? 'ANALYZING...' : 'REVIEW DESIGN'}
            </motion.button>

            {finalReviewData && (
              <motion.button
                onClick={() => handleAnalyze(true)}
                disabled={isLoading || !file}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-5 bg-white border-2 border-artitude-red text-artitude-red text-lg font-bold tracking-widest uppercase hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                SUBMIT V2 REVISION
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Right Panel: Results */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, type: 'spring', damping: 25 }}
        className="w-full lg:w-2/3"
      >
        {isLoading && !finalReviewData ? (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="bg-white p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-l-4 border-artitude-red min-h-[600px] relative overflow-hidden flex flex-col items-center justify-center"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-artitude-red/5 to-transparent rounded-full translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-artitude-red/3 to-transparent rounded-full -translate-x-1/2 translate-y-1/2" />
            
            {/* Pulsing icon */}
            <div className="mb-8">
              <span className="relative flex h-16 w-16">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-artitude-red opacity-20"></span>
                <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-artitude-red opacity-10" style={{ animationDelay: '0.5s' }}></span>
                <span className="relative inline-flex rounded-full h-16 w-16 bg-artitude-red/10 items-center justify-center">
                  <svg className="w-8 h-8 text-artitude-red animate-spin" style={{ animationDuration: '3s' }} fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
              </span>
            </div>

            <h2 className="text-3xl font-black text-artitude-text uppercase tracking-tight mb-3 text-center">
              Analyzing Design
            </h2>
            
            {/* Stage text */}
            <motion.p 
              key={loadingStage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-lg text-gray-400 font-light mb-10 text-center h-7"
            >
              {loadingStages[loadingStage]}
            </motion.p>

            {/* Progress bar */}
            <div className="w-full max-w-md">
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full rounded-full"
                  style={{ 
                    background: 'linear-gradient(90deg, #e63946 0%, #c1121f 50%, #e63946 100%)',
                    backgroundSize: '200% 100%',
                  }}
                  initial={{ width: '0%' }}
                  animate={{ 
                    width: `${loadingProgress}%`,
                    backgroundPosition: ['0% 0%', '100% 0%'],
                  }}
                  transition={{ 
                    width: { duration: 0.5, ease: 'easeOut' },
                    backgroundPosition: { duration: 2, repeat: Infinity, ease: 'linear' }
                  }}
                />
              </div>
              <div className="flex justify-between mt-3">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Progress</span>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{Math.round(loadingProgress)}%</span>
              </div>
            </div>
          </motion.div>
        ) : finalReviewData?.design_review && finalReviewData.design_review.brand_consistency ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
            
            {/* show the uploaded image with bounding box overlays */}
            {imageUrl && (
              <div className="bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative">
                <div className="relative inline-block w-full">
                  <img src={imageUrl} alt="Design Review" className="w-full h-auto block" />
                  
                  {/* consistency bounding boxes */}
                  {finalReviewData.design_review.brand_consistency.findings?.map((f, i) => {
                    if (!f.bounding_box) return null;
                    const [x, y, w, h] = f.bounding_box;
                    return (
                      <motion.div
                        key={`finding-${i}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1, duration: 0.4 }}
                        className={`absolute border-2 ${f.status === 'consistent' ? 'border-gray-400' : 'border-red-500'} cursor-crosshair group`}
                        style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }}
                      >
                        <div 
                          className={`absolute -top-8 left-0 ${f.status === 'consistent' ? 'bg-gray-800' : 'bg-red-500'} text-white text-xs font-bold px-3 py-1 uppercase tracking-widest whitespace-nowrap shadow-lg z-10`}
                        >
                          {f.element}
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* enhancement bounding boxes */}
                  {finalReviewData.design_review.enhancements.suggestions?.map((s, i) => {
                    if (!s.bounding_box) return null;
                    const [x, y, w, h] = s.bounding_box;
                    return (
                      <motion.div
                        key={`enhancement-${i}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: (finalReviewData.design_review.brand_consistency.findings?.length || 0) * 0.1 + i * 0.1, duration: 0.4 }}
                        className="absolute border-2 border-artitude-text cursor-crosshair group shadow-[0_0_15px_rgba(0,0,0,0.1)]"
                        style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }}
                      >
                        <div 
                          className="absolute -top-8 left-0 bg-artitude-text text-white text-xs font-bold px-3 py-1 uppercase tracking-widest whitespace-nowrap shadow-lg z-10"
                        >
                          {s.category}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Section 1: Brand Consistency */}
            <div className="bg-white p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-l-4 border-artitude-red relative group">
              <div className="flex justify-between items-end mb-10 pb-6 border-b-2 border-gray-100">
                <h2 className="text-4xl font-black text-artitude-text uppercase tracking-tight">
                  Brand Consistency
                </h2>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-400 uppercase tracking-widest block mb-1">SCORE</span>
                  <div className={`text-5xl font-black ${
                    finalReviewData.design_review.brand_consistency.consistency_score > 80 ? 'text-artitude-text' :
                    finalReviewData.design_review.brand_consistency.consistency_score > 50 ? 'text-artitude-text' :
                    'text-artitude-red'
                  }`}>
                    {finalReviewData.design_review.brand_consistency.consistency_score}
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                {finalReviewData.design_review.brand_consistency.findings?.map((finding, i) => (
                  <motion.div whileHover={{ x: 5 }} key={i} className="flex flex-col gap-2 p-6 border border-gray-100 hover:border-artitude-red/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-artitude-text text-xl uppercase tracking-wider">{finding.element}</h4>
                      <span className={`text-xs font-black px-4 py-1 uppercase tracking-widest border-2 ${
                         finding.status === 'consistent' ? 'border-gray-200 text-gray-500' :
                         finding.status === 'inconsistent' ? 'border-artitude-red text-artitude-red' :
                         'border-artitude-text text-artitude-text'
                      }`}>{finding.status}</span>
                    </div>
                    <p className="text-lg text-gray-600 font-light mt-2">{finding.detail}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Section 2: Market Collision */}
            <div className="bg-white p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-artitude-text/5 to-transparent rounded-full translate-x-1/2 -translate-y-1/2" />
              
              <h2 className="text-4xl font-black text-artitude-text mb-10 pb-6 border-b-2 border-gray-100 uppercase tracking-tight">
                Market Collision
              </h2>
              {finalReviewData.design_review.market_collision.collisions && finalReviewData.design_review.market_collision.collisions.length > 0 ? (
                <div className="space-y-6">
                  {finalReviewData.design_review.market_collision.collisions.map((collision, i) => (
                    <motion.div whileHover={{ x: 5 }} key={i} className="p-8 border-l-4 border-artitude-red bg-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-black text-artitude-red text-2xl uppercase tracking-tight">COLLISION: {collision.brand_name}</h4>
                        <span className="text-xs font-black text-white bg-artitude-red px-4 py-1 uppercase tracking-widest">
                          {collision.risk_level} RISK
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">SIMILARITY: {collision.similarity_aspect}</p>
                      <p className="text-lg text-gray-600 font-light">{collision.detail}</p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-10 border-2 border-dashed border-gray-200 text-center">
                  <span className="text-xl font-light text-gray-400">NO MARKET COLLISIONS DETECTED.</span>
                </div>
              )}
            </div>

            {/* Section 3: Enhancements */}
            <div className="bg-white p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
              <h2 className="text-4xl font-black text-artitude-text mb-10 pb-6 border-b-2 border-gray-100 uppercase tracking-tight">
                Enhancements
              </h2>
              <div className="grid gap-6">
                {finalReviewData.design_review.enhancements.suggestions?.map((suggestion, i) => (
                  <motion.div whileHover={{ scale: 1.01 }} key={i} className="p-8 border border-gray-100 flex flex-col hover:shadow-lg transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-black text-artitude-red uppercase tracking-widest">{suggestion.category}</span>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{suggestion.impact} IMPACT</span>
                    </div>
                    <p className="text-xl text-artitude-text font-light leading-relaxed">{suggestion.suggestion}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {!finalReviewData.validation_passed && (
              <div className="mt-8 p-8 border-2 border-artitude-red">
                <h4 className="font-black text-artitude-red mb-2 text-2xl uppercase">Validation Warning</h4>
                <p className="text-lg text-gray-600">The model returned an incomplete structure.</p>
                {finalReviewData.errors.length > 0 && (
                  <ul className="list-square pl-6 text-artitude-red mt-4 font-mono text-sm">
                    {finalReviewData.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}
          </motion.div>
        ) : (
          <div className="h-full min-h-[600px] flex items-center justify-center p-12 border-2 border-dashed border-gray-200 bg-white/50 backdrop-blur-sm">
            <div className="text-center relative">
              <h3 className="text-4xl font-black text-artitude-text uppercase tracking-tight mb-4">Awaiting Upload</h3>
              <p className="text-xl text-gray-400 font-light max-w-md mx-auto">
                Provide a design draft on the left. The AI will evaluate brand alignment and suggest artistic refinements.
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
