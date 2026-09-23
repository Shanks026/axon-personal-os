# Axon: design brief for Claude Design

Design a complete, high-fidelity UI for **Axon**, a personal "second brain" web app. I'm a frontend developer, and I'll build this in React with Tailwind CSS v4 and shadcn/ui. Every screen must be buildable from shadcn primitives: Sidebar, Dialog, Sheet, Popover, Command, Tabs, DropdownMenu, Calendar, Chart, Skeleton, Tooltip, Badge, Avatar and Toast. Use **lucide** icons only.

## 1. Product in one paragraph

Axon is where one person records everything they're working on: **tasks, todos, notes, a daily journal, calendar events and quarterly reports**. Everything is organised into **spaces**. A space is a realm such as "THMP" (my job: frontend work on a B2B marketplace) or "Personal". A special **Global** view combines all spaces into one. The main job is to log work continuously, and then at the end of each **fiscal quarter** (my company's year runs April to March) produce a clean report of what I shipped. It's single-user and private. It's not a team tool, so there are no avatars of other people, no assignees and no sharing.

## 2. Visual direction

- **Sleek, elegant, minimal and calm.** Reference points: Linear, Things 3, Raycast, Notion's quiet chrome, Arc.
- Plenty of whitespace and a clear typographic hierarchy. The content is the interface; chrome recedes.
- A neutral base (soft greys, near-black and off-white), with **one accent colour per space**. The accent tints the active states, the space icon and small highlights when you're inside that space. In Global, the accent is neutral.
- Hairline borders, subtle elevation, a modest radius (about 8–12px) and no heavy shadows or gradients. Glass or blur only if very restrained (for example, the command palette backdrop).
- **Light and dark themes must both be first-class.** Design every key screen in both.
- Typography: one modern sans (Geist or Inter class) and a mono for dates and shortcuts. Build a tight type scale. Use tabular numbers for stats.
- Density: comfortable by default, but lists should feel efficient, like Linear's rows, not bloated cards.

## 3. Motion (important, please specify it)

The app should feel smooth and alive but never slow. Please define a **motion spec** alongside the visuals:

- **Durations** (fast, base and slow), **easings**, and **spring** presets (snappy and gentle).
- **Page transitions** between sections: a subtle fade plus a small slide.
- **Lists:** items animate in and out, and reorder smoothly (layout animation). Completing a todo or task has a satisfying micro-interaction: check draw, strike-through and a gentle collapse.
- **Kanban:** a lifted card while dragging, with a smooth drop settle.
- **Dialogs and sheets:** scale and fade with a spring. The command palette pops in quickly.
- **Sidebar:** smooth collapse to icon rail. **Space switch:** accent colour cross-fade.
- **Skeleton shimmer** for loading.
- A reduced-motion fallback: fades only.

Show key motions as annotated storyboards or before/after frames where you can.

## 4. Information architecture

```
Auth (full screen):   Login · Sign up · Check your email · Forgot password · Reset password
Spaces (full screen): Space gallery (first screen after login) · Create/Edit space dialog · Delete space confirm
Settings (full screen): Profile · Preferences · Account
App shell (/s/<space>/...): sidebar + page
  Dashboard · Inbox · Tasks · Todos · Notes · Journal · Calendar · Reports · Trash
Overlays: Command palette (Ctrl/Cmd+K) · Quick capture · Keyboard shortcuts help
```

### Sidebar (the app shell)
- **Top:** a space switcher showing the current space's icon, name and accent. The dropdown lists **Global** first, then each space (icon, name, accent dot), then "New space…" and "Manage spaces…".
- **Beneath it:** a search field that opens the command palette (`⌘K` hint), and a "Quick capture" button (`⌘J`-style shortcut hint).
- **Nav:** Dashboard, Inbox (with an unprocessed count badge), Tasks, Todos, Notes, Journal, Calendar, Reports.
- **Pinned:** a small list of pinned tasks, notes and reports.
- **Footer:** Trash, Settings, and a user menu (initials avatar, theme switch, sign out).
- The sidebar collapses to an icon rail. On mobile it becomes a drawer.

## 5. Screens to design (with states)

Use realistic sample data (section 7). For every list or grid screen, also show the **empty state** and the **loading skeleton**.

1. **Login / Sign up / Check email / Forgot / Reset.** A beautiful, minimal auth: a centred card or split layout with a quiet brand panel. It includes an inline validation error and a "check your inbox" confirmation with an animated envelope or check.

2. **Space gallery (full screen).** This is the first screen after login.
   - **Empty:** a warm, inviting "Create your first space" hero with a one-line explanation ("Spaces keep work and life separate. Global shows everything.") and a primary button.
   - **Populated:** a responsive grid of space cards. Each card shows its icon in the accent colour, the name, a description and small counts (open tasks, notes), with a hover lift and a "…" menu (Edit, Archive, Delete).
   - A distinct **Global** card comes first.
   - There is a "New space" ghost card, and a collapsed "Archived" section.
   - Cards can be dragged to reorder.
   - **Create/Edit space dialog:** name, an auto-generated URL slug (editable), description, a colour picker (about 10 accent swatches) and an icon picker (a searchable grid).
   - **Delete confirm:** a destructive dialog that lists what will be deleted and asks the user to type the space name to confirm.

