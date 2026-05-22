import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

// PATCH /api/notifications/[id] — mark single notification read/unread
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { id } = await params

  try {
    const body = await req.json()
    const notification = await prisma.notification.findUnique({ where: { id } })

    if (!notification || notification.userId !== session!.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: body.isRead ?? true },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error("[api/notifications/id] PATCH error:", err)
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 })
  }
}

// DELETE /api/notifications/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { id } = await params

  try {
    const notification = await prisma.notification.findUnique({ where: { id } })

    if (!notification || notification.userId !== session!.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.notification.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[api/notifications/id] DELETE error:", err)
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 })
  }
}
