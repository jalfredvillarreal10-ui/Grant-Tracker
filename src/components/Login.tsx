import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

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
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f4f4f4',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      fontFamily: 'sans-serif'
    }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          maxWidth: '900px',
          width: '100%',
          backgroundColor: 'white',
          borderRadius: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          overflow: 'hidden',
          minHeight: '550px'
        }}
      >
        {/* Left Side: Form */}
        <div style={{ flex: 1, padding: '3rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ width: '32px', height: '32px', backgroundColor: '#002d62', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck style={{ color: 'white', width: '20px', height: '20px', margin: '6px' }} />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#002d62', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Secure Gateway</span>
            </div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 300, color: '#18181b', margin: '0 0 0.5rem 0' }}>
              Laredo <span style={{ fontWeight: 600, color: '#002d62' }}>Health Pulse</span>
            </h1>
            <p style={{ color: '#71717a', fontSize: '0.875rem' }}>Public Health Department Management Portal</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: '#a1a1aa', marginLeft: '0.25rem' }}>Department Email</label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa', width: '20px', height: '20px' }} />
                <input
                  type="email"
                  required
                  placeholder="name@laredo.tx.us"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  style={{
                    width: '100%',
                    padding: '1rem 1rem 1rem 3rem',
                    backgroundColor: '#f9f9f9',
                    border: '1px solid #e4e4e7',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: '#a1a1aa', marginLeft: '0.25rem' }}>Security Password</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa', width: '20px', height: '20px' }} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '1rem 1rem 1rem 3rem',
                    backgroundColor: '#f9f9f9',
                    border: '1px solid #e4e4e7',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ color: '#c8102e', fontSize: '0.875rem', fontWeight: 500 }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" style={{
              width: '100%',
              backgroundColor: '#002d62',
              color: 'white',
              padding: '1rem',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '1rem',
              transition: 'background 0.2s'
            }}>
              Access Portal <ArrowRight style={{ width: '20px', height: '20px' }} />
            </button>
          </form>

          <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#a1a1aa', textAlign: 'center' }}>
            Authorized Personnel Only. Restricted Access.
          </p>
        </div>

        {/* Right Side: Branding */}
        <div style={{ 
          flex: 1, 
          backgroundColor: '#002d62', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'flex-end',
          padding: '3rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Abstract background pattern */}
          <div style={{
            position: 'absolute',
            top: '-10%',
            right: '-10%',
            width: '100%',
            height: '100%',
            background: 'radial-gradient(circle, rgba(255,215,0,0.1) 0%, rgba(0,0,0,0) 70%)',
            pointerEvents: 'none'
          }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: '1.75rem', color: 'white', fontWeight: 300, margin: '0 0 1rem 0' }}>
              High-Security <span style={{ fontWeight: 600, color: '#ffd700' }}>Grant Lifecycle</span> Management
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', maxWidth: '300px' }}>
              Dedicated tools for tracking high-value healthcare funding opportunities for the City of Laredo.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
