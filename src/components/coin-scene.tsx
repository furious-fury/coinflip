"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Html } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export type CoinSceneProps = {
  tossing: boolean;
  outcome: "HEADS" | "TAILS" | null;
  /** Pointer is over the coin hit area (wrapper-driven). */
  hover?: boolean;
};

/** Radius / thickness — typical coin-like proportion (~2mm on ~24mm). */
const R = 1.05;
const H = 0.055;

function lerpShortestAngle(from: number, to: number, t: number): number {
  let diff = to - from;
  diff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI;
  diff = diff < -Math.PI ? diff + Math.PI * 2 : diff;
  return from + diff * t;
}

function faceTexture(letter: string, headSide: boolean): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const cx = 256;
  const cy = 256;
  const outerR = 248;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.clip();

  const base = headSide
    ? ["#fff8d8", "#ffd34a", "#e8a010", "#8a5208"]
    : ["#f0d090", "#d49820", "#a06808", "#5a3804"];
  const grd = ctx.createRadialGradient(cx - 70, cy - 90, 20, cx, cy, 230);
  grd.addColorStop(0, base[0]);
  grd.addColorStop(0.35, base[1]);
  grd.addColorStop(0.72, base[2]);
  grd.addColorStop(1, base[3]);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR - 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR - 10, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();

  ctx.fillStyle = headSide ? "#1a0a2e" : "#fff8ee";
  ctx.font = "bold 200px system-ui, Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(letter, cx, cy + 6);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Outer group: -90° X so cylinder axis aligns with +Z — **heads (+Y in mesh space) faces the camera (+Z)**.
 * Inner group: rx=0 heads, rx=π tails; toss spins all axes.
 */
function CoinMesh({ tossing, outcome, hover = false }: CoinSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const hoverSmoothed = useRef(0);
  const scaleSmoothed = useRef(1);
  const headTex = useMemo(() => faceTexture("H", true), []);
  const tailTex = useMemo(() => faceTexture("T", false), []);

  useEffect(() => {
    return () => {
      headTex.dispose();
      tailTex.dispose();
    };
  }, [headTex, tailTex]);

  const tossingRef = useRef(tossing);
  const outcomeRef = useRef(outcome);
  useEffect(() => {
    tossingRef.current = tossing;
    outcomeRef.current = outcome;
  }, [tossing, outcome]);

  const spinScale = useRef(1);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => {
      spinScale.current = mq.matches ? 0.35 : 1;
    };
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  const smooth = (delta: number, k: number) => 1 - Math.pow(k, 1 / (delta * 60));

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;

    const breath = Math.sin(performance.now() / 1100) * 0.012;
    const targetHover = hover ? 1 : 0;
    hoverSmoothed.current += (targetHover - hoverSmoothed.current) * (1 - Math.pow(0.82, delta * 60));

    if (tossingRef.current) {
      const s = spinScale.current;
      /** End-over-end bias (CodePen-style) with light tumble on other axes. */
      g.rotation.y += delta * 15 * s;
      g.rotation.x += delta * 6 * s;
      g.rotation.z += delta * 2.8 * s;
      const settleScale = 1 + breath * 0.5;
      scaleSmoothed.current += (settleScale - scaleSmoothed.current) * (1 - Math.pow(0.75, delta * 60));
      g.scale.setScalar(scaleSmoothed.current);
      return;
    }

    const o = outcomeRef.current;
    const targetX = o === "TAILS" ? Math.PI : 0;
    const targetY = 0;
    const targetZ = 0;

    g.rotation.x = lerpShortestAngle(g.rotation.x, targetX, smooth(delta, 0.88));
    g.rotation.y = lerpShortestAngle(g.rotation.y, targetY, smooth(delta, 0.9));
    g.rotation.z = lerpShortestAngle(g.rotation.z, targetZ, smooth(delta, 0.92));

    const idleScale = 1 + hoverSmoothed.current * 0.06 + breath;
    scaleSmoothed.current += (idleScale - scaleSmoothed.current) * (1 - Math.pow(0.78, delta * 60));
    g.scale.setScalar(scaleSmoothed.current);
  });

  const idleUnknown = !tossing && outcome === null;

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <group ref={groupRef}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[R, R, H, 80, 1, false]} />
          <meshPhysicalMaterial
            color="#e6b020"
            metalness={0.92}
            roughness={0.18}
            clearcoat={0.45}
            clearcoatRoughness={0.15}
            reflectivity={0.9}
          />
        </mesh>
        <mesh position={[0, H / 2 + 0.0008, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <circleGeometry args={[R, 80]} />
          <meshStandardMaterial
            map={headTex}
            metalness={0.42}
            roughness={0.38}
            envMapIntensity={1}
          />
        </mesh>
        <mesh position={[0, -H / 2 - 0.0008, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <circleGeometry args={[R, 80]} />
          <meshStandardMaterial
            map={tailTex}
            metalness={0.42}
            roughness={0.38}
            envMapIntensity={1}
          />
        </mesh>

        {idleUnknown && (
          <Html center distanceFactor={5.2} style={{ pointerEvents: "none" }}>
            <span
              className="font-display text-5xl font-extrabold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
              style={{ textShadow: "0 0 20px rgba(34,227,255,0.35)" }}
            >
              ?
            </span>
          </Html>
        )}
      </group>
    </group>
  );
}

function SceneContent(props: CoinSceneProps) {
  return (
    <>
      <ambientLight intensity={0.42} />
      <directionalLight position={[3.5, 5.5, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-4, 2.5, -2.5]} intensity={0.38} color="#b8c8ff" />
      <pointLight position={[0, 1.8, 3.2]} intensity={0.65} color="#ffe8a0" />

      <CoinMesh {...props} />

      <ContactShadows
        position={[0, -R - 0.02, 0]}
        opacity={0.42}
        scale={16}
        blur={2.4}
        far={5}
        color="#000000"
      />
    </>
  );
}

export function CoinScene(props: CoinSceneProps) {
  return (
    <Canvas
      shadows
      className="h-full w-full min-h-[12.5rem] touch-none"
      camera={{ position: [0, 0.02, 4.65], fov: 43, near: 0.1, far: 40 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
    >
      <SceneContent {...props} />
    </Canvas>
  );
}
