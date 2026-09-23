---
name: axon-rules
description: Audit Axon code against the project rules in .claude/rules/ (project structure, components, data and hooks, routing, Supabase, and the design system once finalised). Use before marking any feature phase complete, when the user asks to "check the rules", "audit conventions", "is this following our structure", or "review against rules", and whenever you are unsure where a file, hook or query belongs in Axon. It reports violations with file:line and fixes them on request.
---

# Axon Rules Audit

The rules are the source of truth. This skill only applies them. Never restate or override a rule here. If a rule is wrong, propose changing the rule file.

## Step 1: Scope

Decide which files to audit:

- **After a phase:** the files created or changed in that phase. List them from the phase's component tree and from your edits.
- **When the user names files or folders:** those.
- **When asked for a full audit:** `src/` and `supabase/migrations/`.

## Step 2: Load the rules

Read every file in `.claude/rules/`. If `design-system.md` is still a placeholder, audit only its interim rules: semantic tokens only, no raw hex, no arbitrary values, motion only from presets.

## Step 3: Check

Use Grep and Glob for the mechanical checks, then read files for the judgement checks.

**Mechanical checks** (grep):

| Check | How |
|---|---|
| Supabase imported outside allowed files | grep `@/lib/supabase\|@supabase/supabase-js` in `src/`, excluding `lib/supabase.js`, `features/*/api.js` and `context/AuthContext.jsx` |
| Relative climbing imports | grep `from '\.\./` in `src/` |
| Barrel files | glob `src/**/index.js` |
| TypeScript files | glob `src/**/*.{ts,tsx}` |
| Hardcoded app URLs | grep `` to={`/s/ `` and `navigate\(\`/` in `src/`, since URLs should come from `paths` / `useSpacePaths` |
| Raw colours and arbitrary values | grep `#[0-9a-fA-F]{3,6}\b\|\[[0-9]+px\]` in `.jsx` |
| Ad-hoc motion | grep `transition=\{\{` and `duration:` outside `components/motion/presets.js` |
| Fetching in effects | grep `useEffect` near `supabase\|fetch(` |
| Spinners for page loads | grep `Loader2\|animate-spin` outside buttons |
| Missing RLS | for each `create table` in `supabase/migrations/`, a matching `enable row level security` |
| Broad policies | grep `using \(true\)\|auth.uid\(\) is not null` in migrations |
| Functions without search_path | `create .*function` blocks lacking `set search_path` |
| Migration mirror | each MCP-applied migration (`list_migrations`) has a file in `supabase/migrations/` |

**Judgement checks** (read the code):

- Files are in the right folder (the "Where does a file go?" table), named correctly, and use named exports.
- Scoped queries take `spaceIds`, filter `deleted_at`, and use the key factory. Mutation hooks own invalidation.
- Components handle the loading, error, empty and data states. Dialogs are controlled and use RHF with zod. Global-scope create dialogs have a SpacePicker.
- Soft delete uses an Undo toast, and permanent deletes use ConfirmDialog.
- Pages are thin and call `usePageHeader`.
- Every new table has composite ownership FKs.

## Step 4: Report

Give a compact table, grouped by rule file:

| Severity | Rule | Location | Problem | Fix |
|---|---|---|---|---|
| must-fix / should-fix | `data-and-hooks.md`: mutation hooks own invalidation | `src/features/tasks/components/TaskRow.jsx:42` | `invalidateQueries` in component | move to `useUpdateTask` |

- **must-fix:** breaks a boundary, security, data correctness or scope.
- **should-fix:** a convention or consistency problem.

If there are no violations, say so in one line. When running as part of `axon-feature` Step 4, fix must-fix items straight away, then list what changed. Otherwise ask before fixing.
