# Spec: The Brief

Status: proposed, not built. Decided 2026-09-03. See docs/PRODUCT.md for why
this is first.

## Problem

The live database holds zero portfolio items. Every downstream system — battles,
points, recognition, the monthly wrap — is correct and idle, because nothing is
being uploaded. Upload is currently an open-ended invitation ("post a
photograph"), and an open-ended invitation is the easiest thing in the world to
postpone.

## The idea

Each week the platform sets one constraint. Everyone shoots to it.

> **This week:** golden hour, and the sun is not in the frame.

A constraint does two things a blank upload box cannot. It removes the hardest
decision (what to shoot), and it makes the results comparable — two hundred
answers to the same question is worth scrolling, where two hundred unrelated
photographs is not.

## Goals

- A photographer who opens the app has a specific thing to go and shoot today.
- The battle queue fills, so the engine built in v15 has something to do.
- A non-photographer has a reason to browse and vote.

## Non-goals

- Not a second competition. The Brief feeds the existing battle system; it does
  not score separately, and it awards no points of its own.
- No prizes, no jury, no editor's pick. That is The Weekly Cover, which comes
  after this and is deliberately not bundled into it.
- Photographers cannot propose briefs. The set is platform-controlled, for the
  same reason categories are: an uncontrolled list becomes a taxonomy nobody
  maintains.

## Data

    briefs
      id            uuid pk
      title         text        -- "Golden hour, no sun"
      prompt        text        -- the full constraint, one or two sentences
      category_id   uuid null   -- optional: scope a brief to one category
      opens_at      timestamptz
      closes_at     timestamptz
      created_by    uuid        -- staff only
      created_at    timestamptz

    brief_entries
      brief_id      uuid
      item_id       uuid        -- portfolio_items
      user_id       uuid
      created_at    timestamptz
      primary key (brief_id, item_id)

Rules that live in the database, not the client:

- One open brief at a time. Enforced by a partial unique index on the open
  window, so two overlapping briefs cannot exist even if inserted by hand.
- A photographer may enter at most **three** photographs per brief. Enough to
  try more than one idea, few enough that flooding is not a strategy.
- An entry must be a photograph uploaded during the brief window. This is the
  whole point — the constraint is meant to make someone go and shoot, not to
  make them search their archive. Enforced against `portfolio_items.created_at`.
- Entering is what queues the photograph for battle, through the existing
  `queue_portfolio_item_for_battle`. No second queueing path.

## Lifecycle

    opens_at ──────────── shooting + entering ──────────── closes_at
                                  │
                                  └── entries queue for battle as they arrive

Battles run on the v15 rules unchanged: 24-hour time box, early exit once
decided, ties finish as ties. A brief closing does not close its battles; they
finish on their own clock. This matters — a photograph entered an hour before
`closes_at` still gets its full 24 hours.

Matching preference: pair entries from the same brief against each other where
possible, falling back to the normal queue. Two answers to the same constraint
is a fair comparison; a golden-hour frame against an unrelated street photograph
is not.

## RPCs

- `get_current_brief()` — the open brief, its window, and the caller's own entry
  count. One call, so the upload screen and the brief screen cannot disagree.
- `enter_brief(item_id)` — validates ownership, the window, the upload date and
  the three-entry cap, inserts the entry and queues the photograph. Security
  definer, search_path pinned, caller checked. All four rules server-side.
- `get_brief_entries(brief_id, limit, cursor)` — paginated, for the gallery.

## Screens

**The Brief (new).** The constraint, large, as the first thing on the page. Time
remaining. A grid of entries. A clear call to action that changes state: *Shoot
this* before you have entered, *Add another (2 left)* after, *You're in* at the
cap.

**Upload.** If a brief is open and the photograph qualifies, offer entry inline
with a single toggle, defaulted **on**. Do not make this a separate journey — an
extra screen is where the intent dies.

**Feed.** One card at the top while a brief is open, showing the constraint and
the entry count. It disappears when the brief closes rather than lingering as a
stale prompt.

## Edge cases worth deciding now

- **No open brief.** The screen shows the last one, its winning-adjacent entries,
  and when the next opens. Never an empty page.
- **Nobody enters.** The brief closes with whatever it got. No retry, no
  extension — a brief that flopped is information about the prompt.
- **A photograph is deleted after entry.** The entry goes with it. A battle
  already running on it is voided under the existing zero-vote path, which
  requeues rather than scoring anyone.
- **Two entries from one person meet in a battle.** Prevent at matching. Self
  versus self is already blocked from voting, so such a battle can never resolve
  honestly.

## How we know it worked

Uploads per active photographer per week, before and after. Nothing else. Not
entries, not votes, not time on page — the point of this feature is to make
people shoot, and if that number does not move it did not work regardless of
what the other numbers say.

## Build order

1. `migration_v20_briefs.sql` — tables, indexes, RLS, the three RPCs.
2. `VERIFY_v20.sql` — every rule above asserted against the live database.
3. Seed one real brief by hand and enter a photograph through the RPC before any
   UI exists.
4. The Brief screen, then the Upload toggle, then the Feed card.
