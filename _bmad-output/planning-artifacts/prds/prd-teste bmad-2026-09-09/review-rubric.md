# PRD Quality Review — TaskFlow (prd-teste bmad-2026-09-09)

## Overall verdict
This is a disciplined, right-sized PRD for a solo hobby project — it earns its structure rather than performing it: a single honestly-justified persona, concrete NFRs instead of boilerplate, explicit deferred-vs-discarded scope, and full FR↔UJ traceability that actually resolves. The one real gap is that persistence is treated only as "survives close/reopen" with no acknowledgment of the data-loss risk (cleared browser storage, private mode, browser switch) that a real daily-use tool built on unspecified local storage carries — worth a line given SM-1 depends on genuine daily reliance. Everything else is minor and mechanical (a missing §2.2, one un-tagged assumption).

## Decision-readiness — strong
Decisions are stated as decisions, not softened. §5 explicitly punts the persistence mechanism to architecture rather than pretending to resolve it ("O mecanismo exato... é decisão da etapa de arquitetura, não deste PRD"). The Open Questions in §9 are genuinely open — Q1 (visual style), Q3 (tie-break order), and Q4 (task limit) have no answer smuggled into the next sentence; where a default is needed to keep moving (Q3: "assumir ordem de criação até decisão em contrário"), it's flagged as provisional rather than presented as settled. The counter-metric SM-C1 names a real, specific near-miss ("o mesmo padrão que quase trouxe login para o MVP") rather than a generic scope-creep warning — that's an objection actually surfaced, not dodged.

No findings.

## Substance over theater — strong
- **No persona theater**: §2.1 states plainly there are no secondary personas and gives the reason ("o público é a própria Isabel, que também define e valida o produto") rather than padding with unused personas.
- **No innovation theater**: Vision (§1) explicitly disclaims competing with Todoist/Trello/Notion — no inflated differentiation claim.
- **No NFR theater**: §5 has exactly three NFRs, each concrete and scoped to what actually matters at this scale (persistence bound = survives browser close/reopen; platform = desktop only, no mobile/sync; no-auth = single implicit user). Notably, it does *not* pad with irrelevant "must be scalable/secure" boilerplate for a single-user local tool — that omission is itself evidence of discipline, not a gap.
- **No Vision theater**: the Vision is specific to Isabel's actual situation (tasks scattered across "anotações soltas, mensagens para si mesma no WhatsApp") — it could not swap into another PRD unchanged.

No findings.

## Strategic coherence — strong
The thesis is explicit: centralize one person's scattered weekly tasks into a single low-friction view, add nothing unrequested (§1: "sem recursos que não foram pedidos"). FR-1 through FR-7 are all direct load-bearing consequences of that thesis — no adjacent capability sneaks in. Success Metrics match a personal-use, non-product-metric thesis (§8 explicitly rules out DAU/retention-style metrics as "não fazem sentido para este projeto") and SM-C1 is a genuine counter-metric tied to the thesis's core constraint (avoid scope creep), not a vanity check.

No findings.

