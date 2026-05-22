import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { updateNodeSchema } from "@/lib/validations"
import { requireAuth } from "@/lib/auth-helpers"
import { notifyStatusChange, notifyAssignment } from "@/lib/notifications"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const node = await prisma.activityNode.findUnique({
      where: { id, deletedAt: null },
      include: {
        updates: { orderBy: { createdAt: "desc" } },
        milestones: { orderBy: { createdAt: "asc" } },
      },
    })
    if (!node) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(node)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "DB error" }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const updates = await req.json()

  const isPositionOnly = Object.keys(updates).length === 1 && "position" in updates

  try {
    const data: Record<string, unknown> = {}

    if (isPositionOnly) {
      data.positionX = updates.position.x
      data.positionY = updates.position.y
    } else {
      // Validate non-position updates
      const parsed = updateNodeSchema.safeParse(updates)
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        )
      }

      const v = parsed.data
      if (v.title !== undefined) data.title = v.title
      if (v.description !== undefined) data.description = v.description
      if (v.category !== undefined) data.category = v.category
      if (v.owner !== undefined) data.owner = v.owner
      if (v.ownerId !== undefined) data.ownerId = v.ownerId
      if (v.assigneeId !== undefined) data.assigneeId = v.assigneeId
      if (v.status !== undefined) data.status = v.status
      if (v.priority !== undefined) data.priority = v.priority
      if (v.progress !== undefined) data.progress = v.progress
      if ("startDate" in v) data.startDate = v.startDate ? new Date(v.startDate) : null
      if ("dueDate" in v) data.dueDate = v.dueDate ? new Date(v.dueDate) : null
      if (v.tags !== undefined) data.tags = v.tags
      if (v.notes !== undefined) data.notes = v.notes
      if (v.links !== undefined) data.links = v.links
      if (v.artifacts !== undefined) data.artifacts = v.artifacts
      if (v.position) {
        data.positionX = v.position.x
        data.positionY = v.position.y
      }
    }

    // Get current node for notification checks
    let oldNode: { status: string; title: string; assigneeId: string | null } | null = null
    if (!isPositionOnly && (data.status !== undefined || data.assigneeId !== undefined)) {
      oldNode = await prisma.activityNode.findUnique({
        where: { id },
        select: { status: true, title: true, assigneeId: true },
      })
    }

    const updated = await prisma.activityNode.update({ where: { id }, data })

    // Fire notifications (non-blocking)
    if (oldNode && !isPositionOnly) {
      const { error: authErr, session } = await requireAuth()
      const userId = session?.user?.id ?? ""

      if (data.status !== undefined && data.status !== oldNode.status) {
        notifyStatusChange(id, oldNode.title, oldNode.status, data.status as string, userId).catch(() => {})
      }
      if (data.assigneeId !== undefined && data.assigneeId !== oldNode.assigneeId && data.assigneeId) {
        notifyAssignment(id, oldNode.title, data.assigneeId as string, userId).catch(() => {})
      }
    }

    return NextResponse.json({ ok: true, id: updated.id })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "DB error" }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    // Soft delete
    await prisma.activityNode.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "DB error" }, { status: 500 })
  }
}
