"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "reactflow"
import { cn } from "@/lib/cn"
import { CATEGORY_COLORS, CATEGORY_BG, STATUS_COLORS } from "@/lib/types"
import type { ActivityNode } from "@/lib/types"
import { useGraphStore } from "@/store/graphStore"

function NodeCard({ data, selected }: NodeProps<ActivityNode>) {
  const searchQuery = useGraphStore((s) => s.searchQuery)

  const isSearchMatch =
    searchQuery.trim() !== "" &&
    [data.title, data.description, data.owner, ...data.tags].some((t) =>
      t.toLowerCase().includes(searchQuery.toLowerCase())
    )

  const isCompleted = data.status === "Completed"
  const isBlocked = data.status === "Blocked"
  const isIdea = data.status === "Idea"

  // CSS custom properties for dynamic runtime values
  const cssVars = {
    "--cat": CATEGORY_COLORS[data.category],
    "--prog": `${data.progress}%`,
  } as React.CSSProperties

  return (
    <div
      className={cn(
        "relative w-56 rounded-lg border bg-gray-900 px-3 pt-3 pb-2.5",
        "border-l-[3px] [border-left-color:var(--cat)]",
        "transition-all duration-150 cursor-pointer",
        "hover:scale-[1.02] hover:shadow-xl hover:shadow-black/50",
        selected
          ? "border-indigo-500 shadow-md shadow-indigo-500/20 scale-[1.01]"
          : "border-gray-700 hover:border-gray-600",
        isBlocked && !selected && "ring-1 ring-red-500/50",
        isCompleted && "opacity-50",
        isIdea && "border-dashed",
        isSearchMatch && !selected && "ring-2 ring-amber-400/40"
      )}
      style={cssVars}
    >
      {/* Hierarchy input — invisible, used by hub→activity spoke edges */}
      <Handle type="target" position={Position.Top} id="in" className="!w-1 !h-1 !opacity-0 !border-0" />
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-gray-600 !border-gray-800 hover:!bg-indigo-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-gray-600 !border-gray-800 hover:!bg-indigo-500"
      />

      {/* Completed checkmark badge */}
      {isCompleted && (
        <span className="absolute top-2 right-2 text-gray-500">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}

      {/* Blocked indicator */}
      {isBlocked && (
        <span className="absolute top-2 right-2 text-red-500/70">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth={2} />
            <path strokeLinecap="round" strokeWidth={2} d="M4.93 4.93l14.14 14.14" />
          </svg>
        </span>
      )}

      {/* Title */}
      <p
        className={cn(
          "text-sm font-semibold text-gray-100 leading-snug mb-1.5 line-clamp-2",
          (isCompleted || isBlocked) ? "pr-5" : "pr-1"
        )}
      >
        {data.title}
      </p>

      {/* Category badge */}
      <span
        className={cn(
          "inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border mb-2",
          CATEGORY_BG[data.category]
        )}
      >
        {data.category}
      </span>

      {/* Owner + Status row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-500 truncate max-w-[110px]">
          {data.owner || <span className="italic text-gray-700">No owner</span>}
        </span>
        <span className={cn("text-[10px] font-medium", STATUS_COLORS[data.status])}>
          {data.status}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300 [width:var(--prog)] [background-color:var(--cat)]"
        />
      </div>
      <p className="mt-1 text-[10px] text-gray-600">{data.progress}%</p>
    </div>
  )
}

export default memo(NodeCard)
