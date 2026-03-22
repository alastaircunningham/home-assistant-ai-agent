# CLAUDE.md — Home Assistant AI Agent

## Project overview

A Home Assistant add-on that provides a chat UI powered by Claude AI. Users can control devices, manage automations, and edit YAML config files through a single browser-based interface embedded in the HA sidebar.

## Repo structure

```
home-assistant-ai-agent/
├── config.yaml          # HA add-on manifest (slug: ha-ai-agent)
├── Dockerfile           # Multi-stage build: node:22-alpine
├── run.sh               # Add-on entrypoint (reads /data/options.json via bashio)
├── server/              # Express + WebSocket backend (TypeScript, ESM)
└── client/              # React + Vite + Tailwind frontend (TypeScript)
```

## Build commands

```bash
# Install deps
cd server && npm install
cd client && npm install

# Type-check only (fast)
cd server && npx tsc --noEmit
cd client && npx tsc --noEmit

# Production build (client output goes into server/dist/public/)
cd client && npm run build
cd server && npm run build

# Local dev server (no HA, no SUPERVISOR_TOKEN)
mkdir -p /tmp/ha-dev
DATA_DIR=/tmp/ha-dev cd server && node dist/index.js
```

## Architecture

```
React app (client/)
  ↕ HTTP REST  /api/...
  ↕ WebSocket  /api/ws
Express server (server/)
  ├── ChatService      → Anthropic streaming API (tool_use loop)
  ├── ToolRegistry     → 18 registered tools
  ├── ToolExecutor     → confirmation gate (always_confirm / auto_approve / auto_deny)
  ├── ConfigEditor     → YAML read/write on /homeassistant
  └── SQLite           → /data/chat.db (conversations, messages, settings, policies)
```

## Key files

| File | Purpose |
|------|---------|
| `server/src/index.ts` | Express + WS server entry, mounts all routes |
| `server/src/services/chat.ts` | Core chat loop: Claude streaming + tool dispatch |
| `server/src/services/claude.ts` | Anthropic SDK wrapper, streaming callbacks |
| `server/src/services/tool-executor.ts` | Runs tools, checks confirmation policy |
| `server/src/tools/registry.ts` | Tool registration + Zod → JSON Schema conversion |
| `server/src/tools/hass-client.ts` | HA REST API client (SUPERVISOR_TOKEN) |
| `server/src/services/config-editor.ts` | Safe YAML file operations |
| `server/src/db/database.ts` | SQLite init + migrations |
| `client/src/hooks/useChat.ts` | WS message handling, streaming state |
| `client/src/context/WebSocketContext.tsx` | WS connection + auto-reconnect |

## WebSocket protocol

All messages are flat JSON (fields not nested under `data`).

**Server → client:**
```json
{ "type": "message_delta", "conversation_id": "...", "content": "chunk" }
{ "type": "message_complete", "conversation_id": "..." }
{ "type": "tool_executing", "conversation_id": "...", "tool_name": "...", "tool_input": {} }
{ "type": "tool_result", "conversation_id": "...", "tool_name": "...", "success": true, "result": {} }
{ "type": "confirmation_required", "id": "...", "conversation_id": "...", "tool_name": "...", "tool_input": {}, "description": "...", "timeout_seconds": 30 }
{ "type": "error", "conversation_id": "...", "error": "message" }
```

**Client → server:**
```json
{ "type": "send_message", "data": { "conversationId": "...", "content": "..." } }
{ "type": "confirmation_response", "id": "...", "approved": true }
```

## Environment variables

| Variable | Source | Description |
|----------|--------|-------------|
| `ANTHROPIC_API_KEY` | `/data/options.json` or env | Claude API key |
| `MODEL` | `/data/options.json` or env | Default: `claude-sonnet-4-5-20250514` |
| `LOG_LEVEL` | `/data/options.json` or env | `debug\|info\|warn\|error` |
| `SUPERVISOR_TOKEN` | HA runtime (auto-injected) | HA API auth |
| `DATA_DIR` | env (dev only) | SQLite location; defaults to `/data` |
| `PORT` | env (dev only) | HTTP port; defaults to `8099` |

## Tool categories

- **device-control**: lights, climate, media, cover, lock (always_confirm), fan, vacuum, alarm (always_confirm), switch
- **automation**: automation_manage, scene_activate
- **system**: list_devices, get_entity_state, get_history, send_notification, search_entities, addon_info
- **config**: config_editor (always_confirm, hardcoded)

