#!/usr/bin/env python3
"""matchup-brief.py — the twelve questions he actually asks on a Sunday morning,
answered for one game, in his order.

WHY THIS EXISTS, and it is the first thing in this app built that way.
---------------------------------------------------------------------
Every other instrument here was designed from the codebase outward. This one was
designed from a real user's decision procedure inward. On Sep 13 2026 he wrote
down what goes through his head making sit/start calls:

    "whose o line is better, how often they run and pass, what defensive schemes
     does a certain team run, what players does the opposing team have that could
     possibly counter that scheme, weaknesses that a certain teams defense has
     (like giving up the deep ball for example), and if the opposing team has
     players who stretch the field to exploit those holes"

Those are questions 1-6. Questions 7-12 are the ones the measured data says he is
overlooking — usage, role change, dud rate, implied total, QB rushing, and his own
Breakout Watch. Both sets live in USER-PERSONAS.md under P3.

⛔ WHAT IT DOES NOT DO: pick a side, rank the players, or tell him who to start.
The not-for list in USER-PERSONAS.md governs — "it names flaws and describes
players; the pick stays the user's." This prints the inputs and leaves the
contradictions standing, because two true facts pointing opposite ways is a
better input to his judgement than a verdict is.

⭐ THE RULE THAT UNLOCKS THE SCHEME DATA. The app WITHHOLDS coverage splits from
the AI because they measured r=0.161 year over year. That rule protects THE GRADE
from inputs that do not repeat. It does not make the data useless here, because a
scheme read is DESCRIPTIVE — what did this defence do — and description is exactly
what questions 3 and 4 need. Withheld from SCORING is not unavailable to a READER.

⛔ TWO GAPS PRINT AS GAPS, they are never silently omitted (the silent-drop rule):
  Q3  no defence-side scheme profile exists. coverage_2025 is man rate FACED BY A
      RECEIVER, which is an offence-side measurement wearing a defensive name.
  Q5  no defence-side split by ROUTE DEPTH. teamtrends gives run-vs-pass EPA and
      the funnel, and nothing about the deep ball specifically.
  Both share one root cause: rich offence-side player data, team-level defensive
  EPA, and no defence-side positional profile. FPA is the nearest thing and it is
  rank 5 of 5.

⚠️ FPA IS RAW, NOT SCHEDULE-ADJUSTED. A defence that drew Kelce, Bowers and
LaPorta looks soft at TE for reasons unrelated to the defence. Stated inline.

USAGE
    python scripts/matchup-brief.py DAL NYG
    python scripts/matchup-brief.py --slate          # every priced game, one line each
    python scripts/matchup-brief.py DAL NYG --json
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(os.path.dirname(HERE), "grading", "data")


def load(name):
    """Missing file is a stated gap, never a crash — this runs mid-season while
    layers are still filling in."""
    try:
        with open(os.path.join(DATA, name), encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return None


def sub(d, *path):
    for k in path:
        if not isinstance(d, dict):
            return None
        d = d.get(k)
    return d


def num(d, key, default=0.0):
    """⛔ `.get(key, default)` DOES NOT COVER A KEY THAT EXISTS HOLDING None, and these
    feeds are full of nulls — Sleeper leaves depth fields null, and player_metrics
    carries None for a metric a player has no sample for. Every numeric read goes
    through here. Found by --selftest, twice, in two different functions."""
    v = (d or {}).get(key)
    return default if v is None else v


def txt(d, key, default="?"):
    v = (d or {}).get(key)
    return default if v is None else v


# ---------------------------------------------------------------- data access
GE = load("gameenv_2026.json")
TT25 = load("teamtrends_2025.json")
TT26 = load("teamtrends_2026.json")
OL = load("oline_2026.json")
NGS = load("ngs_receiving_2025.json")
COV = load("coverage_2025.json")
MET = load("player_metrics_2025.json")
QB = load("qb_profile_2025.json")
ST = load("status_2026.json")
PC = load("play_caller_2026.json")


# ⛔⛔ THE FEEDS DISAGREE ON TWO TEAMS, AND THE DISAGREEMENT IS NOT ONE-SIDED.
# MEASURED Sep 13 2026 across the eight files this script reads:
#
#   WAS   teamtrends · oline · ngs · status · player_metrics · qb_profile
#   WSH   gameenv ONLY (it comes from ESPN, which spells it WSH)
#   LA    teamtrends · player_metrics · qb_profile
#   LAR   oline · ngs · status · gameenv
#
# So there is NO single canonical code that works everywhere, and that is why
# this is a spelling SET per lookup rather than one normalise-on-input call.
# Normalising toward one code was the wrong fix for the same bug in App.jsx on
# Sep 11 — it changed nothing, because the table it normalised toward was the
# one keyed the other way.
#
# ⚠️ THE FAILURE WAS SILENT IN BOTH DIRECTIONS: `matchup-brief.py WSH PHI` found
# the game and then printed "no team trends on file / no QB profile on file /
# no injury designations on file" for a team the app has full data on, while
# `matchup-brief.py WAS PHI` could not find the game at all. Nothing errored.
TEAM_SPELLINGS = {
    "WAS": ("WAS", "WSH"), "WSH": ("WSH", "WAS"),
    "LA": ("LA", "LAR"), "LAR": ("LAR", "LA"),
}


def alts(team):
    """Every spelling this team is filed under, the given one first."""
    return TEAM_SPELLINGS.get(team, (team,))


def sub_team(d, subkey, team):
    """sub(d, subkey, <team>) over every spelling. First hit wins."""
    for t in alts(team):
        hit = sub(d, subkey, t)
        if hit:
            return hit
    return None


def is_team(row_team, team):
    """Does this player row belong to `team`, under any spelling?"""
    return row_team in alts(team)


def trends(team):
    """2026 first, 2025 as the stated fallback. NEVER silently mixed — the caller
    prints which vintage it got, because a 2026 label over 2025 numbers is the
    stale-data trap wearing a date."""
    cur = sub_team(TT26, "teams", team)
    if cur and num(cur,"games") >= 4:
        return cur, "2026"
    return sub_team(TT25, "teams", team), "2025"


def game_for(away, home):
    """Matches on any spelling of either side, so `WAS PHI` and `WSH PHI` both
    resolve the one game ESPN files under WSH."""
    for g in (sub(GE, "games") or []):
        if is_team(g.get("away"), away) and is_team(g.get("home"), home):
            return g
    return None


# ==========================================================================
# WHO PLAYS WHERE IN 2026
#
# THE 2025 FILES CARRY THE TEAM A PLAYER *PLAYED FOR*, NOT THE ONE HE IS ON NOW.
# Filtering them by team answers "who produced for this team last year", which is
# not the question a matchup brief asks. MEASURED Sep 13 2026 against the live
# feed: 24 of 120 NGS receivers (20%), 26 of 127 coverage rows, 5 of 41 QBs.
#
# IT FAILED IN BOTH DIRECTIONS, and the second one is the silent half:
#   - A.J. Brown printed as Philadelphia's WR1 on 121 targets. He is a PATRIOT.
#   - Dontayvion Wicks, Philadelphia's actual WR2, printed under GREEN BAY.
# The first is visibly wrong to anyone who follows the league. The second is
# invisible: a player simply never appears, and nothing says he is missing.
#
# THE APP ITSELF NEVER HAD THIS BUG. ADP_DATA has carried "aj brown -> NE" for
# months, with the trade note beside it, and buildPlayerCard raises a movedFrom
# banner for exactly this case. CLAUDE.md has documented the trap since Aug 8
# 2026. This SCRIPT reintroduced it on day one by reading the JSON layers
# directly and never consulting the app's own roster table.
#   The lesson is not "check the team field". It is that a rule living only in
#   prose gets re-broken by the next tool that does not read the prose.
#
# TWO AUTHORITIES, IN THE APP'S OWN ORDER OF PRECEDENCE:
#   1. ADP_DATA in App.jsx - CURATED, ~300 draftable players, carries the trade
#      notes, and is what the app actually grades against. The Aug 8 rule says
#      in as many words: check the row's team against the ADP table first.
#   2. status_2026.json - the live Sleeper feed. 1,931 players, far broader
#      coverage, but third-party and unversioned.
#   3. The 2025 row's own team, when neither knows him.
#
# THE FALLBACK IS THE 2025 TEAM, NOT A DROP. A retired or practice-squad player
# is in neither authority, and dropping him would silently delete last year's
# production from a brief that still wants it. This repo's rule: a filtered name
# must never be silent.
# ==========================================================================
def _nm(n):
    """The feed's spelling: lowercase, no punctuation, no generational suffix."""
    n = n.lower().replace(".", "").replace("'", "").replace("-", " ")
    n = re.sub(r"\s+(jr|sr|ii|iii|iv|v)$", "", n).strip()
    return re.sub(r"\s+", " ", n)


