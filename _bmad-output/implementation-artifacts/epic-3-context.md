# Epic 3 Context: Progresso do Dia

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

This epic lets Isabel track her daily progress at a glance. She can flip a task's state directly from its card — Pending to In Progress to Completed and back to Pending, in a wraparound cycle, in any order and at any time — without opening the full task form. Completed tasks stay visible in their column, visually distinguished so progress is recognizable without reading a text label, and never hidden, removed, or moved to a separate section.

## Stories

- Story 3.1: Alternar Estado pelo Indicador de Estado (cycle task state via the State Indicator)
- Story 3.2: Diferenciar visualmente tarefa concluída (visually differentiate completed tasks)

## Requirements & Constraints

- A task's state has exactly three values: Pending (default on creation), In Progress, Completed. Any transition is allowed at any time, in any order — including going back from Completed to an earlier state — with no restriction and no penalty.
- Clicking the State Indicator cycles state in fixed order: Pending → In Progress → Completed → Pending (wraparound). It never opens the task modal.
- Clicking anywhere else on the task card (outside the State Indicator) opens the edit modal — that behavior belongs to the task-editing capability, not this epic; the two click targets must not conflict.
- The state change must render immediately on screen.
- Completed tasks remain in their exact column/position — never hidden, filtered out, or relocated to a separate "done" section.
- Completed-state styling must be recognizable without reading the state label (i.e., not color/icon alone as the only signal — see accessibility note below).
- The State Indicator must announce the current state name to screen readers, not just convey it via icon/color, and must show a visible focus outline when navigated by keyboard.
- Persistence follows the atomic save-then-commit guard: the state-cycling action must attempt to persist to storage first; only on success does displayed state change. If the save fails, the displayed state does not change (no optimistic update without confirmed persistence), and no silent automatic retry is triggered.
- Visual differentiation for completed tasks must remain consistent in both light and dark theme.

## Technical Decisions

- State changes go through a dedicated action function (equivalent to `useTaskActions.cycleState`) that is the single path for this mutation — no component dispatches state changes directly to the reducer.
- That action function follows the same persist-before-commit contract used by all task mutations: synchronous save attempt (try/catch) precedes any state commit; success returns an ok result, failure returns an error result and leaves state unchanged.
- The State Indicator is a small circular control (18px, fully rounded). Its three visual states are distinguished at the styling layer: empty/outlined for Pending, half-filled with the accent color for In Progress, and fully filled with a secondary/neutral tone for Completed (deliberately not reusing priority or accent colors for Completed, so it doesn't compete visually with the priority tag or the active-theme accent).
- Completed-task differentiation on the task card is two combined visual treatments applied to the whole card: reduced opacity (0.55) and a strikethrough on the task name text. Both apply together; neither alone is the spec.
- Only the storage-adapter layer touches browser storage directly; the state-cycling logic and its calling component never access it directly.

## UX & Interaction Patterns

- The State Indicator is a small circle rendered on the task card (distinct click target from the rest of the card). A single click on it cycles state; a click on any other part of the card opens the edit modal instead — these two behaviors are mutually exclusive by hit area.
- Because any state transition is always valid, there is no error/blocked state for the cycle interaction itself — the only failure path is a storage-write failure, handled per the persistence guard above (indicator does not visually change on failure).
- Focus visibility (outline) is required on the State Indicator like on all interactive elements, supporting full keyboard operability alongside mouse clicks.
- Completed appearance (opacity + strikethrough) is a passive, always-on visual state — no separate toggle or animation is specified beyond applying/removing these two styles as state changes.

## Cross-Story Dependencies

- Story 3.1 depends on the task card and its modal-opening click behavior already existing (delivered by task-editing work); it must not regress that click-to-edit interaction while adding the State Indicator's own click handling.
- Story 3.1 and 3.2 are tightly coupled: 3.1 changes the state value, and 3.2's visual differentiation is a direct rendering consequence of state being Completed — 3.2 has nothing to render without 3.1's cycling (or the equivalent state field already settable via the task modal from prior epic work).
- The task modal's own Estado field (from task-editing work) is a separate, already-existing full path to change state; this epic adds the quick single-click path on the card without altering or duplicating that modal path.
