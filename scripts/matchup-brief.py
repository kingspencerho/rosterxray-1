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
    python scripts/matchup-brief.py --props          # posted props priced by the app
    python scripts/matchup-brief.py DAL NYG --json
"""
import math
import json
import os
import re
import sys

# Windows consoles default to cp1252 and every emoji in this brief is a
# hard crash there - it took out a real run twice in one session. errors=
# 'replace' so a missing glyph degrades to '?' instead of killing the report.
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

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
DSCH = load("defense_scheme_2025.json")
MET = load("player_metrics_2025.json")
QB = load("qb_profile_2025.json")
ST = load("status_2026.json")
PC = load("play_caller_2026.json")
EFF = load("player_efficiency_2025.json")
VAC = load("vacated_2026.json")
PROPS = load("props_2026w01.json")
ROUTES = load("routes_2025.json")
RZ = load("redzone_2025.json")
GL = load("gamelogs_2025.json")


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

# ⛔ THE PERCENTILE GATE USES RAW NAMES, AND CUR_TEAM CANNOT BE REUSED FOR IT.
# CUR_TEAM is keyed by _nm(), which strips punctuation and generational
# suffixes. App.jsx gates its pool on a RAW lookup - `!ADP_DATA[name]` - so the
# normalised set matches players the app excludes: 4 more RBs, 5 more WRs, 2
# more TEs. That shifted every percentile by about a point, which is small
# enough to have shipped unnoticed and is exactly the sort of quiet divergence
# the parity guard exists to refuse.
ADP_RAW = set()
try:
    with open(os.path.join(os.path.dirname(HERE), "App.jsx"), encoding="utf-8") as _fh:
        ADP_RAW = set(re.findall(
            r'"([^"]+)":\s*\{\s*adp:\s*[\d.]+,\s*pos:\s*"\w+",\s*team:\s*"\w+"', _fh.read()))
except OSError:
    pass


# ============================ POSITION PERCENTILES ============================
# ⛔⛔ THIS IS A MIRROR, NOT A NEW IDEA. App.jsx has had CARD_PERCENTILES
# since long before this; the card already prints "29%ile" beside every metric
# and its glossary already explains that 50 is the median starter. What it did
# NOT have is any way for a SCRIPT to see it, because the pools are built at
# module load inside the browser bundle and never written to grading/data.
#
# That gap has a cost and it is not hypothetical. On Sep 17 2026 a FLEX
# comparison in this repo put an RB's dud rate next to a WR's and read them
# side by side. A 23.5% dud rate is a GOOD wide receiver and a BAD running back
# - RB median is 11.8%, WR median is 35.3% - so the raw numbers said the
# opposite of the truth and the recommendation was wrong.
#
# ⛔ THE GATE IS COPIED FROM App.jsx AND MUST STAY COPIED. Over there:
#     if (m.pos !== pos || (m.gp || 0) < 8 || !ADP_DATA[name]) continue;
#     if (!arr || arr.length < 12 || value == null) return null;
# Same position, 8+ games, must be in the draftable ADP table, and never rank
# against fewer than 12 players. A duplicated definition is this repo's most
# repeated bug, so scripts/test-percentile-parity.mjs runs BOTH implementations
# against the same inputs and fails if they ever disagree.
PCT_KEYS = ("wopr", "tgt_sh", "snap_sh", "dud_rate")
# Low is good, so the rank is flipped - App.jsx does this with `invert: true`
# and `pct = 100 - pct`.
PCT_INVERT = ("dud_rate",)
PCT_MIN_GP = 8
PCT_MIN_POOL = 12


def _pct_pools():
    out = {}
    for name, v in (MET or {}).items():
        if name.startswith("_") or not isinstance(v, dict):
            continue
        pos = v.get("pos")
        if pos not in ("RB", "WR", "TE"):
            continue
        if num(v, "gp") < PCT_MIN_GP or name not in ADP_RAW:
            continue
        for k in PCT_KEYS:
            x = v.get(k)
            if isinstance(x, (int, float)):
                out.setdefault(pos, {}).setdefault(k, []).append(x)
    for by_key in out.values():
        for arr in by_key.values():
            arr.sort()
    return out


PCT_POOLS = _pct_pools()


# ⛔⛔ ROUTES AND RED ZONE GET THEIR OWN POOLS AND MUST NEVER SHARE THE ONE
# ABOVE. App.jsx says this in as many words about its NGS table: "NGS carries
# its OWN population (40+ targets in 2025) and its own gate, which is not the
# gate CARD_PERCENTILES uses. Ranking one against the other would print a
# percentile whose stated population is wrong." routes_2025 gates on route
# participation and redzone_2025 emits a share only when the PLAYER and his
# TEAM both clear an opportunity gate, so each file's own membership IS its
# population. A player absent from one is not a zero, he is unranked.
def _layer_pools(layer, keys):
    out = {}
    for _n, v in (sub(layer, "players") or {}).items():
        if not isinstance(v, dict):
            continue
        pos = v.get("pos")
        if pos not in ("RB", "WR", "TE"):
            continue
        for k in keys:
            x = v.get(k)
            if isinstance(x, (int, float)):
                out.setdefault(pos, {}).setdefault(k, []).append(x)
    for d in out.values():
        for arr in d.values():
            arr.sort()
    return out


ROUTE_KEYS = ("route_sh", "tprr")
RZ_KEYS = ("rz_tgt_sh", "rz_car_sh", "i10_car_sh")
# ===================== CROSS-FILE PLAYER NAME RESOLUTION =====================
# Every layer in grading/data keys players by NAME and only redzone_2025 carries
# a stable id, so a lookup across files is a string match with nothing checking
# it. That failed loudly on Sep 17 2026: the brief printed Kenny Gainwell under
# "NO 2025 DATA - every read above is BLIND to these starters" while his 2025
# row sat one file over as "kenneth gainwell". A 96th-percentile TPRR and a
# 94th-percentile red-zone target share were suppressed from a live lineup call,
# and the disclosure block asserted the opposite of the truth.
#
# TWO CLASSES, MEASURED BY scripts/measure-name-joins.py:
#   SUFFIX/PUNCTUATION  "chris godwin jr" vs "chris godwin". _nm() already
#                       solves it and the brief simply was not using it.
#                       Worth 19 false "no data" claims on its own.
#   NICKNAME            "kenneth gainwell" vs "kenny gainwell". No rule reaches
#                       it, so it needs an alias - and an alias is dangerous in
#                       a way a miss is not, because a WRONG one merges two
#                       players' seasons into one row.
#
# SO EVERY ALIAS BELOW IS PROVEN, NOT REMEMBERED. Run --prove-aliases. The bar:
#   1. both spellings appear somewhere
#   2. never in the SAME file  (Kyle Allen and Josh Allen are both in
#      status_2026, which is what proves they are two people)
#   3. position agrees, and team agrees AMONG FILES OF THE SAME SEASON - a
#      2025-vs-2026 team difference is a TRANSFER, not a contradiction. That
#      one cost a false rejection of Gainwell, who went PIT -> TB.
ALIASES = {
    "kenneth gainwell": "kenny gainwell",   # PIT RB in all three 2025 layers
    "joshua palmer": "josh palmer",         # BUF WR
    "zonovan knight": "bam knight",         # ARI RB
}
ALIASES.update({v: k for k, v in ALIASES.items()})


def find_row(name, layer):
    """The player's row in `layer`, however that file happens to spell him.

    Raw hit first so an exact match always wins, then normalised, then a proven
    alias. Returns None when he is genuinely absent - which is a real answer and
    the reason Q7b exists.
    """
    # TWO FILE SHAPES AND THIS MUST SURVIVE BOTH. routes/redzone/status nest
    # their rows under "players"; player_metrics and gamelogs are FLAT, with
    # player names at the top level beside _meta. The first cut of this only
    # handled the nested shape, so every flat-file lookup returned None - which
    # made Q7b claim Bucky Irving, Cade Otton and Emeka Egbuka were unmeasured
    # while their full rows printed three lines above, and silently killed the
    # hygiene detector at the same time. It looked like a longer list, not an
    # error.
    rows = sub(layer, "players")
    if not rows:
        rows = {k: v for k, v in (layer or {}).items()
                if not k.startswith("_") and isinstance(v, dict)}
    if name in rows:
        return rows[name]
    key = _nm(name)
    for k in (key, ALIASES.get(key), ALIASES.get(name)):
        if not k:
            continue
        if k in rows:
            return rows[k]
        for rk, rv in rows.items():
            if _nm(rk) == k:
                return rv
    return None


ROUTE_POOLS = _layer_pools(ROUTES, ROUTE_KEYS)
RZ_POOLS = _layer_pools(RZ, RZ_KEYS)


def layer_pct(pools, pos, key, value):
    arr = (pools.get(pos) or {}).get(key)
    if not arr or len(arr) < PCT_MIN_POOL or value is None:
        return None
    below = 0
    for x in arr:
        if x < value:
            below += 1
        else:
            break
    return math.floor(below / len(arr) * 100 + 0.5)


# ======================= SAMPLE HYGIENE (the Winks move) ======================
# ⭐⭐ WHAT IT IS. A season rate silently averages a three-snap injury exit
# with fifteen full games. The move worth stealing, from ANALYST-REFERENCE.md
# §11b: name the contaminated game and say why, then give the rate without it.
#
# ⛔ THE THRESHOLD IS MEASURED, NOT CHOSEN. scripts/measure-partial-games.py
# prints the flag rate over the whole 2025 corpus at seven thresholds. The curve
# climbs gently to 0.30 and then accelerates; at 0.50 it flags 13.6% of all
# games and 83.5% of players, which is finding ordinary variance rather than
# injuries - and a reader could then discard any week that spoiled a story.
# 0.20 flags 66 of 2,470 games (2.67%), and a spot read of what it catches is
# unambiguous: CeeDee Lamb on 1 target against a 10 median, Amon-Ra St. Brown 1
# against 10, Kimani Vidal with zero opportunities against 13.
#
# ⭐ IT IS SCORED AGAINST THE PLAYER'S OWN MEDIAN, never a league bar. Six
# targets is a quiet Sunday for one receiver and a career day for another.
#
# ⚠️ IT CATCHES TWO CAUSES AND CANNOT TELL THEM APART: a mid-game exit and a
# Week 18 rest. Both contaminate a rate, so both are worth printing, but the
# line says "partial" rather than "injured" because the data does not know.
PARTIAL_FRAC = 0.20
PARTIAL_MIN_MEDIAN = 3.0
PARTIAL_MIN_GAMES = 6


def _gl_opp(pos, cols, g):
    d = dict(zip(cols, g))
    if pos == "RB":
        return (d.get("car") or 0) + (d.get("tgt") or 0)
    return d.get("tgt") or 0


def partial_games(name):
    """Games whose opportunity collapsed against the player's own median.

    Returns (flags, clean_tgt_pg, all_tgt_pg) or None when the log is too thin
    to say anything. ⛔ It RECOMPUTES ONLY PER-GAME RATES. A target SHARE needs
    that team's per-game totals, which no file here carries, so a share is
    flagged as contaminated and never re-derived - inventing it would be worse
    than leaving it.
    """
    row = find_row(name, GL)
    if not isinstance(row, dict) or not row.get("g"):
        return None
    pos = row.get("pos")
    if pos not in ("RB", "WR", "TE"):
        return None
    cols = sub(GL, "_meta", "cols", pos) or []
    if not cols:
        return None
    games = row["g"]
    if len(games) < PARTIAL_MIN_GAMES:
        return None
    opp = [_gl_opp(pos, cols, g) for g in games]
    med = sorted(opp)[len(opp) // 2] if len(opp) % 2 else (
        sorted(opp)[len(opp) // 2 - 1] + sorted(opp)[len(opp) // 2]) / 2
    if med < PARTIAL_MIN_MEDIAN:
        return None
    flags, kept = [], []
    for g, x in zip(games, opp):
        d = dict(zip(cols, g))
        if x <= med * PARTIAL_FRAC:
            flags.append((d.get("week"), x))
        else:
            kept.append(d.get("tgt") or 0)
    if not flags or not kept:
        return None
    all_tgt = [dict(zip(cols, g)).get("tgt") or 0 for g in games]
    return flags, sum(kept) / len(kept), sum(all_tgt) / len(all_tgt), med


def pctile(pos, key, value):
    """Percentile of `value` among draftable 8+ game players at `pos`.

    Returns None rather than a flattering number when the pool is thin - a rank
    against eight players is not information. 50 is the median starter.
    """
    arr = (PCT_POOLS.get(pos) or {}).get(key)
    if not arr or len(arr) < PCT_MIN_POOL or value is None:
        return None
    below = 0
    for x in arr:
        if x < value:
            below += 1
        else:
            break
    # ⛔ NOT round(). Python rounds half to EVEN and JavaScript's Math.round
    # sends half UP, so 13/40 = 32.5% became 32 here and 33 on the card. Three
    # tight ends disagreed by a point and nothing anywhere would have said so -
    # a guard that compared the two SOURCES would have called them identical.
    p = math.floor(below / len(arr) * 100 + 0.5)
    return 100 - p if key in PCT_INVERT else p
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


def q5_big_runs(team):
    """Explosive runs allowed — a DIFFERENT question from rush EPA above.

    # rush_epa is the AVERAGE value allowed per run. This is the TAIL. A defence
    # can be good at one and poor at the other, and TB 2025 is exactly that:
    # rush_epa -0.0724, which reads stiff against the run, while allowing 20+ yard
    # runs on 2.78%% of carries — 22nd of 32 against a 2.30%% league rate.
    #
    # ⛔ WHY THE LINE EXISTS. The funnel read was used to argue that Tampa
    # suppresses a long run. It does not; it suppresses the AVERAGE run. Anything
    # decided by ONE big play is answered here and never by the EPA above.
    """
    row = sub_team(TT26, "teams", team) or sub_team(TT25, "teams", team) or {}
    e = (row.get("def") or {}).get("expl_run") or {}
    if not e.get("runs"):
        return []
    out = []
    if e.get("rate20") is not None:
        rk = e.get("rank20")
        out.append("big runs: 20+ on %.2f%% of carries (%d of %d)%s"
                   % (e["rate20"] * 100, e.get("n20", 0), e["runs"],
                      "  —  %d of 32, league 2.30%%" % rk if rk else ""))
    if e.get("rate15") is not None:
        out.append("         15+ on %.2f%% (%d)" % (e["rate15"] * 100, e.get("n15", 0)))
    if not e.get("computed_from_pbp"):
        out.append("   ⚠️ hand-pulled, 20+/40+ only — a pbp rebuild fills 10+ and 15+")
    return out


def q5_dc(team):
    """Who runs this defence in 2026, so the EPA split above can be read for what
    it is.

    # THE FUNNEL IS A SCHEME PROPERTY, so a new coordinator is exactly what breaks
    # it -- the same argument as Q2, pointed at the other side of the ball. 19 of
    # 32 defences changed coordinator for 2026.
    #
    # WORKED CASE. Tampa prints pass EPA +0.068 / rush EPA -0.072, i.e. a pass
    # funnel: stiffer against the run, so opponents throw. That read was used
    # against two Cincinnati unders. Tampa's DC did NOT change (Todd Bowles, 2019),
    # so there the 2025 split is honest -- but had it changed, the whole read would
    # have been describing a staff that left, and nothing in the output said so.
    """
    row = sub_team(PC, "teams", team) or {}
    st = row.get("dc_status")
    if st == "changed":
        return [f"⛔ NEW DC: {row.get('dc') or '?'} — the EPA split above is the OLD",
                f"   defensive staff's. A funnel is scheme, so it may not survive."]
    if st == "same":
        return [f"✅ DC unchanged — {row.get('dc') or '?'} ({row.get('dc_note') or ''})"]
    return ["⚠️ DC NOT VERIFIED for 2026 — " + (row.get("dc_note") or "unknown"),
            "   Absent is not the same as unchanged; check before using the funnel."]


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


def q3_scheme(opp):
    """What the OPPOSING DEFENCE actually does, from its own side.

    ⛔ FPA DIRECTION RULE. This describes the defence being FACED, so it is read
    for the players opposing it and never for its own.

    ⛔⛔ ONLY RATES THAT REPEAT ARE IN THE FILE (r >= 0.355 across two
    transitions, n=32), and the r prints beside each so nobody has to remember
    which ones earned their place.
    """
    if not DSCH:
        return ["no defence-side scheme profile file — run build-defense-scheme.py"]
    d = sub(DSCH, "teams", opp)
    if not d:
        return ["no defence-side scheme profile for %s" % opp]
    meta = DSCH.get("_meta", {}) or {}
    st = meta.get("stickiness", {}) or {}
    league = meta.get("league", {}) or {}
    order = (("man_rate", "man"), ("blitz_rate", "blitz"),
             ("pressure_rate", "pressure"), ("cov_cover_1", "cover-1"),
             ("cov_cover_2", "cover-2"), ("cov_2_man", "2-man"))
    out = []
    for key, name in order:
        v = d.get(key)
        if v is None:
            continue
        lab = d.get(key + "_label")
        # ⚠️ The headline two always print; the coverage splits print only when
        # this defence is more than a standard deviation off the league, because
        # "average cover-2" on every brief is noise. Silence means ordinary.
        if key not in ("man_rate", "blitz_rate") and lab in (None, "average"):
            continue
        mu = (league.get(key) or {}).get("mean")
        ctx = " · league %.1f%%" % (100.0 * mu) if mu is not None else ""
        tag = "" if lab in (None, "average") else "  %s" % lab.upper()
        out.append("%-9s %5.1f%%%s   [r %.2f]%s"
                   % (name, 100.0 * v, ctx, st.get(key, float("nan")), tag))
    n = (d.get("plays") or {}).get("man_zone")
    if n:
        out.append("%d classified snaps, %s season" % (n, meta.get("season")))
    out.append("\u26d4 DESCRIPTIVE. A defence's man rate repeats at 0.46; what a RECEIVER")
    out.append("   does against man repeats at 0.16 — a coin flip. Sticky tendency x noisy")
    out.append("   edge = noise, so this says what they DID, not who to start.")
    return out


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
    def _snap(v):
        # ⛔ A NULL SNAP SHARE IS NOT ZERO. num() coerces None to 0, so this
        # printed "snap 0.0%" for Chris Godwin and Harold Fannin - both of whom
        # played all season. The percentile column said "(--)" beside it, so the
        # row asserted he never took a snap AND that he could not be ranked.
        # Absence is a stated gap here, never a number.
        x = v.get("snap_sh")
        return "%4.1f%%" % (x * 100) if isinstance(x, (int, float)) else "  --  "

    def pc(v, key):
        # A bare "(--)" is deliberate: a thin pool prints its absence rather
        # than silently dropping to a raw number the reader then misreads.
        p = pctile(v.get("pos"), key, v.get(key))
        return "(--)" if p is None else "(%2d)" % p

    # ============ ROUTE / RED ZONE / HYGIENE ============
    # ⭐⭐⭐ ROUTES IS FIRST AND IT IS NOT CLOSE. Counted over 141 minutes of
    # the Yahoo show (ANALYST-REFERENCE.md §11b): routes 65 mentions, snap
    # share 45, carry share 27, red zone 25 - and ADP ZERO. In season the price
    # you paid is irrelevant and route participation is the spine. This block
    # was printing neither routes nor red zone, which is to say it was missing
    # the show's most-cited metric and its third.
    def extra(name, v):
        pos, out = v.get("pos"), []
        r = find_row(name, ROUTES) or {}
        z = find_row(name, RZ) or {}

        def add(pools, key, val, label, as_pct):
            # ⛔ route_sh and every red-zone share are FRACTIONS on disk. The
            # first cut printed "routes 0.917" and "rz tgt sh 0.2%" - one raw,
            # one wrong by a factor of a hundred. Scale here, once.
            if not isinstance(val, (int, float)):
                return
            p = layer_pct(pools, pos, key, val)
            shown = ("%.0f%%" % (val * 100)) if as_pct else ("%.3f" % val)
            out.append("%s %s %s" % (label, shown, "(--)" if p is None else "(%2d)" % p))

        add(ROUTE_POOLS, "route_sh", r.get("route_sh"), "routes", True)
        add(ROUTE_POOLS, "tprr", r.get("tprr"), "TPRR", False)
        add(RZ_POOLS, "rz_tgt_sh", z.get("rz_tgt_sh"), "rz tgt sh", True)
        add(RZ_POOLS, "rz_car_sh", z.get("rz_car_sh"), "rz car sh", True)
        add(RZ_POOLS, "i10_car_sh", z.get("i10_car_sh"), "i10 car sh", True)
        return out

    lines = []
    for k, v in rows[:n]:
        lines.append(f"{k.title():<22} WOPR {num(v,'wopr'):>5.2f} {pc(v,'wopr')}  "
                     f"tgt sh {num(v,'tgt_sh')*100:>4.1f}% {pc(v,'tgt_sh')}  "
                     f"snap {_snap(v)} {pc(v,'snap_sh')}  "
                     f"dud {num(v,'dud_rate')*100:>4.1f}% {pc(v,'dud_rate')}{prev_team(k, v.get('team'))}")
        ex = extra(k, v)
        if ex:
            lines.append("%-22s %s   [own population]" % ("", "  ".join(ex)))
        h = partial_games(k)
        if h:
            flags, clean, allv, med = h
            wk = ", ".join("wk %s: %s opp" % (w, o) for w, o in flags)
            lines.append("%-22s ⚠ %d partial game(s) inside the 2025 rates - %s, against a %.0f median."
                         % ("", len(flags), wk, med))
            lines.append("%-22s   targets/game %.1f without them, %.1f as shown. Shares above are NOT re-derived."
                         % ("", clean, allv))
    return lines


def q7b_unmeasured(team):
    """2026 starters with NO 2025 row. Every read above is BLIND to these players.

    # ⛔⛔ THIS COST A REAL CALL, Sep 13 2026. Arizona's two 2025 running backs were
    # both on IR, so a usage read built on player_metrics_2025 returned an empty
    # backfield and the conclusion written was "Arizona cannot run". Arizona then
    # won outright as the week's biggest underdog, controlling the game on the
    # ground 37:31 to 22:29, behind ROOKIE Jeremiyah Love -- who was listed DC1 in
    # status_2026 the whole time and has no 2025 row anywhere.
    #
    # THE DEFECT IS STRUCTURAL, NOT A ONE-OFF. Every 2025 layer -- player_metrics,
    # ngs_receiving, coverage, qb_profile, player_efficiency -- can only describe
    # players who produced in 2025. Rookies are invisible to all of them, and so
    # is anyone who missed the season. The live depth chart knows them; nothing
    # else does.
    #
    # ⭐ THE FIX IS A DISCLOSURE, NOT A PROJECTION. Nothing here estimates what an
    # unmeasured player will do -- that would be inventing data, which is worse
    # than missing it. It prints WHO the numbers cannot see, so an empty position
    # group reads as "blind here" rather than as "nobody plays here".
    """
    rows = []
    for name, v in (sub(ST, "players") or {}).items():
        if not is_team(v.get("team"), team):
            continue
        pos, dc = v.get("pos"), v.get("depth_chart_order")
        if pos not in ("QB", "RB", "WR", "TE") or dc is None or dc > 2:
            continue
        # ONE-SIDED NORMALISATION WAS THE BUG, and it made this block lie.
        # It ran _nm() on the status name and then looked it up in a dict whose
        # OWN keys are raw, so "chris godwin" never matched "chris godwin jr"
        # and three measured starters were listed as players the numbers cannot
        # see. Normalising one side of a comparison is worse than normalising
        # neither: it looks careful and it silently fails.
        src_layer = QB if pos == "QB" else MET
        if find_row(name, src_layer) is None:
            rows.append((dc, "%-22s %-3s DC%s%s" % (
                name.title(), pos, dc,
                "  " + v["injury_status"] if v.get("injury_status") else "")))
    return [r for _, r in sorted(rows)]


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
        for r in q5_dc(t):
            print(f"      {r}")
        for r in q5_big_runs(t):
            print(f"      {r}")
        print(f"  Q11 quarterback    {q11_qb(t)}")
        print(f"  Q6  field stretchers ({t} receivers, vs {opp}'s defence)")
        for r in q6_stretch(t):
            print(f"        {r}")
        print(f"  Q3  what scheme {opp}'s defence runs")
        for r in q3_scheme(opp):
            print(f"        {r}")
        print(f"  Q4  man-coverage counters")
        for r in q4_counters(t):
            print(f"        {r}")
        print(f"  Q7  usage — the anchor tier (WOPR 0.752, tgt sh 0.729, snap 0.709)")
        for r in q7_usage(t):
            print(f"        {r}")
        _blind = q7b_unmeasured(t)
        if _blind:
            print(f"  Q7b NO 2025 DATA — every read above is BLIND to these starters")
            for r in _blind:
                print(f"        {r}")
        print(f"  Q8  availability  [rank 1 — invalidates every baseline above]")
        print(f"      ⚠️ CURRENT status. The feed has no ONSET date, so a Friday injury")
        print(f"         and a year-old one print identically. Check before pricing one.")
        for r in q8_role_change(t):
            print(f"        {r}")

    print("\n" + "-" * W)
    print("  NOT MEASURED — stated rather than silently omitted")
    print("  Q5b deep ball allowed specifically. teamtrends splits run vs pass and nothing")
    print("      by route DEPTH. The app has offence-side player data and team-level")
    print("      defensive EPA, and no defence-side POSITIONAL profile — FPA is the")
    print("      nearest thing and it is rank 5.")
    print("  ⚠️ Q3 is no longer here: defense_scheme_2025 closed it Sep 17 2026. It is a")
    print("      2025 layer — participation parquet is 404 for 2026, so there is no")
    print("      current-season twin and the scheme read describes LAST season.")
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


# ==========================================================================
# --props : PRICE THE POSTED PROP LINES AGAINST THE APP'S OWN 2025 RATES
#
# ONLY THREE PROP TYPES ARE ELIGIBLE, and that is the whole design. Per section 2
# of ANALYST-REFERENCE.md, receptions (targets/g r=0.774), RB carries (r=0.730)
# and QB pass attempts (r=0.605) are the only common props whose underlying rate
# repeats year to year. Rushing YARDS is carries (0.730) x YPC (0.022), and
# receiving YARDS is targets (0.774) x YPT (0.308) -- both bet a sticky number
# multiplied by a random one. They are EXCLUDED rather than ranked low, because a
# ranked-low row still reads as a recommendation on a quiet board.
#
# THE ROLE GUARD IS THE ONE THAT MATTERS, AND IT WAS LEARNED THE HARD WAY.
# The first version scored on |gap| alone and ranked Bhayshul Tuten UNDER 12.5 as
# the best bet on the entire slate: app rate 5.53 carries a game against a 12.5
# line. He is Jacksonville's DC1 in 2026 and was a backup in 2025 -- the line is a
# starter's and the 5.53 is a backup's. The same bug promoted David Montgomery,
# now Houston's DC1 after splitting a backfield with Gibbs in Detroit.
#   Rank 1 in the Source Hierarchy is role CHANGE, and it INVALIDATES the sticky
#   baseline. Scoring |gap| alone inverts that exactly: the more certainly the
#   baseline was dead, the higher it ranked. A gap that is large RELATIVE to the
#   line is the market pricing a role the 2025 rate cannot see. Not an edge.
#
# AND THE MIRROR IMAGE, which is easier to miss: VACATED WORK. Jahmyr Gibbs
# carried 14.29 a game WHILE SHARING WITH David Montgomery, who is a Texan now.
# The 17.5 line prices the vacated half. His baseline UNDERSTATES him, so the
# UNDER that the raw gap suggests is precisely backwards. vacated_2026 records
# who left, so this is checkable instead of something to remember.
#
# IT PRINTS AND RANKS. IT DOES NOT PICK. Game script, opponent and any second
# source sit outside it, and the flags are there to be read, not summed.
# ==========================================================================
PROP_W = {"rec": 1.00, "car": 0.95, "att": 0.75}   # stickiness tier weight
PROP_POS = {"rec": ("WR", "TE"), "car": ("RB",), "att": ("QB",)}
PROP_NAME = {"rec": "receptions", "att": "pass att", "car": "rush att"}


def pcs_status(team):
    row = sub_team(PC, "teams", team) or {}
    return row.get("status", "unknown"), row.get("play_caller")


def prop_rate(kind, name):
    """The app's own 2025 per-game rate for this prop's unit, or None."""
    k = _nm(name)
    if kind == "att":
        v = (sub(QB, "players") or {}).get(k) or {}
        a = v.get("pass_att_pg")
        return (a, v.get("team"), None) if a is not None else (None, None, None)
    m = (sub(MET, "players") or MET or {}).get(k) or {}
    gp = m.get("gp")
    if not gp:
        return (None, None, None)
    if kind == "rec":
        return (m["rec"] / gp, m.get("team"), gp)
    car = ((sub(EFF, "players") or {}).get(k) or {}).get("carries")
    return (car / gp, m.get("team"), gp) if car else (None, None, None)


def vacated_at(team, kind):
    """Same-position team-mates who left. Their work goes somewhere, so a
    survivor's 2025 rate understates the role he holds now."""
    row = sub_team(VAC, "teams", team) or {}
    names = [g.get("name") for g in (row.get("gone") or [])
             if g.get("pos") in PROP_POS.get(kind, ())]
    return names, row.get("vacated_pct") or 0