def _load_adp_teams():
    """Parse ADP_DATA out of App.jsx. It is JavaScript, not JSON, so this reads
    the one shape the table is written in and ignores anything else."""
    out = {}
    try:
        with open(os.path.join(os.path.dirname(HERE), "App.jsx"), encoding="utf-8") as fh:
            app = fh.read()
    except OSError:
        return out
    for n, t in re.findall(
            r'"([^"]+)":\s*\{\s*adp:\s*[\d.]+,\s*pos:\s*"\w+",\s*team:\s*"(\w+)"', app):
        out.setdefault(_nm(n), t)
    return out


CUR_TEAM = _load_adp_teams()
ADP_TEAM_COUNT = len(CUR_TEAM)
for _k, _v in (sub(ST, "players") or {}).items():
    if _v.get("team"):
        CUR_TEAM.setdefault(_nm(_k), _v["team"])


def on_roster(name, row_team, team):
    """Is he on `team` in 2026? Curated table first, live feed second, the 2025
    row only when neither has heard of him."""
    return is_team(CUR_TEAM.get(_nm(name)) or row_team, team)


def prev_team(name, row_team):
    """Marker for numbers earned somewhere else. The row still prints - his
    production is real - but it describes a different offence, a different
    quarterback and a different play-caller."""
    now = CUR_TEAM.get(_nm(name))
    return f"  [2025 w/ {row_team}]" if (now and row_team and not is_team(now, row_team)) else ""


