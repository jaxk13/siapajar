# SIAPAJAR

Read `AGENTS.md` first.

Then read the relevant documents:

- `docs/PRD.md`
- `docs/DESIGN.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/API.md`
- `docs/DEVELOPMENT.md`
- `docs/TASKS.md`
- `docs/DECISIONS.md`
- `docs/ERD.dbml`
- `src/README.md` (frontend routes & files) and `server/README.md` (backend routes & files)
- `Logbook/README.md` (change history)

`AGENTS.md` is the primary development instruction.

## Operating Rules

- Follow the current task scope.
- Do not implement unrelated features.
- Do not redesign existing UI unless requested.
- Do not introduce dependencies without justification.
- Preserve External AI First and Local First decisions for MVP.
- Keep frontend, backend, parser, validator, and export responsibilities separated.
- Ask for clarification when requirements conflict instead of guessing.

For substantial work, use:

PLAN → APPROVAL → IMPLEMENT → VERIFY

After implementation, report changed files and verification results, and record the change in `Logbook/` as `logbook-<nama-perubahan>-<nomor>.md` (AGENTS.md §11).
