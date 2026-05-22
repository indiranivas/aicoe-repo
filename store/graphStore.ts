import { create } from "zustand"
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from "reactflow"
import type { ActivityNode, ActivityEdge, NodeCategory, RelationshipType } from "@/lib/types"
import { ALL_CATEGORIES } from "@/lib/types"
import { autoLayout, needsLayout } from "@/lib/layout"

export type RFNode = Node<ActivityNode>
export type RFEdge = Edge<{ relationship: RelationshipType }>

interface GraphStore {
  nodes: RFNode[]
  edges: RFEdge[]
  selectedNodeId: string | null
  activeCategories: NodeCategory[]
  searchQuery: string
  expandedCategories: NodeCategory[]

  // React Flow handlers
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void

  // Init
  initGraph: (nodes: ActivityNode[], edges: ActivityEdge[]) => void

  // Node CRUD
  selectNode: (id: string | null) => void
  updateNodeData: (id: string, updates: Partial<ActivityNode>) => void
  addActivityNode: (node: ActivityNode) => void
  deleteActivityNode: (id: string) => void

  // Edge CRUD
  addActivityEdge: (edge: ActivityEdge) => void
  deleteActivityEdge: (id: string) => void

  // Filters
  setActiveCategories: (categories: NodeCategory[]) => void
  setSearchQuery: (query: string) => void
  toggleCategoryExpansion: (cat: NodeCategory) => void

  // Pending connection (for relationship modal)
  pendingConnection: { source: string; target: string } | null
  setPendingConnection: (conn: { source: string; target: string } | null) => void

  // Helpers
  getActivityNode: (id: string) => ActivityNode | undefined
}

function toRFNode(n: ActivityNode): RFNode {
  return {
    id: n.id,
    type: "activityNode",
    position: n.position ?? { x: 0, y: 0 },
    data: n,
  }
}

function toRFEdge(e: ActivityEdge): RFEdge {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    type: "labeledEdge",
    data: { relationship: e.relationship },
  }
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  activeCategories: ALL_CATEGORIES,
  searchQuery: "",
  expandedCategories: [],
  pendingConnection: null,

  onNodesChange: (changes) =>
    set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) as RFNode[] })),

  onEdgesChange: (changes) =>
    set((state) => ({ edges: applyEdgeChanges(changes, state.edges) as RFEdge[] })),

  initGraph: (activityNodes, activityEdges) => {
    const layouted = needsLayout(activityNodes)
      ? autoLayout(activityNodes, activityEdges)
      : activityNodes
    set({
      nodes: layouted.map(toRFNode),
      edges: activityEdges.map(toRFEdge),
    })
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  updateNodeData: (id, updates) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, ...updates, updatedAt: new Date().toISOString() } }
          : n
      ),
    })),

  addActivityNode: (node) =>
    set((state) => ({ nodes: [...state.nodes, toRFNode(node)] })),

  deleteActivityNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    })),

  addActivityEdge: (edge) =>
    set((state) => ({ edges: [...state.edges, toRFEdge(edge)] })),

  deleteActivityEdge: (id) =>
    set((state) => ({ edges: state.edges.filter((e) => e.id !== id) })),

  setActiveCategories: (categories) => set({ activeCategories: categories }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleCategoryExpansion: (cat) =>
    set((state) => ({
      expandedCategories: state.expandedCategories.includes(cat)
        ? state.expandedCategories.filter((c) => c !== cat)
        : [...state.expandedCategories, cat],
    })),

  setPendingConnection: (conn) => set({ pendingConnection: conn }),

  getActivityNode: (id) => get().nodes.find((n) => n.id === id)?.data,
}))
