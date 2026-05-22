import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

// GET /api/notifications — list notifications for current user
export async function GET(req: Request) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const unreadOnly = searchParams.get("unread") === "true"
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100)

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: session!.user.id,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    const unreadCount = await prisma.notification.count({
      where: { userId: session!.user.id, isRead: false },
    })

    return NextResponse.json({ notifications, unreadCount })
  } catch (err) {
    console.error("[api/notifications] GET error:", err)
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}

// POST /api/notifications/mark-read — mark all as read
export async function POST(req: Request) {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const body = await req.json()
    const { ids } = body // optional: specific IDs to mark read

    if (ids && Array.isArray(ids)) {
      await prisma.notification.updateMany({
        where: { id: { in: ids }, userId: session!.user.id },
        data: { isRead: true },
      })
    } else {
      await prisma.notification.updateMany({
        where: { userId: session!.user.id, isRead: false },
        data: { isRead: true },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[api/notifications] POST error:", err)
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 })
  }
}
