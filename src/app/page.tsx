import { ConfettiBackdrop } from "@/components/confetti-backdrop";
import { GameApp } from "@/components/game-app";

export default function Home() {
  return (
    <main className="relative z-[1] flex min-h-full flex-1 flex-col">
      <ConfettiBackdrop />
      <GameApp />
    </main>
  );
}
