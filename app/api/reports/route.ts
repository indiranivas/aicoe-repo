import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

// GET /api/reports — aggregated analytics data
export async function GET(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const categoryFilter = searchParams.get("category")
  const statusFilter = searchParams.get("status")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  try {
    const where: Record<string, unknown> = { deletedAt: null }
    if (categoryFilter) where.category = categoryFilter
    if (statusFilter) where.status = statusFilter
    if (from || to) {
      where.createdAt = {}
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from)
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to)
    }

    const [
      nodes,
      milestones,
      updates,
      users,
      recentUpdates,
    ] = await Promise.all([
      prisma.activityNode.findMany({ where }),
      prisma.milestone.findMany({
        where: { node: where },
        include: { node: { select: { title: true, category: true } } },
      }),
      prisma.nodeUpdate.findMany({
        where: { node: where },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { node: { select: { title: true, category: true } } },
      }),
      prisma.user.findMany({
        where: { deletedAt: null, isActive: true },
        select: {
          id: true, name: true, department: true,
          _count: { select: { ownedActivities: true, assignedActivities: true } },
        },
      }),
      prisma.nodeUpdate.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { node: { select: { title: true, category: true } } },
      }),
    ])

    // Status breakdown
    const byStatus: Record<string, number> = {}
    nodes.forEach((n) => { byStatus[n.status] = (byStatus[n.status] ?? 0) + 1 })

    // Category breakdown
    const byCategory: Record<string, { count: number; totalProgress: number; completed: number; blocked: number }> = {}
    nodes.forEach((n) => {
      if (!byCategory[n.category]) byCategory[n.category] = { count: 0, totalProgress: 0, completed: 0, blocked: 0 }
      byCategory[n.category].count++
      byCategory[n.category].totalProgress += n.progress
      if (n.status === "Completed") byCategory[n.category].completed++
      if (n.status === "Blocked") byCategory[n.category].blocked++
    })

    const categoryStats = Object.entries(byCategory).map(([category, v]) => ({
      category,
      count: v.count,
      avgProgress: v.count ? Math.round(v.totalProgress / v.count) : 0,
      completed: v.completed,
      blocked: v.blocked,
    }))

    // Priority breakdown
    const byPriority: Record<string, number> = {}
    nodes.forEach((n) => { byPriority[n.priority] = (byPriority[n.priority] ?? 0) + 1 })

    // Milestone health
    const now = new Date()
    const totalMilestones = milestones.length
    const completedMilestones = milestones.filter((m) => m.completed).length
    const overdueMilestones = milestones.filter((m) => !m.completed && m.dueDate && m.dueDate < now).length
    const upcomingMilestones = milestones
      .filter((m) => !m.completed && m.dueDate && m.dueDate >= now)
      .sort((a, b) => (a.dueDate!.getTime() - b.dueDate!.getTime()))
      .slice(0, 10)

    // Completion trend (last 12 weeks)
    const weeklyCompletions: Array<{ week: string; count: number }> = []
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - (i * 7))
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)

      const count = nodes.filter((n) => {
        const updated = new Date(n.updatedAt)
        return n.status === "Completed" && updated >= weekStart && updated < weekEnd
      }).length

      weeklyCompletions.push({
        week: weekStart.toISOString().slice(0, 10),
        count,
      })
    }

    // Team workload
    const teamWorkload = users.map((u) => ({
      id: u.id,
      name: u.name,
      department: u.department,
      ownedCount: u._count.ownedActivities,
      assignedCount: u._count.assignedActivities,
    }))

    return NextResponse.json({
      summary: {
        total: nodes.length,
        avgProgress: nodes.length ? Math.round(nodes.reduce((s, n) => s + n.progress, 0) / nodes.length) : 0,
        byStatus,
        byPriority,
      },
      categoryStats,
      milestoneHealth: {
        total: totalMilestones,
        completed: completedMilestones,
        overdue: overdueMilestones,
        upcoming: upcomingMilestones.map((m) => ({
          id: m.id,
          title: m.title,
          dueDate: m.dueDate?.toISOString() ?? null,
          nodeTitle: m.node.title,
          nodeCategory: m.node.category,
        })),
      },
      weeklyCompletions,
      teamWorkload,
      recentUpdates: recentUpdates.map((u) => ({
        id: u.id,
        text: u.text,
        author: u.author,
        createdAt: u.createdAt.toISOString(),
        nodeTitle: u.node.title,
        nodeCategory: u.node.category,
      })),
    })
  } catch (err) {
    console.error("[api/reports] GET error:", err)
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
  }
}
