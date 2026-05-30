import { SchedulerView } from "@/components/scheduler";
export const dynamic = "force-dynamic";
export default function SchedulerPage() {
  return <main className="flex min-h-[100dvh] w-full flex-col"><SchedulerView /></main>;
}
