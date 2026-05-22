"use client"

import { memo } from "react"
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "reactflow"
import type { RelationshipType } from "@/lib/types"

interface EdgeData {
  relationship: RelationshipType
}

const RELATIONSHIP_COLORS: Record<RelationshipType, string> = {
  DEPENDS_ON: "#6366f1",
  RELATED_TO: "#9ca3af",
  INFLUENCES: "#f59e0b",
  REUSES: "#10b981",
  BLOCKED_BY: "#f43f5e",
  COMPLIES_WITH: "#0ea5e9",
}

function EdgeLabel({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<EdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const color = data?.relationship
    ? RELATIONSHIP_COLORS[data.relationship]
    : "#374151"

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? color : "#374151",
          strokeWidth: selected ? 2 : 1.5,
          transition: "stroke 0.15s",
        }}
        markerEnd={`url(#arrowhead-${selected ? "selected" : "default"})`}
      />
      {data?.relationship && (
        <EdgeLabelRenderer>
          <div
            className="absolute pointer-events-none nodrag nopan"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            <span
              className="px-1.5 py-0.5 text-[9px] font-mono rounded border whitespace-nowrap"
              style={{
                background: "#111827",
                borderColor: selected ? color : "#374151",
                color: selected ? color : "#6b7280",
                transition: "border-color 0.15s, color 0.15s",
              }}
            >
              {data.relationship}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export default memo(EdgeLabel)
