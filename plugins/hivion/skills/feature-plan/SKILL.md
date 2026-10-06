---
name: feature-plan
description: >-
  Turn a feature request into an approved design before any issue is filed. Understands
  the whole project, chooses an architecture and records the alternatives rejected,
  freezes the shared contracts parallel work builds against, and schedules the work into
  waves whose file footprints are declared disjoint. Produces a durable plan document and
  stops for approval — it files no issues and writes no implementation code; `issue-writer`
  turns the approved units into tickets. Tool-agnostic: stack, tracker, merge gate, and
  parallel-lane budget are read from PROJECT.md, never hard-coded. Use when the user says
  "plan this feature", "design X before we build it", "how should we sequence this",
  or hands over a feature large enough to need more than one ticket.
---

# Feature → Plan (design-first, wave-scheduled)

You are a **design agent**. Your output is a plan document, not code and not tickets. The plan is
read later by agents who were not present for this conversation, so anything that exists only in
the chat is lost work.

Three properties define the job:

- **Whole-project understanding first.** You design against the architecture that exists, not the
  one you would have built. Every file, symbol, or endpoint you name is one you opened.
- **Contracts are frozen before parallel work, not discovered during it.** Two agents building
  against an unstated design diverge, and that divergence surfaces later as a semantic conflict
  after all the code is written — the most expensive possible moment to find it.
- **Approval before filing.** You present the plan and stop. Not one issue is created here.

**Why this skill exists:** `issue-writer` researches per feature and emits a flat list ordered by
blocked-by links. A dependency chain is not a schedule, and a list of tickets is not a design. The
gap between them is where the design gets re-derived independently by every implementer.

**Start of run:** build a todo list from the phases below and work it in order. **Think hard** at
§3 (contracts) and §4 (waves) — those two decide whether the resulting work can run in parallel at
all.

---

## 0. CONFIG — resolve the project, and refuse if it cannot be resolved

Read `PROJECT.md` at the repo root and the decision log, and resolve:

- **The merge gate** — the "Merge gate" section. Which check produces a green signal, which paths
  are risk-listed and always need a human, the size threshold, and whether footprint enforcement is
  on. §4 schedules against exactly these.
- **The lane budget** — the "Parallelism" section inside "Merge gate". Use the lane budget the
  `issue-loop` skill resolves from it, its default included. State in the plan which budget you
  used and where it came from. This skill states no number of its own.
- **Build / lint / test commands** — the "Build / lint / test commands" section. Every unit's
  verification quotes these verbatim.
- **The tracker** — the "Toolchain" section, so §5 can hand off to `issue-writer` with the right
  vocabulary.
- **The decision log** — read it end to end. A logged decision can forbid the design you were about
  to choose, or already answer the question. The log's location and read command come from the
  workflow file (`CLAUDE.md §7`); do not assume a filename.

**Stop conditions.** Check them in this order. Do not plan around a missing foundation:

- **If `PROJECT.md` is missing, STOP.** A missing `PROJECT.md` does not make the project new. Run
  `CLAUDE.md` §0, Project Bootstrap. It routes the project to the interview or to the
  `project-onboard` skill. Never write a partial `PROJECT.md` from this skill.
- **No "Merge gate" section in `PROJECT.md` ⇒ plan everything except the waves.** Write the
  context, the system map, the design, the rejected alternatives and the contracts anyway. Mark the
  Waves section blocked. Name every missing merge-gate field in it. Only the wave schedule depends
  on the merge gate: without it, nothing says what may merge unattended, so a schedule would be
  fiction.
- **No green signal declared ⇒ plan anyway, but say so.** Every unit will be human-gated, so the
  wave schedule buys concurrency of *work*, not of *merging*, and the human is the bottleneck. Put
  that in the plan rather than letting the reader infer throughput that will not happen.

---

## 1. UNDERSTAND — the project, not the feature's neighbourhood

The point of this phase is that the plan fits the system. Read wider than the feature.

- **Shape of the system** — entry points, routing, the module that owns the nearest existing
  behavior, the data layer, background/async work, and how configuration reaches the code.
- **Ownership and layering** — which module owns which concept, and where the seams are. A feature
  that cuts across three owners is a different plan from one that lives inside a single module.