def _def_trends(team):
    """The freshest defensive split that actually HAS numbers.

    ⛔ FALL BACK ON A MISSING VALUE, NOT A MISSING ROW. teamtrends_2026 carries
    all 32 teams from week 1, with nulls until each gate is met - so
    `sub_team(TT26,...) or sub_team(TT25,...)` short-circuits on a row full of
    nulls and the 2025 numbers are never reached. That read "no defensive
    trends on file" for every team in the league while the data sat one file
    over.
    """
    for src in (TT26, TT25):
        d = (sub_team(src, "teams", team) or {}).get("def") or {}
        if d.get("pass_epa") is not None and d.get("rush_epa") is not None:
            return d
    return {}


def funnel_read(opp, kind, side):
    """Does the defence being faced push this prop's number UP or DOWN?

    # THE FUNNEL IS THE GAP between pass EPA allowed and rush EPA allowed, never
    # how bad the defence is outright. Tampa allows +0.068 on pass plays, which is
    # mid-pack; what makes it a pass funnel is that it allows -0.072 on the RUN.
    # Stiff against the run invites throwing, so pass volume and receptions go UP.
    # A run funnel does the reverse, and for a CARRIES prop the sign flips again.
    #
    # ⛔ AND IT IS VOID WHENEVER THE OPPOSING DC CHANGED. The split is a 2025
    # number owned by the 2025 defensive staff, and a funnel is a scheme property,
    # so a new coordinator does not shift it -- it removes it. MEASURED Sep 13
    # 2026: nine of thirteen picks faced a defence with a new DC, so the read was
    # unavailable for most of the board. Void is reported as void, never as
    # neutral, because neutral reads as "checked and fine".
    #
    # ⚠️ WEIGHT IT AS RANK 5. Matchup data orders close options and never makes a
    # good read bad. It has no measured stickiness in this app at all, so it
    # RE-RANKS and must not veto.
    """
    d = _def_trends(opp)
    pe, re_ = d.get("pass_epa"), d.get("rush_epa")
    if pe is None or re_ is None:
        return None, "no defensive trends on file for %s" % opp
    gap = pe - re_
    st = (sub_team(PC, "teams", opp) or {}).get("dc_status", "unknown")
    if st == "changed":
        return None, "funnel VOID - %s changed defensive coordinator" % opp
    lifts, drops = gap > 0.03, gap < -0.03
    if kind == "car":
        lifts, drops = drops, lifts
    if (lifts and side == "OVER") or (drops and side == "UNDER"):
        v = "SUPPORTS"
    elif (lifts and side == "UNDER") or (drops and side == "OVER"):
        v = "FIGHTS"
    else:
        v = "neutral"
    if st == "unknown":
        v += " (DC unverified)"
    return v, "vs %s funnel %+.3f (pass %+.3f / rush %+.3f)" % (opp, gap, pe, re_)


