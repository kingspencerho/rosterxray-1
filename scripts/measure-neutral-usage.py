#!/usr/bin/env python3
"""Does NEUTRAL-SCRIPT usage describe a player's role better than raw usage?

Full write-up: ANALYST-REFERENCE.md section 2e.

THE QUESTION
------------
Every usage number in this app - target share, carry share, targets per game -
is measured over ALL situations. But a back's carries are inflated when his
team is ahead and a receiver's targets are inflated when his team is behind, so
those numbers blend TWO things: the role a coach gave him, and the scoreboard
he happened to play in front of.

ANALYST-REFERENCE section 2b already names this mechanism as the reason RB
matchup data does not repeat: "fantasy points allowed to a running back does
not measure the defence. It measures THE GAME." The same objection applies to
the player's own usage, and nothing in the app has ever tested it.

⭐ THE APP ALREADY BELIEVES THIS FOR PACE. build-teamtrends.py measures pace on
NEUTRAL SNAPS ONLY, using CLAUDE.md Section 4's definition. The question here is
whether the same filter belongs on player usage - and those constants are
IMPORTED from that builder rather than retyped, so there is one definition of
"neutral" in the repo.

THE TEST
--------
For each season and cut-week N, per player:

  RAW      his share over weeks 1..N, all situations
  NEUTRAL  his share over weeks 1..N, neutral snaps only
  TARGET   his RAW share over weeks N+1..18

⛔ THE TARGET IS RAW ON PURPOSE. A manager's points come from every situation,
garbage time included. The question is not "which is the truer role" - it is
"which EARLY number better predicts the usage he will actually get."

⚠️ UNLIKE THE TEAM-LEVEL TESTS IN 2c AND 2d, THIS ONE HAS REAL POWER. Those
compare 31-32 defences, where an r needs ~0.355 to clear noise. This compares
hundreds of players, so the bar is nearer 0.10-0.14 and a 0.03 difference can
be a genuine finding rather than a decimal point.

TWO DEFINITIONS OF NEUTRAL, both tested, because they are not the same claim:
  score    CLAUDE.md Section 4: within 7 points, Q1-Q3, outside the last two
           minutes of a half. This is what pace already uses.
  wp       win probability between 20% and 80%. Catches a two-score game that
           is still live and excludes a close game that is effectively over.

USAGE
  python3 scripts/measure-neutral-usage.py --selftest
  python3 scripts/measure-neutral-usage.py
  python3 scripts/measure-neutral-usage.py --dir PATH

INPUT - the same release refresh-inseason.sh step 5 downloads:
  curl -sSL -o pbp_2025.csv.gz \
    https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_2025.csv.gz
"""
import collections
import csv
import gzip
import importlib.util
import math
import os
import sys
import tempfile

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ⛔ ONE DEFINITION OF "NEUTRAL" IN THE REPO. These constants are the ones the
# shipped pace metric already runs on; retyping them here would create a second
# definition that can drift, and then this measurement would be judging a
# filter the app does not apply.
_spec = importlib.util.spec_from_file_location(
    "btt", os.path.join(REPO, "scripts", "build-teamtrends.py"))
btt = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(btt)

SEASONS = (2023, 2024, 2025)
CUTS = (3, 4, 6, 8)
WP_LO, WP_HI = 0.20, 0.80

# Minimum opportunities on each side of the cut. Low enough to keep a real
# population, high enough that a share is not one target over two snaps.
MIN_EARLY = {"tgt": 8, "car": 8}
MIN_LATE = {"tgt": 12, "car": 12}
# ⚠️ A neutral-only share needs its own floor or it is a share of almost
# nothing - which would measure sample size, not game script.
MIN_EARLY_NEUTRAL = 5


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


def neutral_by_score(r):
    """CLAUDE.md Section 4, via the pace builder's own constants."""
    sd = btt.fnum(r.get("score_differential"))
    q = btt.fnum(r.get("qtr"))
    hsr = btt.fnum(r.get("half_seconds_remaining"))
    return (sd is not None and abs(sd) <= btt.NEUTRAL_MARGIN
            and q is not None and q <= btt.NEUTRAL_MAX_QTR
            and (hsr is None or hsr > btt.NEUTRAL_MIN_HALF_SECONDS))


