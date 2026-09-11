# Adversarial Review — ARCHITECTURE-SPINE.md (TaskFlow)

**Lens:** attack the spine as an adversary. For each finding below, I construct two units one level down (two future stories/epics, each reading only the spine, never each other's code) that each obey every AD *as literally written*, yet build incompatibly.

**Verdict up front:** the spine is well-written for the CRUD happy path (FR-1..FR-4 through `useTaskActions`), but it has one serious *structural* hole (whether drag-and-drop reordering is bound by the same persistence-guard rule as everything else) and several *contract* holes (no defined shape for what an action function returns on error, no defined ownership of `order` recalculation outside the drag gesture, and one wording ambiguity that can crash theme loading). Six incompatible pairs found, ranked by severity.

---

## Finding 1 — CRITICAL: Does FR-6 (drag-and-drop reorder) go through `useTaskActions`, or can it bypass the persistence-guard?

**The contradiction is inside the spine itself, not just an inference.**

- Consistency Conventions › Estado & cross-cutting states, as a blanket rule: *"Toda mutação de tarefa/tema passa pelas funções de ação (`useTaskActions`/`useThemeActions`) — nunca `dispatch` cru a partir de um componente."* No exception carved out.
- AD-4's **Binds** line reads: *"FR-1, FR-2, FR-3, FR-4 (toda mutação de tarefa); tema"* — FR-6 is conspicuously absent from the enumerated list, even though the parenthetical gloss "toda mutação de tarefa" (all task mutation) would, read literally, also cover an `order` change (it's a field on `Task` per the class diagram).
- The Capability → Architecture Map row for FR-6 reads: `selectors.sortTasksInDay, PriorityTag, arraste via @dnd-kit/react` governed by `AD-6, AD-7` only. Compare to every FR-1..FR-4 row, which explicitly routes `→ useTaskActions.xxx → storage` and is governed by `AD-4, AD-5, AD-8`. FR-6's row cites neither `useTaskActions` nor AD-4 nor AD-8.

**Two stories, both spine-literal, that collide:**

- **Story A — "Criar/editar/excluir tarefa" (FR-1..FR-4).** Built strictly from AD-4 + the Convention row. Implements `useTaskActions` as the single gate: every task mutation, no exceptions, tries `storage.saveTasks` synchronously, only then dispatches. The developer assumes (reasonably, from the blanket Convention sentence) that any future reordering code will also call `useTaskActions`, so they design the reducer's task-update action to always assume the caller already persisted.
- **Story B — "Drag-and-drop reorder" (FR-6).** Built strictly from AD-6 + AD-7 + the FR-6 Capability Map row, which is the *only* row that doesn't mention `useTaskActions`, AD-4, or AD-8. The developer implements `onDragEnd` in the `DayColumn`/`WeekView` component (still `src/components/`, still obeying AD-8 — it calls `storage.saveTasks()`, never `window.localStorage` directly) but dispatches to the reducer *inline in the drag handler*, not through `useTaskActions`. This is defensible: AD-8 only forbids touching `localStorage` directly, and AD-4's binds list never names FR-6, so "persist-then-commit as one atomic guarded call via the action layer" was never explicitly required for it. The drag handler could even legally persist *after* dispatching (e.g. debounced, to avoid writing on every pixel of drag), since AD-4's atomicity rule isn't bound to FR-6 either.

