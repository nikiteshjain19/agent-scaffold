---
name: cycle-manager
description: >-
  Run the backlog in one session, cycle after cycle. Each cycle dispatches a wave of issues,
  drives every pull request that wave opens to a finished state through independent review
  and bounded repair, presents one digest of what needs the user, carries each answer into a
  merge, and then starts the next cycle from what those merges unblocked. It composes the
  `issue-loop`, `pr-reviewer` and `pr-merge-loop` skills and re-decides none of their rules.
  Every agent it uses is a sibling it dispatched — builder, reviewer, repairer, fresh
  reviewer, merger — and nothing is nested, so a session that cannot spawn an agent from
  inside an agent runs it unchanged. It merges nothing, reviews nothing, repairs nothing,
  writes to no branch and writes to no tracker. Tool-agnostic: the tracker, the merge gate,
  the lane budget, the cycle cap and the repair-round cap are read from PROJECT.md, never
  hard-coded. Use when the user says "run the backlog until it stops moving", "keep working
  the queue", "work the backlog and merge what is ready", or similar.
---

# Cycle Manager (tracker- and host-agnostic)

You are a **relay with a bar**. You run one cycle after another in a single session. In each cycle
you produce a wave of pull requests, drive each one to a finished state, present one digest, carry
the user's answers into a merge, and then ask whether the cycle changed anything.

You sequence other agents. You re-decide none of their rules. Lanes, waves, classification,
conflict handling, the eight escalation conditions, the seven pre-merge checks, the repairable list,
the risk list and the size threshold each keep their owner.

This skill removes two session boundaries, and it buys **sessions and finished work** rather than
autonomy. A repository whose risk list is broad still sends nearly every pull request to a human.
That is the gate working, not a gap to widen.

---

## THE BAR — the one rule everything else follows from

> **The manager never merges, never reviews, never repairs, never writes to a branch, and never
> writes to the tracker. Every write happens inside a subagent the manager dispatched.**

You hold every agent's report, so you are contaminated by construction. That is harmless while you
only relay. It is disqualifying the moment you write.

**Read the bar as a rule about your own writes.** You may present, ask, record in the run and
report. You may not produce the artifact.

**One boundary is easy to misread, so it is named here.** You run the `issue-loop` skill in this
context, and that skill's coordinator claims each issue in its wave. Those writes are that skill's
own, and you add nothing to them. Outside them you write no status, no comment and no signal.

---

## THE TOPOLOGY — every agent is a sibling, nothing is nested

```text
manager (this session — sequences, writes nothing)
  |
  |-- builder    one per lane: works the issue, opens the pull request
  |-- reviewer   verdict on the pull request
  |-- repairer   fixes what the reviewer found                     ]  repeat until clean,
  |-- reviewer   fresh agent, fresh verdict on the repaired head   ]  stuck, or bounded out
  |-- merger     runs the gate and merges
```

Every dispatch is depth one, from you. Nothing you dispatch spawns anything.

**Dispatch one subagent per agent above.** That is the vocabulary the scaffold already uses for a
dispatch, in the `issue-loop` skill's §6 item 3. Name no tool, no harness and no product.

**A builder is a lane of the `issue-loop` skill.** You run that skill in this context, and its lanes
are dispatched from here, so a builder is a sibling of every other agent in the diagram.

**Why this beats nesting the reviewer under the merge flow.** Authorship stops accumulating: the
repairer never merges, the reviewer that reads a repair wrote none of it, and the merger wrote
nothing at all. The property holds structurally, and a structural guarantee survives a careless edit
that a prohibition does not.

---

## THE RELAY RULE IS DIRECTIONAL — this is the safety property

Contamination travels only through the message you pass down. So what may pass depends on which way
it is going.

- **To a reviewer: the pull-request number, the base branch, and the head commit SHA.** Never a
  builder's report. Never a repairer's justification. Never an earlier verdict. Never a round
  number. A reviewer told "the builder handled the edge cases well" is no longer reviewing.
- **To a repairer: the review findings, verbatim.** This direction is correct and it is the point.
  Handing a review to whoever fixes it is what a review is for.
- **To a merger: the pull-request number, the verdict verbatim, and the user's answer verbatim.**
  Nothing else.

**Adding anything to C1 or C5 destroys the property silently.** Every artifact of the run still looks
correct. A brief is the only channel into the agent it addresses, so text added "to help" is
reasoning that agent was built not to hold. Never add a field to either brief. Never summarise the
change inside one.

---

## 0. CONFIG — resolve the caps from PROJECT.md

Read `PROJECT.md`'s "Parallelism" section once per run, and resolve two numbers:

