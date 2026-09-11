# Review — Version/Reality Check on ARCHITECTURE-SPINE.md Stack Table

**Reviewer lens:** every committed decision must be web-researched or reality-checked, not asserted from training data — current versions, package existence/fit, and (greenfield) live starter defaults.

**Target:** `_bmad-output/planning-artifacts/architecture/architecture-teste bmad-2026-09-10/ARCHITECTURE-SPINE.md`, Stack table (lines 112–124), cross-checked against AD-6 (dnd-kit), Deploy & ambiente, and the rest of the spine.

**Method:** live web search + fetch against npm, official release blogs/docs, and GitHub, run today (2026-09-10). No claim below is asserted from model training data — each has at least one source cited.

**Verdict:** the individual version numbers are almost all real and close to current, but the spine's single [ASSUMPTION] hedge (TS 7.0 recency → fallback to TS 5.x) is undersized for what the research actually surfaces: TypeScript 7.0 shipped without its Programmatic Compiler API, which as of today **breaks `typescript-eslint` outright (npm peer-dep conflict, closed "not planned")** and also breaks `ts-jest`/`ts-morph`/Vitest's `--typecheck` mode unless TS 6 is kept side-by-side — a materially different (and much more actionable) risk than "might have friction, swap to 5.x."

## Per-line verification

| Stack line | Spine claim | What the web says today (2026-09-10) | Verdict |
|---|---|---|---|
| React + react-dom | 19.3.0 | Confirmed current `latest` on npm; released **2026-09-09**, i.e. one day before the spine's stated verification date. react.dev/blog/2026/09/09/react-19-3 confirms the version and ships View Transitions/Fragment Refs as newly-stable. | Accurate, but bleeding-edge (see Finding 3). |
| Vite | 8.1.3 | Vite 8.0.0 shipped 2026-03-12 (Rolldown-based rewrite). By 2026-09-10 the actual npm `latest` is **8.2.2**, published 2026-08-20 — three weeks before the spine's "verified" date. 8.1.3 is a real, existing version but is not current. | **Stale** — spine understates its own currency (see Finding 4). |
| @vitejs/plugin-react | 6.1.1 | Confirmed npm `latest`. | Accurate. |
| TypeScript | 7.0.2 | Confirmed: TS 7.0 GA shipped 2026-07-08 as 7.0.2 (Go-native compiler), per Microsoft's own announcement (devblogs.microsoft.com/typescript/announcing-typescript-7-0). Version number and existence are correct. | Accurate as a version claim, **but the accompanying risk assessment is too weak** (see Finding 1). |
| @dnd-kit/react + /dom + /helpers | 0.5.0; claims @dnd-kit/core is "legacy, ~2 years without update" | Confirmed: `@dnd-kit/react` 0.5.0 is npm `latest`, built on `@dnd-kit/dom`, and dndkit.com's official docs route new projects through `/react/` while labeling the old API `/legacy/` with a migration guide. `@dnd-kit/core`'s npm `latest` is 6.3.1, last published ~2 years ago (~Sept 2024) — matches the spine's claim almost exactly. | Accurate, well-sourced claim. But 0.5.0 is pre-1.0 (see Finding 2). |
| Vitest | 5.0.0 | Confirmed npm `latest`, published ~2026-09-03 (7 days before spine date) per vitest.dev/blog/vitest-5. Requires Vite ≥6.4.0 (satisfied by Vite 8) and **Node ≥22.12.0**. | Accurate, but see Finding 5 (Node version unpinned). |
| @testing-library/react | 16.3.3 | Confirmed npm `latest`, compatible with React 19. Since v16, `@testing-library/dom` is a required peer dependency not bundled — not listed as a separate stack line. | Accurate version; minor omission (Finding 6). |

## Findings

### Finding 1 — HIGH: TS 7.0's missing Compiler API is a bigger, more concrete risk than the spine's [ASSUMPTION] conveys

The spine flags TS 7.0 recency as an assumption and offers "fall back to TS 5.x, doesn't require revisiting this spine" as the mitigation. That framing implies a vague, low-probability "tooling friction." What the research actually shows is specific and already happened, not hypothetical:

- TypeScript 7.0 **shipped without the Programmatic Compiler API** (`ts.createProgram`, `ts.transform`, `ts.factory`, `ts.sys`) — the JS module now only re-exports `{ version, versionMajorMinor }`; the real checker moved into a Go binary (devblogs.microsoft.com/typescript/announcing-typescript-7-0; dev.to/dev_encyclopedia/why-your-typescript-7-upgrade-broke-eslint-ts-jest-and-ts-morph-385k).
- `typescript-eslint`'s published peer-dependency range is `>=4.8.4 <6.1.0` — **`npm install` throws ERESOLVE against typescript@7 outright**, and the upstream tracking issue (typescript-eslint/typescript-eslint#12518) was **closed as "not planned."** A TS7+ESLint setup does not merely have friction; it does not install.
- `ts-jest` and `ts-morph` fail the same way (same dependency).
- Vitest's own `--typecheck` mode shells out to `tsc --noEmit` and needs the TS6 API in scope; without a TS6 side-install it breaks too (vitest-dev/vitest#8981 territory; multiple 2026 migration write-ups converge on the same "keep TS6 side-by-side via the new `@typescript/typescript6` compat package" workaround).
- Fix timeline: TS 7.1, targeted for "Autumn 2026," is expected to reintroduce a (different) programmatic API — not yet shipped as of today.

