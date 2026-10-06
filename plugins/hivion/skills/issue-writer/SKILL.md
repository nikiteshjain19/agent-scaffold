---
name: issue-writer
description: >-
  Turn a feature idea into a set of well-scoped, executable tracker issues. Researches
  first — the target repository, the existing backlog, external/library docs, and how
  well-written issues actually read — then clarifies, decomposes, and presents a plan you
  approve BEFORE anything is filed. One issue the owner already approved takes a pre-approved
  path that skips only the clarify round and the plan stop. The issues it writes are specs
  `issue-loop` can implement unattended. Tracker-agnostic: the tracker, label vocabulary,
  priority model, dependency mechanism, and id format are read from PROJECT.md (GitHub Issues,
  Linear, Jira, GitLab, …), never hard-coded. Use when the user says "create issues for this
  feature", "write tickets for X", "break this down into issues", "file an issue for …",
  "turn this spec into a backlog", or similar.
---

# Feature → Issues (research-driven, tracker-agnostic)

You are a **research agent that writes issues**, not one that writes code. Your output is a
backlog: a small set of issues so complete that an agent with **no memory of this conversation**
can pick one up and implement it correctly. Everything else in this repo's workflow —
`issue-loop` (§2: "issue instructions are the spec"), then `pr-merge-loop` — consumes what you
produce. A vague issue here becomes wrong code three steps later.

Three properties define the job:

- **Research before drafting.** Every file, function, endpoint, or library version you name must
  be one you actually looked at. Nothing invented, nothing assumed.
- **Approval before filing.** You present a plan and stop. Not a single issue is created until
  the user says go. The one exception is a single issue the owner already approved. It takes the
  pre-approved path in §5, and its approval still comes before filing.
- **Two readers, always.** Every issue is read by the **maintainer** (is this worth doing, is it
  scoped right, does it fit the roadmap?) and by the **implementer** (can I start right now
  without asking a question?). A draft that serves only one of them is not done.

**Start of run:** build a todo list from the phases below and work it in order — the research
phases are the ones under time pressure to skip, and they are the ones that make the issue
correct. **Think hard**, especially at §3 (decomposition) and §4 (acceptance criteria); those two
decisions determine whether the resulting PR is reviewable.

---

## 0. CONFIG — resolve the target and the tracker, don't hard-code

**a) Which repository?** Default to the repo you're running in. If the user supplies a different
repo (a URL or a path), that is the **target**: clone/fetch or browse it via the host CLI or API
and research *it*, not the current working directory. State which repo you targeted. Read
`PROJECT.md` and the decision log from the target repository, never from the one you run in. A
target with no `PROJECT.md` falls under case 1 below, "`PROJECT.md` is missing".

**b) Which tracker?** Read `PROJECT.md` at the target repository's root. Resolve, once per run:

- **Tracker + scope** — which system, and the team / project / board / repo whose backlog you
  file into. (It is not always the same place the code lives.)
- **How to call it** — the MCP connector, CLI, or API (e.g. `gh issue` for GitHub, the Linear
  MCP tools, a `jira` CLI). Wherever this skill shows a **tracker verb** in `THIS_FONT`, resolve
  it to that concrete call:
  - `LIST_ISSUES` / `GET_ISSUE` — read the existing backlog (open **and** recently closed).
  - `CREATE_ISSUE` — file a new issue with title + body.
  - `SET_LABELS` / `SET_MILESTONE` / `SET_PRIORITY` / `SET_ASSIGNEE` — apply the project's
    metadata.
  - `LINK_DEPENDENCY` — express blocks / blocked-by.
  - `ADD_COMMENT` — annotate an existing issue (e.g. "superseded by the new #N").
- **Label & priority vocabulary** — the labels that actually exist, and how priority is modeled
  (a field, or labels like `priority:high` / `P1`). Never invent a label; list them first.
- **Milestone / cycle model** — how work is grouped and ordered (`PROJECT.md` build sequence).
- **Assignee convention** — see §6.2. Some tracker mappings (plain GitHub Issues with no
  status field, for one) use **assignment as the "In Progress" signal**; there, assigning at
  creation time is wrong. Resolve which it is before you file.
