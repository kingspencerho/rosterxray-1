#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Re-read a list of prop picks against the defence each one actually faces.

USAGE
    python scripts/prop-recal.py "Jordan Love 32.5 att|UNDER|GB|att" ...
    python scripts/prop-recal.py --file picks.txt      # one pick per line
    python scripts/prop-recal.py --selftest

    Each pick is  LABEL | SIDE | TEAM | KIND
      SIDE  OVER or UNDER
      TEAM  the PLAYER's team; the opponent is resolved from the schedule
      KIND  rec, car or att

WHY THIS IS A THIN CALLER AND NOT ITS OWN ANALYSIS.
The funnel logic lives in matchup-brief.funnel_read() and runs on every row of
`--props` automatically. This script exists only to point that same function at
an arbitrary hand-made list -- the picks you are actually holding, which the
prop board may not contain.
  The first version of this hardcoded thirteen Week 1 picks in the file. That is
  the staleness trap this repo keeps paying for: a snapshot committed as if it
  were a tool. Picks come in as arguments; nothing about one week is baked in.

WHAT IT WILL NOT TELL YOU.
Matchup data is rank 5 in the Source Hierarchy -- the least stable input in the
app, with no measured stickiness at all. It ORDERS close options. It never makes
a good read bad, and a FIGHTS verdict is a reason to re-rank a pick, never to
drop one. Read it next to the player's own rate, not instead of it.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib.util

_spec = importlib.util.spec_from_file_location(
    "mbrief", os.path.join(os.path.dirname(os.path.abspath(__file__)), "matchup-brief.py"))
mb = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(mb)

MARK = {"SUPPORTS": "✅", "FIGHTS": "⛔"}


def opponent(team):
    for g in (mb.sub(mb.GE, "games") or []):
        if mb.is_team(g.get("away"), team):
            return g.get("home")
        if mb.is_team(g.get("home"), team):
            return g.get("away")
    return None


def recal(picks):
    print("%-32s %-6s %-5s %-30s %s" % ("pick", "side", "vs", "verdict", "detail"))
    print("-" * 118)
    for label, side, team, kind in picks:
        opp = opponent(team)
        if not opp:
            print("%-32s %-6s %-5s %s" % (label, side, "?", "no game on the schedule"))
            continue
        verdict, note = mb.funnel_read(opp, kind, side)
        head = (verdict or "").split()[0] if verdict else ""
        print("%-32s %-6s %-5s %-2s %-27s %s"
              % (label, side, opp, MARK.get(head, "—"), verdict or "unavailable", note))
    print("-" * 118)
    print("  Rank 5. It re-ranks close options; it never makes a good read bad.")


def parse(s):
    parts = [p.strip() for p in s.split("|")]
    if len(parts) != 4:
        raise SystemExit("bad pick %r - need LABEL|SIDE|TEAM|KIND" % s)
    label, side, team, kind = parts
    if side.upper() not in ("OVER", "UNDER"):
        raise SystemExit("side must be OVER or UNDER, got %r" % side)
    if kind.lower() not in ("rec", "car", "att"):
        raise SystemExit("kind must be rec, car or att, got %r" % kind)
    return label, side.upper(), team.upper(), kind.lower()


def selftest():
    ok = True

    def check(name, cond, extra=""):
        nonlocal ok
        ok = ok and bool(cond)
        print("  %s  %s%s" % ("ok  " if cond else "FAIL", name,
                              "" if cond else "   <- " + str(extra)))

    # A changed DC must VOID the read, never return "neutral". Neutral reads as
    # "checked and fine", which is the opposite of what an unusable input means.
    check("a changed DC voids rather than neutralises",
          mb.funnel_read("BAL", "rec", "UNDER")[0] is None)
    check("an unchanged DC still returns a verdict",
          mb.funnel_read("TB", "rec", "UNDER")[0] == "FIGHTS")
    check("the carries sign is flipped against the pass sign",
          mb.funnel_read("TB", "car", "UNDER")[0] == "SUPPORTS")
    check("a malformed pick is refused, not guessed",
          _refuses("no pipes here"))
    check("the opponent resolves off the schedule", opponent("GB") == "MIN",
          opponent("GB"))
    print("\n" + ("PASS  prop-recal" if ok else "FAIL  prop-recal"))
    return 0 if ok else 1


def _refuses(s):
    try:
        parse(s)
    except SystemExit:
        return True
    return False


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--selftest" in args:
        sys.exit(selftest())
    if "--file" in args:
        path = args[args.index("--file") + 1]
        with open(path, encoding="utf-8") as fh:
            raw = [ln for ln in (l.strip() for l in fh) if ln and not ln.startswith("#")]
    else:
        raw = [a for a in args if not a.startswith("--")]
    if not raw:
        sys.exit(__doc__.strip().split("USAGE")[-1])
    recal([parse(r) for r in raw])
