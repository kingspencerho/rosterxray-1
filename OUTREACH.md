# RosterXRay — Outreach Strategy & Agent Research Workflow

## The White Space RosterXRay Owns

Two adjacent categories exist in the fantasy football tool market. The lane between them is empty — and that's where RosterXRay lives.

**A. Exposure/portfolio trackers (crowded, free):**
The Bag Manager, Best Ball Maniacs, Best Ball Exposures, Best Ball Explorer. All quantitative only — exposure %, stack counts, ADP flow. None grade whether a roster is actually good.

**B. AI "rate my team" graders (exist, wrong format):**
Football Guys Rate My Team, Fantasy Football Ranker, RotoTrade, Gridiron.io. All redraft/dynasty — they grade for season-long win/loss. None apply best-ball logic (W15-W17 playoff schedule, QB stacks, bring-backs, ADP-delta value).

**RosterXRay's white space:** AI qualitative grade of a single best-ball roster using best-ball-specific analytics. Nobody is doing this. The framework (stack loops, playoff windows, naked-RB insulation) is the moat.

**Do NOT try to out-build free exposure trackers.** Stay on the qualitative/analytical side. The wedge is "is this build good and WHY" — not "what's my exposure."

---

## Target Communities (Priority Order)

1. **Discord #draft-reviews channels (highest intent, lowest friction)**
   - Spike Week Discord (1,746 members) — has dedicated #draft-reviews, #suggestion-box, #promos
   - Audit every FF server in your sidebar for draft-reviews / rate-my-team / roster-help channels
   - People posting rosters for feedback = exact use case, already happening

2. **r/BestBall + r/UnderdogFantasy**
   - Your exact users, small enough to stand out
   - Search for "rate my roster", "is this good", "grade my build", "draft review"

3. **Best Ball Twitter/X**
   - Screenshot culture — great for the share card + link
   - Quote-tweet posted roster screenshots with a grade

4. **Niche subs** (r/fantasyfootballadvice, r/DynastyFF) — secondary, lower best-ball density

5. **r/fantasyfootball** — listen only, do not self-promo (auto-removed/banned)

---

## The Core Motion (Repeatable Daily Loop)

**Research → Grade → Reply → Track**

For each roster someone posts publicly:
1. Grade it using the RosterXRay framework (or run it through the app)
2. Reply with 2-3 real insights specific to their build
3. Drop the share link as the payoff — "here's the full breakdown"
4. Value first, link second. Always.

**Tag the channel:** before pasting a share link, append `&src=<channel>` (e.g. `&src=discord`, `&src=reddit`, `&src=twitter`) to the copied URL. Vercel Analytics captures the full URL including query string, so this is how you tell which channel actually converts without any extra tooling.

---

## Agent Research Workflow

### What to ask an agent to do:

**Daily scan prompt:**
> "Search Reddit r/BestBall, r/UnderdogFantasy, and r/fantasyfootballadvice for posts from the last 48 hours where someone is asking for a roster grade, posting a draft result, or asking 'is this a good build.' For each post found: give me the subreddit, post title, approximate roster if listed, their specific question, engagement count, and a draft reply I can post that leads with one real analytical insight and ends with the RosterXRay link."

**Player-thread scan prompt:**
> "Search Reddit for recent posts discussing [player name] in a best ball or Underdog context. Find threads where someone is debating whether to draft them or asking about their value. Draft a reply that gives a specific analytical take using the 2026 schedule and role context, and mentions RosterXRay naturally."

**Content angle prompt:**
> "Search Reddit and Twitter for the most commonly debated best ball roster construction questions right now — e.g. 'how many QBs', 'how many TEs', 'which playoff window'. Summarize the top 5 debates with the actual language people are using. This will inform content topics."

### What agents can do:
- Search Reddit across multiple subreddits simultaneously
- Read post content, identify roster builds, extract the specific question
- Draft tailored replies incorporating the RosterXRay framework
- Identify high-engagement threads worth prioritizing
- Surface content angles from community debates

### What you still do:
- Post the actual replies (agents can't authenticate as you)
- Personalize the first line of each reply to their specific roster
- Make the judgment call on tone and platform fit
- Be present in Discord servers (agents can't access private channels)

---

## Response Templates (Personalize First Line Always)

**Discord #draft-reviews reply:**
> "Ran this through a best-ball grader I built (RosterXRay). It flagged [specific real thing — e.g. 'your CIN stack has a dead W15 @CAR'] and liked [specific real thing]. Full breakdown here: [link]. Curious if you agree on [their key decision]."

**Reddit r/BestBall comment:**
> "Solid build. The thing that jumps out: [genuine framework insight — stack loop / ADP value / playoff window]. I made a tool that scores exactly this stuff — here's your roster's grade: [link]. Not trying to spam, happy to explain the [stack/playoff] logic."

**Twitter/X (quote-tweet a posted roster screenshot):**
> "graded this in RosterXRay — [grade]. [one sharp insight]. the W15-17 schedule on [team] is the swing factor: [link]"

---

## Platform Rules (Stay Unbanned)

- Read each server/sub's self-promo rules first. Post tool links in #promos or designated threads; post grades/insights anywhere feedback is wanted.
- Never paste the same canned message twice. Tailor the first line to their actual roster.
- Be a contributor for a few days before promoting. Build recognition first.
- Disclose you built it ("a tool I made"). Honesty plays well; stealth shilling gets you banned.
- r/fantasyfootball = listen only. Never self-promo there.

---

## Content Production Angle (Galaxy Brain Extension)

The agent research workflow produces a secondary asset: **real community language and real debates**.

Use this data to:
- Identify the 3-5 most common best-ball construction mistakes people are making right now (from Reddit posts)
- Write short-form content (Twitter threads, Reddit posts) that addresses those specific mistakes using the RosterXRay framework
- Each piece of content positions the tool as the solution without being promotional

Example: "Saw 12 people this week posting builds with unlooped QBs. Here's why that's a structural ceiling problem and how to fix it: [framework explanation]. RosterXRay scores this automatically — [link]."

This turns outreach research into content, and content into organic traffic.

---

## First-Week Target

Get **10 genuine grades posted across Discord + r/BestBall**, each with a tailored insight + link.
10 real interactions > 100 spammed links.
Track which channel converts to clicks.

---

## Data Currency Note

Player situations, FPA data, schedule data, and defensive EPA are current as of **June 2026**. Re-validate any player verdict older than 30-45 days before citing in a reply. Key flags still active:
- Tyreek Hill: unsigned FA, do not cite as MIA
- Tank Dell: knee injury, HOU WR3 competition ongoing
- AJ Brown: now NE WR1, not PHI
- Brandon Aiyuk: active arrest warrant, availability uncertain
- Josh Jacobs (GB): legal situation, monitor
- Malik Nabers: knee cleanup, W1 uncertain
