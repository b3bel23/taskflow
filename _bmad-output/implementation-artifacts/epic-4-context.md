# Epic 4 Context: Reordenar e Mudar por Arraste

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

This epic gives Isabel manual control over task ordering that automatic priority sorting can't provide: reordering tasks within the same priority level by dragging, and changing a task's priority or day by dragging it into a different priority band or day column. It completes the ordering capability by adding the manual layer on top of the automatic sort delivered earlier. Every drag interaction must have a full, equally capable keyboard equivalent — dragging is never the only way to reach an outcome, both because the Task Modal must remain a fully independent alternate path, and because accessibility must not depend on mouse use.

## Stories

- Story 4.1: Reordenar tarefas por arraste dentro do mesmo nível de prioridade
- Story 4.2: Mudar prioridade ou dia arrastando o card

## Requirements & Constraints

- Reordering within a priority level must persist across sessions (survives closing/reopening the browser).
- Dragging a card into a different priority band within the same day changes that task's priority (position = priority); dragging a card into another day's column changes its day, and it is inserted already sorted by its current priority within the destination.
- Changing day never changes task state, and reordering/priority/day changes never bypass the required-field or validation rules already established for tasks.
- Every action reachable by drag (reordering, changing priority, changing day) must also be reachable through the Task Modal fields and through the keyboard sensor — dragging with a mouse is never the exclusive path to any outcome.
- Visible focus must be maintained throughout a keyboard-driven drag operation.
- If the underlying save fails, the card must visually revert to its original position/day/priority — the change is never applied until the write succeeds (no optimistic UI ahead of confirmed persistence).
- No artificial limit on tasks per day; single-user, client-side only, desktop-browser scope (no mobile/responsive, no multi-device sync) — unrelated to drag itself but bounds what needs supporting.

## Technical Decisions

- Drag-and-drop is implemented with `@dnd-kit/react` (plus `@dnd-kit/dom` and `@dnd-kit/helpers`). Its built-in keyboard sensor is the same interaction logic used for mouse dragging — there is no separate, hand-rolled keyboard implementation to keep in sync. This library is pre-1.0 (0.5.0) with an API still subject to change; the accepted risk is pinning an exact version if an upstream breaking change blocks work, rather than chasing `^` updates.
- The Task Modal remains a fully independent path to the same outcomes as dragging (changing priority, changing day) — neither path replaces the other, and both must always work.
- Every mutation triggered by a drop (reorder, priority change, day change) must go through the same action-layer functions the Modal uses (e.g. `reorderTask`, `moveTaskToDay`) — never a raw dispatch invoked directly from the drag handler. This keeps a single source of truth for the mutation logic regardless of entry point.
- State mutations follow an atomic persistence pattern: the action function attempts the synchronous storage write first; only on success does it commit the new state. On failure, state does not change and the caller receives a structured failure result — there is no silent automatic retry. This applies identically whether the mutation originated from a drag drop or from the Modal.
- Each task carries an `order` field (integer), scoped to `(day, priorityGroup)` — the four priority display groups (High/Medium/Low/none). A single pure reindexing function recalculates `order` for the affected group(s) whenever priority or day changes, by any path (drag or Modal edit) — neither path reimplements this logic independently. Reindexing is simple sequential renumbering (no fractional indices). A newly created task's `order` places it last in its group.
- No new dependency beyond what's already established for state management (native React state, no external state library) — drag-and-drop is the only new piece of infrastructure this epic introduces.

## UX & Interaction Patterns

- While dragging, the card lifts with a shadow and a slight rotation (the product's one deliberate use of decorative shadow), and a dashed placeholder marks where it will land in the destination — this reinforces to Isabel that the card is "lifted" and where it will drop.
- Dragging into a different priority band within the same day is understood as "position = priority": the destination band determines the new priority. Dragging into another day's column is understood as changing the day; the card then takes its place sorted by its own current priority within that new column.
- Animation stays minimal and short (roughly 150-200ms), used only to clarify what changed (the card repositioning) — never purely decorative.
- Accessibility floor for this epic: visible focus outline on every interactive element involved (cards, drag targets) at all times, including throughout a keyboard-driven drag; no interaction here may depend exclusively on drag with a mouse. Dragging is explicitly banned as the sole way to change priority or day — the Modal must always be capable of the same change.

## Cross-Story Dependencies

- Both stories depend on the automatic priority-sort ordering and the `order`/priority-group data model already established when tasks were first introduced (task creation and editing), and reuse the same task mutation/action-layer functions the Modal-based editing flow uses.
- Story 4.2 (priority/day change via drag) shares its underlying priority-change and day-change behavior with the equivalent Modal-based editing flow already delivered earlier — this epic adds the drag entry point, not new mutation semantics.
- Both stories share the same `@dnd-kit` integration (sensors, drop handling, reindexing function) — implementing one establishes the plumbing the other relies on.