def neutral_by_wp(r):
    wp = btt.fnum(r.get("wp"))
    if wp is None:
        wp = btt.fnum(r.get("vegas_wp"))
    return wp is not None and WP_LO <= wp <= WP_HI


def load(path):
    """-> rows[week][kind][(player, team)] = [all, neutral_score, neutral_wp]
       and team[week][kind][team]         = [all, neutral_score, neutral_wp]"""
    plays = collections.defaultdict(lambda: collections.defaultdict(
        lambda: collections.defaultdict(lambda: [0, 0, 0])))
    teams = collections.defaultdict(lambda: collections.defaultdict(
        lambda: collections.defaultdict(lambda: [0, 0, 0])))
    op = gzip.open if str(path).endswith(".gz") else open
    with op(path, "rt", newline="") as fh:
        for r in csv.DictReader(fh):
            if r.get("season_type") != "REG":
                continue
            wk = btt.fnum(r.get("week"))
            if wk is None or not (1 <= int(wk) <= 18):
                continue
            wk = int(wk)
            off = r.get("posteam")
            if not off:
                continue
            pt = r.get("play_type")
            if pt == "pass":
                kind, who = "tgt", r.get("receiver_player_name")
            elif pt == "run":
                kind, who = "car", r.get("rusher_player_name")
            else:
                continue
            ns = 1 if neutral_by_score(r) else 0
            nw = 1 if neutral_by_wp(r) else 0
            t = teams[wk][kind][off]
            t[0] += 1
            t[1] += ns
            t[2] += nw
            if who:
                p = plays[wk][kind][(who, off)]
                p[0] += 1
                p[1] += ns
                p[2] += nw
    return plays, teams


def shares(plays, teams, kind, weeks):
    """-> {player: (raw, neutral_score, neutral_wp, opp_all, opp_neutral_score)}"""
    pl = collections.defaultdict(lambda: [0, 0, 0])
    tm = collections.defaultdict(lambda: [0, 0, 0])
    for wk in weeks:
        for key, v in plays.get(wk, {}).get(kind, {}).items():
            a = pl[key]
            for i in range(3):
                a[i] += v[i]
        for team, v in teams.get(wk, {}).get(kind, {}).items():
            a = tm[team]
            for i in range(3):
                a[i] += v[i]
    out = {}
    for (who, team), v in pl.items():
        t = tm.get(team)
        if not t:
            continue
        raw = v[0] / t[0] if t[0] else None
        ns = v[1] / t[1] if t[1] else None
        nw = v[2] / t[2] if t[2] else None
        out[(who, team)] = (raw, ns, nw, v[0], v[1])
    return out


def run_season(path, cut, kind):
    plays, teams = path
    early = shares(plays, teams, kind, range(1, cut + 1))
    late = shares(plays, teams, kind, range(cut + 1, 19))
    xs_raw, xs_ns, xs_wp, ys = [], [], [], []
    for key, (raw, ns, nw, opp, opp_n) in early.items():
        if raw is None or ns is None or nw is None:
            continue
        if opp < MIN_EARLY[kind] or opp_n < MIN_EARLY_NEUTRAL:
            continue
        lt = late.get(key)
        if not lt or lt[0] is None or lt[3] < MIN_LATE[kind]:
            continue
        xs_raw.append(raw)
        xs_ns.append(ns)
        xs_wp.append(nw)
        ys.append(lt[0])
    if len(ys) < 25:
        return None
    return (pearson(xs_raw, ys), pearson(xs_ns, ys), pearson(xs_wp, ys), len(ys))