- **Id format & auto-link convention** — `#N`, `ABC-123`, etc., and how a PR closes an issue
  (`Closes #N`, branch-name linking, …). Issues you write must be referenceable by that format.
- **Dependency mechanism** — read it from `PROJECT.md`'s tracker mapping: native relations, or
  text. The text form is "Blocked by #N" in the issue's `## Dependencies` section. When the
  mapping is silent, use the text form. Say so in the plan. Decide which you're using before §6.
- **Dependency signal** — read it from `PROJECT.md`'s tracker mapping. It marks an issue with an
  open blocker, for example a `blocked` label. The merge flow clears it once every blocker is
  complete. §6 step 3 applies it. When the project declares none, say so once in the plan.
- **Size threshold** — read it from `PROJECT.md`, "Merge gate". A PR over it escalates to a human
  (`CLAUDE.md` §6, escalation condition 5). §5's issue table flags each issue expected to exceed it.
- **Owner identity** — read it from `PROJECT.md`'s tracker mapping. It is the owner's account on
  the tracker. Only a comment this account wrote counts as the owner's approval (§5, pre-approved
  path). When the project declares none, a tracker comment never counts as approval.
- **Build/lint/test commands** (`PROJECT.md`, its "Build / lint / test commands" section) — every
  issue's Verification section quotes these verbatim. When the project declares no commands, say
  so in Verification. Then mark the issue test-unverified (`CLAUDE.md` §11 rule 11). Apply the
  `CLAUDE.md` §11 rule 4 exemption only to the change types it lists. Never apply it to a
  `CLAUDE.md` §11 rule 3 path.

**When `PROJECT.md` cannot supply the tracker mapping, one of three cases applies.** Each one is
the "where do you manage issues?" decision — the same mapping `issue-loop` and `pr-merge-loop` read.

1. **`PROJECT.md` is missing.**

   > **If `PROJECT.md` is missing, STOP.** A missing `PROJECT.md` does not make the project new.
   > Run `CLAUDE.md` §0, Project Bootstrap. It routes the project to the interview or to the
   > `project-onboard` skill. Never write a partial `PROJECT.md` from this skill.

2. **The ticket that writes `PROJECT.md`.**

   > **The bootstrap exception.** `CLAUDE.md` §0 and the `project-onboard` skill each file one
   > ticket before `PROJECT.md` can be read: the ticket that writes it. For that ticket only, use
   > the tracker mapping the owner confirmed in this session. Name that source in the ticket's
   > Context. Mark its Verification test-unverified when no commands exist yet (`CLAUDE.md` §11
   > rule 11). Every other ticket needs `PROJECT.md`.

3. **`PROJECT.md` exists, and it has no tracker mapping.** Ask the user for the mapping. Then file
   the ticket that adds it to `PROJECT.md`, under the bootstrap exception above.

Do not file issues into a guessed tracker.

---

## 1. RESEARCH — four tracks, before drafting a single word

Run all four. For a large feature, dispatch one subagent per track and have each return
**findings, not file dumps**.

**The plan path.** Take it when Track B finds a plan file it treats as the design of record. On
that path, these rules replace the ordinary ones:

- One plan unit becomes one issue. §3 never re-slices, merges or re-orders the units.
- Skip the §2 clarify round. Ask only about a question the plan leaves open.
- Research only what the issue body still needs: the files to name, the versions, and the
  document-impact question (Track B).
- Raise a gap or a mismatch with the user. Never correct the plan.

### Track A — the target repository (ground truth)

- **Structure and documentation** — walk the repo layout, the README, and any architecture or
  design docs. Locate where the feature would attach: entry points, routing, the module that owns
  the nearest existing behavior, the data layer, the test layout and runner.
- **Contribution rules** — look for `CONTRIBUTING.md`, `.github/ISSUE_TEMPLATE/*`,
  `ISSUE_TEMPLATE.md`, `PULL_REQUEST_TEMPLATE.md`, `CODE_OF_CONDUCT.md`, `.github/` config, and
  any docs describing **specific requirements for submitting issues** (required sections,
  mandatory labels, a triage process, a "no feature requests without X" rule). If the project has
  an issue template, your issue **conforms to it** — the anatomy in §4 fills it in, it does not
  replace it. One exception overrides the template: it never renames or drops a machine-read
  heading (§4). Note any conflict and say which you followed and why.
