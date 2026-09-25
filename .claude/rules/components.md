---
paths:
  - "src/**/*.jsx"
---

# Component Rules

## Authoring

- Write function components with named exports; page components use a default export. Destructure props in the signature.
- Keep one exported component per file. Small private sub-components may live in the same file when nothing else uses them.
- Pages are thin. A page reads params, calls `usePageHeader(...)`, and composes feature components. Business logic goes in hooks.
- Split a component once it grows past about 200 lines or holds more than one concern.
- Never fetch inside `useEffect`. Reads go through the `api.js` query hooks.
- Don't use `useEffect` to derive state. Compute during render, or use `useMemo` when it is genuinely expensive.
- Use `cn()` from `@/lib/utils` for conditional classes. Never use string interpolation for Tailwind classes.
- Use `lucide-react` for every icon.
- Visual styling (colours, radii, shadows, spacing, type scale, motion timings) follows `design-system.md`. Until that file is finalised, use shadcn defaults and semantic tokens (`bg-background`, `text-muted-foreground`, and so on), never raw hex or arbitrary values.

## shadcn/ui

- Import primitives from `@/components/ui/*`, never straight from Radix or base-ui.
- Don't re-implement what shadcn already ships: Dialog, Sheet, Popover, Command, Select, Tabs, Tooltip, Sidebar, Calendar, Chart, Skeleton, AlertDialog, DropdownMenu, ContextMenu.

## Dialogs, sheets and forms

- Dialogs are controlled: `open` and `onOpenChange` props, with the parent owning the state.
- One dialog handles both create and edit. Pass `task={existing}` for edit and omit it for create. The form resets with `form.reset()` when `open` or the record changes.
- Every form uses react-hook-form with `zodResolver(schema)` (zod v4).
  - Schemas live in `features/<f>/schemas.js`.
  - Fields render with the shadcn v4 **Field** primitives (`@/components/ui/field`), not the old `form` component:
    ```jsx
    <Controller name="title" control={form.control} render={({ field, fieldState }) => (
      <Field data-invalid={fieldState.invalid}>
        <FieldLabel htmlFor="title">Title</FieldLabel>
        <Input id="title" {...field} aria-invalid={fieldState.invalid} />
        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
      </Field>
    )} />
    ```
  - Group related fields with `FieldGroup` / `FieldSet`, and use `FieldDescription` for hints.
- The submit button shows a pending state from `mutation.isPending`, and the dialog closes in the mutation's `onSuccess`.
- In Global scope, every create dialog includes a required **SpacePicker** field. Inside a space, the space is implied and the picker is hidden.
  - **Exception: the task dialog** (the user's decision, 2026-09-25). A task's space is fixed at creation — there is no picker anywhere, including Global. It's resolved via `useDefaultSpaceId` (the initial value, the current space, the last active space, or the first active space) and shown read-only as an icon + name under the title.
- `Ctrl/Cmd+Enter` submits any dialog form. `Esc` closes it (shadcn handles that).
- **Hover-to-open property chips** (the task dialog's status, priority, due date, tags and links chips, 2026-09-25): a `useHoverOpen()` hook (`src/hooks/`) opens the trigger's Popover/DropdownMenu on hover as well as on click, so a pointer user can preview and change a property with fewer clicks. Pass its `hoverProps` to both the trigger and the content (so moving the pointer between them doesn't flicker-close), and only opt a component into this via a `hoverOpen` prop — row, card and board menus stay click-only, so scanning a list doesn't pop menus open unexpectedly.

## Destructive actions

- **Every destructive or risky terminal action uses shadcn's `destructive` variant**, never custom colour classes. This covers delete, delete forever, empty trash, sign out, discard, and archive-all. Use `<Button variant="destructive">` and `<DropdownMenuItem variant="destructive">`, and `ConfirmDialog` passes it to its confirm button. (The user asked for this on 2026-09-23.)

- Soft deletes (tasks, notes, todos, events, reports) need no confirm. Delete immediately and show `toast('Task moved to Trash', { action: { label: 'Undo', onClick: restore } })`.
- Permanent deletes (emptying trash, deleting a space) use `<ConfirmDialog>` from `components/shared`, which wraps AlertDialog. Deleting a space also requires typing the space name.

## States

Every data view handles all four states explicitly:

- **Loading:** a skeleton shaped like the content. No spinners for page or section loads; a spinner is allowed only inside a button.
- **Error:** an inline error block with a retry button (`refetch`).
- **Empty:** `<EmptyState icon title description action />` from `components/shared`. Always offer the next action, for example "Create your first task".
- **Data.**

## Feedback

- Use `sonner` for all toasts. Success: `toast.success('Task created')`. Errors: `toast.error(err.message ?? 'Something went wrong')`.
- Mutation hooks already toast on error (see `data-and-hooks.md`). Components add success toasts only when the success isn't already visible on screen.

## Motion

- Import from `motion/react` only.
- Use shared presets from `@/components/motion/presets.js`, not ad-hoc durations or easings: `fadeIn`, `slideUp`, `listItem`, `springSnappy`, and so on. The presets' values are set by the design system.
- Animate `opacity` and `transform` only. Never animate layout properties like width, height or top.
- Lists animate enter and exit with `<AnimatePresence initial={false}>` and `layout` on items. Don't animate on first page paint.
- Respect reduced motion: `<MotionConfig reducedMotion="user">` is set once in `App.jsx`. Don't override it.

## Accessibility

- Icon-only buttons need an `aria-label` and a Tooltip.
- Everything clickable must be reachable by keyboard. Don't put `onClick` on non-interactive elements; use `<button>` or `<Link>`.
- Dates are displayed through `@/lib/dates` helpers, never `toLocaleString` inline.
