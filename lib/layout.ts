import dagre from "dagre"
import type { ActivityNode, ActivityEdge } from "./types"

const NODE_W = 224 // NodeCard w-56
const NODE_H = 130 // approximate NodeCard height

export function autoLayout(
  nodes: ActivityNode[],
  edges: ActivityEdge[]
): ActivityNode[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120, marginx: 60, marginy: 60 })

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }))

  edges.forEach((e) => {
    if (g.hasNode(e.source) && g.hasNode(e.target)) {
      g.setEdge(e.source, e.target)
    }
  })

  dagre.layout(g)

  return nodes.map((n) => {
    const p = g.node(n.id)
    return {
      ...n,
      position: {
        x: Math.round(p.x - NODE_W / 2),
        y: Math.round(p.y - NODE_H / 2),
      },
    }
  })
}

export function needsLayout(nodes: ActivityNode[]): boolean {
  return nodes.some(
    (n) => !n.position || (n.position.x === 0 && n.position.y === 0)
  )
}
