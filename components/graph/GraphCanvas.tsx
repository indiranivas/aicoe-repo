"use client"

import { useCallback, useMemo, useState } from "react"
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  MarkerType,
  Panel,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
} from "reactflow"
import "reactflow/dist/style.css"
import { useGraphStore } from "@/store/graphStore"
import NodeCard from "./NodeCard"
import CategoryCard from "./CategoryCard"
import EdgeLabel from "./EdgeLabel"
import GraphErrorBoundary from "./GraphErrorBoundary"
import { CATEGORY_COLORS, CATEGORY_DOT, ALL_CATEGORIES } from "@/lib/types"
import type { ActivityNode, NodeCategory } from "@/lib/types"

const nodeTypes: NodeTypes = { activityNode: NodeCard, categoryNode: CategoryCard }
const edgeTypes: EdgeTypes = { labeledEdge: EdgeLabel }

// ─── Layout constants ────────────────────────────────────────────────────────
const COLUMN_W = 260   // width of each category column (px)
const HUB_W    = 176   // w-44 = 11rem
const HUB_H    = 190   // CategoryCard approximate height
const ACT_W    = 224   // w-56 = 14rem
const ACT_H    = 140   // NodeCard approximate height
const HUB_Y    = 60    // top row y
const ACT_GAP  = 20    // vertical gap between activity cards

/** Default hub position for a given category (centered in its column). */
function defaultHubPos(cat: NodeCategory): { x: number; y: number } {
  const col = ALL_CATEGORIES.indexOf(cat)
  return { x: col * COLUMN_W + (COLUMN_W - HUB_W) / 2, y: HUB_Y }
}

/**
 * Vertical stack of activity positions directly below a hub.
 * Each card is centered under the hub's center x.
 */
function verticalPositions(
  hubPos: { x: number; y: number },
  count: number
): { x: number; y: number }[] {
  if (count === 0) return []
  const hubCenterX = hubPos.x + HUB_W / 2
  const startY = hubPos.y + HUB_H + 40
  return Array.from({ length: count }, (_, i) => ({
    x: hubCenterX - ACT_W / 2,
    y: startY + i * (ACT_H + ACT_GAP),
  }))
}

// ─── Toolbar helpers ─────────────────────────────────────────────────────────
function FitViewButton() {
  const { fitView } = useReactFlow()
  return (
    <Panel position="top-right">
      <button
        type="button"
        onClick={() => fitView({ padding: 0.15, duration: 400 })}
        title="Fit all nodes in view"
        className="h-7 px-2.5 text-[11px] font-medium bg-gray-900 border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 rounded-md transition-colors"
      >
        Fit view
      </button>
    </Panel>
  )
}

