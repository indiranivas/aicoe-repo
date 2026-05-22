import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createNodeSchema, createEdgeSchema } from "@/lib/validations"

function serialize(n: {
  id: string; title: string; description: string; category: string
  owner: string; ownerId: string | null; assigneeId: string | null
  status: string; priority: string; progress: number
  startDate: Date | null; dueDate: Date | null; tags: string[]
  notes: string; links: string[]; artifacts: string[]
  positionX: number; positionY: number; createdAt: Date; updatedAt: Date
}) {
  return {
    id: n.id, title: n.title, description: n.description,
    category: n.category, owner: n.owner,
    ownerId: n.ownerId, assigneeId: n.assigneeId,
    status: n.status,
    priority: n.priority, progress: n.progress,
    startDate: n.startDate?.toISOString() ?? null,
    dueDate: n.dueDate?.toISOString() ?? null,
    tags: n.tags, notes: n.notes, links: n.links, artifacts: n.artifacts,
    dependencies: [],
    position: { x: n.positionX, y: n.positionY },
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }
}

export async function GET() {
  try {
    const [nodes, edges] = await Promise.all([
      prisma.activityNode.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "asc" } }),
      prisma.activityEdge.findMany({
        where: {
          source: { deletedAt: null },
          target: { deletedAt: null },
        },
      }),
    ])
    return NextResponse.json({
      nodes: nodes.map(serialize),
      edges: edges.map((e) => ({
        id: e.id, source: e.sourceId, target: e.targetId, relationship: e.relationship,
      })),
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "DB error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (body.type === "edge") {
      const parsed = createEdgeSchema.safeParse(body.edge)
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        )
      }

      const { source, target, relationship } = parsed.data

      // Prevent self-loops
      if (source === target) {
        return NextResponse.json({ error: "Cannot create a self-referencing edge" }, { status: 400 })
      }

      // Prevent duplicate edges
      const existing = await prisma.activityEdge.findFirst({
        where: { sourceId: source, targetId: target, relationship },
      })
      if (existing) {
        return NextResponse.json({ error: "This relationship already exists" }, { status: 409 })
      }

      const edge = await prisma.activityEdge.create({
        data: {
          id: parsed.data.id ?? undefined,
          sourceId: source,
          targetId: target,
          relationship,
        },
      })
      return NextResponse.json({ id: edge.id })
    }

    const parsed = createNodeSchema.safeParse(body.node)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const node = parsed.data
    const created = await prisma.activityNode.create({
      data: {
        id: node.id ?? undefined,
        title: node.title,
        description: node.description ?? "",
        category: node.category,
        owner: node.owner ?? "",
        ownerId: node.ownerId ?? null,
        assigneeId: node.assigneeId ?? null,
        status: node.status,
        priority: node.priority ?? "Medium",
        progress: node.progress ?? 0,
        startDate: node.startDate ? new Date(node.startDate) : null,
        dueDate: node.dueDate ? new Date(node.dueDate) : null,
        tags: node.tags ?? [],
        notes: node.notes ?? "",
        links: node.links ?? [],
        artifacts: node.artifacts ?? [],
        positionX: node.position?.x ?? 0,
        positionY: node.position?.y ?? 0,
      },
    })
    return NextResponse.json(serialize(created))
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "DB error" }, { status: 500 })
  }
}