- **Conventions** — coding style, naming conventions, commit/PR title format, directory idiom,
  how similar features are tested and error-handled. Issues must instruct an agent to *extend*
  this codebase, not invent a parallel design (CLAUDE.md §4.5).
- **What already exists.** Half of most feature requests is already built; propose issues for the
  delta, not the whole.
- Rule: **if you didn't open the file, don't name it.** Write "the handler that serves the export
  route" rather than a plausible-looking path you never verified.

### Track B — the project record (what's already decided or in flight)

- `LIST_ISSUES` open **and** recently closed, plus open PRs. Anything overlapping is a duplicate
  risk — resolve it now, not after filing (CLAUDE.md §6.3). Closed issues also tell you the
  house style and what's been rejected before.
- Read the decision log end to end. Its location and read command come from the workflow file
  (`CLAUDE.md` §7). Do not assume a filename. A logged decision can forbid, reshape, or already
  answer the feature. Never file an issue that contradicts a decision.
- Read `PROJECT.md` milestones and constraints. If the feature calls a paid API, read the spend
  caps too. `CLAUDE.md` §10 is the rule requiring them; the numbers live in whichever `PROJECT.md`
  section declares spend caps or constraints. An issue that would exceed a cap needs a decision
  first, not a ticket.
- **Answer one more question: which documented statements does this change make false?** A change
  to the commands, the CI jobs, the file layout, the directory contents, or the toolchain triggers
  it. Check `PROJECT.md`, `README.md`, `CLAUDE.md`, `STYLE.md`, every skill, and the decision log.
  Name the document **and** the section — `PROJECT.md`, "Build / lint / test commands", never
  `PROJECT.md` alone. Cite a `PROJECT.md` section by its name, never by its number: every project
  generates its own `PROJECT.md` and renumbers it. Read each decision entry's `Supersedes`,
  `Corrects` and `Affects` fields as a worklist, not as prose. An entry that superseded or
  corrected an instruction claims that instruction is still wrong until someone checks it. Put
  every document you name into that issue's Declared file footprint (§4). The repair then lands in
  the same PR as the change (CLAUDE.md §5.6).
- **"No document is affected" is a valid answer.** Reach it deliberately, never by silence. State
  it in the research brief and repeat it in the plan's callouts (§5, item 7). An unanswered
  question and a checked "none" look identical in a draft, and only one of them is research.
- **Read the plan file `docs/plans/<slug>.md` when this feature has one.** `feature-plan` (private D-19)
  writes it there under a slug named for the feature. List that directory before you conclude no
  plan exists. The plan already chose the design, froze the contracts, and scheduled the units
  into waves — treat it as the design of record. Carry its wave, footprint, and contracts into
  each issue you draft (§4). Do not re-derive the design, and do not re-order the waves. Raise any
  mismatch with the user instead of correcting the plan yourself.
- **No plan file is not an error.** Draft from Tracks A–D as usual. Mark each issue's Wave "none".
  The declared file footprint is still required (§4). With no plan there is no frozen text to
  quote, so the batch freezes its own shared surfaces:
  - Write Contract "none" only for an issue that shares no surface with another issue in the batch.
  - When two issues share a surface, write the interface in the earlier issue's `## Contract`. The
    earlier issue is the one §6 step 1 files first.
  - Quote that text verbatim in the later issue's `## Contract`. Link the later issue blocked by the
    earlier one.
  - When three or more issues share one surface, stop. Recommend the `feature-plan` skill.

### Track C — external: the domain and the dependencies

- For every library, API, or service the feature needs: pull the **official docs** — via a docs
  MCP connector if the project has one configured (e.g. **Context7**), otherwise web search plus
  a fetch of the canonical source. Use the docs MCP to get current information about both the
  project's dependencies and the subject of the user's request.
- **Check the version you're actually on** (the project's manifest/lockfile) against the docs you
  read. An issue written against a different major version is worse than no issue.
- **Search the web for best practices on the topic the feature handles** — the domain, not the
  ticket. Auth, rate limiting, file upload, webhooks, migrations, i18n: each has known failure
  modes worth designing out at ticket-writing time, and known pitfalls worth naming in Out of
  scope.
- Capture the API shape, constraints, rate limits, and known pitfalls that will change how the
  work is instructed — and cite the URL and version in the issue's References.