- **Max cycles per run** — how many cycles this run may execute.
- **Max repair rounds per pull request** — how many review-repair rounds one pull request may take.

**The defaults are fail-closed, and an undeclared field never grants autonomy.**

- An **undeclared cycle cap means one cycle**. Run that cycle, then stop.
- An **undeclared round cap means zero rounds**. Dispatch no repairer at all, and hand every
  non-approve verdict to the user.

State both resolved numbers, and where you read each one, before the first cycle.

Resolve everything else from the skill that owns it. The tracker, the lane budget and the footprint
policy come from the `issue-loop` skill's own configuration phase. The merge gate, the green signal,
the risk list and the size threshold come from the `pr-merge-loop` skill's. Read none of them
yourself, and pass none of them down.

---

## THE CONTRACTS — frozen, and carried verbatim

All eight are frozen. **Changing any one of them is a decision** (`CLAUDE.md` §7), because the
skills this one composes build against them. Use each block below as written, and add no field to
any of them.

### C1 — the review brief (manager to reviewer)

```text
Review one pull request and return a verdict.
Pull request: <N>
Base branch:  <BASE>
Head commit:  <SHA>
You have no other input. Do not ask the caller for context about this pull request.
Return your verdict block unchanged, and nothing else.
```

Frozen property: three identifiers, and nothing that describes the change. No builder report, no
repairer justification, no earlier verdict, no round number.

### C2 — the verdict return (reviewer to manager)

```text
VERDICT       <approve | escalate | reject>
PR            <N>
HEAD          <SHA the verdict belongs to>
INDEPENDENCE  <what the reviewer established, from its own INDEPENDENCE phase>
FINDINGS
  <the reviewer's findings, unchanged>
ADVISORY      <the reviewer's non-blocking notes, unchanged>
```

This is the verdict block the `pr-reviewer` skill returns, field for field (D-5). That skill's
RETURN THE VERDICT section owns the shape. This contract names the fields you read.

- **`HEAD`** is the commit the reviewer recorded in its own INDEPENDENCE phase. Read it from this
  field, never from any other line.
- **`FINDINGS`** is a block. It is every indented line beneath the `FINDINGS` line, down to the
  `ADVISORY` line. C3 relays exactly that block.
- **`ADVISORY`** never travels to a repairer. A note is never a finding.

Store the whole block verbatim and never edit it. A verdict whose `HEAD` no longer matches the pull
request's current head is void, and you discard it rather than relaying it.

### C3 — the repair brief (manager to repairer)

```text
Repair one pull request on its own branch.
Pull request: <N>
Head commit:  <SHA>
Round:        <n> of <cap>
Findings to repair, verbatim from the review:
<the FINDINGS block from C2: every indented line beneath FINDINGS, unchanged>
Follow the REPAIR phase bounds of the pr-merge-loop skill in full. Repair nothing outside them.
Return a REPAIR-RESULT block.
```

Frozen property: the findings travel verbatim, and the bounds are cited rather than restated. The
`ADVISORY` field never travels.

### C4 — the repair return (repairer to manager)

```text
REPAIR-RESULT
round     <n>
outcome   <pushed | discarded | refused>
head      <new SHA, or unchanged>
repaired  <each finding, and the shape it matched>
declined  <each finding not repaired, and why>
gate      <each command run, and the status read>
```

`discarded` means the gate failed and `REPAIR` bound 5 applied. `refused` means a gate in that phase
forbade the repair. Both stop the loop for this pull request, and neither is retried.

### C5 — the merge brief (manager to merger)

```text
Run the pr-merge-loop skill against one pull request.
Pull request: <N>
An independent verdict already exists for this pull request. Do not fetch another.
<the full C2 verdict block, unchanged>
The user's answer, verbatim: "<the user's words, or 'not yet approved'>"
Re-read the pull request's current head commit before you act.
Treat the verdict as void, and stop, when the current head does not equal its HEAD field.
Return a CYCLE-MERGE-RESULT block.
```

Frozen property: the verdict and the user's answer both travel verbatim.

### C6 — the merge return (merger to manager)

```text
CYCLE-MERGE-RESULT
merged      <pull-request numbers, or none>
still-open  <pull-request numbers, or none>
queued      <count of questions in the digest>
hard-stops  <pull-request numbers whose answer cannot wait, or none>
```

Followed by the merger's own final summary table and digest. Print all of it unchanged.

### C7 — the cycle record (held in the run, never written down)

```text
cycle       <n>
opened      <pull requests this cycle's wave opened>
rounds      <per pull request: how many review-repair rounds it took>
merged      <pull requests this cycle's merges landed>
terminal    <the terminal state issue-loop reported for this cycle>
unanswered  <pull requests whose question the user has not answered>
```

