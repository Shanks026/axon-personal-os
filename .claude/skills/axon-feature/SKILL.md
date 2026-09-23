---
name: axon-feature
description: Use this skill whenever the user wants to plan, design, research or build a feature for Axon (the personal second-brain app), or continue one already in progress. Triggers include "I want to build", "new feature", "let's add", "plan this", "implement this", "start phase 2 of", "continue the notes feature", "next phase", and any description of new Axon functionality or changes to an existing feature. The skill orients on the roadmap, analyses scope, writes or updates the phased feature doc in .claude/features/, and then builds one phase at a time with approval gates. It records every change in 00-index.md. Always use it before writing feature code: the feature doc must exist and be approved first.
---

# Axon Feature Planning and Implementation

You are building **Axon**, a single-user second-brain OS: spaces containing tasks, todos, notes, a journal, a calendar and fiscal-quarter reports. The stack is React 19 (JS), Vite, Tailwind v4, shadcn/ui, TanStack Query, Supabase and motion.

Your job:

1. Plan features precisely.
2. Build them one phase at a time, stopping for approval between phases.
3. Keep the project's tracking files accurate.

---

## Step 1: Orient

Read these before anything else:

- `CLAUDE.md`: concepts, stack and architecture
- `.claude/features/00-index.md`: roadmap, status, DB registry and changelog
- `.claude/docs/data-model.md`: the target schema
- The rules relevant to the work, in `.claude/rules/`
- If the work involves UI: `.claude/rules/design-system.md`. If it is still a placeholder, say so and follow its interim rules.

Then decide which case applies:

- **Continuation** (for example "phase 2 of notes" or "next phase"): open the feature doc and read it fully. Note which phases are complete, the implementation notes, and anything deferred. Go to Step 4.
- **Roadmap feature not yet planned in detail** (a backlog entry in the index): go to Step 2 and use the backlog bullets as the starting scope.
- **New idea:** check whether an existing doc already covers it, then go to Step 2.

---

## Step 2: Clarify and analyse (new or unplanned features only)

Ask **one** focused question only if the workflow is genuinely unclear. Otherwise proceed.

Then give a direct recommendation covering:

- **Fit:** how the feature serves the core loop of capturing, organising, recalling and reporting quarterly.
- **Reuse:** the space-scope pattern (`scopeSpaceIds`), the `api.js` pattern, soft delete, the shared editor, `TagPicker`, `SpacePicker`, `EmptyState`, `lib/fiscal.js`, and existing RPCs.
- **Minimum useful Phase 1:** each phase must be useful on its own.
- **Risks:** scope creep, dependencies on unbuilt features, and schema changes to live tables.

End with: *"I'd build this as N phases. Phase 1 covers X, which gives you Y. Adjust anything?"* Then wait for approval.

---

## Step 3: Write the feature doc

- Use the exact structure in `referenced/feature-template.md`.
- File: `.claude/features/NN-feature-slug.md`, taking the next number from the index. Roadmap features already have numbers reserved.
- Copy table SQL from `.claude/docs/data-model.md`. If the design needs to change, update `data-model.md` in the same step, so it stays the source of truth.
- Be concrete: every file path, hook signature, query key, route, component prop and checklist item. Someone else should be able to build any phase from the doc without asking a question.
- Add the feature to the index table as `🔵 Planned`, with a changelog entry.

Then say: *"Plan saved to `.claude/features/NN-slug.md`. Review it and tell me what to adjust before Phase 1."* Wait.

---

## Step 4: Build one phase

### Before starting

1. Re-read that phase in the doc. Never work from memory.
2. **Fold in the design deltas.** If the phase has UI, check `.claude/design/design-deltas.md` for this feature.
   - Apply every **Adopt** item to the feature doc, and mark the section `✅ folded`.
   - Put any **Decide** items to the user.
   - Open the screen's design file (see `screens.json`) and build to it, using the tokens in `rules/design-system.md`.
3. Do every item in its "Before Starting: Confirm With Codebase" list, reading the actual files.
4. Mark the phase `🟡 In progress` in both the doc and the index.

### Order of work

1. **Database.**
   - Apply migrations via the Supabase MCP `apply_migration`.
   - Mirror each one to `supabase/migrations/`.
   - Run `get_advisors` (security) and fix what it reports.
   - Verify with a quick `execute_sql` sanity query.
2. **`api.js`:** the key factory, then the plain functions, then the hooks.
3. **Components**, then **pages**, then **routes and nav wiring**.
4. **Tests:** pure logic in `lib/` and feature `utils.js` gets Vitest tests. Anything fiscal or date-related is mandatory.

### While building

- Build only what the phase specifies. No "while I'm here" refactors and no work that anticipates later phases.
- **Blockers** (the schema differs, a library API changed, a dependency is missing): stop. Describe the blocker, offer two or three options with a recommendation, and wait.
- Library APIs change. Check current docs for shadcn, Tiptap, motion, dnd-kit and React Router before relying on remembered APIs.

### Completing a phase

1. Walk the phase checklist and verify each item is actually true. Run `npm run lint`, `npm test` and `npm run build`.
2. Run the **`axon-rules`** skill against the files changed in this phase, and fix any violations.
3. Update the feature doc:
   - Tick the checklist.
   - Add **Implementation Notes** covering deviations, decisions and deferrals.
   - Change the phase header to `✅ Complete`.
4. Update `00-index.md`:
   - The status column.
   - DB registry rows (✅ applied).
   - A **changelog** entry: date, feature and phase, a one-line summary, new tables, new shared components, and any dashboard or manual steps for the user.
5. If the schema changed, update `data-model.md`.
6. Report: *"Phase N complete. Built: … Deviations: … (or none). Manual steps for you: … (or none). Ready for Phase N+1 when you are."*

Then **stop** and wait for an explicit go-ahead.

---

## Step 5: Feature complete

When the last phase is done:

- Set the index status to `✅ Complete`.
- Move any leftover ideas to the doc's "Out of Scope" section, or add them to the index backlog.

---

## Quick conventions (full rules in `.claude/rules/`)

- Supabase access only in `src/features/<f>/api.js`. Space-scoped reads take `spaceIds` and filter with `.in('space_id', spaceIds)` and `.is('deleted_at', null)`.
- Query keys come from each feature's key factory. Mutation hooks own invalidation and error toasts.
- URLs come from `@/lib/paths.js` or `useSpacePaths()`. Filters and view state go in search params.
- In Global scope, create dialogs require a `SpacePicker`.
- Soft delete with an Undo toast. Permanent deletes use `ConfirmDialog`.
- Loading uses skeletons, empty states use `EmptyState`, and errors are shown inline with a retry.
- Motion comes only from `@/components/motion/presets.js`.
- Tables use composite ownership FKs and the owner-only RLS policy, and every function sets `search_path`.

## Reference files

- `referenced/feature-template.md`: the exact doc structure
- `referenced/axon-data-patterns.md`: code patterns for SQL, api.js, scope, soft delete, ordering, editor autosave and fiscal maths
