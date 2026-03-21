# Home Assistant AI Agent

A Home Assistant add-on that embeds a Claude-powered chat interface directly in your HA sidebar. Control devices, manage automations, and edit YAML configuration files through a single, polished UI — no terminal required.

![AI Agent chat UI](docs/screenshot.png)

## Features

- **Natural language control** — "Turn off all the lights downstairs" just works
- **Streaming responses** — Claude's reply appears word by word as it's generated
- **Tool transparency** — every HA API call is shown inline with its inputs and result
- **Action confirmations** — sensitive operations (locks, alarms, config edits) require explicit approval with a countdown timer
- **Config file editing** — Claude can read and write your YAML files with automatic `.bak` backups and YAML validation
- **Conversation history** — all chats are persisted in SQLite; pick up where you left off
- **Per-tool policies** — set any tool to auto-approve, always-confirm, or auto-deny from the settings UI
- **Mobile friendly** — responsive layout with slide-out sidebar, safe-area aware input

## Prerequisites

- Home Assistant OS or Supervised (2023.x or later)
- An [Anthropic API key](https://console.anthropic.com/)
- Docker (for building the image locally)

---

## Deployment

### Option 1 — Local add-on (recommended for first run)

This installs the add-on directly from a folder on your HA host without publishing to a repository.

**1. Copy the repository to your HA host**

```bash
# From your dev machine — copy to HA addons directory
scp -r home-assistant-ai-agent/ root@homeassistant.local:/addons/ha-ai-agent
```

Or if you have SSH access to HA and git installed:

```bash
ssh root@homeassistant.local
cd /addons
git clone https://github.com/alastaircunningham/home-assistant-ai-agent ha-ai-agent
```

**2. Build the Docker image on your dev machine (optional — faster than building on HA hardware)**

```bash
cd home-assistant-ai-agent

# Build for your HA architecture (aarch64 for Raspberry Pi, amd64 for x86)
docker build --platform linux/aarch64 -t local/ha-ai-agent:latest .
# or
docker build --platform linux/amd64 -t local/ha-ai-agent:latest .
```

**3. Install in Home Assistant**

1. In HA, go to **Settings → Add-ons → Add-on Store**
2. Click the three-dot menu (top right) → **Check for updates**
3. The "AI Agent" add-on should appear under **Local add-ons**
4. Click it → **Install**

**4. Configure the add-on**

In the add-on's **Configuration** tab:

```yaml
anthropic_api_key: "sk-ant-..."   # required
model: "claude-sonnet-4-5-20250514"      # optional, this is the default
log_level: "info"                  # optional: debug | info | warn | error
```

**5. Start the add-on**

Click **Start**. The add-on will appear as **AI Agent** in your HA sidebar.

---

### Option 2 — HA Add-on Repository

To install from a custom repository URL (allows one-click installs for other users):

1. In HA, go to **Settings → Add-ons → Add-on Store → ⋮ → Repositories**
2. Add: `https://github.com/alastaircunningham/home-assistant-ai-agent`
3. The add-on will appear in the store

---

### Option 3 — Local development (no HA required)

Run the server and client locally to iterate on UI/backend changes without a full HA deployment.

**Requirements:** Node.js 22, npm

```bash
# Install dependencies
cd server && npm install && cd ..
cd client && npm install && cd ..

# Build the client (outputs to server/dist/public/)
cd client && npm run build && cd ..

# Start the server
mkdir -p /tmp/ha-dev
cd server
DATA_DIR=/tmp/ha-dev node dist/index.js
```

Open http://localhost:8099 in your browser.

> **Note:** Without a `SUPERVISOR_TOKEN` env var, the server runs in development mode — auth is disabled and all HA tool calls will fail (no HA to connect to). You can still test the UI, conversation management, and settings.

To develop with hot reload:

```bash
# Terminal 1 — Vite dev server (proxies /api to localhost:8099)
cd client && npm run dev

# Terminal 2 — Server with tsx watch
cd server && DATA_DIR=/tmp/ha-dev npx tsx watch src/index.ts
```

Then open http://localhost:5173.

---

## Building the Docker image

```bash
# Single architecture
docker build -t ha-ai-agent:latest .

# Multi-arch (requires buildx)
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t yourregistry/ha-ai-agent:latest \
  --push .
```

---

## Configuration reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `anthropic_api_key` | string | — | **Required.** Your Anthropic API key. Stored encrypted at rest. |
| `model` | string | `claude-sonnet-4-5-20250514` | Claude model to use. |
| `log_level` | string | `info` | Log verbosity: `debug`, `info`, `warn`, `error`. |

The API key can also be set (or overridden) from the Settings panel inside the chat UI after the add-on starts.

---

## Usage

### Sending your first message

1. Click **AI Agent** in the HA sidebar
2. Click **New Chat**
3. Type a message, e.g. *"What lights are on right now?"*

### Controlling devices

The agent uses tools to interact with HA. You'll see each tool call displayed inline:

- *"Turn on the kitchen lights at 50% brightness"*
- *"Set the living room thermostat to 21°C"*
- *"Play jazz on the Sonos"*

### Action confirmations

Sensitive actions pause and show a confirmation card:

- *"Unlock the front door"* → approve or deny (30 second timeout)
- *"Arm the alarm in away mode"*
- *"Add an automation that turns off lights at midnight"*

### Editing config files

The agent can read and write your YAML files:

> *"Add an automation that turns on the porch light at sunset"*

Claude will use `config_editor` to write to `automations.yaml`. This **always** requires your confirmation. A `.bak` backup is created before every write.

### Settings

Click the ⚙ gear icon to:
- Change the API key or model
- Set a custom system prompt
- Adjust per-tool confirmation policies

---

## Confirmation policies

| Policy | Behaviour |
|--------|-----------|
| `auto_approve` | Tool runs immediately, result shown inline |
| `always_confirm` | Pauses with an approve/deny card (30s timeout) |
| `auto_deny` | Tool is silently blocked; Claude is told it was denied |

**Default policies:**

| Tool | Default |
|------|---------|
| `lock_control` | always_confirm |
| `alarm_control` | always_confirm |
| `config_editor` | always_confirm (cannot be changed) |
| All others | auto_approve |

---

## Troubleshooting

**Add-on won't start**
- Check the add-on log (Settings → Add-ons → AI Agent → Log)
- Ensure `anthropic_api_key` is set in the Configuration tab

**"Anthropic API key not configured" error**
- Set the key in the add-on Configuration tab *or* in the chat Settings modal

**Tools fail with "connection refused"**
- The add-on uses `SUPERVISOR_TOKEN` to call the HA REST API at `http://supervisor/core/api`. Ensure `homeassistant_api: true` is in `config.yaml` (it is by default).

**Chat UI doesn't load**
- Verify the add-on is running (green indicator)
- Try a hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
- Check that ingress is enabled in the add-on settings

**Config file writes fail**
- Blocked files (secrets.yaml, .storage/, .cloud/, etc.) cannot be written — this is intentional
- YAML validation errors will be shown in Claude's response

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 LTS (Alpine) |
| Backend | Express 4, ws |
| Frontend | React 18, Vite 6, Tailwind CSS 4 |
| AI | @anthropic-ai/sdk (streaming) |
| Database | better-sqlite3 |
| YAML | js-yaml |
| Container | Docker multi-stage, node:22-alpine |

## License

MIT
