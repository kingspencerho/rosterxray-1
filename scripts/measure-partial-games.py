#!/usr/bin/env python3
"""measure-partial-games.py - how loose is a "partial game" rule?

WHY THIS EXISTS. Hayden Winks' sample-hygiene move (ANALYST-REFERENCE.md 11b)
is to name the contaminated game he is excluding and why: "the lowest of his
career, if you throw out the one game he ran three routes before tearing his
ACL." Nothing in this app does that. A season rate silently averages a 3-snap
injury exit with fifteen full games.

THE THRESHOLD IS THE WHOLE DESIGN AND IT MUST NOT BE GUESSED. Too tight and it
catches nothing; too loose and half of every season is "contaminated", which
would let a reader throw out any week that spoils a narrative. So this prints
the flag rate at several thresholds over the whole 2025 corpus and the choice
is made from the distribution.

A partial game is scored against THE PLAYER'S OWN MEDIAN, never a league bar -
six targets is a quiet day for one receiver and a career game for another.

    python scripts/measure-partial-games.py
"""
import json
import os
import statistics as st
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(os.path.dirname(HERE), "grading", "data")

G = json.load(open(os.path.join(DATA, "gamelogs_2025.json"), encoding="utf-8"))
COLS = G["_meta"]["cols"]


def opps(pos, row, g):
    """Opportunity in one game: the chances the offence gave him."""
    c = COLS[pos]
    d = dict(zip(c, g))
    if pos == "RB":
        return (d.get("car") or 0) + (d.get("tgt") or 0)
    if pos in ("WR", "TE"):
        return d.get("tgt") or 0
    return None  # QB opportunity is attempts, a different animal


def scan(frac, min_median=3.0, min_games=6):
    flagged = players = games = 0
    per_player = []
    for name, row in G.items():
        if name.startswith("_") or row.get("pos") not in ("RB", "WR", "TE"):
            continue
        o = [opps(row["pos"], row, g) for g in row["g"]]
        o = [x for x in o if x is not None]
        if len(o) < min_games:
            continue
        med = st.median(o)
        if med < min_median:
            continue
        hits = sum(1 for x in o if x <= med * frac)
        players += 1
        games += len(o)
        flagged += hits
        if hits:
            per_player.append(hits)
    return {
        "frac": frac, "players": players, "games": games, "flagged": flagged,
        "pct_games": 100.0 * flagged / games if games else 0,
        "pct_players_with_one": 100.0 * len(per_player) / players if players else 0,
        "max_per_player": max(per_player) if per_player else 0,
    }


def main():
    print("PARTIAL-GAME FLAG RATE, 2025 corpus")
    print("a game counts as partial when opportunity <= frac x the PLAYER'S OWN median\n")
    print("  frac   players   games   flagged   %games   %players w/ >=1   worst player")
    for f in (0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.50):
        r = scan(f)
        print("  %.2f   %7d   %5d   %7d   %6.2f   %14.1f   %12d" % (
            r["frac"], r["players"], r["games"], r["flagged"],
            r["pct_games"], r["pct_players_with_one"], r["max_per_player"]))
    print("\nREAD IT AS: a rule that flags a large share of all games is not")
    print("finding injuries, it is finding ordinary variance - and a reader")
    print("could then discard any week that spoiled the story.")


if __name__ == "__main__":
    main()
