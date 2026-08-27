# Decisions

- Use one Express service and Supabase Free; no queue, dashboard, or keep-alive.
- Run deterministic safety checks before any LLM call.
- Keep facts and booking actions in code; the LLM only classifies/extracts constrained data.
