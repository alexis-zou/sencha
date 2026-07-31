'use client';

import { useState } from 'react';
import Image from 'next/image';
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
      <Image src="/sencha-icon.png" alt="Sencha" width={64} height={64} priority />
      <h1 className="brand-wordmark auth-title">sencha</h1>
      <p className="brand-tagline">Your matcha pop-up hub</p>
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