def roster(team, positions, min_tgt=40):
    out = []
    for name, v in (sub(NGS, "players") or {}).items():
        if on_roster(name, v.get("team"), team) and v.get("pos") in positions and v.get("tgt", 0) >= min_tgt:
            out.append((name, v))
    return out


# ---------------------------------------------------------------- the sections
def q1_line(team):
    row = sub_team(OL, "teams", team) or {}
    tier, rank = txt(row, "tier"), txt(row, "rank")
    line = f"OL {tier} (rank {rank} of 32)"
    if row.get("change"):
        line += f"\n        [CHANGE] {row['change']}"
    return line


def q2_tendency(team):
    """# A 2025 PACE OR PROE NUMBER BELONGS TO THE 2025 PLAY-CALLER, NOT THE TEAM.
    # This is "Player Metrics Carry the OLD Team" one level up, and it is worse,
    # because a traded player is visibly wrong to anyone who follows the league
    # while a stale tendency number looks completely normal.
    #
    # MEASURED Sep 13 2026 against one analyst's Week 1 walkthrough: EIGHT of the
    # 24 teams playing that Sunday had a new offensive play-caller or head coach
    # -- DET, NYJ, ATL, LV, ARI, LAC, TB and a new WSH defensive coordinator.
    #
    # WORKED CASE. Miami prints `pace slow 35.5s`, the slowest on the board, and
    # it reads as a standing team trait. It is MIKE McDANIEL'S number, and he is
    # the Chargers' offensive coordinator now. The number describes a staff that
    # left. Building a totals read on it is building on a coach who is gone.
    #
    # There is no play-caller field in any layer, so this cannot be fixed with
    # data -- only stated. The caveat prints at the site, on every team."""
    t, vintage = trends(team)
    o = sub(t, "off") or {}
    if not o:
        return "no team trends on file"
    return (f"{txt(o,'proe_label')}  PROE {num(o,'proe'):+.1f} "
            f"({num(o,'proe_rel'):+.1f} vs league)  |  pace {txt(o,'pace_label')} "
            f"{num(o,'pace'):.1f}s   [{vintage}]")


