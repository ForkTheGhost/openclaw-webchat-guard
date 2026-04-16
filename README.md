# openclaw-webchat-guard

OpenClaw plugin that prevents agents from using Discord tools when the session originated from CTRL webchat.

## Problem

When CTRL sends a chat message to an OpenClaw gateway, the agent doesn't know the session is webchat — it tries to use Discord tools (e.g., `message`, `send_discord_message`), wrapping its response in JSON tool calls instead of plain text.

## Solution

This plugin detects webchat sessions by:
1. The `webchat:ctrl:` prefix in the sessionKey
2. The `metadata.source === 'webchat'` field in the chat.send RPC payload

When a webchat session tries to call a blocked tool, the hook returns a synthetic result telling the agent to respond directly as text.

## Blocked tools

- `message`
- `send_discord_message`
- `send_message`
- `add_reaction`
- `send_discord_reaction`
- `reply`

## Install

```bash
# On the gateway host (e.g., Sofia CT113, Caroline CT119)
cd ~/.openclaw/extensions/
git clone https://github.com/ForkTheGhost/openclaw-webchat-guard.git webchat-guard
```

Add to `openclaw.json`:
```json
{
  "plugins": {
    "entries": {
      "webchat-guard": {
        "enabled": true
      }
    }
  }
}
```

Restart the gateway:
```bash
systemctl restart openclaw-gateway
```

## Requires

- CTRL v3.2+ (sends `metadata.source: 'webchat'` in chat.send RPC)
- OpenClaw with plugin support and `before_tool_call` hook

## Contributing

### Issues

All features and bug reports must be tracked as GitHub Issues before any work begins. Issues are the authoritative record of intent — PRs without a corresponding issue will not be merged.

### Pull Requests

All changes require a PR. Direct commits to the default branch are not permitted.

**PR requirements:**
- Reference the issue in the PR description (`Closes #N` or `Ref #N`)
- Include a `CHANGELOG.md` entry — one entry per issue, referencing the issue number for full context
- All code review comments must be acknowledged and addressed before merge — no unresolved items at merge time