## Done-ness clarity — strong
Every FR (FR-1–FR-7) carries a "Consequências (testáveis)" block with verifiable conditions rather than adjectives — e.g., FR-5's "Um dia sem Tarefas exibe claramente que está vazio (não é confundido com erro de carregamento)" and FR-6's explicit ordering rule (Alta → Média → Baixa → sem prioridade). Where a criterion is genuinely subjective (FR-7's "reconhecível à primeira vista"), it's paired with a `[NOTE FOR PM]` pointing to the open UX decision rather than left as an unflagged soft claim.

### Findings
- **low** FR-2 doesn't restate field validation on edit (§4.1, FR-2) — FR-1 requires title + day as mandatory to save a new Tarefa, but FR-2 ("Isabel pode editar qualquer campo... texto, Dia da Semana e Prioridade") never states whether an edit can blank the title or unassign the day. An engineer implementing edit has no stated bound for this case. *Fix:* add a consequence line to FR-2 clarifying that the same required-field rule from FR-1 applies to edits (or explicitly scope it as out of MVP if blank-save is simply prevented by the UI).

## Scope honesty — strong
§6 Non-Goals and §7.2 Out of Scope do real work and are unusually careful about distinguishing *deferred* (login/multi-device → v2, "adiado") from *discarded* (projects/tags, collaboration, dashboards, AI → "descartado, não apenas adiado"). Two inline `[ASSUMPTION: ...]` tags appear at the point of inference (§3 week start day, FR-2's state-vs-edit distinction) and both round-trip into §10. `[NOTE FOR PM]` sits at the one real tension in the document (the login-scope near-miss, §7.2) rather than at a safe checkpoint.

### Findings
- **medium** Data-loss risk from persistence approach is never surfaced (§5, §9 Q2) — §5 commits only to "sobreviver ao fechar e reabrir o navegador" and defers the *mechanism* to architecture, but never flags the risk that a browser-storage-only implementation (the most likely outcome given "sem login") means clearing site data, using a private window, or switching browsers silently erases every Tarefa with no backup or export path. Given SM-1 depends on Isabel actually trusting the tool with real daily tasks, this is a real omission the reader is left to infer rather than one the PRD names. *Fix:* add an explicit Non-Goal or `[ASSUMPTION]` acknowledging the data-loss risk of local-only persistence in the MVP (e.g., "no backup/export; clearing browser storage is an accepted risk for v1"), or add it as a 5th Open Question tied to §9 Q2.

## Downstream usability — strong
The PRD explicitly targets downstream UX/architecture work (§0: "prontos para orientar UX e arquitetura"), so this dimension applies in full, not in the lighter standalone mode. The Glossary (§3) is small and every term (Tarefa, Semana, Dia da Semana, Estado, Prioridade) is used with consistent capitalization across FRs, UJs, and Features — unusually disciplined for a document this size. FR IDs (FR-1–FR-7), UJ IDs (UJ-1–UJ-3), and SM IDs (SM-1–SM-3, SM-C1) are contiguous with no duplicates. Cross-references resolve both directions: every UJ's "Realiza FR-x" list is matched by the corresponding FR's "Realiza UJ-y" back-reference (verified for all three UJs), and Feature-section summaries agree with both.

No findings beyond the Mechanical notes below.

## Shape fit — strong
Correctly shaped as a light-rigor hobby/solo PRD that still meets the substance bar: single justified persona, UJs kept because the product has real UX (a spatial weekly layout, ordering, visual state) rather than added as ceremony, and Success Metrics are qualitative/operational instead of forced product-analytics metrics. Nothing here reads as over-formalized (no B2B stakeholder analysis, no competitive matrix) or under-formalized (UJs are present and load-bearing given the product does have a real screen with real interaction). This is a good match to the rubric's own "Hobby / solo → rigor light, substance bar still applies" guidance.

No findings.

## Mechanical notes
- **Section numbering gap**: §2 jumps from "2.1 Jobs To Be Done" directly to "2.3 Key User Journeys" — there is no 2.2. Likely an intentionally-dropped persona subsection (since §2.1 already states there are no secondary personas) that was never renumbered. Low-impact but worth a renumber for cleanliness.
- **Assumptions Index roundtrip gap**: §10 lists three entries, but only two have a matching inline `[ASSUMPTION: ...]` tag in the body (§3 week-start-day; §4.1 FR-2 state-vs-edit). The third — "Sem limite artificial de Tarefas por dia no MVP" — exists only as unbracketed prose inside Open Question 4 (§9) and as an index entry (§10); it was never tagged inline with `[ASSUMPTION: ...]` at its point of use. Cosmetic, but breaks the otherwise-clean tag→index roundtrip.
- Glossary terms are otherwise applied consistently; no drift in casing or synonyms found across FR/UJ/SM text (informal lowercase "dia" appears only in prose narrative sections like JTBD, not in FR consequence text, which is an acceptable register difference).
