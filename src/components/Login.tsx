import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import logo from '../assets/LHGP_logo.jpeg';

interface LoginProps {
  onLogin: (email: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.endsWith('@laredo.tx.us')) {
      onLogin(email);
    } else {
      setError('Please use a department-authorized email address (@laredo.tx.us).');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-page p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid min-h-[550px] w-full max-w-[900px] overflow-hidden rounded-[24px] bg-app-card shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)] md:grid-cols-2"
      >
        <div className="flex flex-col justify-center p-8 md:p-12">
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-laredo-navy text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-laredo-navy">Secure Gateway</span>
            </div>
            <h1 className="mb-2 text-4xl font-light text-app-primary">
              Laredo <span className="font-semibold text-laredo-navy">Health Pulse</span>
            </h1>
            <p className="text-sm text-app-secondary">Public Health Department Management Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-laredo-navy px-4 py-4 text-base font-semibold text-white transition hover:brightness-110"
            >
              Access Portal <ArrowRight className="h-5 w-5" />
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-app-secondary-muted/70">
            Authorized Personnel Only. Restricted Access.
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
