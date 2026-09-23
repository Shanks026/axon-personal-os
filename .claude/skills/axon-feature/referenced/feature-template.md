# Feature Doc Template

Use this exact structure for every feature doc. Replace all `[placeholders]`.

````markdown
# Feature NN: [Feature Name]

**Product**: Axon, a personal second-brain OS
**File**: `.claude/features/NN-feature-slug.md`
**Status**: 🔵 Planned | 🟡 In progress (Phase N) | ✅ Complete
**Depends on**: [feature numbers that must be complete first]
**Last Updated**: [Month YYYY]

---

## Context

[2–4 sentences: why the feature exists, what it replaces in the user's workflow, and which existing pattern it follows.]

---

## Phase Overview

```
Phase 1: [Short name]
  [One sentence]

Phase 2: [Short name]
  [One sentence]
```

**After each phase, stop and wait for approval.**

---

## Phase 1: [Name]

### Goal
[One paragraph: what the user can do at the end of this phase that they could not do before.]

### Before Starting: Confirm With Codebase
[3–6 concrete checks: files and exports that must exist, library API versions to verify, prior-phase artefacts.]

### 1.1 Database
[Full SQL for every table, index, trigger, function and RLS policy. Give the migration name(s). If there is none, say "No database changes in this phase."]

### 1.2 API Layer
[File path, key factory, every function and hook with its signature, the query key used and the invalidation targets.]

### 1.3 Components
[File tree, then each component: path, props, behaviour, states (loading, empty, error) and motion.]

### 1.4 Routes and Integration
[Route additions, sidebar items, changes to existing files, with file names.]

### 1.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|

### 1.6 Not in This Phase
- [Explicit exclusions]

### 1.7 Checklist: Before Marking Complete
- [ ] [Verifiable statement]
- [ ] `npm run lint`, `npm test` and `npm run build` pass
- [ ] `axon-rules` audit is clean for the changed files
- [ ] `00-index.md` status and changelog are updated

**Stop here. Show the result and wait for approval.**

---

## Phase 2: [Name]
[Same sub-structure. Its "Before Starting" section also confirms Phase 1 is approved.]

---

## Data Model Summary (after all phases)

```
[ASCII relationship tree]
```

### `[table]`
| Column | Type | Notes |
|---|---|---|

---

## Out of Scope (All Phases)
- [Item]: [reason, or the feature number it belongs to]
````
