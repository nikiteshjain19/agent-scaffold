---
name: feature-plan
description: >-
  Turn a feature request into an approved design before any issue is filed. Understands
  the whole project, chooses an architecture and records the alternatives rejected,
  freezes the shared contracts parallel work builds against, and schedules the work into
  waves whose file footprints are provably disjoint. Produces a durable plan document and
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

- **The merge gate.** Which check produces a green signal, which paths are risk-listed and always
  need a human, **how many lanes may run in parallel**, and whether footprint enforcement is on.
  §4 schedules against exactly these numbers.
- **Build / lint / test commands** — every unit's verification quotes these verbatim.
- **The tracker**, so §5 can hand off to `issue-writer` with the right vocabulary.
- **The decision log** — read it end to end. A logged decision can forbid the design you were about
  to choose, or already answer the question. The log's location and read command come from the
  workflow file (`CLAUDE.md §7`); do not assume a filename.

**Hard stop conditions.** Do not plan around a missing foundation:

- **No merge-gate section in `PROJECT.md` ⇒ STOP.** Name what is missing and say plainly that
  without it there is no way to know what may merge unattended, so a wave schedule would be
  fiction. Waves are only worth building when something can actually land without a human in the
  loop for each one.
- **No `PROJECT.md` at all ⇒ STOP.** This is the bootstrap interview, not a planning problem.
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

- **If you didn't open the file, don't name it.** A plan that cites an invented path sends every
  downstream implementer to a file that does not exist.
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
  logged decision is not a plan; it is a proposal to reverse that decision, and it must say so.

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
  against it. Say so in the plan.
- **If a contract cannot be fixed yet, that is a finding**, not something to leave vague — either
  the units sharing it go in the same wave and the same ticket, or a spike settles it first.

## 4. SCHEDULE INTO WAVES — disjointness is mechanical, not a judgment call

Split the design into **units**, each one PR-sized (`issue-writer §3`: if the acceptance criteria
do not fit in about six observable checks, it is too big). Then:

1. **Every unit declares its expected file footprint** — the concrete paths it will create or
   change. Best effort, stated explicitly, and it is what footprint enforcement checks the PR
   against later.
2. **Two units share a wave only if their footprints do not intersect.** Same file, same wave, is
   a conflict scheduled in advance — even when the two edits are in different sections, because
   git merges files, not sections.
3. **Wave width is capped by the project's lane budget** from §0, not by how many units happen to
   be disjoint.
4. **Hunt for the universally-touched file before declaring any wave.** Ask directly: is there a
   file *every* unit writes — a shared log, an index, a registry, a barrel export, a lockfile, a
   generated bundle? If so, **no two units are ever disjoint**, and the wave schedule is an
   illusion that will produce a conflict on every concurrent branch. Fixing that file's layout is
   its own unit and it goes in **wave 0**, before any parallel work. This is the single most common
   way a footprint model turns out to be false in practice.
5. **Sequence anything the rules above exclude**, and say what it is waiting for.
6. **Vertical slices, not layers** — a unit delivers observable behavior end to end. Layer-slicing
   ("add the table", "add the endpoint", "add the button") is how infrastructure gets built with no
   consumer.

Present the schedule as a table: wave, unit, one-line outcome, declared footprint, blocked by.
**Show the disjointness rather than claiming it** — if two units in one wave look close, name the
files each touches so the reader can check.

## 5. PRESENT AND STOP — the approval gate

Write the plan to `docs/plans/<slug>.md` and present it. Structure:

```markdown
# <Feature> — plan

## Context          the request, who it's for, what "done" means for v1, and the source link
## The system today §1's map — only what bears on this feature
## Design           §2's approach, in a paragraph, then the detail
## Rejected         the alternatives and why not — one line each, minimum
## Contracts        §3, frozen and written out verbatim
## Waves            §4's table: wave, unit, outcome, footprint, blocked by
## Risks            what could make this plan wrong, and what would show it early
## Out of scope     what this plan deliberately does not cover
## References       files opened (each cited by a stable anchor), docs read (with versions), decision ids
```

**Mark a skill this plan proposes.** Write the backticked name, then the word, then the marker:
the `zz-example-skill` skill (proposed). `CLAUDE.md` §12 requires that name form everywhere, and a
plan lands before the pull request that creates the skill. A repository that resolves every skill
name to an installed skill reports the plan's own name, because that name resolves to nothing yet.
The marker says the name is proposed, and a proposal claims no resolution. Keep the spelling exact:
one space, lowercase, in parentheses. Drop the marker once the skill exists.

**Cite every local file in References by a stable anchor.** Add a line number beside the anchor
only as convenience. A line number alone is not a citation. Read the References rule in the
`issue-writer` skill for what counts as an anchor and why. That skill states the rule once, and
this one follows it.

Then **STOP and wait.** Nothing is filed until the user approves.

- If the user changes anything, **re-present the affected waves** — a contract change invalidates
  the schedule that was built on it, so re-approval is per plan version, not per section.
- On approval, hand the plan to `issue-writer`: its units become issues, each carrying its wave,
  footprint, and the contracts it must honour. **This skill does not file them.**

---

## HARD RULES

- **Never file an issue, create a branch, or write implementation code.** Planning only.
- **Never invent codebase facts.** Open the file or describe the requirement generically.
- **Never put two units that touch the same file in one wave.** If it seems necessary, they are
  one unit.
- **Never plan an artifact ahead of its consumer** (`CLAUDE.md §5`). If nothing in the current
  codebase or the same wave will read it, it is not in this plan.
- **Never contradict the decision log.** A plan that requires reversing a decision proposes the
  reversal explicitly, as its first unit.
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
- It builds something with no consumer in the same wave.
- It would leave the reader needing to ask a question before starting.
- The wave count exceeds the project's lane budget.
