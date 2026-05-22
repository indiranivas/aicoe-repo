# Implementation Plan — AI CoE Graph Workspace

Incremental build. Each phase is independently shippable. No phase introduces complexity beyond what the next interaction requires.

---

## Phase 1 — App Shell

**Goal:** Blank Next.js app with correct layout, theme, and folder structure in place. Nothing interactive yet.

### Tasks

- [ ] `npx create-next-app@latest` with TypeScript, Tailwind, App Router
- [ ] Install dependencies:
  - `reactflow`
  - `zustand`
  - `shadcn/ui` (init + add: button, input, badge, drawer, dialog, select, textarea, slider, tooltip)
- [ ] Set up dark mode in `tailwind.config.ts` (class strategy, dark as default)
- [ ] Create folder structure:
  ```
  app/
  components/graph/
  components/drawer/
  components/toolbar/
  store/
  lib/
  data/
  ```
- [ ] Create `lib/types.ts` — full TypeScript types for `ActivityNode`, `ActivityEdge`, `NodeCategory`, `NodeStatus`, `RelationshipType`
- [ ] Create `data/graph.json` — seed file with 8–10 realistic sample nodes and 6–8 edges covering all 5 categories
- [ ] Create `app/layout.tsx` — dark background (`bg-gray-950`), font, metadata
- [ ] Create `app/page.tsx` — placeholder shell with top bar + graph area div

**Deliverable:** App runs. Dark page with placeholder regions visible.

---

## Phase 2 — Graph Rendering

**Goal:** All nodes from `graph.json` rendered on the canvas as styled cards. Edges visible with relationship labels. Pan and zoom work.

### Tasks

- [ ] Create `app/api/nodes/route.ts` — GET handler reads `data/graph.json`, returns `{ nodes, edges }`
- [ ] Create `lib/data.ts` — `loadGraph()` and `saveGraph()` helpers (fs read/write on `data/graph.json`)
- [ ] Create `store/graphStore.ts` — Zustand store:
  ```ts
  {
    nodes: ActivityNode[]
    edges: ActivityEdge[]
    selectedNodeId: string | null
    activeCategories: NodeCategory[]
    searchQuery: string
    setNodes, setEdges, selectNode, setFilter, setSearch
  }
  ```
- [ ] Create `components/graph/NodeCard.tsx` — custom React Flow node:
  - Shows: title, category badge, status indicator, progress bar
  - Category color on left border
  - Status: dashed border for Idea, red ring for Blocked, muted for Completed
  - Compact — fits in ~220×110px
- [ ] Create `components/graph/EdgeLabel.tsx` — custom edge with centered relationship type label
- [ ] Create `components/graph/GraphCanvas.tsx`:
  - Wraps `<ReactFlow>` with `<ReactFlowProvider>`
  - Loads nodes/edges from Zustand
  - Registers custom node type `activityNode` and custom edge type `labeledEdge`
  - Enables: `fitView`, `panOnDrag`, `zoomOnScroll`, `nodesDraggable`
  - MiniMap in bottom-left corner
  - Controls (zoom in/out/fit) in bottom-right
- [ ] Wire `GraphCanvas` into `app/page.tsx`
- [ ] Fetch seed data from API on mount, hydrate Zustand store

**Deliverable:** All seed nodes visible as styled cards on an interactive canvas. Edges connect them with labels. Pan and zoom work.

---

## Phase 3 — Editable Node Drawer

**Goal:** Clicking a node opens a right-side panel showing all node fields. Fields are editable inline.

### Tasks

- [ ] Create `components/drawer/NodeDrawer.tsx`:
  - Slides in from right when `selectedNodeId` is set
  - Width: ~380px, full height
  - Header: node title (editable) + close button
  - Closes on Escape or backdrop click
- [ ] Create `components/drawer/NodeForm.tsx`:
  - Fields: title, description, category (select), owner, status (select), progress (slider 0–100), tags (comma-separated input), notes (textarea), links (multi-line)
  - All fields pre-populated from selected node
  - Save button triggers `PATCH /api/nodes/[id]`
  - Delete button with confirmation dialog triggers `DELETE /api/nodes/[id]`
- [ ] Add `PATCH` and `DELETE` handlers to `app/api/nodes/[id]/route.ts`
- [ ] On save: update Zustand store + persist to JSON
- [ ] On delete: remove node and all connected edges from store + JSON
- [ ] Selected node card on canvas gets a highlight ring

**Deliverable:** Click any node → drawer opens → edit any field → save persists → delete removes from graph.

---

## Phase 4 — Add Node / Create Relationships

**Goal:** Users can add new nodes via a modal form. Users can draw edges between nodes to create typed relationships.

### Tasks

**Add Node:**
- [ ] Create `components/toolbar/AddNodeModal.tsx`:
  - Dialog triggered by "Add Node" button in top bar
  - Required fields: title, category, status
  - Optional: description, owner, progress
  - On submit: `POST /api/nodes` → new node added to center of canvas → drawer opens for it
- [ ] Add `POST` handler to `app/api/nodes/route.ts`
- [ ] New node gets a generated `id` (nanoid or crypto.randomUUID) and default position

**Create Relationships:**
- [ ] Enable React Flow connection mode:
  - `connectOnClick: false`
  - Source/target handles visible on hover
  - `onConnect` callback fires when user drags handle to handle