## Confirmation policies

Default policies are seeded into SQLite on first run. They can be changed via the Settings UI or `PUT /api/confirmations/:toolName`.

Tools that **always require confirmation** by default: `lock_control`, `alarm_control`, `config_editor`.

`config_editor` confirmation cannot be overridden — it is hardcoded in `tool-executor.ts`.

## Adding a new tool

1. Create `server/src/tools/<category>/<name>.ts`
2. Define a `ToolDefinition` with a Zod `inputSchema` and `execute` function
3. Call `registerTool(myTool)` at the bottom of the file
4. Import the file in `server/src/tools/index.ts`

## SQLite schema

```sql
conversations (id, title, created_at, updated_at)
messages      (id, conversation_id, role, content, tool_name, tool_input, tool_result, created_at, seq)
settings      (key, value)                          -- api_key (encrypted), model, system_prompt, etc.
confirmation_policies (tool_name, policy)
```

The API key is stored AES-256-GCM encrypted. The encryption key lives at `/data/.encryption_key` (generated on first run).

## TODO

- [x] **Context window management for long chats** — Currently the full conversation history is sent to the Claude API on every turn with no truncation or token counting. Long chats will eventually exceed the model's context window (400 error) and cost escalates with every turn. Implement:
  1. Token estimation before calling `streamChat` (heuristic ~4 chars/token or a proper tokenizer)
  2. A token budget (e.g. 80% of model context window minus `max_tokens` response budget)
  3. Sliding-window truncation: drop oldest message pairs when over budget, always keeping the first user message and all recent messages within budget
  4. Optionally prepend a note when messages are trimmed ("Earlier messages were trimmed for length")
  5. UX-level safeguard: warn the user when a conversation is getting long and suggest starting a new chat
  6. Fix `PendingConfirmation` to store only metadata and re-fetch messages from DB when resuming, rather than holding the full message array in memory

- [x] **Fix dropped streaming deltas (garbled chat text)** — `WebSocketContext` stores a single `lastMessage` state value that gets overwritten when React batches rapid `setLastMessage` calls during streaming. Intermediate `message_delta` chunks are silently lost, causing dropped characters and garbled text. Fix by replacing the single-value `lastMessage` pattern with a message queue (ref-backed array processed each render) or by accumulating streaming content directly in the `onmessage` handler via a ref, bypassing React state batching for high-frequency deltas.

- [x] **Add database indexes on messages table** — `messages` table has no index on `conversation_id`. Every `getMessages()` call and `getNextSeq()` `MAX(seq)` query is a full table scan. Add `CREATE INDEX IF NOT EXISTS idx_messages_conversation_seq ON messages(conversation_id, seq)` via a migration in `server/src/db/database.ts`.

- [x] **Add timeout on Claude API calls** — `streamChat` in `claude.ts` awaits `stream.finalMessage()` with no timeout. If the Anthropic API hangs, the conversation loop blocks indefinitely. Wrap with `Promise.race()` and a reasonable timeout (e.g. 120s), and propagate a clear error to the client.

- [x] **Fix race condition in `getNextSeq()`** — `messages.repo.ts` reads `MAX(seq)` and returns `+1` in two separate steps. Concurrent calls can read the same max and produce duplicate sequence numbers, corrupting message order. Make this atomic using a transaction or `INSERT...RETURNING`.

- [x] **Fix stale messages in `resumeAfterConfirmation`** — `PendingConfirmation` captures the full messages array at confirmation time. If the conversation progresses before the user responds, the resumed loop uses stale context. Re-fetch messages from the DB instead of using the captured array.

- [x] **Handle confirmation timeout expiry on client** — When the 30s confirmation timeout fires, the entry is deleted from the `pendingConfirmations` map but the client is never notified. If the user then approves, `resumeAfterConfirmation` silently no-ops. Broadcast a `confirmation_expired` event to the client so the UI can clear the prompt and show a message.

## Common gotchas

- All server imports must use `.js` extensions (ESM + NodeNext module resolution).
- `@types/express` must stay at `^4.x` — the project uses Express 4, not 5.
- The client build outputs to `server/dist/public/` — run the client build before the server build in CI.
- `sendToAll(type, data)` spreads `data` flat onto the message object (not nested under `.data`).
- When running locally without `SUPERVISOR_TOKEN`, auth middleware allows all IPs and the HA client will fail — this is expected.