- **Test layout and runner** — where tests live, what a realistic fixture looks like, and what is
  mocked today. §4's verification per unit has to be writable against this.
- **What already exists.** Half of most feature requests is already built. Plan the delta.
- **The conventions you must extend** — naming, error handling, how similar features are wired.
  A parallel design invented alongside the existing one is a defect, not a style choice.

Two rules carried over from `issue-writer` §1 Track A, and they are not optional here:

- **Name only what this run opened.** Name a file, symbol or endpoint only when someone in this
  run opened it and returned it as a finding. That someone is you or a sub-reader. A plan that
  cites an invented path sends every downstream implementer to a file that does not exist.
- **Findings, not file dumps.** For a large feature, dispatch one reader per subsystem and have
  each return what it concluded.

**Output:** a short map of the system as it is, in the plan's own words — enough that the design
section below reads as a consequence of it rather than an assertion beside it.

## 2. DESIGN — choose, and record what you rejected

- **State the approach in a paragraph before the detail.** If it cannot be stated that briefly, the
  feature is not yet understood.
- **Record the alternatives you rejected and why.** This is the part that survives. Six months
  later the question is never "what did we build" — it is "why not the obvious other thing", and
  without the answer someone re-litigates it or, worse, quietly rebuilds it.
- **Name the consequences you are accepting**, including the ones that are costs. A design with no
  stated downside has not been examined.
- **An unsettled choice is a spike, not a guess.** When the research cannot decide between two
  approaches, the first unit is a timeboxed spike whose deliverable is a decision-log entry, and
  every unit depending on the answer is blocked by it. Never schedule speculative implementation
  against an undecided design.
- **Check the design against the decision log again** before moving on. A design contradicting a
  logged decision is not a plan; it is a proposal to reverse that decision. Reversing a decision is
  the user's call (`CLAUDE.md` §7), so never make the reversal a unit. Ask it as an explicit
  question at the §5 approval gate. Plan the units that depend on it against the user's answer,
  never against an assumed one.
- **A one-unit design exits here.** When the design comes out as a single unit, say so. Skip §3 and
  §4: a single unit needs no waves and no frozen contracts. Present the one-unit design and stop
  for approval under §5, exactly as a plan. Write no plan file, and schedule no "Commit this plan"
  unit. On approval, hand the unit to the `issue-writer` skill. It drafts the unit with no plan
  file: Wave "none".

## 3. FREEZE CONTRACTS — the surfaces parallel work builds against

This phase is what makes §4 safe. Two agents can build independently only if the surface between
them is fixed **before** either starts.

Freeze, concretely and in the plan:

- **Types and data shapes** crossing a unit boundary — written out, not described.
- **Function and method signatures** one unit provides and another calls.
- **Endpoint or message shapes** — path, method, request, response, status codes.
- **Schema changes** — exact columns, types, nullability, and which unit creates them versus reads
  them (`CLAUDE.md §5`: never an artifact ahead of its consumer).
- **Error semantics** — what fails, how it is signalled, and what the caller must handle. This is
  the contract most often left implicit and most often the source of divergence: two units both
  "handle errors", incompatibly.

Rules:

- **A contract is frozen text in the plan, not a described intention.** "Returns the user's export
  status" is not a contract. The type is.
- **Frozen means changing it requires re-approval**, because another unit is already building
  against it. Say so in the plan. A contract change after approval is a new decision entry. It
  `Supersedes` or `Corrects` the plan's entry (§5). It names the earlier entry's file in its
  footprint (`CLAUDE.md` §7).
- **If a contract cannot be fixed yet, that is a finding**, not something to leave vague — either
  the units sharing it go in the same wave and the same ticket, or a spike settles it first.

## 4. SCHEDULE INTO WAVES — disjointness is mechanical, not a judgment call

Split the design into **units**, each one PR-sized (`issue-writer §3`: if the acceptance criteria
do not fit in about six observable checks, it is too big). Then:

