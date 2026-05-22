"use client"

import { useEffect, useState, useCallback } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { toast } from "sonner"
import { CATEGORY_COLORS, CATEGORY_BG, CATEGORY_BORDER_L, ALL_STATUSES, ALL_CATEGORIES } from "@/lib/types"
import type { ActivityNode, NodeStatus, NodeCategory } from "@/lib/types"
import { cn } from "@/lib/cn"

// ─── Status colour maps ───────────────────────────────────────────────────────
const STATUS_BORDER: Record<NodeStatus, string> = {
  Idea:          "border-gray-700",
  Planned:       "border-blue-500/40",
  "In Progress": "border-emerald-500/40",
  Blocked:       "border-red-500/40",
  Completed:     "border-indigo-500/40",
}

const STATUS_HEADER: Record<NodeStatus, string> = {
  Idea:          "text-gray-400",
  Planned:       "text-blue-400",
  "In Progress": "text-emerald-400",
  Blocked:       "text-red-400",
  Completed:     "text-indigo-400",
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function KanbanCard({ node, isDragging }: { node: ActivityNode; isDragging?: boolean }) {
  const color = CATEGORY_COLORS[node.category as NodeCategory]
  return (
    <div
      className={cn(
        "bg-gray-900 border rounded-lg p-3 cursor-grab active:cursor-grabbing",
        "border-l-2 transition-shadow select-none",
        isDragging ? "shadow-2xl shadow-black/60 opacity-90" : "hover:border-gray-600"
      )}
      style={{ borderLeftColor: color }}
    >
      <p className="text-xs font-medium text-gray-100 leading-snug mb-2">{node.title}</p>
      <div className="flex items-center justify-between">
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", CATEGORY_BG[node.category as NodeCategory])}>
          {node.category}
        </span>
        {node.owner && (
          <span className="text-[10px] text-gray-500 truncate max-w-[80px]">{node.owner}</span>
        )}
      </div>
      {node.progress > 0 && (
        <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${node.progress}%`, backgroundColor: color }} />
        </div>
      )}
    </div>
  )
}

// ─── Sortable card wrapper ────────────────────────────────────────────────────
function SortableCard({ node }: { node: ActivityNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-30" : ""}
      {...attributes}
      {...listeners}
    >
      <KanbanCard node={node} />
    </div>
  )
}

// ─── Droppable column ─────────────────────────────────────────────────────────
function DroppableColumn({
  status,
  items,
  children,
}: {
  status: NodeStatus
  items: string[]
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      className={cn(
        "flex flex-col w-56 shrink-0 rounded-xl border bg-gray-900/50 transition-colors duration-150",
        STATUS_BORDER[status],
        isOver && "bg-gray-800/60 ring-1 ring-inset ring-indigo-500/30"
      )}
    >
      {/* Column header */}
      <div className="px-3 py-2.5 border-b border-gray-800 shrink-0">
        <div className="flex items-center justify-between">
          <span className={cn("text-[11px] font-semibold uppercase tracking-wider", STATUS_HEADER[status])}>
            {status}
          </span>
          <span className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded-full">
            {items.length}
          </span>
        </div>
      </div>

      {/* Drop zone + sortable list */}
      <div ref={setNodeRef} className="flex-1 overflow-y-auto p-2 min-h-[80px]">
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {children}
            {items.length === 0 && (
              <div className="h-16 flex items-center justify-center border border-dashed border-gray-800 rounded-lg">
                <span className="text-[10px] text-gray-700">Drop here</span>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function KanbanPage() {
  const [nodes, setNodes] = useState<ActivityNode[]>([])
  const [activeNode, setActiveNode] = useState<ActivityNode | null>(null)
  const [filterCat, setFilterCat] = useState<NodeCategory | "All">("All")

  useEffect(() => {
    fetch("/api/nodes")
      .then((r) => r.json())
      .then((d) => setNodes(d.nodes))
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const filtered = filterCat === "All" ? nodes : nodes.filter((n) => n.category === filterCat)
  const byStatus = (status: NodeStatus) => filtered.filter((n) => n.status === status)

  const handleDragStart = useCallback(
    (e: DragStartEvent) => {
      setActiveNode(nodes.find((n) => n.id === e.active.id) ?? null)
    },
    [nodes]
  )

  const handleDragEnd = useCallback(
    async (e: DragEndEvent) => {
      const { active, over } = e
      setActiveNode(null)

      if (!over) return

      const draggedId = active.id as string

      // over.id is either a status string (dropped on column) or a node id (dropped on a card)
      const targetStatus: NodeStatus | undefined = ALL_STATUSES.includes(over.id as NodeStatus)
        ? (over.id as NodeStatus)
        : nodes.find((n) => n.id === over.id)?.status

      if (!targetStatus) return

      const draggedNode = nodes.find((n) => n.id === draggedId)
      const prevStatus = draggedNode?.status

      // No change — dropped back into same column
      if (!prevStatus || prevStatus === targetStatus) return

      // Optimistic update
      setNodes((prev) =>
        prev.map((n) => (n.id === draggedId ? { ...n, status: targetStatus } : n))
      )

      try {
        const res = await fetch(`/api/nodes/${draggedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: targetStatus }),
        })
        if (!res.ok) throw new Error()
        toast.success(`Moved to "${targetStatus}"`)
      } catch {
        toast.error("Failed to save — reverting")
        setNodes((prev) =>
          prev.map((n) => (n.id === draggedId ? { ...n, status: prevStatus } : n))
        )
      }
    },
    [nodes]
  )

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-semibold text-gray-100">Kanban Board</h1>
          <p className="text-xs text-gray-500 mt-0.5">Drag cards between columns to update status</p>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-1.5">
          {(["All", ...ALL_CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCat(cat as NodeCategory | "All")}
              className={cn(
                "h-7 px-2.5 text-[11px] font-medium rounded-full border transition-all",
                filterCat === cat
                  ? cat === "All"
                    ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                    : CATEGORY_BG[cat as NodeCategory]
                  : "text-gray-500 border-gray-700 hover:border-gray-600"
              )}
            >
              {cat === "All" ? "All" : cat.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 py-4">
          <div className="flex gap-4 h-full min-w-[1200px]">
            {ALL_STATUSES.map((status) => {
              const col = byStatus(status)
              return (
                <DroppableColumn key={status} status={status} items={col.map((n) => n.id)}>
                  {col.map((node) => (
                    <SortableCard key={node.id} node={node} />
                  ))}
                </DroppableColumn>
              )
            })}
          </div>
        </div>

        <DragOverlay>
          {activeNode && <KanbanCard node={activeNode} isDragging />}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
