import { NextRequest, NextResponse } from "next/server";
import {
  createAgentNotification,
  listAgentNotifications,
  markAgentNotificationRead,
  markAllAgentNotificationsRead,
  updateAgentNotificationSettings,
} from "@/lib/services/obsidian/agent-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const options = optionsFromRequest(request);
    const cursor = Number(request.nextUrl.searchParams.get("cursor") ?? 0);
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? 40);
    const result = await listAgentNotifications({ ...options, cursor, limit });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const options = optionsFromRequest(request, body);
    const result = await createAgentNotification(body.notification ?? body, options);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const options = optionsFromRequest(request, body);
    if (body.action === "mark-all-read") {
      return NextResponse.json({ ok: true, ...(await markAllAgentNotificationsRead(options)) });
    }
    if (body.action === "settings") {
      return NextResponse.json({ ok: true, ...(await updateAgentNotificationSettings(body.settings ?? {}, options)) });
    }
    if (!body.id) throw new Error("Notification id is required.");
    return NextResponse.json({ ok: true, ...(await markAgentNotificationRead(body.id, options)) });
  } catch (error) {
    return errorResponse(error);
  }
}

function optionsFromRequest(request: NextRequest, body?: { vaultPath?: string; notificationsFolder?: string }) {
  return {
    vaultPath: request.nextUrl.searchParams.get("vaultPath") ?? body?.vaultPath,
    notificationsFolder: request.nextUrl.searchParams.get("notificationsFolder") ?? body?.notificationsFolder,
  };
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Notifications request failed.";
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}