def q2_play_caller(team):
    """Names who calls the offence in 2026, so the 2025 number above can be read
    for what it is.

    # IT NAMES THE CALLER, NEVER WHAT HE DOES. A new coordinator is a reason to
    # DISTRUST a 2025 tendency, never a prediction of a new one. Nothing here says
    # which way pace or PROE moves, and a rail does not get to guess.
    #
    # THE THIRD STATE IS THE POINT. `unknown` is not `same`. A team absent from a
    # coaching tracker has not been shown to have kept its staff -- a zero result
    # measures the query. Collapsing unknown into same is how this trap gets
    # rebuilt, so the table carries three states and so does this output."""
    row = sub_team(PC, "teams", team) or {}
    st = row.get("status")
    if st == "changed":
        return [f"⛔ NEW PLAY-CALLER: {row.get('play_caller') or '?'} — the pace/PROE above",
                f"   is the OLD staff's number.  {row.get('note') or ''}"]
    if st == "same":
        return [f"✅ play-caller unchanged — {row.get('note') or ''}"]
    return ["⚠️ play-caller NOT VERIFIED for 2026. Absent from the table is NOT",
            "   evidence of continuity — check the staff before pricing the number."]


def q5_def_weakness(team):
    t, vintage = trends(team)
    d = sub(t, "def") or {}
    if not d:
        return "no team trends on file"
    rush, pas = num(d,"rush_epa"), num(d,"pass_epa")
    softer = "RUN" if rush > pas else "PASS"
    return (f"{txt(d,'funnel_label')} funnel  |  pass EPA {pas:+.3f}  "
            f"rush EPA {rush:+.3f}  ->  softer against the {softer}   [{vintage}]")


def q6_stretch(team, n=3):
    rows = roster(team, ("WR", "TE"))
    rows.sort(key=lambda r: -num(r[1],"iay"))
    if not rows:
        return ["none with 40+ targets in 2025"]
    return [f"{k.title():<22} {v['iay']:>5.1f} aDOT   {v['sep']:.1f} sep   {int(num(v,'tgt'))} tgt{prev_team(k, v.get('team'))}"
            for k, v in rows[:n]]


def q4_counters(team, n=3):
    """Who on this offence punished man coverage. ⚠️ `edge` is ypt_man - ypt_zone
    for that player. It says how he fared, never how often he will see it."""
    rows = []
    for name, v in (sub(COV, "players") or {}).items():
        if on_roster(name, v.get("team"), team) and (num(v,"tgt_man") + num(v,"tgt_zone")) >= 40:
            rows.append((name, v))
    rows.sort(key=lambda r: -num(r[1],"edge"))
    if not rows:
        return ["no coverage splits on file"]
    return [f"{k.title():<22} man {num(v,'ypt_man'):>5.2f} ypt / zone {num(v,'ypt_zone'):>5.2f}   "
            f"edge {num(v,'edge'):+.2f}   saw man {num(v,'man_rate')*100:.0f}%{prev_team(k, v.get('team'))}"
            for k, v in rows[:n]]


def q7_usage(team, n=4):
    rows = []
    for name, v in (MET or {}).items():
        if name.startswith("_") or not isinstance(v, dict):
            continue
        if on_roster(name, v.get("team"), team) and v.get("pos") in ("RB", "WR", "TE") and num(v,"gp") >= 8:
            rows.append((name, v))
    rows.sort(key=lambda r: -num(r[1],"wopr"))
    if not rows:
        return ["no 2025 usage on file"]
    return [f"{k.title():<22} WOPR {num(v,'wopr'):>5.2f}  tgt sh {num(v,'tgt_sh')*100:>4.1f}%  "
            f"snap {num(v,'snap_sh')*100:>4.1f}%  dud {num(v,'dud_rate')*100:>4.1f}%{prev_team(k, v.get('team'))}"
            for k, v in rows[:n]]


