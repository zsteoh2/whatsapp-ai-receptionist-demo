# Task Start

1. Classify the request as discussion, small change, or significant task.
2. For a significant task, copy `.ai/templates/task/` to `.ai/tasks/active/<YYYY-MM-DD-slug>/`.
3. Fill `task.json` and `request.md` from verified facts.
4. Point `.ai/runtime/active-task.json` to the task and set stage to `discovery`.
5. Inspect relevant code and authoritative documents; write references into `context.md`.
6. Continue with `task-plan.md`.
