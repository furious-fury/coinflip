"use client";

/**
 * Decorative background shapes: float + small pseudo-random wander. Visual only.
 */
export function ConfettiBackdrop() {
  type Piece = {
    className: string;
    delay: string;
    duration: number;
    wanderDuration: number;
    drift: 0 | 1 | 2 | 3 | 4;
    content?: string;
  };

  const pieces: Piece[] = [
    { className: "left-[8%] top-[12%] h-3 w-3 rounded-full border-2 border-cf-cyan/70", delay: "0s", duration: 7, wanderDuration: 11, drift: 0 },
    { className: "left-[18%] top-[28%] h-2 w-2 rounded-full bg-cf-magenta/80", delay: "0.5s", duration: 8, wanderDuration: 10, drift: 1 },
    { className: "right-[12%] top-[10%] h-4 w-4 rotate-45 border border-cf-blue/60", delay: "1.2s", duration: 9, wanderDuration: 12, drift: 2 },
    { className: "right-[22%] top-[32%] text-sm text-white/50", delay: "0.3s", duration: 7, wanderDuration: 9, drift: 3, content: "✦" },
    { className: "left-[6%] top-[48%] text-lg text-cf-magenta/60", delay: "0.8s", duration: 8, wanderDuration: 13, drift: 4, content: "×" },
    { className: "right-[8%] top-[52%] h-2.5 w-2.5 rounded-full bg-cf-cyan/60", delay: "1.5s", duration: 9, wanderDuration: 10, drift: 0 },
    { className: "left-[14%] bottom-[18%] h-3 w-3 rotate-12 border border-white/25", delay: "0.2s", duration: 7, wanderDuration: 11, drift: 1 },
    { className: "right-[18%] bottom-[22%] text-sm text-cf-blue/55", delay: "1s", duration: 8, wanderDuration: 12, drift: 2, content: "△" },
    { className: "left-[42%] top-[8%] h-1.5 w-1.5 rounded-full bg-white/50", delay: "0.6s", duration: 10, wanderDuration: 14, drift: 3 },
    { className: "right-[40%] bottom-[12%] h-2 w-2 rounded-full border border-cf-magenta/50", delay: "1.8s", duration: 7, wanderDuration: 9, drift: 4 },
  ];

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div
        className="cf-bg-sunburst absolute left-[10%] top-[8%] h-8 w-8 opacity-25"
        style={{
          background:
            "repeating-conic-gradient(from 0deg, white 0deg 8deg, transparent 8deg 20deg)",
        }}
      />
      {pieces.map((p, i) => (
        <div
          key={i}
          className={`absolute flex items-center justify-center ${p.className}`}
          style={{
            animation: `cf-float ${p.duration}s ease-in-out infinite`,
            animationDelay: p.delay,
          }}
        >
          <div
            className="flex h-full w-full items-center justify-center will-change-transform"
            style={{
              animation: `cf-bg-drift-${p.drift} ${p.wanderDuration}s ease-in-out infinite`,
              animationDelay: p.delay,
            }}
          >
            {p.content}
          </div>
        </div>
      ))}
    </div>
  );
}