def selftest(where):
    """Does the neutral filter match the one the shipped pace metric uses, and
    does it actually remove a meaningful slice rather than nothing?"""
    print("SELFTEST - neutral-script filter")
    print("(constants imported from build-teamtrends.py, not retyped)\n")
    print("  NEUTRAL_MARGIN            %s" % btt.NEUTRAL_MARGIN)
    print("  NEUTRAL_MAX_QTR           %s" % btt.NEUTRAL_MAX_QTR)
    print("  NEUTRAL_MIN_HALF_SECONDS  %s" % btt.NEUTRAL_MIN_HALF_SECONDS)
    p = pbp_for(2025, where)
    if not p:
        print("\nSKIPPED: no 2025 play-by-play on disk. See USAGE for the curl.")
        return 0
    plays, teams = load(p)
    fail = 0
    for kind in ("tgt", "car"):
        tot = sum(v[0] for wk in teams for v in teams[wk][kind].values())
        ns = sum(v[1] for wk in teams for v in teams[wk][kind].values())
        nw = sum(v[2] for wk in teams for v in teams[wk][kind].values())
        print("\n  %s: %d plays, %d neutral by score (%.1f%%), %d neutral by wp (%.1f%%)"
              % (kind, tot, ns, 100.0 * ns / tot, nw, 100.0 * nw / tot))
        # A filter that keeps everything is not a filter; one that keeps almost
        # nothing cannot support a share.
        if not (0.15 < ns / tot < 0.85):
            print("    FAIL score-neutral keeps %.1f%% - not a usable filter" % (100.0 * ns / tot))
            fail += 1
        if not (0.15 < nw / tot < 0.95):
            print("    FAIL wp-neutral keeps %.1f%%" % (100.0 * nw / tot))
            fail += 1
    print("\n%s" % ("both filters keep a usable slice" if not fail else "%d PROBLEM(S)" % fail))
    return 1 if fail else 0


def main():
    args = sys.argv[1:]
    where = tempfile.gettempdir()
    if "--dir" in args:
        where = args[args.index("--dir") + 1]
    if "--selftest" in args:
        sys.exit(selftest(where))

    loaded = {}
    for s in SEASONS:
        p = pbp_for(s, where)
        if not p:
            continue
        sys.stderr.write("  reading %d...\n" % s)
        loaded[s] = load(p)
    if not loaded:
        print("No play-by-play found in %s. See USAGE for the curl." % where)
        return

    print("NEUTRAL-SCRIPT USAGE vs RAW USAGE")
    print("target = his RAW share over weeks N+1..18 of the same season")
    print("n is PLAYERS here, not teams, so the noise bar is nearer 0.10-0.14\n")

    pooled = collections.defaultdict(lambda: collections.defaultdict(list))
    hdr = "%-4s %-4s %-6s %8s %9s %9s %8s %8s %5s"
    for kind, name in (("tgt", "TARGET SHARE"), ("car", "CARRY SHARE")):
        print("=== %s ===" % name)
        print(hdr % ("", "cut", "season", "raw", "neut-score", "neut-wp",
                     "d-score", "d-wp", "n"))
        for cut in CUTS:
            for s in sorted(loaded):
                got = run_season(loaded[s], cut, kind)
                if not got:
                    continue
                r, ns, nw, n = got
                if r is None or ns is None or nw is None:
                    continue
                pooled[kind][cut].append((r, ns, nw, n))
                print(hdr % ("", cut, s, "%.3f" % r, "%.3f" % ns, "%.3f" % nw,
                             "%+.3f" % (ns - r), "%+.3f" % (nw - r), n))
            print()

    print("\nPOOLED - READ THE PER-SEASON ROWS FIRST")
    print("%-4s %-4s %8s %9s %9s %8s %8s  %s"
          % ("kind", "cut", "raw", "neut-score", "neut-wp", "d-score", "d-wp", "verdict"))
    for kind in ("tgt", "car"):
        for cut in CUTS:
            v = pooled[kind][cut]
            if not v:
                continue
            r = sum(x[0] for x in v) / len(v)
            ns = sum(x[1] for x in v) / len(v)
            nw = sum(x[2] for x in v) / len(v)
            best = max((r, "raw"), (ns, "neutral-score"), (nw, "neutral-wp"))[1]
            print("%-4s %-4s %8.3f %9.3f %9.3f %+8.3f %+8.3f  %s"
                  % (kind, cut, r, ns, nw, ns - r, nw - r, best))

    print("\nNOTE: the target is RAW usage because that is what a manager's points")
    print("      come from. A neutral-script number that describes the role better")
    print("      but predicts the box score worse is not an improvement HERE.")


if __name__ == "__main__":
    main()