3. **Dashboard** (per space, and a Global variant).
   - A greeting and today's date, with the current fiscal quarter shown as "Q2 FY 2026–27".
   - Widgets:
     - **Today:** overdue and due-today tasks, plus today's todos with quick check-off.
     - **In progress** tasks.
     - **Upcoming** (the next 7 days of events and due dates).
     - **Recent notes.**
     - A **quarter progress** chart: tasks completed per week this quarter, with a count delta against last quarter.
     - A **journal prompt** ("Write today's log").
   - The **Global** variant adds per-space breakdown mini-cards.

4. **Tasks.**
   - **List view:** grouped by status (Todo, In progress, In review, Blocked, Done, Cancelled). The groups are collapsible and have counts.
     - Each row: a status icon, title, tag pills, a priority indicator, a due-date label ("Today", "Overdue · 3d", "Fri 26 Sep") and a link icon if it has an external URL.
     - In Global, each row has a small space badge.
   - **Board view:** kanban columns per status, with drag between columns and a quick-add at the bottom of each column.
   - **Toolbar:** a list/board toggle, filters (status, priority, tag, due), search and a "New task" button.
   - **New/Edit task dialog:** title (large), status, priority, start and due dates, tags (multi-select with create), external link (e.g. a GitLab MR), and a Space picker that appears only in Global.

5. **Task detail (full page).**
   - **Left or main column:** the title (inline editable), a rich-text description, a **checklist** (todos with drag reorder and inline add), **Linked notes** (cards with a "Link note" picker and "New linked note"), and an **Activity and work log** timeline. The timeline mixes automatic events ("Status: In progress → In review · 2h ago") with manual log entries the user writes, plus a composer at the bottom.
   - **Right meta rail:** status, priority, dates, tags, space, external link, created and completed dates, pin toggle, and delete.

6. **Todos.**
   - A simple, delightful checklist page grouped into **Overdue / Today / Upcoming / Someday**, with a toggle for "Done".
   - An inline "Add a todo…" input stays pinned at the top. Todos that belong to a task show a small "↳ Task title" chip.
   - Show the check-off micro-interaction.

7. **Notes.**
   - **Notes list:** a grid or list toggle. Cards show the title, a two-line preview, tags, the updated time, and a linked-tasks count. Filters: tags and search. Pinned notes are at the top.
   - **Note editor (full page):** a distraction-free, Notion-like writing surface with a big title and tags under it.
     - A **slash command menu** (headings, lists, checklist, quote, code block, table, divider, "Link task").
     - **Inline task mentions:** typing `[[` opens a task search popover and inserts a task chip. The chip shows its status and a hover preview card.
     - A floating **bubble toolbar** on text selection.
     - A collapsible **side panel** listing linked tasks (manual and mentioned), backlinks, and metadata.
     - A "Saving… / Saved" indicator.

8. **Journal (daily work log).**
   - A horizontal **date strip** or mini calendar (dots on days with entries) and today's entry below it.
   - A new entry starts from a template: **Yesterday / Today / Blockers / Notes** (a standup format).
   - "Tasks completed today" are auto-listed alongside it as a reference.
   - Previous and next day navigation.

9. **Calendar.**
   - **Month**, **Week** (time grid), **Day** and **Agenda** views, with a view switcher and Today/prev/next controls.
   - Shows **events** (time blocks, coloured by space in Global), **task due dates** as all-day chips, and a now-line in week and day views.
   - Drag to move or resize an event, and click an empty slot to create one.
   - **Event dialog:** title, date and time or all-day, location or meeting URL, description, link to a task, and "Create meeting note" (which creates and links a note).

10. **Reports.**
    - **Reports list:** grouped by fiscal year, then quarter cards (Q1–Q4) showing status (Draft, Final), key numbers, and a "Generate" action for quarters without a report.
    - **Generate report flow** (dialog or stepper): pick the scope (the current space or Global) and the period. The period defaults to the current or previous fiscal quarter, with month and custom range as options. Then show a preview of the numbers.
    - **Report view/editor:** a document-like page with a stats header, charts and editable written sections.
      - Stats header: tasks completed, created, in progress at end, and overdue.
      - Charts: completed per week (bar), by priority (donut) and by tag (horizontal bar).
      - Written sections: Summary, Highlights (completed tasks grouped by tag), In progress, Blocked or carried over, Key notes, Next quarter focus.
      - Actions: Refresh numbers, Mark final, Export (PDF via print, Markdown).
      - Design a **print/PDF style** too.

11. **Inbox.**
    - Raw captured thoughts waiting to be triaged. Each item offers: Convert to task, Convert to todo, Convert to note, Schedule as event, Move to space, and Discard.
    - Keyboard-driven triage: a highlighted row with shortcut hints.
    - Include a "zero inbox" celebratory empty state.

