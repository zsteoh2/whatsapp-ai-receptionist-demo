# Decisions

- Use one Express service and Supabase Free; no queue, dashboard, or keep-alive.
- Run deterministic safety checks before any LLM call.
- Keep facts and booking actions in code; the LLM only classifies/extracts constrained data.
- Use VectorEngine's `https://api.vectorengine.cn/v1` OpenAI-compatible Chat Completions endpoint with `gpt-5.6-luna`; keep its Base URL configurable.