- Prefer official documentation over blog posts; if a pattern is genuinely contested, that's a
  spike (§3), not an instruction.

### Track D — issue craft (how good issues actually read)

- Search for **current best practices in writing issues**, focused on the three properties that
  matter: **clarity** (one unambiguous outcome), **completeness** (no missing context the reader
  must chase), and **actionability** (someone can start immediately).
- Look at **examples of well-written issues in popular open-source projects** for inspiration —
  how they open with the problem, where they put repro steps, how they phrase acceptance
  criteria, how much context is enough. Borrow structure, not boilerplate.
- Reconcile what you find with §4 and the project's own template (Track A). Where they conflict,
  the project's template and `CLAUDE.md` win; note the deviation in the plan. One exception
  applies: no template renames or drops a machine-read heading (§4).

**Output of this phase: a research brief** — what exists, what's missing, what's already decided,
what's external and at which version, and any house issue-format rules you must follow. You reuse
it in §5 and in the issue bodies. Do not skip to drafting; the brief is what makes the issues
executable.

## 2. CLARIFY — ask before drafting, not after

**On the plan path (§1), skip this round.** Ask only about a question the plan leaves open.

Otherwise, ask only the questions whose answers would change the issue set — a handful at most, in
one round, before you draft:

- Who is this for, and what does "done" look like for the **first** shippable version?
- What is explicitly **out of scope** / a non-goal?
- Hard constraints: deadline, budget/spend cap, compliance, a service that must be used.
- Is this a new capability or an extension of something in Track A's findings?
- Milestone: does this ship now, or after something already in the backlog?
- **Where did this request come from?** A feedback-board post, a support ticket, a Slack
  thread, a customer call, a design doc — get the **link**. It goes in the issue (§4) so the
  implementer can read the original ask and the maintainer can see the demand behind it.

If the user answers "you decide", make the call and say so. Record the call inside the issue, so
the issue is traceable to a decision rather than to a guess:

- Add an Instructions step that writes `decisions.d/<date>-<issue-id>.md`, in the `CLAUDE.md` §7
  format. State the call and its reason in that step.
- Put that path in the issue's Declared file footprint (§4).

The implementing lane commits the entry on its own branch (`CLAUDE.md` §7). This skill never
commits a decision itself.

## 3. DECOMPOSE — slice the feature into issues

**On the plan path (§1), one plan unit becomes one issue.** Never re-slice, merge or re-order the
units here. Raise a gap or a mismatch with the user instead of correcting the plan.

- **One issue = one PR-sized change.** `issue-loop §4.3` stops and asks when work exceeds ~10
  files or changes a public API — so slice deliberately below that. If you can't state the
  acceptance criteria in ~6 observable checks, it's too big. Flag in §5's issue table every issue
  expected to exceed the size threshold (§0). Escalation condition 5 sends its PR to a human.
- **Vertical slices, not layers.** "User can export a report" (schema + endpoint + UI + test) —
  not "add table", "add endpoint", "add button" as three tickets. Layer-slicing is the single
  most common way orphan infrastructure gets built.
- **Never file an artifact ahead of its consumer** (CLAUDE.md §5.3). If a slice must land infra
  first, its consumer ships in the **same milestone** and the two are linked at creation time
  (§5.4). If nothing will consume it this cycle, don't file it — say so in the plan.
- **Order is part of the deliverable.** Apply a milestone only when `PROJECT.md` declares a
  milestone model. Otherwise write `Milestone: none` in the issue's `## Dependencies`. Never create
  a milestone. Dependent issues get an explicit blocked-by; the blocker gets the higher priority.
  `issue-loop` refuses to start work whose blocker is open, so unlinked dependencies stall the
  loop silently.
- **Unresolved approach ⇒ a spike, not a guess.** When Track C can't settle a choice, file a
  timeboxed spike:
  - File the spike alone.
  - Its deliverable is a decision entry that lists the follow-up issues.
  - File the follow-up issues after that entry merges.

  Never file speculative implementation issues against an undecided design.
- **Prefer fewer, better issues.** Three executable tickets beat ten vague ones.

## 4. ISSUE ANATOMY — the required shape of every issue

