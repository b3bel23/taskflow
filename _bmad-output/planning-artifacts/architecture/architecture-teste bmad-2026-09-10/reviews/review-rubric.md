---
title: Architecture Spine Review — TaskFlow (rubric-based)
reviewer: independent architecture reviewer (Claude)
reviewed_artifact: architecture/architecture-teste bmad-2026-09-10/ARCHITECTURE-SPINE.md
context_artifacts:
  - prds/prd-teste bmad-2026-09-09/prd.md
  - ux-designs/ux-teste bmad-2026-09-09/DESIGN.md
  - ux-designs/ux-teste bmad-2026-09-09/EXPERIENCE.md
date: 2026-09-10
---

# Architecture Spine Review — TaskFlow

## Verdict

The spine is well-scoped, proportionate to a tiny single-user personal MVP, and its strongest ADs (AD-4 save-failure handling, AD-6 drag/keyboard parity, AD-7 manual ordering) directly and thoughtfully resolve the exact risk points the PRD and UX docs flagged as open. It has two real gaps that should be fixed before epics/stories are cut: (1) the styling/theming implementation mechanism is a completely silent structural dimension, and (2) persistence **load/parse failure** (as opposed to save failure) is unaddressed, which is a direct data-loss-risk gap given AD-3's whole premise is "no backup, just don't lose data silently." A few smaller underspecifications round out the findings below.

---

## 1. Does it fix the real divergence points for the level below (epics/stories/build), missing none?

Mostly yes. Covered divergence points, with citations:

- Storage key/shape split (tasks vs theme), schema versioning — **AD-2**.
- Write-before-commit ordering so memory state and saved state can't diverge — **AD-4**.
- No parallel drag vs keyboard reorder implementations — **AD-6**.
- Manual order semantics scoped to `(day, priorityGroup)`, reindexing algorithm, new-task placement — **AD-7**.
- Single storage chokepoint (`src/storage/`) so components/state can't touch `localStorage` directly — **AD-8**.
- Naming/type vocabulary (`Task`, `DayOfWeek`, `TaskState`, `Priority`, null-vs-empty-string priority, PascalCase/camelCase conventions) — **Consistency Conventions** table.
- ID generation strategy (`crypto.randomUUID()`, no uuid lib), "today" computed via local `Date` with no explicit timezone handling, persisted-error shape `{ message: string }` — **Consistency Conventions** table.
- Deploy/ops envelope decided explicitly (see §6 below).

Gaps found (real divergence points left unfixed):

- **Styling/theming implementation mechanism — silent.** DESIGN.md defines a full two-theme token system (light/dark hex values for every color, spacing/radius scale, typography). The spine's Stack table lists React, Vite, TypeScript, `@dnd-kit/*`, Vitest, Testing Library — **no CSS/styling approach at all** (no CSS Modules, Tailwind, CSS-in-JS, or CSS custom properties + `data-theme` attribute strategy named). `ThemeContext`/`useThemeActions` (AD-2, AD-4, AD-5) fix how the *theme preference value* is stored and committed, but nothing fixes how that value becomes rendered styles. Two independently built components could diverge — one reading a CSS variable that flips with a `data-theme` attribute, another hardcoding light-mode hex values from DESIGN.md inline — and the divergence would only surface as a visibly broken dark mode, exactly the kind of "two independently-built units diverging incompatibly" this checklist is watching for. This is a structural decision on par with AD-8 (a boundary/chokepoint rule) and is currently entirely absent — not decided, not deferred, not flagged as an open question.
- **Order assignment on non-drag priority/day changes is underspecified.** AD-7's rule text is scoped to "ao soltar um card" (on drag-drop) for reindexing, and to task creation ("último da sua grupo"). FR-2 / EXPERIENCE.md Component Patterns states that editing Priority via the Modal *also* reorders the task within FR-6's ordering ("Editar a Prioridade reordena a Tarefa dentro do seu dia conforme FR-6"), but AD-7 never states where a modal-driven priority/day change places the task within its new group (append at end? insert at start? recompute like a drop at the top?). The drag-drop code path and the modal-submit code path are plausibly built as two separate units and could each guess differently.
- **Default theme value on first launch is unstated.** EXPERIENCE.md Foundation is explicit that theme "nunca segue a preferência do sistema operacional" (never follows OS preference). AD-2 fixes the storage key (`taskflow:theme`, string `'light'|'dark'`) but never states what `loadTheme()` returns when the key doesn't exist yet (first-ever run). Left unstated, an implementer could reach for `prefers-color-scheme` as a "sensible" fallback, directly contradicting the UX doc's explicit constraint. Cheap to fix (one sentence: default `'light'` when absent), but currently a real gap.
- **Load/parse failure of persisted data is not addressed** (see §7 below — folded in here too since it is a genuine unfixed divergence point: what `loadTasks()`/`loadTheme()` do when `localStorage` throws on read, or JSON is corrupt/unparseable, or `schemaVersion` is unrecognized, is not specified anywhere).