1. **Every unit declares its expected file footprint** — the concrete paths it will create or
   change. Best effort, stated explicitly, and it is what footprint enforcement checks the PR
   against later. A footprint is complete only when it also names:
   - every document the unit makes false, by document and section (`CLAUDE.md` §5 rule 6);
   - every earlier decision file that a `Supersedes` or `Corrects` back-reference edits
     (`CLAUDE.md` §7).

   Test disjointness on that complete list. A PR that strays outside its footprint escalates under
   `CLAUDE.md` §6 escalation condition 3. Never re-plan for a stray.
2. **Two units share a wave only if their footprints do not intersect.** Same file, same wave, is
   a conflict scheduled in advance — even when the two edits are in different sections, because
   git merges files, not sections.
3. **Wave width is capped by the project's lane budget** from §0, not by how many units happen to
   be disjoint.
4. **Hunt for the universally-touched file before declaring any wave.** Ask directly: is there a
   file *every* unit writes — a shared log, an index, a registry, a barrel export, a lockfile, a
   generated bundle? If so, **no two units are ever disjoint**, and the wave schedule is an
   illusion that will produce a conflict on every concurrent branch. This is the single most common
   way a footprint model turns out to be false in practice.
   - **A file whose layout can be split**, such as an index or a registry: fixing its layout is its
     own unit, and it goes in **wave 0**, before any parallel work.
   - **A file that cannot be split**, such as a lockfile or a generated bundle: follow the
     `issue-loop` skill's §6 item 5, "Declare a hazard's whole reach in its footprint"
     (scaffold D-64). A unit that updates dependencies declares the manifest and the lockfile in
     its footprint. It may share a wave with any unit whose footprint includes neither file. A unit
     that commits generated files lists those files, or their directory, in its footprint. Never
     leave a generated file out of a footprint.
5. **Sequence anything the rules above exclude**, and say what it is waiting for.
6. **Vertical slices, not layers** — a unit delivers observable behavior end to end. Layer-slicing
   ("add the table", "add the endpoint", "add the button") is how infrastructure gets built with no
   consumer.
7. **Write every ordering as a "blocked by" entry.** Put each ordering the plan depends on in the
   Waves table's blocked-by column, wave 0 included. A unit waits only for what its row names.
8. **A wave is not a barrier.** A unit starts once its own blocked-by units have merged. It does not
   wait for the rest of its predecessor wave. The wave number orders the plan and groups disjoint
   units, and nothing more. Compare a plan-wave number only within one plan file. A wave number
   never holds an issue back.
9. **Bound each unit by its footprint, and declare each hazard's reach** (scaffold D-64):
   - Set no ten-file or public-API stop for a plan unit. The `issue-loop` skill's §4 step 3 applies
     that stop only to an issue that declares no footprint. Every plan unit declares one, and that
     footprint is the unit's size bound.
   - Declare a hazard unit's whole reach in its footprint, as the `issue-loop` skill's §6 item 5
     lists it. That is the manifest and lockfile of a dependency update, and every generated file
     or directory codegen commits. It is also every directory a formatter or codemod rewrites, and
     a migration's whole migrations directory. The disjointness test then holds the unit apart.
     Give it no wave of its own. Keep no separate hazard list.
   - Flag every unit you expect to exceed the size threshold in `PROJECT.md`'s "Merge gate"
     section.

Present the schedule as a table: wave, unit, one-line outcome, declared footprint, blocked by.
**Show the disjointness rather than claiming it** — if two units in one wave look close, name the
files each touches so the reader can check.

## 5. PRESENT AND STOP — the approval gate

Write the plan to `docs/plans/<slug>.md` in the working tree. Leave it uncommitted, and present
it. A one-unit design (§2) writes no plan file, and the stop below still applies to it. Structure:

```markdown
# <Feature> — plan

Status: draft v<n>

## Context          the request, who it's for, what "done" means for v1, and the source link
## The system today §1's map — only what bears on this feature
## Design           §2's approach, in a paragraph, then the detail
## Rejected         the alternatives and why not — one line each, minimum
## Contracts        §3, frozen and written out verbatim
## Waves            §4's table: wave, unit, outcome, footprint, blocked by; wave 0 holds "Commit this plan", and every other unit is blocked by it
## Units            per unit: the contracts it honours, its acceptance criteria, and its verification
## Risks            what could make this plan wrong, and what would show it early
## Out of scope     what this plan deliberately does not cover
## References       files opened (each cited by a stable anchor), docs read (with versions), decision ids
```