12. **Quick capture overlay.** A small, fast modal reachable from anywhere. It has a multi-line input, a space selector (defaulting to the current space) and "Save to Inbox". It also offers type chips to save directly as a Task, Todo or Note, and closes with a subtle confirmation.

13. **Command palette (⌘K).** A Raycast-style palette with these groups:
    - Recent
    - Actions (New task, New todo, New note, New event, Quick capture, Toggle theme)
    - Navigate (sections)
    - Switch space
    - Search results across tasks, notes, todos, events and reports, each with a type icon, a space badge and a matched-text highlight

    Include a keyboard hint footer.

14. **Trash.** Deleted items grouped by type, each with the time it was deleted, a Restore action, and Delete forever. Offer "Empty trash" with a confirm step. Show a note that items are auto-deleted after 30 days.

15. **Settings (full screen)** with a left section nav:
    - **Profile:** name and an initials avatar.
    - **Preferences:** fiscal year start month, with a live preview such as "Q1 = Apr–Jun · Today is in Q2 FY 2026–27"; week start day; time zone; and theme (Light, Dark, System).
    - **Account:** email, change password and sign out.

16. **Keyboard shortcuts help** dialog.

17. **Global states:** toast styles (success, error, and "Moved to Trash · Undo"), the not-found page, the error page, and the full-screen loading splash.

18. **Responsive.** Show mobile layouts for Dashboard, Tasks (list), Note editor and Todos, with the sidebar as a drawer.

## 6. Reusable components to define

Define these as a small component library:

- Space switcher; space badge; tag pill (with a colour key); status icon (six statuses); priority indicator (None, Low, Medium, High, Urgent)
- Due-date label (normal, today, overdue); task row; kanban card; note card
- Empty state; skeleton variants; page header (title, breadcrumbs, actions); filter bar
- Date picker; tag picker (multi-select with create); entity chip (task or note mention, with a hover preview)
- Confirm dialog; toast

## 7. Sample data

Use this data, which is realistic for me.

**Spaces:**
- **THMP** (blue, `briefcase` icon): "Frontend work on the THMP marketplace portals"
- **Personal** (green, `leaf` icon): "Life admin, health, learning"
- **Side projects** (violet, `rocket` icon): "Axon and other experiments"

**Tasks (THMP):**
| Task | Status | Priority | Other |
|---|---|---|---|
| Buyer portal: fix RFQ table pagination reset on filter change | In review | High | tag `buyer-portal`, MR link |
| Vendor portal: migrate product form to react-hook-form + zod | In progress | Medium | tags `vendor-portal`, `refactor` |
| Storefront: lazy-load category images below the fold | Todo | Medium | due Fri 26 Sep, tag `performance` |
| Admin portal: role-based menu visibility | Blocked | Urgent | tag `admin-portal`, "waiting on API contract" |
| Onboarding portal: KYC document upload progress UI | Done | none | completed 18 Sep |
| Signup portal: address autocomplete accessibility audit | Todo | Low | none |

**Todos:**
- "Reply to PM about Q3 release scope"
- "Rebase MR !1428 on develop"
- "Book dentist appointment" (Personal)
- "Renew domain for Axon" (Side projects)

**Notes:**
- "Sprint 42 planning": mentions two tasks
- "Buyer portal: pagination bug RCA"
- "React Query caching patterns"
- "Q2 1:1 with manager: feedback"

**Journal entry, Tue 23 Sep 2026:**
- **Yesterday:** finished the KYC upload UI
- **Today:** RFQ pagination review fixes
- **Blockers:** admin API contract

**Events:**
- Daily standup, 10:00–10:15
- Sprint review, Thu 15:00
- Gym, 19:00 (Personal)

**Reports:**
- "Q1 FY 2026–27 (Apr–Jun) · Final": 38 tasks completed
- "Q2 FY 2026–27 (Jul–Sep) · Draft"

## 8. Deliverables

1. The screens and states listed above, in **light and dark**, at desktop width (1440px). Mobile (390px) for the screens noted in item 18.
2. A **design tokens sheet**:
   - Colour tokens for light and dark (background, surface, muted, border, foreground, muted foreground, primary, destructive, ring, chart 1–5), written as CSS variables in the shadcn naming convention.
   - The **space accent palette** of about 10 keys (slate, blue, indigo, violet, pink, red, orange, amber, green, teal), each with a light and dark value.
   - The type scale, spacing scale, radius, borders and shadows.
3. The **motion spec** from section 3: durations, easings, springs, and per-interaction choreography.
4. The **component sheet** from section 6.
5. A short **rationale** (half a page): the layout grid, the sidebar width (expanded and collapsed), content max-widths for reading (the note editor and reports) versus data (tasks and calendar), and the density choices.

Keep everything consistent, restrained and implementable. When in doubt, choose clarity and calm over decoration.
