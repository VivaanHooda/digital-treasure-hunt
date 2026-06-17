"use client";

import Particles from "./Particles";

/** Fixed full-screen animated particle backdrop used across pages. */
export function PageBackground() {
  return (
    <div className="fixed inset-0 -z-10 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Particles
        particleColors={["#01b2fe", "#22d3ee"]}
        particleCount={350}
        particleSpread={10}
        speed={0.15}
        particleBaseSize={90}
        alphaParticles={false}
        disableRotation={false}
        pixelRatio={1}
      />
    </div>
  );
}