Minor, not blocking: Vitest + `@testing-library/react` are pinned in the Stack table but no convention states where tests live or what's tested (co-located `*.test.tsx`? a `__tests__/` dir? unit tests only for reducers/selectors, or also components?). Low risk for a solo dev, but since the deps are explicitly named, zero words on their usage is a small inconsistency worth a one-liner.

## 2. Is every AD's Rule enforceable and does it actually prevent its stated divergence?

Walked AD-by-AD:

- **AD-1** (no backend/infra) — Rule is a checkable invariant ("no MVP FR requires a server") against a fixed FR-1..FR-7 list; enforceable as a design-review gate on any future story that reaches for a server. Prevents scope creep into infra. OK.
- **AD-2** (two independent `localStorage` keys) — Concrete key names, JSON shape, `schemaVersion`. Enforceable by inspection/test. Prevents mixed storage mechanisms per feature. OK.
- **AD-3** (warning, not backup) — Concrete, checkable (presence of a static warning string in UI; absence of export/import code). Prevents unrequested scope (export feature) and prevents silently ignoring the PRD's named risk (Open Question 5). OK — but see §7, the mitigation only covers *user-caused* data loss (clearing browser data), not *app-caused* data loss from a corrupt/unparseable load, which AD-3's own framing ("dados ficam salvos apenas neste navegador") doesn't warn about.
- **AD-4** (atomic persist-then-commit) — Very concrete: synchronous try/catch write before dispatch, no state change on failure, error result returned, and a specific UI contract for the Modal (stays open, inline error, preserves fields, manual retry only, no silent auto-retry). This is the strongest AD in the spine — it's testable (mock `localStorage.setItem` to throw and assert no dispatch + error surfaced) and it resolves EXPERIENCE.md's explicit `[NOTE FOR ARCHITECTURE]` under "Falha ao salvar" almost verbatim. OK, no issues.
- **AD-5** (React native state, no external lib) — Simple, checkable via `package.json`/imports. Prevents an unjustified Redux/Zustand-class dependency. OK.
- **AD-6** (drag-and-drop always has a full keyboard equivalent via `@dnd-kit/react`'s built-in keyboard sensor, "same logic, not a parallel reimplementation") — Enforceable (check no hand-rolled keydown handler duplicates the reorder logic) and it directly targets EXPERIENCE.md's Accessibility Floor requirement that no drag-triggered action depend exclusively on mouse drag. This is a well-justified, correctly-scoped AD given the real accessibility risk named in the UX doc. OK.
- **AD-7** (manual order field scoped to `(day, priorityGroup)`, simple sequential reindex, no fractional indexing) — Enforceable, and the "no fractional indexing" call is well justified for the actual data volume (a personal daily task list). Resolves PRD Open Question 3. OK for the drag-drop path; incomplete for the modal-edit path (see §1 finding above).
- **AD-8** (only `src/storage/` touches `window.localStorage`) — Enforceable via code review or an ESLint `no-restricted-globals`/`no-restricted-properties` rule (not mandated in the spine, but easy to add later without contradicting it). Prevents the exact failure mode named (components/screens each reinventing persistence). OK.

No AD was found to be unenforceable or to fail at preventing its stated divergence.

## 3. Could anything under Deferred let two independently-built units diverge incompatibly?

Reviewed each Deferred item:

- **Export/Import backup** — explicitly *not built* for MVP; nothing to diverge on since no code exists for it. Safe.
- **Production build/hosting** — explicitly deferred with a stated trigger condition (multi-device access, which the Brief already ties to v2/login). Consistent with AD-1. Safe.
- **Minimum window width / sub-threshold behavior** — explicitly named and deferred to "build/histórias," correctly labeled as a CSS/implementation decision rather than a structural one. This is contained to a single component (`WeekView`/grid container), so even if under-decided, the blast radius of divergence is one file, not two independently-built units disagreeing. Low risk, acceptably deferred, matches EXPERIENCE.md's own "Responsive & Platform" note.
- **Login/multi-device/notifications** — correctly deferred as out-of-MVP-scope, with an explicit note that they'd invalidate AD-1 and require a new spine rather than an extension. Safe, well-flagged.

No Deferred item was found to create cross-unit incompatibility risk. The genuinely risky "silent" gaps (styling/theming mechanism, load-failure handling) are not in the Deferred list at all — they're simply absent, which is why they're called out separately in §1 and §7 rather than here.

## 4. Is named tech verified-current, with verification cited?

Yes, mechanically satisfied: the Stack table (React 19.3.0, Vite 8.1.3, `@vitejs/plugin-react` 6.1.1, TypeScript 7.0.2, `@dnd-kit/react`+`@dnd-kit/dom`+`@dnd-kit/helpers` 0.5.0, Vitest 5.0.0, `@testing-library/react` 16.3.3) is followed by an explicit line: *"Versões verificadas na web em 2026-09-10"* — matching the spine's own `updated` date and today's date. It also flags a named `[ASSUMPTION]` about TypeScript 7.0's recency (first stable July 2026, Go rewrite) with an explicit, low-cost fallback (drop to TS 5.x if tooling friction appears) that doesn't require revisiting the spine. This is exactly the citation-and-date pattern the checklist asks for. (Re-verifying the actual currency of these version numbers is out of scope for this review, per instructions.)

## 5. Does it cover the PRD's capabilities (FR-1..FR-7, PRD §5 NFRs)?

The **Capability → Architecture Map** table covers all seven FRs plus the persistence NFR and theme, each pointing to concrete implementation location(s) and governing AD(s):

- FR-1..FR-4 (create/edit/delete/state-change) → `TaskModal`/`TaskCard` → `useTaskActions.*` → `storage`, governed by AD-4/AD-5/AD-7/AD-8 as applicable.
- FR-5 (week view) → `WeekView`/`DayColumn`, governed by AD-5.
- FR-6 (priority ordering) → `selectors.sortTasksInDay`, `PriorityTag`, drag via `@dnd-kit/react`, governed by AD-6/AD-7.
- FR-7 (completed-task differentiation) → correctly identified as **not needing its own AD** — it's a pure visual consequence of FR-4 + DESIGN.md's `completed-opacity` token, with no architectural decision to make. This is a good example of appropriate restraint rather than a gap.

PRD §5 NFRs:
- **Persistência** → AD-2/AD-3/AD-4, with the explicit risk (PRD Open Question 5) directly named and addressed (partially — see §7).
- **Plataforma** (desktop-only, no mobile/responsive) → inherited via `scope` framing and the Deferred item on sub-threshold width; consistent with PRD §6/§7.2 non-goals.
- **Sem autenticação** → stated directly in Consistency Conventions ("Sem autenticação/autorização — todas as tarefas pertencem implicitamente à única usuária da instalação").

All FRs and NFRs are covered. No capability is silently missing from the map.

## 6. Is every structural dimension this altitude owns decided/deferred/open — especially deployment & environments, infra/provider strategy, operations?

This is a genuine strength of the spine. The **Structural Seed** section explicitly and separately addresses:

- **Deploy & ambiente**: dev-only via `npm run dev`/Vite on `localhost`; no production build fixed; no hosting; no CI/CD — stated as an explicit decision proportional to single-machine personal use, with a pointer to Deferred if it changes.
- **Operação/observabilidade**: explicitly "nenhuma" — no telemetry, no remote logging, no monitoring, with a one-line justification (no user but Isabel, no running service to operate).
- **Carregamento inicial**: explicitly resolves EXPERIENCE.md's `[NOTE FOR ARCHITECTURE]` about loading-state latency, citing the synchronous `localStorage` read as the reason no loading state is needed.

So the operational/environmental envelope this checklist specifically flags is **not** silent — it's explicitly decided and justified. Good.

The dimension that *is* silent at this altitude, and should not be, is **styling/theming implementation strategy** (no CSS approach named anywhere — see §1). This is exactly the kind of "whole dimension left silent" the checklist calls a finding, and it sits at the same altitude as AD-8 (a layer-boundary rule) — it's about how the two-theme design system in DESIGN.md gets wired to `ThemeContext`'s output, not an implementation nicety.

Testing strategy (where tests live, what's covered) is a secondary, much lower-stakes silent dimension — worth a line, not a blocker, given Vitest/RTL are already committed dependencies.

## 7. Proportionality: over-engineering vs under-specification relative to real risks

**Over-engineering check — none found.** The spine actively guards against it:
- AD-1 and AD-5 exist specifically to block backend/infra and external state-management libraries that would be disproportionate for a single-user personal list.
- `schemaVersion` in AD-2 is a one-field, low-cost forward-compatibility hook, explicitly justified ("para permitir migração futura... sem precisar redesenhar a persistência") rather than a speculative migration framework.
- Adopting `@dnd-kit/react` (rather than hand-rolling drag-and-drop) is justified, not gratuitous: EXPERIENCE.md's Accessibility Floor requires a *complete* keyboard equivalent to every drag action, and AD-6's rationale — reusing the same interaction logic for mouse and keyboard instead of two parallel implementations — is precisely the kind of risk a small library legitimately buys down. This is not scope creep.
- No CI/CD, no hosting, no telemetry — all explicitly and correctly scoped out (§6).

**Under-specification check against the named real risks:**

- **Persistence data-loss risk** — *Partially under-specified.* AD-3 (static warning) and AD-2/AD-4 (write-path integrity, schemaVersion) address the risk of the browser/profile being cleared and address save-time failures. But **read/load-time failure is not addressed anywhere**: what `loadTasks()`/`loadTheme()` do if `localStorage.getItem` throws, if the stored JSON is corrupt/unparseable, or if `schemaVersion` doesn't match what the app expects, is unspecified. Given AD-3's whole framing is "we warn instead of backing up," a silently-swallowed parse error that resets the week to empty (no warning, no error, just an empty view indistinguishable from FR-5's "day with no tasks" state) would be a real, silent data-loss path this spine was supposed to close. **Finding: Major.**
- **Save-failure behavior** — *Well specified.* AD-4 is concrete, testable, and maps directly onto the Modal's UI contract (stays open, inline error, preserves input, manual retry). This is the best-covered risk in the spine. No gap.
- **Manual ordering** — *Mostly specified.* AD-7 fixes the scope and reindexing algorithm for the drag-drop path and for creation, but leaves the modal-edit path's order placement unstated (see §1). **Finding: Minor.**
- **Theme persistence** — *Persistence side is fine (AD-2/AD-4); the rendering side is not.* The storage mechanics for the theme preference are solid, but there is no decision on how that stored value becomes applied CSS/styling across components, and no stated default for a first-ever run (risk of accidentally following OS preference, which EXPERIENCE.md explicitly forbids). **Finding: Major (styling mechanism) + Minor (default value).**
- **Drag-and-drop keyboard accessibility** — *Well specified.* AD-6 directly and correctly targets this with an enforceable, non-gratuitous rule. No gap.

---

## Findings Summary

| # | Severity | Finding |
|---|----------|---------|
| 1 | Major | No CSS/styling/theming implementation mechanism is named anywhere in the spine (no CSS Modules/Tailwind/CSS-in-JS/CSS-variable+`data-theme` strategy) despite DESIGN.md defining a full two-theme token system and AD-2/AD-4/AD-5 fixing only the *data* side of theme persistence. Real risk of components diverging on how they consume theme tokens, silently breaking dark mode in some components. |
| 2 | Major | Persistence **load/parse failure** (corrupt JSON, `localStorage.getItem` throwing, unrecognized `schemaVersion`) is unaddressed — only save-failure is covered (AD-4). Given AD-3's mitigation strategy for data loss is "warn, don't back up," a silent load failure that resets the view to empty is exactly the kind of silent data loss this spine was meant to close off. |
| 3 | Minor | AD-7's reindexing rule is scoped to the drag-drop path ("ao soltar um card") and task creation; it does not state where a task lands in its new `(day, priorityGroup)` group when priority/day is changed via the Modal (FR-2 path), leaving two independently-built code paths free to diverge. |
| 4 | Minor | No stated default for `taskflow:theme` on first launch (key absent) — risks an implementer defaulting to `prefers-color-scheme`, which EXPERIENCE.md explicitly prohibits ("nunca a preferência do sistema operacional"). |
| 5 | Minor / nice-to-have | Vitest + `@testing-library/react` are pinned in the Stack table with no accompanying convention for test location/scope — low risk for a solo dev, but worth one line given the deps are explicitly committed. |

## Positive notes (not findings, but worth preserving)

- AD-4 is an exemplary AD: concrete, testable, and it resolves an explicit `[NOTE FOR ARCHITECTURE]` left open in EXPERIENCE.md almost by name.
- AD-6's justification for adopting `@dnd-kit/react` over hand-rolling drag-and-drop is proportional and well-argued against the real accessibility requirement, not reflexive dependency adoption.
- The Structural Seed's explicit "Deploy & ambiente" / "Operação/observabilidade" subsections are a good model for how to close out the operational envelope at this altitude without over-specifying process the project doesn't need (no CI/CD invented for a solo dev-only app).
- FR-7 is correctly identified as not needing its own AD — good judgment about when a capability is a pure visual consequence rather than an architectural decision point.