function CategoryLegend() {
  return (
    <Panel position="top-left">
      <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-lg px-3 py-2.5 space-y-1.5">
        {ALL_CATEGORIES.map((cat) => (
          <div key={cat} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full shrink-0 ${CATEGORY_DOT[cat]}`} />
            <span className="text-[10px] text-gray-500 whitespace-nowrap">{cat}</span>
          </div>
        ))}
      </div>
    </Panel>
  )
}

// ─── Main graph ──────────────────────────────────────────────────────────────
function GraphInner() {
  const nodes = useGraphStore((s) => s.nodes)
  const edges = useGraphStore((s) => s.edges)
  const activeCategories = useGraphStore((s) => s.activeCategories)
  const searchQuery = useGraphStore((s) => s.searchQuery)
  const expandedCategories = useGraphStore((s) => s.expandedCategories)
  const onNodesChange = useGraphStore((s) => s.onNodesChange)
  const onEdgesChange = useGraphStore((s) => s.onEdgesChange)
  const selectNode = useGraphStore((s) => s.selectNode)
  const setPendingConnection = useGraphStore((s) => s.setPendingConnection)
  const toggleCategoryExpansion = useGraphStore((s) => s.toggleCategoryExpansion)

  // Allow hub nodes to be dragged without persisting
  const [catPositionOverrides, setCatPositionOverrides] = useState<
    Record<string, { x: number; y: number }>
  >({})

  const autoExpand = searchQuery.trim().length > 0
  const expandedSet = useMemo(
    () => new Set(autoExpand ? ALL_CATEGORIES : expandedCategories),
    [expandedCategories, autoExpand]
  )

  // ── Category hub nodes ──────────────────────────────────────────────────
  const categoryNodes = useMemo<Node[]>(
    () =>
      ALL_CATEGORIES.filter((cat) => activeCategories.includes(cat)).map((cat) => {
        const id = `cat::${cat}`
        const base = defaultHubPos(cat)
        return {
          id,
          type: "categoryNode",
          position: catPositionOverrides[id] ?? base,
          data: {
            category: cat,
            count: nodes.filter((n) => n.data.category === cat).length,
            isExpanded: expandedSet.has(cat),
          },
          draggable: true,
          selectable: false,
        }
      }),
    [nodes, activeCategories, expandedSet, catPositionOverrides]
  )

  // ── Activity nodes stacked vertically below their hub ───────────────────
  const visibleActivityNodes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    const result: Node[] = []

    for (const cat of ALL_CATEGORIES) {
      if (!expandedSet.has(cat) || !activeCategories.includes(cat)) continue

      const catId = `cat::${cat}`
      const hubPos = catPositionOverrides[catId] ?? defaultHubPos(cat)
      const catNodes = nodes
        .filter((n) => n.data.category === cat)
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id))

      const positions = verticalPositions(hubPos, catNodes.length)

      catNodes.forEach((n, i) => {
        const d = n.data
        const match =
          !q ||
          d.title.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.owner.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q))

        result.push({
          ...n,
          position: positions[i],
          draggable: false,
          style: { opacity: match ? 1 : 0.1, transition: "opacity 0.2s" },
        })
      })
    }
    return result
  }, [nodes, expandedSet, activeCategories, searchQuery, catPositionOverrides])

  const allDisplayNodes = useMemo(
    () => [...categoryNodes, ...visibleActivityNodes],
    [categoryNodes, visibleActivityNodes]
  )

  // ── Edges ───────────────────────────────────────────────────────────────
  const visibleEdges = useMemo<Edge[]>(() => {
    const visibleIds = new Set(visibleActivityNodes.map((n) => n.id))
    const activeCatSet = new Set(activeCategories)
    const nodeToCategory: Record<string, NodeCategory> = {}
    nodes.forEach((n) => { nodeToCategory[n.id] = n.data.category })

    // Hub → activity vertical spokes (use the dedicated handles)
    const hubSpokes: Edge[] = []
    for (const cat of ALL_CATEGORIES) {
      if (!expandedSet.has(cat) || !activeCatSet.has(cat)) continue
      const color = CATEGORY_COLORS[cat]
      nodes
        .filter((n) => n.data.category === cat)
        .forEach((n) => {
          hubSpokes.push({
            id: `hub::${cat}::${n.id}`,
            source: `cat::${cat}`,
            target: n.id,
            sourceHandle: "out",
            targetHandle: "in",
            type: "smoothstep",
            style: { stroke: color, strokeWidth: 1.5, opacity: 0.35 },
            animated: false,
          })
        })
    }

    // Cross-category / peer edges with hub fallback for collapsed endpoints
    const crossArrow = { type: MarkerType.ArrowClosed, color: "#6b7280", width: 12, height: 12 }
    const crossStyle = { stroke: "#4b5563", strokeWidth: 1.5, opacity: 0.65 }
    const seen = new Set<string>()
    const resultEdges: Edge[] = []

    for (const edge of edges) {
      const srcCat = nodeToCategory[edge.source]
      const tgtCat = nodeToCategory[edge.target]
      if (!srcCat || !tgtCat) continue

      const srcVis = visibleIds.has(edge.source)
      const tgtVis = visibleIds.has(edge.target)
      const srcHubOn = activeCatSet.has(srcCat)
      const tgtHubOn = activeCatSet.has(tgtCat)

      if (srcVis && tgtVis) {
        resultEdges.push(edge)
      } else if (srcVis && !tgtVis && tgtHubOn) {
        const key = `${edge.source}->cat::${tgtCat}`
        if (!seen.has(key)) {
          seen.add(key)
          resultEdges.push({
            id: `cross::${key}`,
            source: edge.source,
            target: `cat::${tgtCat}`,
            type: "smoothstep",
            style: crossStyle,
            markerEnd: crossArrow,
          })
        }
      } else if (!srcVis && tgtVis && srcHubOn) {
        const key = `cat::${srcCat}->${edge.target}`
        if (!seen.has(key)) {
          seen.add(key)
          resultEdges.push({
            id: `cross::${key}`,
            source: `cat::${srcCat}`,
            target: edge.target,
            type: "smoothstep",
            style: crossStyle,
            markerEnd: crossArrow,
          })
        }
      } else if (!srcVis && !tgtVis && srcCat !== tgtCat && srcHubOn && tgtHubOn) {
        const key = `cat::${srcCat}->cat::${tgtCat}`
        if (!seen.has(key)) {
          seen.add(key)
          resultEdges.push({
            id: `hub-to-hub::${key}`,
            source: `cat::${srcCat}`,
            target: `cat::${tgtCat}`,
            type: "smoothstep",
            style: { stroke: "#4b5563", strokeWidth: 2, opacity: 0.7 },
            markerEnd: crossArrow,
          })
        }
      }
    }

    return [...hubSpokes, ...resultEdges]
  }, [nodes, edges, expandedSet, activeCategories, visibleActivityNodes])

  // ── Event handlers ──────────────────────────────────────────────────────
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.id.startsWith("cat::")) {
        toggleCategoryExpansion(node.data.category as NodeCategory)
      } else {
        selectNode(node.id)
      }
    },
    [selectNode, toggleCategoryExpansion]
  )

  const onPaneClick = useCallback(() => selectNode(null), [selectNode])

  const onConnect = useCallback(
    (connection: Connection) => {
      if (
        connection.source && connection.target &&
        !connection.source.startsWith("cat::") &&
        !connection.target.startsWith("cat::")
      ) {
        setPendingConnection({ source: connection.source, target: connection.target })
      }
    },
    [setPendingConnection]
  )

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const catChanges = changes.filter(
        (c) => "id" in c && (c as { id: string }).id.startsWith("cat::")
      )
      const actChanges = changes.filter(
        (c) => !("id" in c) || !(c as { id: string }).id.startsWith("cat::")
      )
      for (const change of catChanges) {
        if (change.type === "position" && change.position) {
          setCatPositionOverrides((prev) => ({ ...prev, [change.id]: change.position! }))
        }
      }
      if (actChanges.length) onNodesChange(actChanges)
    },
    [onNodesChange]
  )

  const onNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.id.startsWith("cat::")) return
    fetch(`/api/nodes/${node.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position: node.position }),
    }).catch(console.error)
  }, [])

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={allDisplayNodes}
        edges={visibleEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.15}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: "labeledEdge" }}
        connectOnClick={false}
      >
        <Background variant={BackgroundVariant.Dots} color="#1f2937" gap={24} size={1} />
        <Controls position="bottom-right" showInteractive={false} />
        <MiniMap
          position="bottom-left"
          nodeColor={(node) => {
            const cat =
              node.type === "categoryNode"
                ? (node.data as { category: NodeCategory }).category
                : (node.data as ActivityNode).category
            return CATEGORY_COLORS[cat] ?? "#374151"
          }}
          maskColor="rgba(3, 7, 18, 0.75)"
          nodeStrokeWidth={0}
        />
        <FitViewButton />
        <CategoryLegend />

        <svg className="absolute top-0 left-0">
          <defs>
            <marker id="arrowhead-default" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#374151" />
            </marker>
            <marker id="arrowhead-selected" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
            </marker>
          </defs>
        </svg>
      </ReactFlow>
    </div>
  )
}

export default function GraphCanvas() {
  return (
    <GraphErrorBoundary>
      <GraphInner />
    </GraphErrorBoundary>
  )
}
