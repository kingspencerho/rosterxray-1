#!/usr/bin/env python3
"""build-defense-scheme.py — what a DEFENCE actually does, from its own side.

-> grading/data/defense_scheme_<season>.json

CONTEXT ONLY, AND FOR scripts/matchup-brief.py. Nothing here reaches
analyzeRoster, analyzeRedraft, App.jsx or the AI prompt, and _meta records all
of it so a check can assert it.

WHY IT EXISTS
  matchup-brief.py prints two gaps AS GAPS, and CLAUDE.md calls the first "the
  highest-value data addition for P3":

    * no defence-side scheme profile. coverage_2025.json is man rate FACED BY A
      RECEIVER - an offence-side measurement wearing a defensive name.
    * nothing splits a defence by route DEPTH.

  This closes the first. The second is still open.

ONLY WHAT REPEATS IS EMITTED (measured: scripts/measure-defense-scheme.py,
2023>2024 and 2024>2025, n=32, bar r>=0.355)

    blitz_rate      0.622        cov_2_man       0.417
    cov_cover_1     0.598        cov_cover_2     0.389
    pressure_rate   0.510
    man_rate        0.462   <- reproduces the 0.462 banked Sep 1 2026 by a
                               different session through nflreadpy; this reads
                               the parquet with pyarrow and lands on the same
                               number.

  ⛔ EIGHT MORE WERE MEASURED AND DELIBERATELY NOT EMITTED. The reason a field
  was rejected is worth as much as the ones kept - same contract as
  ngs_receiving's _meta.not_emitted - because otherwise a future session re-adds
  one on intuition:

    cov_cover_0  0.304   cov_cover_6  0.119   box_mean     0.207
    cov_cover_3  0.292   cov_cover_4  0.109   cov_combo    0.033
    cov_cover_9  0.002   cov_blown   -0.131

⛔⛔ STICKY IS NOT USEFUL, AND THE CHAIN HERE IS THE WHOLE CAVEAT.
  A defence's man rate repeats at 0.462. What a RECEIVER does against man
  repeats at 0.161 - a coin flip, which is why ANALYST-REFERENCE section 2
  withholds that edge from the AI prompt entirely. So:

      "this defence plays man 41% of the time"        sticky
    x "your receiver gains Y against man"             coin flip
    = a start/sit recommendation                      NOISE

  The product is dominated by the noisy term. THIS FILE DESCRIBES A DEFENCE. It
  cannot support "start him against this coverage", and the brief must never
  present it that way.

⛔ THE 2026 TWIN IS BLOCKED, AND THE BLOCK IS REAL. Probed Sep 17 2026 with
  2023-25 as a control: participation parquet returns 200 for 2023, 2024 and
  2025 and 404 for 2026. ⚠️ Probe the PARQUET - the release ships parquet only,
  so a 404 on .csv.gz proves nothing and produces a false "still blocked".
  ANNUAL cadence; regenerate when nflverse publishes 2026.

⛔ NO nflreadpy, NO polars. build-routes.py and build-coverage.py import both
  and neither is installed here, which is why those two cannot be re-run on this
  machine. pyarrow reads the parquet directly.

THE DEFENCE IS DERIVED, NOT JOINED. participation carries possession_team and no
defensive team; nflverse_game_id encodes both (2025_01_DAL_NYG). Verified: 0 of
45,184 rows unresolvable, all 32 defences present, and the man/zone classified
count reproduces the 22,055 already banked.

USAGE
  python3 scripts/build-defense-scheme.py part_2025.parquet \
      grading/data/defense_scheme_2025.json 2025
  python3 scripts/build-defense-scheme.py --selftest
"""
import collections
import io
import json
import math
import os
import sys

BLITZ_RUSHERS = 5
MIN_PLAYS = 150
LABEL_SD = 1.0

EMIT = ("man_rate", "blitz_rate", "pressure_rate", "cov_cover_1",
        "cov_cover_2", "cov_2_man")

STICKINESS = {"blitz_rate": 0.622, "cov_cover_1": 0.598, "pressure_rate": 0.510,
              "man_rate": 0.462, "cov_2_man": 0.417, "cov_cover_2": 0.389}

NOT_EMITTED = {"cov_cover_0": 0.304, "cov_cover_3": 0.292, "cov_cover_9": 0.002,
               "cov_cover_6": 0.119, "cov_cover_4": 0.109, "box_mean": 0.207,
               "cov_combo": 0.033, "cov_blown": -0.131}

