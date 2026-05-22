"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "reactflow"
import { CATEGORY_COLORS } from "@/lib/types"
import type { CategoryNodeData } from "@/lib/types"

function CategoryCard({ data }: NodeProps<CategoryNodeData>) {
  const color = CATEGORY_COLORS[data.category]

  return (
    <div
      className="relative flex flex-col items-center justify-center w-44 rounded-2xl border-2 p-4 cursor-pointer select-none transition-all duration-200 bg-gray-900 hover:brightness-110"
      style={{ borderColor: color, boxShadow: `0 0 24px ${color}28` }}
    >
      <Handle type="source" position={Position.Bottom} id="out" className="!w-1 !h-1 !opacity-0 !border-0" />
      {/* Color ring */}
      <div
        className="w-10 h-10 rounded-full mb-3 flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}22`, border: `2px solid ${color}55` }}
      >
        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
      </div>

      {/* Name */}
      <p className="text-[11px] font-semibold text-gray-100 text-center leading-tight mb-1">
        {data.category}
      </p>

      {/* Count */}
      <p className="text-[10px] text-gray-500 mb-3">
        {data.count} {data.count === 1 ? "activity" : "activities"}
      </p>

      {/* Expand / collapse indicator */}
      <div
        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium transition-colors"
        style={{
          backgroundColor: data.isExpanded ? `${color}22` : "#1f293780",
          color: data.isExpanded ? color : "#6b7280",
          border: `1px solid ${data.isExpanded ? color + "44" : "#374151"}`,
        }}
      >
        <svg
          className="w-2.5 h-2.5 transition-transform duration-200"
          style={{ transform: data.isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        {data.isExpanded ? "Collapse" : "Expand"}
      </div>
    </div>
  )
}

export default memo(CategoryCard)