def score_prop(row):
    kind, team, line = row.get("type"), row.get("team"), row.get("line")
    r, rt, gp = prop_rate(kind, row.get("player", ""))
    if r is None or not line:
        return None
    gap = r - line
    rel = abs(gap) / line
    s = rel * PROP_W.get(kind, 0.5)
    flags = []
    live = (sub(ST, "players") or {}).get(_nm(row.get("player", ""))) or {}
    dc = live.get("depth_chart_order")
    if rel > 0.30:
        s *= 0.25
        flags.append("ROLE CHANGE, not an edge (2026 DC%s)" % dc)
    left, vpct = vacated_at(team, kind)
    if left and gap < 0:
        # SIZE THE VACANCY, do not just detect it. The first version applied a flat
        # 0.35 and so treated Cincinnati losing ONE tight end (7.1% of targets) the
        # same as Tampa losing Mike Evans and two more (32%). That silently dropped
        # a legitimate pick off the board. vacated_pct is a TARGET-share figure, so
        # it sizes a receptions prop honestly and says nothing about carries -- a
        # carries vacancy gets a fixed, moderate penalty instead of a fake number.
        s *= (0.70 if kind == "car" else max(0.35, 1 - (vpct / 100.0) * 1.6))
        flags.append("VACATED WORK (%s%% of targets) - baseline may understate: %s"
                     % (vpct, ", ".join(left[:2])))
    stat, caller = pcs_status(team)
    if stat == "changed":
        s *= 0.55
        flags.append("NEW PLAY-CALLER %s" % caller)
    elif stat == "unknown":
        s *= 0.80
        flags.append("play-caller unverified")
    if rt and not is_team(rt, team):
        s *= 0.70
        flags.append("2025 w/%s" % rt)
    if gp and gp < 10:
        s *= 0.70
        flags.append("only %d gp" % gp)
    if live.get("injury_status"):
        s *= 0.40
        flags.append(str(live["injury_status"]).upper())
    opp = None
    for g in (sub(GE, "games") or []):
        if is_team(g.get("away"), team):
            opp = g.get("home")
        elif is_team(g.get("home"), team):
            opp = g.get("away")
        if opp:
            break
    fv, fnote = funnel_read(opp, kind, "OVER" if gap > 0 else "UNDER") if opp else (None, "no game found")
    if fv == "FIGHTS":
        s *= 0.80          # rank 5: it re-ranks, it does not veto
    elif fv == "SUPPORTS":
        s *= 1.15
    out = dict(row)
    out.update({"score": s, "side": "OVER" if gap > 0 else "UNDER",
                "price": row["over"] if gap > 0 else row["under"],
                "rate": r, "gap": gap, "dc": dc, "flags": flags,
                "funnel": fv, "funnel_note": fnote, "opp": opp})
    return out