LABELS = {
    "man_rate": ("man-heavy", "zone-heavy"),
    "blitz_rate": ("blitz-heavy", "rarely blitzes"),
    "pressure_rate": ("pressures often", "little pressure"),
    "cov_cover_1": ("cover-1 heavy", "little cover-1"),
    "cov_cover_2": ("cover-2 heavy", "little cover-2"),
    "cov_2_man": ("2-man heavy", "little 2-man"),
}

COLS = ["nflverse_game_id", "possession_team", "defense_man_zone_type",
        "defense_coverage_type", "number_of_pass_rushers", "was_pressure"]


def defense_of(game_id, possession):
    if not game_id or not possession:
        return None
    parts = game_id.split("_")
    if len(parts) < 4:
        return None
    away, home = parts[2], parts[3]
    if possession == away:
        return home
    if possession == home:
        return away
    return None


def collect(path):
    import pyarrow.parquet as pq
    d = pq.read_table(path, columns=COLS).to_pydict()
    acc = collections.defaultdict(collections.Counter)
    unresolved = 0
    for i in range(len(d["nflverse_game_id"])):
        dfn = defense_of(d["nflverse_game_id"][i], d["possession_team"][i])
        if not dfn:
            unresolved += 1
            continue
        a = acc[dfn]
        mz = d["defense_man_zone_type"][i]
        if mz in ("MAN_COVERAGE", "ZONE_COVERAGE"):
            a["mz"] += 1
            if mz == "MAN_COVERAGE":
                a["man"] += 1
        cov = d["defense_coverage_type"][i]
        if cov:
            a["cov"] += 1
            a["cov_" + str(cov).lower()] += 1
        pr = d["number_of_pass_rushers"][i]
        if pr is not None:
            a["rush"] += 1
            if pr >= BLITZ_RUSHERS:
                a["blitz"] += 1
        wp = d["was_pressure"][i]
        if wp is not None:
            a["prs_n"] += 1
            if wp in (True, 1, "1", "TRUE", "True"):
                a["prs"] += 1
    return acc, unresolved


def rates_for(a):
    out = {}
    if a["mz"] >= MIN_PLAYS:
        out["man_rate"] = a["man"] / a["mz"]
    if a["rush"] >= MIN_PLAYS:
        out["blitz_rate"] = a["blitz"] / a["rush"]
    if a["prs_n"] >= MIN_PLAYS:
        out["pressure_rate"] = a["prs"] / a["prs_n"]
    if a["cov"] >= MIN_PLAYS:
        for m in ("cov_cover_1", "cov_cover_2", "cov_2_man"):
            out[m] = a[m] / a["cov"]
    return out


def mean_sd(xs):
    if not xs:
        return None, None
    m = sum(xs) / len(xs)
    if len(xs) < 2:
        return m, 0.0
    return m, math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1))


