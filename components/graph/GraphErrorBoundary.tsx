"use client"

import React from "react"

interface State {
  hasError: boolean
  message: string
}

export default class GraphErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, message: "" }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-gray-400 bg-gray-950">
        <svg className="w-10 h-10 text-red-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-gray-300">Graph failed to render</p>
          <p className="text-xs text-gray-600 max-w-xs">{this.state.message}</p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="h-8 px-4 text-xs font-medium bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-md transition-colors"
        >
          Reload
        </button>
      </div>
    )
  }
}