def props(top=3):
    W = 78   # brief() keeps its own local copy; this is not a module constant
    if not PROPS:
        print("no prop board on file - expected grading/data/props_2026w01.json")
        return
    m = sub(PROPS, "_meta") or {}
    print("=" * W)
    print("  POSTED PROPS PRICED AGAINST THE APP   week %s \u00b7 pulled %s"
          % (m.get("week"), m.get("pulled")))
    print("  source: %s" % m.get("source"))
    print("  \u26a0\ufe0f a snapshot, not a live price - re-pull before betting any row")
    print("  eligible: receptions \u00b7 RB carries \u00b7 QB pass attempts. Rushing and")
    print("  receiving YARDS are excluded - their efficiency half does not repeat.")
    print("=" * W)
    scored = [x for x in (score_prop(r) for r in (PROPS.get("props") or [])) if x]
    by_team = {}
    for x in scored:
        by_team.setdefault(x["team"], []).append(x)
    for g in (sub(GE, "games") or []):
        a, h = g.get("away"), g.get("home")
        rows = sorted(by_team.get(a, []) + by_team.get(h, []),
                      key=lambda x: -x["score"])[:top]
        print("\n### %s @ %s" % (a, h))
        if not rows:
            print("      no eligible prop with app data")
        for x in rows:
            print("  %-5s %-20s %5.1f %-10s %+5d  | app %.2f (%+.2f) | DC%s | %.3f"
                  % (x["side"], x["player"], x["line"], PROP_NAME[x["type"]],
                     x["price"], x["rate"], x["gap"], x["dc"], x["score"]))
            mark = {"SUPPORTS": "\u2705", "FIGHTS": "\u26d4"}.get(
                (x["funnel"] or "").split()[0] if x["funnel"] else "", "\u2014")
            print("        %s matchup: %s \u00b7 %s"
                  % (mark, x["funnel"] or "unavailable", x["funnel_note"]))
            if x["flags"]:
                print("        \u26a0\ufe0f " + " \u00b7 ".join(x["flags"]))
    print("\n" + "-" * W)
    print("  It ranks inputs. It does not pick a side - game script, opponent and any")
    print("  second source sit outside it, and the flags are to be read, not summed.")


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
    # ⛔ THE FIXTURE IS DERIVED, NOT PINNED. gameenv_2026 is a WEEKLY snapshot;
    # hardcoding a matchup means the selftest silently stops testing the moment
    # the slate rotates - which is exactly what happened when this file still
    # said brief("DAL", "NYG") and the board moved to week 2. Same class as a
    # fixed clock in a guard: a maintenance deadline dressed as a test.
    _games = sub(GE, "games") or []
    _first = _games[0] if isinstance(_games, list) and _games else {}
    _ST_AWAY = _first.get("away") or "DAL"
    _ST_HOME = _first.get("home") or "NYG"
    check("the selftest found a real game on the current board",
          bool(_first), "gameenv_2026 has no games — nothing downstream can run")
    for team in (_ST_AWAY, _ST_HOME):
        check(f"{team} tendency states its vintage", "[20" in q2_tendency(team))
        check(f"{team} def weakness states its vintage", "[20" in q5_def_weakness(team))
    _, v = trends(next(iter(thin), _ST_AWAY))
    check("a thin 2026 team falls back to 2025", v == "2025", f"got {v}")

    # 2. THE GAPS MUST PRINT. The silent-drop rule: a missing number states why.
    import io as _io, contextlib
    buf = _io.StringIO()
    with contextlib.redirect_stdout(buf):
        brief(_ST_AWAY, _ST_HOME)
    out = buf.getvalue()
    # ⚠️ INVERTED Sep 17 2026. Q3 used to print as a stated gap and now prints a
    # measured profile, so the assertion flips with it rather than being deleted.
    check("Q3 prints a defence-side scheme read",
          ("what scheme %s's defence runs" % _ST_HOME) in out)
    check("...with the stickiness beside each rate", "[r 0." in out)
    check("...and says it is descriptive, not a start/sit input",
          "not who to start" in out)
    check("Q3 is no longer listed as unmeasured",
          "No defence-side scheme profile exists" not in out)
    check("Q5b prints as NOT MEASURED", "by route DEPTH" in out)
    check("the raw-FPA caveat prints", "not schedule-adjusted" in out)
    check("it says it does not pick a side", "does not pick a side" in out)
    check("role change is marked rank 1", "invalidates every baseline" in out)
    # MUST-FAIL CASES for the Sep 13 fix. Restoring the old header, or dropping
    # either the caveat or the date column, fails here instead of silently
    # shipping a recency claim the feed cannot support.
    check("Q8 never claims the injuries are new", "THIS WEEK" not in out)
    # ⛔ MUST-FAIL: a 2026 starter with no 2025 row has to be NAMED, not silently
    # dropped. Arizona is the worked case -- rookie RB Jeremiyah Love was DC1 in
    # the live feed and absent from every 2025 layer, so the backfield read came
    # back empty and was reported as "cannot run". He won the game on the ground.
    _ari = q7b_unmeasured("ARI")
    check("an unmeasured 2026 starter is named rather than dropped",
          any("Love" in r for r in _ari), _ari)
    check("a fully-measured team prints nothing", q7b_unmeasured("ZZZ") == [])
    check("Q8 states it has no onset date", "ONSET date" in out)
    check("Q8 rows carry the last-news date", "last news 20" in out)
    # ⛔ DERIVED, NOT PINNED. This used to read "DAL is unverified and NYG
    # changed play-caller, so one brief exercises both" - true when it was
    # written, and false the moment the selftest's fixture stopped being DAL
    # @ NYG. Ask the data which teams carry each status.
    _pc = sub(PC, "teams") or {}
    _unk = next((k for k, v in sorted(_pc.items())
                 if isinstance(v, dict) and v.get("status") == "unknown"), None)
    _chg = next((k for k, v in sorted(_pc.items())
                 if isinstance(v, dict) and v.get("status") == "changed"), None)
    check("the play-caller file carries both a changed and an unverified team",
          bool(_unk) and bool(_chg))
    if _chg:
        # q2_play_caller returns a LIST of lines, so this needs a substring
        # test per line - `in` on a list is an exact-element match and silently
        # fails on text that is plainly there.
        check("Q2 names a new play-caller where one exists",
              any("NEW PLAY-CALLER" in r for r in q2_play_caller(_chg)), _chg)
    if _unk:
        check("Q2 says unverified rather than unchanged",
              any("NOT VERIFIED" in r for r in q2_play_caller(_unk)), _unk)
    check("Q5 names a new defensive coordinator where one exists", "NEW DC" in out)
    # rush EPA is an average and explosive rate is the tail. Reporting only the
    # average is what let a longest-run question be answered with a funnel.
    check("Q5 reports explosive runs allowed, not only the EPA average",
          "big runs: 20+" in out)
    check("a defence with no verified DC is never reported as unchanged",
          "DC unchanged" not in q5_dc("ZZZ")[0])
    check("an unknown team is never reported as unchanged",
          "play-caller unchanged" not in q2_play_caller("ZZZ")[0])

    # 3. A team with no data must degrade, never crash.
    try:
        q1_line("ZZZ"); q2_tendency("ZZZ"); q7_usage("ZZZ"); q8_role_change("ZZZ")
        check("an unknown team degrades instead of crashing", True)
        # 4. --props MUST-FAIL CASES. Every one of these is a bug that shipped.
        buf2 = _io.StringIO()
        with contextlib.redirect_stdout(buf2):
            props()
        po = buf2.getvalue()
        # SEVENTH INSTANCE of a guard failing on its own documentation: the header
        # prose explains WHY yardage props are excluded, so scanning the whole
        # output for those words fails on correct code. Scan the PICK ROWS only.
        picks = [ln for ln in po.split(chr(10))
                 if ln.startswith("  OVER") or ln.startswith("  UNDER")]
        check("props emits only the three repeating types",
              bool(picks) and all(any(t in ln for t in PROP_NAME.values()) for ln in picks))
        check("props flags a role change instead of promoting it",
              "ROLE CHANGE, not an edge" in po)
        check("props flags vacated work", "VACATED WORK" in po)
        check("props states it does not pick a side", "does not pick a side" in po)
        check("props reads each prop against the defence faced", "matchup:" in po)
        # VOID must never be rendered as neutral -- neutral reads as "checked, fine".
        # ⚠️ THESE TWO PINNED BAL AND TB AND THE FIRST WAS PASSING FOR THE
        # WRONG REASON - it got None from a dead fallback rather than from the
        # DC rule. Derive one team of each kind, and assert the DATA IS THERE
        # first so a None can only mean the DC rule fired.
        _pcs = sub(PC, "teams") or {}
        _dc_chg = next((k for k, v in sorted(_pcs.items())
                        if isinstance(v, dict) and v.get("dc_status") == "changed"
                        and _def_trends(k)), None)
        _dc_same = next((k for k, v in sorted(_pcs.items())
                         if isinstance(v, dict) and v.get("dc_status") == "same"
                         and _def_trends(k)), None)
        check("defensive trends resolve at all (the 2025 fallback is live)",
              bool(_dc_chg) or bool(_dc_same))
        if _dc_chg:
            check("a changed DC voids the funnel rather than neutralising it",
                  funnel_read(_dc_chg, "rec", "UNDER")[0] is None, _dc_chg)
        if _dc_same:
            check("an unchanged DC still yields a funnel verdict",
                  funnel_read(_dc_same, "rec", "UNDER")[0] is not None, _dc_same)
        _t = score_prop({"player": "bhayshul tuten", "team": "JAX", "type": "car",
                         "line": 12.5, "over": -121, "under": -107})
        check("the Tuten row scores as a role change, never as a top bet",
              bool(_t) and any("ROLE CHANGE" in f for f in _t["flags"]))
    except Exception as e:  # noqa: BLE001
        check("an unknown team degrades instead of crashing", False, repr(e))

    # ---- CROSS-FILE NAME RESOLUTION --------------------------------------
    # The layers key players by name and only redzone carries an id, so every
    # lookup across files is a string match. These are the three ways it broke.
    check("a nickname resolves across files (kenneth -> kenny gainwell)",
          find_row("kenneth gainwell", ROUTES) is not None)
    check("...and it carries the red-zone row that was being dropped",
          (find_row("kenneth gainwell", RZ) or {}).get("rz_tgt_sh") is not None)
    check("a generational suffix resolves both ways (godwin, fannin)",
          find_row("chris godwin jr", RZ) is not None
          and find_row("harold fannin", MET) is not None)

    # BOTH FILE SHAPES. routes/redzone/status nest under "players"; metrics and
    # gamelogs are flat. Handling only the nested shape made Q7b call Bucky
    # Irving unmeasured while his row printed above it.
    check("the resolver reads NESTED files", find_row("cade otton", ROUTES) is not None)
    check("...and FLAT files", find_row("cade otton", MET) is not None)

    # ⛔⛔ THE MUST-FAIL CASE, and it is the one that matters. A missing row
    # costs a blank. A WRONG alias merges two players' seasons into one row and
    # nothing downstream can tell. Kyle Allen and Josh Allen are both in
    # status_2026, which is exactly what proves they are two people.
    _ka = find_row("kyle allen", MET)
    check("a surname collision NEVER resolves (kyle allen is not josh allen)",
          _ka is None or _ka is not find_row("josh allen", MET))
    check("...and every alias is bidirectional", all(
        ALIASES.get(ALIASES[k]) == k for k in ALIASES))

    # Q7b's whole job is disclosure. A false entry there is worse than silence,
    # because it tells him to distrust a number that is sitting right above it.
    _un = " ".join(q7b_unmeasured("TB") + q7b_unmeasured("CLE"))
    for _who in ("Gainwell", "Godwin", "Fannin", "Irving", "Otton", "Egbuka"):
        check("Q7b no longer calls %s unmeasured" % _who, _who not in _un)
    check("...but a genuine rookie IS still disclosed", "Concepcion" in _un)

    # ---- SAMPLE HYGIENE, and the threshold is the whole design ------------
    # 0.20 IS MEASURED, NOT PICKED. scripts/measure-partial-games.py prints the
    # flag rate at seven thresholds over the 2025 corpus; 0.20 flags 66 of 2,470
    # games. If someone loosens it to "catch more", the corpus rate is the
    # argument against them: 0.50 flags 13.6% of ALL games, which would let any
    # inconvenient week be discarded as contaminated.
    check("the partial-game threshold is still the measured 0.20",
          PARTIAL_FRAC == 0.20)
    check("...and the measurement that justifies it still exists",
          os.path.exists(os.path.join(HERE, "measure-partial-games.py")))

    _lamb = partial_games("ceedee lamb")
    check("a real collapsed game is caught (lamb, 1 target on a 10 median)",
          bool(_lamb) and any(w == 18 for w, _ in _lamb[0]))
    check("...and the clean rate differs from the printed one",
          bool(_lamb) and abs(_lamb[1] - _lamb[2]) > 0.01)

    # MUST-FAIL CASE. A detector that finds a partial game in flat data would
    # flag the whole league, and nothing downstream would ever notice.
    _save = GL.get("zz selftest fixture")
    GL["zz selftest fixture"] = {"pos": "WR", "g": [[w, 1, 9.0, 0, 8, 5, 60, 70] for w in range(1, 13)]}
    check("a perfectly flat season flags NOTHING", partial_games("zz selftest fixture") is None)
    GL["zz selftest fixture"] = {"pos": "WR",
                          "g": [[w, 1, 9.0, 0, 8, 5, 60, 70] for w in range(1, 12)]
                               + [[12, 1, 0.3, 0, 1, 0, 0, 0]]}
    _sab = partial_games("zz selftest fixture")
    check("...and one collapsed game IS flagged", bool(_sab) and _sab[0] == [(12, 1)])
    if _save is None:
        GL.pop("zz selftest fixture", None)
    else:
        GL["zz selftest fixture"] = _save

    # ---- the two display bugs the percentile column exposed ---------------
    _q7 = chr(10).join(q7_usage("CLE", n=6) + q7_usage("TB", n=6))
    check("a NULL snap share prints as a gap, never as 0.0%", "snap   --  " in _q7)
    check("route share prints as a percentage, not a raw fraction",
          "routes 0." not in _q7)
    check("routes and red zone declare their OWN population",
          "[own population]" in _q7)

    print("\n" + ("PASS  matchup-brief" if ok else "FAIL  matchup-brief"))
    return 0 if ok else 1


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if "--selftest" in sys.argv:
        sys.exit(selftest())
    elif "--pctdump" in sys.argv:
        # Machine-readable percentile output, for the cross-language parity
        # guard only. It exists because this file DUPLICATES a rule that lives
        # in App.jsx, and an unproven duplicate is how the same bug has landed
        # a dozen times in this repo.
        import json as _json
        _out = []
        for _n, _v in sorted((MET or {}).items()):
            if _n.startswith("_") or not isinstance(_v, dict):
                continue
            if _v.get("pos") not in ("RB", "WR", "TE"):
                continue
            for _k in PCT_KEYS:
                _p = pctile(_v.get("pos"), _k, _v.get(_k))
                if _p is not None:
                    _out.append([_n, _v["pos"], _k, _v.get(_k), _p])
        print(_json.dumps({"pools": {p: {k: len(v) for k, v in d.items()}
                                     for p, d in PCT_POOLS.items()},
                           "rows": _out}))
    elif "--props" in sys.argv:
        props()
    elif "--slate" in sys.argv:
        slate()
    elif len(args) == 2:
        brief(args[0].upper(), args[1].upper())
    else:
        sys.exit(__doc__.strip().split("USAGE")[-1])
