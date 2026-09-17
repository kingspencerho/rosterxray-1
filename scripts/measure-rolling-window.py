#!/usr/bin/env python3
"""Should team tendency use a ROLLING WINDOW instead of a per-season figure?

Full write-up: ANALYST-REFERENCE.md section 2d.

THE QUESTION
------------
build-teamtrends.py computes PROE, neutral-script pace and the defensive funnel
PER SEASON. Its own gates say those need roughly 300 / 200 / 350 plays - about
week 5, week 5 and week 10 - so for the first month of a season the app has no
usable current-season figure and falls back to last season entirely.

A rolling window of the last K team-games would never be empty: in week 2 it is
two games of this season and eight from the end of last. That sounds strictly
better and it is not obviously true, because the offseason sits inside the
window. A team that changed coordinators is two different teams, and the
rolling figure averages them - which is the same objection that governs the
matchup pill.

So it gets measured. Team trends are CONTEXT ONLY, so nothing here can move a
grade either way; what it can do is stop the app printing a worse number.

THE TEST
--------
For each season S, metric M and cut-week N:

  PRIOR     M over all of season S-1
  TODATE    M over weeks 1..N of season S
  ROLL(K)   M over the team's last K games ending at week N, crossing the
            season boundary into S-1 as needed
  TARGET    M over weeks N+1..18 of season S

Correlate each predictor with the target. Higher r wins.

⛔ THE TARGET IS THE REST OF THE CURRENT SEASON, because that is the period the
panel's reader is about to live through. Not next season, and not the full
season - including weeks 1..N in the target would let TODATE predict itself.

⚠️ THE BAR: at n = 32 teams an r must reach about 0.349 to be distinguishable
from zero at p<0.05, and a DIFFERENCE between two r values needs more than that.

⛔⛔ READ THE PER-SEASON ROWS BEFORE THE POOLED ONES. Section 2c was killed by
a verdict that flipped sign between one season and three, and a pooled mean
hides exactly that.

VALIDATION
----------
--selftest asserts that summing this file's PER-GAME accumulators reproduces
build-teamtrends.py's own season-level output for 2025, to three decimals. A
harness that cannot reproduce the builder it is judging is measuring its own
reimplementation - the lesson section 2c records, and the reason that one was
trusted.

USAGE
  python3 scripts/measure-rolling-window.py --selftest
  python3 scripts/measure-rolling-window.py
  python3 scripts/measure-rolling-window.py --dir PATH

INPUT - the same release refresh-inseason.sh step 5 already downloads:
  curl -sSL -o pbp_2025.csv.gz \
    https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_2025.csv.gz
"""
import collections
import csv
import gzip
import importlib.util
import json
import math
import os
import sys
import tempfile

import sys as _s
try:
    _s.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ⛔ ONE EXTRACTION RULE. The neutral-script definition, the pace bounds and
# fnum() all come from the builder rather than being retyped here - a
# calibration that defines "neutral" differently from the layer it is judging
# measures the gap between two definitions.
_spec = importlib.util.spec_from_file_location(
    "btt", os.path.join(REPO, "scripts", "build-teamtrends.py"))
btt = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(btt)

SEASONS = (2023, 2024, 2025)
CUTS = (2, 3, 4, 6, 8)
ROLLS = (6, 10, 17)
METRICS = ("proe", "pace", "funnel")
NOISE_BAR = 0.349


def pbp_for(season, where):
    for name in ("play_by_play_%d.csv.gz" % season, "pbp_%d.csv.gz" % season,
                 "play_by_play_%d.csv" % season, "pbp_%d.csv" % season):
        p = os.path.join(where, name)
        if os.path.exists(p):
            return p
    return None


def pearson(xs, ys):
    n = len(xs)
    if n < 3:
        return None
    mx, my = sum(xs) / n, sum(ys) / n
    sx = sum((x - mx) ** 2 for x in xs)
    sy = sum((y - my) ** 2 for y in ys)
    if sx <= 0 or sy <= 0:
        return None
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / math.sqrt(sx * sy)


