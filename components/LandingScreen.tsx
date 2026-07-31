'use client';

import Image from 'next/image';
import { useAppState } from '@/context/AppStateContext';

export default function LandingScreen() {
  const { goToAuth } = useAppState();

  return (
    <div id="landing-view" className="landing-wrap">
      <Image src="/sencha-icon.png" alt="Sencha" width={132} height={132} priority className="brand-icon-full" />
      <h1 className="brand-wordmark">sencha</h1>
      <p className="brand-tagline">Your matcha pop-up hub</p>

      <p className="landing-blurb">
        Track your pop-up orders, inventory, and income — all in one place, built for the rush.
      </p>

      <button className="primary-btn" onClick={goToAuth}>
        Get started
      </button>
    </div>
  );
}
