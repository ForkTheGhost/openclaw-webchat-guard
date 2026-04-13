/**
 * Webchat Guard Plugin for OpenClaw
 *
 * Prevents agents from using Discord tools when the session originated
 * from CTRL webchat. Detects webchat sessions by the `webchat:ctrl:`
 * prefix in the sessionKey and/or the `metadata.source === 'webchat'`
 * field in the chat.send RPC payload.
 *
 * When a webchat session tries to call a blocked tool (e.g., message,
 * send_discord_message), the hook returns a text response telling the
 * agent to respond directly instead.
 *
 * Install: copy to ~/.openclaw/extensions/webchat-guard/ on each gateway,
 * then add to openclaw.json plugins.entries and restart.
 */

import { definePluginEntry } from "/usr/lib/node_modules/openclaw/dist/plugin-sdk/core.js";

// Session keys that start with this prefix came from CTRL webchat.
const WEBCHAT_PREFIX = "webchat:ctrl:";

// Tools to block in webchat sessions. These are Discord-specific tools
// that agents try to use when they don't know the session is webchat.
const BLOCKED_TOOLS = new Set([
  "message",
  "send_discord_message",
  "send_message",
  "add_reaction",
  "send_discord_reaction",
  "reply",
]);

// Track which sessions are webchat-originated.
const webchatSessions = new Set();

export default definePluginEntry({
  name: "webchat-guard",
  version: "1.0.0",
  description: "Blocks Discord tools in CTRL webchat sessions",

  register(api) {
    // Detect webchat sessions from the sessionKey or metadata.
    // message_received fires for every inbound message, including the
    // initial chat.send RPC. The sessionKey is available in ctx.session.
    api.on("message_received", async (ctx) => {
      const key = ctx.session?.sessionKey || ctx.session?.key || "";
      const metadata = ctx.message?.metadata;

      if (
        key.startsWith(WEBCHAT_PREFIX) ||
        (metadata && metadata.source === "webchat")
      ) {
        const sessionId = ctx.session?.id || ctx.session?.sessionKey || key;
        webchatSessions.add(sessionId);
      }
    });

    // Also check on session_start for sessions that resume.
    api.on("session_start", async (ctx) => {
      const key = ctx.session?.sessionKey || ctx.session?.key || "";
      if (key.startsWith(WEBCHAT_PREFIX)) {
        const sessionId = ctx.session?.id || ctx.session?.sessionKey || key;
        webchatSessions.add(sessionId);
      }
    });

    // Clean up when sessions end.
    api.on("session_end", async (ctx) => {
      const sessionId = ctx.session?.id || ctx.session?.sessionKey || "";
      webchatSessions.delete(sessionId);
    });

    // Block Discord tools in webchat sessions.
    api.registerHook(
      "before_tool_call",
      async (ctx) => {
        const sessionId = ctx.session?.id || ctx.session?.sessionKey || "";
        if (!webchatSessions.has(sessionId)) return; // not webchat, allow

        const toolName = (ctx.tool?.name || ctx.toolName || "").toLowerCase();
        if (BLOCKED_TOOLS.has(toolName)) {
          // Return a synthetic tool result that tells the agent to
          // respond inline instead of using Discord tools.
          return {
            blocked: true,
            result: `[webchat-guard] Tool "${toolName}" is not available in this session. ` +
              `This conversation is happening in CTRL webchat, not Discord. ` +
              `Respond with your message directly as text content instead of using Discord tools.`,
          };
        }
      },
      { name: "webchat-guard" }
    );

    console.log("[webchat-guard] Registered: blocking Discord tools in webchat sessions");
  },
});