def collect_per_game(path):
    """MIRRORS build-teamtrends.collect(), keyed per (team, week) instead of
    per season. Every gate, bound and neutral-script test below is the
    builder's own constant, imported rather than copied.

    -> obs[team][week] = {proe: [...], pace: [...], dpass: [...], drush: [...]}
    """
    obs = collections.defaultdict(lambda: collections.defaultdict(
        lambda: {"proe": [], "pace": [], "dpass": [], "drush": []}))
    prev = None
    op = gzip.open if str(path).endswith(".gz") else open
    with op(path, "rt", newline="") as fh:
        for r in csv.DictReader(fh):
            if r.get("season_type") != "REG":
                continue
            wk = btt.fnum(r.get("week"))
            if wk is None:
                continue
            wk = int(wk)
            off, dfn, gid = r.get("posteam"), r.get("defteam"), r.get("game_id")
            pt = r.get("play_type")

            v = btt.fnum(r.get("pass_oe"))
            if v is not None and off:
                obs[off][wk]["proe"].append(v)

            e = btt.fnum(r.get("epa"))
            if e is not None and dfn:
                if pt == "pass":
                    obs[dfn][wk]["dpass"].append(e)
                elif pt == "run":
                    obs[dfn][wk]["drush"].append(e)

            if pt in ("pass", "run"):
                if (prev is not None
                        and prev.get("game_id") == gid
                        and prev.get("posteam") == off
                        and prev.get("drive") == r.get("drive")):
                    a = btt.fnum(prev.get("game_seconds_remaining"))
                    b = btt.fnum(r.get("game_seconds_remaining"))
                    sd = btt.fnum(r.get("score_differential"))
                    q = btt.fnum(r.get("qtr"))
                    hsr = btt.fnum(r.get("half_seconds_remaining"))
                    if a is not None and b is not None:
                        d = a - b
                        neutral = (sd is not None and abs(sd) <= btt.NEUTRAL_MARGIN
                                   and q is not None and q <= btt.NEUTRAL_MAX_QTR
                                   and (hsr is None or hsr > btt.NEUTRAL_MIN_HALF_SECONDS))
                        if btt.PACE_MIN_DELTA < d <= btt.PACE_MAX_DELTA and neutral and off:
                            obs[off][wk]["pace"].append(d)
                prev = r
    return obs


def metric_over(buckets, metric):
    """buckets = list of the per-week dicts to pool. Returns (value, n)."""
    if metric == "funnel":
        p = [x for b in buckets for x in b["dpass"]]
        r = [x for b in buckets for x in b["drush"]]
        if not p or not r:
            return None, 0
        return (sum(p) / len(p)) - (sum(r) / len(r)), min(len(p), len(r))
    key = metric
    v = [x for b in buckets for x in b[key]]
    if not v:
        return None, 0
    return sum(v) / len(v), len(v)


# ⚠️ MINIMUM SAMPLE PER PREDICTOR. Without a floor, a week-2 TODATE figure
# built on 60 plays competes against a 1,000-play prior and the comparison is
# measuring sample size rather than window choice. These are deliberately well
# BELOW the builder's shipping gates - the question here is which window is
# better, not whether the app should print it.
MIN_N = {"proe": 40, "pace": 25, "funnel": 40}


def windows(obs_by_season, team, season, cut, k):
    """The team's last k games ending at week `cut` of `season`, walking back
    into the prior season when this one has not supplied enough."""
    out = []
    for s in (season, season - 1):
        if s not in obs_by_season:
            continue
        wks = sorted(w for w in obs_by_season[s].get(team, {})
                     if (w <= cut if s == season else True))
        for w in reversed(wks):
            out.append(obs_by_season[s][team][w])
            if len(out) >= k:
                return out
    return out


def series(obs_by_season, season, cut, metric):
    """-> {predictor_name: {team: value}} plus {team: target}"""
    cur = obs_by_season.get(season, {})
    prior = obs_by_season.get(season - 1, {})
    preds = collections.defaultdict(dict)
    target = {}

    for team, byweek in cur.items():
        late = [byweek[w] for w in byweek if w > cut]
        tv, tn = metric_over(late, metric)
        if tv is None or tn < MIN_N[metric]:
            continue
        target[team] = tv

        early = [byweek[w] for w in byweek if w <= cut]
        v, n = metric_over(early, metric)
        if v is not None and n >= MIN_N[metric]:
            preds["todate"][team] = v

        if team in prior:
            v, n = metric_over(list(prior[team].values()), metric)
            if v is not None and n >= MIN_N[metric]:
                preds["prior"][team] = v

        for k in ROLLS:
            v, n = metric_over(windows(obs_by_season, team, season, cut, k), metric)
            if v is not None and n >= MIN_N[metric]:
                preds["roll%d" % k][team] = v

    return preds, target


