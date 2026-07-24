'use client';

import { useAppState } from '@/context/AppStateContext';
import SenchaLogo from './icons/SenchaLogo';

export default function LandingScreen() {
  const { goToAuth } = useAppState();

  return (
    <div id="landing-view" className="landing-wrap">
      <SenchaLogo size={150} />
      <h1 className="brand-wordmark">sencha</h1>
      <p className="brand-tagline">your matcha pop-up hub</p>
      <div className="brand-divider">
        <span className="brand-divider-line" />
        <svg width="14" height="14" viewBox="0 0 54 54" fill="none">
          <path d="M27 6C14 10 8 22 12 34c3 9 12 14 18 14 2-14 1-30-3-42Z" fill="var(--sage)" />
          <path d="M27 6c13 4 19 16 15 28-3 9-12 14-18 14C22 34 23 18 27 6Z" fill="var(--mid)" />
        </svg>
        <span className="brand-divider-line" />
      </div>

      <p className="landing-blurb">
        Track your pop-up orders, inventory, and income — all in one place, built for the rush.
      </p>

      <button className="primary-btn" onClick={goToAuth}>
        Get started
      </button>
    </div>
  );
}
