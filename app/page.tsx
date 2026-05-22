"use client"

import { useEffect, useCallback, useState } from "react"
import dynamic from "next/dynamic"
import { useGraphStore } from "@/store/graphStore"
import TopBar from "@/components/toolbar/TopBar"
import NodeDrawer from "@/components/drawer/NodeDrawer"
import AddNodeModal from "@/components/toolbar/AddNodeModal"
import RelationshipModal from "@/components/graph/RelationshipModal"

const GraphCanvas = dynamic(() => import("@/components/graph/GraphCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
      Loading graph…
    </div>
  ),
})

export default function Home() {
  const initGraph = useGraphStore((s) => s.initGraph)
  const nodes = useGraphStore((s) => s.nodes)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    fetch("/api/nodes")
      .then((r) => r.json())
      .then((data) => initGraph(data.nodes, data.edges))
      .catch(console.error)
  }, [initGraph])

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      // Ignore when typing in an input/textarea
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
      if (e.key === "n" || e.key === "N") setShowAddModal(true)
      if (e.key === "/") {
        e.preventDefault()
        ;(document.getElementById("graph-search") as HTMLInputElement | null)?.focus()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const handleAddNode = useCallback(() => setShowAddModal(true), [])

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100">
      <TopBar onAddNode={handleAddNode} />

      <main className="flex-1 relative overflow-hidden">
        {nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-600">
            <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
              <path strokeLinecap="round" strokeWidth="1.5" d="M12 8v4m0 4h.01" />
            </svg>
            <p className="text-sm">Loading graph data…</p>
          </div>
        ) : (
          <GraphCanvas />
        )}

        <NodeDrawer />
      </main>

      {/* Modals render outside main to avoid stacking context issues */}
      {showAddModal && <AddNodeModal onClose={() => setShowAddModal(false)} />}
      <RelationshipModal />
    </div>
  )
}
