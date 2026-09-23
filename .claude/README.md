# .claude/: Axon project knowledge

| Path | What it is |
|---|---|
| `rules/` | Coding rules. Claude Code loads them automatically; path-scoped rules load when matching files are touched. |
| `skills/axon-feature/` | The feature planning and phased build workflow. Always use it before writing feature code. |
| `skills/axon-rules/` | Audits code against `rules/`. Run it before closing a phase. |
| `features/00-index.md` | Roadmap, build status, DB registry and **changelog** (updated after every phase). |
| `features/NN-*.md` | One phased implementation doc per feature. |
| `docs/data-model.md` | The target database schema. It's the source of truth for all SQL. |
| `design/claude-design-prompt.md` | The brief given to Claude Design |
| `design/Axon design system built/` | Claude Design v1 output. Screens are `*.dc.html`, mapped in `screens.json`. |
| `design/design-deltas.md` | Where the design differs from the feature docs. Fold these into a feature's doc before building it. |

Start with `../CLAUDE.md`.