def q8_role_change(team, n=6):
    """Rank 1 in the Source Hierarchy: the thing that invalidates every baseline
    above. Live, and the only 2026 layer with real coverage as of Sep 13.

    # THE FEED CARRIES A CURRENT STATUS AND NO ONSET DATE. THIS FIELD USED TO SAY
    # "role change THIS WEEK", WHICH IS A CLAIM ITS OWN DATA CANNOT SUPPORT.
    #
    # WORKED CASE, Sep 13 2026, and it cost a real recommendation. BAL's Nnamdi
    # Madubuike prints `LDE DC1 Out (Neck)`. Read under the old header that is a
    # Week 1 subtraction and a live edge against a top-5 offensive line. It is
    # not: he was hurt in WEEK 2 OF 2025, missed that whole season, had neck
    # surgery in April 2026 and has been ramping up through camp. Every Baltimore
    # line has priced it for twelve months.
    #
    # `news_updated` DOES NOT RESCUE IT and that is the part worth remembering.
    # His reads 2026-09-11 - because he spoke to reporters that day. It dates the
    # last NEWS ITEM, never the injury. So it is printed as "last news", which is
    # what it is, and the header no longer claims a recency nothing measures.
    #
    # The rule this broke is the repo's own: a title is a label, not its contents.
    # A caveat filed somewhere else loses to a field label every time, so the
    # warning prints HERE, on every team, in the output itself."""
    rows = []
    for name, v in (sub(ST, "players") or {}).items():
        if not is_team(v.get("team"), team):
            continue
        inj = v.get("injury_status")
        depth = v.get("depth_chart_order")
        if inj or (depth is not None and depth >= 2 and v.get("depth_chart_position") in ("QB", "RB", "WR", "TE")):
            rows.append((name, v, bool(inj)))
    rows.sort(key=lambda r: (not r[2], num(r[1],"depth_chart_order",99)))
    hits = [r for r in rows if r[2]]
    if not hits:
        return ["no injury designations on file for this team"]
    # ⛔ `.get(k, default)` does NOT cover a key that EXISTS holding None, and both
    # depth fields are frequently null in the Sleeper feed. Found by --selftest.
    out = []
    for k, v, _ in hits[:n]:
        dc = v.get("depth_chart_order")
        st = v.get("injury_status") or "?"
        if v.get("injury_body_part"):
            st += f" ({v['injury_body_part']})"
        out.append(f"{k.title():<22} {(v.get('depth_chart_position') or '?'):<4} "
                   f"DC{dc if dc is not None else '?':<4} {st:<24} "
                   f"last news {v.get('news_updated') or '?'}")
    return out


def q11_qb(team):
    # WHO STARTS IS A DEPTH-CHART FACT, NOT A VOLUME FACT.
    # Sorting the 2025 profile by pass attempts picks last year's busiest passer,
    # which is not the same question. MEASURED Sep 13 2026: Minnesota's brief
    # printed JJ MCCARTHY - now the QB3 - because Kyler Murray, the live QB1, was
    # benched in 2025 and has no row in qb_profile at all. The brief showed a
    # third-stringer's numbers as the starter's, with nothing saying so.
    starter = None
    best = 99
    for k, v in (sub(ST, "players") or {}).items():
        if not is_team(v.get("team"), team):
            continue
        if (v.get("depth_chart_position") or v.get("pos")) != "QB":
            continue
        o = v.get("depth_chart_order")
        if o is not None and o < best:
            best, starter = o, k
    rows = [(k, v) for k, v in (sub(QB, "players") or {}).items() if on_roster(k, v.get("team"), team)]
    if starter:
        # The live starter first when he has a profile; otherwise say he has none
        # rather than silently promoting whoever does.
        hit = [r for r in rows if _nm(r[0]) == _nm(starter)]
        if hit:
            rows = hit
        else:
            others = ", ".join(k.title() for k, _ in rows[:2])
            return (f"{starter.title()} is the Week 1 starter - NO 2025 profile on file "
                    f"(benched, rookie, or below the 6-game / 100-attempt gate)"
                    + (f". 2025 data exists for: {others}" if others else ""))
    rows.sort(key=lambda r: -num(r[1],"pass_att_pg"))
    if not rows:
        return "no QB profile on file"
    k, v = rows[0]
    return (f"{k.title()}{prev_team(k, v.get('team'))}  {num(v,'pass_att_pg'):.1f} pass att/g  "
            f"{num(v,'rush_att_pg'):.2f} RUSH att/g  aDOT {num(v,'pass_adot'):.1f}   "
            f"[rush att r=0.815, 2nd stickiest input in the app]")