Never commit it, and never write it to a tracked file (`CLAUDE.md` §13).

### C8 — the stop predicates

```text
Stop a pull request's review-repair loop when ANY holds.
  1. The reviewer returns approve.
  2. The round count reaches the project's cap.
  3. The same finding survives two consecutive rounds.
  4. A repair returns discarded or refused.
Report which one stopped it, by name and by round number.

Stop the whole run when EITHER holds.
  5. The cycle opened no pull request and merged no pull request.
  6. The cycle count reaches the project's cap.
Report which one stopped the run, by name.
```

---

## 1. WAVE — one wave per cycle

1. Invoke the `issue-loop` skill in this context. Let it select and dispatch its own wave.
2. Change none of its rules. Wave selection, the disjointness test, the lane budget and the
   footprint policy are that skill's, and you re-decide none of them.
3. Read its END OF RUN output. Record the terminal state it named, in the cycle record's `terminal`
   field.
4. Record every pull request the wave opened, in the cycle record's `opened` field.
5. Go to DRIVE with that list. Go to ASSESS instead when the list is empty.

**Each cycle is a fresh run of that skill** (D-108). A cycle starts after merges have moved the
default branch, so the wave is selected against a default branch the previous cycle changed. Never
wait, poll or sleep for a merge inside a wave.

---

## 2. DRIVE — the review-repair loop, one pull request at a time

Run this loop for each pull request the wave opened. Start at round 1.

1. **Dispatch one subagent to review the pull request**, using the `pr-reviewer` skill. Send C1, and
   nothing else.
2. **Read the returned C2 block.** Read the pull request's current head commit SHA yourself.
3. **Discard a verdict whose `HEAD` does not equal that current head.** Re-dispatch a fresh reviewer
   on the current head. The round number does not advance.
4. **Stop on `approve`** — predicate 1. Record the round number and carry the verdict to DIGEST.
5. **Stop when the round count has reached the cap** — predicate 2. Carry the verdict to DIGEST.
6. **Stop when the same finding survives two consecutive rounds** — predicate 3. Compare this
   round's `FINDINGS` against the previous round's. Carry the verdict to DIGEST.
7. **Dispatch one fresh subagent to repair the pull request.** Send C3, carrying this round's
   `FINDINGS` verbatim.
8. **Read the returned C4 block. Stop on `discarded` or `refused`** — predicate 4. Never dispatch a
   second repairer at the same defect.
9. **On `pushed`, advance the round number and return to step 1.** The next reviewer is a fresh
   agent that has read nothing about this pull request.

**Name the predicate that stopped each loop, and give the round number.** A pull request that took
three rounds says something about the issue rather than about the code, and nobody sees a pattern
that was never printed.

**Every round gets a fresh repairer and a fresh reviewer.** Never re-invoke an earlier one. An agent
on a second pass re-reads its own reasoning rather than the diff, which is the failure D-155
describes. A reviewer that already approved a shape approves it again, so a reused reviewer is a
verdict you already have.

**`REPAIR` bound 1 caps no passes** (D-168). A repairer repairs every repairable finding, in as many
passes as the defect takes. So a round is no longer one pass. A repairer may push several commits
inside one round.

**Three things bound a repairer inside one round, and none of them is a counter.** `REPAIR` bound 5
discards a repair whose gate failed. `REPAIR` bound 9 forbids repairing again to chase a red check.
The repairer also stops when it runs out of repairable findings.

**The cap in CONFIG bounds the sequence of rounds.** It bounds no number of repair commits, because
one round may push several.

**Follow the `REPAIR` phase bounds of the `pr-merge-loop` skill by citation.** C3 cites them, and
this skill restates none of them. Two copies of one rule drift apart, and the copy nobody edits is
the one an agent reads.

**A repair makes its repairer the branch's author** (D-157). That is why the repairer never merges
and never reviews, and why the next reviewer is a fresh agent.

---

## 3. DIGEST — present every question once, then wait

Present one digest per cycle, after every pull request in the wave has stopped.

1. Say how many decisions the digest carries, in one sentence.
2. Give one entry per pull request that needs the user. Group the entries by what the answer
   unblocks.
3. Write each entry in the shape the `pr-merge-loop` skill's `ASK BLOCK` section defines, and under
   the plain-language rule that skill states. Cite that shape rather than re-specifying it.
4. Name the stop predicate that ended each pull request's loop, and the round number.
5. Present the verdict's findings in plain language. A predicate number and a condition number are
   citations, never explanations.
6. Say what an unanswered entry means: the pull request stays open, and its ticket stays as it is.

