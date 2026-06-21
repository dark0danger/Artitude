import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { login, register } from '../api';
import { CropMarks } from '../components/CropMarks';

interface AuthProps {
  onLoginSuccess: (username: string) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const res = await login(username.trim(), password);
        onLoginSuccess(res.username);
      } else {
        const res = await register(username.trim(), password);
        onLoginSuccess(res.username);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-artitude-canvas relative overflow-hidden px-4">
      {/* Background radial glow */}
      <div className="absolute w-[800px] h-[800px] rounded-full bg-gradient-to-br from-artitude-red/5 to-transparent blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md bg-white border border-[#1A1A1A]/10 p-12 relative overflow-visible shadow-2xl"
      >
        <CropMarks />

        {/* Logo/Branding */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-fraunces font-bold text-artitude-text tracking-wide mb-2">Artitude</h1>
          <p className="text-xs font-general font-medium text-artitude-muted uppercase tracking-widest">
            Brand Intelligence Workspace
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[#1A1A1A]/10 mb-8">
          <button
            onClick={() => {
              setIsLogin(true);
              setError('');
            }}
            className={`flex-1 pb-3 text-xs tracking-widest font-general font-semibold uppercase transition-colors relative ${
              isLogin ? 'text-artitude-red' : 'text-artitude-muted hover:text-artitude-text'
            }`}
          >
            Sign In
            {isLogin && (
              <motion.div
                layoutId="authTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-artitude-red"
              />
            )}
          </button>
          <button
            onClick={() => {
              setIsLogin(false);
              setError('');
            }}
            className={`flex-1 pb-3 text-xs tracking-widest font-general font-semibold uppercase transition-colors relative ${
              !isLogin ? 'text-artitude-red' : 'text-artitude-muted hover:text-artitude-text'
            }`}
          >
            Sign Up
            {!isLogin && (
              <motion.div
                layoutId="authTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-artitude-red"
              />
            )}
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. creative_director"
              className="w-full px-0 py-3 bg-transparent border-b-2 border-gray-100 focus:border-artitude-red outline-none transition-colors text-lg font-medium text-artitude-text placeholder:text-gray-300"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-0 py-3 bg-transparent border-b-2 border-gray-100 focus:border-artitude-red outline-none transition-colors text-lg font-medium text-artitude-text placeholder:text-gray-300"
              disabled={loading}
              required
            />
          </div>

          {/* Error Message */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-artitude-blush border-l-2 border-artitude-red text-xs text-artitude-red font-medium tracking-wide leading-relaxed overflow-hidden"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-artitude-text text-white text-xs font-bold tracking-widest uppercase hover:bg-artitude-red transition-colors disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full"
                />
                AUTHENTICATING...
              </>
            ) : isLogin ? (
              'SIGN IN'
            ) : (
              'CREATE ACCOUNT'
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};
