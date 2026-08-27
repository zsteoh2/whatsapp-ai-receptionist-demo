# AI Platform Adapters

The initializer creates thin native entry files that point to the shared session workflows. Core project facts remain outside platform-specific files.

| Platform | Auto-discovered entry |
|---|---|
| Codex | `AGENTS.md` |
| OpenCode with DeepSeek or another model | `AGENTS.md` |
| Claude Code | `CLAUDE.md` |
| Cursor | `.cursor/rules/ai-context.mdc` |
| Gemini CLI | `GEMINI.md` |

Existing entry files are skipped, never overwritten or merged. Add the bootstrap lines manually when an existing file does not already route to `AI_SESSION_START.md` and `AI_SESSION_END.md`.

Adapters must stay small and must not redefine project facts. Hooks remain optional and may run validation, but Markdown remains the portable fallback and source of truth.