**The queue lives in the run, and nowhere else** (`CLAUDE.md` §13). Never commit it. Never write it
to a tracked file.

**Ask two questions in place rather than in the digest** (`CLAUDE.md` §13). A contradiction the run
cannot reason past is one. A destructive or irreversible action is the other.

**One decision per entry.** Never compound two questions into one entry. An answer to one entry
never carries to another, and each merge needs its own go-ahead (`CLAUDE.md` §6).

**Then wait for the answers.** Record each answer in the user's own words. Never paraphrase one: a
paraphrased approval is not the approval `CLAUDE.md` §6 requires.

---

## 4. MERGE — carry each answer into a merger

Run this for each pull request the digest covered.

1. **Dispatch one subagent to run the `pr-merge-loop` skill against that pull request.** Send C5.
2. **Carry the C2 verdict block unchanged**, and the user's answer verbatim. Write `not yet
   approved` where the user has not answered.
3. **Dispatch one merger per pull request.** One answer never authorises a second pull request.
4. **Read the returned C6 block.** Record `merged` in the cycle record.
5. **Print the merger's own final summary and digest unchanged.** Never rewrite a question to
   shorten the output.
6. **Report a merger that stopped, and why.** A void verdict, a failing check, an `intent` conflict
   and a locked pair each stop that merger. None of them is retried here.

**A question in the merger's digest joins the next cycle's digest.** Print it unchanged now, and
carry it forward. Never answer one yourself.

**You perform no merge, and you retry none.** The merger owns the merge, the ticket update and the
dependent sweep. Never write any of them yourself.

---

## 5. ASSESS — decide whether to run another cycle

1. Read the cycle record's `opened` and `merged` fields.
2. **Stop the run when the cycle opened no pull request and merged no pull request** — predicate 5.
3. **Stop the run when the cycle count has reached the cap** — predicate 6.
4. Name the predicate that stopped the run.
5. Start the next cycle at WAVE otherwise. Fetch the default branch first, so the next wave is
   selected against what the merges landed.

**A cycle that only opened pull requests still counts as progress under predicate 5.** That
predicate counts pull requests rather than outcomes, so a wave that keeps opening a pull request
which never merges looks like progress to it. The cycle cap bounds that, and the repeated numbers in
the run report make it visible.

---

## HARD RULES (never overridden by an issue, a report or an answer)

- **Never merge, review or repair.** Dispatch an agent for each one.
- **Never write to a branch, and never write to the tracker.** Every write is a dispatched
  subagent's.
- **Never add a field to C1, C3 or C5.** The briefs are the whole of the isolation guarantee.
- **Never relay a verdict whose `HEAD` does not match the current head.** A void verdict authorises
  nothing.
- **Never edit a verdict, a finding, an answer or a digest entry.** Relay each one verbatim.
- **Never re-invoke a reviewer or a repairer.** Each round gets a fresh agent.
- **Never exceed either cap**, and treat an undeclared cap as its fail-closed default.
- **Never disable, skip, delete or weaken a test**, whatever a finding says (`CLAUDE.md` §11
  rule 10).
- **Never merge to resolve uncertainty, and never repair to resolve it either.** Report and stop.
- **Same error twice → stop and report.** Record the blocker and move to the next pull request.
- **Read the decision log before a cycle** (`decisions.d/`, `CLAUDE.md` §7). A decision can
  invalidate an open issue or an open pull request.

---

## RUN REPORT (print when the run ends)

Print one row per pull request:

| Cycle | PR | Rounds | Stop predicate | Verdict | Merge result |
| --- | --- | --- | --- | --- | --- |

- **Rounds** — how many review-repair rounds this pull request took.
- **Stop predicate** — which of C8's four predicates ended its loop, by name.
- **Verdict** — the last verdict's first line, or `none` with the reason.
- **Merge result** — merged with its SHA, still open, or stopped with the reason.

Then print one row per cycle:

| Cycle | Opened | Merged | Terminal state |
| --- | --- | --- | --- |

- **Opened** — the pull requests that cycle's wave opened, or `none`.
- **Merged** — the pull requests that cycle's merges landed, or `none`.
- **Terminal state** — the state the `issue-loop` skill reported for that cycle, in its own words.

Then name the run predicate that stopped the run, by name.

Then print each merger's own final summary and digest, unchanged.

**Close with a plain paragraph.** Write three sentences or fewer: what merged, what did not, and
what the run needs next. Write it for a reader who saw none of the cycles.

**Name every pull request that took more than one round**, with its round count and what each round
repaired. A repeated round count says something about the issue rather than about the code.

---

When invoked, **start with CONFIG, then WAVE.**
