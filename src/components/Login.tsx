import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, ShieldCheck, User } from 'lucide-react';
import logo from '../assets/LHGP_logo.jpeg';

interface LoginProps {
  onLogin: (email: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.endsWith('@laredo.tx.us')) {
      setError('Please use a department-authorized email address (@laredo.tx.us).');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // In a real app, we would handle signup/login API calls here
    onLogin(email);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-page p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid min-h-[600px] w-full max-w-[950px] overflow-hidden rounded-[24px] bg-app-card shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)] md:grid-cols-2"
      >
        <div className="flex flex-col justify-center p-8 md:p-12">
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-laredo-navy text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-laredo-navy">
                {isLogin ? 'Secure Gateway' : 'New Account Registration'}
              </span>
            </div>
            <h1 className="mb-2 text-4xl font-light text-app-primary">
              Laredo <span className="font-semibold text-laredo-navy">Health Pulse</span>
            </h1>
            <p className="text-sm text-app-secondary">Public Health Department Management Portal</p>
          </div>

          <div className="mb-8 flex gap-8 border-b border-app-border">
            <button
              onClick={() => {
                setIsLogin(true);
                setError(null);
              }}
              className={`pb-3 text-lg font-bold transition-colors ${
                isLogin ? 'border-b-[3px] border-laredo-navy text-laredo-navy' : 'text-app-secondary-muted hover:text-app-primary'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError(null);
              }}
              className={`pb-3 text-lg font-bold transition-colors ${
                !isLogin ? 'border-b-[3px] border-laredo-navy text-laredo-navy' : 'text-app-secondary-muted hover:text-app-primary'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  key="name-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col gap-2"
                >
                  <label className="ml-1 text-xs font-semibold uppercase text-app-secondary-muted/70">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-app-secondary-muted/70" />
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-app-border bg-app-muted px-4 py-4 pl-12 text-base text-app-primary outline-none transition-colors placeholder:text-app-secondary-muted/70 focus:border-laredo-navy focus:bg-app-card"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-2">
              <label className="ml-1 text-xs font-semibold uppercase text-app-secondary-muted/70">Department Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-app-secondary-muted/70" />
                <input
                  type="email"
                  required
                  placeholder="name@laredo.tx.us"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  className="w-full rounded-xl border border-app-border bg-app-muted px-4 py-4 pl-12 text-base text-app-primary outline-none transition-colors placeholder:text-app-secondary-muted/70 focus:border-laredo-navy focus:bg-app-card"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="ml-1 text-xs font-semibold uppercase text-app-secondary-muted/70">Security Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-app-secondary-muted/70" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-app-border bg-app-muted px-4 py-4 pl-12 text-base text-app-primary outline-none transition-colors placeholder:text-app-secondary-muted/70 focus:border-laredo-navy focus:bg-app-card"
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  key="confirm-password-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col gap-2"
                >
                  <label className="ml-1 text-xs font-semibold uppercase text-app-secondary-muted/70">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-app-secondary-muted/70" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-app-border bg-app-muted px-4 py-4 pl-12 text-base text-app-primary outline-none transition-colors placeholder:text-app-secondary-muted/70 focus:border-laredo-navy focus:bg-app-card"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-sm font-medium text-red-700"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-laredo-navy px-6 py-5 text-xl font-bold text-white transition hover:brightness-110 shadow-lg"
            >
              {isLogin ? 'Access Portal' : 'Create Account'} <ArrowRight className="h-6 w-6" />
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-app-secondary-muted/70">
            {isLogin 
              ? 'Authorized Personnel Only. Restricted Access.' 
              : 'By creating an account, you agree to the Department Security Policies.'}
          </p>
        </div>

        <div className="relative flex flex-col justify-end overflow-hidden bg-laredo-navy p-8 md:p-12">
          <div className="pointer-events-none absolute -right-[10%] -top-[10%] h-full w-full bg-[radial-gradient(circle,rgba(255,215,0,0.1)_0%,rgba(0,0,0,0)_70%)]" />

          <div className="relative z-10 flex flex-1 items-center justify-center">
            <div className="overflow-hidden rounded-2xl border-2 border-[#C5B358] shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
              <img
                src={logo}
                alt="Laredo Public Health Logo"
                className="block w-full max-w-[300px]"
              />
            </div>
          </div>

          <div className="relative z-10">
            <h2 className="mb-4 text-[1.75rem] font-light text-white">
              High-Security <span className="font-semibold text-laredo-gold">Grant Lifecycle</span> Management
            </h2>
            <p className="max-w-[300px] text-sm text-white/60">
              Dedicated tools for tracking high-value healthcare funding opportunities for the City of Laredo.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
