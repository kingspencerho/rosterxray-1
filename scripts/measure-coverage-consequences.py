#!/usr/bin/env python3
"""Which OFFENSIVE PIECE does a coverage shape actually feed?

Full write-up: ANALYST-REFERENCE.md section 11m.

NOT the question build-coverage.py answers. That one measures, PER PLAYER, how
one receiver did against man versus zone, and its own docstring kills it as a
predictor: the man/zone edge repeats at r = 0.161, a coin flip, on roughly 70
targets per player.

THE UPGRADE IS THE ONE SECTION 11j MADE FOR BLITZ. Stop asking whether coverage
helps THIS receiver and ask whether a coverage shape shifts the target
distribution BY ARCHETYPE, pooled over every play in the season. Same feed,
n three orders of magnitude larger.

AND 11j IS THE REASON TO COUNT RATHER THAN REASON. The folk model said a blitz
feeds the tight end and the back. Measured, the RECEIVERS ate and it came out of
the BACK, because a blitzed back stays in to block. The belief was backwards.
Every "cover-2 squeezes the middle so the slot suffers" sentence is the same
class of claim and carries the same standing until it is counted.

The DEPTH block is the one that answers "which piece", because slot versus
deep-outside is a depth distinction and position alone cannot see it.

LIMIT: this is a league-wide DESCRIPTION of one season. It does not show the
effect repeats, and a shift small enough to be schedule noise is not a finding.

USAGE
  python3 scripts/measure-coverage-consequences.py --selftest
  python3 scripts/measure-coverage-consequences.py --season 2025
"""
import argparse
import collections
import sys

TIERS = (("behind LOS", -99, -1), ("short 0-9", 0, 9),
         ("mid 10-19", 10, 19), ("deep 20+", 20, 999))
POSITIONS = ("WR", "TE", "RB")
TIER_NAMES = [t[0] for t in TIERS]

# Floor for reporting a single coverage shell on its own. Below this the split
# by position AND depth is twelve cells over a few hundred targets, which is
# schedule noise wearing a table. Cover-0 and cover-6 are usually under it and
# are correctly silent rather than reported thin.
MIN_SHELL_N = 800


def tier_of(ay):
    if ay is None:
        return None
    for name, lo, hi in TIERS:
        if lo <= ay <= hi:
            return name
    return None


def tally(rows, bucket_of):
    """rows -> {bucket: {pos Counter, tier Counter, depth {pos: [ay]}, n}}"""
    out = collections.defaultdict(
        lambda: {"pos": collections.Counter(), "tier": collections.Counter(),
                 "depth": collections.defaultdict(list), "n": 0})
    for r in rows:
        b = bucket_of(r)
        if b is None:
            continue
        pos = r.get("pos")
        if pos not in POSITIONS:
            continue
        d = out[b]
        d["n"] += 1
        d["pos"][pos] += 1
        t = tier_of(r.get("air_yards"))
        if t:
            d["tier"][t] += 1
        if r.get("air_yards") is not None:
            d["depth"][pos].append(r["air_yards"])
    return out


def shares(counter, keys):
    tot = sum(counter[k] for k in keys)
    return [(100.0 * counter[k] / tot if tot else 0.0) for k in keys]


def report(tab, a, b, label_a, label_b):
    def row(name, vals, fmt="%9.1f%%"):
        print("    %-14s" % name + "".join(fmt % v for v in vals))

    for field, keys, title in (("pos", list(POSITIONS), "share of targets, by position"),
                               ("tier", TIER_NAMES, "share of targets, by DEPTH")):
        print("\n  " + title)
        print("    %-14s" % "" + "".join("%10s" % k for k in keys))
        va, vb = shares(tab[a][field], keys), shares(tab[b][field], keys)
        row(label_a, va)
        row(label_b, vb)
        print("    %-14s" % "change" + "".join("%+10.1f" % (y - x) for x, y in zip(va, vb)))

    print("\n  mean target depth (air yards), by position")
    print("    %-14s" % "" + "".join("%10s" % k for k in POSITIONS))
    for lbl, bk in ((label_a, a), (label_b, b)):
        ds = tab[bk]["depth"]
        row(lbl, [sum(ds[p]) / len(ds[p]) if ds[p] else 0.0 for p in POSITIONS], "%10.1f")
    print("    n = %s %s, %s %s" % (format(tab[a]["n"], ","), label_a,
                                    format(tab[b]["n"], ","), label_b))


