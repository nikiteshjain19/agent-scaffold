# Picking up a ticket

Before writing any code, an agent picking up a ticket must, in order:

1. **Read the full ticket** — description, acceptance criteria, and ALL comments (comments
   often contain scope changes that supersede the description).
2. **Check "Blocked by" relations.** If any blocker is not Done, do not start — leave a short
   comment naming the open blocker and pick something else. The one exception is a stacked child
   lane. The `issue-loop` skill dispatches it beside its parent, under the conditions in its
   "WAVE SELECTION" step 5. Its PR stacks on the parent's PR ("Branches and commits").
3. **Check milestone order** ("Dependencies and build order"). Don't pull a later-milestone ticket
   past an open earlier-milestone dependency.
4. **Read the decision log** (`decisions.d/`, "Decision log") — specifically any entry dated after
   the ticket was created, and any entry touching the same area. If a decision contradicts the
   ticket, stop and flag it on the ticket before implementing.
5. **Read `PROJECT.md`** and any architecture doc it points to, so the change fits the
   existing design rather than inventing a parallel one.
6. **Confirm the consumer exists** for anything you're about to build
   ("Dependencies and build order", rule 3).
7. **Plan briefly, then implement** — smallest change that satisfies the acceptance criteria.
   Scope creep goes in a new ticket, not the current branch. File that ticket with the
   `issue-writer` skill ("Tickets"). Justify every line you write (below).
8. **Verify like a skeptic**: run build/lint/tests; for changes applied out-of-band (DB
   migrations, dashboard config, DNS, third-party settings), verify the live system actually
   reflects them — a file existing in the repo does NOT mean the change exists in production.
   Silent-failure APIs (clients that return errors instead of throwing) must have their error
   results checked explicitly.
9. **Open the PR** ("Merge gate") and update the ticket. The ticket is the record of the work:
   comment what shipped, and let the PR link close it ("Tickets").

## Justify every line you write

Rule 7 limits what a change covers. This rule limits what it
carries. Give every line in the diff one of these four reasons:

- the acceptance criteria require it;
- an existing caller needs it;
- a test covers it;
- it repairs a defect the ticket names.

"It might help" is not a reason. Remove a line that has none. These seven shapes have none, and a
reviewer checks the diff for each one ("Merge gate", pre-merge check 1):

1. **A comment that restates its code.** `// increment the counter` above `counter++` says what,
   not why.
2. **A guard against a state the code cannot reach, with no test that exercises it.** A real guard
   has a failure-branch test ("Testing policy", rule 7).
3. **A helper, parameter, option or config key with one caller, or none.** This is
   "Dependencies and build order" rule 3, applied inside a file.
4. **An abstraction for a second case that does not exist yet.**
5. **Code the change replaced, left in place** — a dead branch, a superseded function, or a
   commented-out block.
6. **Error handling that catches and does nothing**, or catches and re-throws unchanged.
7. **A docstring or block comment that restates a signature** the reader can already see.

A line that matches a shape has no reason, unless the acceptance criteria name it explicitly. An
existing caller or a test never outweighs a shape.

**What this rule does not cover:**

- **It is not a line count.** A long diff is fine when every line earns its place.
- **It never covers a guard that has a test.** "Testing policy" rule 3 requires exactly those guards
  on high-stakes paths.
- **It never covers a test.** Tests are part of the change ("Testing policy"). A test that looks
  repetitive is usually correct.
- **It never covers documentation that says more than the code shows.** Shapes 1 and 7 catch only
  restatement.
- **It judges the diff, never the code around it.** Cleaning up neighbouring code is scope creep
  (rule 7).
- **It governs code, never the prose of a document or a skill.** The house style governs prose
  ("Writing style").
