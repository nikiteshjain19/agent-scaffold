---
name: project-audit
description: >-
  Run a rigorous, multi-pass architecture & code-quality review of THIS project's own
  codebase — a first-party, verification-voice review of code we own. Forces mechanical
  reconciliation artifacts (migration drift, schema contract, grants, route×control matrix,
  money-path trace, comment-claim register) BEFORE interpretive reading, then applies six
  standing rigor rules across architecture, access control, cost controls, performance, and
  maintainability. Tool-agnostic: stack, services, database tooling, payment provider, and
  issue tracker are read from PROJECT.md where it exists, and verified against the code.
  Read-only means introspection only — no writes, no messages, no money moved, no paid API
  calls, no load tests, and no test run that needs a live service or a credential. Files
  finding tickets only when the caller asks and PROJECT.md declares a tracker; a survey files
  nothing. Use when the user asks for a codebase audit, architecture review, pre-launch or live
  correctness review, security/robustness review, or "review the whole project".
allowed-tools: Read, Grep, Glob, TodoWrite
---

# Project Architecture & Code-Quality Review (generic)

Act as a **Principal Software Architect** reviewing **this project's** codebase — an internal,
first-party correctness and robustness review of code **we own**.

Map dependencies, trace data flows across the full request lifecycle, and assess architectural
soundness, cost controls, performance, and whether the app's safety and correctness properties
actually hold. Do not provide a surface-level summary; execute a **multi-pass analysis with
file- and line-level precision**. Where the project has a live datastore or external services,
**verify claims against the live system (via the project's DB/MCP/CLI tooling) rather than
inferring from code alone.**

**Read-only means introspection only:** schema, grants, configuration, logs and advisors. Send no
request that writes data, sends a message, moves money, calls a paid API or changes third-party
state. Never load-test. Run the test suite only when it needs no live service and no credential.
Otherwise record "not run", and why.

**Live-system rules.** These sit beside the read-only rule above. Apply them to every live query:

- Run every live query inside a read-only transaction (for SQL, e.g. `BEGIN READ ONLY`).
- A tool call that only lists metadata needs no transaction. Examples: list tables, list
  migrations, run an advisor.
- When the tool offers neither, run no query. Record the check as not verified, and say why (R2).
- Never call a tool that applies a migration, deploys, or creates, resets or merges a branch.
- Run `EXPLAIN ANALYZE` only on a `SELECT`. It executes the query. Use plain `EXPLAIN` for
  anything else.

**No customer data.** These rules also sit beside the read-only rule:

- Read metadata and aggregate counts only: schema, grants, policies, applied migrations, row
  counts.
- Never select the values in a row of a table that holds user data.
- Redact any value that appears anyway, as Phase 2.5 does for a secret (`CLAUDE.md` §8).

> **Phrasing note.** This is written in *verification* voice ("confirm control X holds on every
> path"), not *adversarial* voice ("how would an attacker bypass X"). Same findings, accurate
> description of the work: a first-party review of our own pre-launch or live code.
>
> **Why the artifacts below are mandatory.** Interpretive instructions ("verify", "confirm",
> "trace") can be satisfied with a few impressive queries while a needed one is never run. The
> Phase 0 tables force **artifacts whose empty cells are visible**. They are the cheapest part
> of this review and historically catch the most severe findings. Do not skip them to save time.

---

## 0. CONFIGURE FROM PROJECT.md — do this first, don't hard-code anything

**No `PROJECT.md`?** Resolve every item below from the repository, and label each one *inferred*
(R2). The `project-onboard` skill runs this skill before `PROJECT.md` exists.

Read `PROJECT.md` (and any architecture doc it points to) and resolve:

- **Stack & framework** — languages, web framework, routing model, UI layer, test runner.
- **Datastore + introspection tooling** — the database (if any) and *how to query it live*
  (MCP connector, CLI, admin client). You need read-only introspection: list tables/columns,
  migrations, grants/permissions, policies, indexes, advisors/linters.
- **External services** — payments, email, auth, LLM/AI providers, storage, observability —
  and which are in use. Sections below that name "payments" / "LLM" / "database" follow these
  rules:
  - Decide whether a step applies from the code and the dependency manifests, never from
    `PROJECT.md` alone.
  - Skip a step only when a named search finds no such integration (R2). Report the skip (R6).
  - An integration the code uses but `PROJECT.md` omits is a Phase 5 finding.
- **Spend guardrails** — if the project calls paid APIs, the caps/tiers/model pins live in code
  and in `PROJECT.md`. The rule that requires them is `CLAUDE.md` §10. Read whichever
  `PROJECT.md` section declares spend caps or constraints — every project names and orders its
  own sections, so this skill cites no `PROJECT.md` section number. **Do not treat any number in
  a doc or in this skill as ground truth — derive every threshold, price, tier rule, and stage
  count from the code** (see the "Do not restate the spec as ground truth" rule below).
- **Issue tracker** — so you can recognize ticket annotations in code/comments (e.g. `ABC-123`).
  Filing findings follows this rule: **List the action plan.** File tickets only when the caller
  asks for them and `PROJECT.md` declares a tracker. File through the `issue-writer` skill, whose
  approval stop decides. When invoked as a survey, file nothing.
- **Repository map** — build a *starting index* of entry points, pipelines, guardrails, billing,
  gated resources, observability, auth/session, and schema/migrations. **This is a starting
  point, not a scope boundary** — if a file participates in a path you make a claim about, read it.
  Output Format item 7 returns this index.

> **Do not restate the spec as ground truth.** A prompt that restates thresholds primes the
> reviewer to *confirm* them rather than *discover* them — and specs go stale (a cap scoped per
> tier in one ticket, a block re-scoped in another). Treat every doc/prompt/comment restating a
> value as an **unverified claim** and re-derive it from code.

---

## Phase 0 — Mechanical reconciliation (do this FIRST, before any interpretive reading)

Cheap, produce artifacts, catch the highest-severity class of bug. **Do them before you form a
mental model** — once you have a narrative you will read to confirm it. **Every step outputs a
table; include every table in the report. An empty cell is a finding; a missing table is an
incomplete review.**

**A not-applicable step still outputs a table.** Emit one row: `not applicable — <reason> —
<command that showed it>`. That table satisfies "a missing table is an incomplete review".

**Name the environment.**

- Print, at the top of every table that used a live query, the environment the connection
  reached. Name the command that showed it.
- Treat an environment you cannot identify as production, for every live-system rule.

**Fan out on a large codebase.**

- When the codebase is too large for one context, dispatch one reader per Phase 0 table.
- Give each reader the read-only rule, the live-system rules and the customer-data rules from the
  introduction, verbatim. Each reader returns its table, not file dumps.
- Where no subagent can be dispatched, build the tables yourself. One case: another skill already
  runs this audit as a subagent.
- List every path that no one read in the coverage declaration (R5).

### 0.1 Migration / schema drift — code vs. applied schema

*(Only when the code shows a DB and schema changes applied as files.)* A migration file in the
repo does **not** mean it ran — many projects apply schema out-of-band by convention.

1. List the migration files in the repo.
2. List the **applied** migrations on the live datastore. Use the DB tooling from this skill's
   section 0 (CONFIGURE FROM PROJECT.md).
3. Emit a table: migration file → applied? (yes / no / renamed).
4. Classify each migration whose file exists but is unapplied:
   - **An unapplied migration file whose referencing code has shipped is CRITICAL when 0.2 shows
     an object it creates is missing.**
   - Do not downgrade it because the code "handles errors" — see 0.2.
   - When 0.2 finds every object present, the schema was applied out of band. Record a **Low**
     finding about migration record-keeping drift.

### 0.2 Schema contract — does the datastore contain what the code requires?

*(Only if the project has a datastore.)* **Verify in both directions.** "What does the schema
permit?" (policies, grants) is NOT the same as "does the schema contain what the code
references?" Drift lives in the second direction.

1. Grep the source for every datastore reference with its field list (table/collection reads,
   writes, updates) and every stored-procedure/RPC call.
2. For each, assert against the live schema: the table/collection exists, every referenced field
   exists, every RPC/function exists.
3. Emit the delta. **Any reference to a nonexistent table/column/RPC is CRITICAL.**

> **Why the code won't tell you:** many DB clients **return** errors instead of **throwing**
> (e.g. `supabase-js` returns `{ data, error }`). A `try/catch` around such a call catches
> nothing, and a destructure that drops `error` discards the failure entirely — so a write to a
> nonexistent field is a **silent no-op that looks correct in review and passes every mocked
> test.** Never infer a query succeeded from the fact that it's wrapped in error handling.

### 0.3 Permissions / grants — query the real privilege model

*(Only when the code shows a DB with a permission system.)* Enumerate the actual privileges held
by each role/principal (especially any **anonymous / unauthenticated** role).

- For SQL/Postgres-style datastores: query **both** table-level and column-level grants — they
  are **not interchangeable** (e.g. `DELETE`/`TRUNCATE` are table-level-only and never appear in
  a column-grant view; querying only the column view and concluding "no write access" is a real,
  severe miss). Also enumerate row-level policies, function EXECUTE grants, indexes, storage/bucket
  privacy, and run any security/performance advisor the tooling offers.
- For other datastores: enumerate the equivalent role/rule/ACL model in full.
Emit the privilege tables. A too-broad grant on a sensitive object (e.g. an anon role that can
write or truncate a spend/audit ledger) is a finding.

### 0.4 Route × control matrix

*(Only if the project serves requests or exposes handlers.)* Enumerate **every**
route/endpoint/handler and every handler that mutates state (e.g. a server action) — one row
each. Columns:

| Route | Auth required? | Ownership checked? | Rate limited? | Bot/abuse control? | Input validated? | Error scrubbed? |
| --- | --- | --- | --- | --- | --- | --- |

Fill **every cell**. **Blank cells are the finding.**

- Fill a control that cannot apply to a row as `n/a — <reason>`. Example: "Ownership checked?" on
  a route that takes no resource id.
- That cell is filled. A blank cell is still a finding.

A matrix makes a missing control impossible to miss; a per-trace mental checklist lets the one
unthrottled public endpoint slip through because it was only ever met while tracing a *different* concern.

### 0.5 Money / value-delivery trace

*(Only when the code shows it takes money or gates paid value.)* For every UI element that takes
money or promises a deliverable, trace **CTA → checkout → webhook/fulfilment → entitlement grant →
the code path that consumes the entitlement → delivered value.** Emit the chain and mark where it
breaks.

> **A finding is not only a vulnerability.** Ask "is anything selling this?" and "can a customer
> actually receive what they paid for?" A dashboard selling credits that gate nothing reachable is
> a commerce finding a pure security lens files as "fewer paths = fine."

### 0.6 Comment-claim register

Good comments are a **hazard, not assurance** — their quality buys credibility the code hasn't
necessarily earned. List every comment asserting an invariant ("X is idempotent", "all N callers
do Y", "fails open"). For each, verify against the implementation. Emit: claim → file:line →
holds / does not hold. **Every comment is a hypothesis, not evidence.**

---

## Standing Rules (apply throughout every phase)

**R1 — The failure-branch rule.** Any claim of the form "X is enforced / recorded / checked /
summed" requires reading the **failure branch** — the `throw`, the `catch`, the early return —
and citing its line. Verifying the happy path and asserting a general property is not permitted.
(The classic miss: cost sums correctly across retries on the success path, while a `throw` forty
lines down discards the accumulated cost — the property was false though the happy path was right.)

**R2 — The evidence rule.** Any finding tagged *verified* must name the exact query or command
that produced it. If you didn't run it, it's *inferred* — say so. "Verified" describes your
process, not your confidence.

**R3 — Anti-anchoring on prior audits.** Ticket annotations in code (`ABC-34`, `ABC-63`…) mark
where bugs **were** — i.e. where they're already fixed. They are not assurance about their
neighbourhood. Findings cluster where **no prior ticket has planted a flag**. Actively spend
budget on unannotated code. Before treating an annotation as a fixed bug, read the annotated
ticket's state. An open ticket marks a known, unfixed problem, so treat it as a lead. When the
tracker cannot be read, treat the annotation as unverified.

**R4 — Symmetric rigor.** Apply the same scrutiny to code that looks mature as to code that looks
suspect. If you read RPC bodies to check atomicity in one place, read app-level read-then-write
for the same property elsewhere.

**R5 — Coverage declaration.** In the report, list the in-scope files/modules you did **not**
read, and why. Negative space is information — "I never opened the observability module" is often
the sentence that would have surfaced the top finding.

**R6 — Report the boring outcome.** If a mechanical check comes back clean, say so and move on.
These checks are valuable *because* they're usually negative; only reporting them when they fire
creates an incentive to skip them.

---

## Execution (multi-pass)

Where code contradicts the docs (`README`, deployment docs, `CLAUDE.md`, `PROJECT.md`,
the decision log), treat the discrepancy as a finding.

### Phase 1 — Architecture & topology

1. Map the unauth vs. authenticated/paid request paths, any pipeline/stage graph, and every
   third-party integration boundary.
2. Flag architectural drift: domain logic in route handlers, tight coupling, circular deps,
   duplicated tier/pricing/config logic.
3. Assess macro-scalability under a 10× concurrent spike (function timeouts, external-call latency
   stacking, DB contention, missing queue/backpressure). **State the infra/plan assumptions any
   timeout value depends on.** This is an analysis of code and configuration, never an
   experiment (see the read-only rule).

### Phase 2 — Access control, cost controls & data integrity

1. Complete the 0.4 matrix into per-route findings.
2. Confirm standard protections: parameterized/typed queries; untrusted content (user text,
   fetched web results) delimited and treated as **data** before reaching any prompt/interpreter;
   ownership checks on routes keyed by a resource id; anon→user linkage soundness; webhook signature
   verification, idempotency, **and fulfilment durability** (is the idempotency record written
   before or after the work? does a failed handler retry?); error handling that doesn't surface
   internal state.
3. **Cost controls (first-class, when the code shows calls to a paid API):** trace enforcement
   end-to-end. This is an analysis of code and configuration, never an experiment.
   Do caps hold under concurrency, or is the check-then-act window wide enough to overshoot? Is
   any model/tier pin enforced at the **selection layer**, and can no path pick a costlier model
   or **provider**? **Is spend recorded on failure paths, not just success (R1)?** Is cost
   recorded *within* a multi-call stage or only after — can a cap interrupt a stage mid-flight?
4. Review dependencies for high-risk or unmaintained packages.
5. Confirm secret hygiene: no secrets logged, reaching client bundles (the public-env boundary,
   e.g. `NEXT_PUBLIC_*`), in error responses, or embedded in prompts to third-party providers.
   **Never print raw secret values while auditing** (CLAUDE.md §8) — confirm existence / redact.
   Also cover credentials committed to the working tree or to history:
   - Find them the way the `project-onboard` skill's "2.3 Secrets — find them without printing
     them" does: a secret scanner with its redaction option on.
   - Record only each hit's path, commit and line.
   - Without a scanner, record "secrets: not surveyed".
   - Never substitute a pattern of your own.

### Phase 3 — Performance, concurrency & resources

1. Orchestration: serialized calls that could be parallel, redundant calls, whether any caching
   (prompt cache, query cache) is actually exercised (a cache flag is not a cache hit — mind
   minimum cacheable sizes).
2. Datastore access: N+1, missing indexes (read any query plan under the live-system rules in
   the introduction), connection handling e.g. in serverless. **Middleware: what runs on every
   request that doesn't need to?**
3. Resource disposal in file generation (PDF/DOCX/images) and DB/HTTP clients.
4. Race conditions in counters, webhook processing, session promotion, and **any app-level
   read-then-write claiming idempotency.** Read the actual RPC/transaction bodies; don't assume
   atomicity from the call site.

### Phase 4 — Maintainability, tests & debt

1. Identify god files, duplicated copy/logic, brittle branches.
2. Critique error handling: silent `catch {}`, **discarded error returns from non-throwing DB
   clients**, swallowed failures that still bill or still mutate state, partial states left behind.
3. Evaluate test coverage against risk — especially guardrail enforcement, webhook edge cases,
   entitlement gating, model/tier pinning. **Call out tests that mock so heavily they'd pass even
   if the real integration broke.** Ask specifically: *would this suite pass if the datastore had
   none of these tables/columns?*

   For each high-stakes path (`CLAUDE.md` §11 rule 3), and each claim R1 verified, name the test
   that exercises its failure branch. No such test is a finding (`CLAUDE.md` §11 rule 7).
4. Run the suite only as the read-only rule allows. Decide whether it can run:
   1. Read the test configuration first: the runner's configuration, every environment file it
      loads, and the CI job that runs it. Print no value from them (`CLAUDE.md` §8).
   2. When any of them points at a host that is not local, or reads a credential, record "not
      run". Name the file and line that showed it.
   3. Otherwise run the suite in the credential-free environment below.
   4. When the suite fails there for want of a credential, record "not run", with the error.
      Never retry it outside that environment.

   **The credential-free environment.** Replace `<command>` with the command:

   ```sh
   GHCFG="$(mktemp -d)"
   env -u GH_TOKEN -u GITHUB_TOKEN -u GH_ENTERPRISE_TOKEN -u SSH_AUTH_SOCK \
     GH_CONFIG_DIR="$GHCFG" GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 GIT_TERMINAL_PROMPT=0 \
     sh -c '<command>'
   ```

   > Run every command in this environment. It removes the host CLI's token and its stored login,
   > git's credential helpers, and the SSH agent. For a host CLI other than `gh`, remove that CLI's
   > token and stored login the same way.

   When the suite does not run, mark all test assessment as static.

### Phase 5 — Synthesis & contradiction review

Reconcile every doc (`README`, deployment docs, `CLAUDE.md`, `PROJECT.md`, `decisions.d/`, **this
skill**) against the implementation. List every place a doc
describes a control the code doesn't enforce, or enforces differently — including where docs
*understate* what's built, and where a superseded section isn't marked as such. A logged decision
in the decision log that the code contradicts is a finding.

---

## Output Format

Return the report in your reply to the caller. Never write it to a tracked file. The report holds
vulnerability details, and a tracked file in a public repository publishes them.

1. **Executive Summary:** the single most critical finding needing an immediate hotfix, and a
   one-paragraph structural-health assessment. Call out the top cost-control risk separately (if
   applicable). **State plainly whether anything is broken *today* vs. latent.**
2. **Phase 0 artifacts:** the migration table, schema-contract delta, the grant/permission tables,
   the route × control matrix, the money/value-delivery trace, and the comment-claim register.
   Include them even when clean (R6).
3. **Architectural map:** components and the primary data flows.
4. **Ledger of findings** — for EVERY issue, by severity (Critical / High / Medium / Low):
   - **[ID] Title**
   - **Location:** file path(s) + line ranges
   - **The Mechanism:** why it fails, technically
   - **Impact:** what goes wrong if left unaddressed
   - **Remediation:** a concrete fix pattern. Add a code snippet only when it is short, and mark
     it untested.
   - **Status:** broken today / latent — and **verified (name the query)** vs. inferred

   Define each severity level by impact. The forced-Critical rules in 0.1 and 0.2 apply this
   rubric.
   - **Critical** — broken today, or money, data or access at risk now.
   - **High** — latent, and puts money, data or access at risk under a reachable condition.
   - **Medium** — degrades correctness, cost or performance, with no money, data or access at
     risk.
   - **Low** — maintainability, documentation or record-keeping drift.
5. **Immediate action plan:** prioritized checklist, weighted toward the project's highest-stakes
   properties (cost control, entitlement/access correctness). **List the action plan.** File
   tickets only when the caller asks for them and `PROJECT.md` declares a tracker. File through
   the `issue-writer` skill, whose approval stop decides. When invoked as a survey, file nothing.
   - An exploitable finding tells a reader how to reach data, money or privilege they should not
     have.
   - Never file one into a tracker that anyone outside the project can read.
   - When you cannot confirm the tracker is private, treat it as public.
   - Keep the finding in the report. The owner decides where it goes.
6. **Coverage declaration (R5):** what you did not read, and why.
7. **Repository map** — section 0's starting index, one entry per path.

Anchor every finding to real file paths and line ranges. **If you cannot confirm a control exists,
say so explicitly rather than assuming it does** — and hold a *positive* claim of correctness to
the same standard (R1, R2).

---

## Known failure modes this review guards against (read before starting)

Each is a real class of miss from reviews that skipped Phase 0. The meta-lesson: a reviewer can be
perfectly rigorous while carefully answering the wrong *set* of questions. Phase 0 exists to force
questions you wouldn't have thought to ask and make the un-asked ones visible as blank cells.

| Miss | Cause | Caught by |
| -- | -- | -- |
| Migration shipped in code, never applied to the DB — feature silently 100% dead | Verified the schema in one direction only ("what does it permit?"), never the reverse ("does it contain what code needs?"); never listed applied migrations; read call sites, not the module. | 0.1, 0.2, R5 |
| Live CTAs selling credits nothing could spend | Found the fact, filed it as "fine" — evaluated as security, not commerce; never read a page component. | 0.5 |
| Failed external calls never recorded as spend | Read the success path, asserted a global property. | R1 |
| The only unthrottled public write endpoint | Checklist applied per-trace rather than per-route; the route was met while tracing a different concern. | 0.4 |
| Anon role holds destructive privilege on a ledger | Queried only the column-level grant view, which structurally can't show table-level privileges. | 0.3 |
| Comments asserting invariants the code doesn't implement | Trusted comment quality as evidence. | 0.6 |
| App-level read-then-write claiming idempotency actually double-runs | Applied concurrency scrutiny to RPCs but not to plain app-level reads. | 0.6, R4 |
| Stale caps confirmed rather than discovered | The prompt restated the spec, priming confirmation. | The "Do not restate the spec as ground truth" rule (section 0) |
