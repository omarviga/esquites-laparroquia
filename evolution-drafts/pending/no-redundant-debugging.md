# Evolution Proposal: no-redundant-debugging

## Signal
- tool_calls: 24 (>=6)
- tool_errors: 2 (>=1)
- User excerpt: "me arroja lo mismo... por favor necesito que no estés redundando si ya sabes por donde va el error.."

## Proposed Change
Add a debugging lesson to MEMORY.md: when an error pattern is already understood from prior turns/sessions, skip redundant re-diagnosis and go directly to the fix or a different approach.
