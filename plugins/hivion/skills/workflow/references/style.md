# STYLE.md — House documentation style

The documents in this repository are written by agents and read by agents. An ambiguous sentence
here is not a cosmetic problem. It becomes wrong code two steps later, when an agent executes the
instruction one way and a human meant another.

This guide states how to write that prose. It takes its ideas from **ASD-STE100 (Simplified
Technical English)**, the aerospace standard built so that maintenance instructions cannot be
misread. Every rule below is written in our own words, with our own examples. The set is small on
purpose: it covers only the rules that earn their place in a repository of agent instructions.

**This guide is derived from ASD-STE100. It is not conformant with it, and never claims to be.**
Conformance requires the approved-word dictionary, which is licensed and which this repository
does not hold. See [Source and credit](#source-and-credit).

## Scope — where this applies

Read this section before you apply any rule below. The style is not uniform across the
repository, because the documents do not all do the same job.

| Tier | Prose | Rule |
| --- | --- | --- |
| **Required** | Instruction-bearing prose: the numbered steps of a skill, acceptance criteria, and the Instructions section of an issue. | Apply every rule. |
| **Encouraged** | Descriptive prose: `README.md`, `PROJECT.md`, and the explanatory passages of `CLAUDE.md`. | Apply the rules where they do not cost meaning. |
| **Exempt** | The Context, Supersedes, Corrects, and Affects fields of decision-log entries (`decisions.d/*.md`), and any passage whose job is to explain why a decision was made. | Write for the argument, not for the style. |

**Why the exemption exists.** Simplified Technical English is designed for procedures, and it is
deliberately hostile to argument: it wants short sentences, restricted vocabulary, and no
subordinate reasoning. A decision entry has the opposite job. It has to carry the trigger, the
alternatives that were considered, and the reason each one lost, and that reasoning is the
record's entire value. Flattening it into short imperative sentences would destroy the thing the
log exists to preserve.

**Do not "fix" an exempt passage.** A long, subordinate, argumentative sentence in a decision
entry is correct by design. Leave it alone.

This guide applies to new prose and to prose you edit. It does not ask anyone to rewrite an
existing document for compliance.

## The rules

### 1. Keep the sentences short

Keep an instruction sentence to 20 words or fewer. Keep an explanatory sentence to 25 or fewer.

A long sentence hides its own conditions. A reader who must hold four clauses in mind to find the
action will guess at it. A reader who guesses wrong then acts on the guess.

- No: If the checks pass and the issue is still open, and no decision logged since the branch
  was cut affects the change, open the PR and mark it ready.
- Yes: Confirm the checks pass. Confirm the issue is still open. Re-read the decision log for
  entries dated after the branch was cut. Then open the PR.

### 2. Write one instruction per sentence

Give a sentence one action. Split a compound instruction into separate sentences or list items.

Two actions in one sentence produce a half-done step, because a reader who completes the first
action reads the sentence as finished.

- No: Run the lint and link checks and commit the result.
- Yes: Run the lint check. Run the link check. Commit only when both pass.

### 3. Use the imperative for an instruction

Address the reader directly. Name the actor when the sentence is not addressed to the reader.

The passive voice deletes the actor, and an instruction with no actor is an instruction nobody
owns. This is the most expensive failure in the list: an unowned step is the step that gets
skipped.

- No: The tests should be run before the PR is opened.
- Yes: Run the tests before you open the PR.
- Yes: The reviewing agent runs the tests before it opens the PR.

### 4. Keep a procedural paragraph to six sentences

Break a procedure longer than six sentences into a numbered list or into separate paragraphs.

A wall of procedure invites an agent to summarise it, and a summary is where a step disappears.

### 5. Use one term per concept

Pick one word for each thing and keep it. Do not alternate between synonyms for variety.

Prose varies its vocabulary to stay readable. An instruction that varies its vocabulary invents
a distinction the reader then tries to find. If "issue" and "ticket" both appear, an agent has to
decide whether they mean two things.

- Pick `issue` or `ticket`, and use it everywhere in that document.
- Pick `default branch` or `main`, and use it everywhere in that document.
- Introduce a synonym only to define it once: "the default branch (`main`)".

### 6. Prefer the simple present tense

Write in the simple present. Use a perfect or progressive form only when the timing is the point.

- No: The merging agent will have been given an approval before it is merging the PR.
- Yes: The merging agent merges the PR only after the user approves it.

### 7. Keep the articles

Write "the branch", not "branch". Write "an issue", not "issue".

Dropped articles read as telegraphese, and telegraphese hides whether a noun is one specific
thing or any thing of that kind. "Update ticket" and "update the ticket" are not the same
instruction.

### 8. Replace a gerund with a plain verb

Use a plain verb where one exists. Keep a gerund only where it names a thing.

- No: Merging of the PR is done by the reviewing agent after the approving of the diff.
- Yes: The reviewing agent merges the PR after the user approves the diff.
- Fine: `pr-merge-loop` is the merging flow. (Here "merging" names the flow.)

### 9. Use a vertical list for more than three steps

Put a sequence of more than three steps in a numbered list. Put a set of more than three
non-ordered items in a bulleted list.

A list gives each step an address. A reader can point at step 4, and a reviewer can say which
step failed.

### 10. Keep one topic per paragraph

Give a paragraph one subject. Start a new paragraph when the subject changes.

A paragraph that covers two topics gets cited for one of them, and the other is then read as
part of the first.

## What this guide is not

**It is not enforced.** There is no linter rule, no CI job, and no pre-commit hook behind it.
Adding one is deliberately out of scope. The cost of a long sentence is low, and the mechanism
here is not a gate. The agents that write these documents read this file as they generate the
prose, so guidance in context changes the output at its source.

**That mechanism has a real limit, and this section states it rather than hiding it.** A rule
nothing checks is a rule that decays. It holds only while writers actually open this file. That is
why `CLAUDE.md` §9 carries a short summary and a pointer here: `CLAUDE.md` loads into every
session, and this file does not. Expect partial adherence, not compliance. If drift becomes
visible, the cheapest remedy is an advisory note from a reviewing agent, not a blocking check.

**It is not a claim of ASD-STE100 conformance.** It adopts a subset of the ideas. It cannot check
approved-word usage, because that requires the licensed dictionary.

**It is not a mandate to rewrite existing documents.** Apply it to what you write and to what you
edit. A sweeping compliance rewrite is a separate change and needs its own issue.

## Source and credit

The ideas in this guide come from **ASD-STE100, Simplified Technical English**, Issue 9
(January 2025), published by AeroSpace and Defence Industries Association of Europe. The
specification is free to download from <https://www.asd-ste100.org/>.

**The specification is copyrighted, and its terms forbid reproduction in whole or in part
without written authority from ASD.** This guide therefore reproduces none of it. It contains no
rule text from the specification, no part of the approved-word dictionary, and no clause-by-clause
paraphrase of its rule list. What it takes are the underlying ideas: short sentences, one
instruction at a time, the active imperative, and consistent terminology. Each one is restated in
our own words, with examples drawn from this repository. Read the specification itself at the link
above for the original, complete, and authoritative treatment.

Background reading: [Simplified Technical English on
Wikipedia](https://en.wikipedia.org/wiki/Simplified_Technical_English).
