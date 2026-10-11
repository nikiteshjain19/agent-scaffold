# Escalation queue

Collect the questions, then ask once.

Record the question when you need an answer from the user. Then keep working. Ask at the end of
the run, in one digest. Asking per item costs the user one return trip per question, and a run
over ten items costs ten.

**Every entry records five things:**

1. The item it belongs to — the ticket or the PR, by id.
2. The one question the user has to answer.
3. What you already tried, if anything, so the user is never asked to repeat it.
4. The options, each with what that answer causes. Put the recommended one first, with its reason.
5. What stays blocked until the answer arrives, by id.

Write the entry in the shape of the ASK block the `pr-merge-loop` skill defines, and in the plain
language that skill requires. Cite that shape. Never re-specify it here.

**Two questions never wait for the digest.** Ask each one in place, the moment you reach it:

- **A contradiction the run cannot reason past** — two items that undo each other, a locked pair
  above all. Both items stay blocked until the user rules. A run that acts on either one is acting
  on a state it cannot read.
- **A destructive or irreversible action** — closing a PR or a ticket, deleting a branch, dropping
  data. Confirm the item by id with the user first, every time.

Queue every question whose answer affects one item alone. Such a question never blocks the run.
Ask a question about the run itself in place — the order the run works in, above all — because no
single item carries it. A skill may answer one itself when every option only changes which agent
runs next, or only when it dispatches that agent. Today only the `cycle-manager` skill does, under
its RUN-ORDER QUESTIONS section.

**The queue lives in the run, and nowhere else.** Never commit it. Never write it to a tracked file.
A committed queue outlives the run that built it, and the copy left behind is the one that goes
stale. The durable record already exists: the question is a comment on the item, and the item
carries whatever input-needed signal `PROJECT.md` declares. A later agent that "improves" the queue
into a tracked file rebuilds exactly the stale state this rule removes. "Writing style" refuses a
work log for the same reason.

**Present one digest at the end of the run.** Group the entries by what the answer unblocks. Give
each entry one decision. Never compound two questions into one entry.

**An answer maps back to its item.** Apply it to the item that entry names. Then continue that
item's flow from the point where it queued. An answer to one entry never carries to another
("Merge gate"). Re-present an entry whose item changed while the run continued, because an approval
expires with the diff it was given for ("Merge gate").
