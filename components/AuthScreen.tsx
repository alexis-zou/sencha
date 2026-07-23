'use client';

import { useState } from 'react';
import { useAppState } from '@/context/AppStateContext';

export default function AuthScreen() {
  const { authMode, setAuthMode, authError, signIn, signUp } = useAppState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit() {
    if (authMode === 'signup') {
      await signUp(email, password);
    } else {
      await signIn(email, password);
    }
    setEmail('');
    setPassword('');
  }

  return (
    <div id="auth-view" className="auth-wrap">
      <svg className="leaf-mark" viewBox="0 0 54 54" fill="none">
        <path d="M27 6C14 10 8 22 12 34c3 9 12 14 18 14 2-14 1-30-3-42Z" fill="#92AA58" />
        <path d="M27 6c13 4 19 16 15 28-3 9-12 14-18 14C22 34 23 18 27 6Z" fill="#6B7F3A" />
        <path d="M18 44C17 30 20 16 27 6" stroke="#455826" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <h1 className="auth-title">Matcha Stand</h1>
      <p className="auth-sub">Track your pop-up orders, inventory, and income.</p>

      <div className="auth-tabs">
        <button
          type="button"
          className={'auth-tab' + (authMode === 'signin' ? ' active' : '')}
          onClick={() => setAuthMode('signin')}
        >
          Sign In
        </button>
        <button
          type="button"
          className={'auth-tab' + (authMode === 'signup' ? ' active' : '')}
          onClick={() => setAuthMode('signup')}
        >
          Sign Up
        </button>
      </div>

      <div className="auth-form">
        <div className="field-group">
          <label className="field-label">Email</label>
          <input
            className="text-input"
            type="email"
            placeholder="you@example.com"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field-group">
          <label className="field-label">Password</label>
          <input
            className="text-input"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {authError && <div className="error-text">{authError}</div>}
        <button className="primary-btn" onClick={handleSubmit}>
          {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
        </button>
      </div>
      <p className="auth-note">
        Your account and events are stored only on this device — this is a lightweight sign-in for organizing your
        own pop-ups, not secure authentication.
      </p>
    </div>
  );
}
