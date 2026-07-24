'use client';

import Image from 'next/image';
import { useAppState } from '@/context/AppStateContext';

export default function LandingScreen() {
  const { goToAuth } = useAppState();

  return (
    <div id="landing-view" className="landing-wrap">
      <Image src="/sencha-logo.png" alt="Sencha — your matcha pop-up hub" width={300} height={300} priority className="brand-logo-full" />

      <p className="landing-blurb">
        Track your pop-up orders, inventory, and income — all in one place, built for the rush.
      </p>

      <button className="primary-btn" onClick={goToAuth}>
        Get started
      </button>
    </div>
  );
}