def selftest(where):
    """Does summing the per-game accumulators reproduce the SHIPPED builder?"""
    print("SELFTEST - do per-game accumulators reproduce build-teamtrends.py?")
    print("(2025, against the committed grading/data/teamtrends_2025.json)\n")
    p = pbp_for(2025, where)
    if not p:
        print("SKIPPED: no 2025 play-by-play on disk. See USAGE for the curl.")
        return 0
    shipped_path = os.path.join(REPO, "grading", "data", "teamtrends_2025.json")
    if not os.path.exists(shipped_path):
        print("SKIPPED: teamtrends_2025.json not found.")
        return 0
    shipped = json.load(open(shipped_path, encoding="utf-8"))
    obs = collect_per_game(p)

    fail = checked = 0
    print("%-5s %-7s %10s %10s %9s" % ("team", "metric", "shipped", "mine", "diff"))
    for team in sorted(shipped.get("teams", shipped)):
        row = shipped["teams"][team] if "teams" in shipped else shipped[team]
        if not isinstance(row, dict):
            continue
        buckets = list(obs.get(team, {}).values())
        if not buckets:
            continue
        off = row.get("off") or {}
        dfn = row.get("def") or {}
        # ⚠️ The shipped keys are off.proe / off.pace / def.funnel - the RAW
        # values. The _rel siblings are league-relative and are what the LABEL
        # is computed from; comparing against those would be checking this
        # harness against a centring step it does not perform.
        for metric, want in (("proe", off.get("proe")),
                             ("pace", off.get("pace")),
                             ("funnel", dfn.get("funnel"))):
            if want is None:
                continue
            got, _ = metric_over(buckets, metric)
            if got is None:
                continue
            checked += 1
            d = got - want
            ok = abs(d) <= 0.005
            if not ok:
                fail += 1
                print("%-5s %-7s %10.3f %10.3f %+9.3f  MISMATCH" % (team, metric, want, got, d))
    print("\n%d value(s) checked, %d mismatch(es)" % (checked, fail))
    if not fail and checked:
        print("the per-game collector reproduces the shipped builder")
    elif not checked:
        print("NOTHING CHECKED - the shipped file's field names have moved; "
              "fix this before trusting any verdict")
        return 1
    return 1 if fail else 0


def main():
    args = sys.argv[1:]
    where = tempfile.gettempdir()
    if "--dir" in args:
        where = args[args.index("--dir") + 1]

    if "--selftest" in args:
        sys.exit(selftest(where))

    obs_by_season = {}
    for s in (SEASONS[0] - 1,) + SEASONS:
        p = pbp_for(s, where)
        if not p:
            continue
        sys.stderr.write("  reading %d...\n" % s)
        obs_by_season[s] = collect_per_game(p)
    if not obs_by_season:
        print("No play-by-play found in %s. See USAGE for the curl." % where)
        return

    seasons = [s for s in SEASONS if s in obs_by_season]
    print("ROLLING WINDOW vs PER-SEASON for team tendency")
    print("target = the same metric over weeks N+1..18 of the SAME season")
    print("bar: an r must reach ~%.3f to clear noise at n=32\n" % NOISE_BAR)

    names = ["prior", "todate"] + ["roll%d" % k for k in ROLLS]
    pooled = collections.defaultdict(lambda: collections.defaultdict(list))

    for metric in METRICS:
        print("=== %s ===" % metric.upper())
        print("%-6s %-4s %s" % ("season", "cut",
                                " ".join("%8s" % n for n in names) + "   winner"))
        for season in seasons:
            if season - 1 not in obs_by_season:
                continue
            for cut in CUTS:
                preds, target = series(obs_by_season, season, cut, metric)
                if len(target) < 12:
                    continue
                cells = {}
                for n in names:
                    d = preds.get(n, {})
                    ts = sorted(set(d) & set(target))
                    if len(ts) < 12:
                        continue
                    r = pearson([d[t] for t in ts], [target[t] for t in ts])
                    if r is not None:
                        cells[n] = r
                        pooled[metric][(cut, n)].append(r)
                if not cells:
                    continue
                best = max(cells, key=lambda k: cells[k])
                print("%-6s %-4s %s   %s" % (
                    season, cut,
                    " ".join("%8s" % ("%.3f" % cells[n] if n in cells else "-")
                             for n in names),
                    best))
            print()

    print("\nPOOLED across %d season(s) - READ THE PER-SEASON ROWS FIRST" % len(seasons))
    for metric in METRICS:
        print("\n=== %s ===" % metric.upper())
        print("%-4s %s   %s" % ("cut", " ".join("%8s" % n for n in names), "winner"))
        for cut in CUTS:
            vals = {}
            for n in names:
                v = pooled[metric].get((cut, n), [])
                if v:
                    vals[n] = sum(v) / len(v)
            if not vals:
                continue
            best = max(vals, key=lambda k: vals[k])
            print("%-4s %s   %s" % (
                cut,
                " ".join("%8s" % ("%.3f" % vals[n] if n in vals else "-") for n in names),
                best))

    print("\nNOTE: THE OFFSEASON SITS INSIDE EVERY ROLLING WINDOW. A team that changed"
          "\n   coordinators is two teams and roll(K) averages them. Historical"
          "\n   coordinator data does not exist in this repo, so this cannot be split"
          "\n   by continuity - which means a rolling win here is a win DESPITE that"
          "\n   confound, and a rolling loss does not prove the window is wrong.")


if __name__ == "__main__":
    main()
