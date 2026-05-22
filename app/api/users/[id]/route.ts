import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { updateUserSchema } from "@/lib/validations"

// GET /api/users/[id]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params
  try {
    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true, name: true, email: true, role: true,
        department: true, avatar: true, isActive: true,
        createdAt: true, updatedAt: true,
        ownedActivities: {
          where: { deletedAt: null },
          select: { id: true, title: true, category: true, status: true, priority: true, progress: true },
          orderBy: { updatedAt: "desc" },
        },
        assignedActivities: {
          where: { deletedAt: null },
          select: { id: true, title: true, category: true, status: true, priority: true, progress: true },
          orderBy: { updatedAt: "desc" },
        },
      },
    })

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
    return NextResponse.json(user)
  } catch (err) {
    console.error("[api/users/id] GET error:", err)
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}

// PATCH /api/users/[id] — update user (admin only, or self for name/department)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { id } = await params
  const isSelf = session!.user.id === id
  const isAdmin = session!.user.role === "admin"

  if (!isSelf && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = updateUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Non-admins can only update their own name and department
    if (!isAdmin) {
      delete data.role
      delete data.isActive
      delete data.email
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, name: true, email: true, role: true,
        department: true, isActive: true, updatedAt: true,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: session!.user.id,
        action: "update",
        entityType: "user",
        entityId: id,
        details: JSON.stringify(data),
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error("[api/users/id] PATCH error:", err)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

// DELETE /api/users/[id] — soft delete (admin only)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth("admin")
  if (error) return error

  const { id } = await params

  if (session!.user.id === id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
  }

  try {
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    })

    await prisma.auditLog.create({
      data: {
        userId: session!.user.id,
        action: "delete",
        entityType: "user",
        entityId: id,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[api/users/id] DELETE error:", err)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
