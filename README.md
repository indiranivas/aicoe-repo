# AI CoE Graph Workspace

A lightweight, single-page knowledge graph for tracking AI Center of Excellence activities, relationships, and progress.

---

## Purpose

The AI CoE Graph Workspace is an internal tool where teams can visualize, connect, and manage all AI CoE activities in one place. The graph is the primary interface — not a dashboard, not a table, not a report. Every activity is a node. Every relationship is an edge. You navigate, edit, and understand the work by moving through the graph.

---

## Architecture

```
aicoe-graph-repo/
├── app/
│   ├── page.tsx              # Single page entry point
│   ├── layout.tsx            # Root layout with dark theme
│   └── api/
│       └── nodes/
│           └── route.ts      # REST endpoints for nodes/edges
├── components/
│   ├── graph/
│   │   ├── GraphCanvas.tsx   # React Flow canvas
│   │   ├── NodeCard.tsx      # Custom node renderer
│   │   └── EdgeLabel.tsx     # Custom edge with relationship type
│   ├── drawer/
│   │   ├── NodeDrawer.tsx    # Right-side editable panel
│   │   └── NodeForm.tsx      # Add/Edit form fields
│   ├── toolbar/
│   │   ├── TopBar.tsx        # Search, Add Node, Filter
│   │   └── CategoryFilter.tsx
│   └── ui/                   # shadcn/ui components
├── store/
│   └── graphStore.ts         # Zustand state: nodes, edges, selection
├── lib/
│   ├── data.ts               # JSON read/write helpers
│   └── types.ts              # Node, Edge, Category TypeScript types
├── data/
│   └── graph.json            # Persisted graph data (nodes + edges)
└── public/
```

**Stack:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React Flow — graph rendering and interaction
- shadcn/ui — UI primitives
- Zustand — client state
- JSON file (`data/graph.json`) — lightweight persistence via Next.js API routes

---

## Node Model

```ts
type NodeStatus = "Idea" | "Planned" | "In Progress" | "Blocked" | "Completed"

type NodeCategory =
  | "Customer Zero"
  | "Offering Creation"
  | "AI Governance"
  | "Enablement & Support"
  | "Research & Development"

interface ActivityNode {
  id: string
  title: string
  description: string
  category: NodeCategory
  owner: string
  status: NodeStatus
  progress: number          // 0–100
  createdAt: string         // ISO date
  updatedAt: string         // ISO date
  tags: string[]
  notes: string
  dependencies: string[]    // node IDs
  links?: string[]
  artifacts?: string[]
}
```

**Category colors (dark mode):**

| Category | Color |
|---|---|
| Customer Zero | Indigo `#6366f1` |
| Offering Creation | Emerald `#10b981` |
| AI Governance | Amber `#f59e0b` |
| Enablement & Support | Sky `#0ea5e9` |
| Research & Development | Rose `#f43f5e` |

**Status indicators:**

| Status | Visual |
|---|---|
| Idea | Dashed border |
| Planned | Solid border, muted |
| In Progress | Solid border, colored |
| Blocked | Red ring |
| Completed | Dimmed, checkmark |

---

## Relationships

Edges between nodes carry a typed relationship label.

```ts
type RelationshipType =
  | "DEPENDS_ON"
  | "RELATED_TO"
  | "INFLUENCES"
  | "REUSES"
  | "BLOCKED_BY"
  | "COMPLIES_WITH"

interface ActivityEdge {
  id: string
  source: string            // node id
  target: string            // node id
  relationship: RelationshipType
  label?: string
}
```

Relationships are directed. An edge arrow points from source to target.

**Example:**
```
R&D: LLM Evaluation  --[INFLUENCES]-->  Offering: AI for SDLC
HR AI Assistant      --[COMPLIES_WITH]--> Responsible AI Policy
Internal Chatbot     --[REUSES]---------> Prompt Framework Accelerator
```

---

## UX Flow

### On load
- App renders the full graph from `data/graph.json`
- Nodes are positioned using a force-directed layout (or saved positions)
- No node is selected; drawer is hidden

### Browsing
- Pan by dragging the canvas background
- Zoom with scroll wheel or pinch
- Hover a node to see a quick tooltip (title + status + progress)
- Click a node to open the right-side drawer

### Editing a node
1. Click any node
2. Right drawer opens with all node fields
3. Fields are inline-editable
4. Changes auto-save on blur or explicit Save button
5. Drawer closes on Escape or clicking outside

### Adding a node
1. Click "Add Node" in the top bar
2. Modal form appears with required fields (title, category, status)
3. On submit, node appears on canvas near the center, drawer opens for it

### Deleting a node
- In the drawer: Delete button with confirmation
- Removes node and all connected edges

### Creating a relationship
1. Hover a node → a "connect" handle appears
2. Drag from the handle to another node
3. A small popover asks for relationship type
4. Edge is created and saved

### Filtering
- Category filter chips in the top bar
- Selecting a category dims all other nodes (non-destructive)
- Multiple categories can be active simultaneously

### Searching
- Search input in the top bar
- Matches against title, description, tags, owner
- Matching nodes are highlighted; non-matching nodes dim

---

## Persistence

All graph data lives in `data/graph.json`. The Next.js API routes handle reads and writes server-side. The client Zustand store is the source of truth at runtime; changes are flushed to the API (and thus the JSON file) on every meaningful mutation.

```json
{
  "nodes": [...],
  "edges": [...]
}
```

No database, no auth, no server state beyond the JSON file. This is intentional — the file can be committed to git, shared, or replaced easily.
