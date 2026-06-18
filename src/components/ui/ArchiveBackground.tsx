"use client";

/* ───────────────────────────────────────────────────────────────────────────
   ArchiveBackground — the intelligence substrate. Coordinate grid, topographic
   contours, faint reticles and registration marks, and a slow satellite sweep.
   Nearly imperceptible; fixed; behind everything; pointer-events-none.
   ─────────────────────────────────────────────────────────────────────────── */

function Reticle({ className }: { className: string }) {
  return (
    <svg className={className} width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="var(--line-strong)">
      <circle cx="22" cy="22" r="13" strokeWidth="0.75" />
      <line x1="22" y1="2" x2="22" y2="14" strokeWidth="0.75" />
      <line x1="22" y1="30" x2="22" y2="42" strokeWidth="0.75" />
      <line x1="2" y1="22" x2="14" y2="22" strokeWidth="0.75" />
      <line x1="30" y1="22" x2="42" y2="22" strokeWidth="0.75" />
    </svg>
  );
}

export default function ArchiveBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-paper">
      {/* Fine coordinate grid */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(130% 100% at 50% 0%, black 35%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(130% 100% at 50% 0%, black 35%, transparent 100%)",
        }}
      />

      {/* Topographic contour lines — breathing */}
      <svg className="absolute inset-0 h-full w-full animate-breathe" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 900">
        <g fill="none" stroke="var(--line-strong)" strokeWidth="1">
          {[0, 36, 76, 120, 168, 220, 276, 336, 400].map((d, i) => (
            <path
              key={i}
              d={`M -50 ${240 + d} C 220 ${160 + d}, 420 ${340 + d}, 640 ${280 + d} S 1040 ${180 + d}, 1260 ${300 + d}`}
              opacity={0.32 - i * 0.025}
            />
          ))}
        </g>
      </svg>

      {/* Faint reticles — kept low and out of the content column */}
      <Reticle className="absolute left-[6%] top-[44%] opacity-20" />
      <Reticle className="absolute right-[8%] top-[70%] opacity-15" />

      {/* Slow satellite sweep */}
      <div className="archive-sweep absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal/25 to-transparent" />

      {/* Vignette toward paper keeps content legible */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-paper" />

      <style jsx>{`
        .archive-sweep {
          animation: archive-sweep 14s linear infinite;
        }
        @keyframes archive-sweep {
          0% { transform: translateY(0); opacity: 0; }
          8% { opacity: 1; }
          92% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .archive-sweep { animation: none; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