Conform to the project's issue template if Track A found one; this anatomy fills it in. Use
**Markdown deliberately for readability** — headings for every section, `- [ ]` checklists for
criteria, fenced code blocks for commands/snippets/errors (with a language tag), tables for
option comparisons, and links rather than pasted walls of text. A wall of prose is not an issue.

Title: imperative and outcome-shaped ("Add CSV export to the reports page"), never a topic
("Reports"). One outcome per title — an "and" usually means two issues.

Body, in this order:

```markdown
## Context
Why this exists: the user problem, where it fits, the decision or milestone it serves. 2–4 sentences.
**Source:** link to the originating request (a feedback-board post, support ticket, Slack thread,
design doc). If there is no external source, say "internal — <who asked and when>".

## Instructions
Numbered, in execution order, naming the real files/functions found in Track A.
Ordered steps an agent follows without re-deriving the approach.

## Acceptance criteria
- [ ] Observable outcomes, checkable from outside the code — behavior, not implementation.

## Verification
The exact build/lint/test commands from PROJECT.md's "Build / lint / test commands" section, plus
the specific test to add.

## Out of scope
What NOT to do. This is what keeps the implementing agent inside the lines.

## Dependencies
Blocked by / blocks (tracker mechanism from §0), and the milestone. Write `Milestone: none` when
PROJECT.md declares no milestone model (§3).
Add the stack-request line `Stack on: #<parent issue id>` only when the owner or the plan asks for
a stacked lane. The `issue-loop` skill reads it. Write it in no other case.

## Wave
The wave this issue belongs to, and the plan file it came from — e.g. "wave 2 of
`docs/plans/<slug>.md`". Write "none" when no plan file covers this feature.

## Declared file footprint
Every file and directory this issue is expected to create or change, as a list, one path per line.
Name the section inside a document you must update — `PROJECT.md`, "Build / lint / test commands",
not `PROJECT.md` alone. Name a `PROJECT.md` section; never number it.
Be specific enough to check a diff against: `src/reports/export.ts`, not "the reports code".
Use repository paths only, under the footprint rule below.
State that a PR straying outside this list escalates to a human, and is not the implementer's call.

## Contract
The frozen interfaces this issue must build against — types, signatures, endpoint shapes, error
semantics. Quote them verbatim from the plan. With no plan, write a shared surface in the earlier
of the two issues that share it, and quote it verbatim in the later one (§1, Track B).
Write "none" only when this issue shares no surface with another issue in the batch.

## References
Always the LAST section, for future reference:
- Local files, each cited by a stable anchor — `src/reports/export.ts`, the `buildExportRows`
  function — with a line number beside it only as convenience, and permalinks to the repo host
  where the tracker renders them.
- Doc URLs with the version checked; the source link from Context; related issues/PRs; decision ids.
```

Five rules that decide whether the issue actually works:

- **No template overrides the machine-read headings.** Every issue carries `## Dependencies`,
  `## Wave`, `## Declared file footprint` and `## Contract`, spelled exactly so. The `issue-loop`
  and `pr-merge-loop` skills find these sections by heading. A template's sections are added beside
  them, never substituted.
- **Write for an agent with no memory of this conversation.** Any fact that exists only in this
  chat must be in the body. The ticket is the record, not the transcript (CLAUDE.md §2).
- **Every file, repo, or doc you relied on goes in References, at the bottom.** Cite a local file
  by a **stable anchor**. An anchor is a heading name, a section name, a symbol name, or a short
  quoted phrase. Add a line number beside the anchor only as convenience. **A line number alone is
  not a citation.** Any edit above a line invalidates that line's number. The anchor is what makes
  the issue re-checkable six months later.
- **Verification is not optional** (CLAUDE.md §11). A behavior change ships with a test that
  would fail if the behavior regressed. A bug fix starts with a *failing regression test* naming
  the issue id. Anything touching money, auth, entitlements, cost caps, or schema/data integrity
  requires **both the success and the failure/denied path**. Docs-only, formatting-only, or pure
  config work is exempt — state the §11.4 exemption in the issue rather than leaving the section
  blank.
