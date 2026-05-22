import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import fs from "fs"
import path from "path"

export async function POST() {
  try {
    const filePath = path.join(process.cwd(), "data", "graph.json")
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "graph.json not found" }, { status: 404 })
    }
    const { nodes, edges } = JSON.parse(fs.readFileSync(filePath, "utf-8"))

    const existing = await prisma.activityNode.count()
    if (existing > 0) {
      return NextResponse.json({ message: "DB already seeded", count: existing })
    }

    for (const n of nodes) {
      await prisma.activityNode.create({
        data: {
          id: n.id, title: n.title, description: n.description ?? "",
          category: n.category, owner: n.owner ?? "", status: n.status,
          priority: "Medium", progress: n.progress ?? 0,
          tags: n.tags ?? [], notes: n.notes ?? "",
          links: n.links ?? [], artifacts: n.artifacts ?? [],
          positionX: n.position?.x ?? 0, positionY: n.position?.y ?? 0,
          createdAt: new Date(n.createdAt), updatedAt: new Date(n.updatedAt),
        },
      })
    }
    for (const e of edges) {
      await prisma.activityEdge.create({
        data: { id: e.id, sourceId: e.source, targetId: e.target, relationship: e.relationship },
      })
    }

    return NextResponse.json({ ok: true, nodesSeeded: nodes.length, edgesSeeded: edges.length })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