def selftest():
    fails = 0

    def chk(label, cond):
        nonlocal fails
        print("  %s   %s" % ("ok  " if cond else "FAIL", label))
        if not cond:
            fails += 1

    def mk(pos, ay, cov):
        return {"pos": pos, "air_yards": ay, "cov": cov}

    # a null split must report no change
    rows = []
    for cov in ("MAN", "ZONE"):
        rows += [mk("WR", 12, cov)] * 60 + [mk("TE", 6, cov)] * 25 + [mk("RB", 0, cov)] * 15
    t = tally(rows, lambda r: r["cov"])
    chk("a null split reports no change",
        abs(shares(t["MAN"]["pos"], POSITIONS)[0]
            - shares(t["ZONE"]["pos"], POSITIONS)[0]) < 0.01)

    # a planted shift must be detected
    rows = ([mk("WR", 12, "ZONE")] * 60 + [mk("TE", 6, "ZONE")] * 25
            + [mk("RB", 0, "ZONE")] * 15
            + [mk("WR", 12, "MAN")] * 75 + [mk("TE", 6, "MAN")] * 25)
    t = tally(rows, lambda r: r["cov"])
    chk("a planted 15-point RB shift IS detected",
        shares(t["ZONE"]["pos"], POSITIONS)[2] > 14
        and shares(t["MAN"]["pos"], POSITIONS)[2] == 0.0)

    chk("depth tiers bucket correctly, negative air yards included",
        tier_of(-3) == "behind LOS" and tier_of(0) == "short 0-9"
        and tier_of(14) == "mid 10-19" and tier_of(41) == "deep 20+"
        and tier_of(None) is None)

    # THE MUST-FAIL: an unlabelled coverage row may never be silently bucketed.
    # If this ever passes wrongly, every share above is computed over a
    # population that includes plays whose coverage nobody recorded.
    t = tally([mk("WR", 10, None)] * 50 + [mk("WR", 10, "MAN")] * 10,
              lambda r: r["cov"])
    chk("unlabelled coverage rows are dropped, not silently bucketed",
        t["MAN"]["n"] == 10 and None not in t)

    print("\n" + ("all passed" if not fails else "%d FAILURE(S)" % fails))
    return 1 if fails else 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--season", type=int, default=2025)
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()
    if a.selftest:
        sys.exit(selftest())

    import nflreadpy as nfl
    import polars as pl

    print("loading participation + pbp for %d ..." % a.season)
    part = nfl.load_participation([a.season])
    keep = ["nflverse_game_id", "play_id", "defense_man_zone_type"]
    if "defense_coverage_type" in part.columns:
        keep.append("defense_coverage_type")
    part = (part.select([pl.col(c) for c in keep])
                .with_columns(pl.col("play_id").cast(pl.Int64))
                .rename({"nflverse_game_id": "game_id"}))

    pbp = (nfl.load_pbp([a.season])
           .filter((pl.col("season_type") == "REG") & (pl.col("pass_attempt") == 1)
                   & pl.col("receiver_player_id").is_not_null())
           .select(pl.col("game_id"), pl.col("play_id").cast(pl.Int64),
                   pl.col("receiver_player_id"), pl.col("air_yards")))

    players = (nfl.load_players().select(pl.col("gsis_id"), pl.col("position"))
                 .drop_nulls("gsis_id"))
    pos_of = {r["gsis_id"]: r["position"] for r in players.iter_rows(named=True)}

    j = pbp.join(part, on=["game_id", "play_id"], how="inner")
    rows = []
    for r in j.iter_rows(named=True):
        rows.append({"pos": pos_of.get(r["receiver_player_id"]),
                     "air_yards": r["air_yards"],
                     "mz": (r.get("defense_man_zone_type") or "").upper() or None,
                     "cv": (r.get("defense_coverage_type") or "").upper() or None})
    print("joined targeted pass plays: %s" % format(len(rows), ","))
    if not rows:
        sys.exit("join produced nothing. participation may not cover this season.")

    print("\n" + "=" * 70)
    print("MAN vs ZONE   %d, league-wide" % a.season)
    print("=" * 70)
    mzseen = collections.Counter(r["mz"] for r in rows if r["mz"])
    print("  man/zone labels: %s" % ", ".join(
        "%s %s" % (k, format(v, ",")) for k, v in mzseen.most_common(6)))
    man_k = [k for k in mzseen if k.startswith("MAN")]
    zone_k = [k for k in mzseen if k.startswith("ZONE")]
    if man_k and zone_k:
        t = tally(rows, lambda r: "MAN" if r["mz"] in man_k
                  else ("ZONE" if r["mz"] in zone_k else None))
        report(t, "ZONE", "MAN", "zone", "MAN")
    else:
        print("  cannot split man/zone.")

    cvseen = collections.Counter(r["cv"] for r in rows if r["cv"])
    if cvseen:
        print("\n" + "=" * 70)
        print("COVER-2 vs EVERYTHING ELSE   %d, league-wide" % a.season)
        print("=" * 70)
        print("  coverage labels: %s" % ", ".join(
            "%s %s" % (k, format(v, ",")) for k, v in cvseen.most_common(10)))
        c2 = {k for k in cvseen if "COVER_2" in k or "COVER 2" in k or k == "2_MAN"}
        if c2:
            print("  counted as cover-2: %s" % ", ".join(sorted(c2)))
            t2 = tally(rows, lambda r: None if not r["cv"]
                       else ("C2" if r["cv"] in c2 else "REST"))
            report(t2, "REST", "C2", "other cov", "COVER-2")
        else:
            print("  no cover-2 label present; cannot isolate it.")

        # ⭐ EVERY SHELL, NOT JUST COVER-2 - added Sep 23 2026.
        # WHY: a real matchup read kept stalling on defences that play little
        # man AND little cover-2. New Orleans is 22.1% man and 15.3% cover-2,
        # so the two shells this file could measure covered barely a third of
        # their snaps and the honest answer was "I cannot say." Cover-3 and
        # cover-4 are in the same feed and were simply never split out.
        #
        # ⚠️ EACH SHELL IS COMPARED AGAINST ITS OWN "REST", so the baselines
        # differ between blocks and the changes are NOT additive across shells.
        # Same design the cover-2 block already uses; read one row at a time.
        for shell, n_shell in cvseen.most_common():
            if n_shell < MIN_SHELL_N or shell in c2:
                continue
            print("\n" + "=" * 70)
            print("%s vs EVERYTHING ELSE   %d, league-wide" % (shell, a.season))
            print("=" * 70)
            ts = tally(rows, lambda r, s=shell: None if not r["cv"]
                       else ("SHELL" if r["cv"] == s else "REST"))
            if ts["SHELL"]["n"] >= MIN_SHELL_N:
                report(ts, "REST", "SHELL", "other cov", shell)
            else:
                print("  only %s targets after the join; under the %s floor."
                      % (format(ts["SHELL"]["n"], ","), format(MIN_SHELL_N, ",")))
    else:
        print("\n  no defense_coverage_type in this release. man/zone only.")

    print("\n  DESCRIPTIVE OF %d. Nothing here is shown to repeat. Read the n."
          % a.season)


if __name__ == "__main__":
    main()