- [ ] Create `components/graph/RelationshipPopover.tsx`:
  - Small popover appears after a connection is drawn
  - Dropdown to choose relationship type (DEPENDS_ON, RELATED_TO, INFLUENCES, REUSES, BLOCKED_BY, COMPLIES_WITH)
  - Confirm button saves edge; Cancel discards pending edge
- [ ] Add edge `POST` to `app/api/nodes/route.ts` (or separate `app/api/edges/route.ts`)
- [ ] Edge saved to Zustand + JSON

**Deliverable:** Full CRUD for nodes. Edges can be drawn between any two nodes with a chosen relationship type.

---

## Phase 5 — Persistence

**Goal:** All mutations reliably write to `data/graph.json`. Node positions are saved when dragged.

### Tasks

- [ ] Verify all API routes (GET, POST, PATCH, DELETE) correctly read and write `data/graph.json` atomically (write to temp then rename, or simple overwrite is fine at this scale)
- [ ] Save node positions on drag-end:
  - React Flow `onNodeDragStop` fires with updated `x, y`
  - `PATCH /api/nodes/[id]` with `{ position: { x, y } }`
  - Positions stored in `ActivityNode.position`
- [ ] On app load: if `position` exists on a node, use it; otherwise use auto-layout (simple grid or dagre)
- [ ] Add `lib/layout.ts` with a basic `autoLayout(nodes, edges)` using `dagre` for nodes without saved positions
  - Install: `dagre` + `@types/dagre`
- [ ] Confirm full round-trip: add node → reload page → node present with last position and all edits

**Deliverable:** State survives page refresh. Dragging nodes remembers position.

---

## Phase 6 — Filtering and Search

**Goal:** Users can filter the graph by category and search by text. Non-matching nodes dim, not disappear.

### Tasks

- [ ] Create `components/toolbar/CategoryFilter.tsx`:
  - 5 category chips (pill buttons) in the top bar
  - Each toggles its category in `activeCategories` in the store
  - All active by default
  - Active chip: filled color; inactive: muted outline
- [ ] Filtering logic in `GraphCanvas.tsx` (or store selector):
  - If a node's category is not in `activeCategories`, set its React Flow node `style.opacity = 0.15`
  - Do not remove nodes — keep graph structure intact
- [ ] Create `components/toolbar/SearchInput.tsx`:
  - Controlled input in top bar
  - Debounce 200ms
  - Updates `searchQuery` in store
- [ ] Search logic:
  - If `searchQuery` is non-empty, nodes that do NOT match get `opacity: 0.15`
  - Match against: title, description, owner, tags (case-insensitive)
  - Matching nodes get a subtle highlight ring
- [ ] Category filter and search compose: a node is visible only if it passes both

**Deliverable:** Filter chips and search box both work. Non-matching nodes dim on the canvas.

---

## Phase 7 — Polish

**Goal:** The app feels intentional, smooth, and fast. No rough edges.

### Tasks

**Visual:**
- [ ] Smooth drawer slide-in animation (Tailwind `transition-transform`)
- [ ] Node hover: subtle scale-up (`scale-105`) and shadow lift
- [ ] Edge hover: edge and label highlight
- [ ] Add category legend in bottom-left (above MiniMap) — small color swatches
- [ ] Progress bar on node card uses category color
- [ ] Completed nodes: 50% opacity + faint checkmark icon

**UX:**
- [ ] Tooltip on node hover: title + owner + last updated (React Flow `<Tooltip>`)
- [ ] Empty state: if no nodes exist, show centered "Add your first node" prompt
- [ ] Keyboard shortcut: `N` opens Add Node modal, `Escape` closes drawer/modal
- [ ] "Fit view" button in top bar resets pan/zoom

**Reliability:**
- [ ] Error boundary around `GraphCanvas` — if rendering fails, show a reset button
- [ ] If API write fails, show a toast notification (shadcn/ui `toast`)
- [ ] Validate form inputs before POST/PATCH (title required, progress 0–100)

**Performance:**
- [ ] Memoize custom node component with `React.memo`
- [ ] Zustand selectors with shallow equality to avoid unnecessary re-renders
- [ ] `data/graph.json` writes are debounced 300ms to avoid thrashing on rapid edits

**Deliverable:** App is visually polished, snappy, and handles edge cases gracefully. Ready to use.

---

## Dependency Summary

```
Core:
  next@14          react@18          typescript
  tailwindcss      @tailwindcss/typography

Graph:
  reactflow        dagre             @types/dagre

State:
  zustand

UI:
  @shadcn/ui components:
    button  input  badge  drawer  dialog
    select  textarea  slider  tooltip  toast

Utilities:
  nanoid (node ID generation)
```

---

## File Creation Order

```
Phase 1:  lib/types.ts → data/graph.json → app/layout.tsx → app/page.tsx
Phase 2:  lib/data.ts → store/graphStore.ts → api/nodes/route.ts
          → components/graph/NodeCard.tsx → EdgeLabel.tsx → GraphCanvas.tsx
Phase 3:  api/nodes/[id]/route.ts → components/drawer/NodeForm.tsx → NodeDrawer.tsx
Phase 4:  components/toolbar/AddNodeModal.tsx → components/graph/RelationshipPopover.tsx
Phase 5:  lib/layout.ts → position persistence in API + store
Phase 6:  components/toolbar/CategoryFilter.tsx → SearchInput.tsx → filter logic in store
Phase 7:  animations, tooltips, keyboard shortcuts, toasts, memoization
```