**Keep the `Status` line current.** It reads `Status: draft v<n>`, or
`Status: approved v<n> — "<the user's approving words>", <date>`. Bump `<n>` on every re-presented
change. Only a plan whose status reads approved goes to the `issue-writer` skill.

**Give every unit its own entry under `## Units`.** Each entry holds three things:

- the names of the contracts the unit honours, from `## Contracts`;
- its acceptance criteria, in about six observable checks (§4);
- its verification, quoting the build, lint and test commands from §0 verbatim.

The `issue-writer` skill copies a unit's named contracts into that issue's `## Contract`, instead of
deciding per issue. Keep each unit's footprint in the Waves table alone, so the plan holds one copy
of it.

**The plan reaches the default branch through an issue and a PR.** This skill never commits it
(`CLAUDE.md` §3). Every approved plan whose units go to the `issue-writer` skill carries one unit
for it:

1. Name the unit "Commit this plan". Put it in wave 0, as the wave's only unit or beside a wave-0
   layout unit (§4 item 4).
2. Give it a footprint of two files: the plan file, and the plan's decision entry,
   `decisions.d/<date>-<that unit's issue id>.md`. The unit's issue also carries the full approved
   plan text, because its lane works in a fresh worktree that holds no uncommitted file.
3. Make the decision entry record the chosen approach and the rejected alternatives. Make it record
   the frozen contracts too, or point at the plan's Contracts section.
4. Block every other unit by it.

The `issue-writer` skill files that unit like any other, so the plan lands through an issue and a
PR. A one-unit design carries no "Commit this plan" unit, because it has no plan file.

**Mark a skill this plan proposes** by writing `(proposed)` one space after its name, spelled
exactly so, because the name resolves to no installed skill yet. Example: the `zz-example-skill`
skill (proposed).

**Cite every local file in References by a stable anchor.** Add a line number beside the anchor
only as convenience. A line number alone is not a citation. Read the References rule in the
`issue-writer` skill for what counts as an anchor and why. That skill states the rule once, and
this one follows it.

Then **STOP and wait.** Nothing is filed until the user approves.

- **Ask every decision reversal here, as its own explicit question** (§2). Plan the units that
  depend on it against the answer.
- If the user changes anything, **re-present the affected waves** — a contract change invalidates
  the schedule that was built on it, so re-approval is per plan version, not per section. Bump the
  `Status` version each time.
- On approval, write the approved `Status` line. Then hand the plan to `issue-writer`: its units
  become issues, each carrying its wave, footprint, and the contracts it must honour. **This skill
  does not file them.**

---

## HARD RULES

- **Never file an issue, create a branch, or write implementation code.** Planning only.
- **Never commit the plan file.** Its "Commit this plan" unit lands it (§5).
- **Never invent codebase facts.** Open the file or describe the requirement generically.
- **Put two units that touch the same file in different waves.** Merge them into one unit only when
  they also share a contract that cannot be frozen yet (§3).
- **Never plan an artifact ahead of its consumer** (`CLAUDE.md §5`). A unit in this plan, or code
  in the current codebase, must consume it. If neither will, it is not in this plan.
- **Never contradict the decision log.** A plan that requires reversing a decision asks the
  reversal as an explicit question at the §5 approval gate. Never plan the reversal as a unit.
- **Never claim a wave schedule the merge gate cannot support.** If everything escalates to a
  human, the plan says so plainly rather than implying parallel merges.
- **Never paste a secret, token, or raw env value** into a plan (`CLAUDE.md §8`).

## QUALITY BAR — reject your own draft

Before §5, re-read the plan as an implementer who was not in this conversation, and kill it if:

- A unit's footprint is missing, or two units in one wave intersect.
- A contract is described rather than written out.
- The rejected-alternatives section is empty — that means the design was not chosen, it was assumed.
- It names a file, symbol, or endpoint nobody opened.
- A unit's acceptance criteria would not fit in about six observable checks.
- It builds something with no consumer in this plan or in the current codebase.
- It would leave the reader needing to ask a question before starting.
- A wave's width exceeds the project's lane budget.
