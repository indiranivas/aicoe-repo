"use client"

import { useState, useEffect } from "react"
import { useGraphStore } from "@/store/graphStore"
import { ALL_CATEGORIES, CATEGORY_COLORS } from "@/lib/types"
import type { NodeCategory } from "@/lib/types"
import { cn } from "@/lib/cn"

export default function TopBar({ onAddNode }: { onAddNode?: () => void }) {
  const activeCategories = useGraphStore((s) => s.activeCategories)
  const setSearchQuery = useGraphStore((s) => s.setSearchQuery)
  const setActiveCategories = useGraphStore((s) => s.setActiveCategories)

  // Local search state with 200ms debounce to store
  const [localSearch, setLocalSearch] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(localSearch), 200)
    return () => clearTimeout(t)
  }, [localSearch, setSearchQuery])

  function clearSearch() {
    setLocalSearch("")
    setSearchQuery("")
  }

  const allActive = activeCategories.length === ALL_CATEGORIES.length

  function toggleCategory(cat: NodeCategory) {
    if (allActive) {
      // Isolate to just this category
      setActiveCategories([cat])
    } else if (activeCategories.includes(cat)) {
      // Deselect — if last one, reset to all
      const next = activeCategories.filter((c) => c !== cat)
      setActiveCategories(next.length === 0 ? ALL_CATEGORIES : next)
    } else {
      setActiveCategories([...activeCategories, cat])
    }
  }

  function resetCategories() {
    setActiveCategories(ALL_CATEGORIES)
  }

  const LABELS: Record<NodeCategory, string> = {
    "Customer Zero": "Customer Zero",
    "Offering Creation": "Offering",
    "AI Governance": "Governance",
    "Enablement & Support": "Enablement",
    "Research & Development": "R&D",
  }

  return (
    <header className="flex items-center gap-3 px-4 h-12 border-b border-gray-800 shrink-0 bg-gray-950">
      {/* Brand */}
      <span className="text-sm font-semibold text-gray-200 whitespace-nowrap mr-1">
        AI CoE Graph
      </span>

      {/* Search */}
      <div className="relative flex-1 max-w-64">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="8" strokeWidth="2" />
          <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          id="graph-search"
          type="text"
          placeholder="Search nodes… (or press /)"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="w-full h-8 pl-8 pr-7 text-xs bg-gray-900 border border-gray-700 rounded-md text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        {localSearch && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="Clear search"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Add Node */}
      <button
        type="button"
        onClick={onAddNode}
        title="Add node (N)"
        className="h-8 px-3 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors whitespace-nowrap"
      >
        + Add Node
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-gray-800 shrink-0" />

      {/* All pill */}
      <button
        type="button"
        onClick={resetCategories}
        className={cn(
          "h-7 px-2.5 text-[11px] font-medium rounded-full border transition-all whitespace-nowrap",
          allActive
            ? "bg-gray-700/50 border-gray-600 text-gray-300"
            : "text-gray-600 border-gray-800 hover:border-gray-700 hover:text-gray-400"
        )}
      >
        All
      </button>

      {/* Category filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {ALL_CATEGORIES.map((cat) => {
          const active = activeCategories.includes(cat)
          const color = CATEGORY_COLORS[cat]
          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className={cn(
                "h-7 px-2.5 text-[11px] font-medium rounded-full border transition-all whitespace-nowrap",
                active
                  ? "border-transparent"
                  : "text-gray-500 border-gray-700 hover:border-gray-600"
              )}
              style={
                active
                  ? { backgroundColor: color + "22", borderColor: color + "55", color }
                  : {}
              }
            >
              {LABELS[cat]}
            </button>
          )
        })}
      </div>
    </header>
  )
}
