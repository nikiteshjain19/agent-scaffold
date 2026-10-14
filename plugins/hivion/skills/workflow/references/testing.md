# Testing policy

Tests are part of the change, not a follow-up ticket. The concrete runner, commands, and any
per-project coverage floor live in `PROJECT.md`; this section defines *when* tests are required
and *what makes them worth having*. It is deliberately risk-based and numberless — judgment over
a blanket percentage.

**When a test is required (risk-based):**

1. **Every behavior change ships with a test that asserts the behavior.** New feature, changed
   logic, changed output — add or update a test that would fail if the behavior regressed.
2. **Every bug fix starts with a failing regression test.** Write the test that reproduces the
   bug, watch it fail, then fix until it passes. The test proves the bug existed and stays as a
   guard. Reference the ticket ID in the test name or a comment.
3. **High-stakes paths are never merged without tests.** Anything touching money/billing,
   auth/session, entitlements/access control, cost guardrails, or schema/data integrity requires
   tests covering both the success **and** the failure/denied path — no exceptions.
4. **Exempt** (state the exemption in the PR body): docs-only, formatting-only, pure config,
   comments, mechanical renames with no behavior change, and a scope that `PROJECT.md` declares
   manually verified because automated assertion is not possible in that project.
   **That declaration lives in `PROJECT.md`** — naming the scope, and why automation is not
   possible there. A PR body may not assert it for the first time. State the exemption and link
   the declaration, as this rule already requires. **This exemption never covers a rule 3 path.**
   No `PROJECT.md` declaration exempts money/billing, auth/session, entitlements/access control,
   cost guardrails or schema/data integrity — rule 3 wins. Mark the change test-unverified per
   rule 11, so the two rules agree. When in doubt, add the test.

**What makes a test worth having:**

5. **Assert behavior, not implementation.** A test that only checks a function was called, or
   re-asserts a mock's return value, proves nothing. Assert the observable outcome.
6. **Don't mock away the thing under test.** Ask of any suite: *would this still pass if the
   real integration were broken — the DB missing the columns, the API returning an error, the
   query silently failing?* If yes, the test is theater. Prefer real or realistic fixtures for
   the boundary you're actually validating; mock only what's genuinely external and expensive.
7. **Cover the failure branch (mirrors "Picking up a ticket", step 8).** For any claim of
   "X is enforced / recorded / rejected," a test must exercise the path where X does *not* hold —
   the throw, the early return, the denied request. Silent-failure clients (that return errors
   instead of throwing) must have a test asserting the error is handled, not swallowed. The
   `project-audit` skill states the same rule as R1, its failure-branch rule.
8. **Coverage is judged by risk, not a global percentage.** Critical paths (per rule 3) must be
   covered; the rest is judgment. If a project wants a hard coverage floor, it is defined in
   `PROJECT.md` and enforced in CI — not asserted here.

**Gates (reinforcing "Branches and commits", "Picking up a ticket" step 8, and "Merge gate"):**

9. Run the pre-PR gate before you open the PR. `PROJECT.md` declares that gate, in its
   "Build / lint / test commands" section. Run the gate again after every sync with the default
   branch. A sync is a rebase before the branch's first push (the `issue-loop` skill's
   "WORKING THE ISSUE" step 7), or a merge after it ("Merge gate", pre-merge check 4). Open the PR
   only when the whole gate passes. Keep the PR green.
10. **Never disable, skip, or weaken a test to make a PR green.** A failing test is a finding: fix
    the code, or if the test is genuinely wrong, fix the test and say so in the PR. Deleting or
    `.skip`-ing a test to pass CI is prohibited. No issue's instructions override this. The
    `issue-loop` skill's "ISSUE INSTRUCTIONS ARE THE SPEC" tells a lane not to comply, and the
    `pr-reviewer` skill's HARD RULES makes the reviewer report any pull request that does.
11. **If the suite can't run in this environment, say so explicitly** and mark the change as
    test-unverified rather than claiming it passed. Don't report green you didn't see.