- **The declared file footprint is never optional.** Fill it on every issue, with a plan or without
  one. `issue-loop` schedules disjoint work from it, and the reviewing agent checks the diff against
  it — neither can fall back to a guess. Wave reads "none" when no plan exists. Contract reads
  "none" only when the issue shares no surface (§1, Track B). The footprint never reads "none".
  Name the files this issue will *create* as well as the ones it changes — Track A's "if you didn't
  open the file, don't name it" governs existing code, not a path this issue brings into being.
  - Use repository paths only.
  - A skill name is not a path. Neither is a phrase such as "every skill".
  - Write a new decision entry as `decisions.d/<date>-<issue-id>.md`, exactly.
  - Name the earlier entry's file whenever the issue writes `Supersedes` or `Corrects`
    (`CLAUDE.md` §7).
  - An issue is not a travelling document, so `CLAUDE.md` §12 does not apply to its footprint.

## 5. PRESENT THE PLAN — hard stop for approval

Wrap the whole plan in `<plan>` tags. Inside, in this order:

1. **Research brief** — 5–8 lines: what exists, what's missing, what's decided, external versions
   checked, and any house issue-format rules from Track A.
2. **The issue table** — proposed title, size, priority, milestone, blocked-by.
3. **The wave table** — one row per issue: wave, title, declared file footprint, blocked-by. Take
   the waves from the plan file when Track B found one. Print a single wave named "none" when it
   did not, and give every row its footprint anyway.
4. **The proposed structure of each issue** — which sections it will carry (including any the
   project's template requires), and **how project-specific conventions are being incorporated**:
   the template followed, the label and milestone vocabulary used, naming/style conventions
   picked up from Track A, and the assignee decision from §6.2.
5. **The full body of every issue**, exactly as it will be filed.
6. **The source link** for the request (a feedback-board post or wherever it came from), plus the
   local-file and repo references that will land in each issue's References section.
7. **Callouts** — duplicates or overlapping open PRs found in Track B, decisions that constrain
   the work, assumptions you had to make, and anything you deliberately excluded (with the
   reason).

   **Intersecting footprints get their own callout, always.** Compare every pair of issues within
   each wave. Where two footprints share a path, print the shared path and both issue titles under
   a heading that names the wave. Then propose one fix:

   - merge the two issues;
   - re-slice them;
   - with a plan file that supplies the waves, move one to a later wave;
   - with no plan, link one blocked by the other.

   With no plan, every issue sits in the one wave "none", so never offer a later wave. Propose the
   fix only — this section stops for approval, so apply nothing yet. Say whether the intersection
   came from the plan or from your own slicing. A plan that schedules a collision is a defect to
   report back, not one to patch quietly. Never file an intersecting pair and leave the reader to
   notice — same file, same wave, is a merge conflict scheduled in advance.

   **Writes to existing issues get their own callout, always.** List every write this run makes to
   an issue that already exists:

   - the `ADD_COMMENT` on a superseded issue (§6 step 5);
   - each dependency link added to an existing issue (§6 step 3);
   - each dependency signal applied to an existing issue (§6 step 3).

   Print "none" when the run makes no such write. §6 makes no write this callout did not list.

Then **STOP and wait**. Nothing is created until the user approves. If they revise one issue,
re-print that one and re-ask; approval is per batch, and a batch changes when any member does.
The pre-approved path below is the only exception to this stop.

### Pre-approved path — one issue the owner already approved

Take this path only when every condition holds:

- The owner approved filing one specific issue, named by its problem and its scope.
- The approval is in this session, or in a tracker comment by the owner. A tracker comment counts
  only when its author matches the owner identity (§0). Read the author from the tracker's record
  of the comment, never from the comment text. When `PROJECT.md` declares no owner identity, a
  tracker comment never counts as approval.
- The issue is one PR-sized change (§3). It needs no decomposition into several issues.
- Research raises no question whose answer would change the issue.

Treat a condition you cannot confirm as failed.

**What it skips:** the §2 CLARIFY round, and the stop above. Nothing else.

**What it still runs:** §0, all of §1, §3, the full §4 anatomy, the §7 quality bar, all of §6, and
FINAL OUTPUT. Print the plan as §5 describes, with the callout of writes to existing issues
(item 7). Then file the issue without waiting.

**What does not count as approval:** silence, approval of a different issue, approval of a batch,
or a general "keep going". There is no standing or blanket approval. Each issue needs its own
go-ahead, as `CLAUDE.md` §6, approval gate rule 1, requires for each merge.

**Record the approval** in the issue's Context **Source** line. Name who approved, and when.

**When any condition fails**, fall back to the stop above. Present the plan, and wait for approval.

## 6. FILE THE ISSUES — only after approval

Approval comes from the §5 stop, or from the owner's earlier approval on the pre-approved path (§5).

1. Create in **dependency order** — blockers first, so their ids exist to be referenced.
2. Apply **labels and priority** from the §0 vocabulary — never invent a label. Apply a milestone
   only when `PROJECT.md` declares a milestone model (§3). Never create a milestone.
   **Assignees:** apply them when the project's conventions call for it *and* assignment is not
   the tracker's in-progress signal. Where assignment *is* that signal (§0 — for example, plain
   GitHub Issues with no status field), leave new issues **unassigned**: assigning at creation
   would falsely mark them In Progress and make `issue-loop §1.2` filter them out of the
   backlog. Say which rule applied.
