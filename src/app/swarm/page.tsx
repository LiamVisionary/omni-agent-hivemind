// src/app/swarm/page.tsx
import { SwarmView } from "@/components/swarm";

export const dynamic = "force-dynamic";

export default function SwarmPage() {
  return (
    <main className="min-h-[100dvh] w-full">
      <SwarmView />
    </main>
  );
}
