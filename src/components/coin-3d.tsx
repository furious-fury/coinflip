"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useId, useRef, useState } from "react";

export type Coin3DProps = {
  tossing: boolean;
  outcome: "HEADS" | "TAILS" | null;
  /** Tap / click the coin to toss (e.g. same handler as the Toss button). */
  onCoinClick?: () => void;
  /** When true, clicks do nothing (e.g. tx in flight). */
  disableInteraction?: boolean;
};

const CoinScene = dynamic(() => import("./coin-scene").then((m) => m.CoinScene), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-[13.5rem] min-h-[12.5rem] w-full min-w-[280px] max-w-[22rem] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]"
      aria-hidden
    >
      <span className="text-xs text-cf-muted">Loading…</span>
    </div>
  ),
});

/**
 * Three.js coin (React Three Fiber): gold disc, heads/tails caps, toss + settle.
 */
export function Coin3D(props: Coin3DProps) {
  const { onCoinClick, disableInteraction, ...sceneProps } = props;
  const showResult = !props.tossing && props.outcome !== null;
  const interactive = Boolean(onCoinClick) && !disableInteraction;
  const labelId = useId();
  const [hover, setHover] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  /** Avoid duplicate toss when keyboard activation synthesizes a click (role="button"). */
  const skipNextClickRef = useRef(false);

  useEffect(() => {
    if (disableInteraction) setHover(false);
  }, [disableInteraction]);

  const spawnRipple = useCallback((clientX: number, clientY: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const id = performance.now();
    setRipples((prev) => [...prev, { id, x: clientX - r.left, y: clientY - r.top }]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((x) => x.id !== id));
    }, 780);
  }, []);

  const runTossFromPointer = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive || !onCoinClick) return;
      spawnRipple(e.clientX, e.clientY, e.currentTarget);
      onCoinClick();
    },
    [interactive, onCoinClick, spawnRipple],
  );

  const runTossFromKeyboard = useCallback(
    (el: HTMLDivElement) => {
      if (!interactive || !onCoinClick) return;
      skipNextClickRef.current = true;
      window.setTimeout(() => {
        skipNextClickRef.current = false;
      }, 0);
      const r = el.getBoundingClientRect();
      spawnRipple(r.left + r.width / 2, r.top + r.height / 2, el);
      onCoinClick();
    },
    [interactive, onCoinClick, spawnRipple],
  );

  return (
    <div className="relative mx-auto h-[13.5rem] w-full min-w-[280px] max-w-[22rem] px-3 sm:px-4">
      <div
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-labelledby={interactive ? labelId : undefined}
        className={`relative h-full w-full rounded-2xl ${
          interactive ? "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-cf-cyan/60" : ""
        }`}
        onPointerEnter={() => interactive && setHover(true)}
        onPointerLeave={() => setHover(false)}
        onClick={(e) => {
          if (skipNextClickRef.current) return;
          runTossFromPointer(e);
        }}
        onKeyDown={(e) => {
          if (!interactive) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            runTossFromKeyboard(e.currentTarget);
          }
        }}
      >
        {ripples.map((rip) => (
          <span
            key={rip.id}
            className="pointer-events-none absolute z-10 size-24 rounded-full bg-cf-cyan/25"
            style={{
              left: rip.x,
              top: rip.y,
              animation: "cf-coin-ripple 0.78s ease-out forwards",
            }}
            aria-hidden
          />
        ))}
        <CoinScene {...sceneProps} hover={hover && interactive} />
        <span id={labelId} className="sr-only">
          {props.tossing ? "Tossing coin" : showResult ? `Result ${props.outcome}` : "Coin ready"}
          {interactive ? ". Press Enter or Space, or click, to toss." : ""}
        </span>
      </div>
    </div>
  );
}