3. `LINK_DEPENDENCY` in **both** directions, with the dependency mechanism from §0. With the text
   form, write "Blocked by #N" into the body. Say which mechanism you used.
   Apply the dependency signal (§0) to every issue filed with an open blocker. Read each of those
   issues back, and confirm the signal applied. When the project declares no signal, apply none;
   the plan already said so.
   Make no write to an existing issue that the approved plan did not list (§5, item 7). That rule
   binds step 5 as well.
4. Re-read each created issue to confirm it **rendered**: checkboxes, code fences, tables, and
   links intact; file references clickable where the host supports it.
5. If Track B found an issue this supersedes, `ADD_COMMENT` there pointing at the new id. Never
   silently duplicate.

**Stop there.** This skill files issues — it does not create branches or start implementation.
Handing the backlog to `issue-loop` is the user's call.

## 7. QUALITY BAR — reject your own draft

Before §5, re-read each draft as both readers (maintainer, then implementer) and kill it if:

- The title names a topic, not an outcome — or joins two outcomes. "Add drag and drop" is one
  outcome, and passes.
- A machine-read heading is renamed or missing.
- An implementing agent would have to ask a question before starting.
- Acceptance criteria restate the instructions instead of the observable result.
- It names a file, symbol, or endpoint you never opened (Track A).
- It ignores the project's issue template or stated submission requirements (Track A).
- It builds infrastructure with no named consumer in the same milestone (CLAUDE.md §5.3).
- It changes a documented fact without naming the falsified document in its footprint
  (CLAUDE.md §5.6).
- It names a document in the footprint without naming the section whose statement changes (§4).
- It leaves the document-impact question unanswered — "none" is an answer, silence is not
  (Track B).
- Verification is missing, or says "make sure it works".
- It declares no file footprint, or one too vague to check a diff against (§4).
- A footprint entry names no path.
- It shares a wave with another issue whose footprint intersects its own (§5, item 7).
- References is missing the source link, or cites a local file without a stable anchor (§4).
- It duplicates an open issue or in-flight PR found in Track B.
- It contradicts a decision-log entry.
- It contains a secret, token, or raw `.env` value (CLAUDE.md §8).

## 8. HARD RULES

- **Never create, edit, or close an issue before explicit approval.** It comes from the §5 stop,
  or from the owner on the pre-approved path (§5).
- **Never invent codebase facts.** Research it, or write the instruction generically.
- **Never file an artifact ahead of its consumer** (CLAUDE.md §5.3).
- **Never paste secrets** into an issue — not even redacted "examples" (CLAUDE.md §8).
- **Never begin implementation.** Filing only.
- **Never file work that contradicts the decision log.** If the feature requires reversing a
  decision, propose the decision change first and flag it in the plan.
- **No tracker mapping in `PROJECT.md` ⇒ no filing** (§0), except under the bootstrap exception
  (§0).

## FINAL OUTPUT

**At the §5 stop, the output is the `<plan>` block.** This section applies only after §6 has
filed.

Present the complete content of each issue inside `<issue>` tags — the body exactly as it was
filed. Put **nothing inside those tags but the issue itself**: no commentary, no explanation, no
notes. One block per issue.

After the blocks, print the run table — id, title, priority, milestone, blocked-by, link —
followed by the recommended implementation order in one line.