# ---------------------------------------------------------------- rendering
def brief(away, home):
    g = game_for(away, home)
    if g is None:
        sys.exit(f"no game {away} @ {home} in gameenv_2026.json")

    W = 78
    print("=" * W)
    print(f"  {away} @ {home}")
    if g.get("spread") is None:
        print("  NO LINE ON FILE — game already played, or not yet priced")
    else:
        im = g.get("implied") or {}
        flags = [f for f, on in (("BLOWOUT", g.get("blowout")), ("SHOOTOUT", g.get("shootout"))) if on]
        print(f"  {g['favorite']} -{g['spread']}  O/U {g['total']}   "
              f"implied {away} {im.get(away, im.get(g.get('away'), '?'))} / "
              f"{home} {im.get(home, im.get(g.get('home'), '?'))}"
              f"{'   [' + ' '.join(flags) + ']' if flags else ''}")
    print(f"  lines fetched {sub(GE,'_meta','fetched_at')} — a line moves, this does not")
    print("=" * W)

    for t, opp in ((away, home), (home, away)):
        print(f"\n### {t}")
        print(f"  Q1  line           {q1_line(t)}")
        print(f"  Q2  tendency       {q2_tendency(t)}")
        for r in q2_play_caller(t):
            print(f"      {r}")
        print(f"  Q5  def weakness   {q5_def_weakness(t)}")
        print(f"  Q11 quarterback    {q11_qb(t)}")
        print(f"  Q6  field stretchers ({t} receivers, vs {opp}'s defence)")
        for r in q6_stretch(t):
            print(f"        {r}")
        print(f"  Q4  man-coverage counters")
        for r in q4_counters(t):
            print(f"        {r}")
        print(f"  Q7  usage — the anchor tier (WOPR 0.752, tgt sh 0.729, snap 0.709)")
        for r in q7_usage(t):
            print(f"        {r}")
        print(f"  Q8  availability  [rank 1 — invalidates every baseline above]")
        print(f"      ⚠️ CURRENT status. The feed has no ONSET date, so a Friday injury")
        print(f"         and a year-old one print identically. Check before pricing one.")
        for r in q8_role_change(t):
            print(f"        {r}")

    print("\n" + "-" * W)
    print("  NOT MEASURED — stated rather than silently omitted")
    print("  Q3  what scheme this defence runs.  coverage_2025 is man rate FACED BY A")
    print("      RECEIVER, not a defensive tendency. No defence-side scheme profile exists.")
    print("  Q5b deep ball allowed specifically. teamtrends splits run vs pass and nothing")
    print("      by route DEPTH.")
    print("  Both: the app has offence-side player data and team-level defensive EPA, and")
    print("  no defence-side positional profile. FPA is the nearest thing and it is rank 5.")
    print("  ⚠️ FPA is RAW points allowed, not schedule-adjusted — a defence that drew")
    print("      Kelce, Bowers and LaPorta looks soft at TE for reasons that are not the defence.")
    print("  Q12 Breakout Watch is a separate board: grading/data/breakouts-2026.md")
    print("-" * W)
    print("  This prints inputs. It does not pick a side, and the contradictions are left in.")


