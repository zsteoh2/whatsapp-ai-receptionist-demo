# Optional Agent Roles

Multiple agents are optional. A single AI may perform several roles, but must keep their passes logically separate.

| Role | Responsibility | May change production code |
|---|---|---|
| Coordinator | Classify requests, select the primary task, maintain active state, resolve conflicts | Only when also acting as implementer |
| Research | Inspect code/docs, find existing patterns, record verified findings | No, unless explicitly requested |
| Planning | Map constraints, affected modules, steps, risks, and verification | No |
| Implementation | Follow the plan, modify code, record meaningful deviations, run focused checks | Yes |
| Review | Independently inspect diff and compliance, run verification, identify regressions | No during the review pass |
| Documentation | Synchronize changed facts, promote durable knowledge, update memory and handoff | Documentation only |

No agent may keep hidden project truths. Record important discoveries in the active task workspace or the correct authoritative document.
