import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const [nodes, recentUpdates, upcomingMilestones] = await Promise.all([
      prisma.activityNode.findMany({ where: { deletedAt: null } }),
      prisma.nodeUpdate.findMany({
        where: { node: { deletedAt: null } },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { node: { select: { title: true, category: true } } },
      }),
      prisma.milestone.findMany({
        where: { completed: false, dueDate: { gte: new Date() }, node: { deletedAt: null } },
        orderBy: { dueDate: "asc" },
        take: 5,
        include: { node: { select: { title: true, category: true } } },
      }),
    ])

    const byStatus = nodes.reduce<Record<string, number>>((acc, n) => {
      acc[n.status] = (acc[n.status] ?? 0) + 1
      return acc
    }, {})

    const byCategory = nodes.reduce<Record<string, { count: number; progress: number }>>((acc, n) => {
      if (!acc[n.category]) acc[n.category] = { count: 0, progress: 0 }
      acc[n.category].count++
      acc[n.category].progress += n.progress
      return acc
    }, {})

    const categoryStats = Object.entries(byCategory).map(([cat, v]) => ({
      category: cat,
      count: v.count,
      avgProgress: Math.round(v.progress / v.count),
    }))

    return NextResponse.json({
      total: nodes.length,
      byStatus,
      categoryStats,
      avgProgress: nodes.length ? Math.round(nodes.reduce((s, n) => s + n.progress, 0) / nodes.length) : 0,
      recentUpdates,
      upcomingMilestones,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "DB error" }, { status: 500 })
  }
}