def slate():
    games = [g for g in (sub(GE, "games") or []) if g.get("spread") is not None]
    games.sort(key=lambda g: -num(g,"total"))
    print(f"{'matchup':<13} {'line':<11}{'tot':>6}  {'implied':>15}  flags")
    for g in games:
        im = g.get("implied") or {}
        fl = " ".join(f for f, on in (("BLOWOUT", g.get("blowout")), ("SHOOTOUT", g.get("shootout"))) if on)
        print(f"{g['away']+' @ '+g['home']:<13} {g['favorite']+' -'+format(g['spread'],'.1f'):<11}"
              f"{g['total']:>6.1f}  {num(im,g['away']):>6.1f} /{num(im,g['home']):>6.1f}  {fl}")
    print(f"\n{len(games)} priced. Run `matchup-brief.py AWAY HOME` for the twelve questions.")


def selftest():
    """The two things that would fail SILENTLY, so they each carry a must-fail case.
    ⛔ A checker that quietly passes is worse than no checker."""
    ok = True

    def check(label, cond, why=""):
        nonlocal ok
        print(f"  {'ok  ' if cond else 'FAIL'}  {label}" + (f"   <- {why}" if not cond and why else ""))
        ok = ok and bool(cond)

    # 1. THE VINTAGE MUST BE LABELLED. teamtrends_2026 has 4 teams and games=0 as of
    #    Sep 13, so every line must fall back to 2025 AND SAY SO. A 2026 label over
    #    2025 numbers is the stale-data trap wearing a date.
    t26 = sub(TT26, "teams") or {}
    thin = [k for k, v in t26.items() if num(v,"games") < 4]
    check("teamtrends_2026 is still thin, so the fallback is live", bool(thin))
    for team in ("DAL", "NYG"):
        check(f"{team} tendency states its vintage", "[20" in q2_tendency(team))
        check(f"{team} def weakness states its vintage", "[20" in q5_def_weakness(team))
    _, v = trends(next(iter(thin), "DAL"))
    check("a thin 2026 team falls back to 2025", v == "2025", f"got {v}")

    # 2. THE GAPS MUST PRINT. The silent-drop rule: a missing number states why.
    import io as _io, contextlib
    buf = _io.StringIO()
    with contextlib.redirect_stdout(buf):
        brief("DAL", "NYG")
    out = buf.getvalue()
    check("Q3 prints as NOT MEASURED", "defence-side scheme profile exists" in out)
    check("Q5b prints as NOT MEASURED", "by route DEPTH" in out)
    check("the raw-FPA caveat prints", "not schedule-adjusted" in out)
    check("it says it does not pick a side", "does not pick a side" in out)
    check("role change is marked rank 1", "invalidates every baseline" in out)
    # MUST-FAIL CASES for the Sep 13 fix. Restoring the old header, or dropping
    # either the caveat or the date column, fails here instead of silently
    # shipping a recency claim the feed cannot support.
    check("Q8 never claims the injuries are new", "THIS WEEK" not in out)
    check("Q8 states it has no onset date", "ONSET date" in out)
    check("Q8 rows carry the last-news date", "last news 20" in out)
    # DAL is unverified and NYG changed play-caller, so one brief exercises both.
    check("Q2 names a new play-caller where one exists", "NEW PLAY-CALLER" in out)
    check("Q2 says unverified rather than unchanged", "NOT VERIFIED" in out)
    check("an unknown team is never reported as unchanged",
          "play-caller unchanged" not in q2_play_caller("ZZZ")[0])

    # 3. A team with no data must degrade, never crash.
    try:
        q1_line("ZZZ"); q2_tendency("ZZZ"); q7_usage("ZZZ"); q8_role_change("ZZZ")
        check("an unknown team degrades instead of crashing", True)
    except Exception as e:  # noqa: BLE001
        check("an unknown team degrades instead of crashing", False, repr(e))

    print("\n" + ("PASS  matchup-brief" if ok else "FAIL  matchup-brief"))
    return 0 if ok else 1


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if "--selftest" in sys.argv:
        sys.exit(selftest())
    elif "--slate" in sys.argv:
        slate()
    elif len(args) == 2:
        brief(args[0].upper(), args[1].upper())
    else:
        sys.exit(__doc__.strip().split("USAGE")[-1])
