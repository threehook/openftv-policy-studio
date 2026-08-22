# Policy Studio

A browser-based workbench for authoring and validating authorization policies in **Cedar** (AWS) and **Rego** (Open Policy Agent), backed by their real toolchains — not just syntax highlighting.

<p align="center">
  <em>Monaco-powered editors · schema-aware validation · file system open/save · light &amp; dark themes</em>
</p>

## Features

- **Cedar authoring** — schema and policy editors side by side, powered by AWS's official [`@cedar-policy/cedar-monaco-editor`](https://github.com/cedar-policy/cedar-monaco-editor) (a real Cedar WASM engine running entirely in the browser). Full syntax highlighting and schema-aware diagnostics — undefined actions, attribute typos, etc. — with no backend involved.
- **Rego authoring** — a JSON Schema editor for `input`, paired with a Rego policy editor. Edits are debounced and validated against a small Go API that runs the real [OPA](https://www.openpolicyagent.org/) compiler (`ast.ParseModule` + `ast.Compiler`), so syntax errors *and* schema-aware type errors (e.g. `input.usr` when the schema only declares `input.user`) are both caught.
- **One switch, two toolchains** — a header toggle swaps the whole workspace between Cedar/AWS and Rego/OPA, each with its own file-backed editors.
- **Real file I/O** — Open, Save, and New for every editor, using the browser's File System Access API where available (writes back to the same file in place), with a graceful fallback (file input + download) on browsers that don't support it.
- **Ctrl/Cmd+S** saves whichever editor pane currently has focus.
- **Light & dark themes** — a header toggle switches both the app chrome and the Monaco editors together.

## Repository layout

```
.
├── ui/                   # React + TypeScript + Vite frontend
│   └── src/
│       ├── App.tsx               # layout, language/theme switches, wiring
│       ├── useFileEditor.ts      # Open/Save/New via File System Access API
│       ├── useRegoValidation.ts  # debounced calls to the Rego validation API
│       └── regoLanguage.ts       # Monaco Monarch syntax highlighting for Rego
├── api/                  # Go backend for Rego validation
│   ├── main.go                   # HTTP server (/api/health, /api/rego/validate)
│   └── internal/rego/            # OPA-backed parse/compile validation
└── policies/             # example Cedar and Rego policies authored in the app
```

## Getting started

**Prerequisites:** Node.js 20+, Go 1.24+, and a Chromium-based browser (Chrome/Edge) for full file system access — other browsers fall back to a download-based save.

### 1. Run the API (required for Rego validation)

```bash
cd api
go run .
```

Listens on `http://localhost:8787`. If it's not running, the Rego panes will keep working for editing, but the diagnostics panel will show *"Cannot reach validation API — is it running?"* instead of silently looking fine.

### 2. Run the frontend

```bash
cd ui
npm install
npm run dev
```

Open the printed local URL (e.g. `http://localhost:5173`).

## Notes

- The Rego validation API is currently a plain REST endpoint (`POST /api/rego/validate`), not a full Language Server. It's deliberately the simpler of two possible designs — the other being a WebSocket bridge to Regal's `language-server` for full LSP features (hover, completions, richer lint rules). Swapping in the latter later wouldn't need to change the frontend contract much.
- The API is stateless: it never reads from or writes to disk. Policy and schema text are sent in the request body from whatever's currently in the browser; only *you*, saving through the editor's Save button, touches the filesystem.