Result: two task-mutation paths exist in the same app — one obeying "persist-or-no-state-change" (AD-4), one not. If `storage.saveTasks` throws mid-drag (quota exceeded, private-browsing Safari, etc.), Story A's code shows an inline recoverable error and never changes state; Story B's code has already committed the reorder to React state with no defined error surface at all (there's no modal to keep open, and no AD says what a bypassing caller must do with a thrown error). This is exactly "two owners of one entity, conflicting state-mutation paths."

**Fix direction:** AD-4's Binds line should explicitly include FR-6, and the FR-6 Capability Map row should explicitly cite `useTaskActions` (e.g. `useTaskActions.reorderTasks`) and AD-4/AD-8, closing the loophole the omission currently creates.

---

## Finding 2 — CRITICAL: No canonical return/error contract for `useTaskActions` (and `useThemeActions`) — "ambiguity in how useTaskActions reports its error result to callers"

AD-4 says only: *"a função de ação retorna um resultado de erro para quem a chamou."* The Consistency Conventions table separately defines *"Erro de persistência representado como `{ message: string }`"* — but that sentence sits under "Dados & formatos" describing a data shape, not under a stated calling convention for the action layer. Nothing in the spine states:

- Whether the action function returns a discriminated result (`{ ok: true, task } | { ok: false, error: { message } }`), a nullable error (`{ message } | null`), a boolean plus out-param, or **throws** the `{ message }` object/an `Error`.
- Whether the function is sync or returns a `Promise` (the write itself is synchronous per AD-4, but nothing forbids wrapping the return in a Promise "for consistency with React patterns").

**Two stories that collide:**

- **Story A — `TaskModal` (FR-1 create / FR-2 edit).** Needs to keep the modal open and show an inline message on failure, per AD-4's own worked example. The developer implements `createTask`/`updateTask` to **return** `{ success: false, error: { message } }` and checks `if (!result.success)`.
- **Story B — `StateIndicator`/`TaskCard` (FR-4 cycle state, one click, no modal).** Built independently, also spine-literal. The developer reads the same AD-4 sentence ("retorna um resultado de erro") but, since the Convention table describes the error itself as `{ message: string }` (not wrapped), implements `cycleState` to **throw** `{ message: string }` on failure (mirroring the storage adapter's own `try/catch` pattern described in the Design Paradigm section) and wraps the call site in `try/catch`.

Both are literal-compliant. But now every future component that calls into `useTaskActions` (a `deleteTask` confirmation, a future story) cannot know, from the spine alone, whether to check a returned field or wrap in `try/catch` — and a component built to expect one will silently mishandle the other (an un-caught throw with no `try/catch` crashes the render or produces an unhandled promise rejection; an ignored returned-but-unchecked error object silently drops the failure, violating the "never silent" intent of AD-4 without violating its letter).

**Fix direction:** state the exact TypeScript return type of an action function once, in the spine (e.g. `type ActionResult<T> = { ok: true; data: T } | { ok: false; error: { message: string } }`), and say explicitly "never throws for expected persistence failures."

---

## Finding 3 — HIGH: `order` is unowned outside the drag gesture and task creation — modal-driven priority/day changes vs. drag-driven reordering

AD-7's rule text covers exactly two cases: (a) *"Ao soltar um card em nova posição, os `order` do grupo afetado são recalculados"* (drag-drop), and (b) *"Uma tarefa recém-criada recebe `order` = último da sua grupo"* (creation). It says **nothing** about what happens to `order` when a task's `day` or `priority` changes through a route that is not a drop — i.e., through `TaskModal` in edit mode (FR-2), which EXPERIENCE.md and AD-6 both confirm is "a via alternativa completa a qualquer mudança de prioridade/dia."

**Two stories that collide:**

- **Story A — `useTaskActions.updateTask` (FR-2, modal edit).** Reads AD-7 literally: recalculation is specified only "ao soltar um card" (a drag event) and only at creation time. An edit is neither. So the developer leaves `order` untouched when `priority` or `day` changes via the modal — the task keeps whatever integer it had in its old scope and simply moves scope with that same number.
- **Story B — drag-and-drop `onDragEnd` (FR-6, including cross-group drags, which AD-6 explicitly says drag must support — "mudança de prioridade/dia" by drag).** Reindexes the destination `(day, priorityGroup)` group 0..n-1 and assigns the dropped task the appended value.

Now walk a concrete sequence: a task sits at `order = 2` in `(mon, low)`. Via **Story A**'s modal path, its priority is edited to `high`; it now lives in `(mon, high)` still carrying `order = 2`. Separately, `(mon, high)` already has three tasks reindexed by **Story B**'s logic to `order = 0, 1, 2`. The moved task's stale `order = 2` now **collides** with an existing task's `order = 2` in the same `(day, priorityGroup)` scope — a duplicate that AD-7's own scoping model treats as impossible ("cada Tarefa tem um campo order... com escopo (day, priorityGroup)"). `selectors.sortTasksInDay`'s tie-break behavior for equal `order` values is undefined by the spine, so the two tasks' relative position becomes arbitrary (dependent on array/insertion order), and it can flip on every reload if `sortTasksInDay` isn't a stable sort by insertion. Both `updateTask` and `onDragEnd` are individually spine-compliant; together they corrupt the invariant AD-7 exists to guarantee.

**Fix direction:** AD-7 should state explicitly that *any* operation that changes a task's `(day, priorityGroup)` — drag or modal — must append it at the end of the destination group's sequence (same rule as creation), and must be the single place that recalculates `order`.

---

## Finding 4 — MEDIUM: "grupo afetado" (singular) leaves the source group's cleanup on cross-group drag undefined

Related to Finding 3 but distinct: AD-7 says *"os `order` do grupo afetado são recalculados"* — singular, one group. AD-6 explicitly permits a drag to change both priority **and** day, meaning a drop is frequently a move *between two different* `(day, priorityGroup)` scopes, not a reorder within one.

**Two stories that collide (both building FR-6, e.g. split into "same-day reorder" and "cross-day/cross-priority drag" sub-stories, which is plausible given they're visually distinct interactions per EXPERIENCE.md):**

- **Story A** interprets "o grupo afetado" as the **destination** group only (the group the card lands in) and reindexes just that one, leaving the source group's remaining `order` values exactly as they were (now with a hole where the dragged card used to be, e.g. `0, 1, 3` after removing what was `2`).
- **Story B** interprets it as **both** source and destination groups and recompacts each.

Functionally this pairing is less dangerous than Finding 3 (a sparse-but-strictly-increasing sequence still sorts correctly — `sortTasksInDay` doesn't need contiguity), so I rate it Medium rather than High. But it does violate AD-7's own stated rationale for choosing simple reindexing over fractional indices ("reindexação simples... volume de tarefas por dia é pequeno demais para justificar essa complexidade") — the whole point of committing to simple integer reindexing was to keep the sequence tidy; silently accepting permanent gaps in every abandoned group defeats that reasoning without breaking any literal rule.

**Fix direction:** AD-7 should say "os `order` dos grupos de origem e de destino são recalculados" (plural, explicit) when the two differ.

---

## Finding 5 — HIGH: `taskflow:theme` serialization — raw string vs. JSON-encoded string

AD-2 defines the two persisted keys side by side with **different** literal descriptions: `taskflow:tasks` is *"JSON `{ schemaVersion: number, tasks: Task[] }`"* (explicitly "JSON"), while `taskflow:theme` is described only as *"string `'light' | 'dark'`"* (no "JSON" qualifier). `localStorage` only ever stores raw strings, so this wording difference is exploitable in two incompatible ways:

- **Story A (writes `saveTheme`, e.g. built alongside the theme-toggle story).** Reads AD-2 literally: the value is *"string"*, not *"JSON string"* — so `saveTheme(theme)` calls `localStorage.setItem('taskflow:theme', theme)` directly, storing the bare characters `dark` (no quotes).
- **Story B (writes `loadTheme`, e.g. built as part of app-shell bootstrap / `ThemeContext` initial state, mirroring the pattern used for `loadTasks`).** Reasonably mirrors the `taskflow:tasks` reading code for consistency and does `JSON.parse(localStorage.getItem('taskflow:theme'))`, since the sibling key is documented as JSON and nothing tells them theme is different.

`JSON.parse('dark')` throws (`dark` is not valid JSON — it needs surrounding quotes to be a JSON string literal). Two independently-built, individually spine-compliant functions on the two ends of the same key produce a hard crash on every app load once a theme has been saved once. Neither developer did anything AD-2 forbids; the wording just doesn't commit to one convention.

**Fix direction:** AD-2 should say explicitly whether `taskflow:theme`'s stored value is the raw string or `JSON.stringify`'d (and match `loadTheme`/`saveTheme` to whichever choice is made) — one sentence closes this.

---

## Finding 6 — MEDIUM: bootstrap/first-run contract for `taskflow:tasks` is unspecified

AD-2/AD-8 define `loadTasks`/`saveTasks` but never state what `loadTasks()` returns when the key doesn't exist yet (first run, before any task is ever created) — an empty envelope `{ schemaVersion: 1, tasks: [] }`, `null`/`undefined`, or a thrown error. Likewise, nothing states who is responsible for writing the initial envelope with its starting `schemaVersion` value.

**Two stories that collide:**

- **Story A — `TaskContext` initial state (FR-5, "visualizar semana," the first thing that runs).** Assumes `storage.loadTasks()` already normalizes the missing-key case and always returns a well-formed `{ schemaVersion, tasks: [] }`, so `TaskContext`'s lazy initializer uses the return value directly with no null-check.
- **Story B — `useTaskActions.createTask` (FR-1).** Built independently, defensively handles the case where no envelope exists yet by checking `if (!loadTasks())` before computing the new task's `order` ("último da sua grupo") and constructing the envelope itself on first save.

If Story A ships first and `loadTasks()` in fact returns `undefined` on a fresh browser (a perfectly literal reading of "the key doesn't exist" — AD-2 never says `loadTasks` must synthesize a default), `TaskContext`'s initializer crashes before the app ever renders, on the very first run for a brand-new user — before Story B's defensive code ever gets a chance to run.

**Fix direction:** state explicitly in AD-2 (or AD-8) that `loadTasks()`/`loadTheme()` never return `null`/`undefined` — they synthesize and persist the default envelope on first read — so exactly one place (the storage adapter) owns bootstrap, and every caller can assume a well-formed value.

---

## Summary of pairs found

| # | Severity | Pair | Clash |
| --- | --- | --- | --- |
| 1 | Critical | FR-1..4 CRUD story vs. FR-6 drag story | Whether task mutation must route through `useTaskActions`'s persist-guard (AD-4) at all — spine's own Convention row and AD-4/Capability-Map wording disagree |
| 2 | Critical | TaskModal (create/edit) vs. StateIndicator (cycle state) | No canonical return/throw contract for action-layer errors |
| 3 | High | `updateTask` (modal priority/day change) vs. drag `onDragEnd` | Whether `order` is recalculated on non-drag scope changes — produces duplicate `order` within one `(day, priorityGroup)` scope |
| 4 | Medium | same-day drag reorder vs. cross-group drag reorder | "grupo afetado" (singular) — source group recompacted or left with gaps |
| 5 | High | `saveTheme` vs. `loadTheme` (built by different stories) | Raw string vs. JSON-encoded string for `taskflow:theme` — `JSON.parse` crash |
| 6 | Medium | `TaskContext` initial state vs. `createTask` first-run handling | No stated contract for `loadTasks()` behavior when the key doesn't exist yet |

No AD in the spine is technically violated by any of the six pairs above — that is the point of the exercise. Each pair is constructed from two developers who each read only the spine, follow every AD to the letter, and still ship code that either crashes, corrupts the `order` invariant, or silently swallows errors depending on which side of the ambiguity they landed on.