def build(acc, season):
    per = {t: rates_for(a) for t, a in acc.items()}
    league = {}
    for m in EMIT:
        vals = [v[m] for v in per.values() if m in v]
        mu, sd = mean_sd(vals)
        if mu is None:
            continue
        league[m] = {"mean": round(mu, 4), "sd": round(sd, 4), "n": len(vals)}

    teams = {}
    for t in sorted(per):
        row, a = {}, acc[t]
        for m in EMIT:
            if m not in per[t] or m not in league:
                continue
            v = per[t][m]
            sd = league[m]["sd"]
            rel = v - league[m]["mean"]
            # ⚠️ ONE SD EITHER SIDE OF THE LEAGUE, never against a round number.
            # Same convention build-teamtrends.py uses, and for the same reason:
            # these rates are not centred on anything meaningful in the abstract.
            lab = None
            if sd:
                if rel >= LABEL_SD * sd:
                    lab = LABELS[m][0]
                elif rel <= -LABEL_SD * sd:
                    lab = LABELS[m][1]
                else:
                    lab = "average"
            row[m] = round(v, 4)
            row[m + "_rel"] = round(rel, 4)
            row[m + "_label"] = lab
        row["plays"] = {"man_zone": a["mz"], "coverage": a["cov"],
                        "pass_rush": a["rush"], "pressure": a["prs_n"]}
        teams[t] = row

    return {
        "_meta": {
            "season": season,
            "source": "nflverse pbp_participation (parquet; there is no csv.gz asset)",
            "context_only": True,
            "scored": False,
            "reaches_ai_prompt": False,
            "consumer": "scripts/matchup-brief.py",
            "cadence": "annual",
            "min_plays": MIN_PLAYS,
            "blitz_rushers": BLITZ_RUSHERS,
            "label_sd": LABEL_SD,
            "league": league,
            "stickiness": STICKINESS,
            "not_emitted": NOT_EMITTED,
            "rules": {
                "emitted": ("only rates that repeat year over year at r>=0.355 "
                            "across 2023>2024 and 2024>2025, n=32 defences"),
                "descriptive": ("this describes what a DEFENCE did. It is not a "
                                "start/sit input: a defence's man rate repeats at "
                                "0.462 but what a RECEIVER does against man repeats "
                                "at 0.161, so the product is dominated by the noisy "
                                "term. Never present it as 'start him against this "
                                "coverage'."),
                "direction": ("these are properties of the defence being FACED - the "
                              "FPA Direction Rule applies, so read them for the "
                              "players opposing this team, never for its own."),
                "blocked_2026": ("participation parquet is 404 for 2026 as of "
                                 "Sep 17 2026 with 2023-25 returning 200 as a "
                                 "control. Probe the PARQUET, not csv.gz."),
            },
            "teams_covered": len(teams),
        },
        "teams": teams,
    }


def selftest():
    ok = True

    def t(label, cond):
        nonlocal ok
        print("  %s   %s" % ("ok  " if cond else "FAIL", label))
        if not cond:
            ok = False

    print("SELFTEST - build-defense-scheme.py\n")
    t("the defence derivation handles both sides",
      defense_of("2025_01_DAL_NYG", "DAL") == "NYG"
      and defense_of("2025_01_DAL_NYG", "NYG") == "DAL")
    t("an unknown possession team resolves to nothing rather than guessing",
      defense_of("2025_01_DAL_NYG", "KC") is None)
    t("a malformed game id resolves to nothing", defense_of("garbage", "DAL") is None)
    t("every emitted metric carries a measured stickiness",
      all(m in STICKINESS for m in EMIT))
    t("every emitted metric clears the noise bar",
      all(STICKINESS[m] >= 0.355 for m in EMIT))
    t("nothing below the bar is emitted",
      all(v < 0.355 for v in NOT_EMITTED.values()))
    t("the rejected fields are recorded with their r, not silently dropped",
      len(NOT_EMITTED) >= 8)
    t("every emitted metric has a label pair", all(m in LABELS for m in EMIT))

    a = collections.Counter({"mz": 200, "man": 82, "rush": 200, "blitz": 60,
                             "prs_n": 200, "prs": 70, "cov": 200,
                             "cov_cover_1": 40, "cov_cover_2": 30, "cov_2_man": 10})
    r = rates_for(a)
    t("a rate is computed against its OWN denominator",
      abs(r["man_rate"] - 0.41) < 1e-9 and abs(r["blitz_rate"] - 0.30) < 1e-9)
    thin = collections.Counter({"mz": 10, "man": 4})
    t("a thin sample emits no rate rather than a flattering one",
      "man_rate" not in rates_for(thin))
    print("\n%s" % ("all passed" if ok else "FAILURES"))
    return 0 if ok else 1


def main():
    if "--selftest" in sys.argv:
        sys.exit(selftest())
    if len(sys.argv) < 3:
        print(__doc__.strip().splitlines()[-4])
        sys.exit(2)
    src, out = sys.argv[1], sys.argv[2]
    season = int(sys.argv[3]) if len(sys.argv) > 3 else 2025
    acc, unresolved = collect(src)
    if unresolved:
        print("WARNING: %d rows had no resolvable defence" % unresolved)
    doc = build(acc, season)
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    # ⛔ newline="" - a text-mode write turns every line ending into CRLF on
    # Windows and the guard suite matches on literal newlines.
    with io.open(out, "w", encoding="utf-8", newline="") as fh:
        json.dump(doc, fh, indent=1, sort_keys=True)
        fh.write("\n")
    print("wrote %s: %d defences, season %d" % (out, doc["_meta"]["teams_covered"], season))


if __name__ == "__main__":
    main()