None of this is fatal for TaskFlow specifically — the spine's stack table does not list ESLint, ts-jest, or a typecheck script, so the project may not hit the broken surface at all. But that is exactly the point: the spine should say so explicitly, rather than leaving a generic "fallback to 5.x" note that reads as low-stakes. **Recommend strengthening AD around TypeScript to either (a) explicitly commit to TS 5.x now for a standard Vite+React+ESLint+Vitest toolchain, given the documented breakage, or (b) if TS 7.0 is kept, explicitly state that linting/typecheck tooling is deferred or pinned to a TS6 side-install, so a future implementer doesn't discover the ERESOLVE failure mid-setup and treat it as a surprise.**

Sources: [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/), [Why Your TypeScript 7 Upgrade Broke ESLint, ts-jest, and ts-morph](https://dev.to/dev_encyclopedia/why-your-typescript-7-upgrade-broke-eslint-ts-jest-and-ts-morph-385k), [typescript-eslint#12518](https://github.com/typescript-eslint/typescript-eslint/issues/12518), [Vite 8 / Rolldown TS7 API gap noted July 2026](https://github.com/voidzero-dev/vite-plus/issues/2148).

### Finding 2 — MEDIUM: @dnd-kit/react 0.5.0 is pre-1.0; the spine's AD-6 treats it as settled

The spine is factually correct that `@dnd-kit/core` is stale and `@dnd-kit/react` is the maintained successor — that part is well-sourced. What's missing is that `@dnd-kit/react` is **still pre-1.0** (0.5.0), and the project's own discussion thread (clauderic/dnd-kit#1842, and #1803) shows users explicitly asking the maintainer whether/when it reaches a stable 1.0 and whether APIs will still change — questions that, per the maintainer's own public framing ("production ready but some APIs may change before the 1.0.0 release"), are not yet fully closed. AD-6 binds keyboard-equivalent drag-and-drop to this library as a structural invariant; that's a reasonable bet (better than pinning to the truly abandoned `/core`), but the spine should note the pre-1.0 status as a known/accepted risk rather than presenting the choice as risk-free.

Sources: [@dnd-kit/react on npm](https://www.npmjs.com/package/@dnd-kit/react), [dndkit.com migration guide](https://dndkit.com/react/guides/migration/), [clauderic/dnd-kit discussion #1842](https://github.com/clauderic/dnd-kit/discussions/1842).

### Finding 3 — LOW: React 19.3.0 is literally one day old at spine write time

react.dev's own blog post for 19.3 is dated 2026-09-09; the spine is dated/verified 2026-09-10. The version is real and accurately identified as `latest`, so this isn't a factual error — but pinning greenfield tooling to a release that's <24h old carries elevated (if small) risk of an unnoticed regression or a fast-follow patch. Not a change request, just worth a one-line acknowledgment next to the TS 7.0 recency note, since the spine already has a precedent for flagging "very new" as a risk category for TS but not for React.

Source: [React 19.3 blog post, 2026-09-09](https://react.dev/blog/2026/09/09/react-19-3).

### Finding 4 — LOW/MEDIUM: Vite pin (8.1.3) is already ~3 weeks stale relative to the spine's own "verified 2026-09-10" claim

Multiple independent sources (Vite's own release notes plus npm-mirroring sites) place `vite@latest` at **8.2.2**, published 2026-08-20 — three weeks before the spine's stated verification date. 8.1.3 exists and is a legitimate Vite 8.x version, so this isn't "the version doesn't exist," but it does undercut the spine's footnote "*Versões verificadas na web em 2026-09-10*": on that date the true latest was already two point-releases ahead. This is a minor drift in absolute terms, but it's the one place where the spine's own accuracy claim doesn't hold up under a repeat check — worth a quick re-verify before the number is used to `npm install vite@8.1.3` (better to install `vite@^8` or check `latest` at implementation time rather than hand-pin a value that may already be behind).

Sources: [Vite 8.0 announcement](https://vite.dev/blog/announcing-vite8), search-aggregated npm publish data placing 8.2.2 at 2026-08-20.

### Finding 5 — LOW: Node.js runtime version is never pinned anywhere in the spine

Vitest 5.0 requires **Node ≥22.12.0**; Vite 8 requires Node 20.19+ or 22.12+. The spine's Stack table and "Deploy & ambiente" section specify `npm run dev` locally but never state a required Node version (no `.nvmrc`/`engines` mention either). Given the stack's minimums cluster around Node 22.12, and this is a solo-developer local-only setup with no CI to catch a mismatch, a one-line Node version floor would close a real (if small) reality-check gap — someone on an older Node LTS could hit an opaque failure with no spine guidance to point at.

Sources: Vitest 5.0 blog / migration guide (vitest.dev/blog/vitest-5.html), Vite 8 announcement (vite.dev/blog/announcing-vite8).

### Finding 6 — LOW: `@testing-library/dom` peer dependency not listed

Since `@testing-library/react` v16, `@testing-library/dom` is a required peer dependency rather than a bundled transitive one. The Stack table lists only `@testing-library/react`; not wrong, but an implementer following the table verbatim as an install list will hit a peer-dependency warning it doesn't explain.

## Summary of severities

- **HIGH:** Finding 1 — TS 7.0's missing Compiler API breaks `typescript-eslint`/`ts-jest`/`ts-morph`/Vitest typecheck today; the spine's fallback note undersells this as generic "friction" rather than a documented, currently-unresolved ecosystem incompatibility.
- **MEDIUM:** Finding 2 — `@dnd-kit/react` 0.5.0 is pre-1.0 with maintainer-acknowledged API-stability caveats; AD-6 doesn't flag this.
- **LOW:** Findings 3–6 — React 19.3.0's <24h freshness, Vite pin already ~3 weeks behind `latest` at the spine's own verification date, no Node version floor stated, `@testing-library/dom` peer dependency omitted.

Everything else checked (package existence, `@dnd-kit/core` legacy status and ~2-year-stale claim, `@vitejs/plugin-react` and Vitest version numbers) came back accurate and well-supported by current web sources.
