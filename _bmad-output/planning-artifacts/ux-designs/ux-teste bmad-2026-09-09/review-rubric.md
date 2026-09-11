# Spine Pair Review — TaskFlow

## Overall verdict

DESIGN.md + EXPERIENCE.md form a clean, tightly-scoped contract: every UJ and FR from the PRD resolves to a named flow or behavioral rule, every token in DESIGN.md's frontmatter is used and resolves, and both files hold canonical BMAD-UX shape with no invented sections. The pair is ready for architecture/story-dev to consume as-is. Three real loose ends keep it from a clean "strong" across the board: a declared-but-unverified contrast gap on button text, DESIGN.md never linking the two promoted mockups that visually realize it, and no UX-level note on what happens if a task fails to save — none block a downstream consumer, but each is worth closing before it hardens into an unexamined assumption.

## 1. Flow coverage — strong

Extracted from PRD §2.3: UJ-1 (Isabel planeja a semana, FR-1/FR-5), UJ-2 (Isabel decide por onde começar o dia, FR-4/FR-5/FR-6/FR-7), UJ-3 (Isabel ajusta uma tarefa no meio da semana, FR-2/FR-3). All three appear in `EXPERIENCE.md.Key Flows` as Flow 1/2/3, each with Isabel named and time-of-day context, numbered steps, an explicit "Climax" beat, and a failure/alternative path (Flow 2's flow reasons explicitly why no failure path applies — transitions are unrestricted per FR-4 — which satisfies "onde aplicável" rather than skipping it). All 7 FRs are traceable to at least one flow or Component/State Patterns row.

### Findings
None.

## 2. Token completeness — adequate

All 18 color tokens in `DESIGN.md` frontmatter have hex values and light/dark pairs; every `{path.to.token}` reference in the prose (components, typography roles, spacing, rounded) resolves to a defined key. A contrast floor is declared: `ink-primary`/`ink-secondary` over `surface-base`/`surface-raised` must hit AA (4.5:1) in both themes.

### Findings
- **high** The declared AA contrast floor covers only `ink-*` on surface tokens — it does not cover `button-primary` (`surface-raised` text on `accent` fill) or `button-destructive` (`surface-raised` text on `priority-high` fill), which are the only two text-bearing color-on-color combinations in the product (`DESIGN.md` §Components, `button-primary`/`button-destructive`). Computed contrast for both is ≈4.4:1 in light mode — under the 4.5:1 normal-text AA threshold the spine itself sets as the bar. *Fix:* extend the Colors contrast paragraph to explicitly cover these two combinations (verify/adjust hex, or state why button labels are exempt e.g. as large/bold text).

## 3. Component coverage — strong

Every component named across both files (Cabeçalho, Coluna do Dia, Card de Tarefa, Tag de Prioridade, Indicador de Estado, Modal de Tarefa, Confirmação de Exclusão, Alternador de Tema) has a visual spec row in `DESIGN.md.Components` and a behavioral row in `EXPERIENCE.md.Component Patterns` or `State Patterns`, both with real rules rather than one-word descriptions.

### Findings
- **low** Cabeçalho (`header`) has a full visual spec in `DESIGN.md.Components` but no dedicated row in `EXPERIENCE.md.Component Patterns` — it appears only as the "Use" location for Alternador de Tema (`EXPERIENCE.md` line ~57). Likely fine since the header itself is a static container with no behavior of its own, but a downstream reader can't confirm that without inferring it. *Fix:* one line noting the header is non-interactive chrome, or fold it into the Alternador de Tema row explicitly.

## 4. State coverage — adequate

Walked all three surfaces (Visão Semanal, Modal de Tarefa, Confirmação de Exclusão). `EXPERIENCE.md.State Patterns` covers: empty day, completed task, no-priority task, dragging, initial load (with a `[NOTE FOR ARCHITECTURE]` flag for latency), theme, and empty-required-field validation. Focus state is covered separately in Accessibility Floor.

### Findings
- **medium** No state or note addresses a task failing to persist. PRD §5 flags this explicitly as a "known risk" requiring evaluation at architecture time ("limpar dados do navegador... avaliar explicitamente na etapa de arquitetura, com mitigação... se necessário" — PRD §5, Open Question 5), and the persistence mechanism itself is still an open PRD question (local storage vs. backend). `EXPERIENCE.md` added a `[NOTE FOR ARCHITECTURE]` for the comparatively minor loading-latency case (State Patterns, "Carregamento inicial") but is silent on the higher-stakes save-failure case. *Fix:* add a `[NOTE FOR ARCHITECTURE]` state row (or extend "Campo obrigatório vazio") specifying whether a failed save keeps the modal open with an error, silently retries, or something else — mirroring the pattern already used for the loading-latency gap.

## 5. Visual reference coverage — adequate

Workspace visual assets: `mockups/key-weekly-view.html`, `mockups/key-task-modal.html`, and `.working/color-themes-1.html` (5 palette variants, explicitly kept as an audit trail per `.memlog.md`). `imports/` is empty. `.working/key-weekly-view.html` and `.working/key-task-modal.html` are byte-identical leftover copies of the promoted `mockups/` versions (confirmed via diff) — harmless but uncleaned. "Spines win on conflict" is declared once, in `EXPERIENCE.md.Information Architecture`.

### Findings
- **medium** `DESIGN.md` never links `mockups/key-weekly-view.html` or `mockups/key-task-modal.html` — only `EXPERIENCE.md.Information Architecture` does. `DESIGN.md`'s own intro blockquote links only `.working/color-themes-1.html` (the palette-selection trail, not the final composed screens). A consumer reading `DESIGN.md` in isolation — e.g., someone implementing only the visual layer — has no pointer to the mockups that actually render its Colors/Components/Shapes sections together. *Fix:* add the same composition-reference line (or equivalent) to `DESIGN.md`, e.g. under Components.
- **low** (mechanical) `.working/key-weekly-view.html` and `.working/key-task-modal.html` duplicate the promoted `mockups/` files exactly and serve no further purpose now that promotion is recorded in `.memlog.md`. *Fix:* none required (harmless), but safe to delete.

## 6. Bloat & overspecification — strong

No pixel-specs duplicate token coverage, no restatement of PRD/brief FRs or personas, no decorative narrative unmoored from a decision. `DESIGN.md` carries editorial brand voice appropriately in prose (e.g. "menos do que Notion, menos do que Todoist"); `EXPERIENCE.md` stays procedural/neutral throughout, consistent with the rubric's split.

### Findings
- **low** `EXPERIENCE.md.Responsive & Platform` partially restates Foundation's opening line ("sem responsividade no MVP... não-objetivo explícito do PRD §6/§7.2" appears near-verbatim in both sections). The section still earns its place — it adds the genuinely new minimum-window-width caveat — but the overlap could be trimmed to just the new information.

## 7. Inheritance discipline — strong

Both `sources` entries resolve to the actual PRD and brief. UJ-1/2/3 and FR-1…FR-7 IDs are used verbatim and consistently across both spines. Glossary terms (Tarefa, Dia da Semana, Estado, Prioridade, Semana) match the PRD Glossário exactly in both files. Component names are identical wherever they recur across `DESIGN.md` and `EXPERIENCE.md`.

### Findings
- **low** (mechanical) `EXPERIENCE.md.State Patterns` cites `DESIGN.md.completed-opacity` as a bare dotted name rather than the fully-qualified path (`components.task-card.completed-opacity`). It resolves unambiguously today (only one token with that name), but the informal citation style is inconsistent with the `{path.to.token}` convention used everywhere else.

## 8. Shape fit — strong

`DESIGN.md` sections run in exact canonical order: Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts. `EXPERIENCE.md` has all eight required defaults (Foundation, IA, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows) in the correct relative order, with Key Flows last. Inspiration & Anti-patterns is triggered and justified (PRD Non-Goals, memlog inspiration/rejection decisions, explicitly countering PRD's SM-C1 counter-metric). Responsive & Platform is triggered defensibly even though the product is explicitly single-surface, because it documents a real open gap (minimum window width) rather than padding.

### Findings
None.

## Mechanical notes

- Frontmatter is complete on both files (name/status/sources/updated at minimum; `DESIGN.md` additionally carries description + full token blocks). No required frontmatter fields missing.
- No broken cross-references found: all `mockups/`, `.working/` paths referenced in prose exist on disk; both `sources` entries in frontmatter resolve to real files.
- No Mermaid blocks in either file — not applicable.
- Component and glossary naming is consistent word-for-word across `DESIGN.md`, `EXPERIENCE.md`, and the PRD/brief — no drift found (e.g. "Indicador de Estado," "Tag de Prioridade," "Coluna do Dia" used identically everywhere).
- See Finding 5 (low) for the one token-citation formatting inconsistency, and Finding 5/mockups (medium) and duplicate-files (low) for the visual-reference gaps.
