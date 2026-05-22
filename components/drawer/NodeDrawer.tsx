"use client"

import { useEffect, useCallback } from "react"
import { useGraphStore } from "@/store/graphStore"
import NodeForm from "./NodeForm"

export default function NodeDrawer() {
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId)
  const getNode = useGraphStore((s) => s.getActivityNode)
  const selectNode = useGraphStore((s) => s.selectNode)

  const node = selectedNodeId ? getNode(selectedNodeId) : null
  const isOpen = !!node

  const handleClose = useCallback(() => selectNode(null), [selectNode])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [handleClose])

  return (
    <div
      className={`
        absolute right-0 top-0 h-full w-96 bg-gray-900 border-l border-gray-800
        flex flex-col z-10 shadow-2xl shadow-black/60
        transition-transform duration-200 ease-out
        ${isOpen ? "translate-x-0" : "translate-x-full"}
      `}
    >
      {node && <NodeForm key={node.id} node={node} onClose={handleClose} />}
    </div>
  )
}
