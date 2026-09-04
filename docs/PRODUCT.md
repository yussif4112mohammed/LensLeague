# LensLeague — Product

What this product is for, what it deliberately is not, and what gets built next.
Decisions here are binding on the code; where the two disagree, this file is the
intent and the code is the bug.

Last decided: 2026-09-03.

## The product in one line

A place where photographers put work up, it gets seen and judged by other
photographers, and that reputation turns into paying clients.

## The loop

    DISCOVER -> UPLOAD -> FEED + GALLERY -> AUTOMATIC BATTLE -> VOTE
      -> RESULT -> POINTS -> RECOGNITION -> MONTHLY WRAP -> UPLOAD AGAIN

A photographer uploads once. Everything after that is the platform's job: the
photograph enters the gallery, the feed and the battle queue without being asked
to opt in, and the result is scored server-side.

## The two halves, and the seam between them

LensLeague has a competition side (battles, votes, points, leagues) and a
marketplace side (client search, bookings, inquiries). Today they share a
database and nothing else.

That seam is the most important unbuilt thing in the product. A photographer
does not want points. They want attention, credibility and work. Until battle
performance changes where a photographer appears in client search, the honest
answer to "what am I competing for?" is "nothing", and no amount of scoreboard
design fixes that.

## Decision: no global ranked leaderboard

`/leaderboard` redirects to `/leagues`. The page component is kept and reads
`get_leaderboard` rather than ranking in the browser, so the decision can be
revisited cheaply, but it is not routed.

Reasons, in order of weight:

1. Points buy nothing. A leaderboard is a scoreboard for a game with no prize.
   Fix the prize before designing the scoreboard.
2. Photography is not one axis. Ranking a wedding photographer against a
   wildlife photographer produces a number that means nothing to either.
3. Ladders cement. Within a month the same names hold the top and a newcomer
   opens the page, sees an unreachable wall, and stops uploading.
4. It rewards frequency over craft. Whoever posts most wins.
5. The original spec's instinct — never publicly display losses — was right and
   is retained. `/leagues` gives the winnable version: four recognition tiers,
   per category, no losses shown.

## Build order

Each item ships and works on its own before the next starts. The order is set by
what is actually blocking, not by what is most interesting.

### 1. The Brief  (next)

A weekly themed constraint every photographer shoots to: "golden hour, no sun in
frame", "one colour only", "shot from below knee height". That week's battles are
drawn from Brief entries.

Why first: when the live database was introspected on 2026-09-01 it held **zero
portfolio items**. The problem today is an empty platform, not an unrewarded one.
Constraints are what actually make photographers pick up a camera — the reason
52-week projects and hashtag challenges work — so this is the cheapest reason to
upload. It also fixes the browsing problem: scrolling two hundred interpretations
of one prompt is interesting in a way scrolling two hundred unrelated photographs
is not, which gives non-photographers a reason to open the app.

Builds on the existing `challenges` table.

### 2. The Weekly Cover

One photograph a week becomes the face of the app: the hero of the feed, the
image that appears when anyone shares a LensLeague link, the splash screen. One
winner, resets weekly, always winnable by someone new.

Why second and not first: it is only a prize if winning it means beating real
work. Shipped into an empty app it is a participation trophy. It needs The Brief
in front of it.

The winner will screenshot it themselves, which is the point — it is the
distribution loop as much as the reward.

### 3. Reputation drives client search

Recognition tier becomes an input to `search_users`, so winning in the Portrait
league in Accra puts you higher in front of clients browsing portrait
photographers in Accra.

Why last: it is the most meaningful change in the product — it is the moment
points convert into money — but it needs both sides populated. Ranking
photographers for clients does nothing while there are neither.

### Later, cheap, high leverage

`get_my_wrap` (migration v17) already computes an honest monthly summary. Render
it as a shareable image card — best frame, wins, streak. People post those
unprompted and every post is an advertisement.

## Standing rules

- **Regional before global.** "Best in Accra this month" is winnable and worth
  sharing; "rank 47 globally" is neither. As the platform grows, add rooms rather
  than lengthening one ladder.
- **Never invent a number.** If nothing records it, the screen does not show it.
  This is why the monthly wrap has no profile views, no audience-by-country and
  no rating. An empty space beats a confident lie.
- **Never publicly display losses.**
- **Server-side or it does not count.** Points, results, ranking and eligibility
  are decided in the database. A control that lives in JavaScript is a control an
  attacker skips by calling the API directly.
