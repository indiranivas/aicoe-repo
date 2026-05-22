import fs from "fs"
import path from "path"
import type { GraphData } from "./types"

const DATA_PATH = path.join(process.cwd(), "data", "graph.json")

export function loadGraph(): GraphData {
  const raw = fs.readFileSync(DATA_PATH, "utf-8")
  return JSON.parse(raw) as GraphData
}

export function saveGraph(data: GraphData): void {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8")
}
