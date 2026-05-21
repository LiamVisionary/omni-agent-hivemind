import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  localTelemetryEnabled,
  queryTelemetryEvents,
  recordTelemetryBatch,
  type TelemetrySource,
} from "@/lib/services/telemetry/local-telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clientEventSchema = z.object({
  type: z.string().min(1).max(120),
  threadId: z.string().optional(),
  runId: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

const clientBatchSchema = z.object({
  events: z.array(clientEventSchema).max(500),
});

const sources = new Set<TelemetrySource>(["client", "route", "runtime", "stream"]);

export async function GET(request: NextRequest) {
  if (!localTelemetryEnabled()) {
    return NextResponse.json({ ok: true, enabled: false, events: [] });
  }
  const source = request.nextUrl.searchParams.get("source");
  const result = await queryTelemetryEvents({
    threadId: request.nextUrl.searchParams.get("threadId"),
    runId: request.nextUrl.searchParams.get("runId"),
    type: request.nextUrl.searchParams.get("type"),
    source: source && sources.has(source as TelemetrySource) ? source as TelemetrySource : null,
    since: Number(request.nextUrl.searchParams.get("since")) || null,
    limit: Number(request.nextUrl.searchParams.get("limit")) || null,
  });
  return NextResponse.json({ ok: true, enabled: true, count: result.events.length, ...result });
}

export async function POST(request: NextRequest) {
  if (!localTelemetryEnabled()) {
    return NextResponse.json({ ok: true, enabled: false, written: 0 });
  }
  const body = clientBatchSchema.parse(await request.json());
  const written = await recordTelemetryBatch(body.events.map((event) => ({
    source: "client" as const,
    type: event.type,
    threadId: event.threadId,
    runId: event.runId,
    payload: event.payload ?? {},
  })));
  return NextResponse.json({ ok: true, enabled: true, written });
}
