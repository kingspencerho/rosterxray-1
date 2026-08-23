import React, { useState, useMemo } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { track } from '@vercel/analytics';
// 2025 per-player production metrics (target share, WOPR, HVT/gm, spike/dud week
// rates at half-PPR) built offline from nflverse pbp by scripts/build-player-metrics.py.
// Descriptive of LAST season's roles — SITUATIONS/RECENT_NEWS override for role changes.
import PLAYER_METRICS from './grading/data/player_metrics_2025.json';
// 2025 per-touch EFFICIENCY, rushing and receiving as SEPARATE axes (fantasy
// points over expected per carry / per target, plus NGS tracking ranks).
// PLAYER_METRICS measures opportunity; this measures what was done with it.
// Built by scripts/build-efficiency.py. The two axes are near-uncorrelated
// for RBs (r=+0.09) — never collapse them into one number.
import PLAYER_EFFICIENCY from './grading/data/player_efficiency_2025.json';
// Season-long strength of schedule per team per position, plus the delta vs
// the 2025 slate. Complements getMatchupTier, which is week-by-week only.
// Built by scripts/build-sos.py. rank 1 = EASIEST (inverse of the internal
// getMatchupTier rank — do not mix the two scales).
import SOS from './grading/data/sos_2026.json';
// Team scheme motion rates + per-receiver production split on motion snaps.
// ⚠️ PLAY-level flag: the offense used motion, NOT that this player moved.
// Built by scripts/build-motion.py. See that file's header before using.
import MOTION from './grading/data/motion_2025.json';
// RB aDOT + raw air yards, team RB air yards, and QB dropback conversion.
// Built by scripts/build-airyards.py from the Ben Gretch RB-air-yards
// framework. Identifies ACCESS to explosive plays, not expected volume —
// sits beside spike/nuclear rates in ceiling shape, never above role/volume.
import AIRYARDS from './grading/data/airyards_2025.json';

// ============ DATA ============

// Underdog ADP Jun 24 2026 - top picks for fuzzy matching
//
// PER-TABLE VINTAGE (added Aug 15 2026). There are THREE ADP tables, sourced
// separately, refreshed at different times. A single ADP_UPDATED stamp claimed
// one date produced all three, which is the same class of error the data-vintage
// footer rule already forbids: naming a date that did not produce the numbers is
// worse than naming none.
//
// Bump the entry for the table you touched, in the SAME edit that touches it.
// scripts/refresh-adp.py prints the exact source window to paste in here.
const ADP_VINTAGE = {
  standard:  { label: "Aug 16",  market: "Underdog half-PPR best ball" },  // FULL refresh from bestballteambuilder.com, validated at 0.00 mean error against nine values read off a live Underdog board
  superflex: { label: "Aug 20 (partial)", market: "Underdog superflex — projected order, not a measured market" },
  yahoo:     { label: "Aug 15",  market: "redraft half-PPR" },  // refreshed from FFC, 2,429 drafts, Aug 10-15 2026
};

// Resolve which table actually produced a given result's numbers. findPlayer
// picks the table off the same two fields, so this must stay in step with it.
const adpVintageFor = (result) => {
  if (!result) return ADP_VINTAGE.standard;
  if (result.mode === "redraft") return ADP_VINTAGE.yahoo;
  if (result.format === "superflex") return ADP_VINTAGE.superflex;
  return ADP_VINTAGE.standard;
};

// Back-compat alias. Describes ADP_DATA ONLY — never print it beside a redraft
// or superflex grade. Use adpVintageFor(analyzed) at any render site that can
// show more than one format.
const ADP_UPDATED = ADP_VINTAGE.standard.label;
const ADP_DATA = {
  "jahmyr gibbs": { adp: 1, pos: "RB", team: "DET" },
  "bijan robinson": { adp: 2, pos: "RB", team: "ATL" },
  "jamarr chase": { adp: 3, pos: "WR", team: "CIN" },
  "puka nacua": { adp: 4, pos: "WR", team: "LAR" },
  "jaxon smith njigba": { adp: 5, pos: "WR", team: "SEA" },
  "jsn": { adp: 5, pos: "WR", team: "SEA" },
  "jonathan taylor": { adp: 6, pos: "RB", team: "IND" },
  "christian mccaffrey": { adp: 7, pos: "RB", team: "SF" },
  "cmc": { adp: 7, pos: "RB", team: "SF" },
  "amon ra st brown": { adp: 8, pos: "WR", team: "DET" },
  "arsb": { adp: 8, pos: "WR", team: "DET" },
  "amon-ra st brown": { adp: 8, pos: "WR", team: "DET" },
  "ceedee lamb": { adp: 9, pos: "WR", team: "DAL" },
  "justin jefferson": { adp: 10, pos: "WR", team: "MIN" },
  "ashton jeanty": { adp: 11, pos: "RB", team: "LV" },
  "james cook": { adp: 12, pos: "RB", team: "BUF" },
  "saquon barkley": { adp: 13, pos: "RB", team: "PHI" },
  "omarion hampton": { adp: 14, pos: "RB", team: "LAC" },
  "devon achane": { adp: 15, pos: "RB", team: "MIA" },
  "achane": { adp: 15, pos: "RB", team: "MIA" },
  "kenneth walker iii": { adp: 16, pos: "RB", team: "KC" },
  "kenneth walker": { adp: 16, pos: "RB", team: "KC" },
  "chase brown": { adp: 17, pos: "RB", team: "CIN" },
  "derrick henry": { adp: 18, pos: "RB", team: "BAL" },
  "drake london": { adp: 19, pos: "WR", team: "ATL" },
  "aj brown": { adp: 20, pos: "WR", team: "NE" },
  "a.j. brown": { adp: 20, pos: "WR", team: "NE" },
  "brock bowers": { adp: 21, pos: "TE", team: "LV" },
  "nico collins": { adp: 22, pos: "WR", team: "HOU" },
  "george pickens": { adp: 23, pos: "WR", team: "DAL" },
  "jeremiyah love": { adp: 24, pos: "RB", team: "ARI" },
  "trey mcbride": { adp: 25, pos: "TE", team: "ARI" },
  "breece hall": { adp: 26, pos: "RB", team: "NYJ" },
  "devonta smith": { adp: 27, pos: "WR", team: "PHI" },
  "rashee rice": { adp: 28, pos: "WR", team: "KC" },
  "chris olave": { adp: 29, pos: "WR", team: "NO" },
  "travis etienne jr": { adp: 42.2, pos: "RB", team: "NO" },  // ADP refresh 2026-08-16: 30.0 -> 42.2 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "travis etienne": { adp: 42.2, pos: "RB", team: "NO" },  // ADP refresh 2026-08-16: 30.0 -> 42.2 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "malik nabers": { adp: 23.9, pos: "WR", team: "NYG" },  // ADP refresh 2026-08-16: 31.0 -> 23.9 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "kyren williams": { adp: 32, pos: "RB", team: "LAR" },
  "zay flowers": { adp: 33, pos: "WR", team: "BAL" },
  "josh allen": { adp: 34, pos: "QB", team: "BUF" },
  "tee higgins": { adp: 35, pos: "WR", team: "CIN" },
  "javonte williams": { adp: 36, pos: "RB", team: "DAL" },
  "ladd mcconkey": { adp: 37, pos: "WR", team: "LAC" },
  "tetairoa mcmillan": { adp: 38, pos: "WR", team: "CAR" },
  "garrett wilson": { adp: 39, pos: "WR", team: "NYJ" },
  "emeka egbuka": { adp: 31.6, pos: "WR", team: "TB" },  // ADP refresh 2026-08-16: 40.0 -> 31.6 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "josh jacobs": { adp: 41, pos: "RB", team: "GB" },
  "luther burden": { adp: 42, pos: "WR", team: "CHI" },
  "cam skattebo": { adp: 43, pos: "RB", team: "NYG" },
  "mike evans": { adp: 49.2, pos: "WR", team: "SF" },  // ADP refresh 2026-08-16: 44.0 -> 49.2 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "terry mclaurin": { adp: 45, pos: "WR", team: "WAS" },
  "colston loveland": { adp: 46, pos: "TE", team: "CHI" },
  "jaylen waddle": { adp: 38.4, pos: "WR", team: "DEN" },  // ADP refresh 2026-08-16: 47.0 -> 38.4 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "jameson williams": { adp: 48, pos: "WR", team: "DET" },
  "david montgomery": { adp: 49, pos: "RB", team: "HOU" },
  "davante adams": { adp: 50, pos: "WR", team: "LAR" },
  "treveyon henderson": { adp: 57.1, pos: "RB", team: "NE" },  // ADP refresh 2026-08-16: 51.0 -> 57.1 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "dandre swift": { adp: 52, pos: "RB", team: "CHI" },
  "d'andre swift": { adp: 52, pos: "RB", team: "CHI" },
  "bucky irving": { adp: 53, pos: "RB", team: "TB" },
  "quinshon judkins": { adp: 54, pos: "RB", team: "CLE" },
  "dj moore": { adp: 55, pos: "WR", team: "BUF" },
  "bhayshul tuten": { adp: 50.8, pos: "RB", team: "JAX" },  // ADP refresh 2026-08-16: 56.0 -> 50.8 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "tuten": { adp: 50.8, pos: "RB", team: "JAX" },  // Aug 16 2026: synced to "bhayshul tuten" (56 -> 50.8). The refresh writes the spelling its source prints; test-alias-adp-sync caught this one lagging.
  "lamar jackson": { adp: 57, pos: "QB", team: "BAL" },
  "christian watson": { adp: 58, pos: "WR", team: "GB" },
  "rome odunze": { adp: 59, pos: "WR", team: "CHI" },
  "carnell tate": { adp: 60, pos: "WR", team: "TEN" },
  "jadarian price": { adp: 61, pos: "RB", team: "SEA" },
  "brian thomas": { adp: 62, pos: "WR", team: "JAX" },
  "jordyn tyson": { adp: 63, pos: "WR", team: "NO" },
  "tyler warren": { adp: 64, pos: "TE", team: "IND" },
  "joe burrow": { adp: 65, pos: "QB", team: "CIN" },
  "jayden daniels": { adp: 66, pos: "QB", team: "WAS" },
  "marvin harrison": { adp: 67, pos: "WR", team: "ARI" },
  "marvin harrison jr": { adp: 67, pos: "WR", team: "ARI" },
  "drake maye": { adp: 68, pos: "QB", team: "NE" },
  "parker washington": { adp: 58.5, pos: "WR", team: "JAX" },  // ADP refresh 2026-08-16: 69.0 -> 58.5 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "caleb williams": { adp: 70, pos: "QB", team: "CHI" },
  "jalen hurts": { adp: 71, pos: "QB", team: "PHI" },
  "makai lemon": { adp: 81.3, pos: "WR", team: "PHI" },  // ADP refresh 2026-08-16: 72.0 -> 81.3 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "chuba hubbard": { adp: 93.4, pos: "RB", team: "CAR" },  // ADP refresh 2026-08-16: 73.0 -> 93.4 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "rhamondre stevenson": { adp: 74, pos: "RB", team: "NE" },
  "jaylen warren": { adp: 75, pos: "RB", team: "PIT" },
  "dk metcalf": { adp: 76, pos: "WR", team: "PIT" },
  "tony pollard": { adp: 77, pos: "RB", team: "TEN" },
  "alec pierce": { adp: 90, pos: "WR", team: "IND" },  // ADP refresh 2026-08-16: 53.8 -> 90.0 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "dak prescott": { adp: 79, pos: "QB", team: "DAL" },
  "quentin johnston": { adp: 74.6, pos: "WR", team: "LAC" },  // ADP refresh 2026-08-16: 80.0 -> 74.6 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "courtland sutton": { adp: 81, pos: "WR", team: "DEN" },
  "justin herbert": { adp: 82, pos: "QB", team: "LAC" },
  "tucker kraft": { adp: 83, pos: "TE", team: "GB" },
  "jayden reed": { adp: 84, pos: "WR", team: "GB" },
  "trevor lawrence": { adp: 85, pos: "QB", team: "JAX" },
  "rj harvey": { adp: 86, pos: "RB", team: "DEN" },
  "jordan addison": { adp: 87, pos: "WR", team: "MIN" },
  "rico dowdle": { adp: 88, pos: "RB", team: "PIT" },
  "chris godwin": { adp: 89, pos: "WR", team: "TB" },
  "patrick mahomes": { adp: 97.2, pos: "QB", team: "KC" },  // ADP refresh 2026-08-16: 90.0 -> 97.2 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "josh downs": { adp: 81.4, pos: "WR", team: "IND" },  // ADP refresh 2026-08-16: 91.0 -> 81.4 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "kyle monangai": { adp: 98.4, pos: "RB", team: "CHI" },  // ADP refresh 2026-08-16: 92.0 -> 98.4 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "blake corum": { adp: 93, pos: "RB", team: "LAR" },
  "michael wilson": { adp: 94, pos: "WR", team: "ARI" },
  "brock purdy": { adp: 101.6, pos: "QB", team: "SF" },  // ADP refresh 2026-08-16: 95.0 -> 101.6 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "jaxson dart": { adp: 97, pos: "QB", team: "NYG" },
  "sam laporta": { adp: 89.3, pos: "TE", team: "DET" },  // ADP refresh 2026-08-16: 98.0 -> 89.3 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "jk dobbins": { adp: 99, pos: "RB", team: "DEN" },
  "jakobi meyers": { adp: 114.4, pos: "WR", team: "JAX" },  // ADP refresh 2026-08-16: 100.0 -> 114.4 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "ricky pearsall": { adp: 101, pos: "WR", team: "SF" },
  "harold fannin": { adp: 102, pos: "TE", team: "CLE" },
  "matthew stafford": { adp: 108.3, pos: "QB", team: "LAR" },  // Aug 15 2026: read off a live Underdog board. The redraft source said 75.2 and flagged a -28.8 "anomaly" — it was the format offset, not staleness. This table was within 4.3 picks all along.
  "bo nix": { adp: 107, pos: "QB", team: "DEN" },
  "kyle pitts": { adp: 103.2, pos: "TE", team: "ATL" },  // Aug 15 2026: live Underdog board. Redraft source said 82.4 — format offset, not drift.
  "jared goff": { adp: 109, pos: "QB", team: "DET" },
  "matthew golden": { adp: 106.1, pos: "WR", team: "GB" },
  "kyler murray": { adp: 113.6, pos: "QB", team: "MIN" },  // ADP refresh 2026-08-16: 106.3 -> 113.6 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "jordan love": { adp: 116, pos: "QB", team: "GB" },  // ADP refresh 2026-08-16: 107.8 -> 116.0 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "michael pittman jr": { adp: 99.4, pos: "WR", team: "PIT" },  // ADP refresh 2026-08-16: 80.8 -> 99.4 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "michael pittman": { adp: 99.4, pos: "WR", team: "PIT" },  // ADP refresh 2026-08-16: 80.8 -> 99.4 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "xavier worthy": { adp: 104.6, pos: "WR", team: "KC" },  // ADP refresh 2026-08-16: 110.0 -> 104.6 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "chris rodriguez": { adp: 127, pos: "RB", team: "JAX" },  // ADP refresh 2026-08-16: 110.9 -> 127.0 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "tyler shough": { adp: 125.1, pos: "QB", team: "NO" },  // ADP refresh 2026-08-16: 112.5 -> 125.1 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "romeo doubs": { adp: 118.5, pos: "WR", team: "NE" },  // ADP refresh 2026-08-16: 113.4 -> 118.5 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "jacory croskey merritt": { adp: 108.6, pos: "RB", team: "WAS" },  // ADP refresh 2026-08-16: 114.1 -> 108.6 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "kc concepcion": { adp: 114.8, pos: "WR", team: "CLE" },
  "baker mayfield": { adp: 121.5, pos: "QB", team: "TB" },  // ADP refresh 2026-08-16: 115.7 -> 121.5 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "george kittle": { adp: 116.7, pos: "TE", team: "SF" },
  "wandale robinson": { adp: 111.2, pos: "WR", team: "TEN" },  // ADP refresh 2026-08-16: 86.6 -> 111.2 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "kenneth gainwell": { adp: 117.6, pos: "RB", team: "TB" },
  "kenny gainwell": { adp: 117.6, pos: "RB", team: "TB" },  // Aug 16 2026: synced to "kenneth gainwell" (109.3 -> 117.6). The refresh writes the spelling its source prints; test-alias-adp-sync caught this one lagging.
  "aaron jones": { adp: 126.9, pos: "RB", team: "MIN" },  // Aug 15 2026: live Underdog board. Redraft source said 98.2 — format offset, not drift.
  "jordan mason": { adp: 103.5, pos: "RB", team: "MIN" },  // ADP refresh 2026-08-16: 121.9 -> 103.5 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "rachaad white": { adp: 113.6, pos: "RB", team: "WAS" },  // ADP refresh 2026-08-16: 122.9 -> 113.6 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "jayden higgins": { adp: 123.9, pos: "WR", team: "HOU" },
  "jake ferguson": { adp: 133.7, pos: "TE", team: "DAL" },  // ADP refresh 2026-08-16: 124.3 -> 133.7 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "travis kelce": { adp: 124.3, pos: "TE", team: "KC" },
  "jonathon brooks": { adp: 80.1, pos: "RB", team: "CAR" },  // ADP refresh 2026-08-16: 124.8 -> 80.1 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "khalil shakir": { adp: 131.0, pos: "WR", team: "BUF" },  // Aug 15 2026: live Underdog board. Redraft source said 104.0 — format offset, not drift.
  "mark andrews": { adp: 127.3, pos: "TE", team: "BAL" },
  "tyrone tracy": { adp: 136.3, pos: "RB", team: "NYG" },  // ADP refresh 2026-08-16: 130.3 -> 136.3 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "dalton kincaid": { adp: 123.9, pos: "TE", team: "BUF" },  // ADP refresh 2026-08-16: 131.3 -> 123.9 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "malik willis": { adp: 131.7, pos: "QB", team: "MIA" },
  "jalen coker": { adp: 131.9, pos: "WR", team: "CAR" },
  "isaiah likely": { adp: 125.4, pos: "TE", team: "NYG" },  // ADP refresh 2026-08-16: 133.3 -> 125.4 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "dallas goedert": { adp: 135.3, pos: "TE", team: "PHI" },
  "rashid shaheed": { adp: 136.8, pos: "WR", team: "SEA" },
  "oronde gadsden": { adp: 165.3, pos: "TE", team: "LAC" },  // ADP refresh 2026-08-16: 137.0 -> 165.3 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "sam darnold": { adp: 137.4, pos: "QB", team: "SEA" },
  "cam ward": { adp: 146.3, pos: "QB", team: "TEN" },  // ADP refresh 2026-08-16: 138.4 -> 146.3 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "omar cooper": { adp: 153.4, pos: "WR", team: "NYJ" },  // ADP refresh 2026-08-16: 139.9 -> 153.4 (Underdog best ball, 0 drafts, live to 2026-08-16)
  // Refreshed Aug 9 2026 off a live Underdog board: 141.1 -> 103.1. The Aug 5 WAS
  // signing moved him ~38 picks, and the stale value was producing a false "REACH-48"
  // on a pick that was near ADP. ADP_SUPERFLEX and ADP_YAHOO below still carry
  // pre-signing snapshots — no live capture exists for those markets yet.
  "stefon diggs": { adp: 103.1, pos: "WR", team: "WAS" }, // signed WAS 1yr/$12M Aug 5 2026
  "cj stroud": { adp: 141.4, pos: "QB", team: "HOU" },
  "jonah coleman": { adp: 154.4, pos: "RB", team: "DEN" },  // ADP refresh 2026-08-16: 141.8 -> 154.4 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "travis hunter": { adp: 147.2, pos: "WR", team: "JAX" },  // ADP refresh 2026-08-16: 142.0 -> 147.2 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "jalen mcmillan": { adp: 154.7, pos: "WR", team: "TB" },  // ADP refresh 2026-08-16: 144.5 -> 154.7 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "keaton mitchell": { adp: 131, pos: "RB", team: "LAC" },  // ADP refresh 2026-08-16: 145.0 -> 131.0 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "daniel jones": { adp: 146.2, pos: "QB", team: "IND" },
  "jauan jennings": { adp: 160.6, pos: "WR", team: "MIN" },  // ADP refresh 2026-08-16: 146.9 -> 160.6 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "kenyon sadiq": { adp: 176.1, pos: "TE", team: "NYJ" },  // ADP refresh 2026-08-16: 147.7 -> 176.1 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "woody marks": { adp: 141.2, pos: "RB", team: "HOU" },  // ADP refresh 2026-08-16: 149.0 -> 141.2 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "hunter henry": { adp: 150.2, pos: "TE", team: "NE" },
  "isiah pacheco": { adp: 165.5, pos: "RB", team: "DET" },  // ADP refresh 2026-08-16: 150.6 -> 165.5 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "brenton strange": { adp: 153.0, pos: "TE", team: "JAX" },
  "chig okonkwo": { adp: 143.8, pos: "TE", team: "WAS" },  // ADP refresh 2026-08-16: 153.2 -> 143.8 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "bryce young": { adp: 161.7, pos: "QB", team: "CAR" },  // ADP refresh 2026-08-16: 153.9 -> 161.7 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "juwan johnson": { adp: 155.5, pos: "TE", team: "NO" },
  "jalen nailor": { adp: 147.5, pos: "WR", team: "LV" },  // ADP refresh 2026-08-16: 156.7 -> 147.5 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "tre tucker": { adp: 157.3, pos: "WR", team: "LV" },
  "zach charbonnet": { adp: 157.8, pos: "RB", team: "SEA" },
  "tyler allgeier": { adp: 149.3, pos: "RB", team: "ARI" },  // ADP refresh 2026-08-16: 159.2 -> 149.3 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "antonio williams": { adp: 207.4, pos: "WR", team: "WAS" },  // ADP refresh 2026-08-16: 160.1 -> 207.4 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "denzel boston": { adp: 140.5, pos: "WR", team: "CLE" },  // ADP refresh 2026-08-16: 161.3 -> 140.5 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "tyjae spears": { adp: 157.5, pos: "RB", team: "TEN" },  // ADP refresh 2026-08-16: 162.8 -> 157.5 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "tj hockenson": { adp: 169.5, pos: "TE", team: "MIN" },  // ADP refresh 2026-08-16: 163.9 -> 169.5 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "dezhaun stribling": { adp: 130.7, pos: "WR", team: "SF" },  // ADP refresh 2026-08-16: 137.3 -> 130.7 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "stribling": { adp: 130.7, pos: "WR", team: "SF" },  // Aug 16 2026: synced to "dezhaun stribling" (137.3 -> 130.7). The refresh writes the spelling its source prints; test-alias-adp-sync caught this one lagging.
  "brian robinson": { adp: 184, pos: "RB", team: "ATL" },  // ADP refresh 2026-08-16: 165.4 -> 184.0 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "fernando mendoza": { adp: 186, pos: "QB", team: "LV" },  // ADP refresh 2026-08-16: 167.2 -> 186.0 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "dylan sampson": { adp: 176.5, pos: "RB", team: "CLE" },  // ADP refresh 2026-08-16: 167.6 -> 176.5 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "isaac teslaa": { adp: 176.6, pos: "WR", team: "DET" },  // ADP refresh 2026-08-16: 168.9 -> 176.6 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "deebo samuel": { adp: 127.1, pos: "WR", team: "SF" },  // ADP refresh 2026-08-16: 97.3 -> 127.1 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "aj barner": { adp: 177.3, pos: "TE", team: "SEA" },  // ADP refresh 2026-08-16: 170.3 -> 177.3 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "dalton schultz": { adp: 171.3, pos: "TE", team: "HOU" },
  "nicholas singleton": { adp: 203.4, pos: "RB", team: "TEN" },  // ADP refresh 2026-08-16: 173.9 -> 203.4 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "brandon aiyuk": { adp: 215.9, pos: "WR", team: "SF" },  // ADP refresh 2026-08-16: 175.3 -> 215.9 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "calvin ridley": { adp: 195.7, pos: "WR", team: "TEN" },
  "elic ayomanor": { adp: 215.7, pos: "WR", team: "TEN" },  // added Aug 15 2026. He was in ADP_YAHOO ONLY, so he did not resolve in best ball at all — a silent drop from any roster containing him. Value is a real Underdog quote off a live board.  // Aug 15 2026: live Underdog board. The redraft source said 133.8 and would have moved him 61.9 picks the WRONG WAY.
  "jacoby brissett": { adp: 197.9, pos: "QB", team: "ARI" },  // ADP refresh 2026-08-16: 177.8 -> 197.9 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "tank bigsby": { adp: 151.6, pos: "RB", team: "PHI" },  // ADP refresh 2026-08-16: 178.4 -> 151.6 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "geno smith": { adp: 189.4, pos: "QB", team: "NYJ" },  // ADP refresh 2026-08-16: 178.9 -> 189.4 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "jerry jeudy": { adp: 190.3, pos: "WR", team: "CLE" },  // Aug 15 2026: live Underdog board. The redraft source said 133.7 and would have moved him 56.6 picks the WRONG WAY — he goes LATER in best ball, not earlier.
  "gunnar helm": { adp: 189.1, pos: "TE", team: "TEN" },  // ADP refresh 2026-08-16: 181.2 -> 189.1 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "alvin kamara": { adp: 162.1, pos: "RB", team: "NO" },  // Aug 15 2026: live Underdog board, 181.2 -> 162.1. THE ONLY ONE OF THE FIVE THAT GENUINELY MOVED. Note the market still prices him well ahead of what this repo's Etienne note implies.
  "germie bernard": { adp: 198.8, pos: "WR", team: "PIT" }, // Aug 9 live board: 182.5 -> 198.8 (drifted down)
  "emmett johnson": { adp: 211.1, pos: "RB", team: "KC" },  // ADP refresh 2026-08-16: 183.0 -> 211.1 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "ryan flournoy": { adp: 164.8, pos: "WR", team: "DAL" },  // ADP refresh 2026-08-16: 183.1 -> 164.8 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "mike washington": { adp: 192.0, pos: "RB", team: "LV" },
  "cade otton": { adp: 191.9, pos: "TE", team: "TB" },  // ADP refresh 2026-08-16: 185.4 -> 191.9 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "tre harris": { adp: 161.3, pos: "WR", team: "LAC" },  // ADP refresh 2026-08-16: 167.5 -> 161.3 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "aaron rodgers": { adp: 179.2, pos: "QB", team: "PIT" },  // ADP refresh 2026-08-16: 187.5 -> 179.2 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "chris bell": { adp: 214.4, pos: "WR", team: "MIA" },  // ADP refresh 2026-08-16: 188.5 -> 214.4 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "kaytron allen": { adp: 212.3, pos: "RB", team: "WAS" },  // ADP refresh 2026-08-16: 198.0 -> 212.3 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "david njoku": { adp: 212.2, pos: "TE", team: "LAC" },  // ADP refresh 2026-08-16: 190.3 -> 212.2 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "emanuel wilson": { adp: 215.9, pos: "RB", team: "SEA" },  // ADP refresh 2026-08-16: 192.4 -> 215.9 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "ted hurst": { adp: 199.3, pos: "WR", team: "TB" },  // ADP refresh 2026-08-16: 193.1 -> 199.3 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "eli stowers": { adp: 214.3, pos: "TE", team: "PHI" },  // ADP refresh 2026-08-16: 193.5 -> 214.3 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "pat freiermuth": { adp: 194.7, pos: "TE", team: "PIT" },
  "tyreek hill": { adp: 215.3, pos: "WR", team: "FA" },  // ADP refresh 2026-08-16: 195.7 -> 215.3 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "tank dell": { adp: 179.3, pos: "WR", team: "HOU" },  // Aug 15 2026: live Underdog board. Right direction from the redraft source but it overshot by 26.7 picks.
  "zachariah branch": { adp: 180.9, pos: "WR", team: "ATL" },  // ADP refresh 2026-08-16: 198.0 -> 180.9 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "darnell mooney": { adp: 211.4, pos: "WR", team: "NYG" },  // ADP refresh 2026-08-16: 198.7 -> 211.4 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "kayshon boutte": { adp: 200.1, pos: "WR", team: "NE" },
  "sean tucker": { adp: 200.1, pos: "RB", team: "TB" },
  "braelon allen": { adp: 212.1, pos: "RB", team: "NYJ" },  // ADP refresh 2026-08-16: 200.7 -> 212.1 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "ray davis": { adp: 188, pos: "RB", team: "BUF" },  // ADP refresh 2026-08-16: 203.1 -> 188.0 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "malik washington": { adp: 174.7, pos: "WR", team: "MIA" },  // ADP refresh 2026-08-16: 153.2 -> 174.7 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "darnell washington": { adp: 215.3, pos: "TE", team: "PIT" },  // ADP refresh 2026-08-16: 202.0 -> 215.3 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "terrance ferguson": { adp: 172.7, pos: "TE", team: "LAR" },  // ADP refresh 2026-08-16: 205.4 -> 172.7 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "eli raridon": { adp: 215.7, pos: "TE", team: "NE" },
  "kaelon black": { adp: 206.4, pos: "RB", team: "SF" },
  "mike gesicki": { adp: 207.8, pos: "TE", team: "CIN" },
  "dontayvion wicks": { adp: 169.3, pos: "WR", team: "PHI" },  // ADP refresh 2026-08-16: 208.0 -> 169.3 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "cooper kupp": { adp: 208.3, pos: "WR", team: "SEA" },
  "tua tagovailoa": { adp: 208.4, pos: "QB", team: "ATL" },
  "elijah sarratt": { adp: 214.7, pos: "WR", team: "BAL" },  // ADP refresh 2026-08-16: 208.6 -> 214.7 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "greg dulcich": { adp: 184.6, pos: "TE", team: "MIA" },
  "malachi fields": { adp: 210.0, pos: "WR", team: "NYG" },
  "darren waller": { adp: 209.8, pos: "TE", team: "CAR" },  // added Aug 18 2026, real Underdog quote off a live board. Signed with CAR Aug 12; he was in NO table before this, so a roster containing him silently lost a player.
  "troy franklin": { adp: 210.1, pos: "WR", team: "DEN" },
  "tory horton": { adp: 210.9, pos: "WR", team: "SEA" },
  // --- Added Aug 16 2026 by the cross-table coverage audit -------------------
  // Every player below already existed in ADP_SUPERFLEX and/or ADP_YAHOO and was
  // UNREACHABLE in best ball, so a roster containing one silently lost a player.
  // Values are ESTIMATES carried over from the table he was found in. That is
  // safe here and only here: adpFlags excludes adp >= 200 from reach/value logic
  // entirely, so for these players the number drives resolution and ordering and
  // nothing else. Replace any of them with a real Underdog quote when you see one.
  "trey benson": { adp: 200.0, pos: "RB", team: "ARI" },
  "samaje perine": { adp: 215.2, pos: "RB", team: "CIN" },  // ADP refresh 2026-08-16: 224.0 -> 215.2 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "chimere dike": { adp: 215.9, pos: "WR", team: "TEN" },  // ADP refresh 2026-08-16: 226.0 -> 215.9 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "dawson knox": { adp: 215.9, pos: "TE", team: "BUF" },  // ADP refresh 2026-08-16: 229.0 -> 215.9 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "jaylen wright": { adp: 215.3, pos: "RB", team: "MIA" },  // ADP refresh 2026-08-16: 233.0 -> 215.3 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "mason taylor": { adp: 215.6, pos: "TE", team: "NYJ" },  // ADP refresh 2026-08-16: 235.0 -> 215.6 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "ollie gordon": { adp: 215.8, pos: "RB", team: "MIA" },  // ADP refresh 2026-08-16: 237.0 -> 215.8 (Underdog best ball, 0 drafts, live to 2026-08-16)
  // Nickname keys. These exist in the other two tables, so a user typing "MHJ"
  // or "BTJ" resolved everywhere EXCEPT best ball. Same ADP as the full name.
  "mhj": { adp: 67, pos: "WR", team: "ARI" },
  "btj": { adp: 62, pos: "WR", team: "JAX" },
  // --------------------------------------------------------------------------
  "adonai mitchell": { adp: 170.2, pos: "WR", team: "NYJ" },  // ADP refresh 2026-08-16: 160.4 -> 170.2 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "kimani vidal": { adp: 203.3, pos: "RB", team: "LAC" },  // ADP refresh 2026-08-16: 212.1 -> 203.3 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "jake tonges": { adp: 212.3, pos: "TE", team: "SF" },
  "george holani": { adp: 212.5, pos: "RB", team: "SEA" },
  "demond claiborne": { adp: 212.6, pos: "RB", team: "MIN" },
  "tez johnson": { adp: 215.9, pos: "WR", team: "TB" },
  "chris brazzell": { adp: 213.0, pos: "WR", team: "CAR" },
  "deshaun watson": { adp: 213.0, pos: "QB", team: "CLE" },
  "michael penix": { adp: 213.3, pos: "QB", team: "ATL" },
  "pat bryant": { adp: 179, pos: "WR", team: "DEN" },  // ADP refresh 2026-08-16: 213.6 -> 179.0 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "skyler bell": { adp: 213.6, pos: "WR", team: "BUF" },
  "christian kirk": { adp: 213.7, pos: "WR", team: "SF" },
  "james conner": { adp: 213.9, pos: "RB", team: "ARI" },
  "colby parkinson": { adp: 214.1, pos: "TE", team: "LAR" },
  "rashod bateman": { adp: 201.1, pos: "WR", team: "BAL" },  // ADP refresh 2026-08-16: 133.2 -> 201.1 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "justice hill": { adp: 214.5, pos: "RB", team: "BAL" },
  "shedeur sanders": { adp: 214.6, pos: "QB", team: "CLE" },
  "jaydon blue": { adp: 170.1, pos: "RB", team: "DAL" },  // ADP refresh 2026-08-16: 214.7 -> 170.1 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "malik davis": { adp: 215.1, pos: "RB", team: "DAL" },
  "jakobi lane": { adp: 178.3, pos: "WR", team: "BAL" },  // ADP refresh 2026-08-16: 162.7 -> 178.3 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "jack bech": { adp: 214.8, pos: "WR", team: "LV" },
  // malik benson — ESTIMATED. FantasyPros confirms NO established ADP in any market
  // (2026 sixth-rounder, pick 195, only started drawing camp buzz in Aug). Anchored one
  // notch behind Jack Bech in every table rather than to an invented absolute, because
  // Bech is his DIRECT named competitor for the same WR3 job and is already priced in
  // all three. Re-anchor if he wins or loses that competition.
  "malik benson": { adp: 215.6, pos: "WR", team: "LV" },
  "keon coleman": { adp: 214.8, pos: "WR", team: "BUF" },
  "evan engram": { adp: 214.9, pos: "TE", team: "DEN" },
  "jordan james": { adp: 215.0, pos: "RB", team: "SF" },
  "jaylin noel": { adp: 215.0, pos: "WR", team: "HOU" },
  "caleb douglas": { adp: 200.7, pos: "WR", team: "MIA" },  // ADP refresh 2026-08-16: 215.0 -> 200.7 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "tyquan thornton": { adp: 215.1, pos: "WR", team: "KC" },
  "kirk cousins": { adp: 215.2, pos: "QB", team: "LV" },
  "brenen thompson": { adp: 215.3, pos: "WR", team: "LAC" },
  "adam randall": { adp: 215.3, pos: "RB", team: "BAL" },
  "carson beck": { adp: 215.3, pos: "QB", team: "ARI" },
  // 215.5 is a TIER placement, not a measured Underdog ADP — no Underdog number
  // for him was available when this was added (Aug 5 2026). He is priced against
  // this table's own deep-QB archetype: unresolved competitions and contingent
  // starters (Beck 215.3 ARI, Cousins 215.2 LV, Sanders 214.6 CLE, Penix 213.3
  // ATL). Added so the MIN hedge is draftable at all — without an ADP_DATA row
  // he silently fails to resolve in Underdog best ball. A pasted roster carrying
  // its own ADP overrides this per the ADP source-of-truth rule; replace with a
  // real number the first time one appears on a board.
  "jj mccarthy": { adp: 215.5, pos: "QB", team: "MIN" },
  // erick all — ESTIMATED, not a captured Underdog ADP. No best-ball ADP is published
  // for him anywhere (FantasyPros lists PPR 435 / TE60, ESPN 331 / TE48, best ball N/A).
  // Placed at the tail of this board on purpose: his raw 435 in a 216-pick pool would
  // make any real pick read as +200 VALUE and pollute the value tiers and pivot list.
  // Roster-supplied ADP overrides this anyway per the ADP Source of Truth rule.
  "erick all": { adp: 215.8, pos: "TE", team: "CIN" },
  "theo johnson": { adp: 215.4, pos: "TE", team: "NYG" },
  "andrei iosivas": { adp: 215.4, pos: "WR", team: "CIN" },
  "colbie young": { adp: 215.9, pos: "WR", team: "CIN" },  // added Aug 15 2026. Value read off a live Underdog board. Anchored beside Iosivas on purpose — they are competing for the same WR3 job, so the two should move together.
  // seth mcgowan — ESTIMATED. 2026 seventh-rounder (No. 237 overall) with no
  // established ADP; only started drawing camp buzz in Aug. Anchored beside
  // DJ Giddens, his DIRECT competitor for the IND RB2 job, rather than to an
  // invented absolute. Re-anchor if that competition resolves — as of Aug 14
  // McGowan holds the edge and Giddens has a hamstring.
  // drew allar — ESTIMATED, tail placement. 2026 third-rounder (No. 76) sitting
  // behind Aaron Rodgers with Will Howard and Mason Rudolph also in the room, so
  // there is no meaningful redraft/best-ball market for him. He is here so he
  // RESOLVES rather than surfacing as a notFound row, not because he is draftable.
  "drew allar": { adp: 215.7, pos: "QB", team: "PIT" },
  "seth mcgowan": { adp: 215.3, pos: "RB", team: "IND" },
  "dj giddens": { adp: 215.4, pos: "RB", team: "IND" },
  "zavion thomas": { adp: 215.4, pos: "WR", team: "CHI" },
  "marshawn lloyd": { adp: 162.5, pos: "RB", team: "GB" },  // ADP refresh 2026-08-16: 215.5 -> 162.5 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "devaughn vele": { adp: 215.5, pos: "WR", team: "NO" },
  "oscar delp": { adp: 215.5, pos: "TE", team: "NO" },
  "michael mayer": { adp: 215.5, pos: "TE", team: "LV" },
  "emari demercado": { adp: 215.9, pos: "RB", team: "KC" },
  "jahan dotson": { adp: 215.9, pos: "WR", team: "ATL" },
  // Cyrus Allen (added Jul 29 2026): 2026 5th-rounder (176 ovr, Cincinnati), no
  // established market yet. ADP here is a PLACEHOLDER at the deepest dart tier so
  // findPlayer resolves him — not a sourced value. Safe: the Late-Round ADP
  // Flattening Protocol (picks 160+) blocks any reach/value deduction at this
  // depth, and roster-supplied ADP overrides the table anyway. Replace when a
  // real ADP exists.
  "cyrus allen": { adp: 183.6, pos: "WR", team: "KC" },  // ADP refresh 2026-08-16: 215.9 -> 183.6 (Underdog best ball, 0 drafts, live to 2026-08-16)
  // --- Cross-table coverage fill, Aug 16 2026 -------------------------------
  // Each of these already existed in another ADP table and returned null here,
  // so a roster in this format silently lost the player. Values are ESTIMATES:
  // 1.10x carried across from superflex, where quarterbacks price much earlier.
  // Safe because adpFlags excludes adp >= 200 from reach/value logic entirely —
  // for these players the number drives resolution and ordering, nothing else.
  // Replace any of them with a real quote for THIS format when you see one.
  "justin fields": { adp: 216, pos: "QB", team: "KC" },  // ADP refresh 2026-08-16: 250.8 -> 216.0 (Underdog best ball, 0 drafts, live to 2026-08-16)
  "mac jones": { adp: 249.7, pos: "QB", team: "SF" },
  // -------------------------------------------------------------------------
};


// 4for4 Superflex ADP (12-team) — overall pick numbers.
// Refreshed Aug 1 2026 from a user-supplied 4for4 draft-board export (20 rounds).
// The prior snapshot had drifted a mean of 8.5 picks and — worse — carried five
// players on the WRONG TEAM (Walker SEA, Etienne JAX, Waddle MIA, Likely BAL,
// Shaheed NO), which silently pointed the matchup engine at the wrong defense for
// them in superflex format only. Teams are now reconciled against ADP_DATA.
// Deebo Samuel set to SF (board + confirmed 49ers signing); ADP_DATA still reads
// FA for him and needs the same correction.
//
// ALSO fixed: a class of entries that were never superflex-adjusted at all. In a
// real superflex market QBs sit ~61 picks EARLIER than the 1QB table and non-QBs
// ~16 picks LATER. McConkey (36.9 here vs 37.0 in ADP_DATA) and Brian Thomas
// (63 vs 62) were sitting at their 1QB prices, so they looked like 35-pick
// crashes in this refresh when they had simply never been priced for the format.
// When diffing this table against a new board, decompose the move against the
// +16 non-QB / -61 QB baseline before calling anything a market signal.
const ADP_SUPERFLEX = {
  "josh allen": { adp: 2, pos: "QB", team: "BUF" },
  "jahmyr gibbs": { adp: 3, pos: "RB", team: "DET" },
  "bijan robinson": { adp: 4, pos: "RB", team: "ATL" },
  "ja'marr chase": { adp: 4, pos: "WR", team: "CIN" },
  "jamarr chase": { adp: 4, pos: "WR", team: "CIN" },
  "puka nacua": { adp: 10, pos: "WR", team: "LAR" },
  "lamar jackson": { adp: 2, pos: "QB", team: "BAL" },
  "jaxon smith-njigba": { adp: 9, pos: "WR", team: "SEA" },
  "jsn": { adp: 9, pos: "WR", team: "SEA" },
  "christian mccaffrey": { adp: 14, pos: "RB", team: "SF" },
  "cmc": { adp: 14, pos: "RB", team: "SF" },
  "drake maye": { adp: 6, pos: "QB", team: "NE" },
  "jonathan taylor": { adp: 12, pos: "RB", team: "IND" },
  "jayden daniels": { adp: 24, pos: "QB", team: "WAS" },
  "joe burrow": { adp: 23, pos: "QB", team: "CIN" },
  "brock bowers": { adp: 41, pos: "TE", team: "LV" },
  "amon-ra st. brown": { adp: 11, pos: "WR", team: "DET" },
  "amon ra st brown": { adp: 11, pos: "WR", team: "DET" },
  "arsb": { adp: 11, pos: "WR", team: "DET" },
  "trey mcbride": { adp: 53, pos: "TE", team: "ARI" },
  "ashton jeanty": { adp: 23, pos: "RB", team: "LV" },
  "james cook": { adp: 28, pos: "RB", team: "BUF" },
  "jalen hurts": { adp: 8, pos: "QB", team: "PHI" },
  "de'von achane": { adp: 39, pos: "RB", team: "MIA" },
  "devon achane": { adp: 39, pos: "RB", team: "MIA" },
  "achane": { adp: 39, pos: "RB", team: "MIA" },
  "ceedee lamb": { adp: 26, pos: "WR", team: "DAL" },
  "justin jefferson": { adp: 34, pos: "WR", team: "MIN" },
  "caleb williams": { adp: 11, pos: "QB", team: "CHI" },
  "omarion hampton": { adp: 35, pos: "RB", team: "LAC" },
  "justin herbert": { adp: 12, pos: "QB", team: "LAC" },
  "jaxson dart": { adp: 24, pos: "QB", team: "NYG" },
  "saquon barkley": { adp: 29, pos: "RB", team: "PHI" },
  "chase brown": { adp: 27, pos: "RB", team: "CIN" },
  "trevor lawrence": { adp: 15, pos: "QB", team: "JAX" },
  "dak prescott": { adp: 13, pos: "QB", team: "DAL" },
  "kenneth walker": { adp: 36, pos: "RB", team: "KC" },
  "jeremiyah love": { adp: 48, pos: "RB", team: "ARI" },
  "drake london": { adp: 38, pos: "WR", team: "ATL" },
  "brock purdy": { adp: 20, pos: "QB", team: "SF" },
  "rashee rice": { adp: 59, pos: "WR", team: "KC" },
  "patrick mahomes": { adp: 16, pos: "QB", team: "KC" },
  "derrick henry": { adp: 31, pos: "RB", team: "BAL" },
  "colston loveland": { adp: 61, pos: "TE", team: "CHI" },
  "malik nabers": { adp: 62, pos: "WR", team: "NYG" },
  "matthew stafford": { adp: 25, pos: "QB", team: "LAR" },
  "bo nix": { adp: 21, pos: "QB", team: "DEN" },
  "josh jacobs": { adp: 54, pos: "RB", team: "GB" },
  "nico collins": { adp: 50, pos: "WR", team: "HOU" },
  "jared goff": { adp: 22, pos: "QB", team: "DET" },
  "breece hall": { adp: 48, pos: "RB", team: "NYJ" },
  "kyler murray": { adp: 30, pos: "QB", team: "MIN" },
  "george pickens": { adp: 55, pos: "WR", team: "DAL" },
  "chris olave": { adp: 57, pos: "WR", team: "NO" },
  "tyler shough": { adp: 33, pos: "QB", team: "NO" },
  "kyren williams": { adp: 51, pos: "RB", team: "LAR" },
  "baker mayfield": { adp: 32, pos: "QB", team: "TB" },
  "aj brown": { adp: 43, pos: "WR", team: "NE" },
  "a.j. brown": { adp: 43, pos: "WR", team: "NE" },
  "travis etienne": { adp: 49, pos: "RB", team: "NO" },
  "jordan love": { adp: 27, pos: "QB", team: "GB" },
  "tyler warren": { adp: 90, pos: "TE", team: "IND" },
  "javonte williams": { adp: 53, pos: "RB", team: "DAL" },
  "cam skattebo": { adp: 60, pos: "RB", team: "NYG" },
  "tetairoa mcmillan": { adp: 70, pos: "WR", team: "CAR" },
  "devonta smith": { adp: 58, pos: "WR", team: "PHI" },
  "malik willis": { adp: 58, pos: "QB", team: "MIA" },
  "quinshon judkins": { adp: 76, pos: "RB", team: "CLE" },
  "bucky irving": { adp: 78, pos: "RB", team: "TB" },
  "garrett wilson": { adp: 72, pos: "WR", team: "NYJ" },
  "tee higgins": { adp: 66, pos: "WR", team: "CIN" },
  "sam darnold": { adp: 42, pos: "QB", team: "SEA" },
  "zay flowers": { adp: 65, pos: "WR", team: "BAL" },
  "cj stroud": { adp: 45, pos: "QB", team: "HOU" },
  "c.j. stroud": { adp: 45, pos: "QB", team: "HOU" },
  "david montgomery": { adp: 61, pos: "RB", team: "HOU" },
  "daniel jones": { adp: 46, pos: "QB", team: "IND" },
  "emeka egbuka": { adp: 71, pos: "WR", team: "TB" },
  "treveyon henderson": { adp: 77, pos: "RB", team: "NE" },
  "harold fannin": { adp: 112, pos: "TE", team: "CLE" },
  "cam ward": { adp: 74, pos: "QB", team: "TEN" },
  "dandre swift": { adp: 69, pos: "RB", team: "CHI" },
  "d'andre swift": { adp: 69, pos: "RB", team: "CHI" },
  "ladd mcconkey": { adp: 72, pos: "WR", team: "LAC" },
  "tucker kraft": { adp: 107, pos: "TE", team: "GB" },
  "luther burden": { adp: 85, pos: "WR", team: "CHI" },
  "bhayshul tuten": { adp: 80, pos: "RB", team: "JAX" },
  "bryce young": { adp: 52, pos: "QB", team: "CAR" },
  "jaylen waddle": { adp: 84, pos: "WR", team: "DEN" },
  "davante adams": { adp: 86, pos: "WR", team: "LAR" },
  "kyle pitts": { adp: 114, pos: "TE", team: "ATL" },
  "jadarian price": { adp: 79, pos: "RB", team: "SEA" },
  "dj moore": { adp: 88, pos: "WR", team: "BUF" },
  "d.j. moore": { adp: 88, pos: "WR", team: "BUF" },
  "sam laporta": { adp: 99, pos: "TE", team: "DET" },
  "chuba hubbard": { adp: 102, pos: "RB", team: "CAR" },
  "terry mclaurin": { adp: 73, pos: "WR", team: "WAS" },
  "jameson williams": { adp: 75, pos: "WR", team: "DET" },
  "rome odunze": { adp: 95, pos: "WR", team: "CHI" },
  "mike evans": { adp: 96, pos: "WR", team: "SF" },
  "jacoby brissett": { adp: 83, pos: "QB", team: "ARI" },
  "christian watson": { adp: 93, pos: "WR", team: "GB" },
  "carnell tate": { adp: 89, pos: "WR", team: "TEN" },
  "fernando mendoza": { adp: 67, pos: "QB", team: "LV" },
  "rj harvey": { adp: 108, pos: "RB", team: "DEN" },
  "jaylen warren": { adp: 81, pos: "RB", team: "PIT" },
  "geno smith": { adp: 68, pos: "QB", team: "NYJ" },
  "travis kelce": { adp: 97, pos: "TE", team: "KC" },
  "george kittle": { adp: 119, pos: "TE", team: "SF" },
  "rhamondre stevenson": { adp: 91, pos: "RB", team: "NE" },
  "alec pierce": { adp: 83, pos: "WR", team: "IND" },  // Aug 15 2026: measured -24 live move applied to this table's scale
  "marvin harrison": { adp: 100, pos: "WR", team: "ARI" },
  "mhj": { adp: 100, pos: "WR", team: "ARI" },
  "jordyn tyson": { adp: 98, pos: "WR", team: "NO" },
  "jake ferguson": { adp: 138, pos: "TE", team: "DAL" },
  "tony pollard": { adp: 86, pos: "RB", team: "TEN" },
  "rico dowdle": { adp: 105, pos: "RB", team: "PIT" },
  "courtland sutton": { adp: 120, pos: "WR", team: "DEN" },
  "kyle monangai": { adp: 121, pos: "RB", team: "CHI" },
  "aaron rodgers": { adp: 63, pos: "QB", team: "PIT" },
  "dalton kincaid": { adp: 113, pos: "TE", team: "BUF" },
  "brian thomas": { adp: 96, pos: "WR", team: "JAX" },
  "btj": { adp: 96, pos: "WR", team: "JAX" },
  "kenneth gainwell": { adp: 111, pos: "RB", team: "TB" },
  "kenny gainwell": { adp: 111, pos: "RB", team: "TB" }, // same player — keep in sync with the line above
  "michael wilson": { adp: 130, pos: "WR", team: "ARI" },
  "dallas goedert": { adp: 149, pos: "TE", team: "PHI" },
  "dk metcalf": { adp: 114, pos: "WR", team: "PIT" },
  "isaiah likely": { adp: 144, pos: "TE", team: "NYG" },
  "jk dobbins": { adp: 108, pos: "RB", team: "DEN" },
  "j.k. dobbins": { adp: 108, pos: "RB", team: "DEN" },
  "parker washington": { adp: 106, pos: "WR", team: "JAX" },
  "mark andrews": { adp: 144, pos: "TE", team: "BAL" },
  "blake corum": { adp: 97, pos: "RB", team: "LAR" },
  "oronde gadsden": { adp: 156, pos: "TE", team: "LAC" },
  "makai lemon": { adp: 104, pos: "WR", team: "PHI" },
  "chris godwin": { adp: 124, pos: "WR", team: "TB" },
  "aaron jones": { adp: 130, pos: "RB", team: "MIN" },
  "jonathon brooks": { adp: 101, pos: "RB", team: "CAR" },
  "rachaad white": { adp: 113, pos: "RB", team: "WAS" },
  "jakobi meyers": { adp: 138, pos: "WR", team: "JAX" },
  "tua tagovailoa": { adp: 87, pos: "QB", team: "ATL" },
  "juwan johnson": { adp: 160, pos: "TE", team: "NO" },
  "kenyon sadiq": { adp: 164, pos: "TE", team: "NYJ" },
  "jordan addison": { adp: 140, pos: "WR", team: "MIN" },
  "michael pittman": { adp: 123, pos: "WR", team: "PIT" },  // Aug 15 2026: measured -28 live move applied to this table's scale
  "jacory croskey-merritt": { adp: 125, pos: "RB", team: "WAS" },
  "brenton strange": { adp: 144, pos: "TE", team: "JAX" },
  "jordan mason": { adp: 121, pos: "RB", team: "MIN" },
  "jayden reed": { adp: 115, pos: "WR", team: "GB" },
  "wandale robinson": { adp: 140, pos: "WR", team: "TEN" },  // Aug 15 2026: measured -31 live move applied to this table's scale
  "wan'dale robinson": { adp: 140, pos: "WR", team: "TEN" },  // Aug 15 2026: kept in step with the no-apostrophe key above — test-alias-adp-sync caught this one drifting
  "ricky pearsall": { adp: 137, pos: "WR", team: "SF" },
  "chig okonkwo": { adp: 146, pos: "TE", team: "WAS" }, // same player as "chigoziem okonkwo" below — keep in sync
  "josh downs": { adp: 118, pos: "WR", team: "IND" },
  "quentin johnston": { adp: 116, pos: "WR", team: "LAC" },
  "chris rodriguez": { adp: 145, pos: "RB", team: "JAX" },
  "deshaun watson": { adp: 151, pos: "QB", team: "CLE" },
  "zach charbonnet": { adp: 162, pos: "RB", team: "SEA" },
  "hunter henry": { adp: 163, pos: "TE", team: "NE" },
  "kc concepcion": { adp: 137, pos: "WR", team: "CLE" },
  "xavier worthy": { adp: 132, pos: "WR", team: "KC" },
  "romeo doubs": { adp: 145, pos: "WR", team: "NE" },
  "tj hockenson": { adp: 179, pos: "TE", team: "MIN" },
  "t.j. hockenson": { adp: 179, pos: "TE", team: "MIN" },
  "michael penix": { adp: 110, pos: "QB", team: "ATL" },
  "tyrone tracy": { adp: 134, pos: "RB", team: "NYG" },
  "khalil shakir": { adp: 142, pos: "WR", team: "BUF" },
  "matthew golden": { adp: 136, pos: "WR", team: "GB" },
  "woody marks": { adp: 150, pos: "RB", team: "HOU" },
  "jonah coleman": { adp: 176, pos: "RB", team: "DEN" },
  "tyler allgeier": { adp: 159, pos: "RB", team: "ARI" },
  "dalton schultz": { adp: 174, pos: "TE", team: "HOU" },
  "jayden higgins": { adp: 164, pos: "WR", team: "HOU" },
  "tyjae spears": { adp: 168, pos: "RB", team: "TEN" },
  "jalen coker": { adp: 148, pos: "WR", team: "CAR" },
  "isiah pacheco": { adp: 155, pos: "RB", team: "DET" },
  "stefon diggs": { adp: 158, pos: "WR", team: "WAS" }, // NE released him Mar 11, unsigned until WAS signed him 1yr/$12M Aug 5 2026
  "dylan sampson": { adp: 168, pos: "RB", team: "CLE" },
  "aj barner": { adp: 182, pos: "TE", team: "SEA" },
  "keaton mitchell": { adp: 143, pos: "RB", team: "LAC" },
  "gunnar helm": { adp: 186, pos: "TE", team: "TEN" },
  "kirk cousins": { adp: 174, pos: "QB", team: "LV" },
  "rashid shaheed": { adp: 166, pos: "WR", team: "SEA" },
  "alvin kamara": { adp: 178, pos: "RB", team: "NO" },  // Aug 15 2026: measured -19.1 live move applied to this table's scale
  "cade otton": { adp: 192, pos: "TE", team: "TB" },
  "eli stowers": { adp: 203, pos: "TE", team: "PHI" },
  "jalen mcmillan": { adp: 171, pos: "WR", team: "TB" },
  "emmett johnson": { adp: 195, pos: "RB", team: "KC" },
  "omar cooper": { adp: 165, pos: "WR", team: "NYJ" },
  "travis hunter": { adp: 177, pos: "WR", team: "JAX" },
  "shedeur sanders": { adp: 160, pos: "QB", team: "CLE" },
  "jauan jennings": { adp: 175, pos: "WR", team: "MIN" },
  "nicholas singleton": { adp: 208, pos: "RB", team: "TEN" },
  "pat freiermuth": { adp: 190, pos: "TE", team: "PIT" },
  "david njoku": { adp: 219, pos: "TE", team: "LAC" },
  "emanuel wilson": { adp: 180.0, pos: "RB", team: "SEA" },
  "brian robinson": { adp: 169, pos: "RB", team: "ATL" },
  "kaytron allen": { adp: 183, pos: "RB", team: "WAS" },
  "denzel boston": { adp: 178, pos: "WR", team: "CLE" },
  "deebo samuel": { adp: 114, pos: "WR", team: "SF" },  // Aug 15 2026: measured -73 live move applied to this table's scale (post-SF-signing)
  "terrance ferguson": { adp: 191, pos: "TE", team: "LAR" },
  "eli raridon": { adp: 224, pos: "TE", team: "NE" },
  "mike washington": { adp: 206, pos: "RB", team: "LV" },
  "greg dulcich": { adp: 189, pos: "TE", team: "MIA" },
  "tre tucker": { adp: 185, pos: "WR", team: "LV" },
  "braelon allen": { adp: 211, pos: "RB", team: "NYJ" },
  "jalen nailor": { adp: 180, pos: "WR", team: "LV" },
  "antonio williams": { adp: 199, pos: "WR", team: "WAS" },
  "brandon aiyuk": { adp: 192.0, pos: "WR", team: "SF" },
  "jerry jeudy": { adp: 193, pos: "WR", team: "CLE" },
  "tank bigsby": { adp: 170, pos: "RB", team: "PHI" },
  "justice hill": { adp: 214, pos: "RB", team: "BAL" },
  "jake tonges": { adp: 223, pos: "TE", team: "SF" },
  "chris bell": { adp: 232, pos: "WR", team: "MIA" },
  "james conner": { adp: 234, pos: "RB", team: "ARI" },
  "tank dell": { adp: 213, pos: "WR", team: "HOU" },
  "de'zhaun stribling": { adp: 198, pos: "WR", team: "SF" },
  "dezhaun stribling": { adp: 198, pos: "WR", team: "SF" },
  "stribling": { adp: 198, pos: "WR", team: "SF" },
  "isaac teslaa": { adp: 199, pos: "WR", team: "DET" },
  "mike gesicki": { adp: 235, pos: "TE", team: "CIN" },
  "kimani vidal": { adp: 212, pos: "RB", team: "LAC" },
  "evan engram": { adp: 190, pos: "TE", team: "DEN" },
  "demond claiborne": { adp: 214, pos: "RB", team: "MIN" },
  "jordan james": { adp: 229, pos: "RB", team: "SF" },
  "calvin ridley": { adp: 200, pos: "WR", team: "TEN" },
  "elic ayomanor": { adp: 236, pos: "WR", team: "TEN" },  // added Aug 15 2026 — was missing from this table too. Anchored ~20 picks behind Ridley, the gap measured in ADP_DATA.
  "colby parkinson": { adp: 204, pos: "TE", team: "LAR" },
  "darnell mooney": { adp: 220, pos: "WR", team: "NYG" },
  "carson beck": { adp: 207, pos: "QB", team: "ARI" },
  "tyreek hill": { adp: 211.0, pos: "WR", team: "FA" },
  "ray davis": { adp: 181, pos: "RB", team: "BUF" },
  "kaelon black": { adp: 222, pos: "RB", team: "SF" },
  "tre' harris": { adp: 196, pos: "WR", team: "LAC" },
  "ryan flournoy": { adp: 166, pos: "WR", team: "DAL" },
  "germie bernard": { adp: 206, pos: "WR", team: "PIT" },
  "kayshon boutte": { adp: 239, pos: "WR", team: "NE" },
  "sean tucker": { adp: 204, pos: "RB", team: "TB" },
  "mason taylor": { adp: 235, pos: "TE", team: "NYJ" },
  "adonai mitchell": { adp: 144, pos: "WR", team: "NYJ" },  // Aug 15 2026: measured -50 live move applied to this table's scale
  "ted hurst": { adp: 210, pos: "WR", team: "TB" },
  "malik washington": { adp: 201, pos: "WR", team: "MIA" },  // Aug 15 2026: measured -50 live move applied to this table's scale
  "darnell washington": { adp: 228, pos: "TE", team: "PIT" },
  "theo johnson": { adp: 236, pos: "TE", team: "NYG" },
  "zachariah branch": { adp: 198, pos: "WR", team: "ATL" },
  "jaylen wright": { adp: 233, pos: "RB", team: "MIA" },
  "christian kirk": { adp: 231, pos: "WR", team: "SF" },
  "samaje perine": { adp: 224, pos: "RB", team: "CIN" },
  "justin fields": { adp: 228.0, pos: "QB", team: "KC" },
  "dawson knox": { adp: 229.0, pos: "TE", team: "BUF" },
  "keenan allen": { adp: 233, pos: "WR", team: "FA" },
  "troy franklin": { adp: 231.0, pos: "WR", team: "DEN" },
  "cooper kupp": { adp: 226, pos: "WR", team: "SEA" },
  "dontayvion wicks": { adp: 221, pos: "WR", team: "PHI" },
  "jack bech": { adp: 234.0, pos: "WR", team: "LV" },
  "malik benson": { adp: 226, pos: "WR", team: "LV" }, // estimated, anchored to Bech — see ADP_DATA note
  "drew allar": { adp: 250.0, pos: "QB", team: "PIT" }, // estimated — see ADP_DATA note; superflex lifts rookie QBs but he is still QB3+
  "seth mcgowan": { adp: 245.0, pos: "RB", team: "IND" }, // estimated — see ADP_DATA note (no Giddens entry in this table to anchor to)
  "malachi fields": { adp: 225, pos: "WR", team: "NYG" },
  "jaydon blue": { adp: 182, pos: "RB", team: "DAL" },
  "malik davis": { adp: 237.0, pos: "RB", team: "DAL" },
  "ollie gordon": { adp: 236, pos: "RB", team: "MIA" },
  "cyrus allen": { adp: 237, pos: "WR", team: "KC" },   // placeholder, see ADP_DATA note
  "eli heidenreich": { adp: 287.0, pos: "RB", team: "PIT" },
  "heidenreich": { adp: 287.0, pos: "RB", team: "PIT" },

  // Added Aug 1 2026 from the 4for4 superflex board refresh — absent from the
  // previous snapshot entirely.
  "chigoziem okonkwo": { adp: 146, pos: "TE", team: "WAS" },
  "marshawn lloyd": { adp: 184, pos: "RB", team: "GB" },
  "rashod bateman": { adp: 222, pos: "WR", team: "BAL" }, // Aug 15 2026: measured -81 live move applied to this table's scale
  "jakobi lane": { adp: 221, pos: "WR", team: "BAL" }, // added Aug 15 2026 — was MISSING from this table, so he silently failed to resolve in superflex. Anchored ~29 picks behind Bateman, the measured live gap.
  "george holani": { adp: 202, pos: "RB", team: "SEA" },
  "mac jones": { adp: 238, pos: "QB", team: "SF" },
  "pat bryant": { adp: 216, pos: "WR", team: "DEN" },
  "keon coleman": { adp: 232, pos: "WR", team: "BUF" },
  "tyquan thornton": { adp: 234, pos: "WR", team: "KC" },
  "jj mccarthy": { adp: 205, pos: "QB", team: "MIN" },
  "jaylin noel": { adp: 240, pos: "WR", team: "HOU" },
  "erick all": { adp: 242, pos: "TE", team: "CIN" }, // estimated tail placement — see ADP_DATA note
  "colbie young": { adp: 244, pos: "WR", team: "CIN" }, // added Aug 15 2026 — estimated tail placement, Iosivas is absent from this table so anchored to the CIN tail
  // --- Cross-table coverage fill, Aug 16 2026 -------------------------------
  // Each of these already existed in another ADP table and returned null here,
  // so a roster in this format silently lost the player. Values are ESTIMATES:
  // 1.10x the ADP_DATA value — the measured tail ratio across four known pairs (All 215.8->242, Benson 215.6->238, Young 215.9->244, Ayomanor 215.7->236).
  // Safe because adpFlags excludes adp >= 200 from reach/value logic entirely —
  // for these players the number drives resolution and ordering, nothing else.
  // Replace any of them with a real quote for THIS format when you see one.
  "adam randall": { adp: 236.8, pos: "RB", team: "BAL" },
  "andrei iosivas": { adp: 236.9, pos: "WR", team: "CIN" },
  "brenen thompson": { adp: 236.8, pos: "WR", team: "LAC" },
  "caleb douglas": { adp: 236.5, pos: "WR", team: "MIA" },
  "chimere dike": { adp: 248.6, pos: "WR", team: "TEN" },
  "chris brazzell": { adp: 234.3, pos: "WR", team: "CAR" },
  "devaughn vele": { adp: 239, pos: "WR", team: "NO" },
  "dj giddens": { adp: 236.9, pos: "RB", team: "IND" },
  "elijah sarratt": { adp: 229.5, pos: "WR", team: "BAL" },
  "emari demercado": { adp: 237.5, pos: "RB", team: "KC" },
  "jahan dotson": { adp: 237.5, pos: "WR", team: "ATL" },
  "michael mayer": { adp: 237.1, pos: "TE", team: "LV" },
  "oscar delp": { adp: 237.1, pos: "TE", team: "NO" },
  "skyler bell": { adp: 235, pos: "WR", team: "BUF" },
  "tez johnson": { adp: 237.5, pos: "WR", team: "TB" },
  "tory horton": { adp: 232, pos: "WR", team: "SEA" },
  "trey benson": { adp: 220, pos: "RB", team: "ARI" },
  "zavion thomas": { adp: 236.9, pos: "WR", team: "CHI" },
  // -------------------------------------------------------------------------
  "darren waller": { adp: 231, pos: "TE", team: "CAR" },  // added Aug 18 2026 — estimated at this table's scale from a 209.8 best-ball quote
};

// Tournament configurations — week weights for grade rollup
const TOURNAMENTS = {
  main: { name: "General", weights: [1, 1, 1], note: "Balanced format · ceiling and floor both matter · no bad picks", format: "standard" },
  // Best Ball Mania VII (2026 season, read off the in-app rules Aug 6 2026 —
  // this config was previously the thinnest on the board, inferred rather than
  // sourced). $25 entry · 672,336 entries · $15M prizes · 10.8% rake · 18 rounds
  // · 12-man drafts · half-PPR, 4pt passing TD · 150 max entries.
  //
  //   R1 Qualifier  W1-14  56,028 groups of 12, 2 advance (16.7%)  672,336 -> 112,056
  //   R2 Quarter    W15     8,004 groups of 14, 1 advance ( 7.1%)  112,056 ->   8,004
  //   R3 Semi       W16       667 groups of 12, 1 advance ( 8.3%)    8,004 ->     667
  //   R4 Final      W17    one 667-person group                        667 ->       1
  //
  // TWO CORRECTIONS to the old [2, 1, 1]:
  // 1. W16 was weighted at HALF of W15. It is a 1-of-12 (8.3%) gate against
  //    W15's 1-of-14 (7.1%) — near-identical, and the two HARDEST weekly cuts
  //    on this entire board. Both now carry maximum weight. This is the same
  //    error that was corrected in puppy, in the opposite direction.
  // 2. No advanceWeight, despite BBM being the ONLY format here with a SEPARATE
  //    REGULAR-SEASON PRIZE POOL — the rules pay out on W1-14 before Round 2
  //    even starts. The playoff breakdown sums to $13.48M of the advertised
  //    $15M, so roughly $1.52M (10.1%) is paid for the qualifying round alone.
  //    1.75 = the 1.5 the other 2/12 qualifiers earn, plus that standalone pool.
  //
  // W17 stays BELOW the other formats' 2 on purpose. Reaching this final is a
  // 0.099% proposition from entry — 3.4x rarer than Puppy 3 and 5.6x rarer than
  // Pit Bull 2 — so W17 matchup quality is worth materially less in expectation
  // here even though the final holds 70.2% of the playoff pool and pays 148x
  // just to arrive. The binding constraint is surviving two ~8% gates back to back.
  bbm7: { name: "BBM VII", entries: "672.3k", weights: [2, 2, 1.5], advanceWeight: 1.75, note: "The two hardest weekly cuts anywhere — W15 1-of-14 and W16 1-of-12, back to back. Only format with a separate regular-season prize pool, so W1-14 pays on its own. Reaching the 667-seat final is a 0.099% shot but pays 148x", format: "standard" },
  // The Puppy 3 (2026 season, verified against the in-app rules Aug 5 2026).
  // $5 entry · 225,000 entries · $1M prizes · 11.1% rake · 18 rounds · 12-man drafts
  // · half-PPR, 4pt passing TD · roster QB1/RB2/WR3/TE1/FLEX1/BENCH10 · 150 max entries.
  //
  // Four rounds, and the group sizes are what set the weights:
  //   R1 Qualifier  W1-14   12-man groups, 2 advance (16.7%)  225,000 -> 37,500
  //   R2 Quarter    W15     10-man groups, 1 advance (10.0%)   37,500 ->  3,750
  //   R3 Semi       W16      5-man groups, 1 advance (20.0%)    3,750 ->    750
  //   R4 Final      W17     one 750-man group, all paid            750 ->      1
  //
  // TWO CORRECTIONS TO THE OLD ENTRY, both from reading the actual structure:
  // 1. W15 and W16 were weighted EQUALLY at 2. They are not equal — W16 (1-of-5)
  //    is exactly twice as easy to survive as W15 (1-of-10). W16 drops to 1.5.
  // 2. W17 was the LOWEST weight at 1.5, but **75.6% of the $1M pool is paid to the
  //    750 finalists** and the ladder is $5 -> $25 -> $400 -> $100k. Reaching W17 is
  //    an 80x jump, the largest in the tournament, and once there the entire spread
  //    from $400 to $100k is decided by that one week. W17 goes to 2.
  // advanceWeight 1.5 matches schnauzer because the R1 qualifier is structurally
  // IDENTICAL (12-man groups, 2 advance) and eliminates 83.3% of the field.
  puppy: { name: "The Puppy 3", entries: "225k", weights: [2, 1.5, 2], advanceWeight: 1.5, note: "W15 (1/10) is the hardest weekly gate and W16 (1/5) is twice as survivable — but 75.6% of the $1M pool goes to the 750 who reach W17, so the final is where the money is decided", format: "standard" },
  // Mini Schnauzer 2 (added Jul 31 2026). Structurally the inverse of Puppy: the
  // weekly gates are the SOFTEST Underdog runs (W15 2-of-10 = 20%, W16 2-of-8 = 25%)
  // while the 14-week qualifier (2-of-12 = 16.7%) is the hardest filter in the format.
  // All 310 finalists are paid but the curve is steep at the top (1st $10k, top 10 take
  // ~40% of the $100k), so EV concentrates almost entirely in W17 — hence the 2x.
  // advanceWeight 1.5 because the cumulative R1 round eliminates 83% of the field.
  schnauzer: { name: "Mini Schnauzer 2", entries: "37.2k", weights: [1.25, 1, 2], advanceWeight: 1.5, note: "Softest weekly cuts on Underdog (W15 2/10, W16 2/8) — the 14-week qualifier is the real filter, and W17's 310-seat final is where the money is", format: "standard" },
  // The Pit Bull 2 (2026 season, read off the in-app rules Aug 6 2026).
  // $20 entry · 28,080 entries · $500k prizes · 11% rake · 18 rounds · 12-man
  // drafts · half-PPR, 4pt passing TD · QB1/RB2/WR3/TE1/FLEX1/BENCH10.
  // MAX 10 ENTRIES — the lowest of any format here (Puppy allows 150), so this
  // is a low-portfolio format where a single build carries real weight.
  //
  //   R1 Qualifier  W1-14  2,340 groups of 12, 2 advance (16.7%)  28,080 -> 4,680
  //   R2 Quarter    W15      780 groups of  6, 1 advance (16.7%)   4,680 ->   780
  //   R3 Semi       W16      156 groups of  5, 1 advance (20.0%)     780 ->   156
  //   R4 Final      W17    one 156-person group                      156 ->     1
  //
  // ⚠️ UNDERDOG'S OWN RULES TEXT HAS A TYPO HERE — it says R3 is "156 6-person
  // Groups." It is 156 FIVE-person groups: 780/156 = 5, the advancement line
  // reads 1/5, and the group-size list says 5. Do not "correct" this to 6.
  //
  // WHY THE WEIGHTS SIT BETWEEN PUPPY AND SCHNAUZER: the gates are unusually
  // FLAT at 16.7 / 16.7 / 20 — no single week is a kill shot, unlike Puppy's
  // 10% W15. But the prize curve is the most top-heavy on the board: 77.5% of
  // the pool goes to the 156 finalists and **53.4% goes to the top TEN**, versus
  // 26.8% for Puppy's top ten. Same $100k first prize out of half the money.
  // So reaching the final is worth 25x, and everything above that needs a
  // monster W17 in a single 156-man group. W17 carries the load; W15 edges W16
  // only because 16.7% is tighter than 20%.
  // advanceWeight 1.5 matches puppy and schnauzer — the R1 qualifier is the
  // same 12-man, 2-advance structure and eliminates 83.3% of the field.
  pitbull: { name: "The Pit Bull 2", entries: "28.1k", weights: [1.5, 1.25, 2], advanceWeight: 1.5, note: "Flattest weekly gates on Underdog (W15 1/6, W16 1/5 — no kill-shot week), but the most top-heavy prize curve: 77.5% of the $500k reaches the 156-seat final and 53.4% goes to the top ten. Survive, then win W17 outright. Max 10 entries", format: "standard" },
  // The Frenchie 13 (added Aug 14 2026, read off the in-app rules).
  // $6 entry · 9,432 entries · $50k prizes · 11.6% rake · 18 rounds · 12-man
  // drafts · MAX 4 ENTRIES.
  //
  //   R1 Qualifier  W1-14  786 groups of 12, 3 advance (25.0%)  9,432 -> 2,358
  //   R2 Quarter    W15    393 groups of  6, 2 advance (33.3%)  2,358 ->   786
  //   R3 Semi       W16    131 groups of  6, 1 advance (16.7%)    786 ->   131
  //   R4 Final      W17    one 131-person group                    131 ->     1
  //
  // ⚠️ TWO ERRORS IN UNDERDOG'S RULES TEXT, do not copy either:
  //  1. The R2 line reads "393 entries in 2,358 6-person Groups" — the two
  //     numbers are REVERSED. It is 2,358 entries in 393 groups (786x3=2,358,
  //     2,358/6=393).
  //  2. The R4 line reads "a single1, 31-person Group" — it is a single
  //     131-PERSON group. The identical artifact appears in the Boxer rules
  //     page, so it is a template bug on their side, not a one-off.
  //
  // THE ONE W16-MAX CONFIG ON THE BOARD, and the reason is structural: W16 is
  // 1-of-6 (16.7%) while W15 is 2-of-6 (33.3%), so **W16 is exactly twice as
  // hard as W15**. Every other format here makes W15 the tighter gate; this is
  // the only inversion, so it is the only config where W15 < W16.
  // W17 also carries 2: the final is 131 seats — the SMALLEST on the board —
  // and 1st alone is $15k of $50k, a 30.0% first-prize share that is the most
  // concentrated anywhere (Pit Bull and Boxer are 20%, BBM 13.3%, Puppy 10%).
  // So this is the most winnable championship room in the portfolio.
  // advanceWeight 1.25: R1 is 3-of-12 (25%), softer than the 2-of-12 (16.7%)
  // that earns 1.5 elsewhere, and surviving it pays exactly the $6 entry back.
  frenchie: { name: "The Frenchie 13", entries: "9.4k", weights: [1.25, 2, 2], advanceWeight: 1.25, note: "The only format where W16 is the kill shot — 1-of-6, exactly TWICE as hard as its 2-of-6 W15. Smallest final on the board at 131 seats and the most top-heavy first prize anywhere (1st = 30% of the pool). Coast W15, win W16 outright, then win a 131-man room. Max 4 entries", format: "standard" },
  // The Boxer (added Aug 14 2026, read off the in-app rules).
  // $18 entry · 6,240 entries · $100k prizes · 11% rake · 18 rounds · 12-man
  // drafts · MAX 3 ENTRIES — the lowest portfolio of any format here.
  //
  //   R1 Qualifier  W1-14  520 groups of 12, 4 advance (33.3%)  6,240 -> 2,080
  //   R2 Quarter    W15    416 groups of  5, 2 advance (40.0%)  2,080 ->   832
  //   R3 Semi       W16    208 groups of  4, 2 advance (50.0%)    832 ->   416
  //   R4 Final      W17    one 416-person group                    416 ->     1
  //
  // ⚠️ Same "a single1, 31-person Group" artifact in their rules text. It is a
  // 416-SEAT final: the header says so, 832/2 = 416, and the prize table pays
  // down to 416th.
  //
  // BY FAR THE SOFTEST GATES ON THE BOARD — every other format advances 2-of-12
  // in R1; this advances 4-of-12, and W16 is a literal coin flip. P(reach final)
  // is 6.67%, one in fifteen: 12x easier than Pit Bull and 67x easier than BBM.
  // BUT ARRIVING IS WORTH ALMOST NOTHING. The ladder on $18 is $9 -> $18 -> $50,
  // so surviving the 14-week qualifier LOSES money and clearing W15 is exact
  // break-even. Meanwhile the top ten take 49.7% of the pool and 1st is 20%.
  // Hence the most W17-tilted weights here and the LOWEST advanceWeight (0.75):
  // a 33.3% R1 gate that repays half your entry barely deserves modeling.
  // Deliberately NOT in the uniqueness-leverage branch — 6,240 entries is a
  // small field, so best-player-available beats contrarian differentiation.
  boxer: { name: "The Boxer", entries: "6.2k", weights: [1, 0.75, 2.5], advanceWeight: 0.75, note: "Softest gates anywhere (R1 4/12, W15 2/5, W16 2/4) — reaching the 416-seat final is 1-in-15, but surviving pays $9 on an $18 entry. Everything is W17 placement: top ten take 49.7% of the pool. Small field, so draft best-available over correlation. Max 3 entries", format: "standard" },
  fastpuppy: { name: "The Fast Puppy", entries: "225k", weights: [1, 1, 1], note: "3-week gauntlet: W15, W16, W17 are each an independent must-win single-week cut (~1-of-10, then 1-of-10, then top-of-375). Every week needs its OWN spike stack — no dead weeks, floor is worthless, and ceiling piled into one week is wasted", format: "standard" },
  // The Field General 2 (2026 SUPERFLEX season, read off the in-app rules Aug 21 2026).
  // $10 entry · 33,984 entries · $300k prizes · 11.7% rake · 20 rounds · 12-man
  // drafts · SUPERFLEX (QB1/RB2/WR2/TE1/FLEX1/SFLEX1/BENCH12) · max 150 entries.
  //
  //   R1  W1-14   2,832 x 12   3 advance (25.0%)   33,984 -> 8,496
  //   R2  W15       708 x 12   2 advance (16.7%)    8,496 -> 1,416
  //   R3  W16       118 x 12   1 advance ( 8.3%)    1,416 ->   118
  //   R4  W17   one 118-seat final, all paid
  //
  // W16 IS THE KILL SHOT AND IT IS EXACTLY TWICE AS HARD AS W15. At 1-of-12 it
  // ties BBM VII's W16 as the second-hardest weekly gate on this board, and every
  // other format except the Frenchie makes W15 the tighter cut. Hence W16 at max
  // and W15 at 1.5, matching Pit Bull's identically-sized 16.7% W15.
  //
  // W17 gets 1.75 rather than the 2 the other finals carry, because THIS PRIZE
  // CURVE IS THE FLATTEST ON THE BOARD: only 45.4% of the pool reaches the 118
  // finalists (Pit Bull 77.5%, Puppy 75.6%), 1st is 16.7%, and $163,666 — 54.6%
  // of the pool — is paid to entries eliminated before the final.
  //
  // advanceWeight 1.5 nets two opposing facts: the R1 gate is SOFT (3-of-12, the
  // most forgiving qualifier here besides the Boxer's), but 21.2% of the pool
  // ($63,720) is paid to entries that clear it and then lose in W15 — the largest
  // share any format pays for surviving the qualifying round alone. Clearing R1
  // returns $15 on a $10 entry, the only profitable qualifier on the board.
  //
  // 33,984 entries is MID-FIELD by the Field Size Overlay, so it is deliberately
  // NOT in the bbm7/puppy uniqueness-leverage branch.
  fieldgeneral: { name: "The Field General 2", entries: "34k", weights: [1.5, 2, 1.75], advanceWeight: 1.5, note: "SUPERFLEX. W16 is a 1-of-12 kill shot, exactly twice as hard as W15 — the inverse of every format except the Frenchie. Flattest prize curve here: only 45.4% of the pool reaches the 118-seat final and 54.6% is paid to entries that never get there, so clearing the soft 3-of-12 qualifier already turns a profit", format: "superflex" },
  superflex: { name: "Superflex League", entries: "12-team", weights: [1, 1, 1], note: "2 QBs required · QB scarcity is real · draft accordingly", format: "superflex" },
};

// Playoff schedule W15/W16/W17
const PLAYOFFS = {
  ARI: ["NYJ", "@NO", "LV"],
  ATL: ["@WAS", "TB", "NO"],
  BAL: ["@PIT", "CLE", "@CIN"],
  BUF: ["CHI", "@DEN", "@MIA"],
  CAR: ["CIN", "@PIT", "SEA"],
  CHI: ["@BUF", "GB", "DET"],
  CIN: ["@CAR", "@IND", "BAL"],
  CLE: ["@NYG", "@BAL", "IND"],
  DAL: ["@LAR", "JAX", "NYG"],
  DEN: ["@LV", "BUF", "@NE"],
  DET: ["@MIN", "NYG", "@CHI"],
  GB: ["MIA", "@CHI", "HOU"],
  HOU: ["JAX", "@PHI", "@GB"],
  IND: ["@TEN", "CIN", "@CLE"],
  JAX: ["@HOU", "@DAL", "WAS"],
  KC: ["NE", "SF", "@LAC"],
  LAC: ["SF", "@MIA", "KC"],
  LAR: ["DAL", "@SEA", "@TB"],
  LV: ["DEN", "TEN", "@ARI"],
  MIA: ["@GB", "LAC", "BUF"],
  MIN: ["DET", "WAS", "@NYJ"],
  NE: ["@KC", "@NYJ", "DEN"],
  NO: ["@TB", "ARI", "@ATL"],
  NYG: ["CLE", "@DET", "@DAL"],
  NYJ: ["@ARI", "NE", "MIN"],
  PHI: ["SEA", "HOU", "@SF"],
  PIT: ["BAL", "CAR", "@TEN"],
  SEA: ["@PHI", "LAR", "@CAR"],
  SF: ["@LAC", "@KC", "PHI"],
  TB: ["NO", "@ATL", "LAR"],
  TEN: ["IND", "@LV", "PIT"],
  WAS: ["ATL", "@MIN", "@JAX"],
};

// 2025 Fantasy Points Against by position (Rotowire)
// Higher = softer matchup (more pts allowed)
const FPA = {
  QB: { DAL: 23.68, TB: 20.19, WAS: 20.03, NYJ: 19.95, PIT: 19.68, CHI: 19.49, TEN: 19.40, CIN: 19.13, DET: 18.96, NYG: 18.75, MIA: 18.69, BAL: 18.32, IND: 17.72, ARI: 17.54, SF: 17.46, ATL: 17.26, JAX: 17.15, LV: 16.50, LAR: 16.11, KC: 15.66, GB: 15.43, NE: 15.29, PHI: 15.24, SEA: 15.06, DEN: 14.78, CAR: 14.70, NO: 14.59, CLE: 13.96, BUF: 13.80, HOU: 13.73, LAC: 13.58, MIN: 11.59 },
  WR: { DAL: 33.14, CHI: 30.03, DET: 29.94, TEN: 29.44, IND: 29.42, BAL: 29.11, WAS: 28.85, PIT: 28.74, ATL: 27.95, NYG: 27.89, LV: 27.33, LAR: 27.18, SF: 26.46, GB: 25.64, TB: 25.38, NYJ: 24.96, JAX: 24.95, ARI: 24.58, MIA: 24.49, NE: 24.14, NO: 22.89, KC: 22.34, CLE: 22.21, LAC: 22.07, CAR: 22.01, BUF: 21.58, SEA: 21.38, PHI: 21.29, HOU: 21.26, CIN: 21.19, DEN: 21.06, MIN: 19.22 },
  RB: { NYJ: 26.18, CIN: 26.18, ARI: 25.03, WAS: 23.77, NYG: 23.62, DAL: 23.17, MIA: 22.98, BUF: 22.41, CAR: 21.94, LV: 21.10, PHI: 21.04, BAL: 20.90, SF: 20.70, CLE: 20.68, TEN: 20.34, TB: 19.85, CHI: 19.69, GB: 19.62, ATL: 19.53, NO: 19.13, LAR: 18.18, IND: 18.05, MIN: 17.97, HOU: 17.95, DET: 17.61, KC: 17.38, LAC: 16.99, PIT: 16.93, NE: 16.56, JAX: 16.31, SEA: 16.09, DEN: 15.60 },
  TE: { CIN: 17.45, ARI: 13.79, PIT: 13.49, WAS: 13.36, MIA: 13.04, TB: 12.86, NYJ: 12.44, IND: 12.24, SF: 11.91, JAX: 11.72, SEA: 11.62, TEN: 11.45, CAR: 11.15, DET: 11.08, NE: 10.95, DEN: 10.86, LAR: 10.42, CHI: 10.18, NO: 9.86, HOU: 9.72, DAL: 9.70, CLE: 9.61, GB: 9.35, NYG: 8.94, KC: 8.59, BAL: 8.51, MIN: 8.45, LAC: 8.39, ATL: 8.08, LV: 8.03, PHI: 6.37, BUF: 6.34 },
};

// 2026 Bye Weeks (from playoff schedule context in memory)
const BYES = {
  ARI: 14, ATL: 11, BAL: 13, BUF: 7, CAR: 5, CHI: 10, CIN: 6, CLE: 11,
  DAL: 14, DEN: 10, DET: 6, GB: 11, HOU: 8, IND: 13, JAX: 7, KC: 5,
  LAC: 7, LAR: 11, LV: 13, MIA: 6, MIN: 6, NE: 11, NO: 8, NYG: 8,
  NYJ: 13, PHI: 10, PIT: 9, SEA: 11, SF: 8, TB: 10, TEN: 9, WAS: 7,
};

// Team chalk rating for stack uniqueness proxy
// chalk = drafted heavily, leverage = sharp/contrarian
const TEAM_CHALK = {
  // High chalk — heavily drafted stacks
  BUF: "chalk", DET: "chalk", CIN: "chalk", PHI: "chalk", BAL: "chalk", KC: "chalk", LAR: "chalk",
  // Medium chalk
  CHI: "medium", MIA: "medium", GB: "medium", HOU: "medium", DAL: "medium", SF: "medium", MIN: "medium",
  // Low chalk — leverage opportunities
  ATL: "low", LAC: "low", NO: "low", DEN: "low", IND: "low", WAS: "low", SEA: "low", NE: "low", PIT: "low",
  // Sharp / leverage — sharp plays
  JAX: "sharp", LV: "sharp", NYJ: "sharp", NYG: "sharp", TEN: "sharp", ARI: "sharp", CAR: "sharp", CLE: "sharp", TB: "sharp",
};

// Recent news — post-training updates injected directly into AI prompt
// Format: normalized player name → one-sentence situation update
// Update this alongside VERDICTS whenever a significant role/roster change happens
const RECENT_NEWS = {
  // === Aug 2 2026 news sweep (agent-researched, sourced) ===
  "ricky pearsall": "OUT FOR 2026 (Aug 1 2026). Season-ending PCL surgery on the right knee — the same PCL that cost him 8 games in 2025, re-aggravated in the first week of camp after just two practices. Placed on IR. GM John Lynch expects a full recovery for 2027; PCL recovery runs 6-12 months. Remove from all 2026 boards — this is not a monitor situation. His vacated targets are the direct cause of the Deebo signing and raise the floor for Mike Evans and rookie De'Zhaun Stribling.",
  "deebo samuel": "HE IS A 49ER. Deebo Samuel plays for SAN FRANCISCO — signed 1yr/up to $7M on Aug 1 2026, the same day Ricky Pearsall went on IR. Do not describe him as a Commander, a Washington player, or a free agent; any such reference is wrong for 2026. Every matchup, stack and bring-back for him runs off SF's schedule. GM John Lynch says they will 'use him all over the field' — receiver, backfield touches, return duties. The SF room ahead of him is thin (Evans is 32, Kirk has a calf strain, Pearsall is out for the year), so his touch floor beats his ADP, though gadget deployment caps his target-share ceiling. His 2025 receiving line of 72/727/5 on 99 targets plus 17 carries was produced with a different team and is prior-role context only.",
  "cyrus allen": "KC rookie WR — CARTED OFF Aug 1 2026 on a special-teams punt rep, difficulty putting weight on the left leg. DIAGNOSIS UNRESOLVED: CBS reported a knee injury, other outlets a bruised shin later called a lower-leg strain. Do not act on either until it lands. Context: he had been the clear standout of KC's first camp week (first-team red-zone reps Day 1, one-on-one coaching from Reid, Mahomes trust), which is what created the buzz. That case is frozen, not cancelled.",
  "xavier worthy": "KC — left practice Aug 1 2026 on a cart with a right shoulder injury after landing hard on a deep catch in 11-on-11s. UNRESOLVED as of Aug 2: unclear whether it is the same shoulder he had offseason surgery on to repair a torn labrum (he played through that tear for much of 2025). A re-injury to the repaired labrum would be a top-30-ADP event. Treat as genuinely open — do not draft or fade on assumption.",
  "jj mccarthy": "MIN — LOST the job and is the BACKUP as of Tue Aug 12 2026. O'Connell ended the competition after roughly 10 days of camp and gave Kyler Murray the Week 1 start. McCarthy still gets substantial reps, but O'Connell framed that as development rather than an open competition, and no re-evaluation clause was stated. His case was three years in the system; the case against was the 2025 that caused Minnesota to sign Murray in the first place. PURE CONTINGENCY NOW — he has no standalone path, and his value depends entirely on a Murray injury or collapse. Do not treat him as a stackable QB.",
  "kyler murray": "MIN — RESOLVED. He was NAMED THE STARTER for Week 1 on Tue Aug 12 2026, ending the McCarthy competition after ~10 days of camp practices. O'Connell met both QBs that morning, then told the team: 'Kyler will begin the process of really looking at things now as our starter.' McCarthy is the BACKUP. NO leash or re-evaluation language was attached — O'Connell framed McCarthy's continued reps as development ('nothing changes as far as J.J. being an incredibly important member of our quarterback room'), not as a live competition. Murray took the larger share of full-team first-team work through camp, though he reportedly struggled the weekend before the call. THIS SUPERSEDES THE OPEN-COMPETITION READ ENTIRELY: the availability risk that made every Vikings pass catcher a coin flip is gone, and the qb_uncertainty flag has been removed from both MIN QBs accordingly. Signed a one-year deal in the offseason after his Arizona release.",
  "jeremiyah love": "ARI rookie RB (No. 3 overall) — THE CAMP READ IS SUPERSEDED (updated Aug 15 2026). He STARTED the preseason opener vs LV on Aug 13 with Arizona playing its starters, took roughly 75% of the offensive snaps across the first three drives, and handled all 14 of his touches in the first half: 11 carries for 58 yards plus 3 catches for 14, with a spin move and a hurdle over a diving defender that went viral. That is a different class of evidence from the late-July camp reps, which had Allgeier taking the majority of first-team carries and Love listed as RB2 in first-team drills — starters on the field with a clear snap distribution is role evidence; jog-through reps are not. CAVEAT ONE, THE ANKLE: he twisted it in the first half, described as a possible mild lateral sprain, and did not play the second half. HC Mike LaFleur said he does not think it is serious and the second-half absence reads as precautionary for a starter in a preseason opener. Unresolved as of this entry. CAVEAT TWO, THE CALENDAR: this is preseason WEEK 1, and the framework treats pre-Week-3 snaps as scheme evaluation rather than role confirmation. Starting with the ones is the strongest version of that evidence, but it is not yet confirmation. The in-season takeover thesis is now supported rather than contradicted; Allgeier still saw three carries on the opening drive.",
  "chris brazzell": "OUT FOR 2026. CAR third-round rookie tore his left LCL on a non-contact seven-on-seven rep (~Jul 29 2026) and was carted off. Initial read was a moderate tear with an 8-week timeline; after a second opinion he elected season-ending surgery (confirmed Jul 30). If your data still shows the 8-week version it is stale.",
  "tyreek hill": "FREE AGENT, undraftable for 2026. Released by MIA in February. As of July 2026 he says he has 'no power in his left leg' recovering from a dislocated knee and multiple torn ligaments (Week 4, 2025). Unsigned with no return timetable. Any table listing him on MIA is stale.",
  "jonathon brooks": "CAR — completed his first padded practice since December 2024 (late Jul 2026) after two ACL tears in the same knee, and starred in the opening practice as a full camp participant for the first time in his career. Hubbard still projects to open as the starter, but multiple insiders including NFL Network's Cameron Wolfe expect Brooks to take over as lead back at some point in 2026, and Carolina has done nothing to block that path. Flagged as a potential large ADP riser. BLOCKING CONTEXT ADDED AUG 23 2026: both Carolina starting offensive tackles are set to miss regular-season time — Ikem Ekwonu with a knee injury and Taylor Moton with blood clots. That is a team-level drag on the entire CAR offense, Bryce Young and Darren Waller included, and it applies to the run game whoever wins the backfield. Temper the efficiency half of any Brooks thesis; the opportunity half is unaffected.",
  "george kittle": "SF — opened camp on PUP (~Jul 24 2026) recovering from a torn Achilles suffered in January. GM John Lynch cites positive reports from Dr. Neal ElAttrache and has NOT ruled him out for Week 1 vs LAR in Melbourne. Achilles at his age is the real risk, not the PUP tag itself. Week 1 is live but unconfirmed — discount and carry a contingency TE.",
  "tucker kraft": "GB — activated off PUP Jul 31 2026 (ACL tear suffered Week 9, Nov 2 2025), returning limited: individual work and walkthroughs, no team drills yet. Kraft believes he will not need a Week 1 pitch count. He was TE3 in FPPG before the injury, so an early-camp activation supports paying his current price.",
  "malik nabers": "NYG — AVOIDED the PUP list and took a full practice on camp Day 1 after ACL + meniscus surgery plus a second spring procedure to remove scar tissue; observers called him 'outstanding.' Nabers: 'There's no target date,' with workload evaluated daily. Trending toward Week 1 but not confirmed — two knee procedures on an early pick is real risk, and the no-PUP designation is the best signal currently available.",
  "deshaun watson": "CLE — OPEN QB COMPETITION with Shedeur Sanders, unresolved as of Aug 1 2026 and not expected to resolve until at least after the Aug 22 preseason game vs BUF. Both splitting first-team reps under first-year HC Todd Monken. Sanders started the final seven games of 2025. Discount all Cleveland pass catchers accordingly; Judkins is the safer Browns exposure.",
  "shedeur sanders": "CLE — OPEN QB COMPETITION with Deshaun Watson, unresolved as of Aug 1 2026, not expected to resolve until at least after the Aug 22 preseason game. Sanders started the final seven games of 2025; both are splitting first-team reps under first-year HC Todd Monken.",
  "bhayshul tuten": "JAX — NOT the clear lead back any more: he and Chris Rodriguez Jr. are listed as CO-STARTERS on Jacksonville's first unofficial depth chart (Aug 11 2026). He opened camp strongly, taking the bulk of first-team reps on Day 1, but the depth chart has not followed. The staff is keeping the competition open rather than handing him the job, which is the opposite of what was heavily expected all offseason. His edge remains PASS-CATCHING; Rodriguez profiles for short-yardage and red-zone work, so the likely split is by situation rather than a straight rotation, and that specific division costs Tuten goal-line equity. Rodriguez opened camp on PUP after left-foot surgery and has since come on strong with 'angry runs' in practices and scrimmages, so the co-start is a real climb rather than a courtesy listing. Liam Coen run game is still the reason to want the exposure at all. Re-check after preseason Week 3, when snaps start to mean role.",
  "jadarian price": "SEA rookie RB (No. 32 overall) — RB1 HAS CLARIFIED IN HIS FAVOR, with one fresh caveat (updated Aug 8 2026). He opened camp behind George Holani, who was taking the first crack with the No. 1 offense through the early full-squad practices — but Price took the OPENING FIRST-TEAM REP in Seattle's first full-team scrimmage (Jul 30) and has since been described as a camp star, with beat reporting calling RB1 increasingly clearly his and Holani settling in as RB2. A reporter's read on the receiving side: 'he's going to be a very good receiver.' CAVEAT: he MISSED Friday's practice (Aug 7) with lower-body soreness per Gregg Bell — reported as not serious and read as precautionary, but it is unresolved as of this entry and Seattle has reason to manage his workload. The room is open by construction: Kenneth Walker III left in free agency and Zach Charbonnet is on PUP (ACL, Feb 20 surgery; coach says Week 1 'possible,' analysts project Oct/Nov). Best combination of draft capital, vacated volume and a hurt incumbent among rookie RBs.",
  "zach charbonnet": "SEA — on Active/PUP to open camp after a January ACL tear (surgery Feb 20 2026). WIDE timeline split: HC Mike Macdonald says Week 1 (Sept 9) is 'everything's possible,' while analyst projections say October or November. Treat the coach's version as the optimistic bound. Directly gates Jadarian Price's early-season workload.",
  "christian kirk": "SF — calf strain suffered in practice Jul 27 2026, out of team drills with no definitive return date. (Some outlets said hamstring; the dated first-reports say calf, and his documented hamstring history is the likely source of the confusion.) Extensive soft-tissue history with SF. Second SF WR domino behind Pearsall and the other half of the reason Deebo was signed — calf strains reinjure easily.",
  "makai lemon": "PHI rookie WR (1st round) — establishing himself as the team's No. 2 receiver, and returned from the hamstring that cost him OTAs declaring himself '100.0%' healthy for the Jul 28 report date. A gradual early-season ramp is expected. Role confirmed but phased; the post-A.J.-Brown target path in Philadelphia is genuinely open.",
  "dezhaun stribling": "SF rookie WR (No. 33 overall) — role EXPANDING. THE CURRENT SF RECEIVER ROOM IS MIKE EVANS, DEEBO SAMUEL, CHRISTIAN KIRK (calf) AND STRIBLING. Ricky Pearsall is NOT in it — he is on IR, out for all of 2026, and must never be described as competition for snaps or as someone whose absence would need to happen. His targets are already vacated and that vacancy is why Deebo was signed. Brock Purdy is publicly talking Stribling up ('baller,' praising route running, fast playbook mastery, strength, separation) and he was reported 'looking good' in camp. Read his path as: Evans and Deebo are ahead of him, Kirk is banged up, and the WR3 job is his to hold. Deebo's Aug 1 signing is the real offset to the Pearsall vacancy, not a reason to discount the role entirely. NOTE ON PHRASING, because this caused a live bug: an earlier version of this entry listed the DRAFT-DAY depth chart ('drafted behind Evans, Pearsall and Kirk') and corrected it in a trailing clause. The AI layer reproduced the list and dropped the correction, telling a user Stribling needed 'Evans or Pearsall to miss time.' State the current room affirmatively; never name an out player inside a present-tense depth chart even to correct it. PRESEASON WEEK 1 (Aug 13 2026) BACKED IT UP LOUDLY: 7 catches on 8 targets for 63 yards vs TEN including a 32-yarder, ALL SEVEN IN THE FIRST HALF — the second NFL receiver in a decade to catch seven inside the first 20 minutes of a preseason game. Volume against starters, not fourth-quarter padding. Same pre-Week-3 caveat applies (scheme evaluation, not role confirmation), but this is the loudest single data point he has produced.",
  "bijan robinson": "ATL — HOLD-IN RESOLVED Aug 4-5 2026. Signed a three-year extension worth up to $75M ($66.75M base, $51M guaranteed, $37M at signing) that makes him the NFL's highest-paid running back by AAV, running through 2030. He reported to camp and sat out on-field work while negotiating; that is over. Led the NFL with 2,298 all-purpose yards in 2025. No remaining availability question — the earlier 'treat as noise' read was right and the noise has now cleared.",
  "jahmyr gibbs": "DET — contract HOLD-IN through Aug 2 2026, same posture as Bijan: reported to camp, sat out practices pending an extension after two straight 1,800+ scrimmage-yard seasons. Dan Campbell: 'at some point, it'll all get done.' DET holds his fifth-year option, so leverage favors the club. Noise, not signal.",
  "chris olave": "NO — signed a four-year extension worth up to $132M ($90M guaranteed, ~$33M AAV) on Jul 30 2026. GM Mickey Loomis acknowledged the concussion history and a 2025 pulmonary blood clot were 'an element' in talks. Coming off 100/1163/9 (WR12 half-PPR). Removes any trade or usage ambiguity — locked-in alpha, and the guarantee level signals full-season target commitment.",
  "alec pierce": "IND — THE TIMELINE GOT WORSE, not better (updated Aug 10 2026). Ballard said on Jul 28 that Pierce was 'a week or two' from returning to practice. That window has now elapsed with no return, and HC Shane Steichen has since said there is NO SPECIFIC TIMETABLE — Pierce has not practiced at all this summer. Opened on Active/PUP, so he can be activated any time once cleared, but nothing has happened. Context that cuts both ways: he signed a 4yr/$114M extension and then had surgery on the LEFT ANKLE for an issue he had been managing since 2024, so org commitment is maximal while the injury is chronic rather than acute. The March procedure carries roughly a six-month window, which points at September and the regular season rather than camp. Treat Week 1 as unresolved, and note the W1-14 qualifying round is where an early absence actually costs you — his W15-17 window is unaffected if he is back by then. WHY THE ADP MOVED ANYWAY (78 -> 53.8, Aug 15 2026): MICHAEL PITTMAN LEFT FOR PITTSBURGH, vacating the largest target share in the room, and Pierce is the returning veteran in line for it. So the market is buying opportunity while the availability question above is still open — that is the trade, and it should be priced consciously rather than assumed away. One further caveat on the opportunity itself: Pierce ran a simple, field-stretching route tree in 2025, and absorbing Pittman's share means running a fuller menu he has not been asked to run, with no summer practice to build it. Opportunity confirmed, role projected.",
  "travis hunter": "JAX — fully recovered from the torn LCL that ended his rookie season and cleared for full participation, but deployed PRIMARILY AT CORNERBACK with receiver rotation involvement. The position framing, not the knee, is the fantasy story — that is a role downgrade for offensive usage.",
  "fernando mendoza": "LV — No. 1 overall pick, QB2 to open the season, and the takeover is treated as a question of WHEN rather than IF (Aug 8 2026). Kubiak named Cousins the starter to open camp ('He's the guy, and he's going to get a ton of reps') but also said he would be comfortable with any of Cousins, Mendoza or Aidan O'Connell starting, and that rep distribution across the three is a 'moving target.' Mendoza has been surging through camp and has built early chemistry with rookie WR Malik Benson. THE REASON THIS MATTERS FOR BEST BALL: a mid-season handoff puts him under center for W15-17, so the uncertainty sits INSIDE the scored window rather than resolving before Week 1 the way an open camp competition would. Contingency Protocol shape — the outcome is expected, only the date is unknown. Tempering it: LV's playoff slate is poor in every direction, with all three W15-17 game totals at 42.5 or below and the WR room grading Avoid in W15. PRESEASON DEBUT (Aug 2026): 10/16 for 97 yards with a touchdown and a 100.3 passer rating against Arizona, described in national coverage as an ascending rookie who passed his first test. That is a poised, efficient line rather than a spectacular one, and it moves the WHEN question earlier without resolving it. Per Lens 4 this is a pre-Week-3 rep: treat as supporting evidence for the takeover timeline, not as a job change.",
  "kirk cousins": "LV — NAMED THE STARTER as of camp 2026, with the team explicitly evaluating rookie Fernando Mendoza's readiness for regular-season opportunities. Named-starter clarity with a rookie-evaluation clause attached, so a mid-season change is a live risk for Las Vegas pass catchers in the W15-17 window.",
  "travis etienne": "Etienne signed with NO on a 2yr/$14M deal, signaling he's taken Kamara's starting role.",
  "jakobi lane": "BAL \u2014 THE RUNAWAY STANDOUT of Baltimore's 2026 training camp. Third-round rookie WR out of USC, 22 years old. ESPN's Jamison Hensley, who has covered the franchise for 27 years, said he has never seen a rookie have a camp like this one. THE SIGNAL THAT MATTERS IS NOT THE HIGHLIGHTS: he is taking FIRST-TEAM REPS and building visible red-zone chemistry with Lamar Jackson, who sought him out after an 11-on-11 red-zone period for an extended one-on-one conversation. Rashod Bateman has been missing practice time, which is the specific opening Lane is walking through. The market has moved hard on it, roughly 21-23 spots in seven days. FORMAT NOTE FOR BEST BALL: Baltimore's W17 is @CIN, and Cincinnati grades AVOID against WR while grading SMASH against RB and TE, so Lane is a poor positional fit as a BAL bring-back into that specific game even though the game environment is the best on the board \u2014 want a Baltimore back or tight end there instead. Per Lens 4 these are pre-Week-3 preseason reps: treat as a strong scheme-evaluation signal, not a confirmed role. Re-check after preseason Week 3. BAL playoff slate: W15 @PIT, W16 vs CLE, W17 @CIN.",
  "malik washington": "MIA \u2014 the de facto WR1 in Miami's 2026 camp and new starter Malik Willis's favorite target, taking most of the first-team reps. Third-year player out of Virginia, and now tied as the LONGEST-TENURED receiver on the roster, which says more about the room's turnover than about his age. The receiver room was rebuilt around him: Tyreek Hill and Jaylen Waddle are both gone (Waddle is a Bronco), and what remains behind Washington is largely inexperienced. WHY THE ADP MOVED 100 PICKS: this entry read fade/falling as recently as this summer and priced him at 254 in the redraft table. He is going at 153.2 in the live market. HE IS NOT THE SHORT-AREA SLOT PIECE HIS 2025 aDOT OF 5.2 IMPLIES. In camp he caught a 60-yard deep ball and added a 45-yard catch-and-run in the same session, both from Willis \u2014 chunk-play production the slot-only framing said was not in his game. HC Mike McDaniel has praised him publicly. WHAT KEEPS THIS SHORT OF A CONFIRMED BREAKOUT: Willis is an unproven starter, the offense projects run-first, and per Lens 4 these are pre-Week-3 reps, which are scheme evaluation rather than role confirmation. Re-check after preseason Week 3. MIA playoff slate: W15 @GB, W16 vs LAC, W17 vs BUF \u2014 the TE/WR matchups there grade poorly, so he is a season-long target well before he is a best-ball playoff piece.",
  "adonai mitchell": "NYJ \u2014 the Jets are looking for a SIZABLE JUMP from him in 2026 and camp reporting says he is moving past whatever held him back across a season and a half in Indianapolis. Building chemistry with Geno Smith, and he is in a CONTRACT YEAR, which is the kind of alignment that usually shows up in snaps. ADP moved 210.9 -> 160.4 on it. Read this as a role-trajectory bet rather than a confirmed starter: the reporting is about a jump the team wants, not a job he has been handed. Per Lens 4 these are pre-Week-3 reps. Re-check after preseason Week 3.",
  "colbie young": "CIN \u2014 FOURTH-ROUND ROOKIE WR making a real run at the WR3 job. Listed as a BACKUP on Cincinnati's first depth chart, with Andrei Iosivas holding WR3 for now, so this is a competition rather than a promotion. WHAT IS DRIVING IT: two weeks of camp turning heads, repeated acrobatic and contested grabs off a 6-FOOT-3 FRAME that lets him high-point the ball, a ladder-climbing sideline catch and a red-zone touchdown in the same practice, and reporting that he has ALREADY EARNED JOE BURROW'S TRUST. He made his preseason debut Aug 13 vs Detroit. WHY THE CEILING IS SHAPED THE WAY IT IS: this is the best WR tandem in football ahead of him, so WR3 in Cincinnati is a low-target job in a very high-quality passing offense. That makes him a spike-week and red-zone dart rather than a volume play \u2014 the exact profile that is worth a pick at the very end of a board and nowhere earlier. FORMAT NOTE: CIN's W17 is BAL at home, the single best game environment on the board, which is where a cheap CIN pass catcher earns his roster spot. Per Lens 4 these are pre-Week-3 reps, so treat the trust reporting as a strong signal and not a confirmed role. Re-check after preseason Week 3. CIN playoff slate: W15 @CAR, W16 @IND, W17 vs BAL.",
  "denzel boston": "CLE \u2014 LISTED AS THE NO. 1 WIDE RECEIVER on Cleveland's early depth chart, and HC/OC Todd Monken has said he is moving into the FIRST-TEAM OFFENSE. That is a rookie being handed the top job outright, not winning reps in a rotation, and it is the single most under-priced role change in this file. FIRST COVERAGE HERE \u2014 he had an ADP in all three tables and no prose at all, which meant the app knew his price and nothing about his job. Camp reporting has been consistently strong since Day 1 and describes a complete-package receiver playing with confidence and a chip on his shoulder; he posted a standout Day 12. His preseason line was quiet on the surface (one catch) but it moved the chains on a scoring drive, which is the usual shape of a starter's snap count in a Week 1 exhibition. WHAT TO WATCH: the depth chart is early and unofficial, and rookie WR1 designations are the most reversible label in August. But the direction of travel here is a promotion, not a competition. Re-check after preseason Week 3. CLE playoff slate: W15 vs NO, W16 @BAL, W17 vs NYG.",
  "elic ayomanor": "TEN \u2014 SECOND-YEAR WR (Stanford, Canadian) and one of the two standouts of Tennessee's camp. Reporting describes a close race for camp\u2019s top performer between him and ROOKIE CARNELL TATE. He reported noticeably more chiseled and playing aggressively, and has been consistent on BACK-SHOULDER THROWS AND GO ROUTES while using a big frame as an easy middle-of-field target on slants and digs for Cam Ward. HC Robert Saleh praised the work ethic and CHALLENGED HIM TO BE CONSISTENT, which is signal-grade rather than generic \u2014 it names the exact thing standing between him and the job. THE ROLE PROBLEM IS THE WHOLE STORY: he is a throwback X receiver and Tate profiles for that same spot, with Tate carrying the better draft capital (ADP 60 against Ayomanor at 215.7). The realistic read is X in certain packages rather than a every-down job. He had a shoulder scare in a Thursday practice and was cleared in time for the scrimmage, so treat it as noted-and-resolved, not a standing risk. Per Lens 4 these are pre-Week-3 reps. Re-check after preseason Week 3. TEN playoff slate: W15 vs IND, W16 @LV, W17 vs PIT.",
  "darren waller": "CAR \u2014 signed a one-year deal with Carolina on Aug 12 2026, 33 years old. THE ROOM HE WALKED INTO IS THE WHOLE CASE. Carolina's 2025 tight ends produced nothing in fantasy terms: Ja'Tavion Sanders posted a 0.0% spike rate and a 0.0% usable-week rate on 34 targets, and Tommy Tremble posted 0.0% spike with 13.3% usable on 37. Waller's own 2025 line, produced in Miami, is a different species: 6 touchdowns in 9 games, 8 RED-ZONE TARGETS and 7 END-ZONE TARGETS on just 35 total targets, a 12.5% spike rate and a 0.400 WOPR on only a 45% snap share. Those numbers came for a DIFFERENT TEAM, so treat the rate profile as established and the volume as projected. SCHEME CONTINUITY IS REAL HERE: Darrell Bevell, Miami's passing game coordinator and QB coach last season, is now Carolina's associate head coach and offensive specialist, so Waller is re-entering a system that already knows how to use him. In his prime he posted back-to-back 1,000-yard seasons. WHAT CAPS IT: age 33 on a one-year deal, a lengthy injury history, and a Bryce Young offense that limits the ceiling of everyone in it. FORMAT NOTE: Carolina's TE playoff slate is the reason to own him at this price \u2014 W15 vs CIN grades SMASH, W16 @PIT and W17 vs SEA both grade GOOD. That is a good-or-better window in all three weeks. Note the split with the CAR receivers, who grade Avoid in W15 and W17: the tight end matchup in Carolina is materially better than the wide receiver matchup. CAR playoff slate: W15 vs CIN, W16 @PIT, W17 vs SEA.",
  "braelon allen": "NYJ \u2014 STARTING RB while Breece Hall is out (Aug 2026). Hall strained his right groin on a non-contact play in the Aug 17 practice and is sidelined 2-3 weeks; tests came back clean and he is expected back for the Week 1 opener. With Hall out, the Jets backfield behind Allen is Kene Nwangwu and two undrafted rookies, so Allen holds the job outright rather than splitting it. HC Aaron Glenn: run the ball, understand your landmarks, be Braelon. Allen is returning from a knee injury that cost him most of last season and is reported back bigger and stronger. WHAT THIS MEANS FOR W15-17: Hall returns for Week 1, so Allen projects as the backup again by the playoff weeks. The value is that his contingency is now CLEAN \u2014 an in-season Hall absence gives Allen the whole job instead of half of it, which is a different asset than a committee back. FORMAT NOTE: Minnesota plays at the Jets in W17, so Allen is a live bring-back for any MIN stack. NYJ playoff slate: W15 @ARI, W16 vs NE, W17 vs MIN.",
  "breece hall": "NYJ \u2014 strained his right groin on a non-contact play in the Aug 17 practice and is out 2-3 weeks. Tests confirmed it is not serious and he is EXPECTED BACK FOR THE WEEK 1 OPENER, so treat this as a camp absence rather than a season-altering injury. He remains the Jets' lead back. Braelon Allen starts in the interim. The one thing worth tracking is that this is a soft-tissue injury in a contract-year context, and soft-tissue issues recur \u2014 so the handcuff is worth more than it was a week ago even though the depth chart is unchanged. NYJ playoff slate: W15 @ARI, W16 vs NE, W17 vs MIN.",
  "tyler allgeier": "ARI \u2014 listed as the No. 1 RB on Arizona's first unofficial depth chart (Aug 2026), with third-overall rookie Jeremiyah Love No. 2, James Conner 3rd and Trey Benson 4th. Signed from Atlanta in March on 2yr/$12.25M, which is real money for a back. WHAT MATTERS FOR BEST BALL: 19 GREEN-ZONE CARRIES in 2025 on only 16 targets \u2014 a pure short-yardage and goal-line body, so his value is touchdown equity rather than volume and the weekly profile is TD-or-bust. The offense supports it: QB Jacoby Brissett threw for a career-high 3,366 yards with 23 TD and 8 INT in 12 starts and was re-signed on a reworked 1yr/$15.5M deal worth up to $21M, and HC Mike LaFleur (OC Nathaniel Hackett) arrives from a Rams offense that led the NFL in both points and yards, with reporting describing a balanced scheme. THE STANDING RISK: Love was the No. 3 overall pick, and clubs commonly leave a rookie second on the published chart until he wins the job outright, so read the RB1 listing as evidence the handoff is not immediate rather than evidence it is not coming. Re-check after preseason Week 3. ARI playoff slate: W15 vs NYJ, W16 @NO, W17 vs LV.",
  "travis etienne jr": "Etienne signed with NO on a 2yr/$14M deal, signaling he's taken Kamara's starting role.",
  "alvin kamara": "NO — INJURED, and the timeline reaches into the regular season (updated Aug 23 2026). He left a joint practice against Dallas early with a knee injury and carries an MCL sprain with an expected absence of at least a month per ESPN's Adam Schefter. New Orleans opens Sept 13, so he misses Week 1 and plausibly the first several weeks. Travis Etienne was already signed as the lead back on a 2yr/$14M deal; the injury hands Etienne the full workload to open the year rather than a committee share. Kamara is a team captain under contract and the receiving role remains his when healthy, so this is a start-of-season absence rather than a role loss — but it removes the standalone PPR floor that made him worth a near-free pick, and it lands squarely on the W1-14 qualifying round that formats like BBM, Puppy 3 and The Field General all score.",
  "wandale robinson": "TEN. Verdict moved fade -> TARGET (Jul 31 2026). 2025 was a real alpha season: 92/1014/4 on a 29.8% target share with 26.8% air yards share, so the old slot-only framing was wrong. The TEN room is thinner than his ADP implies — Tate is an unproven rookie and Ridley posted 2.4 rec/g with a 0% spike rate in 2025. Soft slate (WR SOS 5th-easiest, +25 improvement; W15 Smash / W16 Good / W17 Good) supports the call but is not the basis for it. Open risks: new team, new QB, and a 12% spike rate — the profile is volume-first, not ceiling-first. Re-validate after camp confirms the pecking order.",
  "carnell tate": "Tate was drafted by TEN in 2026 and is projected as their WR1, ahead of Robinson on the depth chart.",
  "aj brown": "AJ Brown was traded to NE (2028 1st + 2027 5th), leaving PHI — no longer on PHI.",
  "rashee rice": "KC — THE KNEE IS TRENDING RIGHT (updated Aug 8 2026). On Aug 5 he took part in 11-on-11 for the first time in camp, TOOK CONTACT, and got straight back up; KC is reported comfortable with him absorbing contact on that knee. That supersedes the late-Jul picture, which had him running routes well short of full speed and leaving practice early each day for rehab (Ron Kopp Jr.). Background: right-knee debridement in May 2026 to remove loose bodies, and rehab could not start on time because he served 30 days for a probation violation, released from Dallas County Jail Jun 16. He remains on a deliberate EXTENDED RAMP-UP — a milestone, not a clearance — and KC still wants to see the rest of camp and the preseason. Contract year. The six-game suspension he served was for 2025; no 2026 NFL discipline has been announced, and outlets describe further probation-related discipline as a live RISK, not a ruling. Treat a 2026 suspension as unresolved, not scheduled.",
  "sam laporta": "DET — a hip injury has him resting, and the preseason window closes without him (updated Aug 23 2026). HC Dan Campbell does not believe it is serious and is giving him days off to see how it responds, but LaPorta is expected to miss the remainder of the preseason and Campbell has stopped short of committing him to Week 1. THE ROLE ITSELF IS NOT IN QUESTION — he is Detroit's starting tight end and his 2025 line is 0.838 snap share on 76 receptions, the highest snap share of any TE in the metrics file. What is in question is availability, and per Lens 4 the confirmation step this injury removes is the post-Week-3 snap read. Watch practice participation rather than coachspeak from here. DET playoff slate: W15 @MIN, W16 vs NYG, W17 @CHI, and the TE matchup grades Avoid / Hard / Good across those three.",
  "luther burden": "CHI — HURT, and the injury lands on exactly the window that would have confirmed his role (updated Aug 10 2026). He suffered a GROIN injury in practice Sat Aug 8 after getting tangled with CB Tyrique Stevenson in one-on-ones and hitting the ground hard. Expected to miss about A MONTH, which covers the rest of training camp AND the entire preseason; Chicago hopes he is ready for Week 1 vs CAR on Sep 13 and does not expect him to miss regular-season time. THE ROLE READ IS NOW UNCONFIRMED RATHER THAN WRONG: camp reports had him trending toward the CHI WR1 starter job, and that was accurate when written, but the framework treats post-Week-3 preseason snap share as the signal that overrides camp talk — and he will log ZERO preseason snaps. So the WR1 claim never gets its confirmation step. Underlying profile is unchanged and still good: 2.83 YPRR as a rookie on a 26.1% target rate with vacated Moore volume. Price the missing month and the unconfirmed role, not a talent downgrade.",
  "james cook": "BUF beat reporting (Jul 2026) hints Pete Carmichael's arrival as OC means more designed receptions for Cook — the receiving role Joe Brady gave him in 2023 may return.",
  "cam skattebo": "Skattebo (tightrope ankle surgery) declared full-go for training camp and Week 1 per July reports. Effectiveness early in the season is the open question, not availability.",
  "emeka egbuka": "New OC Zac Robinson says Egbuka moves to the off-line Z/flanker role (Cooper Kupp's old role in this scheme) with Godwin working the slot — his natural college position after playing X out of position as a rookie.",
  "eli stowers": "PHI — BURIED, not ascending (Aug 2 2026). He is behind Dallas Goedert AND Johnny Mundt, who has been taking first-team 12-personnel reps because new OC Sean Mannion wants a blocking TE paired with a receiving TE; Stowers is 'more of a big receiver at this point' and not yet an NFL-caliber blocker. A spring leg injury cost him development reps and he was quiet at OTAs. The old TE1-path note rested on a FALSE PREMISE — Goedert did not leave, A.J. Brown did. Stowers is the successor once PHI moves on from Goedert, which has not happened. 2026 role is TE3.",
  "jonah coleman": "Coleman is DEN's top RB prospect — Payton compared him to Dobbins; Harvey inefficient (3.7 YPC) opens the door.",
  "kenneth gainwell": "TB — the role is now DEFINED, and it is RECEIVING, not committee-runner (camp, Aug 2026). New OC Zac Robinson has Bucky Irving as the clear lead on carries and has made Gainwell the safety valve, working him as a receiver out of the backfield and in the slot rather than as a rotational runner. Robinson is playing the two together in 21-personnel 'pony' sets with Gainwell the primary receiving option from that grouping and Baker Mayfield's easy outlet. Scheme precedent: Robinson's Falcons backs combined for 1,435 receiving yards over his two seasons there. CAVEAT ON HIS METRICS IN THIS APP: the 73 receptions and 1.94 HVT/gm are PITTSBURGH 2025 numbers, produced under a different QB and a different OC. The Receiving Back Stack Qualifier requires re-validation when the driver of past volume changes, and team, QB and OC all changed at once. The new role points the same direction, so treat the 65+ reception elite tier as PROJECTED, not established.",
  "kenny gainwell": "TB — the role is now DEFINED, and it is RECEIVING, not committee-runner (camp, Aug 2026). New OC Zac Robinson has Bucky Irving as the clear lead on carries and has made Gainwell the safety valve, working him as a receiver out of the backfield and in the slot rather than as a rotational runner. Robinson is playing the two together in 21-personnel 'pony' sets with Gainwell the primary receiving option from that grouping and Baker Mayfield's easy outlet. Scheme precedent: Robinson's Falcons backs combined for 1,435 receiving yards over his two seasons there. CAVEAT ON HIS METRICS IN THIS APP: the 73 receptions and 1.94 HVT/gm are PITTSBURGH 2025 numbers, produced under a different QB and a different OC. The Receiving Back Stack Qualifier requires re-validation when the driver of past volume changes, and team, QB and OC all changed at once. The new role points the same direction, so treat the 65+ reception elite tier as PROJECTED, not established.",
  "kimani vidal": "LAC — THIRD in a reshaped room and an active trade/cut candidate (Jul-Aug 2026). Three things moved against him at once: Omarion Hampton is expected fully healthy and profiles as the bell cow, LAC signed speed back Keaton Mitchell in free agency, and Harbaugh fired Greg Roman two days after the 16-3 wild-card loss to NE and hired Mike McDaniel as OC — a full overhaul to a West Coast system that prizes exactly the speed profile Mitchell was signed for. Multiple outlets through camp frame Vidal as a trade candidate (Cincinnati floated most often, for a late 2027 pick) or as the move that spares LA a tough final-cuts decision. His 2025 was real work — 155 carries, 643 yards, 3 rush TD, 16 catches on 22 targets, 136 yards, 10 starts in 13 games — but it was earned in the scheme that just got replaced. Value is CONTINGENT and mostly off-team: the outcome that matters is a trade to a thin backfield, not a role change in LA. Do not count him as functional LAC stack depth.",
  "isiah pacheco": "DET — sprained MCL in camp, expected ready for Week 1 per Dan Campbell (Aug 2026). Note the team: he is a LION now, and he is the BACKUP to Jahmyr Gibbs, so this is handcuff value rather than a standalone role. The knee is the smaller issue; the depth chart is the real ceiling.",
  "patrick mahomes": "KC — FULLY CLEARED, no limitations (updated Aug 10 2026). He tore the ACL AND LCL in his left knee in December 2025 and had surgery; roughly eight months later he is cleared to participate in training camp without restriction, and Andy Reid has confirmed he has regained full strength. Mahomes on the knee: 'It feels great... When you\'re tired sometimes, you don\'t even think about it.' He is scrambling out of the pocket without protecting it. Targeting the Sep 14 opener vs DEN. His 2025 line covers 14 games; the absence was the December surgery, now resolved. Two-ligament reconstruction in a QB\'s plant leg is worth one more check before draft close, but every dated signal currently points the same direction.",
  "drew allar": "PIT — NOT A 2026 ASSET, despite a loud preseason debut (Aug 15 2026). Third-round rookie out of Penn State, No. 76 overall. His Aug 13 debut was genuinely excellent: 10 of 13 for 154 yards, TWO passing TDs and a rushing TD, 155.1 rating, including a 74-yard touchdown to Kaden Wetjen. Beat coverage went from 'rough start' in early camp to 'lit it up.' THE DEPTH CHART IS THE WHOLE STORY THOUGH: Aaron Rodgers is the expected starter and has repeatedly said 2026 is his final season, with second-year Will Howard and veteran Mason Rudolph also in the room. Pittsburgh views Allar AND Howard as long-term developmental options behind Rodgers this year, and Mike McCarthy has been rebuilding Allar's mechanics from scratch in the team's quarterback school — a coach does not overhaul a thrower he intends to play. Standard best ball: undraftable, and his ADP in this app is a tail placement so he resolves rather than vanishing as a notFound row. Where he is interesting is CONTINGENCY and dynasty: Rodgers is 42 and has named this his last year, so the succession matters — but Howard is the other claimant and nothing has separated them. Do not read the preseason line as a 2026 role signal; per the framework, pre-Week-3 snaps against backups are evaluation, and a QB3 lighting up second-team defenses is the least predictive version of that.",
  "germie bernard": "PIT — LED THE OFFENSE in his preseason debut and is making a real case for WR3 (Aug 13 2026). Second-round rookie. He ran the Steelers offense through the first half working primarily FROM THE SLOT, a spot D.K. Metcalf and Michael Pittman Jr. do not typically occupy, so the role is complementary rather than competing with the two established starters. He played MORE THAN TWICE the slot snaps of Roman Wilson, his direct competitor for that job, which is the specific number that separates them. Beat coverage frames him as ending the WR3 debate and notes the opportunity widened further after injuries in the Pittsburgh receiver room. Pre-Week-3 caveat applies — preseason snaps are scheme evaluation before they are role confirmation — but slot usage on the first-team offense against a competitor is a role signal, not a garbage-time one. ADP 198.8 makes this close to free.",
  "seth mcgowan": "IND — WINNING the RB2 job behind Jonathan Taylor as of camp Aug 2026. Seventh-round rookie out of Kentucky (No. 237 overall, acquired via a trade with PIT), 6-0 and 223 lbs at a 4.49 forty — a downhill power back with better footwork than the frame suggests. Jonathan Taylor himself compared him to David Montgomery. HC Shane Steichen: 'He's got some good stretch-cut stuff... he's not scared of contact.' Through two weeks he has dropped no passes, broken a 30-yard TD run in a two-minute drill, and looked good in PASS PROTECTION, which is the specific skill that decides backup RB snaps. OC Jim Bob Cooter: 'He's had a nice start.' THE OPENING IS PARTLY INJURY-MADE: fifth-rounder DJ Giddens, his direct competitor, has a hamstring, so read the lead as real but not yet permanent. Also in the mix as a KICKOFF RETURNER under the new rules, which the staff frames as a fit for backs who 'run through contact.' WHAT HE ACTUALLY IS: a pure handcuff to a top-6 ADP workhorse, not a standalone. Taylor is the undisputed lead and McGowan has no path to volume without an injury ahead of him — but that is exactly the Contingency Protocol shape, since the contingency he covers is an elite RB1. IND playoff slate: W15 @TEN, W16 vs CIN, W17 @CLE.",
  "stefon diggs": "WAS \u2014 Washington's WR2, opposite Terry McLaurin. Signed a one-year deal worth up to $12M and has been practising with the team since early August. He is the best complement Washington has given Jayden Daniels since drafting him; Daniels has talked him up publicly and the two have been building rapport in camp. Coming off 85 catches for 1,013 yards in 2025, when he led his previous team in receiving. THE LIVE QUESTION IS ROLE, NOT AVAILABILITY: he intends to be the best WR2 in the league while still seeing himself as a WR1, so target share behind McLaurin is the thing to watch. WAS playoff slate: W15 vs ATL, W16 @MIN, W17 @JAX.",
  "malik benson": "LV — genuinely rising in camp, but every input that decides BEST BALL value points the other way (Aug 8 2026). THE RISE IS REAL: ESPN's Ryan McFadden had him as one of LV's top THREE receivers through six practices alongside Tre Tucker and Jalen Nailor, he has taken first-team reps, and he has built chemistry with No. 1 overall pick Fernando Mendoza. He is also among the main kick and punt returners alongside Tucker — a second path to touches. PROFILE: 6'1\", 195, 4.37 speed, pure deep threat — 11 of 17 on targets of 20-plus yards in 2025. Brugler's caveats are the ones that matter: 'lacks the rhythm and efficiency to easily separate at the top of routes' and 'lack of desired size and strength will be tough to mask in NFL traffic.' PATH AND CAPITAL ARE BOTH WEAK SIGNALS: Hutchinson CC, then Alabama, then Florida State, then Oregon, and 81 catches for 1,192 yards over 39 combined FBS games — roughly 2 catches a game across four schools — before going in the SIXTH round at pick 195. COACHSPEAK IS GENERIC, NOT FUNCTIONAL: WR coach Azzanni praised 'his effort, his attitude, he's extremely coachable,' which is character language, not role language. OC Andrew Janocko's 'maximize what he does, how he comes off the ball' is scheme-fit confirmation of a deep/return niche, not a target-share promise. THE ROLE IS NOT WON: he is competing with Dont'e Thornton Jr and Jack Bech for WR3 behind Nailor and Tucker, and RotoWire's own framing is that Thornton and/or Bech still have time to gain momentum. TWO OVERHANGS FOR THE PLAYOFF WINDOW: (1) the QB — Cousins is the named starter but a Mendoza takeover is widely treated as inevitable, and the Cousins entry in this app already flags a mid-season change as a live risk for LV pass catchers in W15-17; (2) the schedule — LV WR grades W15 vs DEN AVOID, W16 vs TEN SMASH, W17 @ARI EVEN, and all three game totals sit at 42.5 or below, the lowest three-week environment of any player added this month. For Puppy 3 that shape is backwards: the Avoid week carries weight 2 and the Smash week carries 1.5. Free-roll dart with a real in-season waiver path, not a playoff-window bet. His ADP here is an ESTIMATE anchored to Bech — no market has established one.",
  "erick all": "CIN — back after ~21 months, and the room he is walking into is the real question (Aug 8 2026). CAMP IS LOUD AND THE QB IS THE LOUDEST: Burrow said 'He looks fit, fast, explosive. He'll play a big role for us this year' — the last clause is direct commitment language, not generic praise. OC Dan Pitcher: 'Erick is built a certain way physically and mentally. He's violent.' Gesicki, the man he is competing with, says All has not 'scratched the surface.' One depth chart has him FIRST, ahead of Gesicki and Sample. TWO ACLs ON THE SAME KNEE, 13 MONTHS APART — Oct 2023 at Iowa, then Nov 3 2024 vs LV — plus back surgery at Michigan, and he missed ALL of 2025. But the re-tear has a named, non-recurring cause: All says the first surgery 'wasn't done properly' and that the knee went again because 'the outside of (my) knee was unstable and the tissue was dying from the surgery before.' A failed repair that got revised and a fragile athlete are different forward-looking risks, and this reads as the former, on the player's own account rather than a medical record. THE BEAR CASE IS THE ROOM, NOT THE KNEE: in 2025 CIN ran FOUR tight ends — Sample 53.6% snaps, Gesicki 38.5%, Fant 37.9%, Hudson 17.0% — for 96 combined catches and a 0.000 spike rate for EVERY ONE OF THEM. There was no TE1 to beat out, and the target tree above them is closed (Chase 32.1%, Higgins 18.6%, Chase Brown 14.6% out of the backfield). Discount that season somewhat: Burrow played 8 games, Flacco 13. Pre-injury he was blocking-first — 20 catches on 22 targets for 158 yards in 9 games, 7.9 yards per reception. PLAYOFF SHAPE MATTERS MORE THAN THE ADP HERE: CIN TE grades W15 @CAR Good, W16 @IND SMASH (52.5 total), W17 vs BAL AVOID. BAL @ CIN is the top W17 environment on the board and Baltimore still defends tight ends — do NOT draft him as W17 bring-back exposure to that game, the CIN WR side grades Good there and the TE side does not. Free-roll dart, and note his ADP in this app is an ESTIMATE (no best-ball ADP is published anywhere).",
  "tre harris": "LAC — WR3 is effectively HIS and the scheme that suppressed him is gone (Aug 8 2026). Keenan Allen left, and his only competition for the No. 3 job is 2025 fifth-rounder KeAndre Lambert-Smith and rookie Brenen Thompson — weak, so the open question is the SIZE of the role, not whether he holds it. He opens behind Ladd McConkey and Quentin Johnston in the pecking order. Camp reviews are consistent rather than one-off: he is described as always flashing, and new OC Mike McDaniel gave signal-grade praise — 'He is a grown man... He's put on the appropriate mass through blood, sweat and tears, giving him the muscle and strength that will make him a matchup nightmare.' Read that as ROLE CONFIRMATION on a physical/mismatch profile, not as route-tree expansion or a target-volume promise. WHY THE 2025 LINE UNDERSTATES HIM: 2025 second-round capital, but roughly 30 catches and one score on a 48.5% snap share and 8.4% target share, produced under Greg Roman behind an offensive line brutalized by injuries, and used mainly as a blocker. Roman was fired after the wild-card loss. Do not project the 0.000 spike rate and 81.2% dud rate forward through a coordinator change of that size — but do not assume they vanish either. Dart at ADP 165, real capital plus a real scheme upgrade, third in line for targets.",
  "david njoku": "LAC — the talent is real, the SCHEME is the gate (Aug 8 2026). Signed after the 2026 draft on a cheap ONE-YEAR deal, which is a low org-commitment signal on its own. Camp reviews are genuinely good: separating from defenders, attacking the ball in the air, creating mismatches on linebackers, and he brings 4,000-plus receiving yards and 34 TDs from Cleveland through years of bad QB play, plus 5.6 yards after catch since 2017 (third among TEs with 500+ targets). THE PROBLEM IS NOT THE DEPTH CHART, IT IS THE PLAY CALLER. Mike McDaniel's Miami offenses ranked THIRD-TO-LAST in 12-personnel plays 2022-2025, and that was a deliberate scheme choice, not a personnel accident — Miami had the NFL's HIGHEST two-TE rate in 2021 and fell to fifth-lowest in his first year. Shanahan tree: the fullback functions as the de facto second TE. So the multi-TE-formation thesis floating in Aug 2026 aggregator coverage runs directly against the coordinator's own four-year track record, and there are THREE mouths — Oronde Gadsden II (49/664/3 as a rookie), Charlie Kolar (one of the league's best blocking TEs, who takes the in-line snaps) and Njoku. Beat framing is 'impossible to predict' and 'may very well be all of the above.' Free-roll DART at ADP 210+, not a TE1 and not projectable stack depth. NOTE HIS METRICS ROW READS CLE — the 33 receptions, 63.9% snap share and 0.000 spike rate are 2025 Cleveland, a different team and QB.",
  "myles garrett": "Garrett was traded from CLE to LAR. CLE received Jared Verse + 2027 1st + picks in return. Pass rush remains elite at CLE via Verse. LAR upgraded significantly.",
  "tyler shough": "Saints officially confirmed Shough as franchise QB for 2026. Offensive Rookie of the Year 2025. Saints spent second-most on offense in free agency to support him — Etienne, Edwards, Fant all signed. No camp battle.",
  "jordyn tyson": "Drafted 8th overall by NO as Shough's primary weapon. Immediate WR2 role in confirmed 2026 Saints offense with Olave as WR1.",
  "tua tagovailoa": "ATL, not MIA — released by Miami and signed with Atlanta. Heavy favorite for the starting job; Penix's ACL recovery limits the competition. Missed the opening of camp with a back flare-up (Jul 29 2026), doing individual drills only; he called it precautionary and said he would 'likely' play if it were a game week, and outlets describe a return sooner rather than later. ATL W15-17 all soft matchups — three-week soft window at near-free ADP. Back issues warrant a re-check before drafting.",
  "michael penix": "ATL — recovering from a torn left ACL (Week 11 2025 vs CAR, reconstructive surgery in November). Limited to individual drills and 7-on-7 to open camp and NOT cleared for 11-on-11; Penix himself said full clearance could be ~4 weeks out, near the end of August (AJC, Jul 2026). His own framing: 'I can't afford to have someone trip and fall on me right now.' Contingent value only — but the ATL QB job is genuinely unresolved until he is cleared, which affects every ATL pass-catcher's stack value.",
  "michael penix jr": "Recovering from torn ACL — limits competition with Tua for ATL starting job. Contingent value only.",
  "drake london": "ATL WR1 in confirmed 2026 offense with Tua as heavy favorite for starting job. W15 @WAS (soft), W16 vs TB (soft), W17 vs NO (soft). Three soft weeks.",
  "jahan dotson": "Dotson signed a 2yr/$15M deal with ATL to compete for the WR2 role behind London — Zachariah Branch (2026 draft pick) is the primary competition. Vacant WR room behind London means real opportunity, but the role isn't confirmed. Same three-week soft window (W15 @WAS, W16 vs TB, W17 vs NO) if he wins the job.",
  "emari demercado": "Demercado signed a 1yr deal with KC as a passing-down specialist — 3rd-down receiving back role behind Kenneth Walker. Mahomes checkdown/screen volume makes this a real target share dart. KC W15 vs NE (soft), W16 @SF (tough), W17 vs LAC (soft). Two viable playoff weeks.",
  "zachariah branch": "ATL \u2014 UPGRADED Aug 15 2026. He is competing with Jahan Dotson for WR2 behind Drake London, with the ATL QB situation gating the whole offense. Camp has been emphatic: he was THE MOST IMPRESSIVE PLAYER OF ATLANTA'S FIRST WEEK, and the specifics matter more than the label. Electric athleticism in both 1-on-1 and team drills, ROUTE RUNNING DESCRIBED AS FAR MORE ADVANCED THAN WHAT HE SHOWED AT GEORGIA, and hands reported as arguably the best of any receiver in the building. The route-running note is the important one, because separation-by-technique is the thing that converts a returner-athlete profile into a real target share, and it is exactly what the pre-camp scouting doubted. He made his preseason debut at Mercedes-Benz Stadium. WHAT HAS NOT CHANGED: he is still behind London, still needs the WR2 job over Dotson (2yr/$15M), and the Atlanta QB situation is still the gate on the whole offense. Three-week window remains soft: W15 @WAS, W16 vs TB, W17 vs NO. Per Lens 4 these are pre-Week-3 reps. Re-check after preseason Week 3.",
  "oscar delp": "NO drafted Delp as a developmental TE2 behind Juwan Johnson. 6-5/245, 4.49 40, 38-inch vertical — legitimate athleticism. Kittle comp per Saints Wire. Different skill set from Johnson (blocker/receiver vs. gadget/red zone) means complementary deployment is plausible in Shough's play-action system. Free dart in three soft playoff weeks.",
  "mike washington": "LV RB2 dart. Klint Kubiak historically deploys even two-back splits regardless of talent differential — Walker/Charbonnet SEA is the supporting precedent. Jeanty injury risk opens real volume. LV W16 vs TEN (soft) and W17 @ARI (soft) are two viable playoff weeks at near-free ADP.",
  "kayshon boutte": "AJ Brown arrival at NE crowds target share but Boutte's deep threat profile creates a distinct role that doesn't compete directly with Brown's intermediate/possession work. Maye's aggressive downfield tendency means vertical shots are part of the scheme regardless of Brown's presence. Boutte is a role-specific dart — not a volume play — who fires in games where Maye takes deep shots. NE W15 @KC is a legitimate bring-back game for KC stacks.",
  "jaylin noel": "HOU — the ROLE resolved UPWARD (Jul 2026): SI's camp depth chart lists him as a STARTER alongside Nico Collins and Jayden Higgins, with Tank Dell and Xavier Hutchinson as backups. Dell was NOT placed on PUP (so he is cleared) but was held out of full-team reps to open camp and is being brought along slowly after the Dec 2024 knee dislocation. OUTLET CONFLICT: other reporting still frames Dell as battling Noel and Hutchinson for WR3, and both framings are circulating in early August — do not treat the starter listing as settled. THE SCHEDULE VERDICT IS A SEPARATE AXIS AND STILL STANDS: HOU is a 3-week playoff avoid (JAX W15, @PHI W16, @GB W17). Better player, same dead window.",
  "carson beck": "ARI — STARTED THE HALL OF FAME GAME Aug 6 2026 and was the best player on the field in the first half: 15/19, 188 yards, 1 TD, 125.4 rating, one sack, two scoring drives, out at halftime with the game tied 17-17. Highlights were a 49-yard deep ball to Jalen Brooks (3-99 in the half) and a 5-yard TD fade to Simi Fehoko. Arm strength is the flagged question. CAR won 33-30 on Haynes King's walk-off 5-yard run. BUT THE JOB IS NOT OPEN: Brissett's holdout ended in late July on a reworked $15.5M/up-to-$21M deal and reporting has him starting Week 1 vs LAC, with HC LaFleur saying it benefits Beck to sit. Read this as a strong audition for a LATE-SEASON contingency, not a Week 1 threat.",
  "jacoby brissett": "ARI — HOLDOUT RESOLVED (late Jul 2026). Reworked deal at $15.5M base with up to $21M in incentives, characterised as clear-cut starter money; he reported and is practising. As of Aug 6, the plan is for him to start Week 1 against the Chargers. Any note describing an ACTIVE holdout, missed OTAs, or Beck competing for the Week 1 job is stale — Beck's strong Hall of Fame start does not change the depth chart, and LaFleur has said sitting benefits Beck.",
  "jonathan taylor": "IND — SIGNED A 2yr/$44M EXTENSION (up to $47M, $39M guaranteed) on Aug 6 2026, running through 2028. Reporting frames him as the undisputed lead option in the Colts backfield, which removes the contract-year overhang that sat on him all summer. This strengthens rather than changes the existing read: his 2025 rate stats were suppressed by the Daniel Jones injury sinking the whole offense, and the org has now paid him like a workhorse.",
  "george holani": "SEA — TAKING FIRST-TEAM REPS (Aug 1 2026). ESPN's Brady Henderson called him 'the biggest surprise of Seattle's offseason workouts': across six full-squad practices it was Holani, NOT first-round pick Jadarian Price or free-agent addition Emanuel Wilson, who tended to get the first crack with the No. 1 offense. THE ROOM OPENED UP COMPLETELY — Kenneth Walker III left for KC in free agency and Zach Charbonnet is on PUP with an ACL tear from the January playoff game, with a midseason return the reported possibility and NO stated ETA. Price is still expected to lead the backfield but has to prove pass protection and receiving first; Holani's edge over Wilson is specifically pass-catching (Wilson caught 15 balls for 99 yards in 2025). Career context: UDFA 2024, 3 carries as a rookie, 22-73 rushing plus 2-15 receiving in 2025 — so the 2025 metrics in this app are a 4-game, 15% snap-share sample and are NOISE, not a projection. Contingency profile, not a standalone: he is a live handcuff to a rookie lead back on a team whose top two backs from last season are both gone. SUPERSEDED IN PART (Aug 8 2026) — the Aug 1 first-team-reps item above is accurate for the date it was written but the battle has since resolved toward Price, who took the opening first-team rep in the first full-team scrimmage on Jul 30 and whom beat reporting now describes as the increasingly clear RB1, with Holani expected to be an important piece of the room and the likely RB2. That is a demotion in expected role but NOT in handcuff value: Price missed Aug 7 practice with lower-body soreness and Charbonnet still has no return date, so the contingency this entry was written for is intact. Keep the dated sequence rather than collapsing it — Holani genuinely led early, and Price genuinely passed him.",
};

// Player verdicts from memory — date-stamped for freshness check
const VERDICTS = {
  "hubbard": { verdict: "fade", date: "2026-05-19", reason: "3.8 YPC, Brooks returning, classic Hubbard Trap", confidence: "HIGH" },
  "chuba hubbard": { verdict: "fade", date: "2026-05-19", reason: "3.8 YPC, Brooks returning, classic Hubbard Trap", confidence: "HIGH" },
  "rj harvey": { verdict: "fade", date: "2026-05-19", reason: "3.7 YPC, pass-pro issues, ADP rising wrong way", confidence: "HIGH" },
  "jk dobbins": { verdict: "fade", date: "2026-05-19", reason: "Two major knee surgeries, Harvey ahead", confidence: "HIGH" },
  "j.k. dobbins": { verdict: "fade", date: "2026-05-19", reason: "Two major knee surgeries, Harvey ahead", confidence: "HIGH" },
  "tony pollard": { verdict: "fade", date: "2026-05-19", reason: "31 years old, Cam Ward era TEN = pass-first", confidence: "HIGH" },
  "tyler allgeier": { verdict: "TARGET", date: "2026-08-15", reason: "Listed RB1 on ARI's first depth chart ahead of Love; 2yr/$12.25M; 19 GZ carries in 2025", confidence: "MEDIUM" },
  "mike washington": { verdict: "TARGET", date: "2026-06-10", reason: "Speculative dart at near-free ADP 192. Klint Kubiak historically deploys even two-back splits regardless of talent differential — Walker/Charbonnet split in SEA is the supporting precedent. Jeanty injury risk opens real volume. LV W16 vs TEN (soft) and W17 @ARI (soft) are two viable playoff weeks. Combine fraud and fumble history are real concerns but irrelevant at this price in a Kubiak scheme that manufactures opportunities.", confidence: "SPECULATIVE" },
  "rashee rice": { verdict: "TARGET", date: "2026-08-08", reason: "First dated verdict for him — the knee overhang has materially improved. Aug 5: first 11-on-11 work of camp, took contact and got straight back up, with KC reported comfortable letting him hit on that knee. Still a deliberate extended ramp-up rather than a clearance, and KC wants to see the rest of camp and the preseason. Elite route runner in a Mahomes offense with a 28.8% target share and 0.500 spike rate across his 2025 eight-game sample, priced at an ADP set off the worse picture. The second overhang has NOT moved and is not an injury question: probation-related discipline is a live RISK with no league ruling, so treat a 2026 suspension as unresolved rather than scheduled. Contract year.", confidence: "MEDIUM" },
  // Pearsall carries a fade VERDICT specifically so the PIVOT ENGINE screens him out.
  // That filter keys on VERDICTS fade/HARD FADE, and he had no VERDICTS row at all —
  // so a season-ending IR player sitting at ADP 101 could be recommended to a user as
  // an upgrade over a WR they actually drafted. Do not delete this to "clean up" a
  // roster he is not on; the entry exists for the recommendation path, not the grade.
  "ricky pearsall": { verdict: "fade", date: "2026-08-14", reason: "OUT FOR 2026 — season-ending PCL surgery on the right knee, placed on IR Aug 1. Same PCL that cost him 8 games in 2025, re-aggravated after two camp practices. Lynch expects a full 2027 recovery; PCL rehab runs 6-12 months. Undraftable this season at any price, and his ADP is stale market residue rather than a live valuation. His vacated targets caused the Deebo signing and lift Evans and Stribling.", confidence: "HIGH" },
  "kayshon boutte": { verdict: "TARGET", date: "2026-06-10", reason: "Role-specific deep threat dart at near-free ADP. AJ Brown arrival crowds volume but Boutte's vertical speed profile creates a distinct usage pattern that doesn't compete directly with Brown's intermediate/possession role or Doubs' slot work. Drake Maye's aggressive downfield tendency means vertical shots are part of the scheme regardless of Brown's presence — Boutte is the designated speed option on the outside. Not a weekly starter thesis. Best ball only needs 3-4 deep shot games. NE W15 @KC is the bring-back ceiling game for KC stacks — negative game script in that matchup actually increases Boutte's deep shot volume.", confidence: "SPECULATIVE" },
  "jaxson dart": { verdict: "TARGET", date: "2026-06-03", reason: "NYG run-heavy limits ceiling but W17 @DAL + DAL bottom-5 defense is a real spike week; late-round leverage play", confidence: "MEDIUM" },
  "jakobi lane": { verdict: "TARGET", date: "2026-08-15", reason: "Runaway BAL camp standout, first-team reps, red-zone chemistry with Lamar; ADP 214.7 -> 162.7", confidence: "MEDIUM" },
  "lamar jackson": { verdict: "hold", date: "2026-06-04", reason: "Mixed playoff schedule — W15 @PIT tough, W17 @CIN soft; scheme uncertainty under Minter/Doyle is the real flag", confidence: "MEDIUM" },
  // Targets
  "luther burden": { verdict: "TARGET", date: "2026-05-19", reason: "2.83 YPRR rookie, 26.1% target rate, Moore vacated", confidence: "HIGH" },
  "jadarian price": { verdict: "TARGET", date: "2026-08-08", reason: "Refreshed off camp rather than draft profile. R1 capital into a room emptied by construction — Walker left in free agency, Charbonnet on PUP with a January ACL and no return date. The reps battle resolved his way: opened behind Holani with the No. 1 offense, then took the opening first-team rep in the first full-team scrimmage (Jul 30), and beat reporting now reads RB1 as increasingly clearly his. Receiving work is the standout. Two drags, both real: lower-body soreness cost him the Aug 7 practice (reported not serious, unresolved as of this date), and W17 @CAR is a 40.5-42.5 total — the weakest championship-week environment of any RB in the pool.", confidence: "HIGH" },
  "kc concepcion": { verdict: "TARGET", date: "2026-05-19", reason: "R1 capital at R5 ADP, WR1 role, vacated targets", confidence: "HIGH" },
  "carnell tate": { verdict: "TARGET", date: "2026-05-19", reason: "R1 capital, WR1 role confirmed, refined route runner", confidence: "HIGH" },
  "kyler murray": { verdict: "TARGET", date: "2026-08-12", reason: "RESOLVED — named the Week 1 starter on Aug 12 2026, ending the McCarthy competition after ~10 days of camp. O'Connell: 'Kyler will begin the process of really looking at things now as our starter,' with McCarthy the backup and no leash language attached. That removes the availability risk that previously made every Vikings pass catcher a coin flip, which is the whole reason this entry existed. MIN's W16-17 window is strong and now stackable without the QB hedge.", confidence: "HIGH" },
  "justin jefferson": { verdict: "TARGET", date: "2026-07-28", reason: "Elite WR1 regardless of QB — Jefferson creates separation at a rate that transcends scheme. Kyler Murray (heavy favorite for MIN job) is a significant ceiling upgrade over JJ McCarthy, whose 2025 play is exactly what capped Jefferson: 142 targets and a 30% share produced nine usable weeks and ZERO above 18 half-PPR. That is a QB-suppressed ceiling, not a decline — treat the 2025 spike rate as a description of McCarthy, not of Jefferson. If Murray wins the job he is a top-3 overall pick.", confidence: "HIGH" },
  "jordan addison": { verdict: "TARGET", date: "2026-06-07", reason: "MIN WR2 with real upside tied directly to the QB situation. Kyler Murray heavily favored to start — if confirmed, Addison's ceiling jumps materially as a field-stretcher in a pass-volume offense. QB situation unresolved but trending right.", confidence: "MEDIUM" },
  "tj hockenson": { verdict: "hold", date: "2026-06-07", reason: "Returning from ACL — health is the primary question, not scheme fit. If healthy, Murray's strong TE usage history (McBride in ARI) is a real upside signal. ADP reflects the injury discount; worth the dart if he's fully cleared at camp.", confidence: "MEDIUM" },
  "t.j. hockenson": { verdict: "hold", date: "2026-06-07", reason: "Returning from ACL — health is the primary question, not scheme fit. If healthy, Murray's strong TE usage history (McBride in ARI) is a real upside signal. ADP reflects the injury discount; worth the dart if he's fully cleared at camp.", confidence: "MEDIUM" },
  // Deliberately "hold" rather than "TARGET": TARGET scores +0.3 and his MIN
  // role is unestablished. Upgrading it is a one-word change — Spencer's call.
  "jauan jennings": { verdict: "hold", date: "2026-07-28", reason: "Two role changes stacked, so 2025 describes a job he no longer has: SF to MIN, into the Murray QB upgrade. His SF year was high-floor and capped — 93 targets, 55 catches, 0.533 usable but ZERO weeks above 18 half-PPR — while 22 red-zone and 9 end-zone targets say the underneath and scoring role is real. On MIN he is behind Jefferson and Addison, so the target share is unproven, but the same QB change that lifts them lifts him. Treat the flat 2025 ceiling as a function of SF's offense, not his profile.", confidence: "MEDIUM" },
  "tyler shough": { verdict: "TARGET", date: "2026-06-10", reason: "Confirmed NO franchise QB for 2026 — Saints officially committed, built entire offense around him. Offensive Rookie of the Year 2025, 250.7 pass yds/gm in starts (would rank 6th in NFL). Saints spent second-most on offense in free agency: Etienne, Edwards, Fant. No camp battle — the job is his.", confidence: "HIGH" },
  "caleb williams": { verdict: "TARGET", date: "2026-05-19", reason: "Year 3 leap, Ben Johnson retained, best NFC stack anchor", confidence: "HIGH" },
  "brock bowers": { verdict: "TARGET", date: "2026-05-19", reason: "TE1 in easiest 3-week playoff window in league", confidence: "HIGH" },
  "harold fannin": { verdict: "TARGET", date: "2026-06-03", reason: "72/731/6 as rookie, 31% target share, Monken now HC brings same pass-heavy identity as HC", confidence: "HIGH" },
  "cam skattebo": { verdict: "TARGET", date: "2026-07-15", reason: "NYG lead-back role is elite when healthy (all inside-10 carries + 15% target share in healthy games). Tightrope ankle recovery is priced into ADP; July reports say full-go for camp.", confidence: "MEDIUM-HIGH" },
  "kaytron allen": { verdict: "TARGET", date: "2026-06-03", reason: "Best late dart, WAS run-heavy, Quinn retained as HC", confidence: "LOTTERY" },
  "omarion hampton": { verdict: "TARGET", date: "2026-05-19", reason: "McDaniel zone-run scheme-perfect", confidence: "HIGH" },
  "jaylen warren": { verdict: "TARGET", date: "2026-06-03", reason: "RB17 in 2025, PPR-friendly, McCarthy HC brings run-heavy identity to PIT", confidence: "HIGH" },
  "eli stowers": { verdict: "fade", date: "2026-08-05", reason: "SUPERSEDES the May 19 buy-now read, which rested on a FALSE PREMISE — Goedert did not leave, A.J. Brown did. As of Aug 2 Stowers is TE3, behind Goedert and Johnny Mundt, who takes first-team 12-personnel reps because new OC Mannion pairs a blocking TE with a receiving TE. Stowers is not yet an NFL-caliber blocker and lost spring development reps to a leg injury. Still the successor whenever PHI moves on from Goedert, but that is a 2027 thesis and not a 2026 one.", confidence: "MEDIUM-HIGH" },
  // 2026 role-concern fades — filtered from pivot recommendations
  "alvin kamara": { verdict: "fade", date: "2026-08-23", reason: "MCL sprain, out at least a month and misses Week 1 — receiving role intact when healthy but the early-season floor is gone", confidence: "HIGH" },
  "david montgomery": { verdict: "TARGET", date: "2026-07-15", reason: "Mixon-2024-style volume role in HOU: heavy rushing + goal-line share with only day-3 competition (Woody Marks). O-line (31st) and age are the caps — volume floor makes him fine at cost, not a fade.", confidence: "MEDIUM" },
  "d'andre swift": { verdict: "fade", date: "2026-05-26", reason: "Committee back in CHI, no clear bell-cow role", confidence: "MEDIUM" },
  "breece hall": { verdict: "fade", date: "2026-05-26", reason: "Contract narrative, NYJ rebuild, role uncertainty", confidence: "MEDIUM" },
  "derrick henry": { verdict: "TARGET", date: "2026-06-03", reason: "Defied age cliff every season, BAL run-heavy, W16 CLE and W17 @CIN are soft closes", confidence: "MEDIUM" },
  "stefon diggs": { verdict: "hold", date: "2026-08-05", reason: "SUPERSEDES the May 26 free-agent/effectively-retired read. Signed with WASHINGTON on a 1yr/$12M deal Aug 5 2026, pairing him with Jayden Daniels. He was New England's leading receiver in 2025 (85-1,013) before they released him in March over a rising cap hit, so this is a real role rather than a camp body. WAS playoff slate: W15 vs ATL, W16 @MIN, W17 @JAX.", confidence: "MEDIUM" },
  "christian mccaffrey": { verdict: "hold", date: "2026-06-04", reason: "Elite talent but injury fragility is a real ADP risk at this price", confidence: "MEDIUM" },
  "cmc": { verdict: "hold", date: "2026-06-04", reason: "Elite talent but injury fragility is a real ADP risk at this price", confidence: "MEDIUM" },
  "travis hunter": { verdict: "hold", date: "2026-08-05", reason: "SUPERSEDES the Jun 7 read, which assumed a settled WR role. He is fully recovered from the torn LCL and cleared for full camp participation, but reporting has him deployed PRIMARILY AT CORNERBACK with a rotational WR package — how much offense he actually plays is explicitly unresolved. Coen year 2 continuity is real; the snap allocation is the open question, and a WR2 projection presumes usage nobody has confirmed.", confidence: "MEDIUM" },
  "chris olave": { verdict: "TARGET", date: "2026-06-10", reason: "Confirmed NO WR1 in fully committed Shough offense. Tyson as WR2 absorbs some targets but Olave remains the primary. Three soft playoff weeks — W15 @TB, W16 vs ARI, W17 @ATL.", confidence: "HIGH" },
  "jordyn tyson": { verdict: "TARGET", date: "2026-06-10", reason: "8th overall pick, immediate WR2 role in confirmed Shough offense. NO W15-17 all soft. R1 capital at mid-round ADP — real discount.", confidence: "MEDIUM-HIGH" },
  "drake london": { verdict: "TARGET", date: "2026-06-10", reason: "ATL WR1 with Tua as heavy favorite for starting role. W15 @WAS (soft), W16 vs TB (soft), W17 vs NO (soft). Three soft weeks. Best non-NO window player at his ADP.", confidence: "HIGH" },
  "zachariah branch": { verdict: "TARGET", trend: "rising", trendNote: "UPGRADED from a speculative dart Aug 15 2026. Named the most impressive player of Atlanta's first week of camp, with route running described as far more advanced than his Georgia tape and hands reported as the best in the building. The route-running detail is the one that matters — it is what turns a returner-athlete profile into a real target share, and it was the specific pre-camp doubt. Still behind Drake London, still needs the WR2 job over Jahan Dotson, and the ATL QB situation still gates the whole offense. Soft three-week window: W15 @WAS, W16 vs TB, W17 vs NO.", situationFlags: ["breakout_profile"], riskFlags: ["qb_uncertainty", "creeping_committee"] },
  "oscar delp": { verdict: "TARGET", date: "2026-06-10", reason: "NO drafted Delp (R2/R3 capital) as TE2 behind Juwan Johnson. 6-5/245, 4.49 40, Kittle comp per Saints Wire. Complementary skill set — blocker/receiver vs. Johnson's gadget/red zone role. Shough play-action scheme targets middle of field. Real target path at near-free ADP in three soft playoff weeks.", confidence: "SPECULATIVE" },
  "tua tagovailoa": { verdict: "TARGET", date: "2026-06-10", reason: "Signed with ATL as heavy favorite — Penix recovering from torn ACL. ATL W15 @WAS (soft), W16 vs TB (soft), W17 vs NO (soft). Three soft weeks at ~207 ADP. Near-free QB dart with clean window. Confirm starter at camp.", confidence: "MEDIUM-HIGH" },
  "brian thomas": { verdict: "TARGET", date: "2026-06-07", reason: "JAX WR1 in Liam Coen's second year — system continuity removes the scheme-learning discount. Thomas posted elite separation metrics in 2025 and Lawrence chemistry is locked in. One of the cleaner WR2 profiles in the range.", confidence: "HIGH" },
  "brian thomas jr": { verdict: "TARGET", date: "2026-06-07", reason: "JAX WR1 in Liam Coen's second year — system continuity removes the scheme-learning discount. Thomas posted elite separation metrics in 2025 and Lawrence chemistry is locked in. One of the cleaner WR2 profiles in the range.", confidence: "HIGH" },
  "trevor lawrence": { verdict: "TARGET", date: "2026-06-07", reason: "Coen year 2 removes the offensive system uncertainty that capped Lawrence in 2025. Full offseason in the scheme, established WR room with Thomas and Hunter — QB upside is real if health holds.", confidence: "MEDIUM-HIGH" },
  "jj mccarthy": { verdict: "fade", date: "2026-08-12", reason: "Lost the MIN job on Aug 12 2026 — Murray is the Week 1 starter and McCarthy is the backup, with his continued reps framed by O'Connell as development rather than live competition. Contingency value only from here; no standalone path and not stackable.", confidence: "HIGH" },
  "j.j. mccarthy": { verdict: "fade", date: "2026-08-12", reason: "Lost the MIN job on Aug 12 2026 — Murray is the Week 1 starter and McCarthy is the backup, with his continued reps framed by O'Connell as development rather than live competition. Contingency value only from here; no standalone path and not stackable.", confidence: "HIGH" },
};

// ============ 2026 NFL COACHING REFERENCE (verified June 2026) ============
// Use this to keep trendNotes and verdicts accurate. Update each offseason.
// KEY CHANGES FROM 2025:
//   BAL: HC Jesse Minter (ex-LAC DC), OC Declan Doyle — Harbaugh gone to NYG
//   NYG: HC John Harbaugh (from BAL), OC Matt Nagy
//   BUF: HC Joe Brady (replaced McDermott), OC Pete Carmichael Jr
//   LAC: HC Mike McDaniel (from MIA) — zone-run system continues, Hampton is scheme fit
//   MIA: New HC (McDaniel gone) — Achane role intact, new staff inherits featured weapon
//   PIT: HC Mike McCarthy (from DAL/GB) — run-heavy identity, Warren benefits
//   CLE: HC Todd Monken (from BAL OC), OC Travis Switzer — Switzer was BAL run-game coord
//   DAL: HC Brian Schottenheimer, OC Klayton Adams
//   LV:  HC Klint Kubiak (from SEA), OC Andrew Janocko
//   NO:  HC Kellen Moore, OC Doug Nussmeier — Staley DC
//   ATL: HC Kevin Stefanski, OC Tommy Rees
//   ARI: HC Mike LaFleur, OC Nathaniel Hackett
//   CHI: HC Ben Johnson (retained), OC Press Taylor — passing game continuity
//   WAS: HC Dan Quinn (retained), OC David Blough — Reich gone
//   DEN: HC Sean Payton, OC Davis Webb — Payton surrendered play-calling
//   SF:  HC Kyle Shanahan RETAINED — McCaffrey fade = injury, not scheme change
//   Stable (no major changes): KC, MIN, DET, GB, PHI, SEA, LAR, TEN, HOU, IND, JAX, CAR, TB, NYJ
// ==========================================================================

// ============ SITUATIONS — static, curated, freshness-gated ============
// Used by Championship Window Score (Component 3) and share card feedback copy
// situationFlags: committee_breaker | target_vacuum | breakout_profile | scheme_fit
// riskFlags: creeping_committee | injury_history | ol_dependency | contract_year | qb_uncertainty | regression_risk
// regression_risk (added Jul 15 2026): last season's production leaned on a historically
// non-repeatable input — e.g. outlier deep-ball accuracy, TD-or-deep dependency, or big
// overperformance vs volume-based expectation. Context flag only, no score penalty.
// roleCeiling: slot_only | rz_dependent
//   slot_only    → sub-7 aDOT WR; high target share but no downfield or red zone role; hard TD ceiling cap
//   rz_dependent → player value almost entirely TD-driven; near-zero floor if not scoring
const SITUATIONS = {
  "cyrus allen": { verdict: "dart", trend: "rising", trendNote: "KC rookie WR, 2026 5th round (176 ovr, Cincinnati - 51/674/13 in 2025, a program single-season TD record and the Big 12 lead). Jul 29 2026: took first-team reps at the opening training-camp practice alongside Worthy/Thornton/Royals, with Andy Reid volunteering that Cyrus had a good day and Mahomes has some trust there - signal-grade language, not generic praise. Two honest caveats: those reps opened up partly because Rashee Rice (knee) left before 7-on-7s, and this is pre-Week-3 camp, where snaps reflect scheme evaluation rather than role. Contingent dart on a thin KC room with elite QB play; no standalone path confirmed", situationFlags: ["breakout_profile"], riskFlags: [] },
  "jonathan taylor": { verdict: "TARGET", trend: "stable", trendNote: "2025 rate stats understate him (noted Jul 28 2026): Daniel Jones tore through half a season then went down, and the whole IND offense sank with the backup — yet Taylor still posted a 35% nuclear-week rate, best of any RB. The spike profile is real and the QB constraint is resolved with Jones healthy for 2026. Thin receiving role (2.7 rec/g) is the honest cap in PPR formats", situationFlags: ["scheme_fit"], riskFlags: [] },
  "bijan robinson": { verdict: "TARGET", trend: "stable", trendNote: "Locked bell-cow, zero backfield competition", situationFlags: ["scheme_fit"], riskFlags: [] },
  "jahmyr gibbs": { verdict: "TARGET", trend: "stable", trendNote: "Co-lead with Montgomery but target share is elite", situationFlags: ["scheme_fit"], riskFlags: [] },
  "saquon barkley": { verdict: "TARGET", trend: "stable", trendNote: "Workhorse with AJ Brown gone — even more targets now", situationFlags: ["target_vacuum"], riskFlags: [] },
  "james cook": { verdict: "TARGET", trend: "rising", trendNote: "Bellcow in a top-6 implied offense with a top-3 O-line — RB6 ppg last year reads like his floor. Untapped receiving ceiling: new OC Carmichael fed Payton-tree backs for 18 years, and Joe Brady put Cook on a 63-target pace the last time he called plays without interference (2023)", situationFlags: ["scheme_fit"], riskFlags: [] },
  "emeka egbuka": { verdict: "TARGET", trend: "rising", trendNote: "Year-2 breakout candidate moving to his natural off-line Z/flanker role (the Kupp role) under new OC Zac Robinson — last year he was typecast at X out of position. Pre-hamstring rookie stretch was elite (WR3 through five weeks, 2.49 yards per route run); Godwin shifts to the slot", situationFlags: ["breakout_profile", "scheme_fit"], riskFlags: [] },
  "tez johnson": { verdict: "fade", trend: "stable", trendNote: "TB WR4/5 depth dart (added Jul 21 2026). 7th-round 2025 rookie who flashed on 28/322/5 — but only because Evans/Godwin/McMillan were all hurt (57-73% snaps W6-13, faded once healthy). 2026 room ahead of him got deeper (Egbuka arrived, Godwin healthy, McMillan back), so he's a pure contingent/injury-dependent stash with no standalone path at full health", situationFlags: [], riskFlags: ["injury_history"] },
  "jaxon smith njigba": { verdict: "HOLD", trend: "falling", trendNote: "Elite talent, but last year's WR1-overall season leaned on non-repeatable inputs: 26% of his fantasy points came on 16 deep play-action targets from the most accurate deep-ball QB season in five years, he averaged one red-zone target per game (fewest of any elite WR1), and he ran roughly 5 ppg above volume-based expectation. Kubiak's deep-PA design also left with him", situationFlags: [], riskFlags: ["regression_risk"] },
  "garrett wilson": { verdict: "TARGET", trend: "rising", trendNote: "Talent case is proven: 33.7% target share in his 2025 games, league-best first-read rate, produced through the worst passing offense of the last five years. Geno Smith and a real O-line lift the constraint — but the top-12 calls require NYJ reaching league-average pass volume, and Vegas has them dead last at 18.3 implied PPG. Talent yes; size-of-pie bet unproven", situationFlags: ["target_vacuum"], riskFlags: [] },
  "jaylen waddle": { verdict: "TARGET", trend: "rising", trendNote: "Elite per-route efficiency suppressed for years by Tyreek's first-read share (2.44 YPRR since 2022, 8th-best). DEN sent a first for him to be the WR1 joker in Payton's offense — 7th-best YPRR on play-action lands on the team with the 3rd-most PA attempts, behind the league's best O-line", situationFlags: ["scheme_fit", "target_vacuum"], riskFlags: [] },
  "tee higgins": { verdict: "TARGET", trend: "stable", trendNote: "Same half-PPR ppg as Pickens last year at a round-later price, in the league's #2 implied offense. 21 TDs in his last 27 games; every healthy Burrow season is 36+ passing TDs. The WR2 tax you're not paying", situationFlags: ["scheme_fit"], riskFlags: [] },
  "michael pittman jr": { verdict: "TARGET", trend: "stable", trendNote: "Floor buy: WR26 ppg last year (14 ppg with a healthy Daniel Jones) priced as the WR48. Career 8.9 aDOT is a hand-in-glove fit for Rodgers' league-fastest time to throw and league-lowest aDOT; McCarthy offenses run top-10 pass volume nearly every year. Metcalf takes the deep decoy work, Pittman takes the catches", situationFlags: ["scheme_fit"], riskFlags: [] },
  "michael pittman": { verdict: "TARGET", trend: "stable", trendNote: "Floor buy: WR26 ppg last year (14 ppg with a healthy Daniel Jones) priced as the WR48. Career 8.9 aDOT is a hand-in-glove fit for Rodgers' league-fastest time to throw and league-lowest aDOT; McCarthy offenses run top-10 pass volume nearly every year. Metcalf takes the deep decoy work, Pittman takes the catches", situationFlags: ["scheme_fit"], riskFlags: [] },
  "ashton jeanty": { verdict: "TARGET", trend: "rising", trendNote: "Early camp reports: workhorse usage from Day 1", situationFlags: ["breakout_profile"], riskFlags: [] },
  "devon achane": { verdict: "TARGET", trend: "stable", trendNote: "Elite pass-catcher in MIA offense, locked role — new staff inherits a featured weapon", situationFlags: ["scheme_fit"], riskFlags: [] },
  "omarion hampton": { verdict: "TARGET", trend: "rising", trendNote: "Year-2 breakout bet with real bellcow evidence: 4 rookie games above 75% snap share and 80%+ of team inside-5 carries when on the field. McDaniel backfields have averaged 25+ expected fantasy points per game his whole career — the scheme feeds whoever wins this job, and Hampton's the favorite", situationFlags: ["scheme_fit", "breakout_profile"], riskFlags: [] },
  "cam skattebo": { verdict: "TARGET", trend: "stable", trendNote: "NYG lead back — in his 5 healthy games above 50% snaps he owned 100% of backfield inside-10 carries with a 15% target share (~20 ppg pace). Tightrope ankle surgery is the real risk (that procedure has a poor next-season track record) but July reports say full-go for camp and the ADP already prices the injury in", situationFlags: ["scheme_fit"], riskFlags: ["injury_history"] },
  "travis etienne": { verdict: "TARGET", trend: "rising", trendNote: "NO's lead back on a 2yr/$14M deal, and the workload just widened (updated Aug 23 2026). Alvin Kamara carries an MCL sprain with an expected absence of at least a month, so Etienne opens the season with the backfield to himself rather than splitting passing downs. That matters most in the W1-14 qualifying round, where a September bell-cow stretch is exactly the cumulative scoring the Advance Rate Layer rewards. Re-validate his receiving share once Kamara is back — the passing-down role is Kamara's when healthy, so the full workload is a start-of-season condition, not a season-long projection. NO's playoff slate: W15 @TB, W16 vs ARI, W17 @ATL.", situationFlags: ["committee_breaker", "target_vacuum"], riskFlags: [] },
  "brock bowers": { verdict: "TARGET", trend: "stable", trendNote: "TE1 in league's easiest playoff window", situationFlags: ["target_vacuum"], riskFlags: [] },
  "harold fannin": { verdict: "TARGET", trend: "stable", trendNote: "72/731/6 as rookie, 31% target share, elite floor", situationFlags: ["target_vacuum"], riskFlags: [] },
  "trey mcbride": { verdict: "TARGET", trend: "stable", trendNote: "Locked TE1 with elite target share in ARI air attack", situationFlags: ["target_vacuum"], riskFlags: [] },
  "caleb williams": { verdict: "TARGET", trend: "rising", trendNote: "Year 3 leap expected, Ben Johnson retained, CHI stack anchor", situationFlags: ["breakout_profile"], riskFlags: [] },
  "carnell tate": { verdict: "TARGET", trend: "stable", trendNote: "R1 capital, WR1 role confirmed in TEN offense", situationFlags: ["breakout_profile"], riskFlags: [] },
  "kc concepcion": { verdict: "TARGET", trend: "stable", trendNote: "R1 pick at WR5 ADP, vacated CLE target tree is massive", situationFlags: ["target_vacuum", "breakout_profile"], riskFlags: [] },
  "jadarian price": { verdict: "TARGET", trend: "rising", trendNote: "R1 capital + Charbonnet ACL = path to workhorse snaps, and the camp battle has RESOLVED his way: he opened behind Holani on the No. 1 offense but took the opening first-team rep in the first full-team scrimmage (Jul 30) and beat reporting now reads RB1 as increasingly his, Holani as RB2. Receiving reps have been a standout. Two live drags: he missed Aug 7 practice with lower-body soreness (reported not serious, unresolved as of Aug 8), and his W17 @CAR is a 40.5-42.5 total, the weakest championship-week environment for any RB in the pool.", situationFlags: ["committee_breaker", "breakout_profile"], riskFlags: [] },
  "patrick mahomes": { verdict: "TARGET", trend: "rising", trendNote: "Cleared for full camp participation with no limitations about eight months after December surgery repairing a torn ACL and LCL in the left knee, and Reid has confirmed full strength returned. He is scrambling without protecting the leg and is targeting the Sep 14 opener. His 2025 line stops at 14 games because of that December injury, not a role change. Two-ligament reconstruction in the plant leg justifies one final pre-draft check, but every dated signal points the same way.", situationFlags: ["scheme_fit"], riskFlags: ["injury_history"] },
  "alec pierce": { verdict: "hold", trend: "falling", trendNote: "Has not practiced at all this summer. Ballard\'s Jul 28 'week or two' has elapsed with no return and Steichen has since given NO timetable, which is a degradation rather than a delay. Active/PUP so he can be activated whenever cleared. The 4yr/$114M extension makes org commitment unambiguous, but the surgery addressed a LEFT ANKLE problem he had managed since 2024 — chronic, not acute — and the March procedure\'s ~6-month window points at September. Week 1 unresolved; the cost lands in the W1-14 qualifying round rather than the W15-17 window.", situationFlags: [], riskFlags: ["injury_history"] },
  "luther burden": { verdict: "hold", trend: "stable", trendNote: "DOWNGRADED Aug 10 2026 on availability, not talent. Groin injury Aug 8 costs him roughly a month — the rest of camp and all of preseason — with Week 1 vs CAR the hopeful target and no regular-season absence expected. The problem for a best-ball price around ADP 58 is that the ascending WR1 read never gets confirmed: he logs zero preseason snaps, and snap share after preseason Week 3 is the signal that is supposed to override camp talk. Profile itself is intact (2.83 YPRR rookie, 26.1% target rate, Moore volume vacated), so this is a ramp-and-confirmation risk rather than a role reversal. Revisit if he practices before the opener.", situationFlags: ["breakout_profile", "target_vacuum"], riskFlags: ["injury_history"] },
  "eli stowers": { verdict: "fade", trend: "falling", trendNote: "TE3 as of Aug 2 2026 — behind Goedert AND Johnny Mundt, who is taking first-team 12-personnel reps because new OC Mannion pairs a blocking TE with a receiving TE. Stowers is not yet an NFL-caliber blocker and lost spring development reps to a leg injury. The old TARGET rested on a false premise: Goedert did not leave, A.J. Brown did. Still the successor whenever PHI moves on from Goedert — that is a 2027 thesis, not a 2026 one.", situationFlags: [], riskFlags: ["role_competition"] },
  "eli raridon": { verdict: "SPECULATIVE", trend: "rising", trendNote: "3rd-round rookie (Notre Dame) with elite 6'6\"/245lb frame — immediately projects as Drake Maye's security blanket and Hooper target-share replacement. Hunter Henry is on a contract year; Hill signed as a blocker, not a receiver. Raridon's upside path is clear if Henry misses time or exits after 2026. Backup role in 2026, legitimate TE1 candidate from 2027. NE W16 @NYJ soft, W17 vs DEN soft — orphan window value if role expands.", situationFlags: ["breakout_profile", "scheme_fit"], riskFlags: ["depth_chart_competition"] },
  "jonah coleman": { verdict: "TARGET", trend: "rising", trendNote: "Camp reports trending toward every-down role as Harvey struggles in pass pro", situationFlags: ["committee_breaker", "scheme_fit"], riskFlags: [] },
  "quinshon judkins": { verdict: "TARGET", trend: "rising", trendNote: "CLE bell cow — Mitchell depth chart situation resolved, Judkins locked in as lead back with full workhorse path", situationFlags: ["breakout_profile"], riskFlags: [] },
  "bhayshul tuten": { verdict: "TARGET", trend: "stable", trendNote: "DOWNGRADED on role clarity Aug 15 2026, not on talent. Listed as a CO-STARTER with Chris Rodriguez on the first unofficial JAX depth chart, so the lead-back designation this entry used to assert is gone. He keeps the pass-catching edge, which is the half of the job with the most best-ball value, but Rodriguez profiles for short-yardage and red-zone work and that is where the touchdown equity lives. Still the better long-term bet in a Liam Coen run game; just no longer priced as an uncontested starter. committee_breaker retained because the receiving role is a genuine separator, with creeping_committee added to reflect the co-start.", situationFlags: ["committee_breaker"], riskFlags: ["creeping_committee"] },
  // Risk/fade situations
  "tony pollard": { verdict: "fade", trend: "falling", trendNote: "31 years old, Cam Ward era TEN is pass-first now", situationFlags: [], riskFlags: ["contract_year"] },
  "jakobi lane": { verdict: "TARGET", trend: "rising", trendNote: "Third-round USC rookie taking FIRST-TEAM REPS as the clear standout of Baltimore's camp, with red-zone chemistry with Lamar Jackson called out specifically, while Rashod Bateman misses practice time. The market moved roughly 21-23 spots in seven days on it. Two things keep this MEDIUM rather than HIGH: these are pre-Week-3 preseason reps, which Lens 4 treats as scheme evaluation rather than role confirmation, and Baltimore's W17 is @CIN, where the WR matchup grades Avoid even though the game environment is the strongest on the board.", situationFlags: ["target_vacuum", "breakout_profile"], riskFlags: ["role_dependent"] },
  "colbie young": { verdict: "DART", trend: "rising", trendNote: "First coverage Aug 15 2026. Fourth-round CIN rookie WR pushing Andrei Iosivas for the WR3 job — listed as a backup on the first depth chart, so this is a live competition, not a handover. Two weeks of contested-catch work off a 6-3 frame, a red-zone TD in practice, and reporting that he has already earned Burrow's trust. DART rather than TARGET on purpose: WR3 behind the best receiver tandem in football is a low-target role, so he is a spike-week and red-zone profile, not a volume one. The reason to hold him at all is CIN's W17 vs BAL, the best game environment on the board.", situationFlags: ["breakout_profile"], riskFlags: ["creeping_committee", "role_dependent"] },
  "denzel boston": { verdict: "TARGET", trend: "rising", trendNote: "First coverage Aug 15 2026 — he had ADP in all three tables and no prose, so the app priced him without knowing his job. He is listed as CLEVELAND'S NO. 1 WR on the early depth chart and Todd Monken has said he moves into the first-team offense. A rookie handed the top job outright is a different asset than a rookie competing for snaps, and his ADP has not caught up. Preseason line was one catch, but it moved the chains on a scoring drive, which is what a starter's exhibition snap count looks like. Kept honest: early unofficial depth charts are the most reversible label in August. Re-check after preseason Week 3.", situationFlags: ["target_vacuum", "breakout_profile"], riskFlags: ["role_dependent"] },
  "elic ayomanor": { verdict: "DART", trend: "rising", trendNote: "First coverage Aug 15 2026. Second-year TEN receiver running neck-and-neck with rookie Carnell Tate for camp's top performer, consistent on back-shoulder and go-route work, a big-bodied middle-of-field target for Cam Ward. HC Saleh praised the work ethic and challenged him on consistency, which names the gap precisely. DART rather than TARGET because the role is contested at the same spot by a player drafted 155 picks earlier: Tate is the X, and Ayomanor's realistic path is X in certain packages. Cheap enough that the contingency is worth owning. Shoulder scare in a Thursday practice was cleared the same week.", situationFlags: ["breakout_profile"], riskFlags: ["creeping_committee", "role_dependent"] },
  "darren waller": { verdict: "TARGET", trend: "rising", trendNote: "First coverage Aug 18 2026, signed with Carolina Aug 12 on a one-year deal. The path is unusually clear for a pick-205 tight end: the incumbents both posted a 0.0% spike rate in 2025 and Ja'Tavion Sanders posted a 0.0% usable-week rate, while Waller scored 6 touchdowns in 9 games on 8 red-zone and 7 end-zone targets with a 12.5% spike rate. That production came in Miami, so the rate profile is established and the volume is projected. Darrell Bevell, his passing game coordinator there last season, is now Carolina's associate head coach. TARGET rather than DART because the CAR TE playoff window grades good or better in all three weeks, W15 vs CIN as a Smash. Age 33, a one-year deal, injury history and a Bryce Young offense are the real caps.", situationFlags: ["target_vacuum", "scheme_fit"], riskFlags: ["injury_history"] },
  "tyler allgeier": { verdict: "TARGET", trend: "rising", trendNote: "Listed as the No. 1 RB on Arizona's first unofficial depth chart, ahead of third-overall rookie Jeremiyah Love, with Conner 3rd and Benson 4th. Signed from ATL on 2yr/$12.25M, clearing the Ambiguous Backfield Filter's financial gate. The 2026 profile is why he matters: 19 GREEN-ZONE CARRIES on only 16 targets, the most concentrated short-yardage body in the dataset. Brissett threw for a career-high 3,366 yards and was re-signed at $15.5M, and HC Mike LaFleur arrives from the league's top-scoring offense, so the run-game environment supports it. WHAT THIS IS NOT: a bet that he holds the job. Love went third overall and teams routinely withhold the starter label until a rookie earns it, so the base case is Love taking over. The bet is that TD equity in this offense is worth far more than pick 159. Re-check after preseason Week 3.", situationFlags: ["scheme_fit"], riskFlags: ["creeping_committee", "role_dependent"] },
  "breece hall": { verdict: "hold", trend: "falling", trendNote: "Contract narrative + NYJ rebuild = role uncertainty; still the most talented back on the roster but creeping committee risk is real — monitor camp", situationFlags: [], riskFlags: ["contract_year", "creeping_committee"] },
  "d'andre swift": { verdict: "fade", trend: "falling", trendNote: "No bell-cow role in CHI committee", situationFlags: [], riskFlags: ["creeping_committee"] },
  "dandre swift": { verdict: "fade", trend: "falling", trendNote: "No bell-cow role in CHI committee", situationFlags: [], riskFlags: ["creeping_committee"] },
  "derrick henry": { verdict: "TARGET", trend: "stable", trendNote: "Has defied the age cliff every season — BAL run-heavy with soft W16-17 closing schedule", situationFlags: ["scheme_fit"], riskFlags: [] },
  "christian mccaffrey": { verdict: "hold", trend: "falling", trendNote: "Injury history the real concern — missed significant 2024 time, SF scheme unchanged under Shanahan; elite talent but fragility is a legitimate ADP risk at this price", situationFlags: [], riskFlags: ["injury_history"] },
  "cmc": { verdict: "hold", trend: "falling", trendNote: "Injury history the real concern — missed significant 2024 time, SF scheme unchanged under Shanahan; elite talent but fragility is a legitimate ADP risk at this price", situationFlags: [], riskFlags: ["injury_history"] },
  // Reassessed Aug 2 2026 (was hold / falling). That record predated the camp
  // news and had gone stale in the same way the Wan'Dale slot_only flag had:
  // it read "falling" while the freshest dated entry in RECENT_NEWS says he
  // avoided PUP and took a full Day 1 practice. Per the Source Hierarchy the
  // dated entry wins, and the usage data underneath it is alpha-tier. The
  // fragility risk is preserved in the note and in riskFlags rather than
  // expressed as a verdict.
  "malik nabers": { verdict: "TARGET", trend: "rising", trendNote: "Alpha usage confirmed before the injury: in his 4 games of 2025 he ran a 28.7% target share with a 0.761 WOPR — higher than Jefferson (0.697) or Chase (0.723) — plus 25% spike and 25% nuclear week rates. Small sample, but unambiguous about role. Health arc: torn right ACL + full lateral meniscus Week 4 (Sep 28 2025), repair in late Oct, then a second spring 2026 procedure to clear scar-tissue stiffness. Aug 2026 camp: AVOIDED the PUP list, took a full Day 1 practice, observers called him outstanding; no target date announced, workload evaluated daily. Two live risks that do not cancel the verdict: the Giants opening him on IR would cost Weeks 1-4, and his W15 draw (CLE, 30th vs WR, Verse added) is a wall in the week BBM weights double — his ceiling week is W17 vs DAL, the softest WR defense in the league. Target on role and talent; price the fragility, do not price him as a discount.", situationFlags: ["target_vacuum"], riskFlags: ["injury_history"] },
  "rashee rice": { verdict: "TARGET", trend: "rising", trendNote: "UPGRADED Aug 8 2026 on a dated milestone: first 11-on-11 work of camp on Aug 5, took contact and popped back up, with KC reported comfortable letting him hit on the knee. He is no longer running short of full speed or leaving practice early. Still an extended ramp-up rather than a clearance, so this is direction, not arrival. Elite route runner in a Mahomes offense, 28.8% target share and a 0.500 spike rate in his 2025 eight-game sample, and the ADP discount is still priced off the worse picture. The second overhang has NOT moved: probation-related discipline is a live RISK with no league ruling. Contract year.", situationFlags: ["scheme_fit"], riskFlags: ["injury_history"] },
  "lamar jackson": { verdict: "hold", trend: "stable", trendNote: "BAL playoff schedule is mixed — W15 @PIT tough, W16 CLE neutral, W17 @CIN soft (+0.12 EPA); new HC Minter/OC Doyle scheme uncertainty is the real ceiling risk, not the schedule", situationFlags: [], riskFlags: [] },
  "jaxson dart": { verdict: "TARGET", trend: "rising", trendNote: "NYG run-heavy limits QB ceiling but W17 @DAL is a real spike week — late-round leverage play at ADP discount", situationFlags: ["breakout_profile"], riskFlags: [] },
  "mike washington": { verdict: "TARGET", trend: "stable", trendNote: "Kubiak two-back system historically deploys even splits regardless of talent differential — Walker/Charbonnet SEA is the precedent. Jeanty injury risk real. LV W16 vs TEN and W17 @ARI are two soft playoff weeks. Combine fraud and fumble history are concerns but irrelevant at ~192 ADP in a scheme that manufactures RB2 opportunities.", situationFlags: ["scheme_fit"], riskFlags: ["creeping_committee"] },
  "malik benson": { verdict: "DART", trend: "rising", trendNote: "Top-three LV receiver through six practices per ESPN's McFadden, first-team reps, chemistry with No. 1 pick Mendoza, and a kick/punt return role alongside Tucker. 6'1\" 195 at 4.37 with a pure deep-threat profile (11 of 17 on 20-plus-yard targets in 2025), but Brugler flags weak separation at the top of routes and size he cannot mask in traffic. Sixth round, pick 195, after four schools and roughly 2 catches a game across 39 FBS games — low capital and thin production. The WR3 job is NOT won: Dont'e Thornton Jr and Jack Bech are live for it. Coachspeak is character praise (Azzanni) plus scheme-fit (Janocko), never target-volume language. Two overhangs for the playoff window: an inevitable-looking Cousins-to-Mendoza transition, and an LV slate where WR grades Avoid / Smash / Even with every total at 42.5 or below. Free-roll dart and an in-season waiver name, not a W15-17 bet.", situationFlags: ["scheme_fit"], riskFlags: ["depth_chart_competition", "role_dependent"] },
  "erick all": { verdict: "DART", trend: "rising", trendNote: "Burrow gave signal-grade commitment language ('He'll play a big role for us this year') and one depth chart lists him ahead of Gesicki and Sample. The knee is two ACLs on the SAME knee 13 months apart plus a missed 2025, but All attributes the re-tear to a botched first repair with lateral instability and dying tissue — a failed-repair profile, not a fragile-athlete profile. The bear case is the ROOM, not the knee: CIN ran four TEs in 2025 for 96 catches and a 0.000 spike rate on all four, under a target tree that gives 65% to Chase, Higgins and Chase Brown. So the absence of a good TE1 is not proof the job is open, it may be proof the job is not worth having. Discount that season for Burrow's 8 games. Playoff shape is backwards for W17-heavy formats: W15 @CAR Good, W16 @IND Smash, W17 vs BAL AVOID — never draft him as BAL@CIN bring-back exposure. Free-roll only, and pre-Week-3 camp reps are scheme evaluation rather than role confirmation.", situationFlags: ["breakout_profile"], riskFlags: ["injury_history", "depth_chart_competition", "role_dependent"] },
  "tre harris": { verdict: "DART", trend: "rising", trendNote: "WR3 is effectively his — Keenan Allen gone, and the only competition for the No. 3 job is a 2025 fifth-rounder (Lambert-Smith) and a rookie (Thompson). Opens behind McConkey and Johnston, so the question is role size, not role security. McDaniel's praise is signal-grade but physical: 'a grown man... muscle and strength that will make him a matchup nightmare' — role confirmation on a mismatch profile, not a target-volume promise. His 2025 line (roughly 30 catches, 1 TD, 48.5% snap share, 8.4% target share, 0.000 spike, 81.2% dud) came under Greg Roman behind a wrecked offensive line and used mainly as a blocker; Roman was fired. Discount that baseline for the coordinator change, do not erase it. 2025 second-round capital plus a genuine scheme upgrade, third in the target pecking order.", situationFlags: ["scheme_fit"], riskFlags: ["depth_chart_competition"] },
  "david njoku": { verdict: "DART", trend: "stable", trendNote: "Cheap one-year LAC deal and a strong camp — separation, contested catches, mismatches on linebackers, 5.6 YAC since 2017 (third among TEs with 500+ targets). The binding constraint is the play caller, not the depth chart: McDaniel's Miami offenses were THIRD-TO-LAST in 12 personnel 2022-2025, and Miami went from the league's highest two-TE rate in 2021 to fifth-lowest in his first year. Three TEs share whatever is left — Gadsden II (49/664/3 as a rookie), Kolar (elite blocker, takes the in-line work) and Njoku. Free-roll dart at ADP 210+, never projectable stack depth, and do not treat the multi-TE-formation narrative as a role signal without a snap-count confirmation.", situationFlags: [], riskFlags: ["depth_chart_competition", "role_dependent"] },
  "kimani vidal": { verdict: "fade", trend: "falling", trendNote: "Third in a three-deep LAC room behind a healthy Omarion Hampton and free-agent signing Keaton Mitchell, in a Mike McDaniel scheme built for the speed profile Mitchell brings. Active trade and final-cuts candidate through Aug 2026. The 643-yard 2025 was produced under Greg Roman, who was fired after the wild-card loss. Contingent-only at ADP 210+ — the path is a trade to a thin backfield, not a role in LA. Not functional stack depth for a Herbert loop.", situationFlags: [], riskFlags: ["depth_chart_competition", "role_dependent"] },
  "drew allar": { verdict: "fade", trend: "stable", trendNote: "Excellent preseason debut (10/13, 154, 2 pass TD, 1 rush TD, 155.1 rating) that changes nothing about 2026. He is a third-round rookie behind Aaron Rodgers, with Will Howard and Mason Rudolph also in the room, and Pittsburgh has framed both Allar and Howard as long-term developmental pieces rather than this year's answer. McCarthy is rebuilding his mechanics in the QB school, which is not what a staff does with a quarterback it plans to play. Undraftable in standard best ball. The live angle is contingency and dynasty rather than role: Rodgers is 42 and has called this his final season, so the succession is real — but Howard is the competing claimant and neither has separated. Treat the preseason line as evaluation against backups, not a role signal.", situationFlags: [], riskFlags: ["depth_chart_competition", "role_dependent"] },
  "germie bernard": { verdict: "DART", trend: "rising", trendNote: "Second-round rookie who led the PIT offense through the first half of the preseason opener, working mainly from the SLOT — a spot Metcalf and Pittman do not occupy, so the role complements the starters rather than competing with them. Out-snapped Roman Wilson more than 2-to-1 in the slot, and injuries in the Pittsburgh receiver room widened the opening further. Analysts have him making his case for WR3. Pre-Week-3 caveat holds (evaluation before confirmation), but first-team slot usage against a direct competitor is role evidence. Near-free at ADP 198.8.", situationFlags: ["target_vacuum"], riskFlags: ["depth_chart_competition"] },
  "seth mcgowan": { verdict: "DART", trend: "rising", trendNote: "Leading the IND RB2 competition through two weeks of camp — no drops, a 30-yard TD run in a two-minute drill, and real pass-protection reps, which is the skill that actually decides backup snaps. Steichen and Cooter both positive; Jonathan Taylor comped him to David Montgomery. 6-0, 223, 4.49, downhill power with better feet than the build implies. Two caveats that keep this a dart rather than a target: the opening is partly injury-made (Giddens has a hamstring), and seventh-round capital at No. 237 is the weakest draft signal there is. PURE HANDCUFF — Taylor is the undisputed lead and there is no path to volume without an injury ahead of him. The reason he is worth a final-round slot anyway is that he handcuffs a top-6 ADP workhorse, which is the Contingency Protocol shape rather than a role bet. Kickoff-return work is a small extra path to touches.", situationFlags: ["committee_breaker"], riskFlags: ["depth_chart_competition", "role_dependent"] },
  "ricky pearsall": { verdict: "fade", trend: "falling", trendNote: "OUT FOR THE 2026 SEASON — season-ending PCL surgery, on IR since Aug 1. Not a monitor situation and not a stash: PCL recovery runs 6-12 months and Lynch\'s stated target is 2027. He must not appear in any depth-chart discussion of the SF receiver room as present or returning; the current room is Evans, Deebo, Kirk and Stribling. His ADP in these tables is stale market residue from before the injury.", situationFlags: [], riskFlags: ["injury_history"] },
  "kayshon boutte": { verdict: "TARGET", trend: "stable", trendNote: "Deep threat role survives AJ Brown arrival — distinct vertical speed profile doesn't compete with Brown's possession work or Doubs' slot role. Maye's downfield aggression means vertical shots are baked into the scheme. Role-specific dart, not a volume play. Best ball ceiling game: NE W15 @KC as bring-back for KC stacks — negative game script increases deep shot volume.", situationFlags: ["scheme_fit"], riskFlags: [] },
  "kenneth gainwell": { verdict: "TARGET", trend: "rising", trendNote: "2yr/$14M TB deal, and Aug 2026 camp confirmed the SHAPE of the role: Zac Robinson uses him as the receiving back and safety valve, not a rotational runner — Irving takes the bulk of carries. Primary receiving option from 21-personnel pony sets, aligned in the backfield and the slot; Robinson's ATL backs totaled 1,435 receiving yards over two seasons. Rushing volume is capped by Irving, so the value is target-driven and game-script sensitive. His 73-reception 2025 line is PIT data under a different QB and OC — re-validate the elite-receiving-back tier rather than assuming it carries.", situationFlags: ["scheme_fit"], riskFlags: ["creeping_committee", "role_dependent"] },
  "kenny gainwell": { verdict: "TARGET", trend: "rising", trendNote: "2yr/$14M TB deal, and Aug 2026 camp confirmed the SHAPE of the role: Zac Robinson uses him as the receiving back and safety valve, not a rotational runner — Irving takes the bulk of carries. Primary receiving option from 21-personnel pony sets, aligned in the backfield and the slot; Robinson's ATL backs totaled 1,435 receiving yards over two seasons. Rushing volume is capped by Irving, so the value is target-driven and game-script sensitive. His 73-reception 2025 line is PIT data under a different QB and OC — re-validate the elite-receiving-back tier rather than assuming it carries.", situationFlags: ["scheme_fit"], riskFlags: ["creeping_committee", "role_dependent"] },
  // === QB UNCERTAINTY FLAGS ===
  // These suppress stack credit and cap pass-catcher ceilings via qb_uncertainty risk flag
  "michael penix": { verdict: "fade", date: "2026-06-10", reason: "Recovering from torn ACL — limits his ability to compete with Tua Tagovailoa for ATL starting job. Contingent value only; if Penix wins job same ATL three-week soft window applies but health risk is real.", confidence: "SPECULATIVE" },
  "michael penix jr": { verdict: "fade", date: "2026-06-10", reason: "Recovering from torn ACL — limits his ability to compete with Tua Tagovailoa for ATL starting job. Contingent value only; if Penix wins job same ATL three-week soft window applies but health risk is real.", confidence: "SPECULATIVE" },
  "tua tagovailoa": { verdict: "TARGET", date: "2026-06-10", reason: "Signed with ATL as heavy favorite for starting job — Penix recovering from torn ACL limits competition. ATL W15 @WAS (soft), W16 vs TB (soft), W17 vs NO (soft). Three soft weeks at near-free ADP. Confirm starter at camp before stacking.", confidence: "MEDIUM-HIGH" },
  "aaron rodgers": { verdict: "fade", trend: "falling", trendNote: "Age 42 in 2026, injury history real concern — Howard and Allar capable of pushing for snaps if Rodgers struggles early", situationFlags: [], riskFlags: ["injury_history"] },
  "will howard": { verdict: "fade", trend: "stable", trendNote: "PIT backup competing with Rodgers — only relevant if Rodgers misses time; contingent value only", situationFlags: [], riskFlags: ["qb_uncertainty"] },
  "shedeur sanders": { verdict: "fade", trend: "stable", trendNote: "CLE QB competition with Watson — lowest completion % among QBs with 200+ attempts in 2025, starting role genuinely uncertain", situationFlags: [], riskFlags: ["qb_uncertainty"] },
  "deshaun watson": { verdict: "fade", trend: "stable", trendNote: "CLE QB competition with Sanders — one of worst EPA/dropback marks last two seasons, lead only if Sanders misses camp", situationFlags: [], riskFlags: ["qb_uncertainty", "injury_history"] },
  "jacoby brissett": { verdict: "hold", trend: "stable", trendNote: "THE HOLDOUT IS OVER and the old fade rested entirely on it. He signed a reworked deal in late Jul 2026 — $15.5M base with up to $21M in incentives, described as clear-cut starter money — reported on time and is practising. Reporting as of the Aug 6 Hall of Fame game is explicit: the plan is for Brissett to start Week 1 against the Chargers. Beck is a 3rd-round rookie whom HC LaFleur wants to sit ('it benefits anyone in any position to be able to sit back'), so the leash is long. Low ceiling on a rebuilding offense, but he is the confirmed starter, not a fade.", situationFlags: [], riskFlags: [] },
  // === ROLE CEILING FLAGS ===
  // slot_only: high target share WRs locked into short/underneath routes, no red zone role, hard TD ceiling cap
  "khalil shakir": { verdict: "fade", trend: "stable", trendNote: "Elite slot stats but sub-6 aDOT, zero red zone role — PPR floor, not a ceiling asset", situationFlags: [], riskFlags: [], roleCeiling: "slot_only" },
  "jakobi meyers": { verdict: "fade", trend: "stable", trendNote: "Possession slot, sub-7 aDOT — high floor, no boom ceiling without a red zone role change", situationFlags: [], riskFlags: [], roleCeiling: "slot_only" },
  "josh downs": { verdict: "TARGET", trend: "rising", trendNote: "Pittman trade vacates the middle-of-field target share Downs is built to absorb — Pierce is perimeter, not a role conflict; Warren is the only real competition. If Jones stays healthy, Downs becomes the dominant slot/middle route runner in a top-5 WR FPA offense (IND 29.42). Soft W16 vs CIN (+0.12). Role ceiling expands materially from slot-only to full middle-field target hog.", situationFlags: ["breakout_profile", "scheme_fit"], riskFlags: [] },
  // Reassessed Jul 31 2026 (was fade + slot_only roleCeiling; both removed). Two errors
  // in the old record. First, roleCeiling describes an OBSERVED role, and it contradicted
  // this entry's own 26.8% air yards share — that is not slot-only usage, and it applied
  // a scored -0.35 deduction to what was really a forecast. Second, the fade rested on
  // Tate compressing him, which the opportunity data does not support as disqualifying:
  // Robinson's 2025 volume (29.8% tgt share, 0.64 WOPR) is alpha-tier, and his actual
  // competition is one rookie plus a Ridley season of 2.4 rec/g and a 0% spike rate.
  // Per the Source Hierarchy, opportunity volume outranks a projection about a rookie.
  // The soft slate (WR SOS #5, delta +25; W15 Smash / W16 Good / W17 Good) is recorded
  // as a FILTER only — it sorts him, it is not why the verdict moved.
  "wandale robinson": { verdict: "TARGET", trend: "rising", trendNote: "Alpha-tier 2025 volume that the market has not repriced: 92/1014/4 on a 29.8% target share, 26.8% air yards share and 0.64 WOPR — genuine downfield work, not a slot-only profile. Competition in TEN is thinner than the ADP implies: Tate is a rookie (premium capital, but unproven) and Ridley is coming off 2.4 rec/g with a 0% spike rate. Schedule is a bonus rather than the thesis: WR slate ranks 5th-easiest and improved 25 spots, with W15 Smash / W16 Good / W17 Good. Real risks stay live — new team, new QB in Ward, and a 12% spike rate means the volume floor has been higher than the ceiling. Target on volume and competition; re-validate once camp confirms the TEN pecking order.", situationFlags: ["target_vacuum"], riskFlags: [] },
  "parker washington": { verdict: "TARGET", trend: "rising", trendNote: "JAX WR1 breakout in 2025 — 65/954/6 with 19 catches of 20+ yards; perimeter YPRR (2.59) better than slot (1.87), Coen offense, Lawrence chemistry ascending", situationFlags: ["breakout_profile"], riskFlags: [] },
  "jahan dotson": { verdict: "DART", trend: "stable", trendNote: "2yr/$15M ATL deal puts him in competition with Zachariah Branch for WR2 behind London — role not confirmed. ATL WR room is genuinely vacant behind London so the opportunity is real, but Branch has draft capital working against Dotson. Contingent dart: wins the job = three-week soft window (W15 @WAS, W16 vs TB, W17 vs NO) at near-free ADP.", situationFlags: [], riskFlags: ["role_competition"] },
  "jaylin noel": { verdict: "fade", trend: "rising", trendNote: "ROLE improved, WINDOW did not — the two are separate axes and only one moved. SI's July camp depth chart lists him a STARTER with Collins and Higgins, Dell and Hutchinson behind; other outlets still call it an open WR3 battle, so it is not settled. Stroud connection is real. The fade is unchanged and is purely schedule: HOU draws JAX W15, @PHI W16, @GB W17 — a 3-week playoff avoid. Better player, same dead window. Redraft-relevant, best-ball irrelevant.", situationFlags: ["breakout_profile"], riskFlags: ["schedule_avoid"] },
  "demario douglas": { verdict: "fade", trend: "stable", trendNote: "NE check-down valve, sub-8 aDOT — YAC-dependent with zero air yards upside in Maye offense", situationFlags: [], riskFlags: [], roleCeiling: "slot_only" },
  "tutu atwell": { verdict: "fade", trend: "stable", trendNote: "MIA gadget/speed role, sub-8 aDOT — no defined role and Willis run-first offense caps ceiling further", situationFlags: [], riskFlags: [], roleCeiling: "slot_only" },
  "malik washington": { verdict: "TARGET", trend: "rising", trendNote: "UPGRADED from fade/falling Aug 15 2026. He is MIAMI'S DE FACTO WR1 in camp and Malik Willis's most-targeted receiver, taking the bulk of first-team reps. Third year, and now tied as the longest-tenured receiver in the room. His 2025 aDOT of 5.2 reads as a schemed slot piece, and camp has contradicted that directly: he produced a 60-yard deep reception and a 45-yard catch-and-run from Willis in one session, which is chunk-play work the slot-only profile does not predict. roleCeiling slot_only is therefore removed. Kept honest: Willis is an unproven starter, the offense projects run-first, and these are pre-Week-3 preseason reps, so this is a role signal rather than a confirmed one. Re-check after preseason Week 3.", situationFlags: ["target_vacuum", "breakout_profile"], riskFlags: ["qb_uncertainty"] },
  "christian kirk": { verdict: "fade", trend: "falling", trendNote: "Age 30 WR3 in SF behind Evans and Pearsall — career slot profile, Shanahan run-heavy, Stribling 2nd-round pick adds further role pressure", situationFlags: [], riskFlags: [], roleCeiling: "slot_only" },
  // rz_dependent: players whose fantasy value is almost entirely TD-driven; near-zero floor without scoring
  "brandin cooks": { verdict: "fade", trend: "falling", trendNote: "Unsigned FA as of June 2026 — 24 catches/279 yards/0 TDs in 2025 split between NO and BUF; BUF added DJ Moore and drafted Skyler Bell, no clear landing spot; do not draft until team confirmed", situationFlags: [], riskFlags: ["injury_history"] },
  "kyren williams": { verdict: "hold", trend: "stable", trendNote: "STARTER yes, bell-cow no. He took only 54% of LAR RB carries in 2025 and McVay's own framing is committee: 'They're both going to play... we're at our best when you're getting tight ends, receivers and multiple backs involved.' Corum is the most improved back in camp per Kyren himself ('a lot leaner, a lot more explosive') and McVay confirmed a good camp Aug 2. Kyren is also a pending 2027 FA with no extension, and Jarquez Hunter is competing for rotation share.", situationFlags: ["scheme_fit"], riskFlags: ["creeping_committee"] },
  "blake corum": { verdict: "hold", trend: "rising", trendNote: "LAR volume committee back — earned 30-35% snap share in final 5 weeks of 2025 with real red zone equity (5 TDs in 4-game stretch); Kyren Williams is still RB1 but Corum has standalone boom-week upside when workload spikes; Garrett arrival helps clock-kill role", situationFlags: [], riskFlags: ["creeping_committee"] },
  "rachaad white": { verdict: "fade", trend: "stable", trendNote: "WAS committee back competing as the PRIMARY THIRD-DOWN back in a room Washington itself calls loaded, with an outside path to first- and second-down work. Reporting frames him as the room's underrated receiving back, so the realistic shape is a passing-down role rather than a lead job. No TD equity locked in, and the touches are genuinely split, so the value stays situational. Verified Aug 2026", situationFlags: [], riskFlags: ["confirmed_committee"], roleCeiling: "rz_dependent" },
  "aaron jones": { verdict: "fade", trend: "falling", trendNote: "Age cliff + MIN committee — role dependent on Alexander injury; near-zero floor if healthy backfield", situationFlags: [], riskFlags: ["creeping_committee", "injury_history"], roleCeiling: "rz_dependent" },
  // === ADDITIONAL COMMITTEE RB FLAGS (2026) ===
  "jaylen warren": { verdict: "TARGET", trend: "stable", trendNote: "PPR-friendly role, McCarthy now HC at PIT — run-heavy system suits Warren's receiving back profile, but Dowdle added as real competition", situationFlags: ["scheme_fit"], riskFlags: ["creeping_committee"] },
  "rico dowdle": { verdict: "fade", trend: "stable", trendNote: "Added to PIT committee — 1300+ scrimmage yards each of past two seasons, McCarthy history, real threat to Warren workload", situationFlags: [], riskFlags: ["confirmed_committee"] },
  // First SITUATIONS row for Love (Aug 15 2026). Until now he had RECENT_NEWS only,
  // which meant the Naked RB gate insulated him purely via the ADP<=36 default rule
  // while the app's own news entry said the opposite — the gate does not read
  // RECENT_NEWS. Same class as the Kyler Murray gap. The evidence has since flipped
  // his way, so this row now agrees with the default rather than contradicting it.
  "jeremiyah love": { verdict: "TARGET", trend: "rising", trendNote: "Started the preseason opener with the ARI ones, ~75% of snaps over the first three drives, and all 14 touches in the first half (11-58 rushing, 3-14 receiving) with a viral spin-and-hurdle rep. That supersedes the late-July camp read that had Allgeier leading first-team carries. Two live caveats. The ankle is a HIGH ankle sprain: he did not practice the following week and sat out the second preseason game, per HC Mike LaFleur (updated Aug 23 2026). High ankle sprains routinely run three to six weeks, so his availability for the opener is genuinely open and any missed September time falls inside the W1-14 qualifying round. Second, the calendar: pre-Week-3 preseason snaps are evaluation before they are confirmation. Allgeier still took three carries on the opening drive, so the committee is not dead — it has just inverted. No. 3 overall capital behind it.", situationFlags: ["breakout_profile"], riskFlags: ["creeping_committee", "injury_history"] },
  "kaytron allen": { verdict: "TARGET", trend: "rising", trendNote: "UPGRADED Aug 15 2026 on a genuine workload signal: 23 CARRIES for 85 yards and a TD plus a catch in the preseason opener vs MIA, an unusually heavy debut that says the staff wanted an extended look. Two things temper it. The efficiency was ordinary — 3.7 yards a carry on those 23 — so this is a volume signal rather than a production one. And per the framework, pre-Week-3 preseason snaps are scheme EVALUATION rather than role confirmation, which is exactly what a 23-carry look in a first exhibition is: they are finding out what he is, not telling you what he will be. WAS stays run-heavy under Quinn with new OC Blough and scheme continuity intact, but the backfield is still crowded. Lottery ticket at ADP, now with a real reason to hold it.", situationFlags: ["scheme_fit"], riskFlags: ["creeping_committee"] },

  "jacory croskey merritt": { verdict: "fade", trend: "stable", trendNote: "WAS committee back — four-way competition in a run-heavy scheme limits any single back's upside", situationFlags: [], riskFlags: ["confirmed_committee"] },
  "tyjae spears": { verdict: "fade", trend: "falling", trendNote: "TEN committee with Pollard — injury-plagued, career-low attempts in 2025, no role clarity expected in 2026", situationFlags: [], riskFlags: ["confirmed_committee", "injury_history"] },
  "rhamondre stevenson": { verdict: "fade", trend: "falling", trendNote: "NE committee with Henderson — clock ticking on his role as Henderson projects as the long-term RB1", situationFlags: [], riskFlags: ["creeping_committee"] },
  "treveyon henderson": { verdict: "TARGET", trend: "rising", trendNote: "NE RB1 ceiling is real — Drake Maye offense is ascending and Henderson is the long-term answer, Stevenson's clock is ticking", situationFlags: ["breakout_profile"], riskFlags: [] },
  "josh jacobs": { verdict: "fade", trend: "falling", trendNote: "GB arrest situation June 2026 — legal issues create real availability risk, downgrade significantly if he misses time", situationFlags: [], riskFlags: ["injury_history", "contract_year"] },
  // === ADDITIONAL COMMITTEE RB GAPS (2026) ===
  "dylan sampson": { verdict: "fade", trend: "stable", trendNote: "CLE committee — best-case 70% of a putrid offense's backfield touches; upside severely capped by team situation", situationFlags: [], riskFlags: ["confirmed_committee"] },
  "braelon allen": { verdict: "DART", trend: "rising", trendNote: "NYJ RB2 with a CLEAR path, not a committee. Breece Hall strained his groin in an Aug 17 practice and is out 2-3 weeks, and Allen steps into the starting role behind him with only Kene Nwangwu and two undrafted rookies as competition. HC Aaron Glenn asked him simply to run the ball and be himself. THE HONEST LIMIT FOR BEST BALL: Hall is expected back for Week 1, so this is a preseason role, not a W15-17 role. What actually changed is the SHAPE of the contingency \u2014 Allen is now the outright next man up rather than one of two, so an in-season Hall absence hands him the job whole. He is also back from a knee injury that cost him most of last season and is reported bigger and stronger. Re-check after preseason Week 3.", situationFlags: ["target_vacuum"], riskFlags: ["injury_history"] },
  "isaiah davis": { verdict: "fade", trend: "stable", trendNote: "NYJ depth behind Hall and Allen — three-way committee with no clear role definition", situationFlags: [], riskFlags: ["confirmed_committee"] },
  "david montgomery": { verdict: "TARGET", trend: "stable", trendNote: "HOU bellcow — 2yr/$16.5M deal replaces Mixon as RB1, traded assets confirm org commitment; age 29 is the only real risk flag", situationFlags: ["scheme_fit"], riskFlags: ["injury_history"] },
  "woody marks": { verdict: "fade", trend: "stable", trendNote: "HOU committee with Montgomery — functional rookie (911 scrimmage yards) but 3.6 YPC limits standalone upside; passing-down role only", situationFlags: [], riskFlags: ["confirmed_committee"] },
  "jerome ford": { verdict: "fade", trend: "stable", trendNote: "WAS committee depth — part of four-way competition with Allen/White/Croskey-Merritt, no defined role", situationFlags: [], riskFlags: ["confirmed_committee"] },
  "jaleel mclaughlin": { verdict: "fade", trend: "stable", trendNote: "DEN depth behind Dobbins/Harvey/Coleman — four-way committee, essentially a practice squad candidate", situationFlags: [], riskFlags: ["confirmed_committee"] },
  // JAX — both Tuten and Rodriguez are targets in Liam Coen offense, but genuine committee risk
  "chris rodriguez": { verdict: "TARGET", trend: "rising", trendNote: "UPGRADED Aug 15 2026: named a CO-STARTER with Bhayshul Tuten on Jacksonville's first unofficial depth chart, which is a real climb — he opened camp on PUP after left-foot surgery and worked back with 'angry runs' in practices and scrimmages. Signed from WAS as a restricted free agent in March. The role shape matters more than the label: he profiles for SHORT-YARDAGE AND RED-ZONE work while Tuten keeps the passing-down edge, so Rodriguez is the one holding goal-line equity in an elite Liam Coen run game. That is a touchdown-dependent profile rather than a volume one, which is exactly the kind that swings weekly best-ball outcomes. Foot surgery is recent enough to stay on the risk list.", situationFlags: ["scheme_fit"], riskFlags: ["creeping_committee", "injury_history"] },
  // TEN — Singleton is a target despite competition; mediocre alternatives keep the path open
  "nicholas singleton": { verdict: "TARGET", trend: "stable", trendNote: "TEN dart despite Pollard/Spears competition — Cam Ward era offense needs a receiving back, Singleton's pass-catching profile fits; competition is mediocre enough to trust the path at his ADP cost", situationFlags: ["scheme_fit", "breakout_profile"], riskFlags: ["creeping_committee"] },
  // TB — three-way committee risk; Irving is the lead but Tucker (goal line) and Gainwell (passing downs) carve into ceiling
  "bucky irving": { verdict: "TARGET", trend: "stable", trendNote: "TB lead back but genuine committee risk — Tucker takes short-yardage/goal-line work, Gainwell handles passing downs; Irving's ceiling tied to TD equity he doesn't fully own", situationFlags: ["scheme_fit"], riskFlags: ["creeping_committee"] },
  "sean tucker": { verdict: "fade", trend: "stable", trendNote: "TB goal-line specialist — carves into Irving's TD equity but has no standalone value without a score; pure TD-or-bust", situationFlags: [], riskFlags: ["confirmed_committee"], roleCeiling: "rz_dependent" },
  // CAR — Hubbard gets another shot with Dowdle gone but Brooks and Trevor Etienne lurk
  "chuba hubbard": { verdict: "fade", trend: "stable", trendNote: "CAR lead back by default with Dowdle gone — but Brooks returning and Trevor Etienne provide real competition; 3.8 YPC and lost starting job in 2025 are hard to ignore", situationFlags: [], riskFlags: ["creeping_committee"] },
  "chris brooks": { verdict: "fade", trend: "stable", trendNote: "CAR committee threat to Hubbard — returning back with committee upside if Hubbard regresses again", situationFlags: [], riskFlags: ["confirmed_committee"] },
  "trevor etienne": { verdict: "fade", trend: "stable", trendNote: "CAR depth — younger option lurking behind Hubbard, contingent value only until a starter misses time", situationFlags: [], riskFlags: ["confirmed_committee"] },
  // MIN — Jones/Mason committee, Claiborne rookie adds another layer
  "demond claiborne": { verdict: "fade", trend: "stable", trendNote: "MIN rookie dart — drafted into Jones/Mason committee, could carve a role but competition is real; contingent value only at current ADP", situationFlags: [], riskFlags: ["confirmed_committee"] },
  "ty chandler": { verdict: "fade", trend: "stable", trendNote: "MIN committee back — no defined role, pure handcuff depth behind Jones", situationFlags: [], riskFlags: ["confirmed_committee"] },
  // DEN — clarified role structure: Coleman is the upside play, Harvey is limited to passing work, Dobbins is injury risk
  "jk dobbins": { verdict: "fade", trend: "falling", trendNote: "DEN — two major knee surgeries, injury risk is real; Coleman is the primary upside play if Dobbins misses time", situationFlags: [], riskFlags: ["injury_history", "creeping_committee"] },
  "rj harvey": { verdict: "fade", trend: "falling", trendNote: "DEN — limited to passing-down work due to pass-pro issues; not a workhorse path, 3.7 YPC confirms efficiency ceiling", situationFlags: [], riskFlags: ["creeping_committee", "ol_dependency"] },
  "kenneth walker": { verdict: "TARGET", trend: "rising", trendNote: "Super Bowl MVP, 3yr/$43M KC deal — clear workhorse intent, Mahomes return adds passing game upside, Demercado is receiving depth only", situationFlags: ["scheme_fit"], riskFlags: [] },
  "kenneth walker iii": { verdict: "TARGET", trend: "rising", trendNote: "Super Bowl MVP, 3yr/$43M KC deal — clear workhorse intent, Mahomes return adds passing game upside, Demercado is receiving depth only", situationFlags: ["scheme_fit"], riskFlags: [] },
  "emari demercado": { verdict: "DART", trend: "rising", trendNote: "1yr KC deal as passing-down specialist — pure 3rd-down receiving back role behind Walker. Mahomes checkdown/screen volume is real target share. ADP 215.9 is near-free. KC W15 vs NE (soft) and W17 vs LAC (soft) are two viable playoff weeks.", situationFlags: ["scheme_fit"], riskFlags: ["role_dependent"] },
  "lequint allen": { verdict: "fade", trend: "stable", trendNote: "JAX makeshift committee with Tuten — neither back eclipsed 68.0 PFF rushing grade in 2025, no lead-back clarity", situationFlags: [], riskFlags: ["confirmed_committee"] },
  "javonte williams": { verdict: "TARGET", trend: "stable", trendNote: "DAL 3yr/$24M re-sign — bell cow with bottom-5 defense generating positive game scripts; Malik Davis and Jaydon Blue competing for RB2 role behind him", situationFlags: ["scheme_fit"], riskFlags: [] },
  "malik davis": { verdict: "hold", date: "2026-06-07", reason: "Per RotoWire, Davis is the frontrunner for the DAL RB2 job behind Javonte Williams (252 carries in 2025). Posted 52 carries, 250 yards, 2 TDs as backup last season. Jaydon Blue and Phil Mafah still competing — situation to monitor at camp, not locked yet.", confidence: "MEDIUM", riskFlags: ["creeping_committee"] },
  "jaydon blue": { verdict: "fade", trend: "stable", trendNote: "DAL RB2 competition with Malik Davis — younger option with pass-catching upside, but no defined role until one separates in camp", situationFlags: [], riskFlags: ["creeping_committee"] },
  "eli heidenreich": { verdict: "fade", trend: "stable", trendNote: "PIT third RB behind Warren and Dowdle — drafted for passing situations and gadget work, no standalone value without injuries ahead of him", situationFlags: [], riskFlags: ["confirmed_committee"] },
  "carson beck": { verdict: "DART", trend: "rising", trendNote: "SEPARATE THE PLAYER FROM THE PATH — they moved opposite ways. The player is rising hard: he started the Aug 6 Hall of Fame game and went 15/19 for 188 yards and a TD, 125.4 rating, led two scoring drives and left at half tied 17-17, with a 49-yard strike to Jalen Brooks and a 5-yard TD fade to Simi Fehoko. Arm strength is the one flagged question. The PATH is narrow: Brissett is not holding out. Brissett signed for $15.5M with up to $21M and reporting says he starts Week 1, while LaFleur has said sitting benefits Beck. So this is a LATE-SEASON contingency on a 3rd-rounder (65th overall) if ARI collapses, not a Week 1 competition. ARI weapons (Harrison, McBride) only matter here if that contingency fires.", situationFlags: ["breakout_profile"], riskFlags: ["role_dependent"] },
  "darnell washington": { verdict: "hold", trend: "rising", trendNote: "PIT TE2 locked in — 4yr/$42M extension signals org commitment; Jonnu Smith and Connor Heyward gone as free agents, leaving only Freiermuth as competition for reps; 31/364/1 line in 2025 on 43 targets, primarily a run-blocking TE with growing pass volume in McCarthy offense", situationFlags: ["scheme_fit"], riskFlags: [] },
  // MIN RESOLVED Aug 12 2026 — qb_uncertainty REMOVED from both Vikings QBs.
  // From Aug 5 until Aug 12 both sides carried the flag, because the competition
  // was a genuine coin flip in which the loser does not play, so a four-piece
  // Vikings stack built on the wrong QB was unlooped rather than merely weaker.
  // O'Connell named Murray the Week 1 starter with no leash language, so that
  // availability risk is gone and the -0.3 stack penalty no longer applies.
  // Keep this history rather than deleting it: the flag was correct when set,
  // and the LV entry above is the same mechanism in an UNRESOLVED state, so a
  // future session can see both the armed and disarmed versions of the rule.
  "kyler murray": { verdict: "TARGET", trend: "rising", trendNote: "WON THE JOB — named Week 1 starter Aug 12 2026 after ~10 days of camp, with McCarthy to the bench and no re-evaluation clause stated. He took the larger share of full-team first-team reps through camp, though he did struggle the weekend before the decision. The qb_uncertainty flag is removed: the loser-does-not-play risk that capped every Vikings pass catcher has resolved in his favor, so MIN is now cleanly stackable. Still carries injury_history — he is back from a foot injury and his availability record is the remaining question, not his role.", situationFlags: ["scheme_fit"], riskFlags: ["injury_history"] },
  // LV is a DIFFERENT SHAPE of qb_uncertainty from MIN above, and the difference
  // matters for best ball specifically. MIN is an open Week 1 competition — the
  // loser does not play, so the risk resolves BEFORE the season. LV's starter is
  // already NAMED: Kubiak said "Kirk Cousins is the starting quarterback." The
  // risk here is a MID-SEASON handoff to the No. 1 overall pick, which reporting
  // treats as inevitable and only debates the timing of. That lands the
  // uncertainty INSIDE the W15-17 window rather than before it, which is the
  // window this app scores. Both sides carry the flag for the same reason MIN's
  // both do: flagging only the incumbent would leave a Mendoza build's identical
  // risk invisible. Added Aug 8 2026 — before this, LV pass-catcher stacks took
  // zero penalty despite the Cousins RECENT_NEWS entry describing exactly this.
  "kirk cousins": { verdict: "DART", trend: "stable", trendNote: "NAMED the LV starter by Kubiak ('He's the guy, and he's going to get a ton of reps'), so this is not a Week 1 availability question — it is a timing question. Reporting treats a handoff to No. 1 overall pick Fernando Mendoza as inevitable and debates only when, and Kubiak has said he would be comfortable starting any of Cousins, Mendoza or O'Connell, with rep splits a 'moving target.' THE RISK LANDS INSIDE W15-17, not before it, which is precisely the window that gets scored — a Cousins-anchored LV stack can be unlooped in December by a decision made in October. Real starter volume at a near-free ADP; a defined expiry rather than a competition.", situationFlags: [], riskFlags: ["qb_uncertainty"] },
  "fernando mendoza": { verdict: "DART", trend: "falling", trendNote: "No. 1 overall pick and LV's QB2 behind Kirk Cousins, who holds the Week 1 job (updated Aug 23 2026). The Raiders' first official depth chart lists Cousins 1, Mendoza 2, Aidan O'Connell 3. Cousins missed practice time in mid-August and Mendoza ran the first team while he was out; Cousins returned to first-team work and HC Klint Kubiak reaffirmed the job is Cousins' to lose. TREAT THE TAKEOVER AS SPECULATIVE TIMING, NOT AN EXPECTED EVENT — the case rests on a 38-year-old veteran on a team that went 3-14, which is a real contingency and a cheap one, but nothing on the depth chart or in the coachspeak points to a date. Contingency Protocol shape, at the speculative end. LV's playoff slate is a further drag: every W15-17 total sits at 42.5 or below. Anyone rostering him as a stack QB for the W15-17 window is buying a bench arm.", situationFlags: ["breakout_profile"], riskFlags: ["qb_uncertainty", "role_dependent"] },
  "jj mccarthy": { verdict: "fade", trend: "falling", trendNote: "Lost the MIN competition on Aug 12 2026; Murray starts Week 1 and McCarthy is the backup. O'Connell was explicit that McCarthy keeps getting reps for development, not as a live challenge, and attached no re-evaluation language. Three years in the system was his argument; the 2025 that prompted Minnesota to sign Murray was the argument against. Contingency only — no standalone path, not a stackable QB, and qb_uncertainty is removed because his role is now confirmed rather than unresolved.", situationFlags: [], riskFlags: ["role_dependent", "depth_chart_competition"] },
  "george holani": { verdict: "DART", trend: "rising", trendNote: "Took first-team reps through six full-squad practices ahead of BOTH first-rounder Jadarian Price and FA addition Emanuel Wilson (Brady Henderson, ESPN — 'biggest surprise of Seattle's offseason workouts'). The room is genuinely open: Walker left for KC, Charbonnet is on PUP with a January ACL and no stated return date. Pass-catching is his separator over Wilson. UPDATED Aug 8 2026: the reps battle has resolved toward Price, who took the opening first-team rep in the first full-team scrimmage and is now described as the increasingly clear RB1, with Holani the likely RB2. Handcuff value is undiminished — Price missed Aug 7 practice with lower-body soreness and Charbonnet has no return date. Contingency dart, NOT a standalone — Price is the expected lead back and Holani's ceiling requires Price stumbling or the Charbonnet timeline slipping. His 2025 line (4 games, 15% snap share) is too small to project from in either direction. Playoff slate is a genuine drag: W15 @PHI and W16 vs LAR are two of the toughest run defenses in the league after their offseasons, W17 @CAR is the only soft week.", situationFlags: ["committee_breaker"], riskFlags: ["depth_chart_competition", "role_dependent"] },
};

// ============ CHAMPIONSHIP WINDOW SCORE ============
// Computes redraft share card 0–10 score from 3 components
// Returns { total, comp1, comp2, comp3, tier, feedback }
function calcChampionshipWindowScore(analyzed, adpSource) {
  if (!analyzed) return null;

  // --- Component 1: Playoff Schedule Quality (0–4) ---
  const pm = analyzed.playoffMatchups || [];
  const starters = pm.filter(p => p.pos !== "K" && p.pos !== "DST");

  const posWeights = { QB: 1.2, RB: 1.0, WR: 1.0, TE: 0.8 };
  let weightedSum = 0;
  let totalWeight = 0;

  starters.forEach(p => {
    const w = posWeights[p.pos] || 1.0;
    // totalScore is sum of 3 week tier values (each 0–5), max 15
    const avgTier = p.totalScore / 3;
    weightedSum += avgTier * w;
    totalWeight += w;
  });

  const weightedAvg = totalWeight > 0 ? weightedSum / totalWeight : 0;
  let comp1 = 0;
  if (weightedAvg >= 4.2) comp1 = 4.0;
  else if (weightedAvg >= 3.8) comp1 = 3.5;
  else if (weightedAvg >= 3.3) comp1 = 3.0;
  else if (weightedAvg >= 2.8) comp1 = 2.0;
  else comp1 = 1.0;

  // Schedule tier label
  const schedTierLabel = comp1 >= 4.0 ? "Elite" : comp1 >= 3.5 ? "Strong" : comp1 >= 3.0 ? "Above avg" : comp1 >= 2.0 ? "Average" : "Below avg";

  // --- Component 2: Starter Caliber (0–4) ---
  const activeAdp = adpSource || ADP_DATA;
  const starterPositions = ["QB", "RB", "WR", "TE"];
  const startingPlayers = (analyzed.valid || []).filter(p => starterPositions.includes(p.pos) && !p.isBench);

  let adpSum = 0;
  let adpCount = 0;
  startingPlayers.forEach(p => {
    const key = p.name.toLowerCase();
    const entry = activeAdp[key];
    if (entry && entry.adp) { adpSum += entry.adp; adpCount++; }
    else if (p.adp) { adpSum += p.adp; adpCount++; }
  });

  const avgAdp = adpCount > 0 ? adpSum / adpCount : 120;
  let comp2 = 0;
  if (avgAdp <= 40) comp2 = 4.0;
  else if (avgAdp <= 65) comp2 = 3.5;
  else if (avgAdp <= 90) comp2 = 3.0;
  else if (avgAdp <= 115) comp2 = 2.0;
  else comp2 = 1.0;

  const caliberLabel = comp2 >= 4.0 ? "Elite" : comp2 >= 3.5 ? "Strong" : comp2 >= 3.0 ? "Solid" : comp2 >= 2.0 ? "Average" : "Thin";

  // --- Component 3: Roster Situation Score (0–2) ---
  // Check top 5 starters from SITUATIONS data
  const topStarters = [...(analyzed.valid || [])]
    .filter(p => starterPositions.includes(p.pos) && !p.isBench)
    .slice(0, 5);

  let posCount = 0;
  let riskCount = 0;
  let situationNotes = [];

  topStarters.forEach(p => {
    const key = p.name.toLowerCase();
    const sit = SITUATIONS[key];
    if (!sit) return;
    if (sit.situationFlags && sit.situationFlags.length > 0) posCount++;
    if (sit.riskFlags && sit.riskFlags.length > 0) riskCount++;
    if (sit.trendNote) situationNotes.push({ name: p.name, note: sit.trendNote, trend: sit.trend, flags: sit.situationFlags, risks: sit.riskFlags });
  });

  let comp3 = 0;
  if (riskCount === 0 && posCount >= 2) comp3 = 2.0;
  else if (riskCount <= 1 && posCount >= 1) comp3 = 1.5;
  else if (riskCount <= 2) comp3 = 1.0;
  else comp3 = 0.5;

  // Round to nearest 0.5
  const total = Math.round((comp1 + comp2 + comp3) * 2) / 2;

  const tier = total >= 9 ? "Elite" : total >= 7.5 ? "Contender" : total >= 6 ? "Competitive" : total >= 4.5 ? "Risky" : "Rebuild";
  const tierColor = total >= 9 ? "var(--pos)" : total >= 7.5 ? "var(--pos-bright)" : total >= 6 ? "var(--caution)" : total >= 4.5 ? "var(--warn)" : "var(--neg)";

  // --- Feedback copy: 3 sentences, player-specific ---
  // Sort starters by playoff score — sentence 1 describes the BEST windows, not the average
  const sortedByPlayoff = [...starters].sort((a, b) => b.totalScore - a.totalScore);
  const top2 = sortedByPlayoff.slice(0, 2);
  const top2Names = top2.map(p => p.name.split(" ").slice(-1)[0]).join(" and ");

  // Score the top-2 avg independently (not comp1 which averages all starters)
  const top2Avg = top2.length > 0 ? top2.reduce((s, p) => s + p.totalScore / 3, 0) / top2.length : 0;

  const schedSentence = top2Avg >= 4.0
    ? `${top2Names} are elite playoff weapons — both face soft defenses across W15–17.`
    : top2Avg >= 3.3
    ? `${top2Names} have strong playoff matchups — your top weapons are well-positioned.`
    : top2Avg >= 2.5
    ? `${top2Names} have workable playoff matchups — not elite, but no landmines either.`
    : `${top2Names} face tough playoff defenses — your top weapons hit walls at peak time.`;

  const caliberSentence = `Your starting lineup averages ADP ${Math.round(avgAdp)} — ${caliberLabel.toLowerCase()} caliber${comp2 >= 3.5 ? ", which is a genuine edge" : comp2 >= 2.5 ? ", right around the field" : ", leaving you thin in the playoffs"}.`;

  let sitSentence = "";
  const riskNote = situationNotes.find(n => n.risks.length > 0);
  const posNote = situationNotes.find(n => n.flags.length > 0);
  if (riskNote) {
    sitSentence = `Watch ${riskNote.name}: ${riskNote.note.toLowerCase()}`;
  } else if (posNote) {
    sitSentence = `${posNote.name} is a bright spot: ${posNote.note.toLowerCase()}`;
  } else {
    sitSentence = "No major situation red flags on your key starters — clean roster heading into playoffs.";
  }

  return {
    total,
    comp1, comp2, comp3,
    tier, tierColor,
    schedTierLabel, caliberLabel,
    avgAdp: Math.round(avgAdp),
    weightedAvg: Math.round(weightedAvg * 10) / 10,
    top2Avg,
    feedback: [schedSentence, caliberSentence, sitSentence],
    situationNotes,
    topPlayoffStarters: sortedByPlayoff.slice(0, 3),
  };
}


// ============ REDRAFT DATA ============

// Vintage: refreshed Jul 28 2026 for ADP <= ~135 from a live Yahoo draft-lobby
// capture (10-team full-PPR cash league, user-supplied recording). Entries
// deeper than ~135 retain the older snapshot — Yahoo lists mostly K/DEF there.
// Note: this table has its own vintage — ADP_VINTAGE.yahoo, not ADP_UPDATED.
const ADP_YAHOO = {
  "jamarr chase": { adp: 3.1, pos: "WR", team: "CIN" },
  "bijan robinson": { adp: 1.6, pos: "RB", team: "ATL" },
  "jahmyr gibbs": { adp: 1.9, pos: "RB", team: "DET" },
  "puka nacua": { adp: 4.5, pos: "WR", team: "LAR" },
  "jaxon smith njigba": { adp: 6.0, pos: "WR", team: "SEA" },
  "jsn": { adp: 6.0, pos: "WR", team: "SEA" },
  "christian mccaffrey": { adp: 5.6, pos: "RB", team: "SF" },
  "cmc": { adp: 5.6, pos: "RB", team: "SF" },
  "ceedee lamb": { adp: 9.5, pos: "WR", team: "DAL" },
  "jonathan taylor": { adp: 7.2, pos: "RB", team: "IND" },
  "amon ra st brown": { adp: 8.8, pos: "WR", team: "DET" },
  "arsb": { adp: 8.8, pos: "WR", team: "DET" },
  "james cook": { adp: 9.9, pos: "RB", team: "BUF" },
  "ashton jeanty": { adp: 13.2, pos: "RB", team: "LV" },
  "justin jefferson": { adp: 12.1, pos: "WR", team: "MIN" },
  "devon achane": { adp: 14.8, pos: "RB", team: "MIA" },
  "achane": { adp: 14.8, pos: "RB", team: "MIA" },
  "chase brown": { adp: 16.8, pos: "RB", team: "CIN" },
  "saquon barkley": { adp: 14.0, pos: "RB", team: "PHI" },
  "drake london": { adp: 17.0, pos: "WR", team: "ATL" },
  "rashee rice": { adp: 14.4, pos: "WR", team: "KC" },  // ADP refresh 2026-08-15: 33.7 -> 14.4 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "brock bowers": { adp: 43.4, pos: "TE", team: "LV" },  // ADP refresh 2026-08-15: 19.9 -> 43.4 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "nico collins": { adp: 21.1, pos: "WR", team: "HOU" },
  "omarion hampton": { adp: 18.7, pos: "RB", team: "LAC" },
  "kenneth walker": { adp: 20.3, pos: "RB", team: "KC" },
  "trey mcbride": { adp: 41.9, pos: "TE", team: "ARI" },  // ADP refresh 2026-08-15: 23.4 -> 41.9 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "george pickens": { adp: 22.3, pos: "WR", team: "DAL" },
  "malik nabers": { adp: 34.2, pos: "WR", team: "NYG" },
  "jeremiyah love": { adp: 26.6, pos: "RB", team: "ARI" },
  "josh allen": { adp: 19.0, pos: "QB", team: "BUF" },
  "chris olave": { adp: 31.5, pos: "WR", team: "NO" },
  "derrick henry": { adp: 19.1, pos: "RB", team: "BAL" },
  "aj brown": { adp: 26.8, pos: "WR", team: "NE" },
  "lamar jackson": { adp: 53.9, pos: "QB", team: "BAL" },  // ADP refresh 2026-08-15: 33.6 -> 53.9 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "josh jacobs": { adp: 30.1, pos: "RB", team: "GB" },
  "tetairoa mcmillan": { adp: 38.7, pos: "WR", team: "CAR" },
  "devonta smith": { adp: 30.1, pos: "WR", team: "PHI" },
  "tee higgins": { adp: 34.5, pos: "WR", team: "CIN" },
  "drake maye": { adp: 44.7, pos: "QB", team: "NE" },
  "colston loveland": { adp: 61.6, pos: "TE", team: "CHI" },  // ADP refresh 2026-08-15: 38.6 -> 61.6 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "garrett wilson": { adp: 31, pos: "WR", team: "NYJ" },  // ADP refresh 2026-08-15: 46.6 -> 31.0 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "kyren williams": { adp: 30.6, pos: "RB", team: "LAR" },
  "travis etienne": { adp: 41.5, pos: "RB", team: "NO" },
  "breece hall": { adp: 38.3, pos: "RB", team: "NYJ" },
  "javonte williams": { adp: 35.7, pos: "RB", team: "DAL" },
  "zay flowers": { adp: 24.8, pos: "WR", team: "BAL" },  // ADP refresh 2026-08-15: 41.3 -> 24.8 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "ladd mcconkey": { adp: 45.7, pos: "WR", team: "LAC" },
  "davante adams": { adp: 48.4, pos: "WR", team: "LAR" },
  "jaylen waddle": { adp: 47.3, pos: "WR", team: "DEN" },
  "luther burden": { adp: 57.8, pos: "WR", team: "CHI" },
  "joe burrow": { adp: 44.4, pos: "QB", team: "CIN" },
  "terry mclaurin": { adp: 56.4, pos: "WR", team: "WAS" },
  "bucky irving": { adp: 50.1, pos: "RB", team: "TB" },
  "jameson williams": { adp: 39.9, pos: "WR", team: "DET" },  // ADP refresh 2026-08-15: 63.1 -> 39.9 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "cam skattebo": { adp: 42.3, pos: "RB", team: "NYG" },
  "jayden daniels": { adp: 72.7, pos: "QB", team: "WAS" },  // ADP refresh 2026-08-15: 52.4 -> 72.7 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "emeka egbuka": { adp: 48.0, pos: "WR", team: "TB" },
  "jalen hurts": { adp: 76.2, pos: "QB", team: "PHI" },  // ADP refresh 2026-08-15: 55.5 -> 76.2 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "treveyon henderson": { adp: 56.4, pos: "RB", team: "NE" },
  "dandre swift": { adp: 50.6, pos: "RB", team: "CHI" },
  "dj moore": { adp: 49.4, pos: "WR", team: "BUF" },  // ADP refresh 2026-08-15: 65.7 -> 49.4 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "christian watson": { adp: 70.8, pos: "WR", team: "GB" },
  "tyler warren": { adp: 70, pos: "TE", team: "IND" },  // ADP refresh 2026-08-15: 48.7 -> 70.0 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "chuba hubbard": { adp: 68.4, pos: "RB", team: "CAR" },
  "rome odunze": { adp: 45.1, pos: "WR", team: "CHI" },  // ADP refresh 2026-08-15: 70.3 -> 45.1 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "quinshon judkins": { adp: 54.7, pos: "RB", team: "CLE" },
  "tucker kraft": { adp: 97.5, pos: "TE", team: "GB" },  // ADP refresh 2026-08-15: 60.0 -> 97.5 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "bhayshul tuten": { adp: 65.4, pos: "RB", team: "JAX" },
  "carnell tate": { adp: 77.1, pos: "WR", team: "TEN" },
  "mike evans": { adp: 65.8, pos: "WR", team: "SF" },
  "david montgomery": { adp: 55.8, pos: "RB", team: "HOU" },
  "justin herbert": { adp: 105.5, pos: "QB", team: "LAC" },  // ADP refresh 2026-08-15: 66.2 -> 105.5 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "jaxson dart": { adp: 110.9, pos: "QB", team: "NYG" },  // ADP refresh 2026-08-15: 74.7 -> 110.9 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "jaylen warren": { adp: 75.2, pos: "RB", team: "PIT" },
  "jordyn tyson": { adp: 89.8, pos: "WR", team: "NO" },
  "jadarian price": { adp: 66.5, pos: "RB", team: "SEA" },
  "marvin harrison jr": { adp: 62.1, pos: "WR", team: "ARI" },  // ADP refresh 2026-08-15: 78.8 -> 62.1 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "mhj": { adp: 73.0, pos: "WR", team: "ARI" },
  "makai lemon": { adp: 97.1, pos: "WR", team: "PHI" },
  "rico dowdle": { adp: 83.0, pos: "RB", team: "PIT" },
  "alec pierce": { adp: 53.8, pos: "WR", team: "IND" },  // ADP refresh 2026-08-15: 80.0 -> 53.8 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "rj harvey": { adp: 93.0, pos: "RB", team: "DEN" },
  "caleb williams": { adp: 97.2, pos: "QB", team: "CHI" },  // ADP refresh 2026-08-15: 72.3 -> 97.2 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "courtland sutton": { adp: 59.3, pos: "WR", team: "DEN" },  // ADP refresh 2026-08-15: 96.2 -> 59.3 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "harold fannin": { adp: 70.6, pos: "TE", team: "CLE" },
  "michael wilson": { adp: 79.1, pos: "WR", team: "ARI" },  // ADP refresh 2026-08-15: 99.0 -> 79.1 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "dk metcalf": { adp: 62.8, pos: "WR", team: "PIT" },  // ADP refresh 2026-08-15: 86.7 -> 62.8 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "rhamondre stevenson": { adp: 70.8, pos: "RB", team: "NE" },  // ADP refresh 2026-08-15: 85.8 -> 70.8 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "sam laporta": { adp: 90.9, pos: "TE", team: "DET" },  // ADP refresh 2026-08-15: 66.2 -> 90.9 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "tony pollard": { adp: 66.7, pos: "RB", team: "TEN" },  // ADP refresh 2026-08-15: 88.6 -> 66.7 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "chris godwin": { adp: 98.1, pos: "WR", team: "TB" },
  "trevor lawrence": { adp: 86.7, pos: "QB", team: "JAX" },
  "kyle pitts": { adp: 74.1, pos: "TE", team: "ATL" },
  "dak prescott": { adp: 77.4, pos: "QB", team: "DAL" },
  "brian thomas jr": { adp: 69.9, pos: "WR", team: "JAX" },  // ADP refresh 2026-08-15: 89.0 -> 69.9 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "btj": { adp: 90.0, pos: "WR", team: "JAX" },
  "ricky pearsall": { adp: 110.2, pos: "WR", team: "SF" },
  "kyle monangai": { adp: 95.7, pos: "RB", team: "CHI" },
  "jk dobbins": { adp: 100.9, pos: "RB", team: "DEN" },
  "parker washington": { adp: 66.5, pos: "WR", team: "JAX" },  // ADP refresh 2026-08-15: 99.2 -> 66.5 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "blake corum": { adp: 121.2, pos: "RB", team: "LAR" },  // ADP refresh 2026-08-15: 97.9 -> 121.2 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "jakobi meyers": { adp: 96.0, pos: "WR", team: "JAX" },
  "kyler murray": { adp: 142.7, pos: "QB", team: "MIN" },  // ADP refresh 2026-08-15: 107.9 -> 142.7 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "jacory croskey merritt": { adp: 115.0, pos: "RB", team: "WAS" },
  "bo nix": { adp: 116.5, pos: "QB", team: "DEN" },  // ADP refresh 2026-08-15: 101.4 -> 116.5 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "dalton kincaid": { adp: 142.2, pos: "TE", team: "BUF" },  // ADP refresh 2026-08-15: 98.4 -> 142.2 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "brock purdy": { adp: 84.2, pos: "QB", team: "SF" },  // ADP refresh 2026-08-15: 100.4 -> 84.2 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "jordan addison": { adp: 91.2, pos: "WR", team: "MIN" },  // ADP refresh 2026-08-15: 121.6 -> 91.2 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "oronde gadsden": { adp: 103.0, pos: "TE", team: "LAC" },
  "kenneth gainwell": { adp: 113.1, pos: "RB", team: "TB" },
  "kenny gainwell": { adp: 113.1, pos: "RB", team: "TB" }, // same player — keep in sync with the line above
  "patrick mahomes": { adp: 94.9, pos: "QB", team: "KC" },
  "michael pittman jr": { adp: 80.8, pos: "WR", team: "PIT" },  // ADP refresh 2026-08-15: 120.6 -> 80.8 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "dallas goedert": { adp: 104.7, pos: "TE", team: "PHI" },
  "tyler allgeier": { adp: 159.1, pos: "RB", team: "ARI" },  // ADP refresh 2026-08-15: 129.4 -> 159.1 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "aaron jones": { adp: 98.2, pos: "RB", team: "MIN" },  // ADP refresh 2026-08-15: 117.2 -> 98.2 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "travis kelce": { adp: 124.8, pos: "TE", team: "KC" },  // ADP refresh 2026-08-15: 95.6 -> 124.8 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "josh downs": { adp: 91.2, pos: "WR", team: "IND" },  // ADP refresh 2026-08-15: 122.5 -> 91.2 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "wandale robinson": { adp: 86.6, pos: "WR", team: "TEN" },  // ADP refresh 2026-08-15: 129.9 -> 86.6 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "jayden reed": { adp: 89.8, pos: "WR", team: "GB" },  // ADP refresh 2026-08-15: 113.0 -> 89.8 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "quentin johnston": { adp: 83, pos: "WR", team: "LAC" },  // ADP refresh 2026-08-15: 117.6 -> 83.0 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "jordan mason": { adp: 122.9, pos: "RB", team: "MIN" },
  "rachaad white": { adp: 120.9, pos: "RB", team: "WAS" },
  "jayden higgins": { adp: 134.4, pos: "WR", team: "HOU" },
  "jake ferguson": { adp: 146.1, pos: "TE", team: "DAL" },  // ADP refresh 2026-08-15: 111.4 -> 146.1 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "zach charbonnet": { adp: 127.3, pos: "RB", team: "SEA" },
  "isaiah likely": { adp: 137.6, pos: "TE", team: "NYG" },  // ADP refresh 2026-08-15: 108.8 -> 137.6 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "george kittle": { adp: 117.4, pos: "TE", team: "SF" },  // ADP refresh 2026-08-15: 91.0 -> 117.4 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "tyrone tracy": { adp: 153.8, pos: "RB", team: "NYG" },  // ADP refresh 2026-08-15: 130.3 -> 153.8 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "chris rodriguez": { adp: 157.8, pos: "RB", team: "JAX" },  // ADP refresh 2026-08-15: 123.0 -> 157.8 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "jonathon brooks": { adp: 113.4, pos: "RB", team: "CAR" },
  "romeo doubs": { adp: 109, pos: "WR", team: "NE" },  // ADP refresh 2026-08-15: 125.0 -> 109.0 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "jalen coker": { adp: 126.0, pos: "WR", team: "CAR" },
  "malik willis": { adp: 122.1, pos: "QB", team: "MIA" },
  "matthew stafford": { adp: 75.2, pos: "QB", team: "LAR" },  // ADP refresh 2026-08-15: 100.7 -> 75.2 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "xavier worthy": { adp: 100.8, pos: "WR", team: "KC" },  // ADP refresh 2026-08-15: 127.5 -> 100.8 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "kc concepcion": { adp: 130.0, pos: "WR", team: "CLE" },
  "tyjae spears": { adp: 146, pos: "RB", team: "TEN" },  // ADP refresh 2026-08-15: 131.0 -> 146.0 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "woody marks": { adp: 132.0, pos: "RB", team: "HOU" },
  "khalil shakir": { adp: 104, pos: "WR", team: "BUF" },  // ADP refresh 2026-08-15: 133.0 -> 104.0 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "matthew golden": { adp: 113.8, pos: "WR", team: "GB" },  // ADP refresh 2026-08-15: 131.9 -> 113.8 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "jonah coleman": { adp: 131.2, pos: "RB", team: "DEN" },
  "jared goff": { adp: 115.9, pos: "QB", team: "DET" },
  "jordan love": { adp: 137.0, pos: "QB", team: "GB" },
  "keaton mitchell": { adp: 138.0, pos: "RB", team: "LAC" },
  "tyler shough": { adp: 129.2, pos: "QB", team: "NO" },
  "stefon diggs": { adp: 96, pos: "WR", team: "WAS" },  // ADP refresh 2026-08-15: 140.0 -> 96.0 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "braelon allen": { adp: 141.0, pos: "RB", team: "NYJ" },
  "dylan sampson": { adp: 142.0, pos: "RB", team: "CLE" },
  "baker mayfield": { adp: 143.0, pos: "QB", team: "TB" },
  "mark andrews": { adp: 136.7, pos: "TE", team: "BAL" },  // ADP refresh 2026-08-15: 114.9 -> 136.7 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "brenton strange": { adp: 159.5, pos: "TE", team: "JAX" },  // ADP refresh 2026-08-15: 127.2 -> 159.5 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "brian robinson": { adp: 146.0, pos: "RB", team: "ATL" },
  "isiah pacheco": { adp: 149.7, pos: "RB", team: "DET" },  // ADP refresh 2026-08-15: 127.6 -> 149.7 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "denzel boston": { adp: 131.4, pos: "WR", team: "CLE" },
  "hunter henry": { adp: 149.0, pos: "TE", team: "NE" },
  "deebo samuel": { adp: 97.3, pos: "WR", team: "SF" },  // ADP refresh 2026-08-15: 134.7 -> 97.3 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "emanuel wilson": { adp: 151.0, pos: "RB", team: "SEA" },
  "cj stroud": { adp: 127.2, pos: "QB", team: "HOU" },
  "mike washington jr": { adp: 192.0, pos: "RB", team: "LV" },
  "alvin kamara": { adp: 154.0, pos: "RB", team: "NO" },
  "james conner": { adp: 127.6, pos: "RB", team: "ARI" },
  "omar cooper jr": { adp: 131.5, pos: "WR", team: "NYJ" },
  "tank bigsby": { adp: 157.0, pos: "RB", team: "PHI" },
  "bryce young": { adp: 158.0, pos: "QB", team: "CAR" },
  "brandon aiyuk": { adp: 159.0, pos: "WR", team: "SF" },
  "juwan johnson": { adp: 131.1, pos: "TE", team: "NO" },
  "sam darnold": { adp: 145.8, pos: "QB", team: "SEA" },  // ADP refresh 2026-08-15: 161.0 -> 145.8 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "jalen mcmillan": { adp: 129.5, pos: "WR", team: "TB" },
  "jerry jeudy": { adp: 133.7, pos: "WR", team: "CLE" },  // ADP refresh 2026-08-15: 163.0 -> 133.7 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "cam ward": { adp: 127.4, pos: "QB", team: "TEN" },
  "jauan jennings": { adp: 131.7, pos: "WR", team: "MIN" },
  "daniel jones": { adp: 166.0, pos: "QB", team: "IND" },
  "nicholas singleton": { adp: 167.0, pos: "RB", team: "TEN" },
  "rashid shaheed": { adp: 130.1, pos: "WR", team: "SEA" },
  "adonai mitchell": { adp: 169.0, pos: "WR", team: "NYJ" },
  "kayshon boutte": { adp: 170.0, pos: "WR", team: "NE" },
  "kaytron allen": { adp: 171.0, pos: "RB", team: "WAS" },
  "ray davis": { adp: 172.0, pos: "RB", team: "BUF" },
  "emmett johnson": { adp: 173.0, pos: "RB", team: "KC" },
  "kenyon sadiq": { adp: 129.1, pos: "TE", team: "NYJ" },
  "chigoziem okonkwo": { adp: 127.4, pos: "TE", team: "WAS" },
  "kimani vidal": { adp: 176.0, pos: "RB", team: "LAC" },
  "tyreek hill": { adp: 177.0, pos: "WR", team: "-" },
  "tj hockenson": { adp: 131.2, pos: "TE", team: "MIN" },
  "terrance ferguson": { adp: 179.0, pos: "TE", team: "LAR" },
  "jacoby brissett": { adp: 180.0, pos: "QB", team: "ARI" },
  "antonio williams": { adp: 135.2, pos: "WR", team: "WAS" },
  "sean tucker": { adp: 182.0, pos: "RB", team: "TB" },
  "calvin ridley": { adp: 133.8, pos: "WR", team: "TEN" },  // ADP refresh 2026-08-15: 183.0 -> 133.8 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "chris bell": { adp: 184.0, pos: "WR", team: "MIA" },
  "dalton schultz": { adp: 131.3, pos: "TE", team: "HOU" },
  "jack bech": { adp: 186.0, pos: "WR", team: "LV" },
  "malik benson": { adp: 200.0, pos: "WR", team: "LV" }, // estimated, anchored to Bech — see ADP_DATA note
  "eli stowers": { adp: 187.0, pos: "TE", team: "PHI" },
  "troy franklin": { adp: 189.0, pos: "WR", team: "DEN" },
  "tre tucker": { adp: 135.4, pos: "WR", team: "LV" },  // ADP refresh 2026-08-15: 190.0 -> 135.4 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "tre harris": { adp: 167.5, pos: "WR", team: "LAC" },
  "jalen nailor": { adp: 141.6, pos: "WR", team: "LV" },  // ADP refresh 2026-08-15: 192.0 -> 141.6 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "isaac teslaa": { adp: 120.1, pos: "WR", team: "DET" },
  "trey benson": { adp: 194.0, pos: "RB", team: "ARI" },
  "aj barner": { adp: 195.0, pos: "TE", team: "SEA" },
  "ryan flournoy": { adp: 196.0, pos: "WR", team: "DAL" },
  "germie bernard": { adp: 197.0, pos: "WR", team: "PIT" },
  "jake tonges": { adp: 199.0, pos: "TE", team: "SF" },
  "david njoku": { adp: 201.0, pos: "TE", team: "LAC" },
  "darnell mooney": { adp: 202.0, pos: "WR", team: "NYG" },
  "fernando mendoza": { adp: 203.0, pos: "QB", team: "LV" },
  "colby parkinson": { adp: 204.0, pos: "TE", team: "LAR" },
  "tank dell": { adp: 152.6, pos: "WR", team: "HOU" },  // ADP refresh 2026-08-15: 205.0 -> 152.6 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "dezhaun stribling": { adp: 146.1, pos: "WR", team: "SF" },  // ADP refresh 2026-08-15: 206.0 -> 146.1 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "aaron rodgers": { adp: 118.4, pos: "QB", team: "PIT" },
  "pat freiermuth": { adp: 208.0, pos: "TE", team: "PIT" },
  "gunnar helm": { adp: 209.0, pos: "TE", team: "TEN" },
  "cooper kupp": { adp: 151.2, pos: "WR", team: "SEA" },  // ADP refresh 2026-08-15: 210.0 -> 151.2 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "geno smith": { adp: 211.0, pos: "QB", team: "NYJ" },
  "jordan james": { adp: 212.0, pos: "RB", team: "SF" },
  "dontayvion wicks": { adp: 213.0, pos: "WR", team: "PHI" },
  "christian kirk": { adp: 214.0, pos: "WR", team: "SF" },
  "zachariah branch": { adp: 215.0, pos: "WR", team: "ATL" },
  "justice hill": { adp: 216.0, pos: "RB", team: "BAL" },
  "malachi fields": { adp: 217.0, pos: "WR", team: "NYG" },
  "ted hurst": { adp: 218.0, pos: "WR", team: "TB" },
  "travis hunter": { adp: 159.3, pos: "WR", team: "JAX" },  // ADP refresh 2026-08-15: 128.2 -> 159.3 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "jaylin noel": { adp: 223.0, pos: "WR", team: "HOU" },
  "chimere dike": { adp: 226.0, pos: "WR", team: "TEN" },
  "elic ayomanor": { adp: 227.0, pos: "WR", team: "TEN" },
  "jaylen wright": { adp: 228.0, pos: "RB", team: "MIA" },
  "jaydon blue": { adp: 229.0, pos: "RB", team: "DAL" },
  "mason taylor": { adp: 230.0, pos: "TE", team: "NYJ" },
  "shedeur sanders": { adp: 231.0, pos: "QB", team: "CLE" },
  "mike gesicki": { adp: 232.0, pos: "TE", team: "CIN" },
  "keon coleman": { adp: 233.0, pos: "WR", team: "BUF" },
  "kirk cousins": { adp: 234.0, pos: "QB", team: "LV" },
  "pat bryant": { adp: 236.0, pos: "WR", team: "DEN" },
  "evan engram": { adp: 237.0, pos: "TE", team: "DEN" },
  "rashod bateman": { adp: 133.2, pos: "WR", team: "BAL" },  // ADP refresh 2026-08-15: 157.0 -> 133.2 (Half-PPR, 2,429 drafts, 2026-08-10 to 2026-08-15)
  "ollie gordon": { adp: 241.0, pos: "RB", team: "MIA" },
  "samaje perine": { adp: 242.0, pos: "RB", team: "CIN" },
  "skyler bell": { adp: 243.0, pos: "WR", team: "BUF" },
  "najee harris": { adp: 246.0, pos: "RB", team: "-" },
  "tyquan thornton": { adp: 247.0, pos: "WR", team: "KC" },
  "dawson knox": { adp: 248.0, pos: "TE", team: "BUF" },
  "darius slayton": { adp: 249.0, pos: "WR", team: "NYG" },
  "cade otton": { adp: 252.0, pos: "TE", team: "TB" },
  "malik washington": { adp: 153.2, pos: "WR", team: "MIA" },  // Aug 15 2026: 254.0 -> 153.2, matching the live redraft market directly
  "tua tagovailoa": { adp: 255.0, pos: "QB", team: "ATL" },
  "kaelon black": { adp: 256.0, pos: "RB", team: "SF" },
  "greg dulcich": { adp: 134.2, pos: "TE", team: "MIA" },
  "deshaun watson": { adp: 260.0, pos: "QB", team: "CLE" },
  "michael penix jr": { adp: 261.0, pos: "QB", team: "ATL" },
  "keenan allen": { adp: 262.0, pos: "WR", team: "-" },
  "tory horton": { adp: 264.0, pos: "WR", team: "SEA" },
  "chris brazzell ii": { adp: 265.0, pos: "WR", team: "CAR" },
  "malik davis": { adp: 266.0, pos: "RB", team: "DAL" },
  "marshawn lloyd": { adp: 267.0, pos: "RB", team: "GB" },
  "jakobi lane": { adp: 216.0, pos: "WR", team: "BAL" }, // Aug 15 2026: measured -52 live move applied to this table's scale
  "drew allar": { adp: 299.0, pos: "QB", team: "PIT" }, // estimated tail — see ADP_DATA note
  "seth mcgowan": { adp: 268.0, pos: "RB", team: "IND" }, // estimated, anchored to Giddens — see ADP_DATA note
  "dj giddens": { adp: 269.0, pos: "RB", team: "IND" },
  "carson beck": { adp: 270.0, pos: "QB", team: "ARI" },
  "jahan dotson": { adp: 215.9, pos: "WR", team: "ATL" },
  "lequint allen": { adp: 272.0, pos: "RB", team: "JAX" },
  "darnell washington": { adp: 202.0, pos: "TE", team: "PIT" },
  "chris brooks": { adp: 274.0, pos: "RB", team: "GB" },
  "ty johnson": { adp: 275.0, pos: "RB", team: "BUF" },
  "oscar delp": { adp: 276.0, pos: "TE", team: "NO" },
  "hollywood brown": { adp: 277.0, pos: "WR", team: "PHI" },
  "kaleb johnson": { adp: 278.0, pos: "RB", team: "PIT" },
  "caleb douglas": { adp: 279.0, pos: "WR", team: "MIA" },
  "george holani": { adp: 280.0, pos: "RB", team: "SEA" },
  "andrei iosivas": { adp: 281.0, pos: "WR", team: "CIN" },
  "colbie young": { adp: 282.0, pos: "WR", team: "CIN" },  // added Aug 15 2026 — estimated, anchored beside Iosivas in this table's scale
  "kendrick bourne": { adp: 282.0, pos: "WR", team: "ARI" },
  "cole kmet": { adp: 283.0, pos: "TE", team: "CHI" },
  "marvin mims": { adp: 284.0, pos: "WR", team: "DEN" },
  "demond claiborne": { adp: 289.0, pos: "RB", team: "MIN" },
  "theo johnson": { adp: 299.0, pos: "TE", team: "NYG" },
  "erick all": { adp: 300.0, pos: "TE", team: "CIN" },   // estimated tail placement — see ADP_DATA note
  "adam randall": { adp: 300.0, pos: "RB", team: "BAL" },
  // Deep tail dart throws — recognition coverage only
  "odell beckham": { adp: 242.0, pos: "WR", team: "NYG" },
  "odell beckham jr": { adp: 242.0, pos: "WR", team: "NYG" },
  // Suffix aliases
  "luther burden iii": { adp: 57.8, pos: "WR", team: "CHI" },
  "jatavion sanders": { adp: 251.0, pos: "TE", team: "CAR" },
  "eli raridon": { adp: 258.0, pos: "TE", team: "NE" },
  "elijah arroyo": { adp: 261.0, pos: "TE", team: "SEA" },
  "bryce lance": { adp: 267.0, pos: "WR", team: "NO" },
  "jalen tolbert": { adp: 268.0, pos: "WR", team: "MIA" },
  "savion williams": { adp: 271.0, pos: "WR", team: "GB" },
  "xavier legette": { adp: 274.0, pos: "WR", team: "CAR" },
  "kyle williams": { adp: 279.0, pos: "WR", team: "NE" },
  "devontez walker": { adp: 280.0, pos: "WR", team: "BAL" },
  "mack hollins": { adp: 281.0, pos: "WR", team: "NE" },
  "justin joly": { adp: 282.0, pos: "TE", team: "DEN" },
  "jalen royals": { adp: 284.0, pos: "WR", team: "KC" },
  "devin neal": { adp: 286.0, pos: "RB", team: "NO" },
  "kavontae turpin": { adp: 288.0, pos: "WR", team: "DAL" },
  "max klare": { adp: 289.0, pos: "TE", team: "LAR" },
  "tahj brooks": { adp: 290.0, pos: "RB", team: "CIN" },
  "jj mccarthy": { adp: 291.0, pos: "QB", team: "MIN" },
  "j.j. mccarthy": { adp: 291.0, pos: "QB", team: "MIN" },
  "jordan whittington": { adp: 292.0, pos: "WR", team: "LAR" },
  "olamide zaccheaus": { adp: 293.0, pos: "WR", team: "ATL" },
  "demario douglas": { adp: 295.0, pos: "WR", team: "NE" },
  "calvin austin": { adp: 296.0, pos: "WR", team: "NYG" },
  "tez johnson": { adp: 297.0, pos: "WR", team: "TB" },
  "emari demercado": { adp: 215.9, pos: "RB", team: "KC" },
  "nick westbrook-ikhine": { adp: 299.0, pos: "WR", team: "IND" },
  "cyrus allen": { adp: 299.0, pos: "WR", team: "KC" },   // placeholder, see ADP_DATA note
  // --- Cross-table coverage fill, Aug 16 2026 -------------------------------
  // Each of these already existed in another ADP table and returned null here,
  // so a roster in this format silently lost the player. Values are ESTIMATES:
  // 1.15x carried across; this table's tail runs deeper.
  // Safe because adpFlags excludes adp >= 200 from reach/value logic entirely —
  // for these players the number drives resolution and ordering, nothing else.
  // Replace any of them with a real quote for THIS format when you see one.
  "brenen thompson": { adp: 247.6, pos: "WR", team: "LAC" },
  "devaughn vele": { adp: 247.8, pos: "WR", team: "NO" },
  "elijah sarratt": { adp: 239.9, pos: "WR", team: "BAL" },
  "justin fields": { adp: 262.2, pos: "QB", team: "KC" },
  "mac jones": { adp: 261, pos: "QB", team: "SF" },
  "michael mayer": { adp: 247.8, pos: "TE", team: "LV" },
  "zavion thomas": { adp: 247.7, pos: "WR", team: "CHI" },
  // -------------------------------------------------------------------------
  "darren waller": { adp: 241, pos: "TE", team: "CAR" },  // added Aug 18 2026 — estimated at this table's scale from a 209.8 best-ball quote
};

const FULL_SCHEDULE = {
  ARI: ["@LAC", "SEA", "@SF", "@NYG", "DET", "@LAR", "DEN", "@DAL", "@SEA", "LAR", "@KC", "WAS", "PHI", "BYE", "NYJ", "@NO", "LV", "SF"],
  ATL: ["@PIT", "CAR", "@GB", "@NO", "BAL", "CHI", "SF", "@TB", "CIN", "KC", "BYE", "@MIN", "DET", "@CLE", "@WAS", "TB", "NO", "@CAR"],
  BAL: ["@IND", "NO", "@DAL", "TEN", "@ATL", "@CLE", "CIN", "@BUF", "JAX", "LAC", "@CAR", "@HOU", "BYE", "TB", "@PIT", "CLE", "@CIN", "PIT"],
  BUF: ["@HOU", "DET", "LAC", "NE", "@LAR", "@LV", "BYE", "BAL", "@MIN", "@NYJ", "MIA", "KC", "@NE", "@GB", "CHI", "@DEN", "@MIA", "NYJ"],
  CAR: ["CHI", "@ATL", "@CLE", "DET", "BYE", "@PHI", "TB", "@GB", "DEN", "@NO", "BAL", "@TB", "@MIN", "NO", "CIN", "@PIT", "SEA", "ATL"],
  CHI: ["@CAR", "MIN", "PHI", "NYJ", "@GB", "@ATL", "NE", "@SEA", "TB", "BYE", "NO", "@DET", "JAX", "@MIA", "@BUF", "GB", "DET", "@MIN"],
  CIN: ["TB", "@HOU", "@PIT", "JAX", "@MIA", "BYE", "@BAL", "TEN", "@ATL", "PIT", "@WAS", "NO", "@CLE", "KC", "@CAR", "@IND", "BAL", "CLE"],
  CLE: ["@JAX", "@TB", "CAR", "PIT", "@NYJ", "BAL", "@TEN", "@PIT", "@NO", "HOU", "BYE", "LV", "CIN", "ATL", "@NYG", "@BAL", "IND", "@CIN"],
  DAL: ["@NYG", "WAS", "BAL", "@HOU", "TB", "@GB", "@PHI", "ARI", "@IND", "SF", "TEN", "PHI", "@SEA", "BYE", "@LAR", "JAX", "NYG", "@WAS"],
  DEN: ["@KC", "JAX", "LAR", "@SF", "@LAC", "SEA", "@ARI", "KC", "@CAR", "BYE", "LV", "@PIT", "MIA", "@NYJ", "@LV", "BUF", "@NE", "LAC"],
  DET: ["NO", "@BUF", "NYJ", "@CAR", "@ARI", "BYE", "GB", "MIN", "@MIA", "NE", "TB", "CHI", "@ATL", "TEN", "@MIN", "NYG", "@CHI", "@GB"],
  GB: ["@MIN", "@NYJ", "ATL", "@TB", "CHI", "DAL", "@DET", "CAR", "@NE", "MIN", "BYE", "@LAR", "@NO", "BUF", "MIA", "@CHI", "HOU", "DET"],
  HOU: ["BUF", "CIN", "@IND", "DAL", "@TEN", "@JAX", "NYG", "BYE", "@LAC", "@CLE", "IND", "BAL", "@PIT", "@WAS", "JAX", "@PHI", "@GB", "TEN"],
  IND: ["BAL", "@KC", "HOU", "@WAS", "@PIT", "TEN", "@MIN", "@JAX", "DAL", "MIA", "@HOU", "NYG", "BYE", "@PHI", "@TEN", "CIN", "@CLE", "JAX"],
  JAX: ["CLE", "@DEN", "NE", "@CIN", "PHI", "HOU", "BYE", "IND", "@BAL", "@TEN", "@NYG", "TEN", "@CHI", "PIT", "@HOU", "@DAL", "WAS", "@IND"],
  KC: ["DEN", "IND", "@MIA", "@LV", "BYE", "LAC", "@SEA", "@DEN", "NYJ", "@ATL", "ARI", "@BUF", "@LAR", "@CIN", "NE", "SF", "@LAC", "LV"],
  LAC: ["ARI", "LV", "@BUF", "@SEA", "DEN", "@KC", "BYE", "@LAR", "HOU", "@BAL", "NYJ", "NE", "@TB", "@LV", "SF", "@MIA", "KC", "@DEN"],
  LAR: ["SF", "NYG", "@DEN", "@PHI", "BUF", "ARI", "@LV", "LAC", "@WAS", "@ARI", "BYE", "GB", "KC", "@SF", "DAL", "@SEA", "@TB", "SEA"],
  LV: ["MIA", "@LAC", "@NO", "KC", "@NE", "BUF", "LAR", "@NYJ", "@SF", "SEA", "@DEN", "@CLE", "BYE", "LAC", "DEN", "TEN", "@ARI", "@KC"],
  MIA: ["@LV", "@SF", "KC", "@MIN", "CIN", "BYE", "@NYJ", "NE", "DET", "@IND", "@BUF", "NYJ", "@DEN", "CHI", "@GB", "LAC", "BUF", "@NE"],
  MIN: ["GB", "@CHI", "@TB", "MIA", "@NO", "BYE", "IND", "@DET", "BUF", "@GB", "@SF", "ATL", "CAR", "@NE", "DET", "WAS", "@NYJ", "CHI"],
  NE: ["@SEA", "PIT", "@JAX", "@BUF", "LV", "NYJ", "@CHI", "@MIA", "GB", "@DET", "BYE", "@LAC", "BUF", "MIN", "@KC", "@NYJ", "DEN", "MIA"],
  NO: ["@DET", "@BAL", "LV", "ATL", "MIN", "@NYG", "PIT", "BYE", "CLE", "CAR", "@CHI", "@CIN", "GB", "@CAR", "@TB", "ARI", "@ATL", "TB"],
  NYG: ["DAL", "@LAR", "TEN", "ARI", "@WAS", "NO", "@HOU", "BYE", "@PHI", "WAS", "JAX", "@IND", "SF", "@SEA", "CLE", "@DET", "@DAL", "PHI"],
  NYJ: ["@TEN", "GB", "@DET", "@CHI", "CLE", "@NE", "MIA", "LV", "@KC", "BUF", "@LAC", "@MIA", "BYE", "DEN", "@ARI", "NE", "MIN", "@BUF"],
  PHI: ["WAS", "@TEN", "@CHI", "LAR", "@JAX", "CAR", "DAL", "@WAS", "NYG", "BYE", "PIT", "@DAL", "@ARI", "IND", "SEA", "HOU", "@SF", "@NYG"],
  PIT: ["ATL", "@NE", "CIN", "@CLE", "IND", "@TB", "@NO", "CLE", "BYE", "@CIN", "@PHI", "DEN", "HOU", "@JAX", "BAL", "CAR", "@TEN", "@BAL"],
  SEA: ["NE", "@ARI", "@WAS", "LAC", "SF", "@DEN", "KC", "CHI", "ARI", "@LV", "BYE", "@SF", "DAL", "NYG", "@PHI", "LAR", "@CAR", "@LAR"],
  SF: ["@LAR", "MIA", "ARI", "DEN", "@SEA", "WAS", "@ATL", "BYE", "LV", "@DAL", "MIN", "SEA", "@NYG", "LAR", "@LAC", "@KC", "PHI", "@ARI"],
  TB: ["@CIN", "CLE", "MIN", "GB", "@DAL", "PIT", "@CAR", "ATL", "@CHI", "BYE", "@DET", "CAR", "LAC", "@BAL", "NO", "@ATL", "LAR", "@NO"],
  TEN: ["NYJ", "PHI", "@NYG", "@BAL", "HOU", "@IND", "CLE", "@CIN", "BYE", "JAX", "@DAL", "@JAX", "WAS", "@DET", "IND", "@LV", "PIT", "@HOU"],
  WAS: ["@PHI", "@DAL", "SEA", "IND", "NYG", "@SF", "BYE", "PHI", "LAR", "@NYG", "CIN", "@ARI", "@TEN", "HOU", "ATL", "@MIN", "@JAX", "DAL"],
};

const WIN_TOTALS = {
  ARI: 4.5,
  ATL: 6.5,
  BAL: 11.5,
  BUF: 10.5,
  CAR: 7.5,
  CHI: 9.5,
  CIN: 9.5,
  CLE: 6.5,
  DAL: 9.5,
  DEN: 9.5,
  DET: 10.5,
  GB: 10.5,
  HOU: 9.5,
  IND: 7.5,
  JAX: 8.5,
  KC: 10.5,
  LAC: 9.5,
  LAR: 10.5,
  LV: 5.5,
  MIA: 4.5,
  MIN: 8.5,
  NE: 9.5,
  NO: 7.5,
  NYG: 7.5,
  NYJ: 5.5,
  PHI: 10.5,
  PIT: 8.5,
  SEA: 10.5,
  SF: 10.5,
  TB: 8.5,
  TEN: 6.5,
  WAS: 7.5,
};

// Coaching-adjusted overrides (2026 projections)
//
// NOTE ON SCOPE: this table applies in BOTH data modes — it sits outside the
// useProjected guard in getMatchupTier and getMatchupScoreForOpponent. Keep it
// to coaching- and scheme-level reads that are stable enough to carry into the
// "2025 Data" view. Pure 2026 personnel projection belongs in
// OFFSEASON_ADJ_2026 below, which is projected-mode only.
//
// Re-validated in full Aug 3 2026 against camp reporting, the NFL.com FA
// tracker (upd. Jul 20), the SI PUP/NFI/IR tracker (upd. Jul 29) and the 2026
// draft. Seven notes here and below were factually wrong — see the individual
// entries. Prior vintage was Jun 25 2026.
const COACHING_ADJ = {
  // WAS "Minter DC promotion" corrected: Minter is the HEAD COACH, hired from
  // the Chargers DC job, not promoted internally. DC is Anthony Weaver (ex-MIA,
  // CBS graded the hire A+). Entirely new defensive staff, so HIGH CHURN
  // despite the strong tier. Hendrickson signed 4yr/$112M. Five defenders
  // opened camp on PUP. Softened -2.5 -> -2.0 on churn + PUP load, not talent.
  BAL: { all: -2.0, note: "HIGH CHURN — Minter is HC (from LAC), Weaver is the new DC. Hendrickson added 4yr/$112M; theScore has them 6th. Five defenders opened camp on PUP; Humphrey moving to nickel off an injury year" },
  // Tomlin gone after 19 years; McCarthy HC, Graham DC from LV. Top-10 read
  // holds, but this is a new HC + new DC + a DC who has run both 3-4 and 4-3,
  // with Porter Jr, Ramsey and Kent all on PUP. Softened on confidence.
  PIT: { all: -1.5, note: "HIGH CHURN — McCarthy replaces Tomlin, Graham DC from LV. Top-10 read intact (11th DVOA 2025) but three projected starting DBs opened camp on PUP; 2025 FPA is low-confidence here" },
  // "Pass rush remains elite" was overstated — see OFFSEASON note. Trading the
  // reigning DPOY at 23 sacks for a younger, less productive edge is a real
  // downgrade, so the regression is more than "slight."
  CLE: { all: -0.5, note: "Schwartz resigned (passed over for HC), Rutenberg first-time DC keeping the scheme. Garrett traded to LAR for Verse + three picks — pressure now has to be manufactured rather than isolated" },
  // Parsons IS the reason for this number, but he is not available early. Torn
  // ACL Dec 14, surgery Dec 30, opened camp on PUP, reporting points to a
  // Week 6 return. Value kept for the W15-17 window, where he should be back;
  // the W1-14 advance-rate layer is the part that overstates GB.
  GB: { all: -1.5, note: "HIGH CHURN — Gannon DC replaces Hafley, back to a 3-4. Parsons on PUP (ACL, ~Week 6 return), Gary traded to DAL and Enagbare left: 1,000+ snaps to replace. Value reflects the W15-17 window; GB is materially softer W1-6" },
  // Note replaced wholesale, not edited. Every name in the old one was wrong:
  // Dennis Allen is the SITTING DC running camp, and Greenard and Hargrave were
  // Vikings in 2025 who went to PHI and GB. The conclusion survived the audit;
  // the reasoning did not, and a note nobody can trace is worse than none.
  CHI: { all: +1.5, note: "Dennis Allen returns as DC but 18 new defensive players. Safety room and half the CB room left; three of the top four 2025 turnover leaders gone after leading the NFL in INTs. Passed on pass rush — 31st in pass-rush win rate, 29th in pressure rate" },
  DAL: { all: +1.0, note: "HIGH CHURN — massive rebuild (Gary, Thompson, Caleb Downs at 11, new DC Parker, 3-4 switch, ~7 new starters per ESPN). Lost Odighizuwa to SF. Still soft early but no longer bottom-3; 2025 FPA is low-confidence here" },
  // "Stays bottom-5" held a static grade against an unambiguous upward
  // direction. Dead last in 2025 justifies caution, not a frozen tier.
  // "Payne age concern" removed — UNVERIFIED, no 2026 reporting found.
  WAS: { all: +0.75, note: "Rebuild, but direction is up — B/R top-5 most improved. New DC Daronte Jones (Flores lineage, attacking). Oweh 4yr/~$100M, Chenal, Settle, Douglas, Robertson; LB Sonny Styles at 7. Was last in total defense 2025, so still soft — just not statically bottom-5" },
  // "Bottom-8" was badly under-scaled: the No. 2 overall pick, a 3x All-Pro
  // safety and four veteran front-seven signings is not a bottom-8 trajectory.
  NYJ: { all: +0.25, note: "Improving faster than the old bottom-8 note implied — EDGE David Bailey at No. 2, Minkah Fitzpatrick acquired + extended, Davis/Ossai/Enagbare/Onyemata added. B/R top-5 most improved. Glenn still calls the defense, so play-calling is continuous despite the new DC title" },
  // Same static-grade error as WAS. Tennessee spent more real money on defense
  // than nearly anyone and drafted two front-seven starters.
  TEN: { all: +0.5, note: "Saleh HC calling his own defense, Gus Bradley DC. Enormous spend — Simmons 3yr/$105.8M, Franklin-Myers, Jermaine Johnson II, two CBs at $45M+; Faulk at 31 and Hill at 60. B/R top-5 most improved. Coming off 3-14 so scheme-install risk is real, but a static bottom-5 is now wrong" },
};

// === TEAM ENVIRONMENT PRIORS (2026 preseason) ===
// ippg: Vegas implied points per game — RotoWire look-ahead lines, Jun 24 2026
//       (league range this season: ~18.3 to ~26.4; directionally reliable at team level).
// oline: consolidated offensive line rank 1-32 — Sharp Football Analysis, Jun 30 2026.
// Injected into the AI prompt as team-level context only — never a player verdict.
// Refresh both once near final preseason cuts (labels stale after early Sep 2026).
const TEAM_ENV = {
  DET: { ippg: 26.35, oline: 14 }, CIN: { ippg: 26.03, oline: 28 }, BAL: { ippg: 26.01, oline: 24 },
  LAR: { ippg: 25.87, oline: 5 },  DAL: { ippg: 25.79, oline: 17 }, BUF: { ippg: 25.71, oline: 3 },
  SF:  { ippg: 25.28, oline: 7 },  GB:  { ippg: 25.22, oline: 27 }, SEA: { ippg: 25.00, oline: 9 },
  CHI: { ippg: 24.56, oline: 6 },  KC:  { ippg: 24.50, oline: 23 }, PHI: { ippg: 23.91, oline: 2 },
  NE:  { ippg: 23.59, oline: 15 }, LAC: { ippg: 23.56, oline: 8 },  TB:  { ippg: 23.34, oline: 4 },
  IND: { ippg: 23.28, oline: 10 }, WAS: { ippg: 23.26, oline: 22 }, JAX: { ippg: 23.18, oline: 17 },
  HOU: { ippg: 22.59, oline: 31 }, MIN: { ippg: 22.53, oline: 12 }, DEN: { ippg: 22.37, oline: 1 },
  NYG: { ippg: 21.94, oline: 20 }, NO:  { ippg: 21.63, oline: 16 }, ATL: { ippg: 21.60, oline: 10 },
  PIT: { ippg: 21.60, oline: 21 }, TEN: { ippg: 20.74, oline: 30 }, CAR: { ippg: 20.31, oline: 12 },
  LV:  { ippg: 19.28, oline: 25 }, MIA: { ippg: 19.09, oline: 29 }, CLE: { ippg: 18.71, oline: 32 },
  ARI: { ippg: 18.56, oline: 26 }, NYJ: { ippg: 18.32, oline: 19 },
};

// === 2026 PLAY-CALLER PROFILES (partial — sourced entries only) ===
// Source: Ryan Heath play-caller article (Fantasy Points) + BDGE/Heath video, Jul 11 2026.
// Key tendencies that measurably move fantasy output: at-snap motion (skill players avg
// +43% fantasy points per route run on at-snap-motion plays), play-action/under-center
// rate, pace, backfield expected-fantasy-points history. Only add teams with a sourced
// read — an absent entry means "no reliable play-caller signal," not "neutral."
const PLAYCALLER_PROFILES = {
  LAC: { pc: "Mike McDaniel", isNew: true, tree: "McShanahan", note: "League-high at-snap motion, slow pace — efficiency concentrates in top 1-2 options and ices out secondary pieces. Career 25+ expected fantasy points per game to backfields (had two top-5 RBs at once in 2023)." },
  LV:  { pc: "Clint Kubiak", isNew: true, tree: "Shanahan/Kubiak", note: "Heavy under-center + downfield play-action (top-5 producers on deep PA two straight years). Slow, run-heavy, true bellcow usage everywhere he's been. Has repeatedly overperformed weak O-line projections." },
  SEA: { pc: "Brian Flory", isNew: true, tree: "Kubiak system (internal promote)", note: "Says he keeps last year's Super Bowl offense; wants MORE at-snap motion. Losing Kubiak's deep-PA design is the real risk — last year's passing efficiency is hard to repeat." },
  DET: { pc: "Drew Petzing", isNew: true, tree: "Stefansky", note: "Elite run-game design (2nd in scramble-adjusted YPC last 5 seasons) — great for the lead back. Historically low motion; Campbell has stepped in before to force motion (Goff ~50% more efficient with dropback motion)." },
  TB:  { pc: "Zac Robinson", isNew: true, tree: "McVay", note: "2nd-highest at-snap motion rate in the league; Baker is 2nd-best in ANY/A improvement on motion plays. Runs a Kupp-style off-line Z role as the offense's engine." },
  PHI: { pc: "Sean Mannion", isNew: true, tree: "McVay/LaFleur", note: "First-time caller. Pushing under-center + middle-of-field play-action; Hurts is low-rate but high-efficiency over the middle. Watch for a GB-style 3-man WR route rotation behind the top two." },
  ARI: { pc: "Mike LaFleur", isNew: true, tree: "Shanahan", note: "Creative personnel history (early pony-backfield adopter). Inherits a bottom-of-league implied total — efficiency bet, not volume bet." },
  PIT: { pc: "Mike McCarthy", isNew: true, tree: "West Coast", note: "11-personnel base with Rodgers: quick game, curls/slants/hitches — favors short-area separators and Z/slot types over vertical X routes." },
  BUF: { pc: "Joe Brady (HC) + Pete Carmichael (OC)", isNew: false, tree: "Payton (Carmichael)", note: "Brady keeps calling plays collaboratively. Carmichael spent 18 years feeding Payton-tree receiving backs — watch the RB target share." },
  MIN: { pc: "Kevin O'Connell", isNew: false, tree: "McVay", note: "Downfield-heavy route tree (few slant/curl layups) — WR efficiency swings hard on QB deep-ball quality." },
  WAS: { pc: "David Blough", isNew: true, tree: "Quinn staff continuity", note: "Scheme continuity under Quinn expected — run-heavy identity retained." },
};

// 2026 NFL Playoff Week Game Totals — Early-season reference (Yahoo Sports, May 24 2026)
// ⚠️ Subject to change throughout season — use as directional reference only
// Format: [spread (home perspective), total]
const PLAYOFF_GAME_TOTALS = {
  W15: [
    { away: "DAL", home: "LAR", spread: -5.5, total: 52.5, note: "Highest W15 total" },
    { away: "CHI", home: "BUF", spread: -3.5, total: 51.5, note: "2nd highest W15" },
    { away: "SF",  home: "LAC", spread: -2.5, total: 47.5 },
    { away: "IND", home: "TEN", spread: -1.5, total: 47.5 },
    { away: "CIN", home: "CAR", spread: -2.5, total: 47.5 },
    { away: "ATL", home: "WAS", spread: -3.5, total: 46.5 },
    { away: "DET", home: "MIN", spread: -1.5, total: 46.5 },
    { away: "BAL", home: "PIT", spread: -2.5, total: 45.5 },
    { away: "MIA", home: "GB",  spread: -10.5, total: 45.5 },
    { away: "NO",  home: "TB",  spread: -3.5, total: 45.5 },
    { away: "NE",  home: "KC",  spread: -2.5, total: 45.5 },
    { away: "SEA", home: "PHI", spread: -1.5, total: 43.5 },
    { away: "JAX", home: "HOU", spread: -3.0, total: 43.5 },
    { away: "NYJ", home: "ARI", spread: -1.5, total: 41.5 },
    { away: "DEN", home: "LV",  spread: -4.5, total: 41.5 },
    { away: "CLE", home: "NYG", spread: -4.5, total: 40.5 },
  ],
  W16: [
    { away: "CIN", home: "IND", spread: -1.5, total: 52.5, note: "Highest W16 total" },
    { away: "JAX", home: "DAL", spread: -2.5, total: 51.5, note: "2nd highest W16" },
    { away: "NYG", home: "DET", spread: -5.5, total: 48.5, note: "3rd highest W16" },
    { away: "LAR", home: "SEA", spread: -1.5, total: 47.5, note: "Divisional — elevated ceiling" },
    { away: "GB",  home: "CHI", spread: -1.5, total: 47.5 },
    { away: "BUF", home: "DEN", spread: -1.5, total: 46.5 },
    { away: "WAS", home: "MIN", spread: -2.5, total: 46.5 },
    { away: "SF",  home: "KC",  spread: -2.5, total: 46.5 },
    { away: "TB",  home: "ATL", spread: -1.5, total: 45.5 },
    { away: "LAC", home: "MIA", spread: -7.0, total: 44.5 },
    { away: "ARI", home: "NO",  spread: -5.5, total: 44.5 },
    { away: "CLE", home: "BAL", spread: -9.5, total: 43.5 },
    { away: "TEN", home: "LV",  spread: -1.5, total: 42.5 },
    { away: "NE",  home: "NYJ", spread: -6.5, total: 41.5 },
    { away: "CAR", home: "PIT", spread: -3.5, total: 41.5 },
    { away: "HOU", home: "PHI", spread: -2.5, total: 41.5, note: "Lowest major W16 total — PHI D suppresses scoring" },
  ],
  W17: [
    { away: "BAL", home: "CIN", spread: -1.5, total: 51.5, note: "Highest W17 total — championship ceiling game" },
    { away: "NYG", home: "DAL", spread: -4.5, total: 49.5, note: "Tied 2nd highest W17" },
    { away: "DET", home: "CHI", spread: -1.5, total: 49.5, note: "Tied 2nd highest W17" },
    { away: "WAS", home: "JAX", spread: -3.5, total: 48.5 },
    { away: "LAR", home: "TB",  spread: -3.5, total: 48.5 },
    { away: "BUF", home: "MIA", spread: -7.5, total: 47.5 },
    { away: "KC",  home: "LAC", spread: -1.5, total: 45.5 },
    { away: "PHI", home: "SF",  spread: -1.5, total: 45.5 },
    { away: "NO",  home: "ATL", spread: -1.5, total: 44.5 },
    { away: "IND", home: "CLE", spread: -1.5, total: 43.5 },
    { away: "DEN", home: "NE",  spread: -2.5, total: 42.5 },
    { away: "PIT", home: "TEN", spread: -1.5, total: 42.5 },
    { away: "LV",  home: "ARI", spread: -1.5, total: 42.5 },
    { away: "HOU", home: "GB",  spread: -2.5, total: 42.5 },
    { away: "SEA", home: "CAR", spread: -5.5, total: 42.5 },
    { away: "MIN", home: "NYJ", spread: -3.5, total: 40.5 },
  ],
};

// === GAME SELECTION MATRIX (2026 Playoff Schedule) ===
// From Correlated_Alpha_Build_Pro.md. Highlights specific game nodes for AI context:
// - highPace: pace/efficiency-driven shootout candidates — Macro Volume Multipliers should
//   override raw matchup grades for these games (neutral-script pace, PPP, PROE > defensive rank).
// - hiddenVolatility: games that look quiet on paper but carry real ceiling/script-break risk —
//   worth flagging in bring-back and standout notes even if FPA looks average.
// AI-prompt context only — does not affect scoring, surfaced via aiNutshell/bringBackNotes/standoutDetails.
const GAME_SELECTION_MATRIX = {
  W15: {
    highPace: ["DET@MIN", "SF@LAC", "SEA@PHI", "BAL@PIT"],
    hiddenVolatility: ["IND@TEN", "ARI@NYJ"],
  },
  W16: {
    highPace: ["HOU@PHI", "KC@SF", "BUF@DEN"],
    hiddenVolatility: ["CHI@GB", "LV@TEN"],
  },
  W17: {
    highPace: ["BAL@CIN", "BUF@MIA", "HOU@GB", "SF@PHI", "DET@CHI"],
    hiddenVolatility: ["SEA@CAR", "IND@CLE"],
  },
};

// Look up whether a given matchup (team + opponent string like "@MIN" or "MIN") falls into
// a Game Selection Matrix node for the given playoff week. Returns null or { type, label }.
const getGameSelectionNode = (team, oppRaw, week) => {
  const wk = GAME_SELECTION_MATRIX[`W${week}`];
  if (!wk) return null;
  const opp = (oppRaw || "").replace("@", "").trim().toUpperCase();
  const t = (team || "").toUpperCase();
  const pairKey = [t, opp].sort().join("@");
  const matches = (list) => list.some(node => {
    const [a, b] = node.split("@");
    return [a, b].sort().join("@") === pairKey;
  });
  if (matches(wk.highPace)) return { type: "highPace", label: "High-Pace Target" };
  if (matches(wk.hiddenVolatility)) return { type: "hiddenVolatility", label: "Hidden Volatility Pivot" };
  return null;
};
// Competitive override: spread ≤ 3 AND total ≥ 46 → "COMPETITIVE" (elevates ceiling despite avg EPA)
// ⚠️ Early-season lines — subject to change. Labels are directional, not scoring inputs.
const getGameEnvironmentLabel = (oppRaw, week) => {
  const weekKey = `W${week}`;
  const games = PLAYOFF_GAME_TOTALS[weekKey];
  if (!games) return null;
  const opp = oppRaw.replace("@", "").trim().toUpperCase();
  const game = games.find(g => g.away === opp || g.home === opp);
  if (!game) return null;
  return { total: game.total };
};

// 2026 offseason projection adjustments — position-specific deltas
// Applied ONLY when user selects "2026 Est." mode. Not real data — estimates based on roster moves.
// Positive delta = easier matchup (defense got worse), negative = harder (defense improved).
//
// Expanded from 11 teams to all 32 on Aug 3 2026. The gap mattered: 17 teams
// silently fell through to raw 2025 FPA and rendered identically to teams that
// had actually been reviewed, so an un-updated defense was indistinguishable
// from a confirmed-soft one. Sources per entry are camp reporting, the NFL.com
// FA tracker (upd. Jul 20 2026), the SI PUP/NFI/IR tracker (upd. Jul 29 2026)
// and the 2026 draft.
//
// Magnitudes stay inside the pre-existing ±1.5 / ±1.0 band. Where a team's
// direction is genuinely two-sided (new coordinator, wide error bars), the
// entry is deliberately SMALL and the note carries the uncertainty — an honest
// ±0.25 with a HIGH CHURN flag is more useful than a confident number nobody
// can defend.
const OFFSEASON_ADJ_2026 = {
  // --- corrections to entries that were factually wrong ---
  // "Lou Anarumo back" was wrong: Al Golden is the DC (year 2, hired 2025) and
  // Anarumo has been the COLTS DC since 2025. Verified independently.
  // Interior rebuilt (Dexter Lawrence for the No. 10 pick, Jonathan Allen) and
  // the secondary did upgrade, but they LOST Hendrickson to Baltimore — so the
  // -1.5 overstated it. Softened to -1.0.
  CIN: { wr: -1.0, rb: -0.75, te: -0.75, note: "Al Golden year 2 as DC (NOT Anarumo — he is Indianapolis's DC). Dexter Lawrence acquired for the No. 10 pick + Jonathan Allen inside, Cook/Dugger in the secondary. Lost Hendrickson to BAL, so the edge is weaker than 2025" },
  BAL: { wr: -1.0, rb: -0.5, te: -0.5, note: "HIGH CHURN — Minter is HC, Weaver the new DC. Hendrickson 4yr/$112M, Campbell added. Humphrey moving to nickel off an injury-hit 2025; five defenders opened camp on PUP" },
  // "Lost Brian Burns" was stale by two years — Burns has been a Giant since
  // 2024. Carolina is B/R's No. 1 most-improved defense, was 15th in points
  // allowed, and spent the Phillips/Lloyd money on the exact hole (3rd-worst
  // sack total). Direction was pointing the wrong way; +1.5 -> +0.5.
  CAR: { wr: +0.5, rb: +0.25, te: +0.25, note: "B/R No. 1 most-improved. Evero year 3 (full continuity), Jaelan Phillips 4yr/$120M and Devin Lloyd 3yr/$45M target a pass rush that was 3rd-worst in sacks. Was 15th in points allowed. SI is skeptical of the secondary specifically — hence still mildly soft, not the old bottom-tier read" },
  // Note captured the edge and missed the larger story: the coverage rebuild is
  // what moved LAR into top-3 projections. Tightened -1.0 -> -1.5.
  LAR: { wr: -1.5, rb: -0.75, te: -0.75, note: "Shula year 3 (continuity — the Chris O'Leary report was wrong, he went to LAC). Garrett (reigning DPOY, 23 sacks) AND a rebuilt coverage room: McDuffie traded for + extended 4yr/$124M, Watson 3yr/$51M, Curl re-signed. theScore 3rd, B/R 2nd most improved" },
  // "Pass rush remains elite" overstated a DPOY-for-Verse swap. Softened.
  CLE: { wr: -0.5, rb: -0.5, te: -0.5, note: "Verse arrived from LAR for Garrett + three picks. Still above average, but far less concentrated — you cannot swap the reigning DPOY at 23 sacks and call the group unchanged. Rutenberg is a first-time DC keeping the scheme" },
  // Flat "bottom-5" hid the shape, which is the part that matters. Strong edge
  // (Carter, Burns, Reese at No. 5), worst-projected DT room, weak run defense.
  // That is a run-funnel profile — encoded by splitting wr and rb.
  NYG: { wr: +0.75, rb: +1.5, te: +1.0, note: "RUN FUNNEL — elite edge (Abdul Carter, Brian Burns, Arvell Reese at No. 5) over one of the worst projected DT rooms; run defense is the persistent hole. New HC Harbaugh + DC Wilson, aggressive/disguise-heavy. Lost Dexter Lawrence on request. Grade the run and pass sides separately" },
  WAS: { wr: +0.5, rb: +0.25, te: +0.25, note: "Direction is up, not static bottom-5 — B/R top-5 most improved. Oweh ~$100M, Chenal, Settle, Douglas, Robertson, Styles at 7. Was last in total defense 2025, so still soft. The old 'Payne age concern' was unverifiable in 2026 reporting and has been dropped" },
  // "Secondary intact" was wrong — four DBs left. This one matters beyond the
  // number: CLAUDE.md cites KC/Spagnuolo as the ARCHETYPE of a high-continuity
  // defense whose 2025 FPA stands at full confidence. That reasoning no longer
  // holds for the pass defense. Scheme continuity is real; the coverage
  // personnel executing it is not.
  KC:  { wr: +0.5, rb: -0.5, te: 0, note: "Spagnuolo year 8 — scheme continuity HIGH, secondary continuity HIGH CHURN. Lost McDuffie (traded LAR), Watson (LAR), Cook (CIN), Joshua Williams (TEN). Delane drafted 6th but has been in a non-contact jersey all camp. Do NOT treat KC pass defense as a full-confidence 2025 carryover" },
  // "New DC" was wrong — Campanile is in year two, so JAX is a CONTINUITY team,
  // which flips FPA confidence from low to high. Spend was retention (Walker),
  // not outside starters, so the magnitude comes down too.
  JAX: { wr: -0.5, rb: -0.25, te: -0.25, note: "Campanile year 2, NOT a new DC — continuity team, so 2025 FPA is high-confidence here. Money went to retaining Travon Walker (4yr/$110M) rather than outside starters; no R1/R2 defensive picks. No 2026 source found projecting them top-5 — treat that tier as unverified" },
  DAL: { wr: +1.0, rb: +0.75, te: +0.75, note: "HIGH CHURN — defense rebuilt (Gary, Thompson, Downs at 11, new DC Parker, 3-4 switch, ~7 new starters). Lost Odighizuwa to SF. Soft-ish early, no longer bottom-3; low confidence either direction" },
  // Value kept for the W15-17 window (Parsons should be back by ~Week 6), but
  // the old "arrived and healthy by 2026" was flatly wrong and would have
  // misled anyone drafting against GB's early schedule.
  GB:  { wr: -1.5, rb: -1.0, te: -1.0, note: "W15-17 value. Parsons is on PUP (ACL Dec 14, surgery Dec 30, ~Week 6 return) — NOT healthy to open the season. Gannon DC, 3-4 switch, Gary and Enagbare gone (1,000+ snaps). Hargrave signed but also on PUP. Much softer W1-6 than this number implies" },

  // --- teams added Aug 3 2026 (previously no entry, silently unadjusted) ---
  // Biggest silent gap in the file. Raw 2025 EPA read as merely average while
  // the actual season was a franchise-record 488 points allowed.
  ARI: { wr: +1.5, rb: +1.0, te: +1.0, note: "Franchise-record 488 points allowed in 2025. Rallis retained as the only coordinator kept, but Gannon — a defensive HC who helped him scheme — is gone, and new HC LaFleur is offensive. Free agency was depth-only, no R1/R2 defensive picks. Sweat and Garrett Williams on PUP" },
  // Second-biggest gap. New play-caller, a DC who explicitly does not call
  // plays, and a gutted safety room.
  MIA: { wr: +1.5, rb: +0.75, te: +1.0, note: "Full defensive reset — HC Hafley calls the plays himself, DC Duggan explicitly does not, and 2025 DC Weaver left for BAL. Lost Minkah Fitzpatrick (traded NYJ), Melifonwu and Ashtyn Davis; young unproven safeties. Reported in July as not pursuing further defensive help" },
  // The 2025 number was produced by an injury-wrecked season under a different
  // coordinator running a different front. Stale AND low-confidence, so the
  // adjustment is deliberately small and the note carries the uncertainty.
  SF:  { wr: +0.25, rb: +0.25, te: +0.25, note: "HIGH CHURN — Morris is the 5th DC in five years, and Purdy has confirmed a front change on the record (four-down/three-LB to five down with shifting shells). Odighizuwa added. Mykel Williams and Collins on PUP. theScore 10th but conditioned on Bosa and Warner returning healthy — wide error bars, do not lean on 2025 FPA either way" },
  BUF: { wr: +1.0, rb: +0.5, te: +0.5, note: "HIGH CHURN — new HC Brady, new DC Leonhard, base 4-3 to 3-4 (Rousseau converting to OLB), secondary rebuilt and Taron Johnson traded away. Leonhard has publicly cautioned his vision may not come together in year one, which is unusually direct. Chubb added. 2025 FPA is low-confidence" },
  // Both starting safeties on PUP is a first-order matchup signal. Branch's
  // timeline runs into the W15-17 window in both directions — re-check him.
  DET: { wr: +0.75, rb: +0.25, te: +0.5, note: "Both starting safeties opened camp on PUP — All-Pro Kerby Joseph, and Brian Branch working back from a Dec 4 Achilles tear that Campbell says likely keeps him out until December. Lost nickel Robertson to WAS. Sheppard year 2 but moving off a league-high base-defense rate. BRANCH'S RETURN IS A LIVE W15-17 VARIABLE" },
  // Good defenses that appeared on neither the Tough nor Easy list — an
  // asymmetric omission, since a missing tough defense costs more than a
  // missing soft one (it inflates a matchup the roster is counting on).
  NO:  { wr: -0.75, rb: -0.5, te: -0.5, note: "Under-rated by the old blank. 2025: 9th total defense, 4th against the pass, 45 sacks. Staley year 2, very little turnover. Lost Demario Davis but added Elliss, Tyree Wilson, Cameron Jordan, Emerson" },
  DEN: { wr: -1.25, rb: -0.5, te: -0.75, note: "Genuine continuity — Joseph DC since 2023, secondary fully intact (Surtain, Moss, McMillian, Barron, Hufanga, Jones). 2025: 7th-fewest passing yards, fewest net yards per attempt in the NFL. theScore 5th. Lost Franklin-Myers inside; no R1/R2 picks" },
  HOU: { wr: -1.0, rb: -0.75, te: -0.75, note: "Every key piece back — Burke DC since 2023, three All-Pros plus three Pro Bowlers, Anderson and Hunter both extended. theScore 2nd. Soft spots: no edge depth added behind the starters, and E.J. Speed (torn quad) on PUP for a chunk of the season" },
  SEA: { wr: -1.25, rb: -1.0, te: -1.0, note: "No. 1 overall defense in 2025 and Super Bowl LX winners, with exactly ONE defensive starter not back (Coby Bryant to CHI). Macdonald/Durde continuity. Also lost CB3 Woolen to PHI; Emmanwori on PUP" },
  PHI: { wr: -1.0, rb: -0.75, te: -0.75, note: "Highest continuity in the league — Fangio year 3 with eight core defenders all in year three together. Greenard acquired from MIN 4yr/$100M, Jordan Davis extended, Woolen added. Greenard is on PUP (pectoral) and the GM and DC are publicly disagreeing about Week 1 availability" },
  NE:  { wr: -0.75, rb: -0.5, te: -0.5, note: "2025: 4th in points allowed, 8th in yards. Kuhr's DC title is new but he took over play-calling mid-2025, so this is continuity not a hire. The one hole was sacks (t-22nd) and both additions target it — Dre'Mont Jones and Byard. Landry on PUP" },
  // HIGH CHURN in the back seven despite coordinator continuity. The app's own
  // rule keys on new starters, not just new coaches, and those are separable.
  IND: { wr: +1.0, rb: +0.75, te: +0.75, note: "HIGH CHURN in the back seven despite Anarumo returning for year 2 — over 5,000 defensive snaps to replace (Zaire Franklin 1,112 to GB, Nick Cross 1,111 to WAS, nickel Kenny Moore gone). Up to five new starters. Rookie MIKE CJ Allen is on PUP" },
  MIN: { wr: +0.5, rb: +0.25, te: +0.25, note: "Flores continuity, but lost Greenard (traded PHI) and released Hargrave, with up to five new starters including an unresolved Harrison Smith retirement question. R1 Caleb Banks recovering from a broken foot. theScore still 7th — the old top-5 read is likely one tier too tough" },
  TB:  { wr: +0.75, rb: +0.5, te: +0.5, note: "Bowles has run this defense since 2019 but said on the record it 'needs to make some changes.' Lavonte David retired, Jamel Dean to PIT, Izien to DET, Vildor to NE. Bain at 15 and Trotter at 46 are the bet. Vita Vea trade request reported and UNRESOLVED — re-check before grading TB" },
  LV:  { wr: -0.25, rb: -0.25, te: -0.25, note: "HIGH CHURN, two-sided — new HC Kubiak and first-time DC Leonard (promoted internally), but real talent added: Quay Walker, Nakobe Dean, Kwity Paye, Taron Johnson. Maxx Crosby fully cleared after January meniscus surgery, taking all first-team reps. Wide error bars either direction" },
  LAC: { wr: +0.25, rb: +0.25, te: +0.25, note: "Minter left for the BAL HC job; O'Leary is a first-time NFL DC — but he was LAC's safeties coach under Minter and installed Chargers terminology at Western Michigan, so this is closer to continuity than a reset. Core fully intact (James, Mack, Tart, Tuipulotu, Henley). Mild regression risk off a unit that led the NFL in points allowed in 2024" },
  ATL: { wr: -0.25, rb: -0.25, te: -0.25, note: "Ulbrich retained on a new three-year deal by incoming HC Stefanski specifically to preserve continuity on the team's 2025 strength. Modest additions (Christian Harris, Maason Smith, CB Avieon Terrell at 48). Bowman recovering from a torn Achilles" },
};

// Vintage of BOTH adjustment tables above. Bump in the SAME edit that changes
// either table — a stale stamp is worse than no stamp, because it names a date
// that did not produce the numbers.
const ADJ_UPDATED = "Aug 3 2026";

// === ADJUSTMENT COVERAGE (derived, never hand-counted) ===
//
// Why this exists (Aug 3 2026): the "2026 Est." toggle looked like it applied a
// league-wide 2026 projection. It does not. Only 15 of 32 teams carry an entry
// in either table; the other 17 silently fall through to raw 2025 FPA and are
// presented identically to teams that were actually reviewed. A user reading a
// Smash tier off an unadjusted defense had no way to tell it was un-updated
// rather than confirmed-soft.
//
// TWO SEPARATE COVERAGE NUMBERS, because the two tables apply differently:
//   COACHING_ADJ       applies in BOTH modes (it sits outside the useProjected
//                      guard in getMatchupTier / getMatchupScoreForOpponent).
//                      So "2025 Data" is 2025 FPA plus a coaching overlay on 9
//                      teams — not untouched ground truth, despite the label.
//   OFFSEASON_ADJ_2026 applies in projected mode ONLY, and is position-specific.
//
// Derived from WIN_TOTALS (the canonical 32-team list) so it cannot drift out of
// sync the way a hardcoded "15/32" string would the moment a team is added.
//
// An absent entry means "no reliable signal for this team," NOT "confirmed
// unchanged." Those are different claims and the UI must not merge them.
const ADJ_COVERAGE = (() => {
  const all = Object.keys(WIN_TOTALS).sort();
  const coaching = new Set(Object.keys(COACHING_ADJ));
  const offseason = new Set(Object.keys(OFFSEASON_ADJ_2026));
  const either = new Set([...coaching, ...offseason]);
  return {
    total: all.length,
    // projected mode: any adjustment from either table
    projAdjusted: all.filter(t => either.has(t)),
    projUnadjusted: all.filter(t => !either.has(t)),
    // actual mode: coaching overlay only
    actualAdjusted: all.filter(t => coaching.has(t)),
    actualUnadjusted: all.filter(t => !coaching.has(t)),
  };
})();

const normalize = (s) => s.toLowerCase().trim().replace(/[.,'']/g, "").replace(/-/g, " ").replace(/\s+/g, " ");

const SUFFIX_RE = /\s+(jr|sr|ii|iii|iv|v)$/;

// Legal name in the data feed vs the name the market uses. nflverse ships the
// name on the birth certificate; ADP tables ship the name on the jersey. Where
// they disagree AND the two are not prefix-compatible, no generic matcher can
// bridge them, so they are listed. Keys are normalized on both sides.
// Found by sweeping every ADP entry against the metrics file (Jul 27 2026).
const METRIC_NAME_ALIASES = {
  "kenny gainwell": "kenneth gainwell",
};

// Suffix-insensitive index, built once per table and cached.
//
// The old lookup only stripped a suffix from the QUERY, so it resolved
// "Michael Pittman Jr" -> "michael pittman" but NOT the reverse. The metrics
// files are keyed off nflverse, which carries suffixes the ADP tables drop, so
// the reverse is the common direction: 11 players including Chris Rodriguez Jr,
// Kenneth Walker III, Brian Thomas Jr and Marvin Harrison Jr silently returned
// null and were reported as having no 2025 data at all.
const _baseIndexCache = new Map();
const getBaseIndex = (table) => {
  if (!_baseIndexCache.has(table)) {
    const idx = {};
    for (const key of Object.keys(table)) {
      // Normalize the KEY, not only the query (fixed Jul 27 2026).
      //
      // normalize() turns every hyphen in a QUERY into a space, but table keys
      // are hand-entered and three of them kept their hyphens:
      // ADP_SUPERFLEX "jaxon smith-njigba" and "jacory croskey-merritt",
      // ADP_YAHOO "nick westbrook-ikhine". No query could ever produce those
      // strings, so the keys were dead — those players resolved to null in that
      // format and vanished from the grade with no error.
      //
      // Fixing the three keys by hand would fix today and leave the trap armed
      // for the next hand-entered name. Normalizing here kills the whole class:
      // any key with a hyphen, apostrophe, period or stray casing now resolves.
      const norm = normalize(key);
      if (!(norm in idx)) idx[norm] = key;
      const base = norm.replace(SUFFIX_RE, "");
      if (!(base in idx)) idx[base] = key;   // first wins; suffix collisions are rare
    }
    _baseIndexCache.set(table, idx);
  }
  return _baseIndexCache.get(table);
};

// Resolves in both directions: query-with-suffix against a bare key, and a bare
// query against a key that carries one. Returns null for genuine absences
// (rookies, anyone below a volume gate) — null means "no data", never "bad".
const lookupPlayer = (table, name) => {
  if (!table || !name) return null;
  const key = normalize(name);
  const aliased = METRIC_NAME_ALIASES[key];
  if (aliased && table[aliased]) return table[aliased];
  if (table[key]) return table[key];
  const base = key.replace(SUFFIX_RE, "");
  if (table[base]) return table[base];
  const hit = getBaseIndex(table)[base];
  return hit ? table[hit] : null;
};

const getMetrics = (name) => lookupPlayer(PLAYER_METRICS, name);
const getEfficiency = (name) => lookupPlayer(PLAYER_EFFICIENCY.players, name);
const getMotion = (name) => lookupPlayer(MOTION.players, name);
const getAirYards = (name) => lookupPlayer(AIRYARDS.backs, name);

// === CEILING RANKINGS (informational only — never scored) ===
// Top 10 per position by 2025 spike rate (18+ half-PPR pts), nuclear (28+)
// as the tiebreaker. Draftable players only (present in ADP_DATA), 8+ games
// so one hot month can't fake a profile. SOS season rank rides along so a
// ceiling profile can be read against season-long sustainability. Computed
// once at module load — all inputs are static imports.
const CEILING_RANKINGS = (() => {
  const out = { QB: [], RB: [], WR: [], TE: [] };
  for (const [name, m] of Object.entries(PLAYER_METRICS)) {
    if (!out[m.pos] || (m.gp || 0) < 8) continue;
    const a = ADP_DATA[name];
    if (!a) continue;
    // nflverse player stats say "LA" for the Rams; the SOS build normalizes
    // to "LAR". Align here or every Rams player shows a blank SOS.
    const team = m.team === "LA" ? "LAR" : m.team;
    out[m.pos].push({
      name, team, adp: a.adp, gp: m.gp,
      spike: m.spike_rate, nuclear: m.nuclear_rate,
      sos: SOS[m.pos]?.[team]?.rank ?? null,
    });
  }
  for (const pos of Object.keys(out)) {
    out[pos].sort((x, y) => (y.spike - x.spike) || (y.nuclear - x.nuclear));
    out[pos] = out[pos].slice(0, 10);
  }
  return out;
})();

// Build a reverse index of lastName -> [{key, entry}] for initial-based matching (Yahoo "C. McCaffrey")
const buildLastNameIndex = (table) => {
  const idx = {};
  for (const key of Object.keys(table)) {
    // Suffixes must not become the index key. "marvin harrison jr" was being
    // filed under "jr" alongside every other Jr in the table, so a query for
    // "Marvin Harrison" (how ADP_DATA and most platforms spell him) found
    // nothing, and the "jr" bucket was a junk drawer that could return an
    // unrelated player. Broke fallback steps 3, 4 and 4b at once for every
    // suffixed player. Found Jul 26 2026 via the cross-table resolve sweep.
    const parts = key.split(" ").filter(w => !/^(jr|sr|ii|iii|iv|v)$/.test(w));
    if (parts.length < 2) continue;
    const last = parts[parts.length - 1];
    if (!idx[last]) idx[last] = [];
    idx[last].push({ key, entry: table[key] });
  }
  return idx;
};
const _lastNameIndexCache = new Map();
const getLastNameIndex = (table) => {
  if (!_lastNameIndexCache.has(table)) _lastNameIndexCache.set(table, buildLastNameIndex(table));
  return _lastNameIndexCache.get(table);
};

const findPlayer = (name, format = "standard") => {
  const norm = normalize(name);
  if (!norm) return null;
  let table;
  if (format === "superflex") table = ADP_SUPERFLEX;
  else if (format === "yahoo") table = ADP_YAHOO;
  else table = ADP_DATA;

  // Title-case a normalized DB key into a clean display name
  // Capitalize after a hyphen too, or a key that kept one renders "Smith-njigba".
  const titleCase = (k) => k.split(" ").map(w => w.length <= 2 && /^(jr|sr|ii|iii|iv)$/.test(w) ? w.toUpperCase() : w.replace(/(^|-)([a-z])/g, (_, sep, c) => sep + c.toUpperCase())).join(" ");
  const mk = (key, entry, extra = {}) => ({ ...entry, name: titleCase(key), matchedKey: key, ...extra });

  // 1. Exact normalized match
  if (table[norm]) return mk(norm, table[norm]);

  // 1b. Key-normalized match. Table keys are hand-entered and some carry
  // punctuation that normalize() strips from the query, so an exact hit on
  // table[norm] can miss a key that IS this player. See getBaseIndex.
  const normHit = getBaseIndex(table)[norm];
  if (normHit) return mk(normHit, table[normHit]);

  // 2a. Any key exactly equals query
  for (const key of Object.keys(table)) {
    if (key === norm) return mk(key, table[key]);
  }
  // 2b. word-boundary containment: query contains the full key as a phrase
  const normWords = norm.split(" ");
  if (normWords.length >= 2) {
    for (const key of Object.keys(table)) {
      if (!key.includes(" ")) continue;
      if (norm.includes(key)) return mk(key, table[key]);
    }
  }

  // 3. First-initial + last-name fallback (Yahoo "C. McCaffrey" / "T. Shough")
  const initialMatch = norm.match(/^([a-z])\s+(.+)$/);
  if (initialMatch) {
    const initial = initialMatch[1];
    // Strip trailing suffixes (jr, sr, ii, iii, iv) before last-name lookup
    const nameParts = initialMatch[2].split(" ").filter(w => !/^(jr|sr|ii|iii|iv)$/.test(w));
    const last = nameParts[nameParts.length - 1];
    const idx = getLastNameIndex(table);
    const candidates = (idx[last] || []).filter(c => c.key.split(" ")[0][0] === initial);
    if (candidates.length > 0) {
      candidates.sort((a, b) => a.entry.adp - b.entry.adp);
      return mk(candidates[0].key, candidates[0].entry, { ambiguous: candidates.length > 1 });
    }
  }

  // 4b. Nickname / legal-name bridge (added Jul 26 2026).
  // The ADP tables are sourced separately and do not agree on which name a
  // player goes by: ADP_DATA/ADP_SUPERFLEX key "chig okonkwo" while ADP_YAHOO
  // keys "chigoziem okonkwo". A two-word query whose FIRST name differs had no
  // path through steps 1-4 (step 3 needs a single-letter initial, step 4 needs
  // a single word), so the player silently vanished in one format only.
  //
  // Deliberately narrow: the first names must be PREFIX-compatible, not merely
  // share an initial. "mike washington" must NOT resolve to "malik washington"
  // (different player, different position) — sharing an initial is far too
  // loose, and a wrong match grades the wrong player, which is worse than a
  // miss. Truncation nicknames (Chig/Chigoziem, Cam/Cameron, Josh/Joshua) are
  // prefixes and pass; unrelated names (Tank/Nathaniel) correctly do not.
  if (normWords.length >= 2) {
    const qParts = normWords.filter(w => !/^(jr|sr|ii|iii|iv|v)$/.test(w));
    const qLast = qParts[qParts.length - 1];
    const qFirst = qParts[0];
    const prefixOk = (a, b) => a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a));
    const candidates = (getLastNameIndex(table)[qLast] || [])
      .filter(c => prefixOk(qFirst, c.key.split(" ")[0]));
    if (candidates.length > 0) {
      candidates.sort((a, b) => a.entry.adp - b.entry.adp);
      return mk(candidates[0].key, candidates[0].entry, { ambiguous: candidates.length > 1 });
    }
  }

  // 4. Bare last-name match — helps "Mccaffrey" alone
  if (normWords.length === 1) {
    const idx = getLastNameIndex(table);
    const candidates = idx[norm] || [];
    if (candidates.length === 1) {
      return mk(candidates[0].key, candidates[0].entry);
    } else if (candidates.length > 1) {
      candidates.sort((a, b) => a.entry.adp - b.entry.adp);
      return mk(candidates[0].key, candidates[0].entry, { ambiguous: true });
    }
  }

  return null;
};

const parseRosterRedraft = (text) => {
  // Strip K and D/ST lines before parsing — they're never graded and
  // would land as notFound entries dragging down match rate and depth scores
  const KDST_LINE = /^(.*\s+)?(k|kicker|def|dst|d\/st|defense|d\/s\/t)([\s·\-].*)?$/i;
  const KDST_NAME = /^(.*\b(kicker|defense|def|dst)\b.*)$/i;
  const cleaned = text.split("\n").filter(line => {
    const t = line.trim();
    if (!t) return true; // keep blanks for structure
    if (KDST_LINE.test(t)) return false;
    // Also filter common DST name patterns like "Eagles D/ST", "Patriots Defense"
    if (/\b(d\/st|defense|dst)\b/i.test(t)) return false;
    return true;
  }).join("\n");
  return parseRoster(cleaned, "yahoo");
};

// Universal preprocessor: takes ANY messy paste (Underdog vertical "Copy All" dump,
// Yahoo horizontal rows, Sleeper, plain lists) and reconstructs clean "Name pick"
// lines. Strategy: anchor on lines that resolve to a real player; pull a nearby
// pick number using the ADP DB as a cross-check to avoid grabbing ADP/bye by mistake.
const preprocessRoster = (text, format = "standard") => {
  let rawLines = text.split("\n").map(l => l.trim());

  // === YAHOO SHARE CARD (added Jul 28 2026) ===
  // Yahoo's share function renders a lineup card whose rows read
  //   "QB B. PURDY Thu 5:35PM @ LAR — 18.85"
  // (pos tag, INITIALED name, kickoff day/time, opponent, PROJECTION).
  // Two traps if parsed naively: the projection is a decimal that the
  // unlabelled-ADP capture would swallow as ADP (14.61 for Pickens sits
  // within the 75-pick guard of his table 23.5), and "5:35PM" sheds
  // integer tokens that become ghost pick numbers. So: detect the format
  // by shape (3+ matching rows), strip each row down to the bare name,
  // and flag shareMode so pick/ADP extraction is skipped entirely —
  // share cards carry neither.
  const YAHOO_SHARE_ROW =
    /^(qb|wr|rb|te|wrt|w\/r\/t|bn|ir|k|def|dst)\s+(.+?)\s+(mon|tue|wed|thu|fri|sat|sun)\s+\d{1,2}:\d{2}\s*(am|pm)?\s*(@|vs?)\s*[a-z]{2,3}\.?(\s*[—–-]+\s*\d+(\.\d+)?)?$/i;
  const shareRows = rawLines.filter(l => YAHOO_SHARE_ROW.test(l));
  const shareMode = shareRows.length >= 3;
  if (shareMode) {
    rawLines = rawLines.map(l => {
      const m = l.match(YAHOO_SHARE_ROW);
      return m ? m[2].trim() : l;
    });
  }
  // Junk tokens that appear in app dumps — never players
  const JUNK_LINE = /^(bye|adp|pick|pts|proj|final|starters?|bench|points|min|max|targets?|rec|yds|td|att|rush|pass|fg|pat|w\/?r\/?t|q\/?w\/?r\/?t|flex|def|dst|k|ir|total|today|yesterday)$/i;
  const POS_HEADER = /^(qb|rb|wr|te|k|def|dst|flex|bench|ir)$/i;
  const TEAM_CODE = /^(@?)(ari|atl|bal|buf|car|chi|cin|cle|dal|den|det|gb|hou|ind|jax|kc|lac|lar|lv|mia|min|ne|no|nyg|nyj|phi|pit|sea|sf|tb|ten|was|wsh)$/i;
  const SCORE_LINE = /\b(final|w|l)\s+\d+[-–]\d+/i;
  const STAT_LINE = /\d+\s+(pass|rush|rec|targets?|yds|td|att|pat|fg)/i;

  // Helper: is this line plausibly a player name? (resolves in DB)
  const resolves = (s) => {
    const cleaned = s
      .replace(/\([^)]*\)/g, "")           // remove parentheticals
      .replace(/\b\d+(\.\d+)?\b/g, "")      // remove standalone numbers
      .replace(/[▶►🔵📰⚠️✓•·|]/g, "")        // remove icons/bullets
      .replace(/\s+/g, " ")
      .trim();
    if (!cleaned || cleaned.length < 3) return null;
    if (JUNK_LINE.test(cleaned) || POS_HEADER.test(cleaned) || TEAM_CODE.test(cleaned)) return null;
    if (SCORE_LINE.test(s) || STAT_LINE.test(s)) return null;
    return findPlayer(cleaned, format);
  };

  // Collect all numeric tokens from a line (for pick extraction)
  const numbersIn = (s) => {
    const m = s.match(/\b\d+(\.\d+)?\b/g);
    return m ? m.map(Number) : [];
  };

  // Pass 1: classify every line
  const classified = rawLines.map((line, i) => {
    if (!line) return { i, line, type: "blank" };
    const player = resolves(line);
    if (player) return { i, line, type: "name", player };
    if (POS_HEADER.test(line.replace(/[^a-z]/gi, ""))) return { i, line, type: "header" };
    if (TEAM_CODE.test(line)) return { i, line, type: "team" };
    if (SCORE_LINE.test(line) || STAT_LINE.test(line)) return { i, line, type: "stat" };
    if (JUNK_LINE.test(line)) return { i, line, type: "junk" };
    const nums = numbersIn(line);
    if (nums.length && line.replace(/[\d.\s]/g, "").length === 0) return { i, line, type: "number", value: nums[0] };
    return { i, line, type: "other" };
  });

  const nameRows = classified.filter(c => c.type === "name");
  if (nameRows.length === 0) {
    // No names resolved — fall back to raw line-by-line (plain typed list)
    return null;
  }

  // Pass 2: for each name, gather the metadata window (lines until the next name)
  // and extract the best pick number.
  const reconstructed = [];
  for (let n = 0; n < nameRows.length; n++) {
    const start = nameRows[n].i;
    const end = n + 1 < nameRows.length ? nameRows[n + 1].i : classified.length;
    const windowLines = classified.slice(
      classified.findIndex(c => c.i === start) + 1,
      classified.findIndex(c => c.i === end)
    );
    const player = nameRows[n].player;
    const knownADP = player.adp;

    // Share cards carry projections, not picks or ADP — any number a split
    // Live Text line leaves behind is noise. Name only, nothing to extract.
    if (shareMode) {
      reconstructed.push({ name: player.name || nameRows[n].line, player, pick: null, parsedAdp: null });
      continue;
    }

    // === CONSERVATIVE, LABEL-AWARE PICK EXTRACTION ===
    // Underdog dump structure per player: Name, Team, Bye#, "Bye", ADP#, "ADP", Pick#, "Pick"
    // We look for an integer that is explicitly the PICK, using labels + the ADP cross-check.
    // If we can't be confident, we leave pick = null (better than a wrong guess).
    let pick = null;
    const adp = knownADP;

    // CASE A: plain typed list — name line ends with a clean trailing integer
    // ("Bijan Robinson 2"). The whole line is just name + number, no other tokens.
    const nameLine = nameRows[n].line;
    const trailing = nameLine.match(/^(.+?)\s+(\d{1,3})\s*$/);
    const windowHasContent = windowLines.some(w => w.type !== "blank");
    if (trailing && !windowHasContent) {
      const numPart = parseInt(trailing[2]);
      // Only treat as pick if the name part (without the number) still resolves
      if (numPart >= 1 && numPart <= 300) {
        pick = numPart;
        reconstructed.push({ name: player.name || nameLine, player, pick });
        continue;
      }
    }

    // Collect all numeric tokens (value + whether the line carried a label word)
    const tokens = [];
    const pushLine = (lineText) => {
      const lower = lineText.toLowerCase();
      const nums = numbersIn(lineText);
      const hasPick = /\bpick\b/.test(lower);
      const hasAdp = /\badp\b/.test(lower);
      const hasBye = /\bbye\b/.test(lower);
      if (nums.length > 0) {
        nums.forEach(v => tokens.push({
          v,
          isInt: Number.isInteger(v),
          lineHasPick: hasPick,
          lineHasAdp: hasAdp,
          lineHasBye: hasBye,
        }));
      } else if (tokens.length > 0) {
        // Bare label line (e.g. just "Pick" or "ADP" on its own line) — mark the
        // previously-emitted token as being followed by that label. The Underdog
        // dump puts label words BELOW their values, so this is the only way to
        // tell which integer is the pick vs ADP when both are near each other.
        const last = tokens[tokens.length - 1];
        if (hasPick) last.followedByPick = true;
        if (hasAdp) last.followedByAdp = true;
        if (hasBye) last.followedByBye = true;
      }
    };
    pushLine(nameRows[n].line);
    windowLines.forEach(w => { if (w.type !== "stat" && w.type !== "score") pushLine(w.line); });

    if (tokens.length > 0) {
      // === LABEL-FIRST: trust an explicit "Pick" label (same-line OR trailing on next line).
      // The Underdog dump puts labels on separate lines AFTER their values, so we check
      // both `lineHasPick` (same line) and `followedByPick` (next line is bare "Pick").
      // Labels beat fuzzy ADP cross-check — catches Goff (ADP 104.4, pick 105) collisions.
      const explicitPick = tokens.find(t =>
        t.isInt && (t.lineHasPick || t.followedByPick) &&
        !(t.lineHasAdp || t.followedByAdp) &&
        !(t.lineHasBye || t.followedByBye) &&
        t.v >= 1 && t.v <= 300
      );
      if (explicitPick) {
        pick = explicitPick.v;
      } else {
        // Identify the ADP token: a decimal, or the integer closest to known ADP, or one labeled ADP.
        let adpToken = null;
        if (adp != null) {
          // closest token to known ADP within tolerance
          let best = null, bestDiff = Infinity;
          tokens.forEach(t => {
            const d = Math.abs(t.v - adp);
            if (d < bestDiff) { bestDiff = d; best = t; }
          });
          if (best && bestDiff <= 1.5) adpToken = best;
        }
        if (!adpToken) adpToken = tokens.find(t => t.lineHasAdp) || tokens.find(t => !t.isInt);

        // Identify bye token: explicitly labeled, or a standalone small int (<=18) when ADP is much larger
        const byeToken = tokens.find(t => t.lineHasBye && t.isInt) ||
          tokens.find(t => t !== adpToken && t.isInt && t.v <= 18 && (adp == null || adp > 18));

        // Pick candidates = integer tokens that are neither ADP nor bye, in 1-300 range
        const pickCands = tokens.filter(t =>
          t !== adpToken && t !== byeToken && t.isInt && t.v >= 1 && t.v <= 300
        );
        // Prefer one explicitly labeled "Pick"; else the single remaining candidate
        const labeled = pickCands.find(t => t.lineHasPick);
        if (labeled) {
          pick = labeled.v;
        } else {
          const uniq = [...new Set(pickCands.map(t => t.v))];
          if (uniq.length === 1) pick = uniq[0];
          else if (uniq.length > 1) {
            // Multiple leftover ints: pick the one CLOSEST to ADP.
            // A real pick number is always near the player's market price.
            // "Furthest from ADP" was wrong — it grabbed bleed-in numbers from adjacent players.
            uniq.sort((a, b) => Math.abs(a - (adp || 150)) - Math.abs(b - (adp || 150)));
            pick = uniq[0];
          }
        }
      }
    }

    // === CAPTURE THE PLATFORM'S OWN ADP ===
    // The paste already carries it. Underdog, Sleeper and Yahoo all print ADP
    // next to the pick, and the block above already had to identify that token
    // to tell it apart from the pick — it just threw it away afterwards.
    //
    // This matters because the built-in ADP_DATA is a dated snapshot and drafts
    // happen later. Measured against a real Jul 26 roster: mean drift 5.1 picks,
    // max 22.7. Flournoy read as a 26-pick REACH off the stale table when the
    // platform had him going 3 picks EARLIER than his actual ADP. The delta
    // formula was never wrong; the ADP fed into it was.
    //
    // The user's own platform is ground truth for the user's own draft.
    let parsedAdp = null;
    const labelledAdp = tokens.find(t =>
      (t.lineHasAdp || t.followedByAdp) &&
      !(t.lineHasPick || t.followedByPick) &&
      !(t.lineHasBye || t.followedByBye)
    );
    if (labelledAdp && labelledAdp.v > 0 && labelledAdp.v <= 300) {
      // Explicitly labelled ADP — trust it outright, including large moves.
      parsedAdp = labelledAdp.v;
    } else {
      // Unlabelled: a decimal is an ADP in every export format seen so far
      // (picks and byes are whole numbers). Guard it against the table anyway —
      // if the parser grabbed the wrong number, a stale ADP beats a wrong one.
      const dec = tokens.find(t => !t.isInt && t.v > 0 && t.v <= 300 && t.v !== pick);
      if (dec && (player?.adp == null || Math.abs(dec.v - player.adp) <= 75)) parsedAdp = dec.v;
    }

    reconstructed.push({ name: player.name || nameRows[n].line, player, pick, parsedAdp });
  }

  // === ADP PLAUSIBILITY GUARD ===
  // A pick number differing from ADP by more than 80 is almost certainly a parser
  // artifact. Real drafts don't see 80+ pick deviations from ADP regularly.
  // Tighter now that pick selection uses closest-to-ADP logic above.
  // Both guards below compare picks against ADP. Use the PARSED ADP when the
  // roster supplied one — validating a real pick against a stale table number
  // is how a correct pick gets thrown away.
  const refAdp = (r) => (r.parsedAdp != null ? r.parsedAdp : r.player?.adp);
  reconstructed.forEach(r => {
    const a = refAdp(r);
    if (r.pick != null && a != null) {
      const diff = Math.abs(r.pick - a);
      if (diff > 80) r.pick = null;
    }
  });

  // === PICK CONFIDENCE SCORING ===
  // Even after per-player plausibility checks, validate the detected picks
  // make collective sense before trusting the set as a whole.
  // If confidence is low, null all picks — bad deltas are worse than no deltas.
  const detectedPicks = reconstructed.filter(r => r.pick != null);
  if (detectedPicks.length >= 3) {
    // Check 1: picks should span a reasonable range
    // (not all clustered — if parser grabbed same number repeatedly it's noise)
    const pickVals = detectedPicks.map(r => r.pick);
    const pickRange = Math.max(...pickVals) - Math.min(...pickVals);
    const rangeConfidence = pickRange >= detectedPicks.length * 4;

    // Check 2: median ADP delta should be reasonable (<45 picks on average)
    // Catches systemic parser failures where wrong numbers are grabbed throughout
    const medianDiff = detectedPicks
      .map(r => Math.abs(r.pick - (refAdp(r) || r.pick)))
      .sort((a, b) => a - b)[Math.floor(detectedPicks.length / 2)];
    const deltaConfidence = medianDiff < 45;

    // Fail if BOTH checks fail — null out all picks silently
    // Intentionally lenient: one bad check is not enough to discard everything
    if (!rangeConfidence && !deltaConfidence) {
      reconstructed.forEach(r => { r.pick = null; });
    }
  }

  // === SURFACE THE SILENT DROPS (added Jul 27 2026) ===
  // Everything above keeps only lines that RESOLVED to a player. A line that
  // looks exactly like a name but resolves to nothing was being discarded with
  // no trace, and because the match counter reads valid/picks — both counted
  // AFTER this point — a dropped player still showed "17/17 matched". The miss
  // was invisible at every level of the UI.
  //
  // The legacy parser already had the right instinct: it pushes unresolved
  // lines as notFound so a human sees them. Do the same here. A false positive
  // costs one dismissable row; a false negative costs a player out of the grade.
  const looksLikeName = (s) =>
    /^[A-Z][a-zA-Z'.-]+(\s+[A-Z][a-zA-Z'.-]+)+$/.test(s.trim()) && s.trim().length <= 30;
  reconstructed.unresolved = classified
    .filter(c => c.type === "other" && looksLikeName(c.line))
    .map(c => c.line);

  return reconstructed;
};

const parseRoster = (text, format = "standard") => {
  // Try the universal preprocessor first (handles app dumps + horizontal formats)
  const pre = preprocessRoster(text, format);
  if (pre && pre.length > 0) {
    let detectedPickNumbers = false;
    const picks = pre.map((r, idx) => {
      if (r.pick != null) detectedPickNumbers = true;
      // Override adp AT THE SOURCE rather than only in the delta calc, so every
      // downstream consumer — reach/value flags, pivot candidates, value tiers,
      // the AI prompt — sees the same number the user saw on their own draft
      // board. tableAdp is kept so the UI can show the drift.
      const useParsed = r.parsedAdp != null;
      return {
        ...r.player,
        name: r.player.name,
        adp: useParsed ? r.parsedAdp : r.player.adp,
        tableAdp: r.player.adp,
        adpSource: useParsed ? "roster" : "table",
        pickNum: idx + 1,
        actualPick: r.pick != null ? r.pick : null,  // null = unknown, never fabricate from index
        raw: r.name,
      };
    });
    // Name-shaped lines the preprocessor could not resolve ride along as
    // notFound so they appear in the UI instead of vanishing. They carry no
    // player data, so they never reach the grade — they only make the miss
    // visible and keep the match counter honest.
    (pre.unresolved || []).forEach((line, i) => {
      picks.push({ name: line, raw: line, notFound: true, pickNum: picks.length + 1, actualPick: null });
    });
    picks.hasPickNumbers = detectedPickNumbers;
    return picks;
  }
  // Fallback: original line-by-line parser (plain typed lists)
  return parseRosterLegacy(text, format);
};

const parseRosterLegacy = (text, format = "standard") => {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const picks = [];
  let detectedPickNumbers = false;

  lines.forEach((line, idx) => {
    let actualPick = null;
    let cleaned = line;

    // Strategy 1: trailing number that's clearly a pick
    const trailingMatch = cleaned.match(/^(.+?)\s+(\d{1,3})\s*$/);
    if (trailingMatch) {
      const namePart = trailingMatch[1].trim();
      const numPart = parseInt(trailingMatch[2]);
      if (numPart >= 1 && numPart <= 240 && namePart.split(/\s+/).length >= 2) {
        actualPick = numPart;
        cleaned = namePart;
      }
    }

    // Strategy 2: leading number followed by separator
    if (!actualPick) {
      const leadingMatch = cleaned.match(/^(?:pick\s+)?(\d{1,3})[\.\)\s:-]+(.+)/i);
      if (leadingMatch) {
        const num = parseInt(leadingMatch[1]);
        const remainder = leadingMatch[2].trim();
        if (num >= 1 && num <= 240 && remainder.split(/\s+/).length >= 2) {
          actualPick = num;
          cleaned = remainder;
        }
      }
    }

    // Strategy 3: round.pick format
    cleaned = cleaned.replace(/^\d+\.\d+\s*[-–:]?\s*/, "")
                     .replace(/^[-•*]\s*/, "")
                     .replace(/\s+\(.*?\)$/, "")
                     .replace(/\s+-\s*[A-Z]{2,3}\s*$/, "")
                     .trim();

    if (actualPick) detectedPickNumbers = true;

    const player = findPlayer(cleaned, format);
    if (player) {
      picks.push({ ...player, pickNum: idx + 1, actualPick: actualPick || idx + 1, raw: line });
    } else {
      picks.push({ name: cleaned, raw: line, notFound: true, pickNum: idx + 1, actualPick: actualPick || idx + 1 });
    }
  });

  picks.hasPickNumbers = detectedPickNumbers;
  return picks;
};

const getMatchupTier = (opponentTeam, pos, useProjected = false) => {
  const opp = opponentTeam.replace("@", "");
  let pts = FPA[pos]?.[opp];
  if (pts == null) return { tier: "—", score: 0, opp };
  // Adjustment sign convention (both tables): positive = defense got WORSE
  // (allows more, softer matchup), negative = improved (tougher). FPA is
  // points allowed, so adjustments ADD. `pts -= adj` here was a sign-inversion
  // bug (fixed Jul 16 2026) that made improved defenses look softer and
  // gutted defenses look tougher — contradicting the tables' own notes.
  const adj = COACHING_ADJ[opp];
  if (adj) pts += adj.all;
  // apply 2026 offseason layer (only in projected mode)
  if (useProjected) {
    const offAdj = OFFSEASON_ADJ_2026[opp];
    if (offAdj) {
      const delta = offAdj[pos.toLowerCase()];
      if (delta != null) pts += delta;
    }
  }

  // Rank-based tiering using position-specific distribution.
  // If adjustments push pts below the league minimum, findIndex returns -1
  // (rank 0), which previously fell through to "Smash" — the exact opposite
  // of a tougher-than-everyone defense. Clamp to worst rank instead.
  const allPts = Object.values(FPA[pos]).sort((a, b) => b - a);
  const rankIdx = allPts.findIndex(v => v <= pts);
  const rank = rankIdx === -1 ? allPts.length + 1 : rankIdx + 1;

  let tier, color, score;
  if (rank <= 8) { tier = "Smash"; color = "elite"; score = 5; }
  else if (rank <= 14) { tier = "Good"; color = "solid"; score = 4; }
  else if (rank <= 20) { tier = "Even"; color = "neutral"; score = 3; }
  else if (rank <= 26) { tier = "Hard"; color = "tough"; score = 2; }
  else { tier = "Avoid"; color = "wall"; score = 1; }

  return { tier, color, score, opp, pts: pts.toFixed(1), rank };
};

// Score -> {tier, color}, the SINGLE source of truth for that mapping.
//
// Added Aug 14 2026 because the two boost branches in the stack loop had
// drifted: the competitive-balance boost updated tier alongside score, and the
// high-pace boost updated score ONLY. A stack could therefore display
// "Even/Even/Even" for a week whose avgPerWeek was 4.00, which made every week
// string in the UI a potential lie about the number driving the grade.
// Both branches now route through here so they cannot diverge again.
// Thresholds mirror getMatchupTier's rank bands exactly — change both or neither.
const tierFromScore = (score) => {
  if (score >= 5) return { tier: "Smash", color: "elite" };
  if (score >= 4) return { tier: "Good", color: "solid" };
  if (score >= 3) return { tier: "Even", color: "neutral" };
  if (score >= 2) return { tier: "Hard", color: "tough" };
  return { tier: "Avoid", color: "wall" };
};

// ============ TRUNCATION-TOLERANT JSON PARSE ============
// The grading response is one JSON object whose fields arrive in a fixed order,
// `nutshell` first. When the model hits max_tokens the tail is cut off mid
// string, so a STRICT JSON.parse throws and discards the whole payload —
// including a complete, perfectly good nutshell sitting at the top of it.
//
// That is what produced "sometimes the full summary, sometimes the basic one"
// (diagnosed Jul 27 2026 against the live site: HTTP 200, stop_reason
// "max_tokens", output_tokens exactly at the cap, JSON cut mid-sentence inside
// bringBackNotes). It was never a network failure and never random — it tracked
// roster complexity, because an 18-player roster generates far more
// standoutDetails and bringBackNotes than a small one.
//
// The cap has been raised, but a model can always run long, so parsing is now
// tolerant by design: walk the text tracking string state and nesting depth,
// remember the last offset where a TOP-LEVEL pair had just finished, cut there
// and close the object. Whatever completed is kept; only the severed tail is
// lost. If truncation hits inside the first field there is nothing to salvage
// and this returns null, which correctly surfaces as a failure.
const parseLooseJson = (text) => {
  try { return JSON.parse(text); } catch { /* fall through to repair */ }
  let depth = 0, inStr = false, esc = false, lastGood = -1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") { depth--; if (depth === 1) lastGood = i; }
    else if (c === "," && depth === 1) lastGood = i - 1;
  }
  if (lastGood < 0) return null;
  try { return JSON.parse(text.slice(0, lastGood + 1) + "}"); } catch { return null; }
};

// ============ NUTSHELL SUMMARY BUILDER ============
// Converts the raw strengths/weaknesses arrays + grade into a 2-sentence
// plain-English summary. Beginner-friendly, no jargon, anchored at the top
// of every results page so users get the headline truth before the data.
const buildNutshell = ({ strengths, weaknesses, grade, score, mode, adpFlags = [], primaryStacks = [], eliteStacks = [], verdictAlignments = [] }) => {
  // === Translation layer: strip jargon, return short plain-English phrases ===
  // Returns null if the input string isn't important enough to surface.
  const translate = (s) => {
    const l = s.toLowerCase();
    // Best Ball strengths
    if (l.includes("primary qb stack") || l.includes("primary stacks built")) return "QB game-stacks built";
    if (l.includes("elite stack")) return "an elite-matchup stack";
    if (l.includes("w16 kill-shot") || l.includes("w16")) return "W16 kill-shot ceiling";
    if (l.includes("w15 spike") || (l.includes("w15") && l.includes("stack"))) return "a W15 spike stack";
    if (l.includes("roster construction") && l.includes("matches")) return "clean construction";
    if (l.includes("roster construction") && l.includes("fits superflex")) return "clean Superflex build";
    if (l.includes("game stack(s) with bring-back")) return "bring-back game stacks";
    if (l.includes("orphan(s) with strong playoff")) return "solo picks with strong matchups";
    if (l.includes("players in strong situations")) return "strong situation picks";
    if (l.includes("sharp/leverage stack")) return "field-leverage stacks";
    if (l.includes("adp value pick")) return "real ADP value grabs";
    if (l.includes("hidden gem")) return "underpriced elite-matchup picks";
    if (l.includes("depth/backup roles")) return "depth/backup players on roster — ceiling capped";
    // Redraft strengths
    if (l.includes("elite starting lineup")) return "an elite starting lineup";
    if (l.includes("strong starting lineup")) return "a strong starting lineup";
    if (l.includes("rbs — strong injury insurance") || l.includes("strong injury insurance")) return "deep RB injury insurance";
    if (l.includes("wrs — strong depth")) return "deep WR room";
    if (l.includes("rb1(s) handcuffed")) return "your RB1s handcuffed";
    if (l.includes("starters with elite playoff schedule") || l.includes("with elite playoff")) return "elite playoff schedules";
    if (l.includes("qbs — covers") && l.includes("sf slots")) return "full SF QB coverage";

    // Best Ball weaknesses
    if (l.includes("primary stacks face difficult")) return "stacks face brutal matchups";
    if (l.includes("light at") || l.includes("heavy at")) {
      const pos = l.match(/\b(qb|rb|wr|te)\b/i)?.[0]?.toUpperCase();
      return l.includes("light at") ? `thin at ${pos}` : `over-invested at ${pos}`;
    }
    if (l.includes("only") && l.includes("qb") && l.includes("sf requires")) return "not enough QBs for SF";
    if (l.includes("significant reaches")) return "multiple ADP reaches";
    if (l.includes("orphans with no matchup or value edge")) return "wasted solo picks";
    // (fade verdict suppression removed — fade strings no longer appear in output)

    // Redraft weaknesses
    if (l.includes("weak starting lineup")) return "a weak starting lineup";
    if (l.includes("thin (need") && l.includes("rb")) return "thin RB depth";
    if (l.includes("thin (need") && l.includes("wr")) return "thin WR depth";
    if (l.includes("shallow rb bench")) return "a shallow RB bench";
    if (l.includes("shallow wr bench")) return "a shallow WR bench";
    if (l.includes("on bye w") || l.includes("all") && l.includes("starting")) {
      const m = s.match(/bye\s*w?(\d+)/i);
      return m ? `a bye-week collision in W${m[1]}` : "a bye-week collision";
    }
    if (l.includes("multiple bye week stacks")) return "multiple bye-week conflicts";
    if (l.includes("no rb1 handcuffs")) return "thin RB insurance";
    if (l.includes("can't fill lineup") || l.includes("for") && l.includes("sf slots")) return "not enough QBs to fill SF";
    if (l.includes("no bye/injury coverage")) return "zero QB bye coverage";
    if (l.includes("brutal playoff schedule") || l.includes("with brutal playoff")) return "starters with brutal playoff slates";
    if (l.includes("top-tier regular season schedules")) return "starters facing tough regular-season slates";
    if (l.includes("streaming") || l.includes("waste")) return "wasted bench slots";

    return null; // unknown → skip
  };

  // === Pick top strengths/weaknesses for the sentence (max 2 each) ===
  const sx = strengths.map(translate).filter(Boolean).slice(0, 2);
  const wx = weaknesses.map(translate).filter(Boolean).slice(0, 2);

  // === Compose ===
  // Dedupe a shared leading prefix when joining (so we don't say
  // "thin at RB and thin at TE" — we say "thin at RB and TE").
  const joinList = (arr) => {
    if (arr.length === 0) return null;
    if (arr.length === 1) return arr[0];
    const a = arr[0], b = arr[1];
    // Find longest shared word-prefix
    const aw = a.split(" "), bw = b.split(" ");
    let shared = 0;
    while (shared < aw.length && shared < bw.length && aw[shared] === bw[shared]) shared++;
    if (shared >= 2) {
      const prefix = aw.slice(0, shared).join(" ");
      const aTail = aw.slice(shared).join(" ");
      const bTail = bw.slice(shared).join(" ");
      return `${prefix} ${aTail} and ${bTail}`;
    }
    return `${a} and ${b}`;
  };

  const sPart = joinList(sx);
  const wPart = joinList(wx);

  let firstSentence;
  if (sPart && wPart) {
    firstSentence = `${sPart.charAt(0).toUpperCase() + sPart.slice(1)}, but ${wPart}.`;
  } else if (sPart) {
    firstSentence = `${sPart.charAt(0).toUpperCase() + sPart.slice(1)} — no major holes flagged.`;
  } else if (wPart) {
    firstSentence = `No standout strengths detected; biggest issues are ${wPart}.`;
  } else {
    firstSentence = "Roster reads as average across the board — no major edges, no critical holes.";
  }

  // === Dynamic verdict tail — signal-keyed selection ===
  // Priority order: confirmed ADP steal → elite stack anchor (grade A only) →
  // fade+reach weak link (grade C/D only) → grade + score band fallback.
  // Player callouts fire only on high-confidence, unambiguous signals.
  // One callout max per nutshell. When in doubt, fall through to grade-band default.

  // Signal 1: confirmed ADP steal — picked 15+ after ADP (big positive delta = value)
  const stealThreshold = 15;
  const confirmedSteals = (adpFlags || []).filter(p => p.delta >= stealThreshold);
  const stealPlayer = confirmedSteals.length >= 1
    ? confirmedSteals.sort((a, b) => b.delta - a.delta)[0]
    : null;

  // Signal 2: elite stack anchor — QB in an elite-window stack (normalizedScore >= 12)
  const eliteStackQBs = (eliteStacks || [])
    .map(s => s.players?.find(p => p.pos === "QB"))
    .filter(Boolean);
  const anchorQB = eliteStackQBs.length >= 1 ? eliteStackQBs[0] : null;

  // Signal 3: confirmed fade player who was also a significant reach (delta <= -20)
  // Both conditions must be true — one alone is not enough to name someone publicly
  const reachThreshold = 20;
  const fadeReaches = (adpFlags || []).filter(p => {
    if (p.delta > -reachThreshold) return false;
    const fadedPlayer = (verdictAlignments || []).find(
      v => v.name === p.name && !v.stale && (v.verdict === "fade" || v.verdict === "HARD FADE")
    );
    return !!fadedPlayer;
  });
  const weakLinkPlayer = fadeReaches.length >= 1
    ? fadeReaches.sort((a, b) => a.delta - b.delta)[0]
    : null;

  // Score bands within each grade for two-tier defaults
  const scoreBandHigh = score >= 4.0;   // upper half of A/A- range
  const scoreBandMid  = score >= 2.5;   // upper half of B+/B range
  const scoreBandMod  = score >= 1.8;   // upper half of B range

  let verdict;

  // --- Callout variants (high-confidence signals only, B+ and above) ---
  if (stealPlayer?.name && (grade === "A" || grade === "A-" || grade === "B+")) {
    const last = stealPlayer.name.split(" ").slice(-1)[0];
    verdict = mode === "bestball"
      ? `${last} is a confirmed ADP steal — that delta alone separates this roster.`
      : `${last} is a clear ADP value — that pick elevates the whole floor.`;

  } else if (anchorQB?.name && grade.startsWith("A")) {
    const last = anchorQB.name.split(" ").slice(-1)[0];
    verdict = mode === "bestball"
      ? `The ${anchorQB.team} stack anchored by ${last} is the ceiling driver — everything else is support.`
      : `${last} is the stack anchor — this roster builds around that ceiling.`;

  } else if (weakLinkPlayer?.name && (grade === "C" || grade === "C+" || grade === "D")) {
    const last = weakLinkPlayer.name.split(" ").slice(-1)[0];
    verdict = mode === "bestball"
      ? `${last} is a drag — a reach at a price that caps the ceiling.`
      : `${last} is the weak link — a reach on a contested role that costs lineup flexibility.`;

  // --- Grade + score-band defaults ---
  } else if (grade === "A") {
    verdict = scoreBandHigh
      ? (mode === "bestball"
          ? "This is a title-contender build — stacks, construction, and window all aligned."
          : "Elite from top to bottom — every slot is a real starter.")
      : (mode === "bestball"
          ? "League-winning ceiling is there — just needs the stacks to fire in the right weeks."
          : "Title-contender build — one or two injuries from a dominant run.");

  } else if (grade === "A-") {
    verdict = scoreBandHigh
      ? (mode === "bestball"
          ? "Strong ceiling build — one elite week from winning the whole thing."
          : "Near-elite roster — this competes for the title if the schedule breaks right.")
      : (mode === "bestball"
          ? "Upside is real, but needs a spike week to separate from the field."
          : "Strong starter — a few waiver moves away from a title run.");

  } else if (grade === "B+") {
    verdict = scoreBandMid
      ? (mode === "bestball"
          ? "Above-average ceiling with a clear identity — one stack hitting makes this dangerous."
          : "Strong roster with real depth — fixable issues at the margin.")
      : (mode === "bestball"
          ? "Solid build with upside, but the kill-shot piece isn't obvious yet."
          : "Competitive lineup — needs sharper bench management to reach its ceiling.");

  } else if (grade === "B") {
    verdict = scoreBandMod
      ? (mode === "bestball"
          ? "Good foundation — this wins when two or three pieces break out in the same week."
          : "Solid lineup with real contributors — depth is the limiting factor.")
      : (mode === "bestball"
          ? "Playable build — missing the explosive ceiling piece that separates from the field."
          : "Functional roster, but needs active bench moves to stay competitive.");

  } else if (grade === "C+") {
    verdict = mode === "bestball"
      ? "Middle of the pack — needs a pivot or a breakout to become a contender."
      : "Workable lineup, but roster-fragile — one injury changes the season.";

  } else if (grade === "C") {
    verdict = mode === "bestball"
      ? "Thin build — ceiling depends on outlier weeks that may never come."
      : "Holes in the lineup — active waiver play required all season.";

  } else {
    verdict = mode === "bestball"
      ? "Construction issues are dragging down the ceiling — needs a rebuild from Round 1."
      : "Significant gaps — this roster needs trades and aggressive waiver activity to compete.";
  }

  return `${firstSentence} Overall: ${verdict.charAt(0).toLowerCase() + verdict.slice(1)}`;
};

const analyzeRoster = (picks, tournamentKey = "main", hasPickNumbers = false, useProjected = false) => {
  const tournament = TOURNAMENTS[tournamentKey];
  const weights = tournament.weights;
  const format = tournament.format || "standard";
  const valid = picks.filter(p => !p.notFound);

  // Position counts
  const posCounts = { QB: 0, RB: 0, WR: 0, TE: 0 };
  valid.forEach(p => { posCounts[p.pos] = (posCounts[p.pos] || 0) + 1; });

  // Stacks by team
  const teamGroups = {};
  valid.forEach(p => {
    if (!teamGroups[p.team]) teamGroups[p.team] = [];
    teamGroups[p.team].push(p);
  });

  const stacks = [];
  Object.entries(teamGroups).forEach(([team, players]) => {
    const hasQB = players.some(p => p.pos === "QB");
    const passCatchers = players.filter(p => p.pos === "WR" || p.pos === "TE");
    if (hasQB && passCatchers.length >= 1) {
      stacks.push({ team, players, type: "Primary", hasQB: true });
    } else if (passCatchers.length >= 2) {
      stacks.push({ team, players, type: "Naked", hasQB: false });
    } else if (players.length >= 2 && (passCatchers.length >= 1 || hasQB)) {
      stacks.push({ team, players, type: "Partial", hasQB });
    }
  });

  // === NAKED RB INSULATION CHECK ===
  // A "naked" RB has no QB from their team on the roster — no stacking loop.
  // Insulation = SITUATIONS flags signaling real standalone volume (target_vacuum / scheme_fit / breakout_profile / committee_breaker)
  const nakedRBs = valid.filter(p => {
    if (p.pos !== "RB") return false;
    const teamHasQB = (teamGroups[p.team] || []).some(t => t.pos === "QB");
    return !teamHasQB;
  });

  const uninsulatedNakedRBs = nakedRBs.filter(rb => {
    const sit = SITUATIONS[normalize(rb.name)];
    const flags = sit?.situationFlags || [];
    const riskFlags = sit?.riskFlags || [];
    const hasInsulation = flags.includes("scheme_fit") || flags.includes("target_vacuum")
      || flags.includes("breakout_profile") || flags.includes("committee_breaker");
    if (hasInsulation) return false;
    // Default insulation: a top-36 ADP RB (clear starter-tier draft capital) with no SITUATIONS
    // entry and no committee risk flag is presumed to have a locked role. Without this, any
    // bell-cow RB that simply hasn't been manually added to SITUATIONS gets a false "no signal"
    // flag (e.g. Jonathan Taylor, Kyren Williams before their entries existed).
    const hasCommitteeRisk = riskFlags.includes("creeping_committee") || riskFlags.includes("confirmed_committee");
    if (rb.adp <= 36 && !hasCommitteeRisk) return false;
    // Data-driven Gate 1 (HVT): 2025 red-zone targets + inside-10 carries per game.
    // 1.5+ on this scale ≈ a real goal-line/receiving role (2025 leaders: Henry 2.47,
    // Gibbs 2.18) — covers the ~400 players SITUATIONS curation doesn't reach.
    const pm = getMetrics(rb.name);
    if (pm && pm.hvt_pg >= 1.5 && !hasCommitteeRisk) return false;
    return true;
  });

  // Detect roster size — 20-player rosters (e.g. Big Board) get scaled benchmarks
  const rosterSize = valid.length;
  const is20Round = rosterSize >= 19; // 19+ matched = 20-round draft

  // ADP deltas — calibrated thresholds per format
  // Underdog standard: large sample, tight distribution → flag at ±15
  // 4for4 SF: smaller sample, wider distribution → flag at ±25 (and value cap at +35)
  const reachThreshold = format === "superflex" ? 25 : 15;
  const valueThreshold = format === "superflex" ? 25 : 15;
  const detectThreshold = format === "superflex" ? 15 : 8;

  let adpFlags = [];
  if (hasPickNumbers) {
    // Players drafted at ADP 200+ are pure dart throws — their exact pick number
    // relative to a market ADP carries no signal. Exclude from reach/value delta logic.
    adpFlags = valid.filter(p => p.actualPick != null && (p.adp == null || p.adp < 200)).map(p => ({
      ...p,
      delta: p.actualPick - p.adp,
    })).filter(p => Math.abs(p.delta) >= detectThreshold);
  }

  // Format-specific construction benchmarks
  // Standard: BBM 18-round (6-7 WR, 5-6 RB, 2-3 TE, 2-3 QB)
  // Widened max slightly — 8 WR or 7 RB is not a flaw in an 18-round draft,
  // just a different allocation. Flag only clear over/under, not borderline counts.
  // Superflex 20-round: needs more QBs, can spread RB/WR wider
  const benchmarks = format === "superflex"
    ? {
        QB: { min: 3, max: 6, msg: `${posCounts.QB} QB (SF target 3-6)` },
        RB: { min: 4, max: 9, msg: `${posCounts.RB} RB (SF target 4-9)` },
        WR: { min: 5, max: 11, msg: `${posCounts.WR} WR (SF target 5-11)` },
        TE: { min: 1, max: 3, msg: `${posCounts.TE} TE (SF target 1-3)` },
      }
    : {
        WR: { min: 5, max: is20Round ? 10 : 8, msg: `${posCounts.WR} WR (target 5-${is20Round ? 10 : 8})` },
        RB: { min: 4, max: is20Round ? 9 : 7, msg: `${posCounts.RB} RB (target 4-${is20Round ? 9 : 7})` },
        TE: { min: 1, max: is20Round ? 4 : 3, msg: `${posCounts.TE} TE (target 1-${is20Round ? 4 : 3})` },
        QB: { min: 2, max: is20Round ? 4 : 3, msg: `${posCounts.QB} QB (target 2-${is20Round ? 4 : 3})` },
      };
  const benchmarkIssues = [];
  Object.entries(benchmarks).forEach(([pos, b]) => {
    if (posCounts[pos] < b.min) benchmarkIssues.push({ type: "under", pos, msg: b.msg, severity: "major" });
    else if (posCounts[pos] > b.max) {
      // Minor severity if only 1 over, major if 2+
      const overBy = posCounts[pos] - b.max;
      benchmarkIssues.push({ type: "over", pos, msg: b.msg, severity: overBy >= 2 ? "major" : "minor" });
    }
  });

  // Playoff window grading per stack with TOURNAMENT WEIGHTS
  const stackGrades = stacks.map(stack => {
    const weekScores = [0, 0, 0];
    const weekDetails = [[], [], []];
    stack.players.forEach(player => {
      const opps = PLAYOFFS[stack.team] || [];
      opps.forEach((opp, wkIdx) => {
        let m = getMatchupTier(opp, player.pos, useProjected);
        // Competitive balance boost: pick'em (|spread| ≤ 3) AND high-scoring (total ≥ 46)
        // Parity between two good offenses elevates ceiling — raw FPA undersells this environment
        const wk = [15, 16, 17][wkIdx];
        const oppClean = opp.replace("@", "").trim().toUpperCase();
        const gameData = wk ? (PLAYOFF_GAME_TOTALS[`W${wk}`] || []).find(g => g.away === oppClean || g.home === oppClean) : null;
        if (gameData && Math.abs(gameData.spread) <= 3 && gameData.total >= 46 && m.score <= 2) {
          const boostedScore = Math.min(m.score + 1, 3);
          m = { ...m, ...tierFromScore(boostedScore), score: boostedScore, competitiveBoost: true };
        }
        // High-Pace Target games (Game Selection Matrix) bump the matchup score by 1 —
        // pace/PPP/PROE reasoning overrides a merely-average raw FPA tier. Capped at 5
        // so this can't push a game past the existing elite ceiling.
        const gsNode = wk ? getGameSelectionNode(stack.team, opp, wk) : null;
        if (gsNode?.type === "highPace" && m.score < 5) {
          const pacedScore = Math.min(m.score + 1, 5);
          m = { ...m, ...tierFromScore(pacedScore), score: pacedScore, highPaceBoost: true };
        }
        weekScores[wkIdx] += m.score;
        weekDetails[wkIdx].push({ name: player.name, pos: player.pos, ...m });
      });
    });
    const avgPerWeek = weekScores.map(s => s / stack.players.length);
    const weightedTotal = avgPerWeek.reduce((sum, avg, i) => sum + avg * weights[i], 0);
    const maxWeighted = 5 * weights.reduce((a, b) => a + b, 0);
    const normalizedScore = (weightedTotal / maxWeighted) * 15;
    // Find peak week — important for Puppy W16 / BBM W15 logic
    const peakWeek = avgPerWeek.indexOf(Math.max(...avgPerWeek));
    const peakScore = avgPerWeek[peakWeek];
    return { ...stack, weekScores, avgPerWeek, weekDetails, weightedTotal, normalizedScore, peakWeek, peakScore };
  });

  // === BRING-BACK STACK DETECTION ===
  // For each stack, check if any other roster player is on the OPPONENT in the same playoff week
  const bringBacks = [];
  stackGrades.forEach(stack => {
    const opps = PLAYOFFS[stack.team] || [];
    opps.forEach((oppRaw, wkIdx) => {
      const opp = oppRaw.replace("@", "");
      // Find any roster players on this opponent
      const bringBackPlayers = valid.filter(p => p.team === opp && p.team !== stack.team);
      if (bringBackPlayers.length > 0) {
        const stackMatchupScore = stack.players.reduce((sum, p) => {
          const m = getMatchupTier(oppRaw, p.pos, useProjected);
          return sum + m.score;
        }, 0);
        const bringBackMatchupScore = bringBackPlayers.reduce((sum, p) => {
          const m = getMatchupTier(oppRaw, p.pos, useProjected);
          return sum + m.score;
        }, 0);
        const ceilingScore = stackMatchupScore + bringBackMatchupScore;
        bringBacks.push({
          stackTeam: stack.team,
          opponent: opp,
          week: ["W15", "W16", "W17"][wkIdx],
          weekIdx: wkIdx,
          stackPieces: stack.players,
          bringBackPieces: bringBackPlayers,
          hasQB: stack.hasQB,
          ceilingScore,
        });
      }
    });
  });

  // Sort bring-backs chronologically by playoff week (W15 → W16 → W17)
  bringBacks.sort((a, b) => a.weekIdx - b.weekIdx);

  // === DEDUPLICATE MIRROR PAIRS ===
  // DAL vs NYG generates two entries (one from each stack's perspective).
  // Merge them: one card per unique game per week, showing all pieces from both teams.
  const mergedBringBacks = [];
  const seenGames = new Set();
  bringBacks.forEach(bb => {
    const gameKey = [bb.stackTeam, bb.opponent].sort().join("_") + "_" + bb.week;
    if (seenGames.has(gameKey)) return;
    seenGames.add(gameKey);
    // Find the mirror entry (opponent's perspective)
    const mirror = bringBacks.find(b =>
      b.stackTeam === bb.opponent && b.opponent === bb.stackTeam && b.week === bb.week
    );
    // Combine all pieces from both sides — dedupe by name
    const allPieces = [...bb.stackPieces, ...bb.bringBackPieces];
    if (mirror) {
      mirror.stackPieces.forEach(p => { if (!allPieces.find(x => x.name === p.name)) allPieces.push(p); });
      mirror.bringBackPieces.forEach(p => { if (!allPieces.find(x => x.name === p.name)) allPieces.push(p); });
    }
    const teamA = { team: bb.stackTeam, players: allPieces.filter(p => p.team === bb.stackTeam) };
    const teamB = { team: bb.opponent, players: allPieces.filter(p => p.team === bb.opponent) };
    mergedBringBacks.push({
      ...bb,
      teamA,
      teamB,
      allPieces,
      // Preserve ceiling score as sum of all pieces
      ceilingScore: bb.ceilingScore,
      isMerged: true,
    });
  });

  // Tag the single highest ceiling bring-back — this becomes the 🔥 CEILING GAME badge
  if (mergedBringBacks.length > 0) {
    const topIdx = mergedBringBacks.reduce((best, bb, i) =>
      bb.ceilingScore > mergedBringBacks[best].ceilingScore ? i : best, 0);
    mergedBringBacks[topIdx].isCeilingGame = true;
  }

  // === ORPHAN CLASSIFICATION ===
  // Players NOT in any stack — classify by playoff window quality
  const stackedPlayerNames = new Set();
  stacks.forEach(s => s.players.forEach(p => stackedPlayerNames.add(p.name)));

  const orphans = valid.filter(p => !stackedPlayerNames.has(p.name)).map(p => {
    const opps = PLAYOFFS[p.team] || [];
    const matchups = opps.map((opp, i) => {
      let m = getMatchupTier(opp, p.pos, useProjected);
      const wk = [15, 16, 17][i];
      const oppClean = opp.replace("@", "").trim().toUpperCase();
      const gd = (PLAYOFF_GAME_TOTALS[`W${wk}`] || []).find(g => g.away === oppClean || g.home === oppClean);
      if (gd && Math.abs(gd.spread) <= 3 && gd.total >= 46 && m.score <= 2) {
        const bs = Math.min(m.score + 1, 3);
        m = { ...m, tier: bs >= 3 ? "Even" : "Hard", color: bs >= 3 ? "neutral" : "tough", score: bs, competitiveBoost: true };
      }
      const gsNode = getGameSelectionNode(p.team, opp, wk);
      if (gsNode?.type === "highPace" && m.score < 5) {
        m = { ...m, score: Math.min(m.score + 1, 5), highPaceBoost: true };
      }
      return m;
    });
    const w17 = matchups[2];
    const peakScore = Math.max(...matchups.map(m => m.score));
    const weightedScore = matchups.reduce((sum, m, i) => sum + m.score * weights[i], 0);
    const maxWeighted = 5 * weights.reduce((a, b) => a + b, 0);
    const normalized = (weightedScore / maxWeighted) * 15;

    // Classification — based on count of Good/Elite weeks in W15-17
    // Elite Window:    3 good/elite weeks
    // Strong Matchups: 2 good/elite weeks
    // Soft Spot:       1 good/elite week
    // No Edge:         0 good/elite weeks
    const goodWeekCount = matchups.filter(m => m.score >= 4).length;
    let tier, color;
    if (goodWeekCount >= 3) {
      tier = "Elite Window";
      color = "elite";
    } else if (goodWeekCount === 2) {
      tier = "Strong Matchups";
      color = "solid";
    } else if (goodWeekCount === 1) {
      tier = "Soft Spot";
      color = "neutral";
    } else {
      tier = "No Edge";
      color = "wall";
    }

    return { ...p, matchups, w17, peakScore, normalized, tier, color };
  });

  // === DRAFT PIVOT RECOMMENDATIONS ===
  // For each pick, find ±10 ADP same-position alternatives that weren't taken
  // Only show pivots where the alternative would have meaningfully improved roster (stack fit, playoff window)
  const allPickedNames = new Set(valid.map(p => normalize(p.name)));
  const adpTable = format === "superflex" ? ADP_SUPERFLEX : ADP_DATA;

  const pivots = [];
  valid.forEach(player => {
    const pickNum = player.actualPick || Math.round(player.adp || 0) || null;
    if (!pickNum) return;
    const pickADP = player.adp;

    // Find same-position alternatives within ±10 ADP that weren't drafted
    const alternatives = [];
    Object.entries(adpTable).forEach(([key, alt]) => {
      if (alt.pos !== player.pos) return;
      if (allPickedNames.has(key)) return;
      if (Math.abs(alt.adp - pickADP) > 10) return;
      // Avoid alias dupes — only consider primary keys (longer than 8 chars, has space)
      if (!key.includes(" ") || key.length < 5) return;

      // Filter out HARD FADEs and known role-concern players from recommendations
      // A player flagged as a fade should never show up as a suggested upgrade
      const altVerdict = VERDICTS[key] || VERDICTS[normalize(key)];
      if (altVerdict && (altVerdict.verdict === "HARD FADE" || altVerdict.verdict === "fade")) return;

      // Score the alternative
      const altOpps = PLAYOFFS[alt.team] || [];
      const altMatchups = altOpps.map((opp, i) => getMatchupTier(opp, alt.pos, useProjected));
      const altWeighted = altMatchups.reduce((sum, m, i) => sum + m.score * weights[i], 0);
      const maxW = 5 * weights.reduce((a, b) => a + b, 0);
      const altScore = (altWeighted / maxW) * 15;

      // Would they have helped a stack? Check if any existing stack team matches their team
      const stackFit = stacks.some(s => s.team === alt.team);

      // Player's own score for comparison
      const playerOpps = PLAYOFFS[player.team] || [];
      const playerMatchups = playerOpps.map((opp, i) => getMatchupTier(opp, player.pos, useProjected));
      const playerWeighted = playerMatchups.reduce((sum, m, i) => sum + m.score * weights[i], 0);
      const playerScore = (playerWeighted / maxW) * 15;

      // Would swapping this player destroy an existing bring-back? Flag it and penalize.
      const brokenBringBacks = bringBacks.filter(bb => {
        const inStack = bb.stackPieces.some(p => p.name === player.name);
        const inBringBack = bb.bringBackPieces.some(p => p.name === player.name);
        if (!inStack && !inBringBack) return false;
        return alt.team !== bb.stackTeam && alt.team !== bb.opponent;
      });
      const playerBreaksBringBack = brokenBringBacks.length > 0;
      const brokenWeeks = brokenBringBacks.map(bb => bb.week);
      const brokenWeekLabel = brokenWeeks.includes("W16") ? "W16"
        : brokenWeeks.includes("W17") ? "W17"
        : brokenWeeks.includes("W15") ? "W15"
        : brokenWeeks[0] || "playoff";
      const breakCostPenalty = playerBreaksBringBack ? 1.5 : 0;

      const improvement = altScore - playerScore - breakCostPenalty;

      // Only include if meaningfully better in some way
      if (improvement > 1.5 || (stackFit && improvement > 0)) {
        // === VARIED REASON GENERATOR ===
        // Pick the most-relevant angle for THIS pivot (not the same line for every one)
        // so users actually read the explanation instead of skimming past identical text.
        const altSmash = altMatchups.filter(m => m.color === "elite").length;
        const playerSmash = playerMatchups.filter(m => m.color === "elite").length;
        const altAvoid = altMatchups.filter(m => m.color === "wall").length;
        const playerAvoid = playerMatchups.filter(m => m.color === "wall").length;
        const adpDelta = alt.adp - player.adp; // negative = alt was cheaper, positive = pricier
        const samePos = alt.pos === player.pos;
        const sameBye = (BYES[alt.team] === BYES[player.team]);

        let reason;
        if (stackFit) {
          // Stack-fit pivots — vary by what other teammate they'd connect to
          const teammates = stacks.find(s => s.team === alt.team)?.players?.length || 0;
          const variants = [
            `Would have completed a ${alt.team} stack (${teammates} pieces waiting)`,
            `Pairs with your ${alt.team} pieces — instant correlation`,
            `Locks in the ${alt.team} stack you started building`,
            `${alt.team} stack fit — your teammates needed a friend`,
          ];
          reason = variants[(pickNum + alt.adp) % variants.length];
        } else if (altAvoid < playerAvoid && altAvoid === 0) {
          // The alt has zero brutal matchups, yours has at least one
          const variants = [
            `Zero shutdown matchups in playoffs vs. ${playerAvoid} for ${player.name.split(" ")[1] || player.name}`,
            `Cleaner playoff slate — no red-flag defenses`,
            `Avoids the elite-defense problem your pick runs into`,
          ];
          reason = variants[(pickNum + alt.adp) % variants.length];
        } else if (altSmash >= 2 && altSmash > playerSmash) {
          // Multiple smash matchups
          const variants = [
            `${altSmash} smash matchups in the playoff stretch`,
            `Multiple elite spike-week opportunities (W15–W17)`,
            `Playoff schedule built for explosion weeks`,
          ];
          reason = variants[(pickNum + alt.adp) % variants.length];
        } else if (improvement >= 4) {
          // Big gap, generic but strong
          const variants = [
            `Dramatically better playoff matchups`,
            `Massive playoff-schedule edge`,
            `Playoff slate is on a different tier`,
            `The matchup gap is enormous`,
          ];
          reason = variants[(pickNum + alt.adp) % variants.length];
        } else if (improvement >= 3) {
          const variants = [
            `Significantly better playoff matchups`,
            `Cleaner W15–W17 matchups across the board`,
            `Notably softer playoff slate`,
            `Stronger title-week schedule`,
          ];
          reason = variants[(pickNum + alt.adp) % variants.length];
        } else if (samePos && adpDelta > 0) {
          // Alt was pricier but better — value reframe
          const variants = [
            `Cost +${Math.round(adpDelta)} ADP but the matchup edge pays it back`,
            `Slight reach worth it for the playoff schedule`,
            `Pricier pick, but the W15–W17 setup justifies it`,
          ];
          reason = variants[(pickNum + alt.adp) % variants.length];
        } else if (samePos && adpDelta < -5) {
          // Same position, cheaper, still better — pure value
          const variants = [
            `Same position, ${Math.abs(Math.round(adpDelta))} picks cheaper, better schedule`,
            `Cheaper at the same role and a softer playoff slate`,
            `Discount price + edge in matchups`,
          ];
          reason = variants[(pickNum + alt.adp) % variants.length];
        } else if (!sameBye && BYES[alt.team] && BYES[player.team]) {
          // Bye relief
          const variants = [
            `Different bye week — diversifies your roster`,
            `Bye relief vs. your existing pieces`,
            `Spreads your bye-week exposure`,
          ];
          reason = variants[(pickNum + alt.adp) % variants.length];
        } else {
          // Default fallback variants
          const variants = [
            `Better playoff matchups`,
            `Softer W15–W17 schedule overall`,
            `Edge in the title-stretch matchups`,
            `Marginal but real playoff upgrade`,
          ];
          reason = variants[(pickNum + alt.adp) % variants.length];
        }

        alternatives.push({
          name: key.split(" ").map(w => w[0].toUpperCase() + w.slice(1)).join(" "),
          adp: alt.adp,
          team: alt.team,
          pos: alt.pos,
          playoffScore: altScore,
          stackFit,
          improvement,
          reason,
          altSmash,
          altAvoid,
          playerSmash,
          playerAvoid,
          adpDelta,
          breaksBringBack: playerBreaksBringBack,
          brokenWeekLabel,
        });
      }
    });

    if (alternatives.length > 0) {
      alternatives.sort((a, b) => b.improvement - a.improvement);
      pivots.push({
        picked: player,
        pickNum,
        alternatives: alternatives.slice(0, 2),
      });
    }
  });

  // Sort pivots by best opportunity (alternatives[0].improvement DESC)
  pivots.sort((a, b) => b.alternatives[0].improvement - a.alternatives[0].improvement);
  const topPivots = pivots.slice(0, 5);

  // === BYE WEEK CONFLICTS ===
  const byeMap = {};
  valid.forEach(p => {
    const bye = BYES[p.team];
    if (!bye) return;
    if (!byeMap[bye]) byeMap[bye] = [];
    byeMap[bye].push(p);
  });
  // Identify positions over-concentrated in a single bye week (for redraft context, soft note for best ball)
  const byeConflicts = [];
  Object.entries(byeMap).forEach(([wk, players]) => {
    const posInBye = {};
    players.forEach(p => { posInBye[p.pos] = (posInBye[p.pos] || 0) + 1; });
    Object.entries(posInBye).forEach(([pos, count]) => {
      if (count >= 3) byeConflicts.push({ week: parseInt(wk), pos, count, players: players.filter(p => p.pos === pos) });
    });
  });

  // === STACK UNIQUENESS PROXY ===
  // Based on team chalk rating + ADP cost of stack pieces
  stackGrades.forEach(stack => {
    const chalkLevel = TEAM_CHALK[stack.team] || "medium";
    const avgADP = stack.players.reduce((sum, p) => sum + p.adp, 0) / stack.players.length;

    let uniqueness;
    if (chalkLevel === "sharp" && avgADP > 80) uniqueness = "High Leverage";
    else if (chalkLevel === "low" && avgADP > 60) uniqueness = "Moderate Leverage";
    else if (chalkLevel === "chalk" && avgADP < 50) uniqueness = "Heavy Chalk";
    else if (chalkLevel === "medium") uniqueness = "Standard";
    else uniqueness = chalkLevel === "sharp" || chalkLevel === "low" ? "Slight Leverage" : "Slight Chalk";

    stack.uniqueness = uniqueness;
    stack.chalkLevel = chalkLevel;
  });

  // === VERDICT ALIGNMENT ===
  const today = new Date(); // dynamic — always current date, not hardcoded
  const verdictAlignments = [];
  valid.forEach(p => {
    const norm = normalize(p.name);
    const v = VERDICTS[norm];
    if (v) {
      const verdictDate = new Date(v.date);
      const daysOld = Math.floor((today - verdictDate) / (1000 * 60 * 60 * 24));
      const stale = daysOld > 45;
      verdictAlignments.push({
        ...p,
        verdict: v.verdict,
        reason: v.reason,
        confidence: v.confidence,
        date: v.date,
        daysOld,
        stale,
      });
    }
  });

  // === ROLE CEILING DETECTION ===
  // Check roster players against SITUATIONS roleCeiling flags.
  // slot_only: WR locked into short/underneath role — hard TD ceiling cap, negative regression candidate.
  // rz_dependent: player value entirely TD-driven — near-zero floor without scoring.
  const roleCeilingFlags = [];
  valid.forEach(p => {
    const norm = normalize(p.name);
    const sit = SITUATIONS[norm];
    if (sit?.roleCeiling) {
      roleCeilingFlags.push({ ...p, roleCeiling: sit.roleCeiling, trendNote: sit.trendNote });
    }
  });
  const slotOnlyPlayers = roleCeilingFlags.filter(p => p.roleCeiling === "slot_only");
  const rzDependentPlayers = roleCeilingFlags.filter(p => p.roleCeiling === "rz_dependent");

  let grade = "C";
  let strengths = [];
  let weaknesses = [];

  // === STACK QUALITY DISCOUNT ===
  // A stack is only as good as its weakest structural piece.
  // Discount stacks where the QB is a fade/speculative or the only pass catcher is a sub-200 dart.
  // This prevents weak stacks from receiving full architecture credit.
  const qualifyStack = (stack) => {
    if (!stack.hasQB) return { qualified: true, discount: 0, reason: null };

    // Find the QB in the stack
    const qbPlayer = stack.players.find(p => p.pos === "QB");
    const passCatchers = stack.players.filter(p => p.pos !== "QB");

    // Check 1: QB is a fade or hard fade verdict
    const qbKey = qbPlayer ? normalize(qbPlayer.name) : null;
    const qbSit = qbKey ? SITUATIONS[qbKey] : null;
    const qbIsFade = qbSit && (qbSit.verdict === "fade" || qbSit.verdict === "HARD FADE");

    // Check 2: Only one pass catcher and they are ADP 200+
    const onlyDartPasser = passCatchers.length === 1 && passCatchers[0].adp >= 200;

    // Check 3: All pass catchers have roleCeiling flags (slot trap / TD dependent)
    const allCeilingSuppressed = passCatchers.length > 0 &&
      passCatchers.every(p => {
        const key = normalize(p.name);
        return SITUATIONS[key]?.roleCeiling === "slot_only" || SITUATIONS[key]?.roleCeiling === "rz_dependent";
      });

    if (qbIsFade) return { qualified: false, discount: 0.5, reason: "fade QB anchor" };
    if (onlyDartPasser) return { qualified: false, discount: 0.6, reason: "only pass catcher is a sub-200 dart" };
    if (allCeilingSuppressed) return { qualified: false, discount: 0.7, reason: "all pass catchers have role ceiling flags" };

    return { qualified: true, discount: 1.0, reason: null };
  };

  // Apply quality multiplier to each stack's normalized score
  const qualifiedStackGrades = stackGrades.map(stack => {
    const { qualified, discount, reason } = qualifyStack(stack);
    const effectiveScore = qualified ? stack.normalizedScore : stack.normalizedScore * discount;
    return { ...stack, normalizedScore: effectiveScore, qualityDiscount: !qualified, discountReason: reason };
  });

  // === STACK QUALITY ANALYSIS (tournament-aware) ===
  const primaryStacks = qualifiedStackGrades.filter(s => s.hasQB);
  const goodStacks = primaryStacks.filter(s => s.normalizedScore >= 10);
  const eliteStacks = primaryStacks.filter(s => s.normalizedScore >= 12);

  // Multi-stack architecture bonus — only count stacks that passed quality check
  const qualifiedPrimaryStacks = primaryStacks.filter(s => !s.qualityDiscount);
  const discountedStacks = primaryStacks.filter(s => s.qualityDiscount);

  if (qualifiedPrimaryStacks.length >= 3) {
    strengths.push(`${qualifiedPrimaryStacks.length} primary QB stacks — strong roster architecture`);
  } else if (qualifiedPrimaryStacks.length === 2) {
    strengths.push(`2 primary QB stacks built`);
  } else if (qualifiedPrimaryStacks.length === 1) {
    strengths.push(`1 primary QB stack built`);
  }

  // Flag discounted stacks as a weakness so the user understands why
  if (discountedStacks.length >= 2) {
    weaknesses.push(`${discountedStacks.length} stacks underbuilt — ${discountedStacks.map(s => `${s.team} (${s.discountReason})`).join(", ")}`);
  } else if (discountedStacks.length === 1) {
    weaknesses.push(`${discountedStacks[0].team} stack underbuilt — ${discountedStacks[0].discountReason}`);
  }

  if (eliteStacks.length >= 1) {
    strengths.push(`${eliteStacks.length} elite stack(s): ${eliteStacks.map(s => s.team).join(", ")}`);
  }

  // Tournament-specific peak-week bonuses
  let fastPuppyFlatWeeks = 0; // Fast Puppy: weeks with no spike stack (penalty applied after score init)
  if (tournamentKey === "puppy") {
    // The Puppy 3: W15 (1-of-10) is the hardest gate, W16 (1-of-5) is twice as
    // survivable, and W17 is a single 750-man group holding 75.6% of the prize pool.
    // The old branch checked W15 and W16 and said NOTHING about W17 — which left the
    // week that decides $400-vs-$100k completely unflagged in either direction.
    const w15Elite = primaryStacks.filter(s => s.avgPerWeek[0] >= 4);
    const w16Elite = primaryStacks.filter(s => s.avgPerWeek[1] >= 4);
    const w17Elite = qualifiedStackGrades.filter(s => s.avgPerWeek[2] >= 4);
    if (w15Elite.length >= 1) {
      strengths.push(`${w15Elite.length} stack(s) primed for the toughest playoff cutoff (Week 15, 1-of-10)`);
    }
    if (w16Elite.length >= 1) {
      strengths.push(`${w16Elite.length} stack(s) primed for the Week 16 cutoff (1-of-5)`);
    }
    if (w17Elite.length >= 1) {
      strengths.push(`${w17Elite.length} stack(s) live for the W17 final — 75.6% of this format's prize pool is paid there`);
    }
    if (w15Elite.length === 0 && primaryStacks.length > 0) {
      weaknesses.push(`None of your primary stacks are built for the toughest playoff cutoff (Week 15, 1-of-10) — that round eliminates 90% of the field`);
    }
    if (w17Elite.length === 0 && qualifiedStackGrades.length > 0) {
      weaknesses.push(`No stack has a live W17 window — reaching the 750-seat final is an 80x jump and 75.6% of the $1M pool is decided there`);
    }
  } else if (tournamentKey === "bbm7") {
    // BBM VII: the two hardest weekly gates anywhere, back to back — W15 is
    // 1-of-14 (7.1%) and W16 is 1-of-12 (8.3%). The old branch checked W15 only,
    // which understated a W16 cut that is nearly as brutal. You must win BOTH
    // outright, so a roster live in only one of them is not actually alive.
    const w15Elite = primaryStacks.filter(s => s.avgPerWeek[0] >= 4);
    const w16Elite = primaryStacks.filter(s => s.avgPerWeek[1] >= 4);
    const bothWeeks = primaryStacks.filter(s => s.avgPerWeek[0] >= 4 && s.avgPerWeek[1] >= 4);
    if (w15Elite.length >= 1) {
      strengths.push(`${w15Elite.length} stack(s) with W15 spike ceiling — the 1-of-14 cut is the hardest gate in any format here`);
    }
    if (w16Elite.length >= 1) {
      strengths.push(`${w16Elite.length} stack(s) with W16 spike ceiling — 1-of-12, nearly as steep as W15`);
    }
    if (bothWeeks.length >= 1) {
      strengths.push(`${bothWeeks.length} stack(s) live in BOTH W15 and W16 — you have to win the two cuts back to back, so this is what actually survives`);
    } else if (primaryStacks.length > 0) {
      weaknesses.push(`No stack clears both W15 and W16 — BBM makes you win a 1-of-14 and then a 1-of-12 consecutively, and a roster built for only one of them rarely sees the other`);
    }
  } else if (tournamentKey === "schnauzer") {
    // Mini Schnauzer 2: the W15/W16 gates are soft (20%, 25%), so a merely-adequate
    // week survives them. W17 is the 310-seat final where the prize curve actually
    // pays, so that is the week worth flagging in both directions.
    const w17Elite = qualifiedStackGrades.filter(s => s.avgPerWeek[2] >= 4);
    if (w17Elite.length >= 1) {
      strengths.push(`${w17Elite.length} stack(s) built for the W17 championship round — where this format's prize curve pays`);
    } else if (qualifiedStackGrades.length > 0) {
      weaknesses.push(`No stack has a live W17 window — the W15/W16 cuts here are soft enough to survive, but the 310-seat final is where the money is`);
    }
  } else if (tournamentKey === "pitbull") {
    // The Pit Bull 2: gates are flat (16.7 / 16.7 / 20) so no single week is a
    // kill shot — but 53.4% of the pool goes to the TOP TEN of a 156-man final,
    // the most top-heavy curve on the board. Surviving is the easy part here;
    // the money needs an outright W17 win, so that is the week worth flagging.
    const w17Elite = qualifiedStackGrades.filter(s => s.avgPerWeek[2] >= 4);
    const anyWeak = qualifiedStackGrades.filter(s => Math.min(...s.avgPerWeek) <= 1);
    if (w17Elite.length >= 1) {
      strengths.push(`${w17Elite.length} stack(s) live for the W17 final — 53.4% of this format's pool goes to the top ten of a 156-man group`);
    } else if (qualifiedStackGrades.length > 0) {
      weaknesses.push(`No stack has a live W17 window — the weekly gates here are survivable, but the money needs an outright win in the 156-seat final`);
    }
    if (anyWeak.length >= 1) {
      weaknesses.push(`${anyWeak.length} stack(s) carry a wall week — with three near-identical gates (1/6, 1/5) you cannot punt a week and expect to reach the final`);
    }
  } else if (tournamentKey === "frenchie") {
    // The Frenchie 13: the ONLY format here where W16 is the kill shot. W16 is
    // 1-of-6 (16.7%) against a 2-of-6 (33.3%) W15, so W16 is exactly twice as
    // hard. Every other branch in this file flags W15 as the tight gate; this
    // one deliberately does not, and a W15-only roster is the trap it catches.
    // W17 is flagged too because the 131-seat final is the smallest on the board
    // and 1st alone is 30% of the pool.
    const w16Elite = qualifiedStackGrades.filter(s => s.avgPerWeek[1] >= 4);
    const w17Elite = qualifiedStackGrades.filter(s => s.avgPerWeek[2] >= 4);
    if (w16Elite.length >= 1) {
      strengths.push(`${w16Elite.length} stack(s) built for the W16 kill shot — 1-of-6, twice as hard as this format's W15`);
    } else if (qualifiedStackGrades.length > 0) {
      weaknesses.push(`No stack clears the W16 gate — W16 is 1-of-6 here and eliminates five of every six survivors, so a W15-built roster dies one week later`);
    }
    if (w17Elite.length >= 1) {
      strengths.push(`${w17Elite.length} stack(s) live for the 131-seat final — the smallest final on the board, and 1st alone is 30% of the pool`);
    }
  } else if (tournamentKey === "fieldgeneral") {
    // The Field General 2: W16 is 1-of-12, exactly twice as hard as the 2-of-12
    // W15 and tied with BBM VII for the second-hardest weekly gate on this board.
    // Like the Frenchie this branch does NOT treat W15 as the tight cut, because
    // here it is not. W17 is flagged more softly than in the other finals: the
    // 118-seat final holds only 45.4% of the pool, so arriving is worth real money
    // ($199 on a $10 entry) but the curve above it is shallower than Pit Bull's.
    const w15Elite = qualifiedStackGrades.filter(s => s.avgPerWeek[0] >= 4);
    const w16Elite = qualifiedStackGrades.filter(s => s.avgPerWeek[1] >= 4);
    const w17Elite = qualifiedStackGrades.filter(s => s.avgPerWeek[2] >= 4);
    if (w16Elite.length >= 1) {
      strengths.push(`${w16Elite.length} stack(s) built for the W16 kill shot — 1-of-12 here, exactly twice as hard as W15`);
    } else if (qualifiedStackGrades.length > 0) {
      weaknesses.push(`No stack clears the W16 gate — W16 is 1-of-12 in this format and eliminates eleven of every twelve survivors, so a W15-built roster dies one week later`);
    }
    if (w15Elite.length >= 1 && w16Elite.length >= 1) {
      strengths.push(`Stacks live in BOTH W15 and W16 — you have to clear the 2-of-12 and then the 1-of-12 back to back`);
    }
    if (w17Elite.length >= 1) {
      strengths.push(`${w17Elite.length} stack(s) live for the 118-seat final — 1st alone is 16.7% of the pool`);
    }
  } else if (tournamentKey === "boxer") {
    // The Boxer: softest gates anywhere (33.3 / 40.0 / 50.0), so survival is
    // close to free and worth close to nothing — the ladder is $9 -> $18 -> $50
    // on an $18 entry. Nearly all EV sits in W17 placement inside a 416-man
    // final where the top ten take 49.7% of the pool. So this branch checks W17
    // only, and deliberately has NO wall-week check: unlike Pit Bull's three
    // near-identical gates, here you genuinely can punt a week and still advance.
    const w17Elite = qualifiedStackGrades.filter(s => s.avgPerWeek[2] >= 4);
    if (w17Elite.length >= 1) {
      strengths.push(`${w17Elite.length} stack(s) live for the W17 final — the top ten take 49.7% of this format's pool and everything before W17 pays back less than your entry`);
    } else if (qualifiedStackGrades.length > 0) {
      weaknesses.push(`No stack has a live W17 window — the gates here are soft enough that you will likely reach the 416-seat final, but arriving pays $50 and only a top-ten week pays real money`);
    }
  } else if (tournamentKey === "fastpuppy") {
    // The Fast Puppy: W15, W16, W17 are three INDEPENDENT must-win single-week cuts.
    // Every week needs its own spike stack. Check all three equally; a week with no
    // elite-ceiling stack (primary OR partial) is a live elimination risk. Ceiling
    // piled into one week is redundant — you only need to win each week once.
    // NOTE: `score` isn't initialized until later — count flat weeks here, apply the
    // penalty in the scoring block below (this branch runs before `let score = 0`).
    const weekLabels = ["Week 15", "Week 16", "Week 17"];
    const spikeStacks = qualifiedStackGrades; // primaries + partials both spike
    weekLabels.forEach((label, wk) => {
      const elite = spikeStacks.filter(s => s.avgPerWeek[wk] >= 4);
      if (elite.length >= 1) {
        strengths.push(`${elite.length} spike stack(s) for the ${label} cut (${elite.map(s => s.team).join(", ")})`);
      } else if (spikeStacks.length > 0) {
        weaknesses.push(`No spike stack for the ${label} cut — in a 3-week gauntlet, a flat week is an elimination week`);
        fastPuppyFlatWeeks += 1;
      }
    });
  }

  if (goodStacks.length === 0 && primaryStacks.length > 0 && format !== "superflex") {
    weaknesses.push(`Primary stacks face difficult ${tournament.name} matchups`);
  }

  // === CONSTRUCTION ANALYSIS ===
  const majorIssues = benchmarkIssues.filter(i => i.severity === "major");
  const minorIssues = benchmarkIssues.filter(i => i.severity === "minor");

  if (benchmarkIssues.length === 0) {
    strengths.push(format === "superflex" ? "Roster construction fits Superflex format" : "Roster construction matches BBM benchmarks");
  } else {
    majorIssues.forEach(i => weaknesses.push(`${i.type === "under" ? "Light at" : "Heavy at"} ${i.pos}: ${i.msg}`));
    // Minor issues don't add to weaknesses but show as notes
  }

  if (format === "superflex" && posCounts.QB < 2) {
    weaknesses.push(`Critical: only ${posCounts.QB} QB(s) — SF requires 2 starters every week`);
  }

  // === ADP VALUE ANALYSIS (capped impact) ===
  let adpScoreImpact = 0;
  if (hasPickNumbers) {
    const valuePicks = adpFlags.filter(p => p.delta >= valueThreshold);
    const reaches = adpFlags.filter(p => p.delta <= -reachThreshold);

    // Real value picks count toward strength
    if (valuePicks.length >= 2) {
      strengths.push(`${valuePicks.length} significant ADP value picks`);
      adpScoreImpact += Math.min(valuePicks.length * 0.5, 2); // cap at +2
    }

    // Reaches penalize, but capped — never let ADP delta dominate
    if (reaches.length >= 3) {
      weaknesses.push(`${reaches.length} significant reaches (${reachThreshold}+ picks early)`);
      adpScoreImpact -= Math.min(reaches.length * 0.4, 1.5); // cap at -1.5
    }
  }

  // === GRADE CALCULATION ===
  // Stack quality is the dominant signal — weighted heaviest
  // Only qualified stacks receive full credit; discounted stacks contribute at reduced rate
  let score = 0;
  score += qualifiedPrimaryStacks.length * 0.8;          // qualified stacks: full baseline credit
  score += discountedStacks.length * 0.3;                // underbuilt stacks: minimal credit
  score += goodStacks.length * 1.2;                      // quality stacks
  score += eliteStacks.length * 1.5;                     // elite stacks bonus
  score -= majorIssues.length * 1.0;          // major construction issues
  score -= minorIssues.length * 0.3;          // minor issues
  score += adpScoreImpact;                    // capped ADP contribution
  score -= fastPuppyFlatWeeks * 0.5;          // Fast Puppy: each flat cut week is an elimination risk

  // Fix 4: Playoff quality modifier — clean construction + elite windows = bonus
  const topStackHasEliteWindow = eliteStacks.length >= 1;
  const constructionClean = majorIssues.length === 0;
  if (constructionClean && topStackHasEliteWindow) {
    score += 0.5; // clean build + elite playoff window compound bonus
  }

  // Bring-back bonus — game stacks are positively correlated value, not stacks.
  // Rebalanced Jul 16 2026 (audit): (1) counted per unique GAME via mergedBringBacks —
  // the raw bringBacks list holds mirror pairs, so game-locks double-counted before;
  // (2) quality-tiered — blowout-risk games (spread 7+, total < 44) earn reduced
  // credit per framework Section 8; (3) capped at +1.05 total so bring-back volume,
  // which is semi-automatic on multi-stack rosters, can't outscore an elite stack.
  // Per-game credit, tiered by what's coming back on the far side (framework Sec 8 +
  // Receiving Back Stack Qualifier, wired Jul 16 2026):
  //   WR/TE far side ............. 0.35 (0.15 in a blowout-risk game)
  //   RB far side, 65+ rec 2025 .. 0.35 — elite receiving back, garbage-time exempt
  //                                 (framework: no blowout reduction for this tier)
  //   RB far side, 40-64 rec ..... 0.20 — real receiving role, reduced credit
  //   RB far side, under 40 ...... 0    — standard back, game-level correlation too weak
  //   Both sides have QBs ........ 0.35 game lock (0.15 in a blowout-risk game)
  const qbBringBackGames = [];
  let bringBackScore = 0;
  mergedBringBacks.forEach(bb => {
    const sideA = bb.teamA?.players || [];
    const sideB = bb.teamB?.players || [];
    const aQB = sideA.some(p => p.pos === "QB");
    const bQB = sideB.some(p => p.pos === "QB");
    if (!aQB && !bQB) return;
    const game = (PLAYOFF_GAME_TOTALS[bb.week] || []).find(g =>
      [g.away, g.home].includes(bb.teamA?.team) && [g.away, g.home].includes(bb.teamB?.team)
    );
    const blowoutRisk = game && Math.abs(game.spread) >= 7 && game.total < 44;
    const farSideCredit = (farSide) => {
      if (farSide.some(p => p.pos === "WR" || p.pos === "TE")) return blowoutRisk ? 0.15 : 0.35;
      let best = 0;
      farSide.filter(p => p.pos === "RB").forEach(p => {
        const rec = getMetrics(p.name)?.rec || 0;
        if (rec >= 65) best = Math.max(best, 0.35);
        else if (rec >= 40) best = Math.max(best, 0.2);
      });
      return best;
    };
    let credit;
    if (aQB && bQB) credit = blowoutRisk ? 0.15 : 0.35;
    else if (aQB) credit = farSideCredit(sideB);
    else credit = farSideCredit(sideA);
    if (credit > 0) {
      qbBringBackGames.push(bb);
      bringBackScore += credit;
    }
  });
  if (qbBringBackGames.length >= 1) {
    strengths.push(`${qbBringBackGames.length} game stack(s) with bring-back correlation`);
    score += Math.min(bringBackScore, 1.05);
  }

  // Partial-stack credit (framework Sec 8: "reduced credit relative to full loops
  // but not penalized" — the credit half was never implemented until Jul 16 2026).
  // A no-QB same-team cluster with a genuinely strong playoff window earns roughly
  // half a primary stack's baseline, capped so partials can't out-score real loops.
  const qualityPartialStacks = qualifiedStackGrades.filter(s => !s.hasQB && s.normalizedScore >= 10);
  if (qualityPartialStacks.length >= 1) {
    strengths.push(`${qualityPartialStacks.length} partial stack(s) (no QB) with a strong playoff window: ${qualityPartialStacks.map(s => s.team).join(", ")}`);
    score += Math.min(qualityPartialStacks.length * 0.4, 0.8);
  }

  // Unlooped QB penalty — a QB with zero same-team WR/TE on the roster is a broken
  // loop (framework Section 8: hard penalty; absence of a bonus is not a penalty).
  // Softened in superflex, where extra QBs carry standalone lineup value.
  const unloopedQBs = valid.filter(q =>
    q.pos === "QB" && !valid.some(p => p.team === q.team && (p.pos === "WR" || p.pos === "TE"))
  );
  if (unloopedQBs.length >= 1) {
    weaknesses.push(`Unlooped QB${unloopedQBs.length > 1 ? "s" : ""}: ${unloopedQBs.map(q => q.name).join(", ")} — no pass catcher from their team on this roster, so their touchdowns only score once`);
    score -= unloopedQBs.length * (format === "superflex" ? 0.3 : 0.75);
  }

  // Dead playoff week penalty — roster-level three-week coverage (framework Section 8:
  // per-week scored penalty). Stack averages previously diluted a cold week across the
  // other two; a week where NO stack clears a neutral matchup is an elimination risk.
  if (stackGrades.length >= 1) {
    [0, 1, 2].forEach(wkIdx => {
      const bestWeekAvg = Math.max(...stackGrades.map(s => s.avgPerWeek[wkIdx]));
      if (bestWeekAvg < 3) {
        weaknesses.push(`W${15 + wkIdx} is a dead week — none of your stacks clears a neutral matchup, and that's an elimination round`);
        score -= 0.75;
      }
    });
  }

  // === LATE-ROUND EDGE AUDIT (picks 180+) ===
  // Consolidate naked RB / no-edge orphan / missing W17 bring-back flags into one line per
  // late pick so the same player doesn't trigger multiple separate weaknesses or penalties.
  const LATE_PICK_THRESHOLD = 180;
  const lateFlaggedNames = new Set();
  const lateAuditLines = [];

  valid.forEach(p => {
    if (!p.actualPick || p.actualPick < LATE_PICK_THRESHOLD) return;

    const flagParts = [];

    const orphanMatch = orphans.find(o => o.name === p.name);
    if (orphanMatch && orphanMatch.tier === "No Edge") flagParts.push("No Edge orphan");

    const isUninsulatedNaked = uninsulatedNakedRBs.some(rb => rb.name === p.name);
    if (isUninsulatedNaked) flagParts.push("naked RB, no scheme/volume signal");

    const inAnyBringBack = mergedBringBacks.some(bb =>
      (bb.allPieces || []).some(piece => piece.name === p.name)
    );
    if (!inAnyBringBack) flagParts.push("isn\'t part of any of your game-stacks for the playoffs");

    if (flagParts.length > 0) {
      lateFlaggedNames.add(p.name);
      lateAuditLines.push(`${p.name} (${p.actualPick}) — ${flagParts.join(" and ")}`);
    }
  });

  if (lateAuditLines.length > 0) {
    lateAuditLines.forEach(line => weaknesses.push(`Late-round edge check: ${line}`));
    score -= Math.min(lateAuditLines.length * 0.15, 0.6);
  }

  // Naked RB Insulation — RBs with no stacking loop need standalone volume/scheme signal
  // (late-pick RBs already covered by the audit above are excluded to avoid double-penalizing)
  const genericUninsulatedNakedRBs = uninsulatedNakedRBs.filter(rb => !lateFlaggedNames.has(rb.name));
  if (genericUninsulatedNakedRBs.length > 0) {
    const names = genericUninsulatedNakedRBs.map(rb => rb.name).join(" and ");
    weaknesses.push(
      `${names} ${genericUninsulatedNakedRBs.length > 1 ? "don't" : "doesn't"} have a clear path to a workhorse role and aren't part of a QB stack — their upside depends entirely on volume that isn't locked down yet`
    );
    score -= Math.min(genericUninsulatedNakedRBs.length * 0.15, 0.6);
  }

  // Orphan analysis
  const noEdgeOrphans = orphans.filter(o => o.tier === "No Edge" && !lateFlaggedNames.has(o.name));
  const strongOrphans = orphans.filter(o => o.tier === "Elite Window" || o.tier === "Strong Matchups");
  if (strongOrphans.length >= 2) {
    strengths.push(`${strongOrphans.length} bench piece(s) with no QB stack but a strong playoff schedule`);
    score += 0.5;
  }
  if (noEdgeOrphans.length >= 3) {
    weaknesses.push(`${noEdgeOrphans.length} bench piece(s) with no QB stack and no standout matchup either`);
    score -= noEdgeOrphans.length * 0.2;
  }

  // Verdict alignment — fade is analyst opinion only, not a universal scoring penalty.
  // Fades surface as AI context and weakness notes but do NOT penalize the score.
  // Only objective situation flags (confirmed_committee, qb_uncertainty, roleCeiling) drive penalties.
  const activeFades = verdictAlignments.filter(v => !v.stale && (v.verdict === "fade" || v.verdict === "HARD FADE"));
  const activeTargets = verdictAlignments.filter(v => !v.stale && (v.verdict === "TARGET" || v.verdict.includes("TARGET")));
  if (activeFades.length >= 2) {
    // Note only — no score penalty. Fade = analyst opinion, not objective roster flaw.
    weaknesses.push(`${activeFades.length} player(s) with situational concerns`);
  }
  if (activeTargets.length >= 3) {
    strengths.push(`${activeTargets.length} players in strong situations`);
    score += Math.min(activeTargets.length * 0.3, 1.5);
  }

  // === CONFIRMED COMMITTEE PENALTY ===
  // confirmed_committee = RB with genuinely split touches and no defined lead role.
  // Objective situation fact — penalizes any roster regardless of analyst opinion.
  // creeping_committee = emerging competition threat but starter is currently defined — no penalty.
  const confirmedCommitteeRBs = valid.filter(p => {
    if (p.pos !== "RB") return false;
    const sit = SITUATIONS[normalize(p.name)];
    return sit?.riskFlags?.includes("confirmed_committee");
  });
  if (confirmedCommitteeRBs.length >= 2) {
    const names = confirmedCommitteeRBs.map(p => p.name.split(" ").slice(-1)[0]).join(", ");
    weaknesses.push(`${confirmedCommitteeRBs.length} RB(s) in confirmed committees: ${names} — no defined lead role, ceiling capped`);
    score -= Math.min(confirmedCommitteeRBs.length * 0.25, 1.0); // cap at -1.0 total
  } else if (confirmedCommitteeRBs.length === 1) {
    const name = confirmedCommitteeRBs[0].name.split(" ").slice(-1)[0];
    weaknesses.push(`${name} in confirmed committee — touches genuinely split, no workhorse path`);
    score -= 0.2;
  }

  // === ROLE CEILING PENALTIES ===
  // slot_only: each confirmed slot-trap WR is a ceiling suppressor — penalize lightly but flag clearly
  // rz_dependent: each TD-or-bust player with no floor adds variance without upside — soft penalty
  if (slotOnlyPlayers.length >= 1) {
    const names = slotOnlyPlayers.map(p => p.name.split(" ").slice(-1)[0]).join(", ");
    weaknesses.push(`${names} ${slotOnlyPlayers.length > 1 ? "have" : "has"} a limited role — gets targets but not the kind that tend to score`);
    score -= slotOnlyPlayers.length * 0.35; // soft — one slot back isn't fatal, two+ is a real problem
  }
  if (rzDependentPlayers.length >= 1) {
    const names = rzDependentPlayers.map(p => p.name.split(" ").slice(-1)[0]).join(", ");
    weaknesses.push(`TD-dependent player${rzDependentPlayers.length > 1 ? "s" : ""}: ${names} — near-zero floor without scoring`);
    score -= rzDependentPlayers.length * 0.25; // lighter — situational value is still value
  }

  // === QB UNCERTAINTY PENALTY ===
  // QBs with qb_uncertainty riskFlag get a direct stack discount.
  // Fade verdict no longer carries a score penalty (analyst opinion only).
  // This is the sole objective penalty for uncertain QB situations — -0.3 per affected stack.
  const uncertainQBStacks = qualifiedStackGrades.filter(stack => {
    if (!stack.hasQB) return false;
    const qb = stack.players.find(p => p.pos === "QB");
    if (!qb) return false;
    const key = normalize(qb.name);
    const sit = SITUATIONS[key];
    return sit?.riskFlags?.includes("qb_uncertainty");
  });
  if (uncertainQBStacks.length >= 1) {
    const names = uncertainQBStacks.map(s => s.team).join(", ");
    weaknesses.push(`QB uncertainty in ${names} stack${uncertainQBStacks.length > 1 ? "s" : ""} — starting role unconfirmed`);
    score -= uncertainQBStacks.length * 0.3;
  }
  if (tournamentKey === "bbm7" || tournamentKey === "puppy") {
    const leverageStacks = stackGrades.filter(s => s.uniqueness === "High Leverage" || s.uniqueness === "Moderate Leverage");
    if (leverageStacks.length >= 1) {
      strengths.push(`${leverageStacks.length} under-the-radar stack(s) — good differentiation if the field is large`);
      score += leverageStacks.length * 0.4;
    }
  }

  // Fix 2: removed double-counting strength/weakness loop
  // (individual score additions above already account for each signal)

  // Superflex-specific: QB depth is essential
  if (format === "superflex") {
    if (posCounts.QB >= 3) score += 1;
    if (posCounts.QB < 2) score -= 3;
  }

  // === ADVANCE RATE LAYER (added Jul 28 2026) ===
  // The qualifying round (W1-14 cumulative, ~2-of-12 advance) is the single
  // biggest filter in every large-field tournament, and nothing above this
  // line scores it — every prior input is W15-17 derived. BBM research
  // consensus: ADP value tracks regular-season advance rate, stacking tracks
  // playoff win rate, and stacked builds gain advancement equity in BOTH
  // phases — so this layer is capped at ±1.25 total to inform the grade,
  // never to let a soft September rescue a stackless build (or vice versa).
  // Tournaments can opt down via advanceWeight (default 1; 0 disables for
  // playoff-only formats).
  const advanceWeight = tournament?.advanceWeight ?? 1;
  let advanceLayer = null;
  if (advanceWeight > 0) {
    // Core scorers: the 9 earliest picks — the players a cumulative
    // qualifying round actually rides on. Best ball has no lineup, so ADP
    // order is the closest stable proxy for expected weekly contribution.
    const core = [...valid].sort((a, b) => (a.adp ?? 999) - (b.adp ?? 999)).slice(0, 9);
    let schedPts = 0, usablePts = 0, byePts = 0;

    // 1. W1-14 schedule strength — both directions, mirroring the redraft
    // check. Tier scores average 3.125 by construction (rank-bucket sizes),
    // so that is the neutral point.
    const coreSchedAvgs = core.map(p => {
      const sched = FULL_SCHEDULE[p.team] || [];
      const scores = sched.slice(0, 14)
        .map(opp => getMatchupScoreForOpponent(opp, p.pos, useProjected))
        .filter(m => m && m.tier !== "Unknown")
        .map(m => m.score);
      return scores.length >= 10 ? scores.reduce((s, v) => s + v, 0) / scores.length : null;
    }).filter(v => v != null);
    if (coreSchedAvgs.length >= 6) {
      const avg = coreSchedAvgs.reduce((s, v) => s + v, 0) / coreSchedAvgs.length;
      schedPts = Math.max(-0.5, Math.min(0.5, (avg - 3.125) * 1.2));
    }

    // 2. Cumulative scoring proxy — core usable_rate (share of 2025 weeks at
    // a startable half-PPR line). Centered on 0.53, the median for ADP<=120
    // players in PLAYER_METRICS; scaled so the IQR (~0.41-0.71) maps inside
    // the cap. Catches rosters that cannot out-score their pod for 14 weeks
    // regardless of playoff geometry.
    const usable = core.map(p => getMetrics(p.name)?.usable_rate).filter(v => v != null);
    if (usable.length >= 5) {
      const avgU = usable.reduce((s, v) => s + v, 0) / usable.length;
      usablePts = Math.max(-0.5, Math.min(0.5, (avgU - 0.53) * 2));
    }

    // 3. Bye clustering — 4+ core scorers off in the same qualifying week is
    // one near-dead week of cumulative points. Soft, one-way.
    const byeCounts = {};
    core.forEach(p => {
      const wk = (FULL_SCHEDULE[p.team] || []).indexOf("BYE");
      if (wk >= 0 && wk < 14) byeCounts[wk + 1] = (byeCounts[wk + 1] || 0) + 1;
    });
    const worstBye = Object.entries(byeCounts).sort((a, b) => b[1] - a[1])[0];
    if (worstBye && worstBye[1] >= 4) byePts = -0.25;

    const advScore = Math.max(-1.25, Math.min(1.25, (schedPts + usablePts + byePts))) * advanceWeight;
    score += advScore;
    advanceLayer = {
      score: Math.round(advScore * 100) / 100,
      schedPts: Math.round(schedPts * 100) / 100,
      usablePts: Math.round(usablePts * 100) / 100,
      byePts,
      coreCount: core.length,
    };
    if (advScore >= 0.5) {
      strengths.push(`Strong advance-rate profile — core scorers carry a soft W1-14 slate and bankable weekly output for the qualifying round`);
    } else if (advScore <= -0.5) {
      weaknesses.push(`Weak advance-rate profile — core scorers face a tough W1-14 slate or thin weekly output; this roster must survive the qualifying round before any playoff geometry pays`);
    }
    if (byePts < 0 && worstBye) {
      weaknesses.push(`Advance-rate bye cluster: ${worstBye[1]} core scorers share the W${worstBye[0]} bye — one near-dead week of cumulative qualifying points`);
    }
  }

  // ============ CEILING SHAPE LAYER (added Jul 28, 2026) ============
  // The grade scored roster STRUCTURE almost exclusively — stacks, positional
  // counts, construction flaws, ADP, committees. Nothing measured whether the
  // players inside that structure actually spike. Two rosters with identical
  // architecture graded identically even if one was full of 30%-spike players
  // and the other of 10% guys. In best ball you win a week with a spike, so
  // that was the largest blind spot in the model.
  //
  // Source Hierarchy placement: this is rank 4, ceiling shape, which the
  // hierarchy sanctions explicitly — "descriptive of last season; use for
  // best-ball classification, not projection." Scoring it as classification is
  // the intended use. It stays capped well under structure for that reason.
  //
  // SEPARATE from advanceLayer on purpose. That layer scores the W1-14
  // cumulative qualifying round; this scores single-week playoff ceiling. Per
  // the PHI principle already in this file, a team can be a season-long target
  // and a playoff avoid at once — the two must never be netted into one signal.
  //
  // POSITION-NORMALISED, and this is not optional. Raw spike rate is dominated
  // by QBs: an 18+ half-PPR week is routine for a quarterback and hard for a
  // receiver, so the draftable medians run QB 0.637 against WR 0.125. Scoring
  // the raw number would have handed a bonus to any roster carrying three QBs
  // for a reason unrelated to ceiling quality.
  //
  // Baselines are the median of (spike_rate + nuclear_rate) at that position
  // among EVERY DRAFTED player clearing the gate. The population matters and
  // the first attempt got it wrong: centring on ADP <= 150 gave every roster a
  // systematic -0.05 because an 18-round roster necessarily contains later
  // picks, so a median build scored negative by construction. Re-centred on the
  // drafted pool the delta median is exactly 0.000, which is the property this
  // needs — an average roster must score zero, not a small penalty. It also
  // took the TE sample from 8 to 33.
  //
  // Nuclear is added to spike deliberately: nuclear (28+) is a subset of spike
  // (18+), so the sum double-weights the huge weeks, and a pod is won by a huge
  // week rather than a good one.
  //
  // KNOWN LIMIT, and the reason the cap is 0.5 rather than higher. These rates
  // describe 2025 and nothing else. A player whose season was suppressed by
  // circumstance rates as low-ceiling regardless of his outlook: Justin
  // Jefferson is the sharp case, drafted around ADP 10 with a 0.000 blend
  // because a 30% target share on an offence that could not score produced
  // nine usable weeks and zero above 18. That is a real description of 2025,
  // not a data fault — usable and dud rates move coherently with spike across
  // the pool (spike>0 WRs average .502 usable / .221 dud, spike==0 average
  // .342 / .303) — but it is emphatically NOT a projection.
  //
  // What keeps it safe is that this AVERAGES. One misleading player moves
  // avgDelta by roughly 0.007 and the score by under 0.02. The layer reads
  // roster-wide ceiling density, never an individual verdict, and nothing here
  // should ever be quoted about a single player.
  let ceilingLayer = null;
  {
    const CEIL_BASE = { QB: 0.530, RB: 0.235, WR: 0.091, TE: 0.059 };
    // Gate first: a spike rate over four games or a 20% snap share is noise,
    // and noise averaged across a roster is still noise.
    const deltas = [];
    valid.forEach(p => {
      const m = getMetrics(p.name);
      if (!m || m.spike_rate == null) return;
      if ((m.gp || 0) < 8 || (m.snap_sh || 0) < 0.35) return;
      const base = CEIL_BASE[p.pos];
      if (base == null) return;
      deltas.push((m.spike_rate + (m.nuclear_rate || 0)) - base);
    });
    if (deltas.length >= 5) {
      const avg = deltas.reduce((s, v) => s + v, 0) / deltas.length;
      const ceilPts = Math.max(-0.5, Math.min(0.5, avg * 2.5));
      score += ceilPts;
      ceilingLayer = {
        score: Math.round(ceilPts * 100) / 100,
        avgDelta: Math.round(avg * 1000) / 1000,
        qualified: deltas.length,
        rostered: valid.length,
      };
      if (ceilPts >= 0.3) {
        strengths.push(`Ceiling-heavy roster — qualifying players spike well above positional norms, which is how single playoff weeks get won`);
      } else if (ceilPts <= -0.3) {
        weaknesses.push(`Low ceiling shape — qualifying players spike below positional norms, so this roster needs volume or matchup to break a week rather than doing it on its own`);
      }
    }
  }

  // Recalibrated thresholds — harder curve, more actionable grades
  // A ≥ 7.0, A- ≥ 5.5, B+ ≥ 3.5, B ≥ 2.0, C+ ≥ 0.5, C ≥ -1.0, D below
  if (score >= 7.0) grade = "A";
  else if (score >= 5.5) grade = "A-";
  else if (score >= 3.5) grade = "B+";
  else if (score >= 2.0) grade = "B";
  else if (score >= 0.5) grade = "C+";
  else if (score >= -1.0) grade = "C";
  else grade = "D";

  // === ROSTER STANDOUTS ===
  // Surface 3-5 affirming highlights — the most impressive thing about each
  // standout player. Beginners get an at-a-glance "here's what's working"
  // section instead of having to interpret raw data themselves.
  const rosterStandouts = [];
  const usedStandoutNames = new Set();

  // Players flagged as pivot liabilities — exclude from standouts to avoid contradictions
  const pivotLiabilityNames = new Set(
    (topPivots || []).map(pv => pv.picked?.name).filter(Boolean)
  );
  const isLiability = (name) => pivotLiabilityNames.has(name);

  const matchupScoreFor = (p) => {
    const opps = PLAYOFFS[p.team] || [];
    if (opps.length === 0) return null;
    const matchups = opps.map(opp => getMatchupTier(opp, p.pos, useProjected));
    const avg = matchups.reduce((s, m) => s + m.score, 0) / matchups.length;
    return { avg, matchups };
  };

  // 1) Best Playoff Window — highest avg playoff matchup score across roster
  const playoffRanked = valid.map(p => {
    const m = matchupScoreFor(p);
    return m ? { p, ...m } : null;
  }).filter(Boolean).sort((a, b) => b.avg - a.avg);
  const bestPlayoffCandidate = playoffRanked.find(r => !isLiability(r.p.name));
  if (bestPlayoffCandidate && bestPlayoffCandidate.avg >= 4) {
    const top = bestPlayoffCandidate;
    const smashCount = top.matchups.filter(m => m.color === "elite").length;
    rosterStandouts.push({
      kind: "playoff",
      icon: "🏆",
      label: "Best Playoff Matchups",
      player: top.p,
      detail: smashCount >= 2
        ? `${smashCount} Smash matchups across W15–W17 — championship-week ceiling`
        : `Elite playoff slate average — primed to spike when it matters most`,
    });
    usedStandoutNames.add(top.p.name);
  }

  // 2) Biggest ADP Steal — only if we have pick numbers and a clear positive delta
  if (hasPickNumbers) {
    const steals = valid.filter(p => p.actualPick != null && (p.actualPick - p.adp) >= 10)
                       .sort((a, b) => (b.actualPick - b.adp) - (a.actualPick - a.adp));
    const steal = steals.find(s => !usedStandoutNames.has(s.name) && !isLiability(s.name));
    if (steal) {
      const delta = Math.round(steal.actualPick - steal.adp);
      rosterStandouts.push({
        kind: "value",
        icon: "💰",
        label: "Biggest ADP Steal",
        player: steal,
        detail: `Drafted ${delta} picks later than ADP — pure value at the cost`,
      });
      usedStandoutNames.add(steal.name);
    }
  }

  // 3) Field Differentiator — stacked player on a low-chalk / sharp team
  const leverageStack = stackGrades.find(s =>
    s.uniqueness && (s.uniqueness.includes("High") || s.uniqueness === "Moderate Leverage")
  );
  if (leverageStack) {
    const anchor = [...leverageStack.players]
      .filter(p => !usedStandoutNames.has(p.name) && !isLiability(p.name))
      .sort((a, b) => a.adp - b.adp)[0] || 
      [...leverageStack.players].sort((a, b) => a.adp - b.adp)[0];
    if (anchor && !usedStandoutNames.has(anchor.name)) {
      rosterStandouts.push({
        kind: "leverage",
        icon: "🎯",
        label: "Field Leverage",
        player: anchor,
        detail: `${leverageStack.team} stack runs against the chalk — you'll own this game when others don't`,
      });
      usedStandoutNames.add(anchor.name);
    }
  }

  // 4) Stack Anchor — highest ADP player across all stacks (the ceiling carrier)
  const allStackPlayers = stackGrades.flatMap(s => s.players);
  const stackAnchor = allStackPlayers
    .filter(p => !usedStandoutNames.has(p.name) && !isLiability(p.name))
    .sort((a, b) => a.adp - b.adp)[0];
  if (stackAnchor) {
    const anchorStack = stackGrades.find(s => s.players.some(p => p.name === stackAnchor.name));
    rosterStandouts.push({
      kind: "anchor",
      icon: "⚓",
      label: "Stack Anchor",
      player: stackAnchor,
      detail: `Your ${anchorStack?.team || ""} stack runs through them — when they pop, your whole week pops`,
    });
    usedStandoutNames.add(stackAnchor.name);
  }

  // 5) Smash Week Specialist — player with 2+ Smash matchups in playoff window (if not already picked)
  const smashSpecialist = playoffRanked.find(r =>
    r.matchups.filter(m => m.color === "elite").length >= 2 &&
    !usedStandoutNames.has(r.p.name)
  );
  if (smashSpecialist) {
    const smashWeeks = smashSpecialist.matchups
      .map((m, i) => m.color === "elite" ? ["W15","W16","W17"][i] : null)
      .filter(Boolean);
    rosterStandouts.push({
      kind: "smash",
      icon: "⚡",
      label: "Smash-Week Specialist",
      player: smashSpecialist.p,
      detail: `Elite matchups in ${smashWeeks.join(" + ")} — built-in spike potential`,
    });
    usedStandoutNames.add(smashSpecialist.p.name);
  }

  // 6) Late Round Dart — highest ADP player on roster (the upside flier)
  if (rosterStandouts.length < 5) {
    const dart = [...valid]
      .filter(p => !usedStandoutNames.has(p.name) && !isLiability(p.name) && p.adp >= 150)
      .sort((a, b) => b.adp - a.adp)[0];
    if (dart) {
      rosterStandouts.push({
        kind: "dart",
        icon: "🎲",
        label: "Late Round Dart",
        player: dart,
        detail: `High-upside flier — if the role clicks, this is your league-winner`,
      });
      usedStandoutNames.add(dart.name);
    }
  }

  // Cap at 5 standouts
  const finalStandouts = rosterStandouts.slice(0, 5);

  const nutshell = buildNutshell({ strengths, weaknesses, grade, score, mode: "bestball", adpFlags, primaryStacks, eliteStacks, verdictAlignments });

  // === SEASON SCHEDULE (advance-rate view) ===
  // Full W1-18 tier grid for every matched player, ADP-sorted so the first 9
  // rows are the same "core scorers" the Advance Rate Layer scores. Best ball
  // has no starters/bench, so the split is core/depth, not lineup slots.
  const seasonSchedules = [...valid]
    .filter(p => p.team && FULL_SCHEDULE[p.team])
    .sort((a, b) => (a.adp ?? 999) - (b.adp ?? 999))
    .map(p => ({
      name: p.name, pos: p.pos, team: p.team, adp: p.adp,
      weeklyMatchups: (FULL_SCHEDULE[p.team] || []).map((opp, weekIdx) => {
        if (!opp || opp === "BYE") return { week: weekIdx + 1, opp: "BYE", isBye: true };
        const m = getMatchupScoreForOpponent(opp, p.pos, useProjected);
        return { week: weekIdx + 1, opp, isBye: false, ...m };
      }),
    }));

  return {
    valid, picks, posCounts, stacks, stackGrades, adpFlags, benchmarkIssues,
    grade, strengths, weaknesses, goodStacks, eliteStacks, primaryStacks,
    tournament, hasPickNumbers, format, score, advanceLayer, ceilingLayer, seasonSchedules,
    bringBacks: mergedBringBacks, orphans, topPivots, byeMap, byeConflicts, verdictAlignments,
    rosterStandouts: finalStandouts,
    roleCeilingFlags,
    nutshell,
  };
};

// ============ REDRAFT LEAGUE CONFIGS ============

// Quick presets — 1-tap setup for common leagues
const REDRAFT_LEAGUES = {
  yahoo_std: {
    name: "Standard 12-Team",
    teams: 12,
    scoring: "Half-PPR",
    lineup: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1 },
    benchSize: 6,
    irSlots: 1,
    playoffWeeks: [15, 16, 17],
    note: "Yahoo default · Half-PPR · one bad week can end your season",
  },
  yahoo_ppr: {
    name: "PPR 12-Team",
    teams: 12,
    scoring: "PPR",
    lineup: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1 },
    benchSize: 6,
    irSlots: 1,
    playoffWeeks: [15, 16, 17],
    note: "Full PPR · receivers rewarded · WR depth wins leagues",
  },
  yahoo_std_10: {
    name: "10-Team Standard",
    teams: 10,
    scoring: "Half-PPR",
    lineup: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1 },
    benchSize: 6,
    irSlots: 1,
    playoffWeeks: [15, 16, 17],
    note: "10-team · talent pool is deeper · every waiver wire matters",
  },
};

// Default custom config — starting point when user opens Custom builder
const DEFAULT_CUSTOM_CONFIG = {
  teams: 12,
  scoring: "Half-PPR",
  lineup: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SFLEX: 0 },
  benchSize: 6,
  irSlots: 1,
  playoffWeeks: [15, 16, 17],
};

// Build a league object from custom config (matches REDRAFT_LEAGUES shape)
const buildLeagueFromConfig = (cfg) => {
  const hasSflex = (cfg.lineup.SFLEX || 0) >= 1;
  const isSuperflex = cfg.lineup.QB >= 2 || hasSflex;
  const playoffLabel = cfg.playoffWeeks[0] === 14 ? "W14-16" : "W15-17";
  const lineupSummary = Object.entries(cfg.lineup)
    .filter(([, c]) => c > 0)
    .map(([p, c]) => `${c}${p}`)
    .join("·");
  return {
    name: `Custom ${cfg.teams}-Team${isSuperflex ? " SF" : ""}`,
    teams: cfg.teams,
    scoring: cfg.scoring,
    lineup: cfg.lineup,
    benchSize: cfg.benchSize,
    irSlots: cfg.irSlots,
    playoffWeeks: cfg.playoffWeeks,
    note: `${lineupSummary} · ${cfg.scoring} · ${playoffLabel} · ${cfg.benchSize} bench`,
    isCustom: true,
    isSuperflex,
  };
};

// Position-vs-opponent ceiling calculator using FPA + adjustments
const getMatchupScoreForOpponent = (opp, pos, useProjected = false) => {
  const oppClean = opp.replace("@", "");
  if (oppClean === "BYE") return null;
  let pts = FPA[pos]?.[oppClean];
  if (pts == null) return { score: 3, tier: "Unknown" };
  // Same sign convention + Jul 16 2026 inversion fix as getMatchupTier.
  const adj = COACHING_ADJ[oppClean];
  if (adj) pts += adj.all;
  if (useProjected) {
    const offAdj = OFFSEASON_ADJ_2026[oppClean];
    if (offAdj) {
      const delta = offAdj[pos.toLowerCase()];
      if (delta != null) pts += delta;
    }
  }
  const allPts = Object.values(FPA[pos]).sort((a, b) => b - a);
  const rankIdx = allPts.findIndex(v => v <= pts);
  // Below-minimum pts = tougher than every defense — worst rank, not rank 0/Smash.
  const rank = rankIdx === -1 ? allPts.length + 1 : rankIdx + 1;
  if (rank <= 8) return { score: 5, tier: "Smash", color: "elite" };
  if (rank <= 14) return { score: 4, tier: "Good", color: "solid" };
  if (rank <= 20) return { score: 3, tier: "Even", color: "neutral" };
  if (rank <= 26) return { score: 2, tier: "Hard", color: "tough" };
  return { score: 1, tier: "Avoid", color: "wall" };
};

// ============ REDRAFT ANALYZER ============

const analyzeRedraft = (picks, leagueOrKey = "yahoo_std", hasPickNumbers = false, useProjected = false) => {
  // Accept either a preset key (string) or a resolved league object (custom)
  const league = typeof leagueOrKey === "string"
    ? REDRAFT_LEAGUES[leagueOrKey]
    : leagueOrKey;
  const valid = picks.filter(p => !p.notFound);

  const posCounts = { QB: 0, RB: 0, WR: 0, TE: 0 };
  valid.forEach(p => { posCounts[p.pos] = (posCounts[p.pos] || 0) + 1; });

  // Sort by ADP (best players first) — assume highest-ADP go in starting lineup
  const sorted = [...valid].sort((a, b) => a.adp - b.adp);

  // Build optimal starting lineup based on lineup config
  const startingLineup = { QB: [], RB: [], WR: [], TE: [], FLEX: [], SFLEX: [] };
  const used = new Set();

  // Fill required slots first
  ["QB", "RB", "WR", "TE"].forEach(pos => {
    const required = league.lineup[pos] || 0;
    const candidates = sorted.filter(p => p.pos === pos && !used.has(p.name));
    candidates.slice(0, required).forEach(p => {
      startingLineup[pos].push(p);
      used.add(p.name);
    });
  });

  // Fill FLEX (RB/WR/TE)
  if (league.lineup.FLEX) {
    const flexCandidates = sorted.filter(p =>
      !used.has(p.name) && ["RB", "WR", "TE"].includes(p.pos)
    );
    flexCandidates.slice(0, league.lineup.FLEX).forEach(p => {
      startingLineup.FLEX.push(p);
      used.add(p.name);
    });
  }

  // Fill SFLEX (QB first, then RB/WR/TE as fallback)
  if (league.lineup.SFLEX) {
    const sflexCandidates = sorted.filter(p =>
      !used.has(p.name) && ["QB", "RB", "WR", "TE"].includes(p.pos)
    );
    // Prefer QB in SFLEX — best available QB first, then best skill player
    const qbCandidates = sflexCandidates.filter(p => p.pos === "QB");
    const skillCandidates = sflexCandidates.filter(p => p.pos !== "QB");
    const sflexPick = qbCandidates.length > 0 ? qbCandidates[0] : skillCandidates[0];
    if (sflexPick) {
      startingLineup.SFLEX.push(sflexPick);
      used.add(sflexPick.name);
    }
  }

  // All starters
  const allStarters = [
    ...startingLineup.QB, ...startingLineup.RB, ...startingLineup.WR,
    ...startingLineup.TE, ...startingLineup.FLEX, ...startingLineup.SFLEX
  ];

  // Bench = everyone not in starting lineup
  const bench = sorted.filter(p => !used.has(p.name));

  // === REGULAR SEASON SCHEDULE STRENGTH ===
  // For each starter, calculate avg matchup difficulty across regular season (W1-W14)
  // Using Vegas win totals of opponents as proxy
  // Helper: compute weekly matchup data for any player (used for both starters + bench)
  const buildScheduleEntry = (player) => {
    const fullSchedule = FULL_SCHEDULE[player.team] || [];
    const oppWinTotals = [];
    let hardWeeks = 0;
    let softWeeks = 0;
    const weeklyMatchups = fullSchedule.map((opp, weekIdx) => {
      if (!opp || opp === "BYE") return { week: weekIdx + 1, opp: "BYE", isBye: true };
      const m = getMatchupScoreForOpponent(opp, player.pos, useProjected);
      return { week: weekIdx + 1, opp, isBye: false, ...m };
    });
    fullSchedule.forEach((opp) => {
      if (opp === "BYE") return;
      const oppClean = opp.replace("@", "");
      const wt = WIN_TOTALS[oppClean];
      if (wt != null) {
        oppWinTotals.push(wt);
        if (wt >= 10.5) hardWeeks++;
        if (wt <= 6.5) softWeeks++;
      }
    });
    const avgOppWT = oppWinTotals.length > 0
      ? oppWinTotals.reduce((a, b) => a + b, 0) / oppWinTotals.length
      : 8.5;
    return { ...player, avgOppWT, hardWeeks, softWeeks, fullSchedule, weeklyMatchups };
  };

  const starterSchedules = allStarters.map(buildScheduleEntry);
  const benchSchedules = bench.filter(p => p.team).map(buildScheduleEntry);

  // === PLAYOFF SCHEDULE STRENGTH (specific weeks based on league config) ===
  // Week weights: W17 is championship week — weighted heaviest
  const playoffWeekWeights = { 0: 1.0, 1: 1.2, 2: 1.8 }; // index: W15=0, W16=1, W17=2

  const playoffMatchups = allStarters.map(player => {
    const fullSchedule = FULL_SCHEDULE[player.team] || [];
    const playoffMatches = league.playoffWeeks.map(wk => {
      const opp = fullSchedule[wk - 1];
      if (!opp || opp === "BYE") return { week: wk, opp: "BYE", score: 0, tier: "BYE", color: "wall" };
      const m = getMatchupScoreForOpponent(opp, player.pos, useProjected);
      // Competitive balance boost: pick'em game (|spread| ≤ 3) AND high-scoring (total ≥ 46)
      // Two evenly-matched offenses elevate both ceilings — raw FPA undersells this environment
      // Hard → Even only: pick'em (|spread| ≤ 2) AND high-scoring (total ≥ 49)
      // Prevents hard matchups from being penalized as walls in true shootout environments
      // Does not boost Even or above — preserves tier variety
      const oppClean = opp.replace("@", "").trim().toUpperCase();
      const gameData = (PLAYOFF_GAME_TOTALS[`W${wk}`] || []).find(g => g.away === oppClean || g.home === oppClean);
      if (gameData && Math.abs(gameData.spread) <= 3 && gameData.total >= 49 && m && m.score === 2) {
        return { week: wk, opp, ...m, tier: "Even", color: "neutral", score: 3, competitiveBoost: true };
      }
      return { week: wk, opp, ...m };
    });
    // Raw total (unweighted) — used for display chip colors
    const totalScore = playoffMatches.reduce((sum, m) => sum + m.score, 0);
    // Weighted total — W17 counts 1.8x, W16 1.2x, W15 1.0x
    const weightedTotal = playoffMatches.reduce((sum, m, i) => sum + m.score * (playoffWeekWeights[i] || 1.0), 0);
    // Normalize weighted total back to 0-15 scale for consistent thresholds
    const maxWeightedPossible = 5 * (1.0 + 1.2 + 1.8); // 5 * 4.0 = 20
    const normalizedWeighted = (weightedTotal / maxWeightedPossible) * 15;
    return { ...player, playoffMatches, totalScore, normalizedWeighted };
  });

  // === BYE WEEK ANALYSIS (CRITICAL for redraft) ===
  const byeMap = {};
  valid.forEach(p => {
    const bye = BYES[p.team];
    if (!bye) return;
    if (!byeMap[bye]) byeMap[bye] = [];
    byeMap[bye].push(p);
  });

  // Check if a STARTING lineup position is fully wiped out by bye
  const starterByeMap = {};
  allStarters.forEach(p => {
    const bye = BYES[p.team];
    if (!bye) return;
    if (!starterByeMap[bye]) starterByeMap[bye] = {};
    starterByeMap[bye][p.pos] = (starterByeMap[bye][p.pos] || 0) + 1;
  });

  // Critical: count if all starters at a position share same bye
  // TE always streamable. QB streamable ONLY in 1QB leagues — in SF a QB bye is real.
  const qbIsStreamable = (league.lineup.QB || 1) < 2;
  const STREAMABLE = new Set(qbIsStreamable ? ["QB", "TE"] : ["TE"]);
  const criticalByeConflicts = [];
  Object.entries(starterByeMap).forEach(([wk, byPos]) => {
    Object.entries(byPos).forEach(([pos, count]) => {
      const required = league.lineup[pos] || 0;
      if (pos === "FLEX") return;
      if (STREAMABLE.has(pos)) {
        // Streamable position bye = info only, zero grade impact
        criticalByeConflicts.push({
          week: parseInt(wk), pos, count, required,
          severity: "info",
          msg: `${pos} on bye W${wk} — stream that week`,
        });
      } else if (count >= required && required > 0) {
        criticalByeConflicts.push({
          week: parseInt(wk), pos, count, required,
          severity: "critical",
          msg: `All ${required} starting ${pos}(s) on bye W${wk}`,
        });
      } else if (count >= 2) {
        criticalByeConflicts.push({
          week: parseInt(wk), pos, count,
          severity: "warning",
          msg: `${count} ${pos}s on bye W${wk}`,
        });
      }
    });
  });

  // === POSITIONAL DEPTH ANALYSIS ===
  const depthAnalysis = {};
  ["QB", "RB", "WR", "TE"].forEach(pos => {
    const players = sorted.filter(p => p.pos === pos);
    const starters = league.lineup[pos] || 0;
    const flexEligible = ["RB", "WR", "TE"].includes(pos) ? league.lineup.FLEX || 0 : 0;
    const needed = starters + flexEligible;
    const depth = players.length - needed;
    depthAnalysis[pos] = {
      count: players.length,
      needed: starters,        // pure starter slots (for "Need: N starter(s)" label)
      neededWithFlex: needed,  // starters + flex-eligible (for depth math)
      flexEligible,
      depth,
      players,
    };
  });

  // === HANDCUFF DETECTION ===
  // For RB1s (top 2 RBs by ADP), check if a backup on same team is rostered
  const topRBs = sorted.filter(p => p.pos === "RB").slice(0, 2);
  const handcuffStatus = topRBs.map(rb => {
    const teammates = valid.filter(p => p.team === rb.team && p.pos === "RB" && p.name !== rb.name);
    return {
      rb,
      hasHandcuff: teammates.length > 0,
      handcuff: teammates[0] || null,
    };
  });

  // === LEAGUE-DERIVED CONSTANTS (config-aware) ===
  const qbSlots = league.lineup.QB || 1;
  const teSlots = league.lineup.TE || 1;
  const sflexSlots = league.lineup.SFLEX || 0;
  const isSuperflex = qbSlots >= 2 || sflexSlots >= 1;
  const teamCount = league.teams || 12;

  // === STREAMING POSITION WARNING (config-aware, league-size gated) ===
  // In 10-team leagues bench spots are less scarce — streaming flags add noise
  // QB streamable only in 1QB leagues. In SF you genuinely need 3+ QBs.
  const streamingIssues = [];
  if (teamCount >= 12) {
    const qbWasteThreshold = qbSlots + 1;
    const teWasteThreshold = teSlots + 1;
    if (!isSuperflex && posCounts.QB > qbWasteThreshold) {
      streamingIssues.push(`${posCounts.QB} QBs rostered — only ${qbSlots} starts, QB is streamable past QB${qbWasteThreshold}`);
    } else if (isSuperflex && posCounts.QB > qbSlots + 2) {
      streamingIssues.push(`${posCounts.QB} QBs rostered — SF needs ${qbSlots}, but ${posCounts.QB} ties up bench`);
    }
    // Skip TE streaming waste if elite TE (ADP ≤30) already anchors the lineup
    const hasEliteTE = allStarters.some(p => p.pos === "TE" && p.adp <= 30);
    if (posCounts.TE > teWasteThreshold && !hasEliteTE) {
      streamingIssues.push(`${posCounts.TE} TEs rostered — TE streamable past TE${teSlots === 1 ? "1" : teSlots}`);
    }
  }

  // === STARTING LINEUP STRENGTH (config-aware) ===
  // Average ADP of starters = proxy for starting lineup quality.
  // Exclude QBs in superflex: 2 mid-round QBs drag the avg in a way that isn't
  // comparable to a 1QB league's single elite/streamed QB. Skill-position ADP
  // is the apples-to-apples quality signal across formats.
  const adpBaselineStarters = isSuperflex
    ? allStarters.filter(p => p.pos !== "QB")
    : allStarters;
  const avgStarterADP = adpBaselineStarters.length > 0
    ? adpBaselineStarters.reduce((sum, p) => sum + p.adp, 0) / adpBaselineStarters.length
    : allStarters.reduce((sum, p) => sum + p.adp, 0) / Math.max(allStarters.length, 1);

  // === GRADE CALCULATION ===
  let grade = "C";
  let strengths = [];
  let weaknesses = [];
  let score = 0;

  // === SCORING FORMAT MODIFIERS ===
  // PPR inflates WR/pass-catcher value; standard favors RB volume.
  // These multipliers adjust depth thresholds and bonus/penalty weights
  // so the same roster grades differently across formats as it should.
  const isPPR = league.scoring === "PPR";
  const isStd = league.scoring === "Standard";
  // PPR: WR depth bar is lower (easier to hit "strong"), RB depth bar slightly higher
  // Standard: opposite — RBs matter more, WR surplus penalized less
  const wrDepthBonus   = isPPR ? -1 : isStd ? 1 : 0;   // PPR = easier to hit wrStrong
  const rbDepthBonus   = isStd ? -1 : isPPR ? 1 : 0;   // Std = easier to hit rbStrong
  const wrPenaltyMult  = isPPR ? 1.3 : isStd ? 0.8 : 1; // PPR thin WR hurts more
  const rbPenaltyMult  = isStd ? 1.3 : isPPR ? 0.8 : 1; // Std thin RB hurts more
  const tePenaltyMult  = isPPR ? 1.3 : 1;               // PPR elite TE matters more

  // === SUPERFLEX DEPTH ADJUSTMENT ===
  // SF rosters dedicate 2 bench spots to QBs, leaving fewer slots for skill depth.
  // Reduce depth penalty scale so SF rosters aren't punished for correct construction.
  const sfDepthRelief = isSuperflex ? 0.75 : 1.0;

  // 1. Starting lineup quality (lower avg ADP = better)
  const teamScale = teamCount / 12;
  const eliteADP = 60 * teamScale;
  const strongADP = 90 * teamScale;
  const weakADP = 130 * teamScale;
  if (avgStarterADP <= eliteADP) {
    strengths.push("Elite starting lineup ADP");
    score += 2;
  } else if (avgStarterADP <= strongADP) {
    strengths.push("Strong starting lineup");
    score += 1;
  } else if (avgStarterADP >= weakADP) {
    weaknesses.push("Weak starting lineup ADP");
    score -= 1.5;
  }

  // 1b. Elite talent concentration bonus
  // Avg ADP undersells a roster with multiple true studs — reward it explicitly
  const eliteStud = allStarters.filter(p => p.adp && p.adp <= 20).length;
  const solidStud = allStarters.filter(p => p.adp && p.adp <= 40).length;
  if (eliteStud >= 3) {
    strengths.push(`${eliteStud} top-20 ADP studs — elite ceiling floor`);
    score += 1.5;
  } else if (eliteStud >= 2) {
    score += 0.75; // quiet bonus — two true studs is still exceptional
  }
  if (solidStud >= 4 && eliteStud < 3) {
    score += 0.5; // four top-40 starters is a deep quality build
  }

  // Match rate scale — suppresses depth penalties when roster is incomplete
  const matchRate = valid.length / Math.max(picks.length, 1);
  const depthPenaltyScale = matchRate >= 0.85 ? 1.0 : matchRate >= 0.70 ? 0.5 : 0.2;

  // Config-derived depth needs: needed = starters + FLEX-eligible + 1 buffer
  // Capped at 4 RBs and 4 WRs — beyond that is unrealistic for any standard roster size
  const flexSlots = league.lineup.FLEX || 0;
  const rbNeeded = Math.min(4, (league.lineup.RB || 0) + flexSlots + 1);
  const wrNeeded = Math.min(4, (league.lineup.WR || 0) + flexSlots + 1);
  const rbStrong = rbNeeded + 2;
  const wrStrong = wrNeeded + 2;
  // Effective strong thresholds after scoring format adjustment
  const effWrStrong = wrStrong + wrDepthBonus;
  const effRbStrong = rbStrong + rbDepthBonus;

  // 2. RB depth — critical in redraft, scaled to lineup + scoring format
  if (depthAnalysis.RB.count >= effRbStrong) {
    const label = isStd ? "strong injury insurance + scoring format fit" : "strong injury insurance";
    strengths.push(`${depthAnalysis.RB.count} RBs — ${label}`);
    score += isStd ? 1.3 : 1;
  } else if (depthAnalysis.RB.count < rbNeeded) {
    if (depthPenaltyScale >= 0.85) {
      weaknesses.push(`Only ${depthAnalysis.RB.count} RBs — thin (need ${rbNeeded}+ for ${league.lineup.RB}RB+FLEX)`);
    } else {
      weaknesses.push(`Only ${depthAnalysis.RB.count} RBs matched — may be incomplete`);
    }
    score -= 1.5 * depthPenaltyScale * rbPenaltyMult * sfDepthRelief;
  }

  // 3. WR depth — PPR elevates importance; standard depresses it
  if (depthAnalysis.WR.count >= effWrStrong) {
    const label = isPPR ? "strong depth — PPR asset" : "strong depth";
    strengths.push(`${depthAnalysis.WR.count} WRs — ${label}`);
    score += isPPR ? 0.8 : 0.5;
  } else if (depthAnalysis.WR.count < wrNeeded) {
    if (depthPenaltyScale >= 0.85) {
      weaknesses.push(`Only ${depthAnalysis.WR.count} WRs — thin (need ${wrNeeded}+ for ${league.lineup.WR}WR+FLEX)${isPPR ? " · hurts more in PPR" : ""}`);
    } else {
      weaknesses.push(`Only ${depthAnalysis.WR.count} WRs matched — may be incomplete`);
    }
    score -= 1 * depthPenaltyScale * wrPenaltyMult * sfDepthRelief;
  }

  // 3b. Bench depth floor — measured against dedicated starter slots only
  // FLEX is already accounted for in lineup construction; don't double-count it here
  const benchSize = league.benchSize || 6;
  const benchFloor = Math.max(1, Math.floor(benchSize / 4));
  const rbStarterSlots = league.lineup.RB || 2;
  const wrStarterSlots = league.lineup.WR || 2;
  const rbBench = depthAnalysis.RB.count - rbStarterSlots;
  const wrBench = depthAnalysis.WR.count - wrStarterSlots;
  if (depthPenaltyScale >= 0.85) {
    if (rbBench < benchFloor && depthAnalysis.RB.count >= rbNeeded) {
      weaknesses.push(`Shallow RB bench — ${Math.max(0, rbBench)} backup(s), floor is ${benchFloor}`);
      score -= 0.5 * sfDepthRelief;
    }
    if (wrBench < benchFloor && depthAnalysis.WR.count >= wrNeeded) {
      weaknesses.push(`Shallow WR bench — ${Math.max(0, wrBench)} backup(s), floor is ${benchFloor}`);
      score -= 0.5 * sfDepthRelief;
    }
  }

  // 3c. PPR-specific TE check — elite TE in PPR is a major edge; weak TE is a real hole
  if (isPPR) {
    const teStarters = allStarters.filter(p => p.pos === "TE");
    const eliteTE = teStarters.find(p => p.adp <= 30);
    const weakTE = teStarters.find(p => p.adp >= 100);
    if (eliteTE) {
      strengths.push(`Elite TE (${eliteTE.name.split(" ").pop()}) — major PPR edge`);
      score += 0.75;
    } else if (weakTE && teStarters.length === 1) {
      weaknesses.push(`Streaming TE in PPR — significant target-share hole`);
      score -= tePenaltyMult * 0.5;
    }
  }

  // 3d. PPR WR surplus bonus — stacking WRs is correct PPR construction
  if (isPPR && depthAnalysis.WR.count >= effWrStrong + 1) {
    strengths.push(`${depthAnalysis.WR.count} WRs — deep PPR-optimized room`);
    score += 0.4;
  }

  // 4. Bye conflicts — scaled by league size and bench depth
  // Critical bye in a deep-bench or shallow league hurts less — you can cover it
  const byeLeagueScale = teamCount >= 14 ? 1.2 : teamCount >= 12 ? 1.0 : 0.6;
  const criticalByes = criticalByeConflicts.filter(c => c.severity === "critical");
  if (criticalByes.length > 0) {
    criticalByes.forEach(c => weaknesses.push(c.msg));
    score -= criticalByes.length * 1.5 * byeLeagueScale;
  }
  const warningByes = criticalByeConflicts.filter(c => c.severity === "warning");
  if (warningByes.length >= 2) {
    weaknesses.push(`Multiple bye week stacks (${warningByes.length} conflicts)`);
    score -= 0.5 * byeLeagueScale;
  }
  // info byes (QB/TE) show in UI but never touch the score

  // 5. Handcuffs — contextual, not binary
  // Penalize absence only when BOTH: 12+ team league (thin waiver) AND shallow RB bench
  // In 10-team leagues or rosters with deep RB depth, no handcuff is defensible
  const withHandcuffs = handcuffStatus.filter(h => h.hasHandcuff);
  const rbBenchDepth = depthAnalysis.RB.count - (league.lineup.RB || 2);
  const thinWaiverLeague = teamCount >= 12;
  const shallowRBBench = rbBenchDepth < 2;
  if (withHandcuffs.length >= 1) {
    strengths.push(`${withHandcuffs.length}/${topRBs.length} RB1(s) handcuffed`);
    score += withHandcuffs.length * 0.5;
  } else if (topRBs.length >= 2 && thinWaiverLeague && shallowRBBench) {
    weaknesses.push("No RB1 handcuffs — consider adding one given thin bench depth");
    score -= 0.3;
  }

  // 6. Streaming positions wasted
  if (streamingIssues.length > 0) {
    streamingIssues.forEach(s => weaknesses.push(s));
    score -= streamingIssues.length * 0.4;
  }

  // 6b. Superflex QB sufficiency — need starters + 1 for bye/injury coverage
  // SFLEX counts as an additional QB-preferred slot
  const effectiveQBSlots = qbSlots + sflexSlots;
  if (isSuperflex) {
    if (posCounts.QB >= effectiveQBSlots + 1) {
      strengths.push(`${posCounts.QB} QBs — covers ${effectiveQBSlots} SF slot(s) + bye insurance`);
      score += 0.75;
    } else if (posCounts.QB < effectiveQBSlots) {
      weaknesses.push(`Critical: only ${posCounts.QB} QB(s) for ${effectiveQBSlots} SF slot(s) — can't fill lineup`);
      score -= 2.5;
    } else {
      weaknesses.push(`Exactly ${effectiveQBSlots} QBs for ${effectiveQBSlots} SF slot(s) — no bye/injury coverage`);
      score -= 0.75;
    }

    // SF QB quality — need at least 1 elite QB anchor
    const sfQBs = allStarters.filter(p => p.pos === "QB");
    const eliteSFQB = sfQBs.find(p => p.adp <= 40);
    const allWeakSFQBs = sfQBs.length >= 2 && sfQBs.every(p => p.adp >= 80);
    if (eliteSFQB) {
      strengths.push(`Elite QB anchor (${eliteSFQB.name.split(" ").pop()}) — SF edge`);
      score += 0.5;
    } else if (allWeakSFQBs) {
      weaknesses.push(`No top-tier QB — SF ceiling capped without elite QB1`);
      score -= 0.75;
    }
  }

  // 7. Playoff schedule strength — sliding scale, position-weighted, W17-aware
  const posWeightsPlayoff = { QB: 1.2, RB: 1.0, WR: 1.0, TE: 0.8 };

  // Position-weighted average of normalizedWeighted scores across all starters
  const playoffWeightedSum = playoffMatchups.reduce((sum, p) => {
    const pw = posWeightsPlayoff[p.pos] || 1.0;
    return sum + p.normalizedWeighted * pw;
  }, 0);
  const playoffWeightTotal = playoffMatchups.reduce((sum, p) => sum + (posWeightsPlayoff[p.pos] || 1.0), 0);
  const playoffAvg = playoffWeightTotal > 0 ? playoffWeightedSum / playoffWeightTotal : 0;

  // Sliding scale — granular reward/penalty based on overall playoff window quality
  if (playoffAvg >= 10.5) {
    strengths.push(`Elite playoff schedule across the roster — W17 championship window is a weapon`);
    score += 1.5;
  } else if (playoffAvg >= 9.0) {
    strengths.push(`Strong playoff schedule — majority of starters have soft W15-17 slates`);
    score += 1.0;
  } else if (playoffAvg >= 7.5) {
    strengths.push(`Decent playoff schedule — some soft spots in the championship window`);
    score += 0.5;
  } else if (playoffAvg < 4.5) {
    weaknesses.push(`Brutal playoff schedule — starters face tough W15-17 matchups across the board`);
    score -= 1.0;
  } else if (playoffAvg < 6.0) {
    weaknesses.push(`Difficult playoff schedule — limited upside weeks when it matters most`);
    score -= 0.5;
  }
  // 6.0-7.5 = neutral, no strength or weakness added

  // 8. Regular season schedule strength — weighted against starter quality
  // Elite players (low ADP) overcome tough schedules better than mediocre ones
  // Only flag when the hard-schedule starters are mostly mid/late-round picks
  const hardScheduleStarters = starterSchedules.filter(s => s.avgOppWT >= 9.5);
  if (hardScheduleStarters.length >= 4) {
    const eliteOnHardSchedule = hardScheduleStarters.filter(s => s.adp <= 30).length;
    const midOnHardSchedule = hardScheduleStarters.filter(s => s.adp > 60).length;
    // Only penalize if the hard-schedule starters are mid/late-round — elites absorb it
    if (midOnHardSchedule >= 3) {
      weaknesses.push(`${hardScheduleStarters.length} starters face top-tier regular season schedules`);
      score -= 0.5;
    } else if (eliteOnHardSchedule >= 3) {
      // Soft note only — elites can handle tough schedules
    }
  }

  // 9. ADP value/reach (with pick numbers)
  const reachThreshold = 15;
  const valueThreshold = 15;
  let adpFlags = [];
  if (hasPickNumbers) {
    adpFlags = valid.filter(p => p.actualPick != null && (p.adp == null || p.adp < 200)).map(p => ({
      ...p,
      delta: p.actualPick - p.adp,
    })).filter(p => Math.abs(p.delta) >= 8);
    const valuePicks = adpFlags.filter(p => p.delta >= valueThreshold);
    const reaches = adpFlags.filter(p => p.delta <= -reachThreshold);
    if (valuePicks.length >= 2) {
      strengths.push(`${valuePicks.length} ADP value picks`);
      score += Math.min(valuePicks.length * 0.4, 1.5);
    }
    if (reaches.length >= 3) {
      weaknesses.push(`${reaches.length} significant reaches`);
      score -= Math.min(reaches.length * 0.3, 1.2);
    }
  }

  // === SITUATION-BASED PENALTIES (redraft) ===
  // Mirrors best ball logic — objective situation flags only, no analyst opinion penalties.

  // Verdict alignments — note only, no score penalty
  const rdVerdictAlignments = [];
  valid.forEach(p => {
    const sit = SITUATIONS[normalize(p.name)];
    if (sit?.verdict) rdVerdictAlignments.push({ name: p.name, verdict: sit.verdict, stale: false });
  });
  const rdActiveFades = rdVerdictAlignments.filter(v => v.verdict === "fade" || v.verdict === "HARD FADE");
  const rdActiveTargets = rdVerdictAlignments.filter(v => v.verdict === "TARGET" || v.verdict.includes("TARGET"));
  if (rdActiveFades.length >= 2) {
    weaknesses.push(`${rdActiveFades.length} player(s) with situational concerns`);
  }
  if (rdActiveTargets.length >= 3) {
    strengths.push(`${rdActiveTargets.length} players in strong situations`);
    score += Math.min(rdActiveTargets.length * 0.3, 1.5);
  }

  // Confirmed committee RBs — objective penalty
  const rdConfirmedCommitteeRBs = valid.filter(p => {
    if (p.pos !== "RB") return false;
    const sit = SITUATIONS[normalize(p.name)];
    return sit?.riskFlags?.includes("confirmed_committee");
  });
  if (rdConfirmedCommitteeRBs.length >= 2) {
    const names = rdConfirmedCommitteeRBs.map(p => p.name.split(" ").slice(-1)[0]).join(", ");
    weaknesses.push(`${rdConfirmedCommitteeRBs.length} RB(s) in confirmed committees: ${names} — no defined lead role, ceiling capped`);
    score -= Math.min(rdConfirmedCommitteeRBs.length * 0.25, 1.0);
  } else if (rdConfirmedCommitteeRBs.length === 1) {
    const name = rdConfirmedCommitteeRBs[0].name.split(" ").slice(-1)[0];
    weaknesses.push(`${name} in confirmed committee — touches genuinely split, no workhorse path`);
    score -= 0.2;
  }

  // Role ceiling flags — slot_only and rz_dependent
  const rdRoleCeilingFlags = valid.map(p => {
    const sit = SITUATIONS[normalize(p.name)];
    return sit?.roleCeiling ? { ...p, roleCeiling: sit.roleCeiling } : null;
  }).filter(Boolean);
  const rdSlotOnly = rdRoleCeilingFlags.filter(p => p.roleCeiling === "slot_only");
  const rdRzDependent = rdRoleCeilingFlags.filter(p => p.roleCeiling === "rz_dependent");
  if (rdSlotOnly.length >= 1) {
    const names = rdSlotOnly.map(p => p.name.split(" ").slice(-1)[0]).join(", ");
    weaknesses.push(`${names} ${rdSlotOnly.length > 1 ? "have" : "has"} a limited role — gets targets but not the kind that tend to score`);
    score -= rdSlotOnly.length * 0.35;
  }
  if (rdRzDependent.length >= 1) {
    const names = rdRzDependent.map(p => p.name.split(" ").slice(-1)[0]).join(", ");
    weaknesses.push(`TD-dependent player${rdRzDependent.length > 1 ? "s" : ""}: ${names} — near-zero floor without scoring`);
    score -= rdRzDependent.length * 0.25;
  }

  // QB uncertainty — penalize any QB on roster with unconfirmed starting role
  // In redraft this matters more than best ball — floor is critical
  const rdUncertainQBs = valid.filter(p => {
    if (p.pos !== "QB") return false;
    const sit = SITUATIONS[normalize(p.name)];
    return sit?.riskFlags?.includes("qb_uncertainty");
  });
  if (rdUncertainQBs.length >= 1) {
    const names = rdUncertainQBs.map(p => p.name.split(" ").slice(-1)[0]).join(", ");
    weaknesses.push(`QB uncertainty: ${names} — starting role unconfirmed, floor at risk`);
    score -= rdUncertainQBs.length * 0.4; // slightly heavier than BB — floor matters more in redraft
  }

  // Convert to grade — normalized by league difficulty
  // Larger leagues and superflex formats have shallower player pools;
  // the same raw score means more in a 14-team SF than a 10-team standard
  const difficultyShift = (() => {
    let shift = 0;
    if (teamCount >= 14) shift += 0.5;
    else if (teamCount <= 10) shift -= 0.3;
    if (isSuperflex) shift += 0.4;
    return shift;
  })();

  if (score >= 5 - difficultyShift) grade = "A";
  else if (score >= 3.5 - difficultyShift) grade = "A-";
  else if (score >= 2 - difficultyShift) grade = "B+";
  else if (score >= 0.5 - difficultyShift) grade = "B";
  else if (score >= -1 - difficultyShift) grade = "C+";
  else if (score >= -2.5 - difficultyShift) grade = "C";
  else grade = "D";

  // === LINEUP CONFIDENCE — per-week start/sit intel with bench swap suggestions ===
  const lineupConfidence = Array.from({ length: 17 }, (_, wkIdx) => {
    const week = wkIdx + 1;

    // Build starter entries with their slot (FLEX vs positional)
    const entries = [];
    Object.entries(startingLineup).forEach(([slot, players]) => {
      players.forEach(player => {
        const m = starterSchedules.find(s => s.name === player.name);
        const matchup = m?.weeklyMatchups?.[wkIdx];
        if (!matchup) return;
        entries.push({
          name: player.name,
          pos: player.pos,
          team: player.team,
          adp: player.adp,
          slot, // "RB", "WR", "TE", "QB", "FLEX", "SFLEX"
          matchup,
        });
      });
    });

    // Group starters by position for same-pos decision logic
    const byPos = {};
    entries.forEach(e => {
      if (!byPos[e.pos]) byPos[e.pos] = [];
      byPos[e.pos].push(e);
    });

    const locks = [];
    const concerns = [];

    entries.forEach(p => {
      if (p.matchup.isBye) return;
      const samePoStarters = byPos[p.pos] || [];
      const isFlexSlot = p.slot === "FLEX" || p.slot === "SFLEX";

      // Lock: elite matchup — highlight if 2+ at same pos OR in flex (always worth noting)
      if (p.matchup.color === "elite" && (samePoStarters.length >= 2 || isFlexSlot)) {
        locks.push({ ...p });
      }

      // Concern: wall matchup — find best bench swap suggestion
      if (p.matchup.color === "wall") {
        // Find bench players with better matchups
        const benchOptions = benchSchedules
          .map(bs => {
            const bm = bs.weeklyMatchups?.[wkIdx];
            if (!bm || bm.isBye) return null;
            const score = bm.score || 0;
            if (score <= (p.matchup.score || 0)) return null; // not an upgrade
            return { ...bs, matchup: bm, score };
          })
          .filter(Boolean)
          .sort((a, b) => b.score - a.score);

        // Prefer same-position bench option first
        const samePosOption = benchOptions.find(b => b.pos === p.pos);
        // Fallback: best flex-eligible bench option (RB/WR/TE) for FLEX slot concerns
        const flexOption = isFlexSlot
          ? benchOptions.find(b => ["RB","WR","TE"].includes(b.pos))
          : null;

        const suggestion = samePosOption || (isFlexSlot ? flexOption : null);

        // Build disclaimer flags
        const disclaimers = [];
        if (suggestion) {
          const isCrossPos = suggestion.pos !== p.pos;
          if (isCrossPos) {
            disclaimers.push("Cross-position swap — verify your lineup still fills all required slots");
          }
          // Same team as any other starter?
          const sharesTeam = entries.some(s => s.name !== p.name && s.team === suggestion.team);
          if (sharesTeam) {
            const teammate = entries.find(s => s.name !== p.name && s.team === suggestion.team);
            disclaimers.push(`Same team as ${teammate?.name?.split(" ").pop()} — shared target pool, correlated risk`);
          }
        }

        concerns.push({ ...p, suggestion, disclaimers });
      }
    });

    if (locks.length === 0 && concerns.length === 0) return null;
    return { week, locks, concerns };
  }).filter(Boolean);

  const lineupConfidencePreview = lineupConfidence; // all 17 weeks including W15–17 playoffs

  // === BENCH MOVES ALERTS ===
  const benchAlerts = [];

  benchSchedules.forEach(bp => {
    // Upcoming matchup window: next 4 weeks starting from W1 (treat all as "now")
    // We surface based on any 3+ favorable weeks in full schedule, or bye-fill potential
    const upcomingMatchups = bp.weeklyMatchups.filter(m => !m.isBye);
    const smashCount = upcomingMatchups.filter(m => m.color === "elite").length;
    const goodOrBetter = upcomingMatchups.filter(m => m.color === "elite" || m.color === "solid").length;

    // 1. LOCK-IN HANDCUFF: bench RB whose starter teammate is in top 3 RBs
    if (bp.pos === "RB") {
      const pairedStarter = allStarters.find(s => s.pos === "RB" && s.team === bp.team);
      if (pairedStarter) {
        const starterRank = sorted.filter(p => p.pos === "RB").findIndex(p => p.name === pairedStarter.name);
        if (starterRank <= 2) {
          // Find best upcoming matchup week for the handcuff
          const bestMatchup = upcomingMatchups.sort((a, b) => (b.score || 0) - (a.score || 0))[0];
          benchAlerts.push({
            type: "handcuff",
            emoji: "🛡",
            label: "Lock-In Handcuff",
            player: bp,
            detail: `Backs up ${pairedStarter.name}`,
            matchupNote: bestMatchup ? `Best matchup: W${bestMatchup.week} vs ${bestMatchup.opp.replace("@","")} (${bestMatchup.tier})` : null,
            urgency: "high",
          });
          return; // don't double-classify
        }
      }
    }

    // 2. STREAMER ALERT: bench QB or TE with 5+ good-or-better matchups
    // Suppress if this player's position already flagged as streaming waste — contradictory
    const posAlreadyFlaggedAsWaste = streamingIssues.some(s =>
      s.includes(`${bp.pos}`) && s.toLowerCase().includes("streamable")
    );
    if ((bp.pos === "QB" || bp.pos === "TE") && goodOrBetter >= 5 && !posAlreadyFlaggedAsWaste) {
      benchAlerts.push({
        type: "streamer",
        emoji: "📈",
        label: "Streamer Alert",
        player: bp,
        detail: `${goodOrBetter} favorable matchups this season`,
        matchupNote: smashCount >= 3 ? `${smashCount} Smash weeks — rotation candidate` : `${goodOrBetter} Good+ matchups — worth a start`,
        urgency: "medium",
      });
      return;
    }

    // 3. BYE-WEEK FILL: bench player who covers a starter's bye at same position
    const startersSamePos = allStarters.filter(s => s.pos === bp.pos);
    const byeWeekFills = startersSamePos.filter(s => {
      const starterBye = BYES[s.team];
      const benchBye = BYES[bp.team];
      if (!starterBye || starterBye === benchBye) return false;
      // Check bench player's matchup in the starter's bye week
      const byeMatchup = bp.weeklyMatchups.find(m => m.week === starterBye);
      return byeMatchup && !byeMatchup.isBye && (byeMatchup.color === "elite" || byeMatchup.color === "solid");
    });
    if (byeWeekFills.length > 0) {
      const filledStarter = byeWeekFills[0];
      const starterBye = BYES[filledStarter.team];
      const byeMatchup = bp.weeklyMatchups.find(m => m.week === starterBye);
      benchAlerts.push({
        type: "bye_fill",
        emoji: "🎯",
        label: "Bye-Week Fill",
        player: bp,
        detail: `Covers ${filledStarter.name}'s bye (W${starterBye})`,
        matchupNote: byeMatchup ? `W${byeMatchup.week} vs ${byeMatchup.opp.replace("@","")} — ${byeMatchup.tier}` : null,
        urgency: "medium",
      });
      return;
    }

    // 4. SAFE STASH: rostered bench player with upside but no near-term action
    // Only flag RBs/WRs with decent ADP (under 100) who aren't already classified
    if ((bp.pos === "RB" || bp.pos === "WR") && bp.adp <= 100) {
      benchAlerts.push({
        type: "stash",
        emoji: "🔻",
        label: "Safe Stash",
        player: bp,
        detail: `ADP ${bp.adp} — holding for opportunity`,
        matchupNote: smashCount >= 2 ? `${smashCount} Smash weeks ahead when the role opens` : "Monitor depth chart for role clarity",
        urgency: "low",
      });
    }
  });

  // Deduplicate: one alert per player, highest urgency wins
  const urgencyRank = { high: 3, medium: 2, low: 1 };
  const alertMap = new Map();
  benchAlerts.forEach(a => {
    const existing = alertMap.get(a.player.name);
    if (!existing || urgencyRank[a.urgency] > urgencyRank[existing.urgency]) {
      alertMap.set(a.player.name, a);
    }
  });
  const benchMoves = Array.from(alertMap.values())
    .sort((a, b) => urgencyRank[b.urgency] - urgencyRank[a.urgency]);

  return {
    valid, picks, posCounts, league,
    startingLineup, allStarters, bench,
    starterSchedules, benchSchedules, playoffMatchups,
    byeMap, criticalByeConflicts,
    depthAnalysis, handcuffStatus, streamingIssues,
    adpFlags, hasPickNumbers,
    grade, strengths, weaknesses, score,
    mode: "redraft",
    avgStarterADP,
    isSuperflex, qbSlots, teamCount,
    rbNeeded, wrNeeded, rbStrong, wrStrong, benchFloor,
    benchMoves,
    lineupConfidencePreview,
    nutshell: buildNutshell({ strengths, weaknesses, grade, score, mode: "redraft", adpFlags }),
  };
};

// ============ CURRENT NFL WEEK ============
// Season opener is the Thursday after Labor Day 2026.
//
// Parsed with an explicit time so it lands at LOCAL midnight. "2026-09-10"
// on its own is parsed as UTC midnight, which is 5pm Sep 9 on the west
// coast, so the week used to advance an evening early for anyone west of
// UTC.
const SEASON_START = new Date("2026-09-10T00:00:00");
const FINAL_WEEK = 18;

const getNflWeek = (now = new Date()) => {
  if (now < SEASON_START) return { week: 1, inSeason: false };
  const week = Math.floor((now - SEASON_START) / (7 * 24 * 60 * 60 * 1000)) + 1;
  // Past the final week the season is OVER. The old code clamped with
  // Math.min(18, ...), which pinned the UI at "Week 18" from January
  // straight through the following summer.
  if (week > FINAL_WEEK) return { week: 1, inSeason: false };
  return { week, inSeason: true };
};

// ============ SCHEDULE IMAGE EXPORT ============
// Draws the full 18-week schedule grid to a canvas and hands back a PNG blob.
//
// Why canvas and not a screenshot of the live DOM: on screen the grid is a
// horizontally scrolling table with a sticky name column, so an html2canvas
// style capture would either clip at the viewport or double-render the sticky
// column. Drawing it directly also means all 18 weeks land in ONE image at
// print resolution, which is the whole point of exporting it. Costs no new
// dependency.
//
// Colors are the resolved hex of the same CSS variables tierStyle() uses on
// screen — canvas cannot read var(). If the palette in the <style> block
// changes, change it here too or the export silently drifts from the app.
const EXPORT_TIER_COLORS = {
  elite:   { bg: "#0d3320", border: "#22c55e", text: "#4ade80", label: "Smash" },
  solid:   { bg: "#1e2a1a", border: "#84cc16", text: "#a3e635", label: "Good" },
  neutral: { bg: "#2a2618", border: "#eab308", text: "#facc15", label: "Even" },
  tough:   { bg: "#2a1a18", border: "#f97316", text: "#fb923c", label: "Hard" },
  wall:    { bg: "#2e1414", border: "#ef4444", text: "#f87171", label: "Avoid" },
};
const EXPORT_BYE = { bg: "#141418", border: "#2a2a32", text: "#55555f" };

const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const renderScheduleCanvas = ({ starters, bench, grade, subtitle, adpUpdated, sectionLabels }) => {
  // Redraft exports keep the default lineup framing; best ball passes its own
  // labels (core scorers / depth) — "starters and bench" is meaningless there.
  const labels = sectionLabels || { top: "STARTERS", rest: "BENCH" };
  const DPR = 2;                       // retina — the grid is dense, 1x reads muddy
  const PAD = 30, NAME_W = 200, CELL_W = 46, CELL_H = 28, GAP = 4;
  const ROW_H = 36, DIV_W = 12;        // DIV_W = the playoff separator gutter
  const WEEKS = 18, PLAYOFF_START = 15;

  const gridW = WEEKS * (CELL_W + GAP) + DIV_W;
  const W = PAD * 2 + NAME_W + gridW;
  const headerH = 96, colHeadH = 26, legendH = 54, footerH = 26;
  const sectionH = 26;
  const bodyH =
    sectionH + starters.length * ROW_H +
    (bench.length ? sectionH + bench.length * ROW_H : 0);
  const H = headerH + colHeadH + bodyH + legendH + footerH + PAD;

  const canvas = document.createElement("canvas");
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext("2d");
  ctx.scale(DPR, DPR);
  const MONO = "'IBM Plex Mono','JetBrains Mono',ui-monospace,monospace";

  ctx.fillStyle = "#0a0a0f";
  ctx.fillRect(0, 0, W, H);

  // --- header ---
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#c084fc";
  ctx.font = `700 26px ${MONO}`;
  ctx.fillText("ROSTERXRAY", PAD, PAD + 22);
  const brandW = ctx.measureText("ROSTERXRAY").width;
  ctx.fillStyle = "#55555f";
  ctx.font = `400 13px ${MONO}`;
  ctx.fillText("SEASON SCHEDULE", PAD + brandW + 12, PAD + 22);

  if (grade) {
    ctx.font = `700 34px ${MONO}`;
    ctx.fillStyle = grade.startsWith("A") ? "#4ade80"
      : grade.startsWith("B") ? "#a3e635"
      : grade.startsWith("C") ? "#facc15" : "#f87171";
    ctx.textAlign = "right";
    ctx.fillText(grade, W - PAD, PAD + 26);
    ctx.textAlign = "left";
  }
  if (subtitle) {
    ctx.fillStyle = "#8a8a96";
    ctx.font = `400 12px ${MONO}`;
    ctx.fillText(subtitle, PAD, PAD + 44);
  }
  ctx.strokeStyle = "#2a1a3a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, headerH - 12);
  ctx.lineTo(W - PAD, headerH - 12);
  ctx.stroke();

  // x position of a given week column (0-indexed), accounting for the gutter
  const colX = (i) => PAD + NAME_W + i * (CELL_W + GAP) + (i + 1 >= PLAYOFF_START ? DIV_W : 0);

  // --- week header ---
  const chY = headerH + 14;
  ctx.font = `600 11px ${MONO}`;
  ctx.textAlign = "center";
  for (let i = 0; i < WEEKS; i++) {
    const wk = i + 1;
    const isPlayoff = wk >= PLAYOFF_START && wk <= 17;
    ctx.fillStyle = isPlayoff ? "#c084fc" : "#55555f";
    ctx.fillText(`W${wk}`, colX(i) + CELL_W / 2, chY);
  }
  ctx.textAlign = "left";

  // playoff separator, drawn full height of the grid body
  const gridTop = headerH + colHeadH - 6;
  const gridBottom = headerH + colHeadH + bodyH;
  ctx.strokeStyle = "#4a2a6a";
  ctx.beginPath();
  ctx.moveTo(colX(PLAYOFF_START - 1) - GAP - DIV_W / 2, gridTop);
  ctx.lineTo(colX(PLAYOFF_START - 1) - GAP - DIV_W / 2, gridBottom);
  ctx.stroke();

  // --- rows ---
  let y = headerH + colHeadH;
  const drawSection = (label) => {
    ctx.fillStyle = "#55555f";
    ctx.font = `600 10px ${MONO}`;
    ctx.fillText(label, PAD, y + 16);
    y += sectionH;
  };
  const drawRow = (s) => {
    const cy = y + (ROW_H - CELL_H) / 2;
    ctx.fillStyle = "#e8e8ef";
    ctx.font = `600 13px ${MONO}`;
    // Name and "POS · TEAM" sit on separate lines, so the name gets the whole
    // column minus a gutter. Reserving width for the meta line here was what
    // clipped "Christian Mccaffrey" to "Christian Mccaf…".
    let nm = s.name || "";
    while (ctx.measureText(nm).width > NAME_W - 16 && nm.length > 3) nm = nm.slice(0, -1);
    if (nm !== s.name) nm += "…";
    ctx.fillText(nm, PAD, cy + 12);
    ctx.fillStyle = "#8a8a96";
    ctx.font = `400 10px ${MONO}`;
    ctx.fillText(`${s.pos} · ${s.team}`, PAD, cy + 24);

    (s.weeklyMatchups || []).forEach((m, i) => {
      if (i >= WEEKS) return;
      const x = colX(i);
      const c = m.isBye ? EXPORT_BYE : (EXPORT_TIER_COLORS[m.color] || EXPORT_TIER_COLORS.neutral);
      ctx.fillStyle = c.bg;
      roundRect(ctx, x, cy, CELL_W, CELL_H, 3);
      ctx.fill();
      ctx.strokeStyle = c.border;
      ctx.lineWidth = 1;
      roundRect(ctx, x + 0.5, cy + 0.5, CELL_W - 1, CELL_H - 1, 3);
      ctx.stroke();
      ctx.fillStyle = c.text;
      ctx.font = `600 10px ${MONO}`;
      ctx.textAlign = "center";
      ctx.fillText(m.isBye ? "BYE" : String(m.opp), x + CELL_W / 2, cy + CELL_H / 2 + 4);
      ctx.textAlign = "left";
    });
    y += ROW_H;
  };

  drawSection(labels.top);
  starters.forEach(drawRow);
  if (bench.length) {
    drawSection(labels.rest);
    bench.forEach(drawRow);
  }

  // --- legend ---
  y += 16;
  let lx = PAD;
  ctx.font = `600 10px ${MONO}`;
  Object.values(EXPORT_TIER_COLORS).forEach((c) => {
    ctx.fillStyle = c.bg;
    roundRect(ctx, lx, y, 16, 13, 2);
    ctx.fill();
    ctx.strokeStyle = c.border;
    roundRect(ctx, lx + 0.5, y + 0.5, 15, 12, 2);
    ctx.stroke();
    ctx.fillStyle = c.text;
    ctx.fillText(c.label, lx + 22, y + 11);
    lx += 22 + ctx.measureText(c.label).width + 18;
  });
  ctx.fillStyle = "#c084fc";
  ctx.fillText("W15–W17 = fantasy playoffs", lx + 4, y + 11);

  // --- footer ---
  ctx.fillStyle = "#55555f";
  ctx.font = `400 10px ${MONO}`;
  ctx.fillText(`rosterxray.com · matchup tiers from 2025 defensive data${adpUpdated ? ` · ADP ${adpUpdated}` : ""}`, PAD, H - PAD + 8);

  return canvas;
};

// Save the canvas. On iOS/Android the Web Share sheet is the only route into
// Photos or Messages, so prefer it when the platform will actually take a file
// and fall back to a plain download on desktop.
const saveScheduleImage = async (canvas, filename) => {
  const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
  if (!blob) throw new Error("Could not render image");
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Season schedule" });
      return "shared";
    } catch (err) {
      if (err && err.name === "AbortError") return "cancelled";
      // fall through to download — share can fail on desktop Safari
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
};

// ============ COMPONENT ============

export default function RosterScorer() {
  const [input, setInput] = useState("");
  const [analyzed, setAnalyzed] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState(null);
  const [debugResponse, setDebugResponse] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [mode, setMode] = useState("paste"); // "upload" | "paste" — paste leads (reliable path; upload requires API)
  const [tournament, setTournament] = useState("main");
  const [tournamentDropdownOpen, setTournamentDropdownOpen] = useState(false);
  const [redraftDropdownOpen, setRedraftDropdownOpen] = useState(false);
  const [analysisMode, setAnalysisMode] = useState("bestball"); // "bestball" | "redraft"
  const [redraftLeague, setRedraftLeague] = useState("yahoo_std");
  const [customConfig, setCustomConfig] = useState(DEFAULT_CUSTOM_CONFIG);
  const [customExpanded, setCustomExpanded] = useState(false);
  const [benchExpanded, setBenchExpanded] = useState(false);
  // idle | working | saved | error — drives the export button label only
  const [scheduleExport, setScheduleExport] = useState("idle");
  // Best-ball season grid is deliberately secondary: collapsed until opened.
  const [bbScheduleOpen, setBbScheduleOpen] = useState(false);
  // Ceiling rankings panel — informational, collapsed by default.
  const [ceilingOpen, setCeilingOpen] = useState(false);
  // Selected week in the Lineup Confidence strip. null = follow the calendar
  // (current week in season, W1 otherwise) so a fresh grade always opens on
  // the week that matters without the user touching anything.
  const [lcWeek, setLcWeek] = useState(null);
  const [exportingCard, setExportingCard] = useState(false);
  const [exportedDataUrl, setExportedDataUrl] = useState(null);
  const [gradeExplainerOpen, setGradeExplainerOpen] = useState(false);
  const [heroCollapsed, setHeroCollapsed] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [showPickAnalysis, setShowPickAnalysis] = useState(false);
  const [uploadTabClicked, setUploadTabClicked] = useState(false);
  const [dataMode, setDataMode] = useState("actual");
  const [adjCoverageOpen, setAdjCoverageOpen] = useState(false);
  const [aiNutshell, setAiNutshell] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  // The AI pass used to fail silently and fall through to the template nutshell,
  // which renders in the same box with the same styling — so a failed call was
  // indistinguishable from a successful one except for a missing "✦ AI" badge.
  // That also silently skipped the grade modifier, meaning the same roster could
  // grade differently depending on whether a network call happened to succeed.
  const [aiFailed, setAiFailed] = useState(false);
  const [aiPivotNotes, setAiPivotNotes] = useState({});
  const [aiStandoutDetails, setAiStandoutDetails] = useState({});
  const [aiBenchMoveNotes, setAiBenchMoveNotes] = useState({});
  const [aiLineupNotes, setAiLineupNotes] = useState({});
  const [aiBringBackNotes, setAiBringBackNotes] = useState({});
  const [gradeHistory, setGradeHistory] = useState([]);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(true);
  const [shareLinkLoading, setShareLinkLoading] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [shareLinkError, setShareLinkError] = useState(false);
  const [sharedView, setSharedView] = useState(false);
  const [cachedShareUrl, setCachedShareUrl] = useState(null);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [tradeGive, setTradeGive] = useState("");
  const [tradeGet, setTradeGet] = useState("");
  const [tradeResult, setTradeResult] = useState(null);
  const [tradeError, setTradeError] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // === ADMIN PANEL STATE ===
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState(false);
  const [adminNews, setAdminNews] = useState({});
  const [adminNewsLoaded, setAdminNewsLoaded] = useState(false);
  const [adminPlayerName, setAdminPlayerName] = useState("");
  const [adminNewsText, setAdminNewsText] = useState("");
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminVerifying, setAdminVerifying] = useState(false);
  const [adminVerifyResult, setAdminVerifyResult] = useState(null);
  const [adminSaveSuccess, setAdminSaveSuccess] = useState(false);
  const [adminError, setAdminError] = useState(null);
  const [kvNews, setKvNews] = useState({});
  const [adminImportText, setAdminImportText] = useState("");
  const [adminImporting, setAdminImporting] = useState(false);
  const [adminImportSuccess, setAdminImportSuccess] = useState(false);
  const [adminImportError, setAdminImportError] = useState(null);

  // Load KV news on mount — merges with hardcoded RECENT_NEWS, KV takes priority
  React.useEffect(() => {
    fetch("/api/news-get")
      .then(r => r.ok ? r.json() : { news: {} })
      .then(data => setKvNews(data.news || {}))
      .catch(() => {});
  }, []);

  // Merged news — KV overrides hardcoded for same keys
  const mergedNews = { ...RECENT_NEWS, ...kvNews };

  // Re-run analysis when the pick analysis toggle changes — so users don't have
  // to manually re-click Analyze after checking/unchecking the box.
  const { useEffect } = React;
  useEffect(() => {
    if (!analyzed || !input.trim()) return;
    if (analysisMode === "redraft") {
      const picks = parseRosterRedraft(input);
      const league = resolveLeague(redraftLeague, customConfig);
      setAnalyzed(analyzeRedraft(picks, league, showPickAnalysis && picks.hasPickNumbers, dataMode === "projected"));
    } else {
      const fmt = TOURNAMENTS[tournament].format || "standard";
      const picks = parseRoster(input, fmt);
      setAnalyzed(analyzeRoster(picks, tournament, showPickAnalysis && picks.hasPickNumbers, dataMode === "projected"));
    }
  }, [showPickAnalysis, input]);

  // Lock scroll while hero is visible — fires immediately on mount to prevent race condition
  // Locks both document.documentElement and body to cover all mobile browsers
  useEffect(() => {
    const shouldLock = !heroCollapsed && !analyzed;
    const lock = () => {
      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.height = "100%";
      document.body.style.overflow = "hidden";
      document.body.style.height = "100%";
    };
    const unlock = () => {
      document.documentElement.style.overflow = "";
      document.documentElement.style.height = "";
      document.body.style.overflow = "";
      document.body.style.height = "";
    };
    if (shouldLock) { lock(); } else { unlock(); }
    return () => { unlock(); };
  }, [heroCollapsed, analyzed]);
  const exportCardRef = React.useRef(null);

  // === GRADE HISTORY ===
  const HISTORY_KEY = "rosterxray_grade_history";
  const MAX_HISTORY = 5;

  const loadGradeHistory = () => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (e) {
      return [];
    }
  };

  const saveGradeEntry = (snapshot) => {
    try {
      const existing = loadGradeHistory();
      const next = [snapshot, ...existing].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      setGradeHistory(next);
    } catch (e) {
      // localStorage full or unavailable — silently skip
    }
  };

  const restoreGradeEntry = (entry) => {
    setAnalyzed(entry.analyzed);
    setAnalysisMode(entry.analysisMode);
    setTournament(entry.tournament || "main");
    setRedraftLeague(entry.redraftLeague || "yahoo_std");
    setDataMode(entry.dataMode || "actual");
    setAiNutshell(entry.aiNutshell || null);
    setAiPivotNotes(entry.aiPivotNotes || {});
    setAiStandoutDetails(entry.aiStandoutDetails || {});
    setAiBenchMoveNotes(entry.aiBenchMoveNotes || {});
    setAiLineupNotes(entry.aiLineupNotes || {});
    setAiBringBackNotes(entry.aiBringBackNotes || {});
    setAiLoading(false);
    setExportedDataUrl(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Load saved grades from localStorage on mount
  useEffect(() => {
    setGradeHistory(loadGradeHistory());
  }, []);

  // Scroll to top button — show when near bottom of page
  useEffect(() => {
    const handleScroll = () => {
      const nearBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 200;
      setShowScrollTop(nearBottom);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Save completed grade when AI finishes loading
  useEffect(() => {
    if (aiLoading) return;
    if (!analyzed || !analyzed.grade) return;
    const picks = analyzed.picks || analyzed.valid || [];
    const snapshot = {
      id: Date.now(),
      createdAt: Date.now(),
      analysisMode,
      tournament,
      redraftLeague,
      dataMode,
      analyzed,
      aiNutshell,
      aiPivotNotes,
      aiStandoutDetails,
      aiBenchMoveNotes,
      aiLineupNotes,
      aiBringBackNotes,
    };
    saveGradeEntry(snapshot);
  }, [aiLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build a shareable link — stores the grade server-side, copies URL to clipboard
  const handleCreateShareLink = async () => {
    if (!analyzed || !analyzed.grade) return;
    setShareLinkLoading(true);
    setShareLinkError(false);
    setShareLinkCopied(false);
    try {
      const snapshot = {
        createdAt: Date.now(),
        analysisMode,
        tournament,
        redraftLeague,
        dataMode,
        analyzed,
        aiNutshell,
        aiPivotNotes,
        aiStandoutDetails,
        aiBenchMoveNotes,
        aiLineupNotes,
        aiBringBackNotes,
      };
      const res = await fetch("/api/grade-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot }),
      });
      if (!res.ok) throw new Error("save failed");
      const data = await res.json();
      if (!data.id) throw new Error("no id");
      const url = `${window.location.origin}/?g=${data.id}`;
      setCachedShareUrl(url);
      await navigator.clipboard.writeText(url);
      setShareLinkCopied(true);
      setTimeout(() => setShareLinkCopied(false), 2500);
    } catch (e) {
      setShareLinkError(true);
      setTimeout(() => setShareLinkError(false), 3000);
    } finally {
      setShareLinkLoading(false);
    }
  };

  const handleTradeAnalysis = () => {
    if (!analyzed || analyzed.mode !== "redraft") return;
    setTradeError(null);
    setTradeResult(null);

    const giveNames = tradeGive.split(",").map(s => normalize(s.trim())).filter(Boolean);
    const getNames  = tradeGet.split(",").map(s => normalize(s.trim())).filter(Boolean);

    if (!giveNames.length || !getNames.length) {
      setTradeError("Enter at least one player on each side.");
      return;
    }

    const givePlayers = [];
    for (const gn of giveNames) {
      const found = analyzed.valid.find(p => normalize(p.name) === gn || normalize(p.name).includes(gn));
      if (!found) {
        const displayGive = tradeGive.split(",").find(s => normalize(s.trim()) === gn)?.trim() || gn;
        setTradeError(`"${displayGive}" not on your roster.`);
        return;
      }
      givePlayers.push(found);
    }

    const getPlayers = [];
    for (const gn of getNames) {
      const key = Object.keys(ADP_DATA).find(k => k === gn || k.includes(gn));
      if (!key) {
        const displayGet = tradeGet.split(",").find(s => normalize(s.trim()) === gn)?.trim() || gn;
        setTradeError(`Can't find "${displayGet}" — try a different spelling.`);
        return;
      }
      const d = ADP_DATA[key];
      const displayName = key.split(" ").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
      getPlayers.push({ name: displayName, pos: d.pos, team: d.team, adp: d.adp, pickNum: 99, notFound: false });
    }

    const giveSet = new Set(givePlayers.map(p => normalize(p.name)));
    const modifiedPicks = [
      ...analyzed.valid.filter(p => !giveSet.has(normalize(p.name))),
      ...getPlayers,
    ];

    const league = resolveLeague(redraftLeague, customConfig);
    setTradeResult(analyzeRedraft(modifiedPicks, league, false, dataMode === "projected"));
  };

  // Load a shared grade when the URL carries ?g=<id>
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("g");
    if (!id || !/^[a-z0-9]{8}$/.test(id)) return;
    fetch(`/api/grade-get?id=${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.snapshot) {
          restoreGradeEntry(data.snapshot);
          setSharedView(true);
          setHeroCollapsed(true);
        }
      })
      .catch(() => {});
  }, []);

  // Resolve the active redraft league — preset OR synthesized from customConfig
  const resolveLeague = (leagueKey, cfg) => {
    if (leagueKey === "custom") return buildLeagueFromConfig(cfg);
    return REDRAFT_LEAGUES[leagueKey];
  };

  // === SHARE CARD EXPORT ===
  // Loads html2canvas on demand, renders the hidden export card div to PNG,
  // then opens the PNG in a new tab. iOS: long-press → Add to Photos / Save to Files.
  const handleExportCard = async () => {
    if (!analyzed || !exportCardRef.current) return;
    setExportingCard(true);
    setExportedDataUrl(null);
    try {
      if (!window.html2canvas) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          script.onload = resolve;
          script.onerror = () => reject(new Error("Failed to load html2canvas"));
          document.head.appendChild(script);
        });
      }
      const card = exportCardRef.current;

      // Make visible for capture
      card.style.visibility = "visible";

      await new Promise(r => setTimeout(r, 120));

      // Capture at the card's OWN width. The height is measured here, at the
      // live element's width, but the clone used to be forced to 390px while
      // the element is 420px — so every wrapped paragraph reflowed TALLER than
      // the number we had already measured, and html2canvas cropped to that
      // stale height. The bottom of the card (the footer line) was cut off,
      // and the more the text wrapped the worse it got. Matching the widths
      // means there is no reflow, so scrollHeight is the true render height.
      const cardWidth = card.offsetWidth;
      const cardHeight = card.scrollHeight + 2; // absorbs sub-pixel rounding at scale 2

      const canvas = await window.html2canvas(card, {
        backgroundColor: "#0a0a0a",
        scale: 2,
        useCORS: true,
        logging: false,
        width: cardWidth,
        height: cardHeight,
        windowWidth: cardWidth,
        windowHeight: cardHeight,
        onclone: (clonedDoc, clonedEl) => {
          // In the cloned document, position at absolute 0,0 with no clipping.
          // left MUST be 0: any offset pushes the right edge outside the
          // capture box, which silently trims that many pixels off the side.
          clonedEl.style.position = "absolute";
          clonedEl.style.top = "0";
          clonedEl.style.left = "0";
          clonedEl.style.visibility = "visible";
          clonedEl.style.width = cardWidth + "px";
          clonedEl.style.margin = "0";
          clonedEl.style.padding = "0";
          // Ensure cloned doc body has no offset
          clonedDoc.body.style.margin = "0";
          clonedDoc.body.style.padding = "0";
          clonedDoc.body.style.overflow = "visible";
        },
      });

      // Hide again
      card.style.visibility = "hidden";

      const dataUrl = canvas.toDataURL("image/png");
      setExportedDataUrl(dataUrl);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed — try screenshotting manually.");
    } finally {
      setExportingCard(false);
    }
  };

  // Update a single field in customConfig (handles nested lineup keys)
  const updateCustomConfig = (path, value) => {
    setCustomConfig(prev => {
      const next = { ...prev };
      if (path.startsWith("lineup.")) {
        const key = path.split(".")[1];
        next.lineup = { ...prev.lineup, [key]: value };
      } else if (path === "playoffWeeks") {
        next.playoffWeeks = value === "14" ? [14, 15, 16] : [15, 16, 17];
      } else {
        next[path] = value;
      }
      return next;
    });
  };

const compressAndEncode = (file) => new Promise((resolve, reject) => {
    const MAX_SIDE = 1920;
    const QUALITY = 0.85;
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("File read failed"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Image load failed"));
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_SIDE || height > MAX_SIDE) {
          if (width > height) { height = Math.round((height / width) * MAX_SIDE); width = MAX_SIDE; }
          else { width = Math.round((width / height) * MAX_SIDE); height = MAX_SIDE; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
        resolve(dataUrl.split(",")[1]);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList).filter(f => f.type.startsWith("image/"));
    if (files.length === 0) {
      setExtractError("Only image files supported");
      return;
    }
    const oversized = files.find(f => f.size > 15 * 1024 * 1024);
    if (oversized) {
      setExtractError("Image too large — try a screenshot instead of a full-resolution photo.");
      return;
    }
    setExtractError(null);
    const processed = await Promise.all(files.map(async (f) => ({
      name: f.name,
      type: "image/jpeg",
      data: await compressAndEncode(f),
      preview: URL.createObjectURL(f),
    })));
    setUploadedImages(prev => [...prev, ...processed]);
  };



  const extractFromImages = async () => {
    if (uploadedImages.length === 0) return;
    setExtracting(true);
    setExtractError(null);
    setDebugResponse(null);
    try {
      const content = [
        ...uploadedImages.map(img => ({
          type: "image",
          source: { type: "base64", media_type: img.type, data: img.data }
        })),
        {
          type: "text",
          text: "Extract the roster from these screenshots."
        }
      ];

      // Extraction instructions now live server-side (api/analyze.js).
      // The client only signals which task to run via `task: "extract"`.
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task: "extract",
          max_tokens: 1500,
          messages: [{ role: "user", content }]
        })
      });

      const data = await response.json();
      setDebugResponse(JSON.stringify(data, null, 2));

      if (data.error) throw new Error(data.error.message || "API error");
      if (!data.content || !Array.isArray(data.content)) throw new Error("No content in response");

      const text = data.content
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("\n");

      // Strategy 1: try to find and parse a JSON array
      let players = null;
      const arrayMatch = text.match(/\[[\s\S]*?\]/);
      if (arrayMatch) {
        try {
          const cleaned = arrayMatch[0]
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/,(\s*[\]}])/g, "$1");
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // The extractor returns objects {name, pick?, adp?} as of Aug 16 2026,
            // so a screenshot now carries the ADP the user actually saw instead of
            // falling back to the built-in snapshot. Strings are still accepted
            // because strategies 2 and 3 below produce them, and because an older
            // cached response may still be string-shaped. Both normalise to the
            // same object here so nothing downstream has to care which arrived.
            players = parsed.map(p => {
              if (typeof p === "string") return p.trim().length > 1 ? { name: p.trim() } : null;
              if (p && typeof p === "object" && typeof p.name === "string" && p.name.trim().length > 1) {
                const num = (v) => (typeof v === "number" && isFinite(v) && v > 0 ? v : undefined);
                return { name: p.name.trim(), pick: num(p.pick), adp: num(p.adp) };
              }
              return null;
            }).filter(Boolean);
          }
        } catch (e) { /* fall through */ }
      }

      // Strategy 2: extract quoted strings from anywhere in the response
      if (!players || players.length < 3) {
        const quoted = [...text.matchAll(/"([^"]{3,40})"/g)].map(m => m[1]);
        const filtered = quoted.filter(s =>
          /^[A-Z][a-zA-Z]/.test(s) &&
          /\s/.test(s) &&
          !s.includes(":") &&
          !s.toLowerCase().includes("example") &&
          !s.toLowerCase().includes("player name")
        );
        if (filtered.length >= 5) players = filtered.map(name => ({ name }));
      }

      // Strategy 3: line-by-line — look for capitalized name-like strings
      if (!players || players.length < 3) {
        const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
        const extracted = lines
          .map(l => l.replace(/^[-*•\d.)\s"'\[,]+/, "").replace(/["'\],\s]+$/, "").trim())
          .filter(l =>
            l.length >= 4 &&
            l.length <= 35 &&
            /^[A-Z]/.test(l) &&
            /\s/.test(l) &&
            !l.includes(":") &&
            !l.includes("{") &&
            // Anchored to the WHOLE line (fixed Jul 27 2026). The old form had
            // no boundary, so the TE branch matched any name starting "Te" and
            // silently dropped Tee Higgins, Terry McLaurin, Tetairoa McMillan,
            // Ted Hurst, Terrance Ferguson and Tez Johnson. This filter is meant
            // to kill bare column headers ("TE", "Pick", "Bye 12"), not names.
            !/^(QB|RB|WR|TE|Round|Pick|ADP|Bye)\s*\d*$/i.test(l)
          );
        if (extracted.length >= 5) players = extracted.map(name => ({ name }));
      }

      if (!players || players.length === 0) {
        throw new Error("Could not parse player list — tap Show Debug Response below to see what the API returned");
      }

      // Final safety filter — strip any AI preamble/explanation that leaked
      // through (e.g. "Here is the requested information extracted from image.png").
      // Real NFL names never contain these tokens or end with a period.
      const JUNK_TOKENS = [
        "here is", "here are", "extracted", "image", "requested", "information",
        "following", "roster", "screenshot", ".png", ".jpg", ".jpeg", "json",
        "sure", "i've", "i have", "below", "these are", "the player", "list of",
        "based on", "no player", "unable", "cannot", "could not",
      ];
      players = players.filter(entry => {
        const p = entry.name;
        const low = p.toLowerCase().trim();
        // Drop sentences ending in a period (names don't, except "Jr." which we handle)
        if (/\.$/.test(low) && !/\bjr\.$|\bsr\.$|\bii\.$|\biii\.$/.test(low)) return false;
        // Drop anything containing a junk token
        if (JUNK_TOKENS.some(tok => low.includes(tok))) return false;
        // Drop overly long strings (real names are <= ~28 chars)
        if (p.length > 30) return false;
        // Must contain at least one space (first + last name)
        if (!/\s/.test(p.trim())) return false;
        return true;
      });

      if (players.length === 0) {
        throw new Error("Extraction returned only non-player text — tap Show Debug Response to inspect, or try Paste Text mode");
      }

      // Dedupe by name — first occurrence wins, so the earliest (draft-order) row
      // keeps its pick/adp.
      const seenNames = new Set();
      players = players.filter(p => {
        const k = p.name.toLowerCase();
        if (seenNames.has(k)) return false;
        seenNames.add(k);
        return true;
      });

      // Emit the five-line block per player. This exact shape is what parseRoster
      // reads correctly — VERIFIED, and the verification mattered: single-line
      // forms like "Joe Burrow 84 ADP 68.4" parse with pick and ADP SWAPPED,
      // which is worse than sending no ADP at all. Guarded by
      // scripts/test-extraction-blocks.mjs. Players with no ADP fall back to
      // "Name Pick", exactly what this path emitted before Aug 16 2026.
      const newInput = players.map(p => {
        if (p.adp != null && p.pick != null) return `${p.name}\n${p.adp}\nADP\n${p.pick}\nPick`;
        if (p.adp != null) return `${p.name}\n${p.adp}\nADP`;
        if (p.pick != null) return `${p.name} ${p.pick}`;
        return p.name;
      }).join("\n");
      setInput(newInput);
      setAiNutshell(null);
      setAiLoading(false);
      if (analysisMode === "redraft") {
        const picks = parseRosterRedraft(newInput);
        const league = resolveLeague(redraftLeague, customConfig);
        const result = analyzeRedraft(picks, league, picks.hasPickNumbers, dataMode === "projected");
        setAnalyzed(result);
        fetchAiNutshell(result);
      } else {
        const fmt = TOURNAMENTS[tournament].format || "standard";
        const picks = parseRoster(newInput, fmt);
        const result = analyzeRoster(picks, tournament, picks.hasPickNumbers, dataMode === "projected");
        setAnalyzed(result);
        fetchAiNutshell(result);
      }
      setMode("paste");
    } catch (err) {
      setExtractError(err.message || "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const removeImage = (idx) => {
    setUploadedImages(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageItems = Array.from(items).filter(i => i.type.startsWith("image/"));
    if (imageItems.length > 0) {
      e.preventDefault();
      const files = imageItems.map(i => i.getAsFile()).filter(Boolean);
      handleFiles(files);
    }
  };

  // === MODE-AWARE EXAMPLES ===
  // Each example is hand-curated to LIGHT UP the artifact's analysis for that mode.
  // First-time users hit Load Example and immediately see the tool's best output.

  // BEST BALL example — the user's actual screenshot 3 roster.
  // Lights up: WAS QB-game-stack (Daniels + Allen + Williams) with ATL bring-back (Branch),
  // DET game-stack (Goff + Amon-Ra) with MIN side (Murray + Addison + Hockenson),
  // CHI mini-stack (Burden + Monangai). Strong correlations + ADP-delta picks.
  const exampleRosterBestBall = `Jayden Daniels 64
Jared Goff 105
Kyler Murray 112
Jeremiyah Love 16
Bhayshul Tuten 57
Kyle Monangai 88
Emmett Johnson 177
Kaytron Allen 184
Amon-Ra St. Brown 9
Chris Olave 33
Luther Burden 40
Jordan Addison 81
Omar Cooper 136
Antonio Williams 153
Zachariah Branch 201
Jake Ferguson 129
T.J. Hockenson 160
Greg Dulcich 208`;

  // REDRAFT example — realistic 12-team half-PPR roster. Mix of elite starters,
  // mid-round value picks, and realistic bench depth. Exercises: lineup caliber,
  // positional depth, bye week spread, playoff schedule, and bench move classification.
  const exampleRosterRedraft = `Saquon Barkley
Justin Jefferson
Kyler Murray
De'Von Achane
Chris Olave
Tee Higgins
Dalton Kincaid
Alvin Kamara
Rashid Shaheed
Dak Prescott
Chuba Hubbard
Zay Jones
Elijah Mitchell
Sam LaPorta
Wan'Dale Robinson`;

  const exampleRoster = exampleRosterBestBall;

  const fetchAiNutshell = async (result) => {
    setAiLoading(true);
    setAiNutshell(null);
    setAiFailed(false);
    try {
      const isRedraft = result.mode === "redraft";

      // === SHARED CONTEXT ===
      const rosterLines = (result.valid || []).map(p => {
        let deltaStr = "";
        if (p.actualPick != null && p.adp != null) {
          const d = p.actualPick - p.adp;
          if (d >= 3) deltaStr = ` VALUE+${Math.round(d)}`;
          else if (d <= -3) deltaStr = ` REACH${Math.round(d)}`;
          else if (d > -3 && d < 3) deltaStr = ` AT-ADP`;
        }
        return `${p.name} (${p.pos}·${p.team}${p.actualPick ? ` pick ${p.actualPick}` : ""}${p.adp ? ` ADP ${p.adp}` : ""}${deltaStr})`;
      }).join(", ");

      const weaknessLines = (result.weaknesses || []).join("; ");
      const strengthLines = (result.strengths || []).join("; ");
      const grade = result.grade;
      const score = result.score?.toFixed(1);

      // === BEST BALL CONTEXT ===
      const stackLines = !isRedraft
        ? (result.stackGrades || []).map(s =>
            `${s.team} ${s.type} stack [${s.players.map(p => `${p.name} ${p.pos}`).join("+")}] playoff score ${s.normalizedScore?.toFixed(1)}`
          ).join(" | ")
        : "";

      const verdictLines = !isRedraft
        ? (result.verdictAlignments || []).filter(v => !v.stale && (v.verdict === "TARGET" || v.verdict.includes("TARGET"))).map(v =>
            `${v.name}: ${v.verdict} (${v.reason})`
          ).join("; ")
        : "";

      const rcLines = !isRedraft
        ? (result.roleCeilingFlags || []).map(p =>
            `${p.name}: ${p.roleCeiling === "slot_only" ? "SLOT TRAP" : "TD DEPENDENT"} — ${p.trendNote}`
          ).join("; ")
        : "";

      const pivotLines = !isRedraft
        ? (result.topPivots || []).slice(0, 3).map(pv =>
            `at pick ${pv.pickNum} took ${pv.picked.name} — better alt: ${pv.alternatives[0]?.name} (${pv.alternatives[0]?.reason})`
          ).join("; ")
        : "";

      const tournamentName = !isRedraft
        ? (result.tournament?.name || "General Best Ball")
        : (result.league?.name || "Redraft");

      // === REDRAFT CONTEXT ===
      const playoffLines = isRedraft
        ? (result.playoffMatchups || []).slice(0, 6).map(p => {
            const matchStr = (p.playoffMatches || []).map(m => {
              const node = getGameSelectionNode(p.team, m.opp, m.week);
              const nodeTag = node ? ` [${node.type === "highPace" ? "High-Pace" : "Hidden-Vol"}]` : "";
              return `W${m.week} ${m.tier || "—"}${m.opp ? ` vs ${m.opp.replace("@","")}` : ""}${nodeTag}`;
            }).join(", ");
            return `${p.name} (${p.pos}·${p.team}): ${matchStr}`;
          }).join("; ")
        : "";

      // === PIVOT CONTEXT for prompt ===
      const pivotForPrompt = !isRedraft
        ? (result.topPivots || []).slice(0, 3).map(pv =>
            `${pv.picked.name} (${pv.picked.pos}·${pv.picked.team} ADP ${pv.picked.adp}) → alt: ${pv.alternatives[0]?.name} (${pv.alternatives[0]?.pos}·${pv.alternatives[0]?.team} ADP ${pv.alternatives[0]?.adp})`
          ).join(" | ")
        : "";

      // === STANDOUT CONTEXT for prompt ===
      const standoutsForPrompt = !isRedraft
        ? (result.rosterStandouts || []).map(s => {
            const opps = PLAYOFFS[s.player.team] || [];
            const nodeTags = opps.map((opp, i) => {
              const node = getGameSelectionNode(s.player.team, opp, 15 + i);
              return node ? `W${15+i}:${node.label}` : null;
            }).filter(Boolean);
            const nodeStr = nodeTags.length ? ` [${nodeTags.join(", ")}]` : "";
            return `${s.player.name} (${s.player.pos}·${s.player.team}) — label: ${s.label}${nodeStr}`;
          }).join(" | ")
        : "";

      // === BRING-BACK CONTEXT ===
      const bringBackForPrompt = !isRedraft
        ? (result.bringBacks || []).map(bb => {
            const weekNum = bb.week?.replace("W", "");
            const node = getGameSelectionNode(bb.teamA?.team || bb.stackTeam, bb.teamB?.team || bb.opponent, weekNum);
            const nodeTag = node ? ` [${node.label}]` : "";
            return `${bb.week} ${bb.teamA?.team || bb.stackTeam} vs ${bb.teamB?.team || bb.opponent}${nodeTag}: ${(bb.allPieces || [...(bb.stackPieces||[]), ...(bb.bringBackPieces||[])]).map(p => `${p.name} ${p.pos}`).join(", ")}`;
          }).join(" | ")
        : "";

      // === LINEUP CONFIDENCE CONTEXT (redraft) ===
      const lineupConfidenceForPrompt = isRedraft
        ? (result.lineupConfidencePreview || []).filter(wk => wk.week >= 15).map(wk =>
            `W${wk.week}: start ${wk.locks.map(l => l.name).join(",")||"none"} / sit? ${wk.concerns.map(c => c.name).join(",")||"none"}`
          ).join(" | ")
        : "";

      // === BENCH MOVES CONTEXT (redraft) ===
      const benchMovesForPrompt = isRedraft
        ? (result.benchMoves || []).map(a =>
            `${a.player.name} (${a.player.pos}·${a.player.team} ADP ${a.player.adp})`
          ).join(" | ")
        : "";

      const adpFlagLines = (result.adpFlags || []).map(p =>
        `${p.name}: ${p.delta > 0 ? `+${Math.round(p.delta)} value` : `${Math.round(p.delta)} reach`}`
      ).join("; ");

      // === SITUATIONS CONTEXT — app data takes full priority over AI training knowledge ===
      // For every roster player with a SITUATIONS entry, pass their trendNote directly.
      // This prevents the AI from substituting stale training knowledge for data we already have.
      const situationsContext = (result.valid || [])
        .map(p => {
          const key = normalize(p.name);
          const sit = SITUATIONS[key];
          return sit?.trendNote ? `${p.name}: ${sit.trendNote}` : null;
        })
        .filter(Boolean)
        .join("\n");

      // === RECENT NEWS CONTEXT — roster-filtered (KV overrides hardcoded) ===
      const newsContext = (result.valid || [])
        .map(p => {
          const key = normalize(p.name);
          return mergedNews[key] ? `${p.name}: ${mergedNews[key]}` : null;
        })
        .filter(Boolean)
        .join("\n");

      // === TEAM ENVIRONMENT + PLAY-CALLER CONTEXT ===
      // One line per rostered team: Vegas implied PPG, O-line rank, and (when sourced)
      // the 2026 play-caller profile. Team-level priors for the AI — never player verdicts.
      const rosterTeams = [...new Set((result.valid || []).map(p => p.team).filter(Boolean))];
      const teamContext = rosterTeams
        .map(t => {
          const env = TEAM_ENV[t];
          const pcp = PLAYCALLER_PROFILES[t];
          const bits = [];
          if (env) bits.push(`implied ${env.ippg} PPG (league range ~18.3-26.4), O-line rank ${env.oline}/32`);
          if (pcp) bits.push(`${pcp.isNew ? "NEW play-caller" : "play-caller"} ${pcp.pc} (${pcp.tree} tree) — ${pcp.note}`);
          // Season SOS for only the positions this team actually supplies to the
          // roster — a full 4-position dump per team is noise the AI ignores.
          const teamPos = [...new Set((result.valid || []).filter(p => p.team === t).map(p => p.pos))];
          const sosBits = teamPos
            .map(pos => {
              const s = SOS[pos]?.[t];
              if (!s) return null;
              const move = s.delta == null ? "" : `, ${s.delta > 0 ? "+" : ""}${s.delta} spots vs 2025`;
              return `${pos} schedule ${s.rank}/32 (1=easiest)${move}`;
            })
            .filter(Boolean);
          if (sosBits.length) bits.push(sosBits.join("; "));
          const mt = MOTION.teams?.[t];
          if (mt) bits.push(`${Math.round(mt.motion_tgt_rate * 100)}% of targets on motion snaps (league ${Math.round(MOTION._meta.league_motion_rate * 100)}%)`);
          // RB air yards is a PLAY-CALLER fingerprint, so it belongs on the team
          // line next to the play-caller note, not on a player line. Only shown
          // when the roster actually has a back on this team.
          const ay = AIRYARDS.teams[t];
          if (ay) {
            const hasRB = (result.valid || []).some(p => p.team === t && p.pos === "RB");
            if (hasRB && ay.rb_air_yards != null) {
              bits.push(`${ay.rb_air_yards > 0 ? "+" : ""}${Math.round(ay.rb_air_yards)} team RB air yards (${ay.rb_air_rank}/32)${ay.rb_air_yards < 0 ? " — backs catch it BEHIND the line here" : ""}`);
            }
            if (ay.dropback_drain != null) {
              bits.push(`${Math.round(ay.dropback_drain * 100)}% of dropbacks lost to sacks/scrambles (${ay.drain_rank}/32, 1=fewest) — fewer targets exist for everyone`);
            }
          }
          return bits.length ? `${t}: ${bits.join(" | ")}` : null;
        })
        .filter(Boolean)
        .join("\n");

      // === OFF-ROSTER TEAMMATE CONTEXT (added Aug 3 2026) ===
      //
      // Why this exists: the AI called Tua Tagovailoa "the healthy starter" for
      // MIAMI in a published nutshell. He signed with ATLANTA, and the app knew
      // that — ADP_DATA has him at team "ATL" and RECENT_NEWS says so outright.
      // The app simply never told the model, because EVERY other context block
      // here is filtered to `result.valid` (players ON the roster). Tua was not
      // on the roster, so the model reasoned about Malik Willis's depth chart
      // from training knowledge, where Tua is still a Dolphin.
      //
      // The prompt made this worse than a silent gap: api/analyze.js used to say
      // "your training knowledge applies ONLY to players not listed above,"
      // which explicitly LICENSED the invention. Both halves are fixed — the
      // rule now forbids asserting team/role for anyone absent, and this block
      // supplies the facts so the model has a real answer instead of a gap.
      //
      // Scope is deliberately narrow: QBs only, and only for teams the roster
      // actually touches. QB identity is the fact most often needed about a
      // player who isn't rostered (every stack and every "who throws him the
      // ball" question), and it is small — one line per team. Dumping full
      // depth charts would bloat a prompt that already hit its token ceiling
      // once (see the max_tokens note below).
      // Match the table findPlayer resolved the roster against, or the QB list
      // can disagree with the ADPs shown everywhere else on the page.
      // analyzeRedraft does NOT set result.format (only analyzeRoster does), so
      // check isRedraft FIRST — keying off format alone silently served the
      // Underdog table to every redraft grade.
      const qbTable = isRedraft ? ADP_YAHOO
        : result.format === "superflex" ? ADP_SUPERFLEX
        : ADP_DATA;
      const teammateContext = rosterTeams
        .map(t => {
          const rosteredHere = new Set((result.valid || []).map(p => normalize(p.name)));
          const qbs = Object.entries(qbTable)
            .filter(([, v]) => v.pos === "QB" && v.team === t)
            .sort((a, b) => (a[1].adp ?? 999) - (b[1].adp ?? 999))
            .map(([k, v]) => {
              const label = k.replace(/\b\w/g, c => c.toUpperCase());
              const onRoster = rosteredHere.has(normalize(k)) ? " [on this roster]" : "";
              return `${label} (ADP ${v.adp})${onRoster}`;
            });
          return qbs.length ? `${t} QBs: ${qbs.join(", ")}` : null;
        })
        .filter(Boolean)
        .join("\n");

      // === 2025 PRODUCTION METRICS CONTEXT ===
      // Compact per-player line from the nflverse-built PLAYER_METRICS file. Descriptive
      // of last season's roles — the AI must let situations/news override on role changes.
      const metricsContext = (result.valid || [])
        .map(p => {
          const m = getMetrics(p.name);
          if (!m || m.gp < 8) return null;
          const bits = [`${Math.round(m.spike_rate * 100)}% spike wks (18+ half-PPR)`, `${Math.round(m.dud_rate * 100)}% duds`];
          // Team change detected between the 2025 metrics and current roster data:
          // every share/role number below is old-team context — say so up front so
          // the AI never treats a vacated situation as a current constraint.
          if (m.team && p.team && m.team !== p.team) bits.unshift(`CHANGED TEAMS (2025 data is from ${m.team} — old-role context only)`);
          if (m.nuclear_rate >= 0.1) bits.push(`${Math.round(m.nuclear_rate * 100)}% nuclear (28+)`);
          if (p.pos === "WR" || p.pos === "TE") bits.push(`${Math.round(m.tgt_sh * 100)}% tgt share (games played), WOPR ${m.wopr}${m.snap_sh != null ? `, ${Math.round(m.snap_sh * 100)}% snap share (route-participation proxy)` : ""}`);
          if (p.pos === "RB") bits.push(`${m.hvt_pg} HVT/gm${m.expl_pct != null ? `, ${Math.round(m.expl_pct * 100)}% explosive carries` : ""}`);
          return `${p.name}: ${bits.join(", ")}`;
        })
        .filter(Boolean)
        .join("\n");

      // === 2025 EFFICIENCY CONTEXT ===
      // The other half of metricsContext. That block says how much a player was
      // given; this says what he did per touch. Rushing and receiving stay
      // SEPARATE — collapsing them hides the exact split this was added to
      // surface (a back can be a bottom-5 runner and the best receiving back
      // alive). Ranks are within position, over volume-qualified players only.
      const efficiencyContext = (result.valid || [])
        .map(p => {
          const e = getEfficiency(p.name);
          const mo = getMotion(p.name);
          const ay = p.pos === "RB" ? getAirYards(p.name) : null;
          if (!e && !mo && !ay) return null;
          const bits = [];
          // aDOT is the RB-specific line. A negative number is not a small
          // negative — it means every catch starts behind the line of
          // scrimmage and the back has to earn those yards back before
          // gaining any, which is why two backs with identical target counts
          // can produce wildly different receiving yards.
          if (ay) {
            bits.push(
              `${ay.adot > 0 ? "+" : ""}${ay.adot} aDOT on ${ay.tgt} targets, ${ay.air_yards > 0 ? "+" : ""}${Math.round(ay.air_yards)} air yards (${ay.air_yards_rank}/${AIRYARDS._meta.qualified_rbs} among RBs), ${ay.ypt} yds/target` +
              (ay.adot < 0 ? " — catches it behind the line, must earn yards back before gaining any" : "")
            );
          }
          if (e?.rush_eff_rank) bits.push(`rush efficiency ${e.rush_eff_rank}/${PLAYER_EFFICIENCY._meta.qualified_counts[`${p.pos}_rush_eff_rank`]} (pts over expected per carry)`);
          if (e?.ngs_rush_rank) bits.push(`NGS rush yds over expected ${e.ngs_rush_rank}/${PLAYER_EFFICIENCY._meta.qualified_counts[`${p.pos}_ngs_rush_rank`]} (tracking data, yardage-only)`);
          if (e?.rec_eff_rank) bits.push(`receiving efficiency ${e.rec_eff_rank}/${PLAYER_EFFICIENCY._meta.qualified_counts[`${p.pos}_rec_eff_rank`]} (pts over expected per target)`);
          // Only worth a line when the split is big enough to survive the
          // play-level dilution described in build-motion.py.
          if (mo && Math.abs(mo.ypt_lift_pct) >= 20) {
            bits.push(`${mo.ypt_lift_pct > 0 ? "+" : ""}${mo.ypt_lift_pct}% yds/target on motion snaps (team-scheme split, NOT a player-level motion split)`);
          }
          return bits.length ? `${p.name}: ${bits.join(", ")}` : null;
        })
        .filter(Boolean)
        .join("\n");

      // === LEAGUE CONTEXT (redraft only) ===
      const leagueContext = isRedraft
        ? (() => {
            const lg = resolveLeague(redraftLeague, customConfig);
            return lg ? `${lg.teamCount || 12}-team ${lg.name || lg.scoringFormat || "Half-PPR"}` : "Standard 12-team Half-PPR";
          })()
        : null;

      // === USER PROMPT ===
      const userPrompt = isRedraft
        ? `Roster: ${rosterLines}
League: ${leagueContext || "Standard 12-team Half-PPR"}
Grade: ${grade} (score ${score})
Strengths: ${strengthLines || "none"}
Weaknesses: ${weaknessLines || "none"}
Playoff matchups: ${playoffLines || "none"}
Playoff lineup confidence: ${lineupConfidenceForPrompt || "none"}
Bench moves: ${benchMovesForPrompt || "none"}
ADP flags: ${adpFlagLines || "none"}
${teamContext ? `\nTeam environment (2026 preseason priors — team-level context, not player verdicts):\n${teamContext}` : ""}
${teammateContext ? `\nQuarterbacks on the rostered teams (APP DATA — these team assignments are current and override your training knowledge; a QB you expect on one of these teams who is NOT listed here is not on that team):\n${teammateContext}` : ""}
${metricsContext ? `\n2025 production metrics (verified last-season data — describes old roles; situations/news below override on role changes):\n${metricsContext}` : ""}
${efficiencyContext ? `\n2025 per-touch efficiency (what a player did with his opportunities, as opposed to how many he got — rushing and receiving are SEPARATE axes and routinely disagree; rank 1 = most efficient in position):\n${efficiencyContext}` : ""}
${situationsContext ? `\nPlayer situations (verified app data — use as ground truth):\n${situationsContext}` : ""}
${newsContext ? `\nRecent news (breaking updates — override everything above for these players):\n${newsContext}` : ""}
Analyze this redraft roster. Return JSON only.`
        : `Roster: ${rosterLines}
Stacks: ${stackLines || "none"}
Grade: ${grade} (score ${score})
Strengths: ${strengthLines || "none"}
Weaknesses: ${weaknessLines || "none"}
Verdict alignments: ${verdictLines || "none"}
Role ceiling flags: ${rcLines || "none"}
Pivot candidates: ${pivotForPrompt || "none"}
Standout players: ${standoutsForPrompt || "none"}
Bring-back games: ${bringBackForPrompt || "none"}
ADP flags: ${adpFlagLines || "none"}
${teamContext ? `\nTeam environment (2026 preseason priors — team-level context, not player verdicts):\n${teamContext}` : ""}
${teammateContext ? `\nQuarterbacks on the rostered teams (APP DATA — these team assignments are current and override your training knowledge; a QB you expect on one of these teams who is NOT listed here is not on that team):\n${teammateContext}` : ""}
${metricsContext ? `\n2025 production metrics (verified last-season data — describes old roles; situations/news below override on role changes):\n${metricsContext}` : ""}
${efficiencyContext ? `\n2025 per-touch efficiency (what a player did with his opportunities, as opposed to how many he got — rushing and receiving are SEPARATE axes and routinely disagree; rank 1 = most efficient in position):\n${efficiencyContext}` : ""}
${situationsContext ? `\nPlayer situations (verified app data — use as ground truth):\n${situationsContext}` : ""}
${newsContext ? `\nRecent news (breaking updates — override everything above for these players):\n${newsContext}` : ""}
Analyze this best ball roster. Return JSON only.`;

      // Grading instructions now live server-side (api/analyze.js).
      // Client signals task + mode/tournament context; server builds the prompt.
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "grade",
          mode: isRedraft ? "redraft" : "bestball",
          tournamentName,
          // 2200 was not enough for a full 18-player roster: the response came
          // back with stop_reason "max_tokens" and JSON severed mid-field. The
          // server clamps this too (api/analyze.js), so BOTH have to move —
          // raising only this one changes nothing.
          max_tokens: 5000,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (!response.ok) throw new Error("API error");
      const data = await response.json();
      const raw = data?.content?.[0]?.text?.trim();
      if (!raw) throw new Error("Empty response");

      const clean = raw.replace(/```json|```/g, "").trim();
      // Tolerant on purpose — a response cut off by the token cap still carries
      // a complete nutshell at the front. See parseLooseJson.
      const parsed = parseLooseJson(clean);
      if (!parsed) throw new Error("Unparseable response");

      // Set every field we did get BEFORE judging the response, so a missing
      // nutshell never costs us the notes that arrived alongside it.
      if (parsed.nutshell) setAiNutshell(parsed.nutshell); else setAiFailed(true);
      if (parsed.pivotNotes && typeof parsed.pivotNotes === "object") setAiPivotNotes(parsed.pivotNotes);
      if (parsed.standoutDetails && typeof parsed.standoutDetails === "object") setAiStandoutDetails(parsed.standoutDetails);
      if (parsed.bringBackNotes && typeof parsed.bringBackNotes === "object") setAiBringBackNotes(parsed.bringBackNotes);
      if (parsed.lineupNotes && typeof parsed.lineupNotes === "object") setAiLineupNotes(parsed.lineupNotes);
      if (parsed.benchMoveNotes && typeof parsed.benchMoveNotes === "object") setAiBenchMoveNotes(parsed.benchMoveNotes);

      // Apply grade modifier — negative capped at -1 to prevent AI overcorrecting
      // The formula has already penalized structural issues; AI is a secondary adjustment
      if (parsed.gradeModifier && parsed.gradeModifier !== 0) {
        const rawModifier = Math.max(-1, Math.min(2, parsed.gradeModifier)); // clamp -1 to +2
        const modifierMap = { "2": 2.0, "1": 0.8, "0": 0, "-1": -0.8 };
        const delta = modifierMap[String(rawModifier)] ?? (rawModifier * 0.8);
        setAnalyzed(prev => {
          if (!prev) return prev;
          const newScore = (prev.score || 0) + delta;
          const newGrade =
            newScore >= 7.0 ? "A" :
            newScore >= 5.5 ? "A-" :
            newScore >= 3.5 ? "B+" :
            newScore >= 2.0 ? "B" :
            newScore >= 0.5 ? "C+" :
            newScore >= -1.0 ? "C" : "D";
          const updatedWeaknesses = rawModifier < 0 && parsed.modifierReason
            ? [...(prev.weaknesses || []), `AI flag: ${parsed.modifierReason}`]
            : prev.weaknesses;
          const updatedStrengths = rawModifier > 0 && parsed.modifierReason
            ? [...(prev.strengths || []), `AI flag: ${parsed.modifierReason}`]
            : prev.strengths;
          return { ...prev, score: newScore, grade: newGrade, weaknesses: updatedWeaknesses, strengths: updatedStrengths };
        });
      }
    } catch (e) {
      // The template nutshell still renders as a fallback, but the failure is
      // no longer silent — see aiFailed. Silence was the actual bug: it made a
      // dropped AI pass look identical to a successful one.
      setAiFailed(true);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAnalyze = () => {
    if (!input.trim()) return;
    setExportedDataUrl(null);
    setAiNutshell(null);
    setAiLoading(false);
    setAiPivotNotes({});
    setAiStandoutDetails({});
    if (analysisMode === "redraft") {
      const picks = parseRosterRedraft(input);
      const league = resolveLeague(redraftLeague, customConfig);
      const result = analyzeRedraft(picks, league, showPickAnalysis && picks.hasPickNumbers, dataMode === "projected");
      setAnalyzed(result);
      // Anonymous grade-distribution event — grade curve calibration (audit Jul 16 2026)
      track("grade", { grade: result.grade, mode: "redraft", league: redraftLeague });
      fetchAiNutshell(result);
    } else {
      const fmt = TOURNAMENTS[tournament].format || "standard";
      const picks = parseRoster(input, fmt);
      const result = analyzeRoster(picks, tournament, showPickAnalysis && picks.hasPickNumbers, dataMode === "projected");
      setAnalyzed(result);
      track("grade", { grade: result.grade, mode: "bestball", tournament });
      fetchAiNutshell(result);
    }
  };

  const handleExample = () => {
    // Pick the example that flexes the active analysis mode's best output.
    setInput(analysisMode === "redraft" ? exampleRosterRedraft : exampleRosterBestBall);
  };

  const tierStyle = (color) => {
    const styles = {
      elite: { bg: "#0d3320", border: "#22c55e", text: "var(--pos)" },
      solid: { bg: "#1e2a1a", border: "#84cc16", text: "var(--pos-bright)" },
      neutral: { bg: "#2a2618", border: "#eab308", text: "var(--caution)" },
      tough: { bg: "#2a1a18", border: "#f97316", text: "var(--warn)" },
      wall: { bg: "#2e1414", border: "#ef4444", text: "var(--neg)" },
    };
    return styles[color] || styles.neutral;
  };

  const gradeColor = (g) => {
    if (g.startsWith("A")) return "var(--pos)";
    if (g.startsWith("B")) return "var(--pos-bright)";
    if (g.startsWith("C")) return "var(--caution)";
    return "var(--neg)";
  };

  // Shared style for native select dropdowns in custom builder (mobile-friendly)
  const selectStyle = {
    width: "100%",
    background: "#161020",
    color: "var(--text-primary)",
    border: "1px solid #3a2a55",
    borderRadius: "4px",
    padding: "8px 10px",
    fontFamily: "inherit",
    fontSize: "12px",
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
    backgroundImage: "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23a855f7' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    paddingRight: "26px",
  };

  // Categorical week palette — deliberately NOT green/yellow/red so it never
  // collides with the matchup scale (which means good/bad). These are just
  // three distinct "time slot" colors: weeks aren't good or bad, just different.
  const weekColor = (weekIdx) => {
    const palette = [
      { text: "var(--info-blue)", border: "#3b82f6", bg: "#0e1a2e", label: "W15" }, // blue
      { text: "var(--accent-purple-light)", border: "#a855f7", bg: "#1a1030", label: "W16" }, // purple
      { text: "#2dd4bf", border: "#14b8a6", bg: "#0d2420", label: "W17" }, // teal
    ];
    return palette[weekIdx] || palette[0];
  };

  // Position palette — fourth dedicated color family. Distinct from matchups
  // (green/red), weeks (blue/purple/teal). Each position gets one consistent color
  // wherever it appears, so a user scanning the page can group by position visually.
  const posColor = (pos) => {
    const map = {
      QB: { text: "var(--caution-alt)", border: "#f59e0b", bg: "#2a1f08" }, // amber
      RB: { text: "var(--accent-cyan)", border: "#06b6d4", bg: "#08222a" }, // cyan
      WR: { text: "var(--pink)", border: "#ec4899", bg: "#2a0e1e" }, // pink/magenta
      TE: { text: "var(--accent-purple)", border: "#8b5cf6", bg: "#1a1230" }, // violet
    };
    return map[pos] || { text: "var(--text-secondary)", border: "#444444", bg: "var(--bg-raised)" };
  };

  // Highlight player names (full name or last name) inside a strength/weakness
  // string with a consistent bright color, so names pop out of the colored
  // body text instead of blending into a wall of green/orange.
  const highlightPlayerNames = (text, players) => {
    if (!players || players.length === 0) return text;
    const names = new Set();
    players.forEach(p => {
      if (!p?.name) return;
      names.add(p.name);
      const parts = p.name.split(" ");
      if (parts.length > 1) names.add(parts[parts.length - 1]);
    });
    const sorted = [...names].filter(n => n.length > 2).sort((a, b) => b.length - a.length);
    if (sorted.length === 0) return text;
    const escaped = sorted.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const pattern = new RegExp(`\\b(${escaped.join("|")})\\b`, "g");
    const segments = text.split(pattern);
    return segments.map((seg, i) =>
      names.has(seg)
        ? <span key={i} style={{ color: "var(--accent-cyan)", fontWeight: 700 }}>{seg}</span>
        : seg
    );
  };

  // Strength/weakness row — replaces the old cramped bulleted <ul><li> list with
  // breathing room between items and an accent-colored left border per item,
  // matching the card styling used elsewhere in the app. Body text is tinted
  // toward the accent color (at reduced opacity) so it reads as colored without
  // glowing as loud as the full-saturation accent; player names cut through in cyan.
  const InsightRow = ({ text, color, players }) => (
    <div style={{
      background: "var(--bg-base)",
      border: `1px solid ${color}33`,
      borderLeft: `3px solid ${color}`,
      borderRadius: "3px",
      padding: "7px 10px",
      marginBottom: "6px",
      fontSize: "12px",
      lineHeight: 1.55,
      color: `${color}b3`,
    }}>
      {highlightPlayerNames(text, players)}
    </div>
  );

  // Reusable color-key legend so any-skill users learn the matchup scale once.
  // Green = great matchup for your player, red = brutal.
  const MatchupLegend = () => (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: "10px",
      fontSize: "9px",
      color: "var(--text-secondary)",
      marginBottom: "12px",
      letterSpacing: "0.03em",
      alignItems: "center",
    }}>
      <span style={{ color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Matchup:</span>
      <span style={{ color: "var(--pos)", fontWeight: 600 }}>Smash</span>
      <span style={{ color: "var(--pos-bright)", fontWeight: 600 }}>Good</span>
      <span style={{ color: "var(--caution)", fontWeight: 600 }}>Even</span>
      <span style={{ color: "var(--warn)", fontWeight: 600 }}>Hard</span>
      <span style={{ color: "var(--neg)", fontWeight: 600 }}>Avoid</span>
      <span style={{ color: "var(--text-dim)" }}>· vs that week's opponent defense</span>
    </div>
  );

  const wkChipStyle = (color) => {
    const map = {
      elite:   { bg: "#0d2a18", color: "var(--pos)" },
      solid:   { bg: "#1a2a0a", color: "var(--pos-bright)" },
      neutral: { bg: "#2a2000", color: "var(--caution)" },
      tough:   { bg: "#2a1400", color: "var(--warn)" },
      wall:    { bg: "#2a0a0a", color: "var(--neg)" },
    };
    const c = map[color] || { bg: "var(--bg-raised)", color: "var(--text-faint)" };
    return { fontSize: "8px", fontWeight: 700, padding: "0", width: "28px", height: "16px", borderRadius: "2px", background: c.bg, color: c.color, fontFamily: "var(--font-mono)", display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1, textAlign: "center", boxSizing: "border-box" };
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
      color: "var(--text-soft)",
      fontFamily: "var(--font-mono)",
      padding: "24px 24px 0 24px",
      margin: 0,
      overflow: (!heroCollapsed && !analyzed) ? "hidden" : "visible",
    }}>
      <Analytics />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Bebas+Neue&display=swap');

        :root {
          /* Surfaces (near-black, low -> high elevation) */
          --bg-base: #0a0a0a;
          --bg-surface: #0f0f0f;
          --bg-surface-alt: #0d0d0d;
          --bg-raised: #1a1a1a;
          --bg-elevated: #1e1e1e;
          --bg-inset: #111111;
          /* Borders */
          --border-subtle: #222222;
          --border-default: #333333;
          --border-strong: #2a2a2a;
          /* Text (primary -> dim)
             Every step clears WCAG AA (4.5:1) against --bg-base #0a0a0f, with
             the ladder measured Jul 27 2026. The old values did not: faint was
             2.03:1, dim 2.65:1 and muted 3.44:1, which put the pick-number
             checkbox label, the league-config subtitle and the Copy Link /
             New Roster buttons below the readable floor on a phone.
             Slightly cool-tinted to sit with the near-black base. If you
             darken these, re-check the ratio — the gap between "subtle" and
             "invisible" is about 15 points of lightness here. */
          --text-primary: #fafafa;
          --text-secondary: #b0b0bb;  /* 9.19:1 */
          --text-muted: #9c9ca8;      /* 7.27:1 */
          --text-dim: #8b8b97;        /* 5.87:1 */
          --text-faint: #7a7a86;      /* 4.66:1 */
          --text-soft: #e5e5e5;
          --text-soft-alt: #e0e0e0;
          /* Brand accents */
          --accent-purple: #a78bfa;
          --accent-purple-strong: #7c3aed;
          --accent-purple-light: #c084fc;
          --accent-purple-mid: #a855f7;
          --accent-cyan: #22d3ee;
          --info-blue: #60a5fa;
          /* Status / meaning palette */
          --pos: #4ade80;
          --pos-solid: #22c55e;
          --pos-bright: #a3e635;
          --caution: #facc15;
          --caution-alt: #fbbf24;
          --warn: #fb923c;
          --neg: #f87171;
          --gold: #f59e0b;
          --pink: #f472b6;
          /* Typography */
          --font-display: 'Bebas Neue', 'Impact', sans-serif;
          --font-body: 'Inter', system-ui, sans-serif;
          --font-mono: 'IBM Plex Mono', 'JetBrains Mono', monospace;
        }

        *, *::before, *::after { box-sizing: border-box; }

        /* Minimum tap target. Audited Jul 27 2026 at 375px: eleven controls
           sat under 40px, the worst being the 2025/2026 data-mode toggles at
           29px and Copy Link / New Roster at 33px. Apple's guidance is 44px.
           Applied as a floor so buttons that are already big are untouched,
           and centred so the label does not sit at the top of the new box.
           Opt out with data-compact on the rare control where 44px would
           break a dense inline layout. */
        button:not([data-compact]) {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        html, body {
          margin: 0;
          padding: 0;
          background: var(--bg-base);
          min-height: 100%;
        }
        #root {
          margin: 0;
          padding: 0;
          background: var(--bg-base);
        }

        .grade-pulse {
          animation: pulse 2.5s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        .fade-in {
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .scroll-shadow {
          scrollbar-width: thin;
          scrollbar-color: var(--border-default) var(--bg-base);
        }
        .scroll-shadow::-webkit-scrollbar { width: 6px; }
        .scroll-shadow::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 3px; }
        button:hover:not(:disabled) { filter: brightness(1.15); }
        textarea:focus { outline: none; border-color: var(--pos) !important; }

        /* Dying-light flicker — X-RAY only, plays once on load, irregular fluorescent tube */
        .xray-word-flicker {
          animation:
            dyingLight 7s ease-out forwards,
            hum 3.8s ease-in-out 7s infinite;
        }
        /* Gradient variant — opacity flicker + background-position sweep after settle */
        .xray-gradient-flicker {
          background-size: 200% auto;
          animation:
            dyingLight 7s ease-out forwards,
            gradientSweep 4s linear 7s infinite;
        }
        @keyframes dyingLight {
          0%    { opacity: 1; }
          6%    { opacity: 0.08; }
          9%    { opacity: 0.85; }
          11%   { opacity: 0.08; }
          14%   { opacity: 1; }
          31%   { opacity: 1; }
          33%   { opacity: 0.12; }
          36%   { opacity: 0.9; }
          41%   { opacity: 1; }
          58%   { opacity: 1; }
          60%   { opacity: 0.35; }
          63%   { opacity: 1; }
          79%   { opacity: 0.7; }
          81%   { opacity: 1; }
          100%  { opacity: 1; }
        }
        @keyframes hum {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.78; }
        }
        @keyframes gradientSweep {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }

        /* Upload tab glow — cyan pulse, stops when clicked */
        .upload-tab-glow {
          animation: tabGlow 1.8s ease-in-out infinite;
        }
        @keyframes tabGlow {
          0%, 100% { box-shadow: 0 0 0px 0px rgba(74, 222, 128, 0); }
          50%       { box-shadow: 0 0 18px 5px rgba(74, 222, 128, 0.5); }
        }
        /* Analyze button glow — mirrors upload tab, active when input has text */
        .analyze-glow {
          animation: analyzeGlow 1.8s ease-in-out infinite;
        }
        @keyframes analyzeGlow {
          0%, 100% { box-shadow: 0 0 0px 0px rgba(34, 211, 238, 0); }
          50%       { box-shadow: 0 0 22px 6px rgba(34, 211, 238, 0.55); }
        }
        /* Strobe dot — used on ANALYZING and Extracting states */
        .strobe-dot {
          animation: strobeDot 1.1s ease-in-out infinite;
        }
        @keyframes strobeDot {
          0%, 100% { opacity: 1; }
          45%      { opacity: 0.15; }
          55%      { opacity: 0.15; }
        }

        /* ── Hero section ── */
        .hero-section {
          overflow: hidden;
          max-height: 700px;
          opacity: 1;
          transition: max-height 0.55s cubic-bezier(0.4, 0, 0.2, 1),
                      opacity 0.4s ease,
                      margin 0.45s ease,
                      padding 0.45s ease;
        }
        .hero-section.collapsed {
          max-height: 0 !important;
          min-height: 0 !important;
          opacity: 0;
          margin-bottom: 0 !important;
          transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                      min-height 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                      opacity 0.3s ease,
                      margin 0.4s ease;
        }

        .hero-see-flicker {
          animation: dyingLight 6s ease-out forwards, hum 3.8s ease-in-out 6s infinite;
        }

        /* Scan wipe — DIAGNOSE revealed by a sweeping highlight, like an X-ray passing over */
        @keyframes scanWipe {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .hero-diagnose-scan {
          display: inline-block;
          background: linear-gradient(
            90deg,
            var(--pos) 0%,
            var(--pos) 20%,
            #ffffff 40%,
            #a8ffcc 50%,
            #ffffff 60%,
            var(--pos) 80%,
            var(--pos) 100%
          );
          background-size: 400% 100%;
          background-position: -200% center;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: scanWipe 2.2s cubic-bezier(0.4, 0, 0.2, 1) 0.2s forwards, hum 3.8s ease-in-out 2.6s infinite;
        }

        .hero-cta-btn {
          transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
        }
        .hero-cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(74, 222, 128, 0.28);
          filter: brightness(1.08);
        }
        .hero-cta-btn:active {
          transform: translateY(0px);
          box-shadow: 0 2px 10px rgba(74, 222, 128, 0.18);
        }

        .hero-pills {
          display: flex;
          flex-direction: column;
          gap: 8px;
          justify-content: center;
          align-items: stretch;
          margin-bottom: 28px;
          max-width: 520px;
          margin-left: auto;
          margin-right: auto;
          width: 100%;
        }
        .hero-pill {
          transition: border-color 0.2s ease, background 0.2s ease;
          white-space: normal;
          cursor: default;
          text-align: left;
        }
        .hero-pill:hover {
          border-color: #4ade8066;
          background: #0d2a18;
        }

        .hero-scanline {
          pointer-events: none;
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 3px,
            rgba(0,0,0,0.06) 3px,
            rgba(0,0,0,0.06) 4px
          );
          border-radius: 8px;
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-diagnose-scan {
            animation: none;
            background-position: 200% center;
          }
          .hero-cta-btn {
            transition: box-shadow 0.15s ease, filter 0.15s ease;
          }
          .hero-cta-btn:hover,
          .hero-cta-btn:active {
            transform: none;
          }
        }

        @media (max-width: 640px) {
          .hero-headline-wrap h1 { font-size: 42px !important; white-space: nowrap !important; }
          .hero-inner-pad { padding: 32px 18px 28px !important; }
          .hero-headline-wrap { margin-bottom: 20px !important; }
          .hero-pills {
            flex-direction: column;
            align-items: stretch;
            gap: 6px;
            margin-bottom: 22px;
          }
          .hero-pill { white-space: normal; text-align: left; }
          .hero-cta-btn { width: 100% !important; }
        }

        /* Desktop — ensure hero fills viewport and centers correctly */
        @media (min-width: 641px) and (min-height: 501px) {
          .hero-section {
            min-height: 100dvh !important;
          }
        }

        /* Landscape phone — scale down main app content only, not hero */
        @media (max-height: 500px) and (orientation: landscape) {
          body { zoom: 1; }
          .app-content {
            transform: scale(0.62);
            transform-origin: top left;
            width: 161.3%;
          }
        }

        @media (max-height: 500px) and (orientation: landscape) {
          .hero-headline-wrap h1 { font-size: 52px !important; white-space: nowrap !important; }
          .hero-inner-pad { padding: 20px 24px 18px !important; width: 100% !important; box-sizing: border-box !important; }
          .hero-headline-wrap { margin-bottom: 12px !important; }
          .hero-pills {
            flex-direction: column;
            align-items: center;
            gap: 5px;
            margin-bottom: 12px;
            max-width: 100%;
          }
          .hero-pill { white-space: nowrap; text-align: center; font-size: 9px !important; padding: 4px 8px !important; }
          .hero-cta-btn { padding: 10px 24px !important; font-size: 18px !important; }
        }
        @media (max-width: 480px) {
          .grade-banner-grid {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }
        }
        @media (max-width: 480px) {
          .playoff-week-grid {
            grid-template-columns: 1fr !important;
            gap: 6px !important;
          }
        }
      `}</style>

      {/* ── Hero Section ── */}
      <div
        className={`hero-section${heroCollapsed || analyzed ? " collapsed" : ""}`}
        style={{ maxWidth: "1100px", width: "100%", margin: "0 auto", marginBottom: heroCollapsed || analyzed ? "0" : "32px", marginTop: heroCollapsed || analyzed ? "0" : "-24px", position: "relative", minHeight: heroCollapsed || analyzed ? "0" : "calc(100dvh - 24px)", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div style={{
          position: "relative",
          background: "var(--bg-surface-alt)",
          border: "1px solid var(--bg-elevated)",
          borderRadius: "8px",
          padding: "44px 36px 36px",
          textAlign: "center",
          overflow: "hidden",
          width: "100%",
          maxWidth: "760px",
        }} className="hero-inner-pad">
          {/* Scanline texture */}
          <div className="hero-scanline" />

          {/* Ambient green glow — top center */}
          <div style={{
            position: "absolute",
            top: "-60px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "420px",
            height: "180px",
            background: "radial-gradient(ellipse at center, rgba(74,222,128,0.07) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* Headline */}
          <div className="hero-headline-wrap" style={{ position: "relative", zIndex: 1, marginBottom: "22px", lineHeight: 1 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "76px", letterSpacing: "0.04em", lineHeight: 1, whiteSpace: "nowrap", margin: 0, fontWeight: 400 }}>
              <span className="hero-diagnose-scan">DIAGNOSE</span>
              <span style={{ color: "var(--text-primary)" }}> YOUR DRAFT.</span>
            </h1>
          </div>

          {/* Proof points */}
          <div className="hero-pills" style={{ position: "relative", zIndex: 1 }}>
            {[
              { label: "No login. No league sync.", rest: " Just a screenshot.", border: "#60c8f5", check: "#60c8f5" },
              { label: "Expert-level breakdown.", rest: " No generic output.", border: "#4ade80", check: "#4ade80" },
              { label: "Maps your W15–17 playoff stacks.", rest: " Instantly.", border: "#a855f7", check: "#a855f7" },
            ].map(({ label, rest, border, check }, i) => (
              <div
                key={i}
                className="hero-pill"
                style={{
                  border: `1px solid ${border}55`,
                  borderRadius: "4px",
                  padding: "7px 12px",
                  fontSize: "11px",
                  letterSpacing: "0.03em",
                  fontFamily: "var(--font-mono)",
                  background: "var(--bg-inset)",
                }}
              >
                <span style={{ color: check, marginRight: "6px" }}>✓</span>
                <span style={{ color: check, fontWeight: 700 }}>{label}</span>
                <span style={{ color: "var(--text-muted)" }}>{rest}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <button
              className="hero-cta-btn"
              onClick={() => {
                setHeroCollapsed(true);
                setTimeout(() => {
                  setAppReady(true);
                  window.scrollTo({ top: 0, behavior: "instant" });
                }, 560);
              }}
              style={{
                background: "var(--pos)",
                color: "var(--bg-base)",
                border: "none",
                borderRadius: "4px",
                padding: "16px 40px",
                fontSize: "22px",
                fontWeight: 400,
                fontFamily: "var(--font-display)",
                letterSpacing: "0.1em",
                cursor: "pointer",
                textTransform: "uppercase",
                width: "100%",
                maxWidth: "min(400px, 100%)",
              }}
            >
              Grade My Roster →
            </button>
            <div style={{ marginTop: "14px", fontSize: "10px", color: "var(--text-faint)", letterSpacing: "0.08em", fontFamily: "var(--font-mono)" }}>
              FREE · NO ACCOUNT · BEST BALL · REDRAFT
            </div>
          </div>
        </div>
      </div>

      {/* Scroll anchor for CTA button */}
      <div id="roster-app-start" />

      <div className="app-content">
      {/* Header */}
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "16px",
          marginBottom: "24px",
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
            <div style={{
              fontFamily: "var(--font-display)",
              fontSize: "50px",
              letterSpacing: "0.03em",
              margin: 0,
              color: "var(--text-primary)",
              lineHeight: 1,
            }}>
              ROSTER{" "}
              <span
                className={appReady ? "xray-gradient-flicker" : ""}
                style={{
                  background: "linear-gradient(90deg, #60c8f5 0%, #a8e8ff 25%, #ffffff 50%, #a8e8ff 75%, #60c8f5 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  backgroundSize: "200% auto",
                }}
              >
                X-RAY
              </span>
            </div>
            <span style={{
              fontSize: "11px",
              color: "#aaa",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 500,
            }}>
              Don't just draft. See.
            </span>
          </div>
        </div>

        {/* Analysis Mode Toggle: Best Ball vs Redraft */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "8px" }}>
            Analysis Mode
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}
            onTouchStart={e => { e.currentTarget._touchStartX = e.touches[0].clientX; }}
            onTouchEnd={e => {
              const dx = e.changedTouches[0].clientX - (e.currentTarget._touchStartX || 0);
              if (dx < -50 && analysisMode !== "redraft") { setAnalysisMode("redraft"); setAnalyzed(null); setInput(""); setExportedDataUrl(null); }
              if (dx > 50 && analysisMode !== "bestball") { setAnalysisMode("bestball"); setAnalyzed(null); setInput(""); setExportedDataUrl(null); }
            }}
          >
            <button
              onClick={() => { setAnalysisMode("bestball"); setAnalyzed(null); setInput(""); setExportedDataUrl(null); }}
              style={{
                background: analysisMode === "bestball" ? "#0d3320" : "var(--bg-surface)",
                border: `1px solid ${analysisMode === "bestball" ? "var(--pos-solid)" : "var(--border-subtle)"}`,
                borderRadius: "4px",
                padding: "9px 12px",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                flexDirection: "column",
                alignItems: "stretch",
                justifyContent: "flex-start",
              }}
            >
              <div style={{ fontSize: "12px", color: analysisMode === "bestball" ? "var(--pos)" : "var(--text-primary)", fontWeight: 600, letterSpacing: "0.02em" }}>
                🏆 Best Ball Tournament
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "3px" }}>
                stacks · playoff matchups
              </div>
            </button>
            <button
              onClick={() => { setAnalysisMode("redraft"); setAnalyzed(null); setInput(""); setExportedDataUrl(null); }}
              style={{
                background: analysisMode === "redraft" ? "#1e1a3a" : "var(--bg-surface)",
                border: `1px solid ${analysisMode === "redraft" ? "var(--accent-purple-mid)" : "var(--border-subtle)"}`,
                borderRadius: "4px",
                padding: "9px 12px",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                flexDirection: "column",
                alignItems: "stretch",
                justifyContent: "flex-start",
              }}
            >
              <div style={{ fontSize: "12px", color: analysisMode === "redraft" ? "var(--accent-purple-light)" : "var(--text-primary)", fontWeight: 600, letterSpacing: "0.02em" }}>
                💰 Redraft League
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "3px" }}>
                weekly lineup · money leagues
              </div>
            </button>
          </div>
        </div>

        {/* Data Mode Toggle: 2025 Actual vs 2026 Projected */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "8px" }}>
            Data Mode
          </div>
          {/* Segmented pill toggle */}
          <div style={{
            display: "inline-flex",
            background: "var(--bg-base)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "6px",
            padding: "3px",
            gap: "2px",
          }}>
            <button
              onClick={() => { setDataMode("actual"); setAnalyzed(null); }}
              style={{
                background: dataMode === "actual" ? "#0d1f33" : "transparent",
                border: `1px solid ${dataMode === "actual" ? "var(--accent-cyan)" : "transparent"}`,
                borderRadius: "4px",
                padding: "6px 14px",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "11px",
                fontWeight: 600,
                color: dataMode === "actual" ? "var(--accent-cyan)" : "var(--text-muted)",
                letterSpacing: "0.03em",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              📊 2025 Data
            </button>
            <button
              onClick={() => { setDataMode("projected"); setAnalyzed(null); }}
              style={{
                background: dataMode === "projected" ? "#1a1200" : "transparent",
                border: `1px solid ${dataMode === "projected" ? "var(--gold)" : "transparent"}`,
                borderRadius: "4px",
                padding: "6px 14px",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "11px",
                fontWeight: 600,
                color: dataMode === "projected" ? "var(--caution-alt)" : "var(--text-muted)",
                letterSpacing: "0.03em",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              🔮 2026 Est.
            </button>
          </div>
          {/* Coverage panel — shown in BOTH modes.
              The old copy told the user projected mode was "not real stats" and
              pointed at 2025 Data as "ground truth." Both halves were misleading:
              projected mode only touches 15 of 32 teams, and 2025 Data carries a
              coaching overlay on 9 teams. Neither mode is uniform, so both get a
              coverage count and a list of exactly which teams were never reviewed. */}
          {(() => {
            const isProj = dataMode === "projected";
            const adjusted = isProj ? ADJ_COVERAGE.projAdjusted : ADJ_COVERAGE.actualAdjusted;
            const unadjusted = isProj ? ADJ_COVERAGE.projUnadjusted : ADJ_COVERAGE.actualUnadjusted;
            const accent = isProj ? "#d97706" : "var(--text-muted)";
            const bg = isProj ? "#1a1200" : "var(--bg-base)";
            const border = isProj ? "#f59e0b55" : "var(--border-subtle)";
            return (
              <div style={{
                marginTop: "8px", padding: "7px 10px",
                background: bg, border: `1px solid ${border}`, borderRadius: "4px",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                  <span style={{ fontSize: "11px", flexShrink: 0 }}>{isProj ? "⚠️" : "ℹ️"}</span>
                  <div style={{ fontSize: "10px", color: accent, lineHeight: 1.5, flex: 1 }}>
                    {isProj ? (
                      <>Projected 2026 defensive adjustments — estimates, not measured stats.{" "}
                      <strong>{adjusted.length} of {ADJ_COVERAGE.total} teams adjusted</strong>; the
                      other {unadjusted.length} fall through to raw 2025 FPA.</>
                    ) : (
                      <>2025 measured FPA, plus a 2026 coaching overlay on{" "}
                      <strong>{adjusted.length} of {ADJ_COVERAGE.total} teams</strong>. The other{" "}
                      {unadjusted.length} are unmodified 2025 data.</>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "5px", paddingLeft: "17px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => setAdjCoverageOpen(o => !o)}
                    style={{
                      background: "transparent", border: "none", padding: 0, cursor: "pointer",
                      fontFamily: "inherit", fontSize: "9px", color: accent,
                      textDecoration: "underline", letterSpacing: "0.02em", opacity: 0.85,
                    }}
                  >
                    {adjCoverageOpen ? "hide" : "which teams?"}
                  </button>
                  <span style={{ fontSize: "9px", color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>
                    adj. data {ADJ_UPDATED}
                  </span>
                </div>
                {adjCoverageOpen && (
                  <div style={{ marginTop: "7px", paddingLeft: "17px", fontSize: "9px", lineHeight: 1.7 }}>
                    <div style={{ color: accent, marginBottom: "3px" }}>
                      <strong>Adjusted ({adjusted.length}):</strong>{" "}
                      <span style={{ fontFamily: "var(--font-mono)" }}>{adjusted.join(" ")}</span>
                    </div>
                    <div style={{ color: "var(--text-faint)" }}>
                      <strong>No adjustment ({unadjusted.length}):</strong>{" "}
                      <span style={{ fontFamily: "var(--font-mono)" }}>{unadjusted.join(" ")}</span>
                    </div>
                    <div style={{ color: "var(--text-faint)", marginTop: "5px", fontStyle: "italic", lineHeight: 1.6 }}>
                      No adjustment means no reliable 2026 signal was recorded for that
                      defense — not that it was reviewed and confirmed unchanged. Weigh
                      tiers on these teams accordingly.
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Tournament selector — Best Ball only */}
        {analysisMode === "bestball" && (
        <div style={{ marginBottom: "20px", position: "relative" }}>
          <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "8px" }}>
            Tournament Structure
          </div>

          {/* Dropdown trigger */}
          <button
            onClick={() => setTournamentDropdownOpen(o => !o)}
            style={{
              width: "100%",
              background: "var(--bg-surface)",
              border: "1px solid var(--pos-solid)",
              borderRadius: tournamentDropdownOpen ? "4px 4px 0 0" : "4px",
              padding: "10px 14px",
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              transition: "border-radius 0.1s",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
              <span style={{ fontSize: "12px", color: "var(--accent-cyan)", fontWeight: 700, letterSpacing: "0.05em" }}>
                {TOURNAMENTS[tournament].name}
              </span>
              <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                {TOURNAMENTS[tournament].format === "superflex"
                  ? <span style={{ color: "var(--accent-purple-mid)" }}>SUPERFLEX · 4for4 ADP</span>
                  : <>W15·{TOURNAMENTS[tournament].weights[0]}x · W16·{TOURNAMENTS[tournament].weights[1]}x · W17·{TOURNAMENTS[tournament].weights[2]}x</>
                }
              </span>
            </div>
            <span style={{ fontSize: "10px", color: "var(--pos)", letterSpacing: "0.05em" }}>
              {tournamentDropdownOpen ? "▲" : "▼"}
            </span>
          </button>

          {/* Dropdown options */}
          {tournamentDropdownOpen && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "var(--bg-base)",
              border: "1px solid var(--pos-solid)",
              borderTop: "none",
              borderRadius: "0 0 4px 4px",
              zIndex: 50,
              overflow: "hidden",
            }}>
              {Object.entries(TOURNAMENTS).map(([key, t], idx, arr) => (
                <button
                  key={key}
                  onClick={() => {
                    setTournament(key);
                    setTournamentDropdownOpen(false);
                    if (analyzed) {
                      const fmt = TOURNAMENTS[key].format || "standard";
                      const picks = parseRoster(input, fmt);
                      const result = analyzeRoster(picks, key, picks.hasPickNumbers, dataMode === "projected");
                      setAnalyzed(result);
                    }
                  }}
                  style={{
                    width: "100%",
                    background: tournament === key ? "#0d3320" : "transparent",
                    border: "none",
                    borderBottom: idx < arr.length - 1 ? "1px solid var(--bg-raised)" : "none",
                    padding: "10px 14px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "left",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (tournament !== key) e.currentTarget.style.background = "var(--bg-inset)"; }}
                  onMouseLeave={e => { if (tournament !== key) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                    <span style={{ fontSize: "12px", color: tournament === key ? "var(--pos)" : "#ccc", fontWeight: 600, letterSpacing: "0.02em" }}>
                      {t.name}
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                      {t.format === "superflex"
                        ? <span style={{ color: "var(--accent-purple-mid)" }}>SUPERFLEX · 4for4 ADP</span>
                        : <>W15·{t.weights[0]}x · W16·{t.weights[1]}x · W17·{t.weights[2]}x</>
                      }
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "9px", color: "var(--text-dim)" }}>{t.entries}</span>
                    {tournament === key && <span style={{ fontSize: "10px", color: "var(--pos)" }}>✓</span>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Note below */}
          <div style={{ fontSize: "10px", color: "var(--text-dim)", marginTop: "6px", letterSpacing: "0.03em" }}>
            {TOURNAMENTS[tournament].note}
          </div>
        </div>
        )}

        {/* Redraft League selector — 3 quick presets + Custom builder */}
        {analysisMode === "redraft" && (
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "8px" }}>
            League Configuration
          </div>

          {/* Dropdown trigger */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setRedraftDropdownOpen(o => !o)}
              style={{
                width: "100%",
                background: "var(--bg-surface)",
                border: "1px solid var(--accent-purple-mid)",
                borderRadius: redraftDropdownOpen ? "4px 4px 0 0" : "4px",
                padding: "10px 14px",
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                transition: "border-radius 0.1s",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span style={{ fontSize: "12px", color: "var(--accent-cyan)", fontWeight: 700, letterSpacing: "0.05em" }}>
                  {redraftLeague === "custom" ? "⚙ Custom" : REDRAFT_LEAGUES[redraftLeague].name}
                </span>
                <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                  {redraftLeague === "custom"
                    ? "custom lineup"
                    : REDRAFT_LEAGUES[redraftLeague].scoring + " · " + Object.entries(REDRAFT_LEAGUES[redraftLeague].lineup).filter(([, c]) => c > 0).map(([p, c]) => `${c}${p}`).join("/")}
                </span>
              </div>
              <span style={{ fontSize: "10px", color: "var(--accent-purple-light)" }}>
                {redraftDropdownOpen ? "▲" : "▼"}
              </span>
            </button>

            {/* Dropdown options */}
            {redraftDropdownOpen && (
              <div style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "var(--bg-base)",
                border: "1px solid var(--accent-purple-mid)",
                borderTop: "none",
                borderRadius: "0 0 4px 4px",
                zIndex: 50,
                overflow: "hidden",
              }}>
                {Object.entries(REDRAFT_LEAGUES).map(([key, l], idx, arr) => (
                  <button
                    key={key}
                    onClick={() => {
                      setRedraftLeague(key);
                      setCustomExpanded(false);
                      setRedraftDropdownOpen(false);
                      if (analyzed) {
                        const picks = parseRosterRedraft(input);
                        const result = analyzeRedraft(picks, REDRAFT_LEAGUES[key], picks.hasPickNumbers, dataMode === "projected");
                        setAnalyzed(result);
                      }
                    }}
                    style={{
                      width: "100%",
                      background: redraftLeague === key ? "#1e1a3a" : "transparent",
                      border: "none",
                      borderBottom: "1px solid var(--bg-raised)",
                      padding: "10px 14px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      textAlign: "left",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => { if (redraftLeague !== key) e.currentTarget.style.background = "var(--bg-inset)"; }}
                    onMouseLeave={e => { if (redraftLeague !== key) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                      <span style={{ fontSize: "12px", color: redraftLeague === key ? "var(--accent-purple-light)" : "#ccc", fontWeight: 600 }}>
                        {l.name}
                      </span>
                      <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                        {l.scoring} · {Object.entries(l.lineup).filter(([, c]) => c > 0).map(([p, c]) => `${c}${p}`).join("/")}
                      </span>
                    </div>
                    {redraftLeague === key && <span style={{ fontSize: "10px", color: "var(--accent-purple-light)" }}>✓</span>}
                  </button>
                ))}
                {/* Custom option */}
                <button
                  onClick={() => {
                    setRedraftLeague("custom");
                    setCustomExpanded(true);
                    setRedraftDropdownOpen(false);
                    if (analyzed) {
                      const picks = parseRosterRedraft(input);
                      const result = analyzeRedraft(picks, buildLeagueFromConfig(customConfig), picks.hasPickNumbers, dataMode === "projected");
                      setAnalyzed(result);
                    }
                  }}
                  style={{
                    width: "100%",
                    background: redraftLeague === "custom" ? "#1e1a3a" : "transparent",
                    border: "none",
                    padding: "10px 14px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "left",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (redraftLeague !== "custom") e.currentTarget.style.background = "var(--bg-inset)"; }}
                  onMouseLeave={e => { if (redraftLeague !== "custom") e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                    <span style={{ fontSize: "12px", color: redraftLeague === "custom" ? "var(--accent-purple-light)" : "#ccc", fontWeight: 600 }}>
                      ⚙ Custom
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                      build your own lineup
                    </span>
                  </div>
                  {redraftLeague === "custom" && <span style={{ fontSize: "10px", color: "var(--accent-purple-light)" }}>✓</span>}
                </button>
              </div>
            )}
          </div>

          {/* Selected league context line */}
          <div style={{ fontSize: "10px", color: "var(--text-dim)", marginTop: "6px", letterSpacing: "0.03em" }}>
            {redraftLeague === "custom"
              ? buildLeagueFromConfig(customConfig).note
              : REDRAFT_LEAGUES[redraftLeague].note}
          </div>

          {/* Custom builder dropdowns — inline, mobile-friendly */}
          {redraftLeague === "custom" && customExpanded && (
            <div style={{
              marginTop: "10px",
              padding: "14px",
              background: "#0d0a1a",
              border: "1px solid #2a1a3a",
              borderRadius: "5px",
            }}>
              <div style={{ fontSize: "10px", color: "var(--text-secondary)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>
                Customize Your League
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "8px",
              }}>
                {/* Teams */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", color: "var(--text-secondary)", marginBottom: "3px", letterSpacing: "0.05em", textTransform: "uppercase" }}>Teams</label>
                  <select
                    value={customConfig.teams}
                    onChange={(e) => {
                      updateCustomConfig("teams", parseInt(e.target.value));
                      if (analyzed && redraftLeague === "custom") {
                        const next = { ...customConfig, teams: parseInt(e.target.value) };
                        const picks = parseRosterRedraft(input);
                        const result = analyzeRedraft(picks, buildLeagueFromConfig(next), picks.hasPickNumbers);
                        setAnalyzed(result);
                      }
                    }}
                    style={selectStyle}
                  >
                    <option value="10">10</option>
                    <option value="12">12</option>
                    <option value="14">14</option>
                  </select>
                </div>

                {/* Scoring */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", color: "var(--text-secondary)", marginBottom: "3px", letterSpacing: "0.05em", textTransform: "uppercase" }}>Scoring</label>
                  <select
                    value={customConfig.scoring}
                    onChange={(e) => {
                      updateCustomConfig("scoring", e.target.value);
                      if (analyzed && redraftLeague === "custom") {
                        const next = { ...customConfig, scoring: e.target.value };
                        const picks = parseRosterRedraft(input);
                        const result = analyzeRedraft(picks, buildLeagueFromConfig(next), picks.hasPickNumbers);
                        setAnalyzed(result);
                      }
                    }}
                    style={selectStyle}
                  >
                    <option value="Standard">Standard</option>
                    <option value="Half-PPR">Half-PPR</option>
                    <option value="PPR">PPR</option>
                  </select>
                </div>

                {/* QB slots */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", color: "var(--text-secondary)", marginBottom: "3px", letterSpacing: "0.05em", textTransform: "uppercase" }}>QB Slots</label>
                  <select
                    value={customConfig.lineup.QB}
                    onChange={(e) => {
                      updateCustomConfig("lineup.QB", parseInt(e.target.value));
                      if (analyzed && redraftLeague === "custom") {
                        const next = { ...customConfig, lineup: { ...customConfig.lineup, QB: parseInt(e.target.value) } };
                        const picks = parseRosterRedraft(input);
                        const result = analyzeRedraft(picks, buildLeagueFromConfig(next), picks.hasPickNumbers);
                        setAnalyzed(result);
                      }
                    }}
                    style={selectStyle}
                  >
                    <option value="1">1 QB</option>
                    <option value="2">2 QB (SF)</option>
                    <option value="3">3 QB</option>
                  </select>
                </div>

                {/* RB slots */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", color: "var(--text-secondary)", marginBottom: "3px", letterSpacing: "0.05em", textTransform: "uppercase" }}>RB Slots</label>
                  <select
                    value={customConfig.lineup.RB}
                    onChange={(e) => {
                      updateCustomConfig("lineup.RB", parseInt(e.target.value));
                      if (analyzed && redraftLeague === "custom") {
                        const next = { ...customConfig, lineup: { ...customConfig.lineup, RB: parseInt(e.target.value) } };
                        const picks = parseRosterRedraft(input);
                        const result = analyzeRedraft(picks, buildLeagueFromConfig(next), picks.hasPickNumbers);
                        setAnalyzed(result);
                      }
                    }}
                    style={selectStyle}
                  >
                    <option value="1">1 RB</option>
                    <option value="2">2 RB</option>
                    <option value="3">3 RB</option>
                    <option value="4">4 RB</option>
                  </select>
                </div>

                {/* WR slots */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", color: "var(--text-secondary)", marginBottom: "3px", letterSpacing: "0.05em", textTransform: "uppercase" }}>WR Slots</label>
                  <select
                    value={customConfig.lineup.WR}
                    onChange={(e) => {
                      updateCustomConfig("lineup.WR", parseInt(e.target.value));
                      if (analyzed && redraftLeague === "custom") {
                        const next = { ...customConfig, lineup: { ...customConfig.lineup, WR: parseInt(e.target.value) } };
                        const picks = parseRosterRedraft(input);
                        const result = analyzeRedraft(picks, buildLeagueFromConfig(next), picks.hasPickNumbers);
                        setAnalyzed(result);
                      }
                    }}
                    style={selectStyle}
                  >
                    <option value="2">2 WR</option>
                    <option value="3">3 WR</option>
                    <option value="4">4 WR</option>
                    <option value="5">5 WR</option>
                  </select>
                </div>

                {/* TE slots */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", color: "var(--text-secondary)", marginBottom: "3px", letterSpacing: "0.05em", textTransform: "uppercase" }}>TE Slots</label>
                  <select
                    value={customConfig.lineup.TE}
                    onChange={(e) => {
                      updateCustomConfig("lineup.TE", parseInt(e.target.value));
                      if (analyzed && redraftLeague === "custom") {
                        const next = { ...customConfig, lineup: { ...customConfig.lineup, TE: parseInt(e.target.value) } };
                        const picks = parseRosterRedraft(input);
                        const result = analyzeRedraft(picks, buildLeagueFromConfig(next), picks.hasPickNumbers);
                        setAnalyzed(result);
                      }
                    }}
                    style={selectStyle}
                  >
                    <option value="1">1 TE</option>
                    <option value="2">2 TE</option>
                    <option value="3">3 TE</option>
                  </select>
                </div>

                {/* FLEX slots */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", color: "var(--text-secondary)", marginBottom: "3px", letterSpacing: "0.05em", textTransform: "uppercase" }}>FLEX</label>
                  <select
                    value={customConfig.lineup.FLEX}
                    onChange={(e) => {
                      updateCustomConfig("lineup.FLEX", parseInt(e.target.value));
                      if (analyzed && redraftLeague === "custom") {
                        const next = { ...customConfig, lineup: { ...customConfig.lineup, FLEX: parseInt(e.target.value) } };
                        const picks = parseRosterRedraft(input);
                        const result = analyzeRedraft(picks, buildLeagueFromConfig(next), picks.hasPickNumbers);
                        setAnalyzed(result);
                      }
                    }}
                    style={selectStyle}
                  >
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                  </select>
                </div>

                {/* SFLEX slot (QB/RB/WR/TE) */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", color: "var(--text-secondary)", marginBottom: "3px", letterSpacing: "0.05em", textTransform: "uppercase" }}>SFLEX</label>
                  <select
                    value={customConfig.lineup.SFLEX || 0}
                    onChange={(e) => {
                      updateCustomConfig("lineup.SFLEX", parseInt(e.target.value));
                      if (analyzed && redraftLeague === "custom") {
                        const next = { ...customConfig, lineup: { ...customConfig.lineup, SFLEX: parseInt(e.target.value) } };
                        const picks = parseRosterRedraft(input);
                        const result = analyzeRedraft(picks, buildLeagueFromConfig(next), picks.hasPickNumbers);
                        setAnalyzed(result);
                      }
                    }}
                    style={selectStyle}
                  >
                    <option value="0">0</option>
                    <option value="1">1 (QB/RB/WR/TE)</option>
                    <option value="2">2 (QB/RB/WR/TE)</option>
                    <option value="3">3 (QB/RB/WR/TE)</option>
                  </select>
                </div>

                {/* Bench size */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", color: "var(--text-secondary)", marginBottom: "3px", letterSpacing: "0.05em", textTransform: "uppercase" }}>Bench</label>
                  <select
                    value={customConfig.benchSize}
                    onChange={(e) => {
                      updateCustomConfig("benchSize", parseInt(e.target.value));
                      if (analyzed && redraftLeague === "custom") {
                        const next = { ...customConfig, benchSize: parseInt(e.target.value) };
                        const picks = parseRosterRedraft(input);
                        const result = analyzeRedraft(picks, buildLeagueFromConfig(next), picks.hasPickNumbers);
                        setAnalyzed(result);
                      }
                    }}
                    style={selectStyle}
                  >
                    <option value="5">5</option>
                    <option value="6">6</option>
                    <option value="7">7</option>
                  </select>
                </div>

                {/* IR slots */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", color: "var(--text-secondary)", marginBottom: "3px", letterSpacing: "0.05em", textTransform: "uppercase" }}>IR</label>
                  <select
                    value={customConfig.irSlots}
                    onChange={(e) => {
                      updateCustomConfig("irSlots", parseInt(e.target.value));
                      if (analyzed && redraftLeague === "custom") {
                        const next = { ...customConfig, irSlots: parseInt(e.target.value) };
                        const picks = parseRosterRedraft(input);
                        const result = analyzeRedraft(picks, buildLeagueFromConfig(next), picks.hasPickNumbers);
                        setAnalyzed(result);
                      }
                    }}
                    style={selectStyle}
                  >
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                  </select>
                </div>

                {/* Playoff weeks */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", color: "var(--text-secondary)", marginBottom: "3px", letterSpacing: "0.05em", textTransform: "uppercase" }}>Playoffs</label>
                  <select
                    value={customConfig.playoffWeeks[0]}
                    onChange={(e) => {
                      updateCustomConfig("playoffWeeks", e.target.value);
                      if (analyzed && redraftLeague === "custom") {
                        const next = { ...customConfig, playoffWeeks: e.target.value === "14" ? [14, 15, 16] : [15, 16, 17] };
                        const picks = parseRosterRedraft(input);
                        const result = analyzeRedraft(picks, buildLeagueFromConfig(next), picks.hasPickNumbers);
                        setAnalyzed(result);
                      }
                    }}
                    style={selectStyle}
                  >
                    <option value="15">W15-17</option>
                    <option value="14">W14-16</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Recent Grades History Panel */}
        {gradeHistory.length > 0 && (
          <div style={{ marginBottom: "20px", border: "1px solid var(--bg-elevated)", borderRadius: "6px", overflow: "hidden" }}>
            <button
              onClick={() => setHistoryPanelOpen(prev => !prev)}
              style={{ width: "100%", background: "var(--bg-base)", border: "none", borderBottom: historyPanelOpen ? "1px solid var(--bg-elevated)" : "none", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontFamily: "inherit" }}
            >
              <span style={{ fontSize: "10px", color: "var(--accent-purple)", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 }}>Recent Grades ({gradeHistory.length})</span>
              <span style={{ fontSize: "10px", color: "var(--text-faint)" }}>{historyPanelOpen ? "▲" : "▼"}</span>
            </button>
            {historyPanelOpen && (
              <div style={{ display: "flex", flexDirection: "row", overflowX: "auto" }}>
                {gradeHistory.map((entry, idx) => {
                  const picks = entry.analyzed.picks || entry.analyzed.valid || [];
                  const topThree = picks.slice(0, 3).map(p => p.name || p.raw || "").filter(Boolean);
                  const modeLabel = entry.analysisMode === "redraft"
                    ? "Redraft"
                    : (TOURNAMENTS[entry.tournament] ? TOURNAMENTS[entry.tournament].name : entry.tournament);
                  const dateStr = new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  return (
                    <button
                      key={entry.id}
                      onClick={() => restoreGradeEntry(entry)}
                      onMouseEnter={e => { e.currentTarget.style.background = "#141414"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-surface-alt)"; }}
                      style={{ flex: "0 0 auto", minWidth: "140px", background: "var(--bg-surface-alt)", border: "none", borderRight: idx < gradeHistory.length - 1 ? "1px solid var(--bg-raised)" : "none", padding: "12px 14px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start" }}
                    >
                      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "6px" }}>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: "32px", lineHeight: 1, color: gradeColor(entry.analyzed.grade) }}>{entry.analyzed.grade}</span>
                        <span style={{ fontSize: "10px", color: "var(--text-faint)" }}>{dateStr}</span>
                      </div>
                      <div style={{ fontSize: "9px", color: entry.analysisMode === "redraft" ? "var(--accent-purple-mid)" : "var(--pos-solid)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "5px", fontWeight: 700 }}>{modeLabel}</div>
                      <div style={{ fontSize: "10px", color: "var(--text-dim)", lineHeight: 1.4 }}>{topThree.length > 0 ? topThree.join(" · ") : "—"}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* === CEILING RANKINGS — informational panel (collapsed by default) ===
            League-wide spike/nuclear leaderboard per position with season SOS
            alongside. Pure reference: none of this feeds the score directly
            (ceiling shape is scored per-roster elsewhere) — this exists so the
            draft-prep question "who actually spikes?" has an in-app answer. */}
        <div style={{ marginBottom: "20px", border: "1px solid var(--bg-elevated)", borderRadius: "6px", overflow: "hidden" }}>
          <button
            onClick={() => setCeilingOpen(prev => !prev)}
            style={{ width: "100%", background: "var(--bg-base)", border: "none", borderBottom: ceilingOpen ? "1px solid var(--bg-elevated)" : "none", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontFamily: "inherit" }}
          >
            <span style={{ fontSize: "10px", color: "var(--accent-purple)", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 }}>
              Ceiling Rankings · Spike / Nuclear Weeks
            </span>
            <span style={{ fontSize: "10px", color: "var(--text-faint)" }}>{ceilingOpen ? "▲" : "▼"}</span>
          </button>
          {ceilingOpen && (
            <div style={{ background: "var(--bg-surface)", padding: "12px 14px 10px" }}>
              <div style={{ fontSize: "10px", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "12px", maxWidth: "640px" }}>
                How often each player posted a difference-maker week in 2025. <span style={{ color: "var(--pos)", fontWeight: 600 }}>Spike</span> = 18+ half-PPR points, <span style={{ color: "var(--accent-purple-light)", fontWeight: 600 }}>Nuclear</span> = 28+. SOS = 2026 season schedule rank, <span style={{ fontWeight: 600 }}>1 = easiest</span> of 32. Informational only — a spike profile is last season's shape, not a projection, and role changes override it.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
                {["QB", "RB", "WR", "TE"].map(pos => {
                  const pc = posColor(pos);
                  return (
                    <div key={pos} style={{ background: "var(--bg-inset)", border: "1px solid var(--bg-raised)", borderRadius: "4px", padding: "10px 12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                        <span style={{ fontSize: "11px", color: pc.text, fontWeight: 700, letterSpacing: "0.1em" }}>{pos}</span>
                        <span style={{ fontSize: "8px", color: "var(--text-faint)", letterSpacing: "0.05em" }}>SPIKE · NUKE · SOS</span>
                      </div>
                      {CEILING_RANKINGS[pos].map((p, i) => (
                        <div key={p.name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "3px 0", borderBottom: i < CEILING_RANKINGS[pos].length - 1 ? "1px solid var(--bg-raised)" : "none", fontSize: "11px" }}>
                          <span style={{ color: "var(--text-faint)", fontSize: "9px", width: "14px", flexShrink: 0, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
                          <span style={{ color: "var(--text-primary)", fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "capitalize" }}>
                            {p.name}
                            <span style={{ color: "var(--text-dim)", fontWeight: 400, fontSize: "9px", textTransform: "uppercase" }}> {p.team}{p.gp < 10 ? " ⚠" : ""}</span>
                          </span>
                          <span style={{ color: "var(--pos)", fontWeight: 700, fontSize: "10px", width: "34px", textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{Math.round(p.spike * 100)}%</span>
                          <span style={{ color: p.nuclear > 0 ? "var(--accent-purple-light)" : "var(--text-faint)", fontWeight: 600, fontSize: "10px", width: "30px", textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{Math.round(p.nuclear * 100)}%</span>
                          <span style={{ color: p.sos != null && p.sos <= 10 ? "var(--pos)" : p.sos != null && p.sos >= 23 ? "var(--neg)" : "var(--text-muted)", fontSize: "10px", width: "24px", textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{p.sos ?? "—"}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: "9px", color: "var(--text-dim)", marginTop: "10px", letterSpacing: "0.03em", lineHeight: 1.5 }}>
                ⚠ = under 10 games in 2025, small sample. 8-game minimum to appear. Rates are descriptive of last season at half-PPR thresholds — they rank ceiling access, not expected points.
              </div>
            </div>
          )}
        </div>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: "0", marginBottom: "16px", borderBottom: "1px solid var(--border-subtle)" }}>
          <button
            onClick={() => { setMode("upload"); setUploadTabClicked(true); }}
            className={!uploadTabClicked && mode !== "upload" ? "upload-tab-glow" : ""}
            style={{
              background: "transparent",
              color: mode === "upload" ? "var(--pos)" : "var(--text-muted)",
              border: "none",
              borderBottom: mode === "upload" ? "2px solid var(--pos)" : "2px solid transparent",
              padding: "12px 18px",
              fontSize: "11px",
              fontFamily: "inherit",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontWeight: 600,
              borderRadius: "4px 4px 0 0",
            }}
          >
            📸 Upload Screenshots
          </button>
          <button
            onClick={() => setMode("paste")}
            style={{
              background: "transparent",
              color: mode === "paste" ? "var(--pos)" : "var(--text-muted)",
              border: "none",
              borderBottom: mode === "paste" ? "2px solid var(--pos)" : "2px solid transparent",
              padding: "12px 18px",
              fontSize: "11px",
              fontFamily: "inherit",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ✍ Paste Roster
          </button>
        </div>

        {/* Upload Mode */}
        {mode === "upload" && (
          <div style={{ marginBottom: "24px" }}>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onPaste={handlePaste}
              tabIndex={0}
              style={{
                border: `2px dashed ${dragOver ? "var(--pos)" : "var(--border-default)"}`,
                background: dragOver ? "#0d1f14" : "var(--bg-surface-alt)",
                borderRadius: "6px",
                padding: "40px 20px",
                textAlign: "center",
                transition: "all 0.2s",
                cursor: "pointer",
              }}
              onClick={() => document.getElementById("file-input").click()}
            >
              <input
                id="file-input"
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={(e) => handleFiles(e.target.files)}
              />
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>📸</div>
              <div style={{ fontSize: "14px", color: "var(--text-primary)", marginBottom: "6px", fontWeight: 600 }}>
                Drop your roster screenshot — see what your league-mates can't
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                Underdog · Yahoo · Sleeper · ESPN
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", letterSpacing: "0.04em", marginTop: "4px" }}>
                <span style={{ color: "var(--accent-purple-mid)", fontWeight: 700 }}>Yahoo Tip:</span> go to League tab → press Draft button for full names
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-secondary)", letterSpacing: "0.04em", marginTop: "4px" }}>
                <span style={{ color: "var(--accent-purple-mid)", fontWeight: 700 }}>For Best Results:</span> upload all roster screens · {tournament === "superflex" ? "20 players (superflex)" : "18-20 players (best ball)"} · full roster for redraft · K/DEF auto-filtered
              </div>
            </div>

            {/* Image previews */}
            {uploadedImages.length > 0 && (
              <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "8px" }}>
                {uploadedImages.map((img, i) => (
                  <div key={i} style={{ position: "relative", border: "1px solid var(--border-subtle)", borderRadius: "4px", overflow: "hidden", background: "var(--bg-base)" }}>
                    <img src={img.preview} alt={img.name} style={{ width: "100%", height: "120px", objectFit: "cover", display: "block" }} />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        background: "rgba(0,0,0,0.8)",
                        color: "var(--neg)",
                        border: "none",
                        borderRadius: "3px",
                        width: "22px",
                        height: "22px",
                        cursor: "pointer",
                        fontSize: "12px",
                        lineHeight: 1,
                      }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            {extractError && (
              <div style={{ marginTop: "10px", padding: "10px 14px", background: "#2e1414", border: "1px solid #7c2d12", borderRadius: "4px", color: "var(--warn)", fontSize: "12px" }}>
                {extractError}
                <button
                  onClick={() => { setExtractError(null); setMode("paste"); }}
                  style={{ display: "block", marginTop: "8px", background: "transparent", border: "1px solid #fb923c88", borderRadius: "3px", padding: "5px 10px", color: "var(--warn)", fontSize: "11px", fontWeight: 700, fontFamily: "var(--font-body)", letterSpacing: "0.05em", cursor: "pointer" }}
                >
                  Switch to Paste Text →
                </button>
              </div>
            )}

            {debugResponse && (
              <details style={{ marginTop: "8px" }} open={!!extractError}>
                <summary style={{ cursor: "pointer", fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "6px 0" }}>
                  Show Debug Response
                </summary>
                <pre style={{
                  background: "var(--bg-base)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "3px",
                  padding: "10px",
                  fontSize: "10px",
                  color: "var(--text-secondary)",
                  maxHeight: "300px",
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}>
                  {debugResponse}
                </pre>
              </details>
            )}

            <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
              <button
                onClick={extractFromImages}
                disabled={uploadedImages.length === 0 || extracting}
                className={uploadedImages.length > 0 && !extracting ? "analyze-glow" : ""}
                style={{
                  background: uploadedImages.length > 0 && !extracting ? "var(--accent-cyan)" : "#1a3a3a",
                  color: "var(--bg-base)",
                  border: "none",
                  padding: "12px 24px",
                  fontSize: "12px",
                  fontWeight: 700,
                  fontFamily: "inherit",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: uploadedImages.length > 0 && !extracting ? "pointer" : "not-allowed",
                  opacity: uploadedImages.length > 0 && !extracting ? 1 : 0.4,
                  borderRadius: "3px",
                  width: "100%",
                  maxWidth: "min(400px, 100%)",
                }}
              >
                {extracting ? <span><span className="strobe-dot" style={{ marginRight: "5px" }}>●</span>Extracting…</span> : "Extract & Analyze →"}
              </button>
              {uploadedImages.length > 0 && (
                <button
                  onClick={() => { uploadedImages.forEach(i => URL.revokeObjectURL(i.preview)); setUploadedImages([]); }}
                  style={{
                    background: "transparent",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-default)",
                    padding: "10px 18px",
                    fontSize: "12px",
                    fontFamily: "inherit",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    borderRadius: "3px",
                  }}
                >
                  Clear Images
                </button>
              )}
            </div>
          </div>
        )}

        {/* Paste Mode */}
        {mode === "paste" && (
          <div style={{ marginBottom: "24px" }}>
            {/* How-to-paste callout — removes the #1 friction point for new users */}
            <div style={{
              background: "#0d1a12",
              border: "1px solid #1e3a28",
              borderLeft: "3px solid var(--pos)",
              borderRadius: "5px",
              padding: "12px 14px",
              marginBottom: "12px",
            }}>
              <div style={{ fontSize: "11px", color: "var(--accent-cyan)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px" }}>
                📋 How to paste your roster (15 sec)
              </div>
              <div style={{ fontSize: "12px", color: "#cfcfcf", lineHeight: 1.6 }}>
                <div style={{ marginBottom: "4px" }}><span style={{ color: "var(--accent-cyan)", fontWeight: 700 }}>1.</span> Screenshot your roster on Underdog / Yahoo / Sleeper / ESPN. <span style={{ color: "var(--text-muted)" }}>Yahoo: League → Draft shows full names, or use the new Share button on your team page — the share image works too.</span></div>
                <div style={{ marginBottom: "4px" }}><span style={{ color: "var(--accent-cyan)", fontWeight: 700 }}>2.</span> Open the screenshot in Photos. Press-and-hold the player names — your phone selects the text <span style={{ color: "var(--text-secondary)" }}>(iPhone "Live Text" · Android "Lens")</span>. Tap <span style={{ color: "#fff" }}>Copy</span>.</div>
                <div><span style={{ color: "var(--accent-cyan)", fontWeight: 700 }}>3.</span> Paste it in the box below and hit Analyze. <span style={{ color: "var(--text-muted)" }}>Pick numbers optional.</span></div>
              </div>
            </div>
            {/* === EMPTY-STATE CTA ===
                Most prominent when the user hasn't typed anything yet — this is the
                single most important conversion moment for first-time users. Vanishes
                the moment they start typing so it doesn't fight for attention. */}
            {!input.trim() && (
              <div style={{
                marginBottom: "10px",
                padding: "12px 14px",
                background: "linear-gradient(135deg, #0a1a12, #0d2218)",
                border: "1px solid #1e3a28",
                borderLeft: "3px solid var(--pos)",
                borderRadius: "5px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "10px", color: "var(--pos)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "2px", fontWeight: 700 }}>
                    First time?
                  </div>
                  <div style={{ fontSize: "13px", color: "#cfcfcf", lineHeight: 1.4 }}>
                    See what a full diagnosis looks like.
                  </div>
                </div>
                <button
                  onClick={handleExample}
                  style={{
                    background: "linear-gradient(90deg, #d97706, #b45309)",
                    color: "#1a0e00",
                    border: "none",
                    padding: "10px 16px",
                    fontSize: "12px",
                    fontWeight: 800,
                    fontFamily: "inherit",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    borderRadius: "4px",
                    whiteSpace: "nowrap",
                    boxShadow: "0 0 14px #f59e0b55",
                    flexShrink: 0,
                  }}
                >
                  Load Sample Roster →
                </button>
              </div>
            )}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Paste your roster here — one player per line.\n\nWorks with or without pick numbers:\n  Jayden Daniels 64\n  Bijan Robinson 2\n  Nico Collins\n\nHit Analyze. We'll do the rest.`}
              style={{
                width: "100%",
                minHeight: "200px",
                background: "var(--bg-inset)",
                color: "var(--text-soft)",
                border: "1px solid var(--border-strong)",
                borderRadius: "4px",
                padding: "14px",
                fontFamily: "inherit",
                fontSize: "13px",
                lineHeight: "1.7",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            {/* Pick analysis opt-in toggle — user confirms their paste includes pick numbers */}
            <div
              onClick={() => setShowPickAnalysis(v => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "10px",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <div style={{
                width: "16px",
                height: "16px",
                border: `2px solid ${showPickAnalysis ? "var(--pos)" : "var(--text-faint)"}`,
                borderRadius: "3px",
                background: showPickAnalysis ? "var(--pos)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.15s",
              }}>
                {showPickAnalysis && <span style={{ color: "var(--bg-base)", fontSize: "10px", fontWeight: 900, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontSize: "11px", color: showPickAnalysis ? "#aaa" : "var(--text-dim)", lineHeight: 1.4 }}>
                My roster includes pick numbers — show ADP value / reach analysis
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
              <button
                onClick={handleAnalyze}
                disabled={!input.trim()}
                className={input.trim() ? "analyze-glow" : ""}
                style={{
                  background: input.trim() ? "var(--accent-cyan)" : "#1a3a3a",
                  color: "var(--bg-base)",
                  border: "none",
                  padding: "12px 24px",
                  fontSize: "12px",
                  fontWeight: 700,
                  fontFamily: "inherit",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: input.trim() ? "pointer" : "not-allowed",
                  opacity: input.trim() ? 1 : 0.4,
                  borderRadius: "3px",
                  width: "100%",
                  maxWidth: "min(400px, 100%)",
                }}
              >
                Analyze →
              </button>

              {analyzed && (
                <button
                  onClick={() => { setAnalyzed(null); setInput(""); setAiNutshell(null); setAiFailed(false); setAiLoading(false); setAiPivotNotes({}); setAiStandoutDetails({}); setAiBenchMoveNotes({}); setAiLineupNotes({}); setAiBringBackNotes({}); }}
                  style={{
                    background: "transparent",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border-strong)",
                    padding: "10px 18px",
                    fontSize: "12px",
                    fontFamily: "inherit",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    borderRadius: "3px",
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Shared-grade banner */}
        {sharedView && analyzed && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", background: "#0d1a12", border: "1px solid #22c55e33", borderRadius: "6px", padding: "12px 16px", marginBottom: "16px" }}>
            <span style={{ fontSize: "12px", color: "#86efac", fontWeight: 600 }}>👁 You're viewing a shared roster grade</span>
            <button
              onClick={() => { setSharedView(false); setAnalyzed(null); setAiNutshell(null); setAiFailed(false); setExportedDataUrl(null); window.history.replaceState(null, "", window.location.pathname); setHeroCollapsed(false); }}
              style={{ background: "linear-gradient(90deg, #16a34a, var(--pos-solid))", border: "none", borderRadius: "4px", padding: "8px 16px", color: "#04210f", fontSize: "12px", fontWeight: 700, fontFamily: "var(--font-body)", letterSpacing: "0.03em", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              Grade your own roster →
            </button>
          </div>
        )}

        {/* Output */}
        {analyzed && analyzed.mode !== "redraft" && (
          <div className="fade-in">
            {/* Grade banner */}
            <div className="grade-banner-grid" style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "24px",
              alignItems: "center",
              background: "linear-gradient(135deg, var(--bg-surface), #161616)",
              border: "1px solid var(--border-strong)",
              borderRadius: "6px",
              padding: "24px",
              marginBottom: "20px",
            }}>
              <div className="grade-pulse" style={{
                fontFamily: "var(--font-display)",
                fontSize: "110px",
                lineHeight: 1,
                color: gradeColor(analyzed.grade),
                letterSpacing: "-0.02em",
              }}>
                {analyzed.grade}
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "8px" }}>
                  Overall Ceiling Rating · <span style={{ color: "var(--pos)" }}>{analyzed.tournament.name}</span>
                </div>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "13px" }}>
                  <span><span style={{ color: "var(--text-muted)" }}>QB</span> <span style={{ color: "var(--text-primary)" }}>{analyzed.posCounts.QB}</span></span>
                  <span><span style={{ color: "var(--text-muted)" }}>RB</span> <span style={{ color: "var(--text-primary)" }}>{analyzed.posCounts.RB}</span></span>
                  <span><span style={{ color: "var(--text-muted)" }}>WR</span> <span style={{ color: "var(--text-primary)" }}>{analyzed.posCounts.WR}</span></span>
                  <span><span style={{ color: "var(--text-muted)" }}>TE</span> <span style={{ color: "var(--text-primary)" }}>{analyzed.posCounts.TE}</span></span>
                  <span style={{ marginLeft: "auto", color: "var(--text-muted)" }}>
                    {analyzed.valid.length}/{analyzed.picks.length} matched
                  </span>
                </div>
                {/* Best ball rosters are a FIXED size, so anything short means a
                    player was missed — most often one the screenshot reader skipped.
                    The old floor of 10 only caught catastrophic failures: a 17-of-18
                    roster (the Jul 27 2026 Skattebo case) showed no warning at all,
                    and the match counter read "17/17" because it counts survivors. */}
                {analyzed.valid.length < (analyzed.format === "superflex" ? 20 : 18) && (
                  <div style={{
                    marginTop: "10px",
                    padding: "8px 12px",
                    background: "#1a1200",
                    border: "1px solid #7c5c00",
                    borderRadius: "4px",
                    fontSize: "11px",
                    color: "var(--gold)",
                    letterSpacing: "0.03em",
                  }}>
                    ⚠ Only {analyzed.valid.length} player{analyzed.valid.length !== 1 ? "s" : ""} detected — upload more screens for a complete analysis · {analyzed.format === "superflex" ? "20 players (superflex)" : "18 players (best ball)"} · full roster for redraft · K/DEF auto-filtered
                  </div>
                )}
                {(analyzed.nutshell || aiLoading) && (
                  <div style={{
                    marginTop: "14px",
                    padding: "10px 12px",
                    background: "var(--bg-base)",
                    border: "1px solid var(--border-subtle)",
                    borderLeft: `3px solid ${gradeColor(analyzed.grade)}`,
                    borderRadius: "3px",
                    fontSize: "13px",
                    color: "var(--text-soft)",
                    lineHeight: 1.55,
                  }}>
                    <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px" }}>
                      Your team in a nutshell
                      {aiLoading && (
                        <span className="strobe-dot" style={{ fontSize: "8px", color: "var(--pos)", letterSpacing: "0.08em" }}>● ANALYZING</span>
                      )}
                      {aiNutshell && !aiLoading && (
                        <span style={{ fontSize: "8px", color: "#4ade80aa", letterSpacing: "0.08em" }}>✦ AI</span>
                      )}
                      {aiFailed && !aiLoading && (
                        <button
                          onClick={() => analyzed && fetchAiNutshell(analyzed)}
                          data-compact
                          style={{ fontSize: "8px", color: "var(--neg)", letterSpacing: "0.08em", background: "transparent", border: "1px solid var(--neg)", borderRadius: "3px", padding: "2px 6px", cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" }}
                        >
                          ⚠ AI unavailable · retry
                        </button>
                      )}
                    </div>
                    {aiLoading ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {[100, 85, 70].map((w, i) => (
                          <div key={i} style={{
                            height: "12px",
                            width: `${w}%`,
                            background: "linear-gradient(90deg, var(--bg-raised) 25%, var(--border-strong) 50%, var(--bg-raised) 75%)",
                            backgroundSize: "200% 100%",
                            borderRadius: "3px",
                          }} />
                        ))}
                      </div>
                    ) : (
                      aiNutshell || analyzed.nutshell
                    )}
                  </div>
                )}
                <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>Strengths</div>
                    {analyzed.strengths.length > 0
                      ? analyzed.strengths.map((s, i) => <InsightRow key={i} text={s} color="#a3e635" players={analyzed.valid} />)
                      : <InsightRow text="None identified" color="var(--text-dim)" players={analyzed.valid} />}
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>Weaknesses</div>
                    {analyzed.weaknesses.length > 0
                      ? analyzed.weaknesses.map((w, i) => <InsightRow key={i} text={w} color="#fb923c" players={analyzed.valid} />)
                      : <InsightRow text="None flagged" color="var(--text-dim)" players={analyzed.valid} />}
                  </div>
                </div>

                {/* Grading explainer toggle */}
                <div style={{ marginTop: "12px", marginBottom: "16px" }}>
                  <button
                    onClick={() => setGradeExplainerOpen(o => !o)}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      fontSize: "10px",
                      color: "var(--accent-cyan)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    <span style={{ fontSize: "9px" }}>{gradeExplainerOpen ? "▼" : "▶"}</span>
                    How is this grade calculated?
                  </button>
                  {gradeExplainerOpen && (
                    <div style={{
                      marginTop: "8px",
                      padding: "10px 12px",
                      background: "var(--bg-base)",
                      border: "1px solid var(--bg-elevated)",
                      borderRadius: "4px",
                    }}>
                      <div style={{ fontSize: "9px", color: "var(--text-dim)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "8px" }}>
                        Grade factors · Best Ball
                      </div>
                      {[
                        { label: "Stacks", note: "QB + pass-catcher from same team. More stacks, better matchups = higher grade.", color: "var(--pos)" },
                        { label: "Construction", note: "Right position counts. Targets: 6–7 WR, 5–6 RB, 2–3 TE, 2–3 QB.", color: "var(--pos)" },
                        { label: "Playoff window", note: "W15–W17 opponent quality. Soft schedules rewarded, tough ones penalized.", color: "var(--pos)" },
                        { label: "Bring-backs", note: "Players from both sides of a playoff game. Shootouts help multiple roster spots.", color: "var(--pos)" },
                        { label: "AI review", note: "An AI layer adjusts the grade based on player situations the formula can't see.", color: "var(--accent-cyan)" },
                      ].map((f, i) => (
                        <div key={i} style={{ display: "flex", gap: "8px", alignItems: "baseline", marginBottom: i < 4 ? "6px" : 0 }}>
                          <span style={{ fontSize: "9px", fontWeight: 700, color: f.color, whiteSpace: "nowrap", minWidth: "80px" }}>{f.label}</span>
                          <span style={{ fontSize: "10px", color: "var(--text-muted)", lineHeight: 1.4 }}>{f.note}</span>
                        </div>
                      ))}
                      <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--bg-raised)", fontSize: "10px", color: "var(--text-faint)", lineHeight: 1.5, fontStyle: "italic" }}>
                        Grades are based on available ADP and situation data. AI analysis can miss recent news — always verify before your draft.
                      </div>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "8px", flexWrap: "wrap", marginTop: "16px" }}>
                    <button
                      onClick={handleCreateShareLink}
                      disabled={shareLinkLoading}
                      style={{
                        background: shareLinkCopied ? "#16331f" : "transparent",
                        border: `1px solid ${shareLinkCopied ? "#22c55e55" : shareLinkError ? "#ef444455" : "#22c55e44"}`,
                        borderRadius: "4px",
                        padding: "8px 16px",
                        color: shareLinkCopied ? "var(--pos)" : shareLinkError ? "var(--neg)" : "var(--pos-solid)",
                        fontSize: "12px",
                        fontWeight: 700,
                        fontFamily: "var(--font-body)",
                        letterSpacing: "0.03em",
                        cursor: shareLinkLoading ? "default" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {shareLinkLoading ? "Creating…" : shareLinkCopied ? "✓ Link Copied" : shareLinkError ? "✗ Try Again" : "Copy Link"}
                    </button>
                    <button
                      onClick={() => { setAnalyzed(null); setInput(""); setExportedDataUrl(null); setUploadedImages([]); setAiNutshell(null); setAiFailed(false); setAiLoading(false); setAiPivotNotes({}); setAiStandoutDetails({}); setAiBenchMoveNotes({}); setAiLineupNotes({}); setAiBringBackNotes({}); setCachedShareUrl(null); setTradeOpen(false); setTradeGive(""); setTradeGet(""); setTradeResult(null); setTradeError(null); }}
                      style={{
                        background: "transparent",
                        border: "1px solid var(--border-default)",
                        borderRadius: "4px",
                        padding: "8px 16px",
                        color: "var(--text-dim)",
                        fontSize: "12px",
                        fontWeight: 700,
                        fontFamily: "var(--font-body)",
                        letterSpacing: "0.03em",
                        cursor: "pointer",
                      }}
                    >
                      New Roster
                    </button>
                    <button
                      onClick={handleExportCard}
                      disabled={exportingCard}
                      style={{ background: "none", border: "none", color: "var(--accent-purple)", fontSize: "11px", fontWeight: 600, cursor: exportingCard ? "default" : "pointer", padding: "4px 0", fontFamily: "var(--font-body)", letterSpacing: "0.05em" }}
                    >
                      {exportingCard ? "generating…" : "export grade card"}
                    </button>
                  </div>
                  {shareLinkCopied && (
                    <div style={{ marginTop: "6px", fontSize: "10px", color: "var(--text-faint)", fontFamily: "var(--font-body)" }}>
                      tip: add &src=discord (or reddit/twitter) to the link before pasting, to track clicks by channel
                    </div>
                  )}
                  {exportedDataUrl && (() => { const _hooks = ["Stop drafting blind.", "They're drafting players. You're building a system.", "Bet your roster has a problem you haven't caught yet. Mine did.", "Drafted my best ball squad and immediately ran it through Roster X-Ray. The AI breakdown was brutal but fair."]; const _hook = _hooks[Math.floor(Math.random() * _hooks.length)]; return (
                    <div style={{ marginTop: "14px" }}>
                      <img
                        src={exportedDataUrl}
                        alt="Roster X-Ray Grade Card"
                        style={{ width: "100%", borderRadius: "6px", display: "block", marginBottom: "10px" }}
                      />
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {navigator.share && (
                          <button
                            onClick={async () => {
                              try {
                                const blob = await (await fetch(exportedDataUrl)).blob();
                                const file = new File([blob], "roster-xray.png", { type: "image/png" });
                                await navigator.share({ title: `My Roster X-Ray — ${analyzed.grade}`, text: `I graded my best ball roster on Roster X-Ray. Check yours: rosterxray.com`, files: [file] });
                              } catch(e) { /* dismissed */ }
                            }}
                            style={{ flex: 1, minWidth: "120px", background: "#4ade8022", border: "1px solid #4ade8055", borderRadius: "4px", padding: "8px 12px", color: "var(--pos)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", cursor: "pointer", fontFamily: "var(--font-body)" }}
                          >
                            📤 Share
                          </button>
                        )}
                        <a
                          href={exportedDataUrl}
                          download="roster-xray.png"
                          style={{ flex: 1, minWidth: "120px", background: "#ffffff0a", border: "1px solid var(--border-default)", borderRadius: "4px", padding: "8px 12px", color: "var(--text-secondary)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", cursor: "pointer", fontFamily: "var(--font-body)", textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                        >
                          ⬇ Save Image
                        </a>
                        <a
                          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${["A", "A-"].includes(analyzed.grade) ? "Stacks look clean, playoff matchups are elite. www.rosterxray.com confirmed it." : ["B+", "B"].includes(analyzed.grade) ? "Thought I crushed this draft. Turns out my playoff stacks have matchup problems I completely missed. Wouldn't have known without: www.rosterxray.com" : "Way more problems than I thought, but now I know exactly how to up my draft game. Thanks for the honest breakdown: www.rosterxray.com"}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ flex: 1, minWidth: "120px", background: "#1d9bf022", border: "1px solid #1d9bf055", borderRadius: "4px", padding: "8px 12px", color: "#1d9bf0", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", cursor: "pointer", fontFamily: "var(--font-body)", textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                        >
                          𝕏 Post to X
                        </a>
                      </div>
                    </div>
                  );})()}
                </div>
              </div>
            </div>

            {/* Unmatched players */}
            {analyzed.picks.some(p => p.notFound) && (
              <div style={{
                background: "#1f1410",
                border: "1px solid #7c2d12",
                borderRadius: "4px",
                padding: "12px 16px",
                marginBottom: "20px",
                fontSize: "12px",
              }}>
                <div style={{ color: "var(--warn)", fontWeight: 600, marginBottom: "4px", letterSpacing: "0.05em" }}>UNMATCHED</div>
                <div style={{ color: "#a8a29e" }}>
                  {analyzed.picks.filter(p => p.notFound).map(p => p.raw).join(" · ")}
                </div>
              </div>
            )}

            {/* Playoff Window Preview */}
            {(() => {
              const allWithScores = [];
              const pvInitialName = (name) => {
                const parts = name.split(" ");
                return parts.length > 1 ? `${parts[0][0]}. ${parts[parts.length - 1]}` : name;
              };
              (analyzed.stackGrades || []).forEach(stack => {
                const playerWeeks = {};
                const opps = PLAYOFFS[stack.team] || ["?","?","?"];
                (stack.weekDetails || []).forEach((weekArr, wkIdx) => {
                  (weekArr || []).forEach(p => {
                    if (!playerWeeks[p.name]) playerWeeks[p.name] = { name: p.name, pos: p.pos, team: stack.team, score: 0, weeks: [null, null, null] };
                    playerWeeks[p.name].score += (p.score || 0);
                    playerWeeks[p.name].weeks[wkIdx] = { color: p.color, tier: p.tier, opp: opps[wkIdx] };
                  });
                });
                Object.values(playerWeeks).forEach(p => allWithScores.push(p));
              });
              (analyzed.orphans || []).forEach(p => {
                const opps = PLAYOFFS[p.team] || ["?","?","?"];
                const weeks = (p.matchups || []).map((m, i) => ({ color: m.color, tier: m.tier, opp: opps[i] }));
                const score = (p.matchups || []).reduce((sum, m) => sum + (m.score || 0), 0);
                allWithScores.push({ name: p.name, pos: p.pos, team: p.team, score, weeks });
              });
              if (!allWithScores.length) return null;
              allWithScores.sort((a, b) => b.score - a.score);
              const top = allWithScores.slice(0, 3);
              const watchCandidates = allWithScores.filter(p => !top.find(t => t.name === p.name));
              const watchPlayers = watchCandidates.slice(-Math.min(2, watchCandidates.length));
              return (
                <div style={{ marginBottom: "16px", background: "var(--bg-base)", border: "1px solid #2d1f4a", borderRadius: "6px", padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "12px" }}>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: "20px", letterSpacing: "0.05em", margin: 0, color: "var(--text-primary)" }}>
                      PLAYOFF WINDOW PREVIEW
                    </h2>
                    <span style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase" }}>W15–W17 playoff schedule</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: watchPlayers.length > 0 ? "1fr 1fr" : "1fr", gap: "12px" }}>
                    <div>
                      <div style={{ fontSize: "10px", color: "var(--pos)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, marginBottom: "6px" }}>▲ Best windows</div>
                      {top.map((p, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: i < top.length - 1 ? "1px solid var(--bg-inset)" : "none" }}>
                          <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 600 }}>{pvInitialName(p.name)} <span style={{ color: "var(--text-dim)", fontWeight: 400, fontSize: "10px" }}>{p.pos}</span></span>
                          <div style={{ display: "flex", gap: "3px" }}>
                            {[0,1,2].map(wi => {
                              const w = p.weeks ? p.weeks[wi] : null;
                              return (
                                <div key={wi} style={{ ...wkChipStyle(w?.color || "neutral"), width: "30px", fontSize: "8px" }}>
                                  {(w?.opp || "?").replace("@","").slice(0,3)}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    {watchPlayers.length > 0 && (
                      <div>
                        <div style={{ fontSize: "10px", color: "var(--warn)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, marginBottom: "6px" }}>▼ Watch</div>
                        {watchPlayers.map((p, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: i < watchPlayers.length - 1 ? "1px solid var(--bg-inset)" : "none" }}>
                            <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 600 }}>{pvInitialName(p.name)} <span style={{ color: "var(--text-dim)", fontWeight: 400, fontSize: "10px" }}>{p.pos}</span></span>
                            <div style={{ display: "flex", gap: "3px" }}>
                              {[0,1,2].map(wi => {
                                const w = p.weeks ? p.weeks[wi] : null;
                                return (
                                  <div key={wi} style={{ ...wkChipStyle(w?.color || "neutral"), width: "30px", fontSize: "8px" }}>
                                    {(w?.opp || "?").replace("@","").slice(0,3)}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Stacks */}
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{
                fontFamily: "var(--font-display)",
                fontSize: "24px",
                letterSpacing: "0.05em",
                margin: "0 0 4px",
                color: "var(--text-primary)",
              }}>
                STACKS · PLAYOFF MATCHUPS
              </h2>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "10px", lineHeight: 1.5, maxWidth: "640px" }}>
                A stack = a QB + at least one pass-catcher from the same team. When your QB throws a touchdown, your receiver scores too — <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>double the upside</span>. The matchup rating shows how favorable their shared playoff schedule is.
              </div>
              <MatchupLegend />
              {analyzed.stackGrades.length === 0 && (
                <div style={{ color: "var(--text-muted)", fontSize: "13px", padding: "12px", border: "1px dashed var(--border-strong)", borderRadius: "4px" }}>
                  No multi-player team groupings detected.
                </div>
              )}
              {analyzed.stackGrades.map((stack, idx) => {
                const total = stack.normalizedScore;
                const stackTier = total >= 12 ? "Elite" : total >= 10 ? "Strong" : total >= 8 ? "Neutral" : "Weak";
                const stackColor = total >= 12 ? "var(--pos)" : total >= 10 ? "var(--pos-bright)" : total >= 8 ? "var(--caution)" : "var(--neg)";
                return (
                  <div key={idx} style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "4px",
                    padding: "16px",
                    marginBottom: "10px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                      <div>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: "22px", color: "var(--text-primary)", letterSpacing: "0.05em" }}>
                          {stack.team}
                        </span>
                        <span style={{ marginLeft: "10px", fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                          {stack.type} {stack.hasQB ? "· w/ QB" : "· no QB"}
                        </span>
                      </div>
                      <span style={{ fontSize: "11px", color: stackColor, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>
                        {stackTier} Matchups
                      </span>
                    </div>

                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "10px" }}>
                      {stack.players.map(p => (
                        <span key={p.name} style={{ marginRight: "12px" }}>
                          <span style={{ color: "var(--text-primary)" }}>{p.name}</span> <span style={{ color: "var(--text-dim)" }}>{p.pos}</span>
                        </span>
                      ))}
                    </div>

                    {/* Week grid */}
                    <div className="playoff-week-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                      {["W15", "W16", "W17"].map((wk, wkIdx) => {
                        const details = stack.weekDetails[wkIdx];
                        return (
                          <div key={wk} style={{
                            background: "#161616",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "3px",
                            padding: "8px 10px",
                          }}>
                            <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: "4px" }}>
                              {wk} · {PLAYOFFS[stack.team]?.[wkIdx]}
                            </div>
                            {details.map((d, i) => {
                              const s = tierStyle(d.color);
                              return (
                                <div key={i} style={{
                                  fontSize: "10px",
                                  color: s.text,
                                  marginBottom: "2px",
                                  display: "flex",
                                  justifyContent: "space-between",
                                }}>
                                  <span>{d.name} <span style={{ color: "var(--text-dim)" }}>({d.pos})</span></span>
                                  <span style={{ fontWeight: 600 }}>{d.tier}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* === BRING-BACK GAME STACKS === */}
            {analyzed.bringBacks.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h2 style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "24px",
                  letterSpacing: "0.05em",
                  margin: "0 0 4px",
                  color: "var(--text-primary)",
                }}>
                  BRING-BACK STACKS · SAME GAME
                </h2>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "10px", lineHeight: 1.5, maxWidth: "640px" }}>
                  You roster players from <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>both sides</span> of the same playoff game. If that game turns into a shootout, multiple players on your team spike at once — stacked upside in the week that matters most.
                </div>
                {/* Week color key — categorical, not the matchup scale */}
                <div style={{ display: "flex", gap: "12px", fontSize: "9px", marginBottom: "12px", letterSpacing: "0.05em", flexWrap: "wrap" }}>
                  <span style={{ color: weekColor(0).text, fontWeight: 600 }}>● W15</span>
                  <span style={{ color: weekColor(1).text, fontWeight: 600 }}>● W16</span>
                  <span style={{ color: weekColor(2).text, fontWeight: 600 }}>● W17</span>
                  <span style={{ color: "var(--text-dim)" }}>· playoff week color</span>
                </div>
                {analyzed.bringBacks.map((bb, idx) => {
                  const wc = weekColor(bb.weekIdx);
                  const isCeiling = bb.isCeilingGame;
                  const aiNote = aiPivotNotes[`bringback_${bb.stackTeam}_${bb.opponent}_${bb.week}`];
                  return (
                  <div key={idx} style={{
                    background: isCeiling ? "#050d1a" : wc.bg,
                    border: isCeiling ? `1px solid #22d3ee99` : `1px solid ${wc.border}55`,
                    borderLeft: isCeiling ? `3px solid var(--accent-cyan)` : `3px solid ${wc.border}`,
                    borderRadius: "4px",
                    padding: "12px 16px",
                    marginBottom: "8px",
                  }}>
                    <div style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{
                        color: wc.text,
                        fontWeight: 700,
                        background: `${wc.border}22`,
                        border: `1px solid ${wc.border}66`,
                        borderRadius: "3px",
                        padding: "1px 7px",
                      }}>{bb.week}</span>
                      <span style={{ color: "#999" }}>{bb.teamA.team} vs {bb.teamB.team}</span>
                      {isCeiling ? (
                        <span style={{
                          color: "var(--accent-cyan)", fontWeight: 700, background: "#051520",
                          border: "1px solid #22d3ee66", borderRadius: "3px",
                          padding: "1px 7px", fontSize: "9px",
                        }}>🔥 CEILING GAME</span>
                      ) : bb.hasQB && (
                        <span style={{
                          color: "var(--accent-cyan)", fontWeight: 700, background: "#0d3320",
                          border: "1px solid #22c55e66", borderRadius: "3px",
                          padding: "1px 7px", fontSize: "9px",
                        }}>★ QB GAME STACK</span>
                      )}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "12px", alignItems: "center", fontSize: "12px" }}>
                      <div>
                        <div style={{ color: "var(--text-secondary)", fontSize: "10px", letterSpacing: "0.05em", marginBottom: "4px" }}>{bb.teamA.team}</div>
                        {bb.teamA.players.map(p => (
                          <div key={p.name} style={{ color: "var(--text-primary)" }}>
                            {p.name} <span style={{ color: "var(--text-dim)" }}>{p.pos}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ color: wc.text, fontSize: "20px", textAlign: "center" }}>↔</div>
                      <div>
                        <div style={{ color: "var(--text-secondary)", fontSize: "10px", letterSpacing: "0.05em", marginBottom: "4px" }}>{bb.teamB.team}</div>
                        {bb.teamB.players.map(p => (
                          <div key={p.name} style={{ color: "var(--text-primary)" }}>
                            {p.name} <span style={{ color: "var(--text-dim)" }}>{p.pos}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {aiNote && (
                      <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: `1px solid ${wc.border}33`, fontSize: "10px", color: "#aaa", lineHeight: 1.5 }}>
                        {aiNote}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}

            {/* === ORPHAN CLASSIFICATION === */}
            {analyzed.orphans.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h2 style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "24px",
                  letterSpacing: "0.05em",
                  margin: "0 0 4px",
                  color: "var(--text-primary)",
                }}>
                  SOLO PICKS · NO TEAM STACK
                </h2>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "10px", lineHeight: 1.5, maxWidth: "640px" }}>
                  Players you drafted <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>without any teammates</span>. Solo picks aren't automatically bad — what matters is their <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>playoff matchup</span>. The chips below show each player's W15/W16/W17 difficulty.
                </div>
                <MatchupLegend />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "8px" }}>
                  {analyzed.orphans.sort((a, b) => b.normalized - a.normalized).map((o, i) => {
                    const s = tierStyle(o.color);
                    return (
                      <div key={i} style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-strong)",
                        borderRadius: "4px",
                        padding: "10px 12px",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                          <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 600 }}>{o.name}</span>
                          <span style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.05em" }}>{o.pos} · {o.team}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                          <span style={{
                            display: "inline-block",
                            fontSize: "9px",
                            color: o.tier === "Elite Window" ? "var(--pos)"
                                 : o.tier === "Strong Matchups" ? "var(--pos-bright)"
                                 : o.tier === "Soft Spot" ? "var(--caution)"
                                 : "var(--warn)",
                            background: o.tier === "Elite Window" ? "#4ade8015"
                                      : o.tier === "Strong Matchups" ? "#a3e63515"
                                      : o.tier === "Soft Spot" ? "#facc1515"
                                      : "#fb923c15",
                            border: `1px solid ${
                              o.tier === "Elite Window" ? "#4ade8044"
                            : o.tier === "Strong Matchups" ? "#a3e63544"
                            : o.tier === "Soft Spot" ? "#facc1544"
                            : "#fb923c44"}`,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            padding: "1px 7px",
                            borderRadius: "3px",
                            textTransform: "uppercase",
                          }}>
                            {o.tier}
                          </span>
                          {/* Hidden Gem badge — elite matchups at late-round price */}
                          {(o.tier === "Elite Window" || o.tier === "Strong Matchups") && o.adp >= 100 &&
                           (o.matchups || []).reduce((sum, m) => sum + m.score, 0) >= 12 && (
                            <span style={{
                              display: "inline-block",
                              fontSize: "9px",
                              color: "var(--accent-cyan)",
                              background: "#0a1f2a",
                              border: "1px solid #22d3ee55",
                              fontWeight: 700,
                              letterSpacing: "0.08em",
                              padding: "1px 7px",
                              borderRadius: "3px",
                              textTransform: "uppercase",
                            }}>
                              💎 Hidden Gem
                            </span>
                          )}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px", fontSize: "9px" }}>
                          {o.matchups.map((m, j) => {
                            const ms = tierStyle(m.color);
                            return (
                              <div key={j} style={{
                                background: ms.bg,
                                border: `1px solid ${ms.border}66`,
                                borderRadius: "3px",
                                padding: "4px 5px",
                                textAlign: "center",
                                lineHeight: 1.3,
                              }}>
                                <div style={{ color: "var(--text-muted)", fontSize: "8px", letterSpacing: "0.05em" }}>{["W15", "W16", "W17"][j]}</div>
                                <div style={{ color: ms.text, fontWeight: 700, fontSize: "10px" }}>{m.opp}</div>
                                <div style={{ color: ms.text, fontWeight: 600, fontSize: "9px" }}>{m.tier}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* === DRAFT PIVOT RECOMMENDATIONS === */}
            {analyzed.topPivots.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h2 style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "24px",
                  letterSpacing: "0.05em",
                  margin: "0 0 4px",
                  color: "var(--text-primary)",
                }}>
                  WHAT IF YOU HAD<span style={{ color: "var(--text-muted)" }}>...</span>
                </h2>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "8px", lineHeight: 1.5, maxWidth: "640px" }}>
                  Every pick has a road not taken. Here are the players sitting at <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>similar ADP</span> as your picks — and whether grabbing them instead would have built a stronger roster.
                </div>
                {/* Upgrade tier legend */}
                <div style={{ display: "flex", gap: "10px", fontSize: "9px", marginBottom: "12px", letterSpacing: "0.05em", flexWrap: "wrap" }}>
                  <span style={{ color: "var(--pos)", fontWeight: 600 }}>■ BIG UPGRADE</span>
                  <span style={{ color: "var(--caution)", fontWeight: 600 }}>■ UPGRADE</span>
                  <span style={{ color: "var(--info-blue)", fontWeight: 600 }}>■ SLIGHT</span>
                  <span style={{ color: "var(--border-default)" }}>· vs your actual pick's playoff matchups</span>
                </div>
                {analyzed.topPivots.map((pivot, idx) => {
                  // Determine best alt tier for card left border color
                  const bestAlt = pivot.alternatives[0];
                  const cardAccent = bestAlt?.improvement >= 4 ? "var(--pos-solid)"
                    : bestAlt?.improvement >= 2 ? "var(--gold)"
                    : "var(--border-default)";

                  return (
                  <div key={idx} style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderLeft: `3px solid ${cardAccent}`,
                    borderRadius: "4px",
                    padding: "10px 14px",
                    marginBottom: "8px",
                  }}>
                    {/* Picked player header */}
                    <div style={{ fontSize: "12px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span style={{ color: "var(--text-dim)", fontSize: "10px", fontFamily: "var(--font-mono)" }}>Pick #{pivot.pickNum}</span>
                      <span style={{ color: "#ffffff", fontWeight: 700, fontSize: "13px" }}>{pivot.picked.name}</span>
                      <span style={{
                        fontSize: "9px", fontWeight: 700,
                        color: pivot.picked.pos === "QB" ? "var(--gold)" : pivot.picked.pos === "RB" ? "var(--accent-cyan)" : pivot.picked.pos === "WR" ? "var(--pos)" : "var(--accent-purple-light)",
                        background: pivot.picked.pos === "QB" ? "#f59e0b18" : pivot.picked.pos === "RB" ? "#22d3ee18" : pivot.picked.pos === "WR" ? "#4ade8018" : "#c084fc18",
                        border: `1px solid ${pivot.picked.pos === "QB" ? "#f59e0b44" : pivot.picked.pos === "RB" ? "#22d3ee44" : pivot.picked.pos === "WR" ? "#4ade8044" : "#c084fc44"}`,
                        borderRadius: "3px", padding: "1px 5px", fontFamily: "var(--font-mono)",
                      }}>{pivot.picked.pos}·{pivot.picked.team}</span>
                      <span style={{ color: "var(--text-faint)", fontSize: "10px", fontFamily: "var(--font-mono)" }}>ADP {pivot.picked.adp}</span>
                    </div>
                    <div style={{ fontSize: "9px", color: "var(--text-faint)", letterSpacing: "0.08em", marginBottom: "6px", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>Pivot Options</div>
                    {pivot.alternatives.map((alt, j) => {
                      const laymanReason = (() => {
                        if (alt.stackFit && alt.altSmash >= 2) {
                          return `Connects with your ${alt.team} stack + ${alt.altSmash} Smash weeks in playoffs`;
                        }
                        if (alt.stackFit) {
                          return `Connects with your ${alt.team} stack — instant correlation in playoff weeks`;
                        }
                        if (alt.altSmash >= 2 && alt.playerSmash === 0) {
                          return `${alt.altSmash} Smash matchups in W15–W17 vs 0 for ${pivot.picked.name.split(" ").pop()}`;
                        }
                        if (alt.altSmash > alt.playerSmash && alt.altSmash >= 1) {
                          return `${alt.altSmash} Smash week${alt.altSmash > 1 ? "s" : ""} vs ${alt.playerSmash} for ${pivot.picked.name.split(" ").pop()} — better playoff ceiling`;
                        }
                        if (alt.altAvoid === 0 && alt.playerAvoid >= 2) {
                          return `0 brutal matchups in playoffs vs ${alt.playerAvoid} for ${pivot.picked.name.split(" ").pop()}`;
                        }
                        if (alt.altAvoid < alt.playerAvoid) {
                          return `Fewer tough playoff matchups than ${pivot.picked.name.split(" ").pop()} — cleaner ceiling`;
                        }
                        if (alt.adpDelta < -8) {
                          return `${Math.abs(Math.round(alt.adpDelta))} picks cheaper at similar value — frees draft capital`;
                        }
                        if (alt.improvement >= 4) {
                          return `Significantly better playoff matchups — worth the swap at this ADP`;
                        }
                        return `Modest playoff upgrade at roughly the same draft cost`;
                      })();

                      const upgradeTier = alt.improvement >= 4
                        ? { label: "BETTER MATCHUPS", color: "#4ade80", bg: "#0a2018", border: "#22c55e55", rowBg: "#0d2318" }
                        : alt.improvement >= 2
                        ? { label: "SOFTER SCHEDULE", color: "#f59e0b", bg: "#221800", border: "#f59e0b55", rowBg: "#1a1400" }
                        : { label: "SLIGHT EDGE", color: "#60a5fa", bg: "#0d1520", border: "#60a5fa33", rowBg: "#111418" };

                      return (
                      <div key={j} style={{
                        padding: "7px 10px",
                        background: upgradeTier.rowBg,
                        border: `1px solid ${upgradeTier.border}`,
                        borderRadius: "4px",
                        marginBottom: "5px",
                        fontSize: "11px",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "4px" }}>
                          <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <span style={{ color: "#ffffff", fontWeight: 700 }}>{alt.name}</span>
                            <span style={{ color: "var(--text-faint)", fontSize: "10px" }}>{alt.pos} · {alt.team} · ADP {alt.adp}</span>
                          </div>
                          <span style={{
                            background: upgradeTier.bg,
                            border: `1px solid ${upgradeTier.border}`,
                            color: upgradeTier.color,
                            fontSize: "8px",
                            fontWeight: 800,
                            padding: "2px 8px",
                            borderRadius: "3px",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            flexShrink: 0,
                            boxShadow: alt.improvement >= 4 ? `0 0 8px ${upgradeTier.color}44` : "none",
                          }}>{upgradeTier.label}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          {alt.stackFit && (
                            <span style={{
                              background: "linear-gradient(90deg, var(--pos-solid), #16a34a)",
                              color: "#03110a",
                              fontWeight: 800,
                              padding: "2px 7px",
                              borderRadius: "3px",
                              fontSize: "9px",
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              boxShadow: "0 0 10px #22c55e66",
                              flexShrink: 0,
                            }}>★ Stack Fit</span>
                          )}
                          {alt.breaksBringBack && (
                            <span style={{
                              background: alt.brokenWeekLabel === "W16" ? "#2a0800" : "#1a0a00",
                              border: `1px solid ${alt.brokenWeekLabel === "W16" ? "#ef4444cc" : "#f97316aa"}`,
                              color: alt.brokenWeekLabel === "W16" ? "var(--neg)" : "#f97316",
                              fontWeight: 800,
                              padding: "2px 7px",
                              borderRadius: "3px",
                              fontSize: "9px",
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              flexShrink: 0,
                            }}>⚠ Breaks {alt.brokenWeekLabel} Bring-Back</span>
                          )}
                          <span style={{ color: "var(--text-secondary)", fontSize: "10px", lineHeight: 1.4 }}>
                            {aiPivotNotes[alt.name] || laymanReason}
                          </span>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                  );
                })}
              </div>
            )}

            {/* === BYE WEEK MAP === */}
            {Object.keys(analyzed.byeMap).length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h2 style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "24px",
                  letterSpacing: "0.05em",
                  margin: "0 0 4px",
                  color: "var(--text-primary)",
                }}>
                  BYE WEEK MAP
                </h2>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "6px", lineHeight: 1.5, maxWidth: "640px" }}>
                  Each bye week shows which of your players are sitting that week. Watch for <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>stacked-position byes</span> — too many <span style={{ color: posColor("RB").text }}>RBs</span> or <span style={{ color: posColor("WR").text }}>WRs</span> on the same week creates a hole.
                </div>
                <div style={{ display: "flex", gap: "10px", fontSize: "9px", marginBottom: "10px", letterSpacing: "0.05em" }}>
                  <span style={{ color: posColor("QB").text, fontWeight: 600 }}>● QB</span>
                  <span style={{ color: posColor("RB").text, fontWeight: 600 }}>● RB</span>
                  <span style={{ color: posColor("WR").text, fontWeight: 600 }}>● WR</span>
                  <span style={{ color: posColor("TE").text, fontWeight: 600 }}>● TE</span>
                </div>
                <div style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "4px",
                  padding: "12px 16px",
                }}>
                  {Object.entries(analyzed.byeMap).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([wk, players]) => {
                    const conflict = analyzed.byeConflicts.find(c => c.week === parseInt(wk));
                    return (
                      <div key={wk} style={{
                        display: "grid",
                        gridTemplateColumns: "60px 1fr",
                        gap: "12px",
                        padding: "6px 0",
                        borderBottom: "1px solid var(--bg-raised)",
                        alignItems: "center",
                      }}>
                        <span style={{
                          fontSize: "12px",
                          color: conflict ? "var(--warn)" : "var(--text-secondary)",
                          fontWeight: 600,
                          letterSpacing: "0.05em",
                        }}>
                          BYE {wk}
                        </span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", fontSize: "10px" }}>
                          {players.map(p => {
                            const pc = posColor(p.pos);
                            return (
                              <span key={p.name} style={{
                                background: pc.bg,
                                border: `1px solid ${pc.border}44`,
                                padding: "2px 8px",
                                borderRadius: "3px",
                                color: "var(--text-soft)",
                              }}>
                                {p.name} <span style={{ color: pc.text, fontWeight: 600 }}>{p.pos}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {analyzed.byeConflicts.length > 0 && (
                    <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid var(--border-strong)", fontSize: "10px", color: "var(--warn)" }}>
                      ⚠ Conflicts: {analyzed.byeConflicts.map(c => `${c.count} ${c.pos}s on bye ${c.week}`).join(" · ")}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* === STACK UNIQUENESS PROXY === */}
            {analyzed.stackGrades.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h2 style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "24px",
                  letterSpacing: "0.05em",
                  margin: "0 0 4px",
                  color: "var(--text-primary)",
                }}>
                  FIELD DIFFERENTIATION
                </h2>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "12px", lineHeight: 1.5, maxWidth: "640px" }}>
                  Win big tournaments by being different from the field. <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>Chalky teams</span> are owned by most of your opponents — low leverage. <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>Leverage teams</span> are yours alone — that's where the edge lives.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "8px" }}>
                  {analyzed.stackGrades.map((stack, i) => {
                    const isLeverage = stack.uniqueness?.includes("Leverage");
                    const isChalk = stack.uniqueness?.includes("Chalk");
                    const color = isLeverage ? "var(--pos)" : isChalk ? "var(--warn)" : "var(--caution)";
                    const bg = isLeverage ? "#0d3320" : isChalk ? "#2a1a18" : "#2a2618";
                    return (
                      <div key={i} style={{
                        background: bg,
                        border: `1px solid ${color}`,
                        borderRadius: "4px",
                        padding: "10px 12px",
                      }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                          {stack.team}
                        </div>
                        <div style={{ fontSize: "10px", color: color, fontWeight: 600, letterSpacing: "0.05em" }}>
                          {stack.uniqueness?.toUpperCase()}
                        </div>
                        <div style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "4px" }}>
                          {stack.chalkLevel} ownership · avg ADP {(stack.players.reduce((s, p) => s + p.adp, 0) / stack.players.length).toFixed(0)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* === ROSTER STANDOUTS === */}
            {analyzed.rosterStandouts && analyzed.rosterStandouts.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h2 style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "24px",
                  letterSpacing: "0.05em",
                  margin: "0 0 4px",
                  color: "var(--text-primary)",
                }}>
                  🎯 ROSTER STANDOUTS
                </h2>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "12px", lineHeight: 1.5, maxWidth: "640px" }}>
                  Your roster's <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>best assets</span> — the picks most likely to win you a week. One highlight per player, picked from your <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>biggest edges</span>.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "8px" }}>
                  {analyzed.rosterStandouts.map((s, i) => {
                    const pc = posColor(s.player.pos);
                    return (
                      <div key={i} style={{
                        background: "#0d1a12",
                        border: "1px solid #1e3a28",
                        borderLeft: "3px solid var(--pos)",
                        borderRadius: "4px",
                        padding: "10px 12px",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                          <span style={{ fontSize: "16px" }}>{s.icon}</span>
                          <span style={{
                            fontSize: "9px",
                            color: "var(--pos)",
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                          }}>{s.label}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "5px", gap: "8px" }}>
                          <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 600 }}>{s.player.name}</span>
                          <span style={{
                            fontSize: "9px",
                            color: pc.text,
                            background: pc.bg,
                            border: `1px solid ${pc.border}44`,
                            padding: "1px 6px",
                            borderRadius: "3px",
                            fontWeight: 600,
                          }}>{s.player.pos} · {s.player.team}</span>
                        </div>
                        <div style={{ fontSize: "11px", color: "#cfcfcf", lineHeight: 1.5 }}>
                          {aiStandoutDetails[s.player.name] || s.detail}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}


            {/* ADP Deltas — only if user opted in AND pick numbers detected with confidence */}
            {showPickAnalysis && analyzed.hasPickNumbers && analyzed.adpFlags.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h2 style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "24px",
                  letterSpacing: "0.05em",
                  margin: "0 0 12px",
                  color: "var(--text-primary)",
                }}>
                  ADP DELTAS
                </h2>
                <div style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "4px",
                  padding: "12px 16px",
                }}>
                  {analyzed.adpFlags.sort((a, b) => b.delta - a.delta).map((p, i) => (
                    <div key={i} style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      gap: "12px",
                      alignItems: "center",
                      fontSize: "12px",
                      padding: "4px 0",
                      borderBottom: i < analyzed.adpFlags.length - 1 ? "1px solid var(--bg-raised)" : "none",
                    }}>
                      <span style={{ color: "var(--text-muted)", width: "32px" }}>#{p.actualPick}</span>
                      <span><span style={{ color: "var(--text-primary)" }}>{p.name}</span> <span style={{ color: "var(--text-dim)" }}>{p.pos} · {p.team}</span></span>
                      <span style={{
                        color: p.delta > 0 ? "var(--pos)" : "var(--warn)",
                        fontWeight: 600,
                        fontSize: "11px",
                        letterSpacing: "0.05em",
                      }}>
                        {p.delta > 0 ? `+${p.delta.toFixed(0)} VALUE` : `${p.delta.toFixed(0)} REACH`}
                        <span style={{ color: "var(--text-dim)", marginLeft: "6px", fontWeight: 400 }}>(ADP {p.adp})</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showPickAnalysis && !analyzed.hasPickNumbers && (
              <div style={{
                marginBottom: "20px",
                padding: "10px 14px",
                background: "#161616",
                border: "1px dashed var(--border-default)",
                borderRadius: "4px",
                fontSize: "11px",
                color: "var(--text-secondary)",
                letterSpacing: "0.02em",
              }}>
                <span style={{ color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>ADP Delta · </span>
                Add pick numbers to enable ADP delta analysis. Format: "Gibbs 1" or "1 Gibbs" or "Pick 24 Nabers".
              </div>
            )}

            {/* Full roster */}
            <div>
              <h2 style={{
                fontFamily: "var(--font-display)",
                fontSize: "24px",
                letterSpacing: "0.05em",
                margin: "0 0 4px",
                color: "var(--text-primary)",
              }}>
                FULL ROSTER
              </h2>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "0 0 10px", maxWidth: "640px", lineHeight: 1.5 }}>
                {analyzed.hasPickNumbers
                  ? "Sorted by draft slot — your picks from Round 1 to the wire."
                  : "Your full roster. Add pick numbers to unlock draft slot and ADP value analysis."}
              </p>
              <div style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "4px",
                padding: "12px 16px",
              }}>
                {analyzed.picks.map((p, i) => {
                  const pc = posColor(p.pos);
                  const pickNum = analyzed.hasPickNumbers
                    ? (p.actualPick != null ? p.actualPick : null)
                    : null;
                  const rcFlag = (analyzed.roleCeilingFlags || []).find(f => f.name === p.name);
                  return (
                    <div key={i} style={{
                      display: "grid",
                      gridTemplateColumns: analyzed.hasPickNumbers ? "32px 1fr auto auto" : "1fr auto auto",
                      gap: "10px",
                      padding: "5px 0",
                      borderBottom: i < analyzed.picks.length - 1 ? "1px solid var(--bg-raised)" : "none",
                      fontSize: "12px",
                      alignItems: "center",
                      opacity: p.notFound ? 0.4 : 1,
                    }}>
                      {analyzed.hasPickNumbers && (
                        <span style={{ color: "var(--text-faint)", fontSize: "10px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {pickNum != null ? `#${pickNum}` : "—"}
                        </span>
                      )}
                      <span>
                        <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{p.name}</span>
                        {" "}
                        <span style={{
                          fontSize: "9px",
                          background: pc.bg,
                          border: `1px solid ${pc.border}44`,
                          color: pc.text,
                          padding: "1px 4px",
                          borderRadius: "2px",
                        }}>{p.pos}·{p.team || "—"}</span>
                        {rcFlag && (
                          <span title={rcFlag.trendNote} style={{
                            display: "inline-flex",
                            alignItems: "center",
                            marginLeft: "6px",
                            fontSize: "9px",
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                            color: "var(--warn)",
                            background: "#2a1a0e",
                            border: "1px solid #fb923c55",
                            padding: "1px 5px",
                            borderRadius: "2px",
                          }}>
                            {rcFlag.roleCeiling === "slot_only" ? "SLOT TRAP" : "TD DEPENDENT"}
                          </span>
                        )}
                      </span>
                      <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>
                        {p.team && BYES[p.team] ? `Bye ${BYES[p.team]}` : "—"}
                      </span>
                      <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>
                        {p.adp ? `ADP ${p.adp}` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* === SEASON SCHEDULE — advance-rate view (collapsed by default) ===
                The visual companion to the Advance Rate Layer: full W1-18 tier
                grid, ADP-sorted, split after the 9 core scorers the layer
                actually scores. Deliberately quieter than the redraft grid —
                best ball is won W15-17, this exists to sanity-check the road
                there, not to imply weekly management. */}
            {analyzed.seasonSchedules && analyzed.seasonSchedules.length > 0 && (
              <div style={{ marginBottom: "20px", border: "1px solid var(--bg-elevated)", borderRadius: "6px", overflow: "hidden" }}>
                <button
                  onClick={() => setBbScheduleOpen(prev => !prev)}
                  style={{ width: "100%", background: "var(--bg-base)", border: "none", borderBottom: bbScheduleOpen ? "1px solid var(--bg-elevated)" : "none", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontFamily: "inherit" }}
                >
                  <span style={{ fontSize: "10px", color: "var(--accent-purple)", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 }}>
                    Season Schedule · Advance-Rate View
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--text-faint)" }}>{bbScheduleOpen ? "▲" : "▼"}</span>
                </button>
                {bbScheduleOpen && (
                  <div style={{ background: "var(--bg-surface)", padding: "12px 0 10px" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-secondary)", lineHeight: 1.5, padding: "0 12px 10px", maxWidth: "640px" }}>
                      Every player, every week, sorted by ADP. The first 9 rows are the core scorers the advance-rate check grades — their W1–W14 slate is what carries you to the playoff window.
                    </div>
                    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: "4px" }}>
                      <div style={{ display: "inline-block", minWidth: "100%" }}>
                        {/* Week header — same synced-scroll pattern as the redraft grid */}
                        <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                          <div style={{ position: "sticky", left: 0, width: "120px", flexShrink: 0, background: "var(--bg-surface)", zIndex: 2, paddingLeft: "12px", paddingRight: "10px", fontSize: "9px", color: "var(--text-dim)", letterSpacing: "0.05em" }}>
                            PLAYER
                          </div>
                          <div style={{ display: "flex", gap: "3px", paddingRight: "12px" }}>
                            {Array.from({ length: 18 }, (_, i) => {
                              const wkNum = i + 1;
                              const isPlayoff = wkNum >= 15 && wkNum <= 17;
                              return (
                                <React.Fragment key={i}>
                                  {wkNum === 15 && <div style={{ width: "1px", background: "#3a2a4a", margin: "0 4px", alignSelf: "stretch" }} />}
                                  <div style={{ width: "34px", textAlign: "center", fontWeight: isPlayoff ? 700 : 500, color: isPlayoff ? "var(--accent-purple-light)" : "var(--text-dim)", fontSize: "9px", letterSpacing: "0.05em", flexShrink: 0 }}>
                                    W{wkNum}
                                  </div>
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>
                        {analyzed.seasonSchedules.map((s, idx) => {
                          const pc = posColor(s.pos);
                          const isDepth = idx >= 9;
                          const isLast = idx === analyzed.seasonSchedules.length - 1;
                          return (
                            <React.Fragment key={idx}>
                              {idx === 9 && (
                                <div style={{ display: "flex", alignItems: "center", padding: "8px 0 4px", borderTop: "1px solid var(--bg-raised)", marginTop: "4px" }}>
                                  <div style={{ position: "sticky", left: 0, width: "120px", flexShrink: 0, background: "var(--bg-surface)", zIndex: 2, paddingLeft: "12px", paddingRight: "10px", fontSize: "9px", color: "var(--text-secondary)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                                    Depth
                                  </div>
                                </div>
                              )}
                              <div style={{ display: "flex", alignItems: "center", padding: "5px 0", borderBottom: isLast ? "none" : "1px solid var(--bg-raised)", opacity: isDepth ? 0.78 : 1 }}>
                                <div style={{ position: "sticky", left: 0, width: "120px", flexShrink: 0, background: "var(--bg-surface)", zIndex: 2, paddingLeft: "12px", paddingRight: "10px", minWidth: 0 }}>
                                  <div style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {s.name}
                                  </div>
                                  <div style={{ fontSize: "9px", color: pc.text, fontWeight: 600, letterSpacing: "0.05em" }}>
                                    {s.pos} · {s.team}{s.adp ? ` · ADP ${Math.round(s.adp)}` : ""}
                                  </div>
                                </div>
                                <div style={{ display: "flex", gap: "3px", paddingRight: "12px" }}>
                                  {s.weeklyMatchups.map((m, wIdx) => {
                                    const isPlayoff = m.week >= 15 && m.week <= 17;
                                    if (m.isBye) {
                                      return (
                                        <React.Fragment key={wIdx}>
                                          {m.week === 15 && <div style={{ width: "1px", background: "#3a2a4a", margin: "0 4px", alignSelf: "stretch", flexShrink: 0 }} />}
                                          <div style={{ width: "34px", flexShrink: 0, background: "var(--bg-raised)", border: `1px solid ${isPlayoff ? "#3a2a4a" : "var(--border-strong)"}`, borderRadius: "3px", padding: "3px 2px", textAlign: "center", color: "var(--text-dim)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.03em" }}>
                                            BYE
                                          </div>
                                        </React.Fragment>
                                      );
                                    }
                                    const ms = tierStyle(m.color);
                                    const isAway = m.opp.startsWith("@");
                                    const teamCode = m.opp.replace("@", "");
                                    return (
                                      <React.Fragment key={wIdx}>
                                        {m.week === 15 && <div style={{ width: "1px", background: "#3a2a4a", margin: "0 4px", alignSelf: "stretch", flexShrink: 0 }} />}
                                        <div style={{ width: "34px", flexShrink: 0, background: ms.bg, border: `${isPlayoff ? "1.5px" : "1px"} solid ${ms.border}${isPlayoff ? "" : "88"}`, borderRadius: "3px", padding: "3px 2px", textAlign: "center", color: ms.text, fontSize: "9px", fontWeight: 700, letterSpacing: "0.02em", lineHeight: 1.2 }}>
                                          <span style={{ color: "var(--text-muted)", fontSize: "8px" }}>{isAway ? "@" : ""}</span>{teamCode}
                                        </div>
                                      </React.Fragment>
                                    );
                                  })}
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ fontSize: "9px", color: "var(--text-dim)", marginTop: "8px", paddingTop: "6px", borderTop: "1px solid var(--bg-raised)", letterSpacing: "0.05em", padding: "6px 12px 0" }}>
                      ← swipe to scroll all 18 weeks · <span style={{ color: "var(--accent-purple-light)", fontWeight: 600 }}>purple W15–W17</span> = the weeks that win the tournament
                    </div>
                    <div style={{ padding: "8px 12px 2px" }}>
                      <button
                        onClick={async () => {
                          setScheduleExport("working");
                          try {
                            const canvas = renderScheduleCanvas({
                              starters: analyzed.seasonSchedules.slice(0, 9),
                              bench: analyzed.seasonSchedules.slice(9),
                              grade: analyzed.grade,
                              subtitle: `${analyzed.tournament?.name || "Best Ball"} · ${analyzed.seasonSchedules.length} players by ADP · generated ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
                              adpUpdated: ADP_UPDATED,
                              sectionLabels: { top: "CORE SCORERS · TOP 9 BY ADP", rest: "DEPTH" },
                            });
                            const res = await saveScheduleImage(canvas, `rosterxray-bestball-schedule-${new Date().toISOString().slice(0, 10)}.png`);
                            setScheduleExport(res === "cancelled" ? "idle" : "saved");
                            track("export_schedule", { mode: res, variant: "bestball" });
                          } catch (err) {
                            setScheduleExport("error");
                          }
                          setTimeout(() => setScheduleExport("idle"), 2600);
                        }}
                        disabled={scheduleExport === "working"}
                        style={{
                          background: scheduleExport === "saved" ? "#0d3320" : "transparent",
                          border: `1px solid ${scheduleExport === "saved" ? "#22c55e" : scheduleExport === "error" ? "#ef4444" : "#3a2a4a"}`,
                          color: scheduleExport === "saved" ? "var(--pos)" : scheduleExport === "error" ? "var(--neg)" : "var(--accent-purple-light)",
                          fontFamily: "inherit",
                          fontSize: "10px",
                          fontWeight: 600,
                          letterSpacing: "0.08em",
                          padding: "7px 13px",
                          borderRadius: "3px",
                          cursor: scheduleExport === "working" ? "wait" : "pointer",
                          width: "100%",
                        }}
                      >
                        {scheduleExport === "working" ? "RENDERING…"
                          : scheduleExport === "saved" ? "✓ SAVED"
                          : scheduleExport === "error" ? "COULD NOT SAVE — TRY AGAIN"
                          : "↓ SAVE FULL SCHEDULE AS IMAGE"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* === REDRAFT OUTPUT === */}
        {analyzed && analyzed.mode === "redraft" && (
          <div className="fade-in">
            {/* Grade banner */}
            <div className="grade-banner-grid" style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "24px",
              alignItems: "center",
              background: "linear-gradient(135deg, var(--bg-surface), #161616)",
              border: "1px solid var(--border-strong)",
              borderRadius: "6px",
              padding: "24px",
              marginBottom: "20px",
            }}>
              <div className="grade-pulse" style={{
                fontFamily: "var(--font-display)",
                fontSize: "110px",
                lineHeight: 1,
                color: gradeColor(analyzed.grade),
                letterSpacing: "-0.02em",
              }}>
                {analyzed.grade}
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "8px" }}>
                  Redraft Grade · <span style={{ color: "var(--accent-purple-light)" }}>{analyzed.league.name}</span>
                </div>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "13px" }}>
                  <span><span style={{ color: "var(--text-muted)" }}>QB</span> <span style={{ color: "var(--text-primary)" }}>{analyzed.posCounts.QB}</span></span>
                  <span><span style={{ color: "var(--text-muted)" }}>RB</span> <span style={{ color: "var(--text-primary)" }}>{analyzed.posCounts.RB}</span></span>
                  <span><span style={{ color: "var(--text-muted)" }}>WR</span> <span style={{ color: "var(--text-primary)" }}>{analyzed.posCounts.WR}</span></span>
                  <span><span style={{ color: "var(--text-muted)" }}>TE</span> <span style={{ color: "var(--text-primary)" }}>{analyzed.posCounts.TE}</span></span>
                  <span style={{ marginLeft: "auto", color: "var(--text-muted)" }}>
                    {analyzed.valid.length}/{analyzed.picks.length} matched
                  </span>
                </div>
                {/* Redraft stays lenient: league roster sizes genuinely vary (14-18),
                    so a fixed expectation would cry wolf. The match counter plus the
                    notFound rows carry the signal here instead. */}
                {analyzed.valid.length < 10 && (
                  <div style={{
                    marginTop: "10px",
                    padding: "8px 12px",
                    background: "#1a1200",
                    border: "1px solid #7c5c00",
                    borderRadius: "4px",
                    fontSize: "11px",
                    color: "var(--gold)",
                    letterSpacing: "0.03em",
                  }}>
                    ⚠ Only {analyzed.valid.length} player{analyzed.valid.length !== 1 ? "s" : ""} detected — upload more screens for a complete analysis · {analyzed.format === "superflex" ? "20 players (superflex)" : "18 players (best ball)"} · full roster for redraft · K/DEF auto-filtered
                  </div>
                )}
                {(analyzed.nutshell || aiLoading) && (
                  <div style={{
                    marginTop: "14px",
                    padding: "10px 12px",
                    background: "var(--bg-base)",
                    border: "1px solid var(--border-subtle)",
                    borderLeft: `3px solid ${gradeColor(analyzed.grade)}`,
                    borderRadius: "3px",
                    fontSize: "13px",
                    color: "var(--text-soft)",
                    lineHeight: 1.55,
                  }}>
                    <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px" }}>
                      Your team in a nutshell
                      {aiLoading && (
                        <span className="strobe-dot" style={{ fontSize: "8px", color: "var(--accent-purple-light)", letterSpacing: "0.08em" }}>● ANALYZING</span>
                      )}
                      {aiNutshell && !aiLoading && (
                        <span style={{ fontSize: "8px", color: "#c084fcaa", letterSpacing: "0.08em" }}>✦ AI</span>
                      )}
                      {aiFailed && !aiLoading && (
                        <button
                          onClick={() => analyzed && fetchAiNutshell(analyzed)}
                          data-compact
                          style={{ fontSize: "8px", color: "var(--neg)", letterSpacing: "0.08em", background: "transparent", border: "1px solid var(--neg)", borderRadius: "3px", padding: "2px 6px", cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" }}
                        >
                          ⚠ AI unavailable · retry
                        </button>
                      )}
                    </div>
                    {aiLoading ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {[100, 85, 70].map((w, i) => (
                          <div key={i} style={{
                            height: "12px",
                            width: `${w}%`,
                            background: "linear-gradient(90deg, var(--bg-raised) 25%, var(--border-strong) 50%, var(--bg-raised) 75%)",
                            backgroundSize: "200% 100%",
                            borderRadius: "3px",
                          }} />
                        ))}
                      </div>
                    ) : (
                      aiNutshell || analyzed.nutshell
                    )}
                  </div>
                )}
                <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>Strengths</div>
                    {analyzed.strengths.length > 0
                      ? analyzed.strengths.map((s, i) => <InsightRow key={i} text={s} color="#a3e635" players={analyzed.valid} />)
                      : <InsightRow text="None identified" color="var(--text-dim)" players={analyzed.valid} />}
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>Weaknesses</div>
                    {analyzed.weaknesses.length > 0
                      ? analyzed.weaknesses.map((w, i) => <InsightRow key={i} text={w} color="#fb923c" players={analyzed.valid} />)
                      : <InsightRow text="None flagged" color="var(--text-dim)" players={analyzed.valid} />}
                  </div>
                </div>

                {/* Grading explainer toggle — redraft */}
                <div style={{ marginTop: "12px", marginBottom: "16px" }}>
                  <button
                    onClick={() => setGradeExplainerOpen(o => !o)}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      fontSize: "10px",
                      color: "var(--accent-cyan)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    <span style={{ fontSize: "9px" }}>{gradeExplainerOpen ? "▼" : "▶"}</span>
                    How is this grade calculated?
                  </button>
                  {gradeExplainerOpen && (
                    <div style={{
                      marginTop: "8px",
                      padding: "10px 12px",
                      background: "var(--bg-base)",
                      border: "1px solid var(--bg-elevated)",
                      borderRadius: "4px",
                    }}>
                      <div style={{ fontSize: "9px", color: "var(--text-dim)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "8px" }}>
                        Grade factors · Redraft
                      </div>
                      {[
                        { label: "Lineup caliber", note: "Average ADP of your starters. Lower = better players = better grade.", color: "var(--accent-purple-light)" },
                        { label: "Depth", note: "Enough RBs and WRs to survive injuries. Targets: 4–5 RB, 5–6 WR.", color: "var(--accent-purple-light)" },
                        { label: "Bye weeks", note: "Starters sharing the same bye = lineup hole that week. Penalized by count.", color: "var(--accent-purple-light)" },
                        { label: "Playoff schedule", note: "W15–W17 matchup quality for your starters. Soft slates rewarded.", color: "var(--accent-purple-light)" },
                        { label: "AI review", note: "An AI layer adjusts the grade based on player situations the formula can't see.", color: "var(--accent-cyan)" },
                      ].map((f, i) => (
                        <div key={i} style={{ display: "flex", gap: "8px", alignItems: "baseline", marginBottom: i < 4 ? "6px" : 0 }}>
                          <span style={{ fontSize: "9px", fontWeight: 700, color: f.color, whiteSpace: "nowrap", minWidth: "90px" }}>{f.label}</span>
                          <span style={{ fontSize: "10px", color: "var(--text-muted)", lineHeight: 1.4 }}>{f.note}</span>
                        </div>
                      ))}
                      <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--bg-raised)", fontSize: "10px", color: "var(--text-faint)", lineHeight: 1.5, fontStyle: "italic" }}>
                        Grades are based on available ADP and situation data. AI analysis can miss recent news — always verify before your draft.
                      </div>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "8px", flexWrap: "wrap", marginTop: "16px" }}>
                    <button
                      onClick={handleCreateShareLink}
                      disabled={shareLinkLoading}
                      style={{
                        background: shareLinkCopied ? "#16331f" : "transparent",
                        border: `1px solid ${shareLinkCopied ? "#22c55e55" : shareLinkError ? "#ef444455" : "#22c55e44"}`,
                        borderRadius: "4px",
                        padding: "8px 16px",
                        color: shareLinkCopied ? "var(--pos)" : shareLinkError ? "var(--neg)" : "var(--pos-solid)",
                        fontSize: "12px",
                        fontWeight: 700,
                        fontFamily: "var(--font-body)",
                        letterSpacing: "0.03em",
                        cursor: shareLinkLoading ? "default" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {shareLinkLoading ? "Creating…" : shareLinkCopied ? "✓ Link Copied" : shareLinkError ? "✗ Try Again" : "Copy Link"}
                    </button>
                    <button
                      onClick={() => { setAnalyzed(null); setInput(""); setExportedDataUrl(null); setUploadedImages([]); setAiNutshell(null); setAiFailed(false); setAiLoading(false); setAiPivotNotes({}); setAiStandoutDetails({}); setAiBenchMoveNotes({}); setAiLineupNotes({}); setAiBringBackNotes({}); setCachedShareUrl(null); setTradeOpen(false); setTradeGive(""); setTradeGet(""); setTradeResult(null); setTradeError(null); }}
                      style={{
                        background: "transparent",
                        border: "1px solid var(--border-default)",
                        borderRadius: "4px",
                        padding: "8px 16px",
                        color: "var(--text-dim)",
                        fontSize: "12px",
                        fontWeight: 700,
                        fontFamily: "var(--font-body)",
                        letterSpacing: "0.03em",
                        cursor: "pointer",
                      }}
                    >
                      New Roster
                    </button>
                    <button
                      onClick={handleExportCard}
                      disabled={exportingCard}
                      style={{ background: "none", border: "none", color: "var(--accent-purple)", fontSize: "11px", fontWeight: 600, cursor: exportingCard ? "default" : "pointer", padding: "4px 0", fontFamily: "var(--font-body)", letterSpacing: "0.05em" }}
                    >
                      {exportingCard ? "generating…" : "export grade card"}
                    </button>
                  </div>
                  {shareLinkCopied && (
                    <div style={{ marginTop: "6px", fontSize: "10px", color: "var(--text-faint)", fontFamily: "var(--font-body)" }}>
                      tip: add &src=discord (or reddit/twitter) to the link before pasting, to track clicks by channel
                    </div>
                  )}
                  {exportedDataUrl && (() => { const _hooks = ["Stop drafting blind.", "They're drafting players. You're building a system.", "Bet your roster has a problem you haven't caught yet. Mine did.", "Drafted my redraft roster and immediately ran it through Roster X-Ray. The AI breakdown was brutal but fair."]; const _hook = _hooks[Math.floor(Math.random() * _hooks.length)]; return (
                    <div style={{ marginTop: "14px" }}>
                      <img
                        src={exportedDataUrl}
                        alt="Roster X-Ray Grade Card"
                        style={{ width: "100%", borderRadius: "6px", display: "block", marginBottom: "10px" }}
                      />
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {navigator.share && (
                          <button
                            onClick={async () => {
                              try {
                                const blob = await (await fetch(exportedDataUrl)).blob();
                                const file = new File([blob], "roster-xray.png", { type: "image/png" });
                                await navigator.share({ title: `My Roster X-Ray — ${analyzed.grade}`, text: `I graded my redraft roster on Roster X-Ray. Check yours: rosterxray.com`, files: [file] });
                              } catch(e) { /* dismissed */ }
                            }}
                            style={{ flex: 1, minWidth: "120px", background: "#c084fc22", border: "1px solid #c084fc55", borderRadius: "4px", padding: "8px 12px", color: "var(--accent-purple-light)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", cursor: "pointer", fontFamily: "var(--font-body)" }}
                          >
                            📤 Share
                          </button>
                        )}
                        <a
                          href={exportedDataUrl}
                          download="roster-xray.png"
                          style={{ flex: 1, minWidth: "120px", background: "#ffffff0a", border: "1px solid var(--border-default)", borderRadius: "4px", padding: "8px 12px", color: "var(--text-secondary)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", cursor: "pointer", fontFamily: "var(--font-body)", textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                        >
                          ⬇ Save Image
                        </a>
                        <a
                          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${["A", "A-"].includes(analyzed.grade) ? "Roster looks clean, matchups are elite. www.rosterxray.com confirmed it." : ["B+", "B"].includes(analyzed.grade) ? "Thought I crushed this draft. Turns out I had matchup problems I completely missed. Wouldn't have known without: www.rosterxray.com" : "Way more problems than I thought, but now I know exactly how to up my draft game. Thanks for the honest breakdown: www.rosterxray.com"}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ flex: 1, minWidth: "120px", background: "#1d9bf022", border: "1px solid #1d9bf055", borderRadius: "4px", padding: "8px 12px", color: "#1d9bf0", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", cursor: "pointer", fontFamily: "var(--font-body)", textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                        >
                          𝕏 Post to X
                        </a>
                      </div>
                    </div>
                  );})()}
                </div>
              </div>
            </div>

            {/* Trade Analyzer */}
            {analyzed.mode === "redraft" && (
              <div style={{ marginBottom: "16px", border: "1px solid #6d28d9", borderLeft: "3px solid var(--accent-purple-strong)", borderRadius: "4px" }}>
                <button
                  onClick={() => setTradeOpen(o => !o)}
                  style={{
                    width: "100%",
                    background: tradeOpen ? "#0d0a14" : "#09060f",
                    border: "none",
                    borderRadius: tradeOpen ? "4px 4px 0 0" : "4px",
                    padding: "12px 16px",
                    color: "var(--accent-purple)",
                    fontSize: "12px",
                    fontWeight: 700,
                    fontFamily: "var(--font-body)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
                    <span>⇄ WHAT IF?</span>
                    <span style={{ fontSize: "9px", color: "#a78bfa", fontWeight: 600, letterSpacing: "0.05em", textTransform: "none" }}>Swap players and see your new grade</span>
                  </div>
                  <span style={{ fontSize: "9px", color: "#a78bfa" }}>{tradeOpen ? "▲" : "▼"}</span>
                </button>
                {tradeOpen && (
                  <div style={{ padding: "14px 16px", borderTop: "1px solid var(--bg-raised)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "6px" }}>
                      <div>
                        <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "5px" }}>Swap out</div>
                        <input
                          value={tradeGive}
                          onChange={e => { setTradeGive(e.target.value); setTradeResult(null); setTradeError(null); }}
                          placeholder="e.g. Jefferson, Adams"
                          style={{ width: "100%", background: "var(--bg-base)", border: "1px solid var(--border-strong)", borderRadius: "3px", padding: "7px 10px", color: "var(--text-soft)", fontSize: "12px", fontFamily: "var(--font-body)", boxSizing: "border-box", outline: "none" }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "5px" }}>Swap in</div>
                        <input
                          value={tradeGet}
                          onChange={e => { setTradeGet(e.target.value); setTradeResult(null); setTradeError(null); }}
                          placeholder="e.g. Hill, Chase"
                          style={{ width: "100%", background: "var(--bg-base)", border: "1px solid var(--border-strong)", borderRadius: "3px", padding: "7px 10px", color: "var(--text-soft)", fontSize: "12px", fontFamily: "var(--font-body)", boxSizing: "border-box", outline: "none" }}
                        />
                      </div>
                    </div>
                    <div style={{ fontSize: "9px", color: "var(--text-faint)", marginBottom: "10px", letterSpacing: "0.03em" }}>Separate multiple players with a comma</div>
                    <button
                      onClick={handleTradeAnalysis}
                      style={{ background: "linear-gradient(90deg, #4c1d95, #5b21b6)", border: "1px solid #6d28d955", borderRadius: "3px", padding: "8px 16px", color: "#c4b5fd", fontSize: "11px", fontWeight: 700, fontFamily: "var(--font-body)", letterSpacing: "0.05em", cursor: "pointer" }}
                    >
                      Analyze Swap →
                    </button>
                    {tradeError && (
                      <div style={{ marginTop: "10px", padding: "8px 12px", background: "#1a0f00", border: "1px solid #92400e", borderRadius: "3px", color: "var(--warn)", fontSize: "11px" }}>
                        {tradeError}
                      </div>
                    )}
                    {tradeResult && (() => {
                      const scoreDelta = tradeResult.score - analyzed.score;
                      const gradeUp = scoreDelta > 0;
                      const newStrengths = tradeResult.strengths.filter(s => !analyzed.strengths.includes(s));
                      const newWeaknesses = tradeResult.weaknesses.filter(w => !analyzed.weaknesses.includes(w));
                      return (
                        <div style={{ marginTop: "14px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "10px" }}>
                            <div style={{ padding: "12px", background: "var(--bg-base)", border: "1px solid var(--border-subtle)", borderRadius: "4px" }}>
                              <div style={{ fontSize: "9px", color: "var(--text-dim)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "6px" }}>Before</div>
                              <div style={{ fontFamily: "var(--font-display)", fontSize: "52px", color: gradeColor(analyzed.grade), lineHeight: 1 }}>{analyzed.grade}</div>
                              <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>Score {analyzed.score.toFixed(1)}</div>
                            </div>
                            <div style={{ padding: "12px", background: "var(--bg-base)", border: `1px solid ${gradeUp ? "#22c55e44" : "#ef444444"}`, borderRadius: "4px" }}>
                              <div style={{ fontSize: "9px", color: "var(--text-dim)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "6px" }}>After</div>
                              <div style={{ fontFamily: "var(--font-display)", fontSize: "52px", color: gradeColor(tradeResult.grade), lineHeight: 1 }}>{tradeResult.grade}</div>
                              <div style={{ fontSize: "11px", color: gradeUp ? "var(--pos)" : "var(--neg)", marginTop: "4px" }}>
                                {gradeUp ? "+" : ""}{scoreDelta.toFixed(1)} pts
                              </div>
                            </div>
                          </div>
                          {(newStrengths.length > 0 || newWeaknesses.length > 0) && (
                            <div style={{ fontSize: "12px" }}>
                              {newStrengths.map((s, i) => (
                                <div key={i} style={{ color: "var(--pos)", marginBottom: "3px" }}>+ {s}</div>
                              ))}
                              {newWeaknesses.map((w, i) => (
                                <div key={i} style={{ color: "var(--warn)", marginBottom: "3px" }}>- {w}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Starting Lineup */}
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{
                fontFamily: "var(--font-display)",
                fontSize: "24px",
                letterSpacing: "0.05em",
                margin: "0 0 4px",
                color: "var(--text-primary)",
              }}>
                STARTING LINEUP · OPTIMAL
              </h2>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "0 0 10px", maxWidth: "640px", lineHeight: 1.5 }}>
                Your <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>best possible lineup</span> based on ADP — the players most likely to start every week. ADP shown for reference.
              </p>
              <div style={{
                background: "var(--bg-surface)",
                border: "1px solid #2a1a3a",
                borderRadius: "4px",
                padding: "8px 16px",
              }}>
                {/* Flatten to per-player rows: slot label only on first row of each slot */}
                {(() => {
                  const rows = [];
                  Object.entries(analyzed.startingLineup).forEach(([slot, players]) => {
                    players.forEach((p, idx) => {
                      rows.push({ slot, player: p, isFirstInSlot: idx === 0, slotSize: players.length });
                    });
                  });
                  return rows.map((r, i) => {
                    const pc = posColor(r.player.pos);
                    return (
                      <div key={i} style={{
                        display: "grid",
                        gridTemplateColumns: "56px 1fr auto",
                        gap: "12px",
                        padding: "7px 0",
                        borderBottom: i < rows.length - 1 ? "1px solid var(--bg-raised)" : "none",
                        alignItems: "center",
                        fontSize: "12px",
                      }}>
                        <span style={{
                          color: r.isFirstInSlot ? "var(--accent-purple-light)" : "transparent",
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                          fontSize: "11px",
                        }}>
                          {r.slot}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                          <span style={{ color: "var(--text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r.player.name}
                          </span>
                          <span style={{
                            fontSize: "9px",
                            color: pc.text,
                            background: pc.bg,
                            border: `1px solid ${pc.border}44`,
                            padding: "1px 6px",
                            borderRadius: "3px",
                            fontWeight: 600,
                            flexShrink: 0,
                            letterSpacing: "0.03em",
                          }}>
                            {r.player.pos}·{r.player.team}
                          </span>
                        </div>
                        <span style={{ color: "var(--text-muted)", fontSize: "10px", whiteSpace: "nowrap" }}>
                          ADP <span style={{ color: "#a8a8a8", fontWeight: 600 }}>{Math.round(r.player.adp)}</span>
                        </span>
                      </div>
                    );
                  });
                })()}
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "8px", paddingTop: "8px", borderTop: "1px solid var(--border-strong)", letterSpacing: "0.05em" }}>
                  Overall starting lineup avg ADP: <span style={{ color: "var(--accent-purple-light)", fontWeight: 600 }}>{analyzed.avgStarterADP.toFixed(1)}</span>
                </div>
              </div>
            </div>

            {/* Positional Depth */}
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{
                fontFamily: "var(--font-display)",
                fontSize: "24px",
                letterSpacing: "0.05em",
                margin: "0 0 12px",
                color: "var(--text-primary)",
              }}>
                POSITIONAL DEPTH
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px" }}>
                {Object.entries(analyzed.depthAnalysis).map(([pos, d]) => {
                  const isWeak = d.depth < 1;
                  const isStrong = d.depth >= 3;
                  const color = isWeak ? "#f87171" : isStrong ? "#4ade80" : "#facc15";
                  return (
                    <div key={pos} style={{
                      background: "var(--bg-surface)",
                      border: `1px solid ${color}40`,
                      borderLeft: `3px solid ${color}`,
                      borderRadius: "4px",
                      padding: "10px 12px",
                    }}>
                      <div style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: 600 }}>{pos}: {d.count}</div>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
                        Need: {d.needed} starter(s){d.depth >= 0 ? `, ${d.depth} bench` : ", THIN"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bye Week Notes */}
            {analyzed.criticalByeConflicts.filter(c => c.severity !== "info").length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h2 style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "24px",
                  letterSpacing: "0.05em",
                  margin: "0 0 4px",
                  color: "var(--text-primary)",
                }}>
                  BYE WEEK CONFLICTS
                </h2>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "0 0 10px", maxWidth: "640px", lineHeight: 1.5 }}>
                  When multiple starters <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>share the same bye</span>, you're forced to start backups in their place. Critical = your entire position is on bye that week. Warning = partial hole.
                </p>
                {analyzed.criticalByeConflicts.map((c, i) => (
                  <div key={i} style={{
                    background: c.severity === "critical" ? "#2e1414" : c.severity === "warning" ? "#2a2618" : "#141414",
                    border: `1px solid ${c.severity === "critical" ? "#dc2626" : c.severity === "warning" ? "#eab308" : "var(--border-default)"}`,
                    borderLeft: `3px solid ${c.severity === "critical" ? "#dc2626" : c.severity === "warning" ? "#eab308" : "var(--text-dim)"}`,
                    borderRadius: "3px",
                    padding: "8px 12px",
                    marginBottom: "6px",
                    fontSize: "12px",
                  }}>
                    <span style={{ color: c.severity === "critical" ? "var(--neg)" : c.severity === "warning" ? "var(--caution)" : "var(--text-muted)", fontWeight: c.severity === "info" ? 400 : 600, letterSpacing: "0.05em" }}>
                      {c.severity === "critical" ? "⚠ CRITICAL · " : c.severity === "warning" ? "⚠ " : "ℹ "}{c.msg}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Playoff Schedule */}
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{
                fontFamily: "var(--font-display)",
                fontSize: "24px",
                letterSpacing: "0.05em",
                margin: "0 0 4px",
                color: "var(--text-primary)",
              }}>
                PLAYOFF SCHEDULE · STARTERS
              </h2>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "0 0 10px", maxWidth: "640px", lineHeight: 1.5 }}>
                The playoff weeks that <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>make or break</span> your season. Each /10 score reflects how favorable a starter's W15–W17 matchups are — 7+ is <span style={{ color: "var(--pos)", fontWeight: 600 }}>good</span>, 4 or below is a <span style={{ color: "var(--neg)", fontWeight: 600 }}>red flag</span>.
              </p>
              <MatchupLegend />
              <div style={{
                background: "var(--bg-surface)",
                border: "1px solid #2a1a3a",
                borderRadius: "4px",
                padding: "12px 16px",
              }}>
                {analyzed.playoffMatchups.map((p, i) => {
                  const scoreOf10 = Math.round((p.totalScore / 15) * 10);
                  const scoreColor = scoreOf10 >= 7 ? "var(--pos)" : scoreOf10 <= 4 ? "var(--neg)" : "var(--caution)";
                  const pc = (() => {
                    if (p.pos === "QB") return { bg: "#fbbf2420", border: "#fbbf24", text: "var(--caution-alt)" };
                    if (p.pos === "RB") return { bg: "#22d3ee20", border: "#22d3ee", text: "var(--accent-cyan)" };
                    if (p.pos === "WR") return { bg: "#f472b620", border: "#f472b6", text: "var(--pink)" };
                    return { bg: "#a78bfa20", border: "#a78bfa", text: "var(--accent-purple)" };
                  })();
                  return (
                    <div key={i} style={{
                      padding: "8px 0",
                      borderBottom: i < analyzed.playoffMatchups.length - 1 ? "1px solid var(--bg-raised)" : "none",
                    }}>
                      {/* Row 1: name + pos chip + score */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                          <span style={{ color: "var(--text-primary)", fontSize: "12px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.name}
                          </span>
                          <span style={{
                            fontSize: "9px",
                            background: pc.bg,
                            border: `1px solid ${pc.border}44`,
                            color: pc.text,
                            padding: "1px 5px",
                            borderRadius: "2px",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}>
                            {p.pos}·{p.team}
                          </span>
                        </div>
                        <span style={{
                          color: scoreColor,
                          fontSize: "14px",
                          fontWeight: 700,
                          fontFamily: "var(--font-display)",
                          letterSpacing: "0.03em",
                          flexShrink: 0,
                          marginLeft: "8px",
                        }}>
                          {scoreOf10}<span style={{ color: "var(--text-dim)", fontSize: "10px", fontWeight: 500 }}>/10</span>
                        </span>
                      </div>
                      {/* Row 2: matchup chips */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                        {p.playoffMatches.map((m, j) => {
                          const s = tierStyle(m.color);
                          const env = getGameEnvironmentLabel(m.opp, m.week);
                          return (
                            <div key={j} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              <span style={{
                                fontSize: "10px",
                                color: s.text,
                                fontWeight: 500,
                                whiteSpace: "nowrap",
                              }}>
                                W{m.week} {m.opp}·<span style={{ fontWeight: 700 }}>{m.tier}</span>
                              </span>
                              {env && (
                                <span style={{
                                  fontSize: "8px",
                                  color: "#7d8fa5",
                                  fontWeight: 500,
                                  letterSpacing: "0.03em",
                                }}>
                                  O/U {env.total}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>


            {/* Weekly Difficulty Calendar — Phase 3 replacement for SOS */}
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{
                fontFamily: "var(--font-display)",
                fontSize: "24px",
                letterSpacing: "0.05em",
                margin: "0 0 4px",
                color: "var(--text-primary)",
              }}>
                WEEKLY ROAD AHEAD
              </h2>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "10px", lineHeight: 1.5, maxWidth: "640px" }}>
                Your full season at a glance — every starter, every week. Green weeks are <span style={{ color: "var(--pos)" }}>smashable</span>; red weeks are <span style={{ color: "var(--neg)" }}>landmines</span>. The <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>separator marks</span> where the playoffs begin.
              </div>
              <MatchupLegend />
              <div style={{
                background: "var(--bg-surface)",
                border: "1px solid #2a1a3a",
                borderRadius: "4px",
                padding: "12px 0 10px",
                overflow: "hidden",
              }}>
                {/* === ONE SYNCED SCROLL CONTAINER ===
                    The whole table scrolls horizontally as a unit. Player names live in
                    a sticky left column (always visible); the week header + every chip
                    row share the same horizontal scroll, so W3 in the header is always
                    directly above W3 in every player row. */}
                <div style={{
                  overflowX: "auto",
                  WebkitOverflowScrolling: "touch",
                  paddingBottom: "4px",
                }}>
                  <div style={{ display: "inline-block", minWidth: "100%" }}>
                    {/* Header row */}
                    <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                      <div style={{
                        position: "sticky",
                        left: 0,
                        width: "120px",
                        flexShrink: 0,
                        background: "var(--bg-surface)",
                        zIndex: 2,
                        paddingLeft: "12px",
                        paddingRight: "10px",
                        fontSize: "9px",
                        color: "var(--text-dim)",
                        letterSpacing: "0.05em",
                      }}>
                        STARTER
                      </div>
                      <div style={{ display: "flex", gap: "3px", paddingRight: "12px" }}>
                        {Array.from({ length: 18 }, (_, i) => {
                          const wkNum = i + 1;
                          const isPlayoff = wkNum >= 15 && wkNum <= 17;
                          return (
                            <React.Fragment key={i}>
                              {wkNum === 15 && <div style={{ width: "1px", background: "#3a2a4a", margin: "0 4px", alignSelf: "stretch" }} />}
                              <div style={{
                                width: "34px",
                                textAlign: "center",
                                fontWeight: isPlayoff ? 700 : 500,
                                color: isPlayoff ? "var(--accent-purple-light)" : "var(--text-dim)",
                                fontSize: "9px",
                                letterSpacing: "0.05em",
                                flexShrink: 0,
                              }}>
                                W{wkNum}
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                    {/* Per-row calendar entries — starters always shown,
                        bench appended when benchExpanded is true with a visual divider */}
                    {(() => {
                      const rows = [];
                      analyzed.starterSchedules.forEach(s => rows.push({ ...s, _kind: "starter" }));
                      if (benchExpanded && analyzed.benchSchedules) {
                        rows.push({ _kind: "divider" });
                        analyzed.benchSchedules.forEach(s => rows.push({ ...s, _kind: "bench" }));
                      }
                      return rows.map((s, idx) => {
                      if (s._kind === "divider") {
                        return (
                          <div key={`div-${idx}`} style={{
                            display: "flex",
                            alignItems: "center",
                            padding: "8px 0 4px",
                            borderTop: "1px solid var(--bg-raised)",
                            marginTop: "4px",
                          }}>
                            <div style={{
                              position: "sticky",
                              left: 0,
                              width: "120px",
                              flexShrink: 0,
                              background: "var(--bg-surface)",
                              zIndex: 2,
                              paddingLeft: "12px",
                              paddingRight: "10px",
                              fontSize: "9px",
                              color: "var(--text-secondary)",
                              fontWeight: 700,
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                            }}>
                              Bench
                            </div>
                          </div>
                        );
                      }
                      const pc = posColor(s.pos);
                      const isBench = s._kind === "bench";
                      const isLast = idx === rows.length - 1;
                      return (
                        <div key={idx} style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "5px 0",
                          borderBottom: isLast ? "none" : "1px solid var(--bg-raised)",
                          opacity: isBench ? 0.78 : 1,
                        }}>
                          <div style={{
                            position: "sticky",
                            left: 0,
                            width: "120px",
                            flexShrink: 0,
                            background: "var(--bg-surface)",
                            zIndex: 2,
                            paddingLeft: "12px",
                            paddingRight: "10px",
                            minWidth: 0,
                          }}>
                            <div style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {s.name}
                            </div>
                            <div style={{ fontSize: "9px", color: pc.text, fontWeight: 600, letterSpacing: "0.05em" }}>
                              {s.pos} · {s.team}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "3px", paddingRight: "12px" }}>
                            {s.weeklyMatchups.map((m, wIdx) => {
                              const isPlayoff = m.week >= 15 && m.week <= 17;
                              if (m.isBye) {
                                return (
                                  <React.Fragment key={wIdx}>
                                    {m.week === 15 && <div style={{ width: "1px", background: "#3a2a4a", margin: "0 4px", alignSelf: "stretch", flexShrink: 0 }} />}
                                    <div style={{
                                      width: "34px",
                                      flexShrink: 0,
                                      background: "var(--bg-raised)",
                                      border: `1px solid ${isPlayoff ? "#3a2a4a" : "var(--border-strong)"}`,
                                      borderRadius: "3px",
                                      padding: "3px 2px",
                                      textAlign: "center",
                                      color: "var(--text-dim)",
                                      fontSize: "9px",
                                      fontWeight: 600,
                                      letterSpacing: "0.03em",
                                    }}>
                                      BYE
                                    </div>
                                  </React.Fragment>
                                );
                              }
                              const ms = tierStyle(m.color);
                              const isAway = m.opp.startsWith("@");
                              const teamCode = m.opp.replace("@", "");
                              return (
                                <React.Fragment key={wIdx}>
                                  {m.week === 15 && <div style={{ width: "1px", background: "#3a2a4a", margin: "0 4px", alignSelf: "stretch", flexShrink: 0 }} />}
                                  <div style={{
                                    width: "34px",
                                    flexShrink: 0,
                                    background: ms.bg,
                                    border: `${isPlayoff ? "1.5px" : "1px"} solid ${ms.border}${isPlayoff ? "" : "88"}`,
                                    borderRadius: "3px",
                                    padding: "3px 2px",
                                    textAlign: "center",
                                    color: ms.text,
                                    fontSize: "9px",
                                    fontWeight: 700,
                                    letterSpacing: "0.02em",
                                    lineHeight: 1.2,
                                  }}>
                                    <span style={{ color: "var(--text-muted)", fontSize: "8px" }}>{isAway ? "@" : ""}</span>{teamCode}
                                  </div>
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                    })()}
                    {/* Bench toggle button — sits at the bottom of the calendar */}
                    {analyzed.benchSchedules && analyzed.benchSchedules.length > 0 && (
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        paddingTop: "10px",
                        marginTop: "4px",
                        borderTop: "1px solid var(--bg-raised)",
                      }}>
                        <div style={{
                          position: "sticky",
                          left: 0,
                          background: "var(--bg-surface)",
                          zIndex: 2,
                          paddingLeft: "12px",
                          paddingRight: "10px",
                        }}>
                          <button
                            onClick={() => setBenchExpanded(!benchExpanded)}
                            style={{
                              background: benchExpanded ? "#1a1030" : "transparent",
                              border: `1px solid ${benchExpanded ? "var(--accent-purple-mid)" : "#3a2a4a"}`,
                              color: benchExpanded ? "var(--accent-purple-light)" : "var(--text-secondary)",
                              fontFamily: "inherit",
                              fontSize: "10px",
                              fontWeight: 600,
                              letterSpacing: "0.08em",
                              padding: "5px 11px",
                              borderRadius: "3px",
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {benchExpanded ? "− Hide bench" : `+ Show bench (${analyzed.benchSchedules.length})`}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: "9px", color: "var(--text-dim)", marginTop: "8px", paddingTop: "6px", borderTop: "1px solid var(--bg-raised)", letterSpacing: "0.05em", padding: "6px 12px 0" }}>
                  ← swipe to scroll all 18 weeks · <span style={{ color: "var(--accent-purple-light)", fontWeight: 600 }}>purple W15–W17</span> = playoff matchups · player names stay locked
                </div>
                {/* Export the WHOLE grid (starters + bench, all 18 weeks) as one
                    PNG, regardless of what the bench toggle is currently showing —
                    a partial export of a schedule is not useful to anyone. */}
                <div style={{ padding: "8px 12px 2px" }}>
                  <button
                    onClick={async () => {
                      setScheduleExport("working");
                      try {
                        const canvas = renderScheduleCanvas({
                          starters: analyzed.starterSchedules || [],
                          bench: analyzed.benchSchedules || [],
                          grade: analyzed.grade,
                          subtitle: `${(analyzed.starterSchedules || []).length} starters · ${(analyzed.benchSchedules || []).length} bench · generated ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
                          adpUpdated: ADP_UPDATED,
                        });
                        const res = await saveScheduleImage(canvas, `rosterxray-schedule-${new Date().toISOString().slice(0, 10)}.png`);
                        setScheduleExport(res === "cancelled" ? "idle" : "saved");
                        track("export_schedule", { mode: res });
                      } catch (err) {
                        setScheduleExport("error");
                      }
                      setTimeout(() => setScheduleExport("idle"), 2600);
                    }}
                    disabled={scheduleExport === "working"}
                    style={{
                      background: scheduleExport === "saved" ? "#0d3320" : "transparent",
                      border: `1px solid ${scheduleExport === "saved" ? "#22c55e" : scheduleExport === "error" ? "#ef4444" : "#3a2a4a"}`,
                      color: scheduleExport === "saved" ? "var(--pos)" : scheduleExport === "error" ? "var(--neg)" : "var(--accent-purple-light)",
                      fontFamily: "inherit",
                      fontSize: "10px",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      padding: "7px 13px",
                      borderRadius: "3px",
                      cursor: scheduleExport === "working" ? "wait" : "pointer",
                      width: "100%",
                    }}
                  >
                    {scheduleExport === "working" ? "RENDERING…"
                      : scheduleExport === "saved" ? "✓ SAVED"
                      : scheduleExport === "error" ? "COULD NOT SAVE — TRY AGAIN"
                      : "↓ SAVE FULL SCHEDULE AS IMAGE"}
                  </button>
                </div>
              </div>
            </div>

            {/* Lineup Confidence */}
            {/* === LINEUP CONFIDENCE — week chip strip + one panel ===
                Replaces two sections that overlapped: a date-driven "Weekly
                Spotlight" showing the current week, and a Lineup Confidence
                list that stacked ALL 17 weeks vertically. The stack was 2254px,
                28.6% of the whole page, holding ~4.5k characters — sparse, and
                it made every week look equally urgent. The strip colours each
                week by severity so the problem weeks are visible at a glance,
                and the panel shows one week at a time. */}
            {analyzed.lineupConfidencePreview && analyzed.lineupConfidencePreview.length > 0 && (() => {
              const byWeek = {};
              analyzed.lineupConfidencePreview.forEach(wk => { byWeek[wk.week] = wk; });
              const weeks = Array.from({ length: 17 }, (_, i) => i + 1);
              const nfl = getNflWeek();
              // Default to the week the user is actually living in. Out of
              // season there is no "this week", so open on W1.
              const fallback = nfl.inSeason ? nfl.week : 1;
              const active = lcWeek == null ? Math.min(fallback, 17) : lcWeek;
              const wk = byWeek[active];
              const sitCount = wk ? wk.concerns.length : 0;
              const lockCount = wk ? wk.locks.length : 0;
              const totalSits = analyzed.lineupConfidencePreview.reduce((n, w) => n + w.concerns.length, 0);
              const worst = analyzed.lineupConfidencePreview
                .filter(w => w.concerns.length > 0)
                .sort((a, b) => b.concerns.length - a.concerns.length)[0];

              return (
                <div style={{ marginBottom: "20px" }}>
                  <h2 style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "24px",
                    letterSpacing: "0.05em",
                    margin: "0 0 4px",
                    color: "var(--text-primary)",
                  }}>
                    LINEUP CONFIDENCE
                  </h2>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "0 0 10px", maxWidth: "640px", lineHeight: 1.5 }}>
                    Who to lock in and who to consider sitting, week by week. Tap a week to see it.
                    {worst && <> Your tightest week is <span style={{ color: "var(--neg)", fontWeight: 700 }}>W{worst.week}</span> with {worst.concerns.length} tough matchup{worst.concerns.length === 1 ? "" : "s"}.</>}
                  </p>

                  {/* Week strip — red = has a sit call, green = only locks, dim = nothing to decide */}
                  <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: "6px", marginBottom: "10px" }}>
                    <div style={{ display: "flex", gap: "4px", alignItems: "stretch", minWidth: "min-content" }}>
                      {weeks.map(w => {
                        const d = byWeek[w];
                        const sits = d ? d.concerns.length : 0;
                        const locks = d ? d.locks.length : 0;
                        const isActive = w === active;
                        const isPlayoff = w >= 15;
                        const isNow = nfl.inSeason && w === nfl.week;
                        const tone = sits > 0
                          ? { bg: "#2e1414", border: "#ef4444", text: "var(--neg)" }
                          : locks > 0
                            ? { bg: "#0d3320", border: "#22c55e", text: "var(--pos)" }
                            : { bg: "var(--bg-surface)", border: "#2a2a32", text: "var(--text-dim)" };
                        return (
                          <React.Fragment key={w}>
                            {w === 15 && <div style={{ width: "1px", background: "#4a2a6a", margin: "0 5px", alignSelf: "stretch", flexShrink: 0 }} />}
                            <button
                              onClick={() => setLcWeek(w)}
                              aria-label={`Week ${w}${sits > 0 ? `, ${sits} tough matchup${sits === 1 ? "" : "s"}` : ""}`}
                              aria-pressed={isActive}
                              // Centre the opening week in the strip. In Week 12 the
                              // panel would say WEEK 12 while the strip still showed
                              // W1-W8, which reads as a broken control. Sets
                              // scrollLeft directly rather than scrollIntoView, which
                              // would also yank the page vertically. Runs once.
                              ref={isActive ? (el) => {
                                if (!el || el.dataset.centred) return;
                                el.dataset.centred = "1";
                                const scroller = el.parentElement && el.parentElement.parentElement;
                                if (!scroller) return;
                                const r = el.getBoundingClientRect();
                                const s = scroller.getBoundingClientRect();
                                scroller.scrollLeft += (r.left - s.left) - (s.width - r.width) / 2;
                              } : undefined}
                              style={{
                                position: "relative",
                                flexShrink: 0,
                                minWidth: "44px",
                                minHeight: "44px",
                                justifyContent: "center",
                                padding: "7px 6px 6px",
                                background: isActive ? tone.bg : "transparent",
                                border: `1px solid ${isActive ? tone.border : "#2a2a32"}`,
                                borderRadius: "3px",
                                cursor: "pointer",
                                fontFamily: "var(--font-mono)",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "3px",
                              }}
                            >
                              <span style={{
                                fontSize: "10px",
                                fontWeight: isActive || isPlayoff ? 700 : 500,
                                letterSpacing: "0.04em",
                                color: isActive ? tone.text : isPlayoff ? "var(--accent-purple-light)" : "var(--text-dim)",
                              }}>
                                W{w}
                              </span>
                              {/* severity dot — the whole point of the strip: find the bad weeks without reading */}
                              <span style={{
                                width: sits > 0 ? "5px" : "4px",
                                height: sits > 0 ? "5px" : "4px",
                                borderRadius: "50%",
                                background: sits > 0 ? "var(--neg)" : locks > 0 ? "var(--pos)" : "#2a2a32",
                                display: "block",
                              }} />
                              {isNow && (
                                <span style={{
                                  position: "absolute",
                                  top: "-1px",
                                  right: "-1px",
                                  width: "5px",
                                  height: "5px",
                                  borderRadius: "50%",
                                  background: "var(--accent-cyan)",
                                }} />
                              )}
                            </button>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "14px", fontSize: "10px", marginBottom: "10px", flexWrap: "wrap", color: "var(--text-dim)" }}>
                    <span><span style={{ color: "var(--neg)", fontWeight: 700 }}>●</span> tough call</span>
                    <span><span style={{ color: "var(--pos)", fontWeight: 700 }}>●</span> easy week</span>
                    {nfl.inSeason && <span><span style={{ color: "var(--accent-cyan)", fontWeight: 700 }}>●</span> this week</span>}
                    <span style={{ color: "var(--accent-purple-light)" }}>W15-17 = playoffs</span>
                    <span>{totalSits} tough matchup{totalSits === 1 ? "" : "s"} all season</span>
                  </div>

                  {/* Selected week panel */}
                  <div style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--bg-elevated)",
                    borderLeft: `3px solid ${sitCount > 0 ? "var(--neg)" : lockCount > 0 ? "var(--pos-solid)" : "#2a2a32"}`,
                    borderRadius: "3px",
                    padding: "12px 14px",
                    minHeight: "72px",
                  }}>
                    <div style={{
                      fontSize: "11px",
                      fontFamily: "var(--font-display)",
                      letterSpacing: "0.1em",
                      color: active >= 15 ? "var(--accent-purple-light)" : "var(--text-dim)",
                      marginBottom: "8px",
                      display: "flex",
                      alignItems: "baseline",
                      gap: "8px",
                    }}>
                      <span>WEEK {active}{active >= 15 ? " · PLAYOFFS" : ""}</span>
                      {nfl.inSeason && active === nfl.week && <span style={{ fontSize: "9px", color: "var(--accent-cyan)", letterSpacing: "0.08em" }}>THIS WEEK</span>}
                    </div>

                    {active >= 15 && aiLineupNotes[`W${active}`] && (
                      <div style={{ fontSize: "10px", color: "#c084fcaa", lineHeight: 1.5, marginBottom: "8px", paddingBottom: "6px", borderBottom: "1px solid var(--border-strong)", fontStyle: "italic" }}>
                        {aiLineupNotes[`W${active}`]}
                      </div>
                    )}

                    {!wk && (
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        No start/sit calls this week — every starter is in a matchup you would not bench them for.
                      </div>
                    )}

                    {wk && wk.locks.length > 0 && (
                      <div style={{ marginBottom: wk.concerns.length > 0 ? "8px" : 0 }}>
                        {wk.locks.map((l, j) => {
                          const pc = posColor(l.pos);
                          return (
                            <div key={j} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px", fontSize: "12px" }}>
                              <span style={{ color: "var(--pos)", fontSize: "10px", width: "14px", flexShrink: 0 }}>▲</span>
                              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{l.name}</span>
                              <span style={{
                                fontSize: "9px",
                                background: pc.bg,
                                border: `1px solid ${pc.border}44`,
                                color: pc.text,
                                padding: "1px 4px",
                                borderRadius: "2px",
                                flexShrink: 0,
                              }}>
                                {l.pos}
                              </span>
                              <span style={{ color: "var(--pos)", fontSize: "10px" }}>
                                vs {l.matchup.opp.replace("@","")} · {l.matchup.tier}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {wk && wk.concerns.length > 0 && (
                      <div>
                        {wk.concerns.map((c, j) => {
                          const pc = posColor(c.pos);
                          return (
                            <div key={j} style={{ marginBottom: j < wk.concerns.length - 1 ? "8px" : 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: c.suggestion ? "4px" : "3px", fontSize: "12px" }}>
                                <span style={{ color: "var(--neg)", fontSize: "10px", width: "14px", flexShrink: 0 }}>▼</span>
                                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{c.name}</span>
                                <span style={{
                                  fontSize: "9px",
                                  background: pc.bg,
                                  border: `1px solid ${pc.border}44`,
                                  color: pc.text,
                                  padding: "1px 4px",
                                  borderRadius: "2px",
                                  flexShrink: 0,
                                }}>
                                  {c.slot === "FLEX" || c.slot === "SFLEX" ? c.slot : c.pos}
                                </span>
                                <span style={{ color: "var(--neg)", fontSize: "10px" }}>
                                  vs {c.matchup.opp.replace("@","")} · {c.matchup.tier}
                                </span>
                              </div>
                              {c.suggestion && (() => {
                                const spc = posColor(c.suggestion.pos);
                                return (
                                  <div style={{ paddingLeft: "20px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", marginBottom: "2px" }}>
                                      <span style={{ color: "var(--info-blue)", fontSize: "9px", flexShrink: 0 }}>💡</span>
                                      <span style={{ color: "#aaa" }}>
                                        <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{c.suggestion.name.split(" ").pop()}</span>
                                        {" "}
                                        <span style={{
                                          fontSize: "8px",
                                          background: spc.bg,
                                          border: `1px solid ${spc.border}44`,
                                          color: spc.text,
                                          padding: "1px 4px",
                                          borderRadius: "2px",
                                        }}>{c.suggestion.pos}·{c.suggestion.team}</span>
                                        {" "}
                                        <span style={{ color: "var(--info-blue)", fontSize: "10px" }}>
                                          {c.suggestion.matchup.tier} matchup this week
                                        </span>
                                      </span>
                                    </div>
                                    {c.disclaimers && c.disclaimers.map((d, di) => (
                                      <div key={di} style={{ fontSize: "9px", color: "var(--text-muted)", paddingLeft: "12px", marginBottom: "1px", lineHeight: 1.4 }}>
                                        ⚠ {d}
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Handcuffs */}
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{
                fontFamily: "var(--font-display)",
                fontSize: "24px",
                letterSpacing: "0.05em",
                margin: "0 0 4px",
                color: "var(--text-primary)",
              }}>
                HANDCUFFS · INSURANCE
              </h2>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "0 0 12px", maxWidth: "640px", lineHeight: 1.5 }}>
                A handcuff is the <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>backup RB</span> on the same team as your starter. If your RB1 gets hurt, the handcuff <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>inherits the workload</span> — rostering them means you don't lose the value twice.
              </p>
              {analyzed.handcuffStatus.map((h, i) => (
                <div key={i} style={{
                  background: "var(--bg-surface)",
                  border: `1px solid ${h.hasHandcuff ? "#22c55e40" : "#f8717140"}`,
                  borderLeft: `3px solid ${h.hasHandcuff ? "var(--pos-solid)" : "var(--neg)"}`,
                  borderRadius: "3px",
                  padding: "8px 12px",
                  marginBottom: "6px",
                  fontSize: "12px",
                }}>
                  <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{h.rb.name}</span>
                  <span style={{ color: "var(--text-dim)", marginLeft: "6px" }}>({h.rb.team})</span>
                  {h.hasHandcuff ? (
                    <span style={{ marginLeft: "10px", color: "var(--pos)" }}>
                      ✓ Handcuffed: {h.handcuff.name} <span style={{ color: "var(--text-dim)" }}>(ADP {h.handcuff.adp})</span>
                    </span>
                  ) : (
                    <span style={{ marginLeft: "10px", color: "var(--neg)" }}>
                      ⚠ No handcuff rostered
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Bench Moves */}
            {analyzed.benchMoves && analyzed.benchMoves.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h2 style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "24px",
                  letterSpacing: "0.05em",
                  margin: "0 0 4px",
                  color: "var(--text-primary)",
                }}>
                  BENCH MOVES
                </h2>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "0 0 12px", maxWidth: "640px" }}>
                  Your bench, broken down by role — <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>handcuffs</span> to lock in, <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>streamers</span> to rotate in on good matchups, and <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>bye-week fills</span> to plan around.
                </p>
                {analyzed.benchMoves.map((alert, i) => {
                  const urgencyBorder = alert.urgency === "high" ? "#22c55e" : alert.urgency === "medium" ? "#60a5fa" : "#555555";
                  const urgencyBg = alert.urgency === "high" ? "#22c55e15" : alert.urgency === "medium" ? "#60a5fa10" : "var(--bg-surface)";
                  const pc = (() => {
                    const pos = alert.player.pos;
                    if (pos === "QB") return { bg: "#fbbf2420", border: "#fbbf24", text: "var(--caution-alt)" };
                    if (pos === "RB") return { bg: "#22d3ee20", border: "#22d3ee", text: "var(--accent-cyan)" };
                    if (pos === "WR") return { bg: "#f472b620", border: "#f472b6", text: "var(--pink)" };
                    return { bg: "#a78bfa20", border: "#a78bfa", text: "var(--accent-purple)" };
                  })();
                  return (
                    <div key={i} style={{
                      background: urgencyBg,
                      border: `1px solid ${urgencyBorder}40`,
                      borderLeft: `3px solid ${urgencyBorder}`,
                      borderRadius: "3px",
                      padding: "10px 12px",
                      marginBottom: "6px",
                      fontSize: "12px",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "14px" }}>{alert.emoji}</span>
                        <span style={{
                          fontSize: "9px",
                          fontFamily: "var(--font-display)",
                          letterSpacing: "0.08em",
                          color: urgencyBorder,
                          background: `${urgencyBorder}20`,
                          padding: "2px 6px",
                          borderRadius: "2px",
                        }}>
                          {alert.label}
                        </span>
                        <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{alert.player.name}</span>
                        <span style={{
                          fontSize: "9px",
                          background: pc.bg,
                          border: `1px solid ${pc.border}44`,
                          color: pc.text,
                          padding: "1px 5px",
                          borderRadius: "2px",
                        }}>
                          {alert.player.pos}·{alert.player.team}
                        </span>
                      </div>
                      <div style={{ color: "#aaa", paddingLeft: "22px", lineHeight: "1.5" }}>
                        <span>{aiBenchMoveNotes[alert.player.name] || alert.detail}</span>
                        {!aiBenchMoveNotes[alert.player.name] && alert.matchupNote && (
                          <span style={{ color: "var(--text-muted)", marginLeft: "8px" }}>· {alert.matchupNote}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bench */}
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{
                fontFamily: "var(--font-display)",
                fontSize: "24px",
                letterSpacing: "0.05em",
                margin: "0 0 4px",
                color: "var(--text-primary)",
              }}>
                BENCH
              </h2>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "0 0 10px", maxWidth: "640px", lineHeight: 1.5 }}>
                Your non-starters — depth for <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>injuries, byes, matchups</span>. Bye week shown so you can plan ahead.
              </p>
              <div style={{
                background: "var(--bg-surface)",
                border: "1px solid #2a1a3a",
                borderRadius: "4px",
                padding: "12px 16px",
              }}>
                {analyzed.bench.map((p, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "12px", padding: "4px 0", borderBottom: i < analyzed.bench.length - 1 ? "1px solid var(--bg-raised)" : "none", fontSize: "12px", alignItems: "center" }}>
                    <span><span style={{ color: "var(--text-primary)" }}>{p.name}</span> <span style={{ color: "var(--text-dim)" }}>{p.pos}·{p.team}</span></span>
                    <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>Bye {BYES[p.team]}</span>
                    <span style={{ color: "var(--text-secondary)", fontSize: "10px" }}>ADP {p.adp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{
          marginTop: "32px",
          paddingTop: "16px",
          borderTop: "1px solid var(--bg-raised)",
          fontSize: "10px",
          color: "var(--text-faint)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}>
          {(() => {
            // Say WHICH ADP produced the reach/value numbers. When the paste
            // carried its own ADP we use that and the built-in snapshot is
            // irrelevant, so printing its date would be actively misleading.
            const v = analyzed?.valid || [];
            const fromRoster = v.filter(p => p.adpSource === "roster").length;
            // "2026 coaching projections" alone read as league-wide. Name the
            // count and the vintage — the adjustment covers under half the league.
            const nAdj = (dataMode === "projected" ? ADJ_COVERAGE.projAdjusted : ADJ_COVERAGE.actualAdjusted).length;
            const adjStr = `EPA adj: ${nAdj}/${ADJ_COVERAGE.total} teams · ${ADJ_UPDATED}`;
            if (fromRoster > 0 && fromRoster >= v.length / 2) {
              return `ADP: from your roster (${fromRoster}/${v.length} players, live at draft time) · FPA: 2025 Rotowire · ${adjStr}`;
            }
            // Name the table that actually produced these numbers. This line
            // said "Underdog half-PPR" unconditionally, so a redraft grade
            // printed a best-ball market and a best-ball date.
            const vin = adpVintageFor(analyzed);
            return `ADP: ${vin.market} ${vin.label} snapshot · paste a roster that includes ADP for live numbers · FPA: 2025 Rotowire · ${adjStr}`;
          })()}
        </div>

        {/* === HIDDEN EXPORT CARD (Option B — Reference Card) === */}
        <div
          ref={exportCardRef}
          style={{
            position: "fixed",
            top: 0,
            left: "-9999px",
            width: "420px",
            background: "var(--bg-base)",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            border: "1px solid var(--bg-raised)",
            visibility: "hidden",
            boxSizing: "border-box",
            paddingLeft: "2px",
          }}
        >
          {analyzed && (() => {
            const isBB = analyzed.mode !== "redraft";
            const gc = analyzed.grade === "A" || analyzed.grade === "A-" ? "var(--pos)"
              : analyzed.grade === "B+" || analyzed.grade === "B" ? "var(--pos-bright)"
              : analyzed.grade === "C+" || analyzed.grade === "C" ? "var(--caution)"
              : "var(--neg)";
            const accentColor = isBB ? "var(--pos-solid)" : "var(--accent-purple-light)";

            // Dynamic playoff week labels — respects W14-16 vs W15-17 league setting
            const cardPlayoffWeeks = isBB ? [15, 16, 17] : (analyzed.league?.playoffWeeks || [15, 16, 17]);
            const cardWkLabels = cardPlayoffWeeks.map(w => `W${w}`);

            // Shared inline styles
            const secLabel = { fontSize: "8px", color: "var(--text-muted)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "7px", fontFamily: "'Inter', 'DM Sans', sans-serif", fontWeight: 600 };
            const row = { display: "flex", alignItems: "center", gap: "7px", padding: "3px 0", borderBottom: "1px solid var(--bg-surface-alt)", fontSize: "11px" };
            const slotStyle = { fontSize: "9px", color: "var(--border-default)", width: "26px", flexShrink: 0, fontFamily: "var(--font-mono)" };
            const nameStyle = { color: "var(--text-soft-alt)", fontWeight: 500, flex: 1 };
            const teamStyle = { fontSize: "9px", color: "#3a3a3a" };

            const posChipStyle = (pos) => {
              const map = {
                QB: { bg: "#fbbf2418", border: "#fbbf2444", color: "var(--caution-alt)" },
                RB: { bg: "#22d3ee18", border: "#22d3ee44", color: "var(--accent-cyan)" },
                WR: { bg: "#f472b618", border: "#f472b644", color: "var(--pink)" },
                TE: { bg: "#a78bfa18", border: "#a78bfa44", color: "var(--accent-purple)" },
                FLEX: { bg: "#94a3b818", border: "#94a3b844", color: "#94a3b8" },
              };
              const c = map[pos] || map.FLEX;
              return { fontSize: "8px", fontWeight: 700, background: c.bg, border: `1px solid ${c.border}`, color: c.color, padding: "0", width: "26px", height: "16px", borderRadius: "2px", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1, textAlign: "center", boxSizing: "border-box" };
            };


            const section = (children, extraStyle = {}) => ({
              padding: "8px 18px",
              borderBottom: "1px solid var(--bg-inset)",
              ...extraStyle,
            });

            return (
              <div>
                {/* Header */}
                <div style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-raised)", padding: "10px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 900, fontSize: "13px", letterSpacing: "0.2em", color: "var(--text-faint)", textTransform: "uppercase" }}>ROSTER X-RAY</div>
                  <div style={{ fontSize: "9px", color: accentColor, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    {isBB ? (analyzed.tournament?.name || "Best Ball") : (analyzed.league?.name || "Redraft")}
                  </div>
                </div>

                {/* Grade bar */}
                <div style={{ background: "var(--bg-inset)", padding: "10px 16px", display: "flex", alignItems: "center", gap: "14px", borderBottom: "1px solid var(--bg-raised)" }}>
                  <div style={{ fontWeight: 900, fontSize: "52px", lineHeight: 1, color: gc, letterSpacing: "-0.01em", flexShrink: 0 }}>{analyzed.grade}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: "14px", marginBottom: "5px", fontSize: "12px" }}>
                      {["QB","RB","WR","TE"].map(pos => (
                        <span key={pos}><span style={{ color: "var(--text-faint)", fontSize: "10px" }}>{pos} </span><span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{analyzed.posCounts[pos] || 0}</span></span>
                      ))}
                    </div>
                    {(aiNutshell || analyzed.nutshell) && (
                      <div style={{ fontSize: "10px", color: "var(--text-secondary)", lineHeight: 1.45 }}>{
                        (() => {
                          const full = aiNutshell || analyzed.nutshell;
                          const sentences = full.match(/[^.!?]+[.!?]+/g) || [full];
                          return sentences.slice(0, 3).join(" ").trim();
                        })()
                      }</div>
                    )}
                    {/* Inline strength/weakness — plain colored text, no box */}
                    {((analyzed.strengths || []).length > 0 || (analyzed.weaknesses || []).length > 0) && (
                      <div style={{ marginTop: "5px" }}>
                        {(analyzed.strengths || []).slice(0, 1).map((s, i) => (
                          <div key={i} style={{ fontSize: "9px", color: "var(--pos)", lineHeight: 1.4 }}>✓ {s}</div>
                        ))}
                        {(analyzed.weaknesses || []).slice(0, 1).map((w, i) => (
                          <div key={i} style={{ fontSize: "9px", color: "var(--warn)", lineHeight: 1.4 }}>⚠ {w}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Mode-specific main section */}
                {isBB ? (
                  <>
                    {/* BB: Top stacks — fixed week headers + opponent chips colored by matchup */}
                    <div style={section({})}>
                      <div style={secLabel}>Top Stacks · Playoff Matchups</div>
                      {(analyzed.stackGrades || []).slice(0, 4).map((stack, si) => {
                        // Get opponent names for W15/W16/W17
                        const opps = PLAYOFFS[stack.team] || ["?","?","?"];
                        // Pivot weekDetails (week→players) to players→weeks
                        const playerMap = {};
                        (stack.weekDetails || [[],[],[]]).forEach((wkPlayers, wkIdx) => {
                          wkPlayers.forEach(p => {
                            if (!playerMap[p.name]) playerMap[p.name] = { name: p.name, pos: p.pos, weeks: [null, null, null] };
                            playerMap[p.name].weeks[wkIdx] = { color: p.color, tier: p.tier, opp: opps[wkIdx] || "?" };
                          });
                        });
                        const players = Object.values(playerMap);
                        const isLast = si >= Math.min((analyzed.stackGrades||[]).length, 4) - 1;
                        return (
                          <div key={si} style={{ marginBottom: isLast ? 0 : "10px", paddingBottom: isLast ? 0 : "10px", borderBottom: isLast ? "none" : "1px solid #141414" }}>
                            {/* Team header + fixed week column labels */}
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                              <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.05em" }}>{stack.team}</div>
                              <div style={{ fontSize: "8px", color: "var(--text-faint)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{stack.type}{stack.hasQB ? " · w/ QB" : ""}</div>
                              {/* Fixed week column headers — dynamic based on league playoff weeks */}
                              <div style={{ display: "flex", gap: "2px", marginLeft: "auto" }}>
                                {cardWkLabels.map(wk => (
                                  <div key={wk} style={{ width: "30px", textAlign: "center", fontSize: "8px", color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>{wk}</div>
                                ))}
                              </div>
                            </div>
                            {/* One row per player */}
                            {players.map((p, pi) => (
                              <div key={pi} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "3px 0 3px 10px", borderBottom: pi < players.length - 1 ? "1px solid var(--bg-surface-alt)" : "none" }}>
                                <span style={posChipStyle(p.pos)}>{p.pos}</span>
                                <div style={{ fontSize: "11px", color: "var(--text-soft-alt)", whiteSpace: "nowrap" }}>{p.name}</div>
                                <div style={{ flex: 1, borderBottom: "1px dotted #252525", margin: "0 4px", alignSelf: "center" }} />
                                <div style={{ display: "flex", gap: "2px" }}>
                                  {p.weeks.map((w, wi) => {
                                    const oppLabel = (w?.opp || "?").replace("@","");
                                    return (
                                      <div key={wi} style={{ ...wkChipStyle(w?.color || "neutral"), width: "30px", textAlign: "center", fontSize: "8px" }}>
                                        {oppLabel.slice(0, 3)}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                    {/* ROSTER STANDOUTS — share card highlights */}
                    {(analyzed.rosterStandouts || []).length > 0 && (
                      <div style={section({})}>
                        <div style={secLabel}>Roster Standouts</div>
                        {(analyzed.rosterStandouts || []).map((s, i) => {
                          const posColors = { QB: "var(--gold)", RB: "var(--accent-cyan)", WR: "var(--pos)", TE: "var(--accent-purple-light)" };
                          const pc = posColors[s.player?.pos] || "var(--text-secondary)";
                          return (
                            <div key={i} style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "8px",
                              padding: "5px 0",
                              borderBottom: i < (analyzed.rosterStandouts||[]).length - 1 ? "1px solid var(--bg-surface-alt)" : "none",
                            }}>
                              <div style={{ fontSize: "12px", flexShrink: 0, lineHeight: 1 }}>{s.icon}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "2px", flexWrap: "wrap" }}>
                                  <div style={{ fontSize: "8px", color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>{s.label}</div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "2px" }}>
                                  <div style={{ fontSize: "10px", color: "var(--text-soft-alt)", fontWeight: 700, paddingLeft: "2px" }}>{s.player?.name}</div>
                                  {s.player?.pos && (
                                    <div style={{ fontSize: "8px", fontWeight: 700, color: pc, background: pc + "18", border: "1px solid " + pc + "44", borderRadius: "3px", padding: "1px 4px", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                                      {s.player.pos}{s.player.team ? "·" + s.player.team : ""}
                                    </div>
                                  )}
                                </div>
                                <div style={{ fontSize: "9px", color: "var(--text-muted)", lineHeight: 1.4 }}>{aiStandoutDetails[s.player?.name] || s.detail}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Redraft: Playoff Ceiling Rating — centerpiece */}
                    {(() => {
                      const cws = calcChampionshipWindowScore(analyzed, ADP_YAHOO);
                      if (!cws) return null;
                      const posColors = { QB: "var(--gold)", RB: "var(--accent-cyan)", WR: "var(--pos)", TE: "var(--accent-purple-light)" };

                      // Component bar helper
                      const compBar = (label, val, max, color) => (
                        <div style={{ marginBottom: "7px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "3px" }}>
                            <div style={{ fontSize: "8px", color, opacity: 0.75, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Inter', 'DM Sans', sans-serif", fontWeight: 600 }}>{label}</div>
                            <div style={{ fontSize: "9px", color, fontWeight: 700, fontFamily: "'Inter', monospace" }}>{val.toFixed(1)}<span style={{ color: "var(--border-default)", fontWeight: 400 }}>/{max}</span></div>
                          </div>
                          <div style={{ height: "3px", background: "var(--bg-raised)", borderRadius: "2px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: "100%", transform: `scaleX(${val / max})`, transformOrigin: "left", background: color, borderRadius: "2px", transition: "transform 0.3s" }} />
                          </div>
                        </div>
                      );

                      return (
                        <>
                          {/* Thin divider between grade and CWS */}
                          <div style={{ height: "1px", background: "linear-gradient(to right, var(--border-subtle), var(--border-default), var(--border-subtle))", margin: "0" }} />

                          {/* CWS Centerpiece */}
                          <div style={{ ...section({}), background: "var(--bg-surface-alt)", padding: "12px 18px" }}>
                            <div style={{ ...secLabel, marginBottom: "2px" }}>Playoff Ceiling Rating</div>
                            <div style={{ fontSize: "9px", color: "var(--text-dim)", lineHeight: 1.4, marginBottom: "8px" }}>
                              How dangerous is this roster in W15–17 specifically — separate from your overall construction grade.
                            </div>
                            {/* Score block — number pushed up, tier top-aligned */}
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "10px 0 14px" }}>
                              {/* Number */}
                              <div style={{ fontFamily: "'Bebas Neue', 'Impact', monospace", fontSize: "52px", fontWeight: 900, lineHeight: 1, color: cws.tierColor, letterSpacing: "0.01em", flexShrink: 0 }}>
                                {cws.total.toFixed(1)}
                              </div>
                              {/* Tier label above out-of, both pinned to bottom of number */}
                              <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", alignSelf: "stretch", gap: "3px", paddingBottom: "3px" }}>
                                <div style={{ fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: "20px", fontWeight: 900, color: cws.tierColor, letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1 }}>{cws.tier}</div>
                                <div style={{ fontSize: "8px", color: "var(--text-faint)", fontFamily: "var(--font-mono)", lineHeight: 1 }}>out of 10.0</div>
                              </div>
                            </div>
                            {/* Component bars */}
                            {compBar("Schedule Quality", cws.comp1, 4, cws.comp1 >= 3.5 ? "var(--pos)" : cws.comp1 >= 2.5 ? "var(--caution)" : "var(--neg)")}
                            {compBar("Starter Caliber", cws.comp2, 4, cws.comp2 >= 3.5 ? "var(--pos)" : cws.comp2 >= 2.5 ? "var(--caution)" : "var(--neg)")}
                            {compBar("Roster Situations", cws.comp3, 2, cws.comp3 >= 1.5 ? "var(--pos)" : cws.comp3 >= 1.0 ? "var(--caution)" : "var(--neg)")}
                          </div>

                          {/* Playoff schedule chips — top 3 starters */}
                          <div style={section({})}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                              <div style={secLabel}>Playoff Threats</div>
                              <div style={{ display: "flex", gap: "2px" }}>
                                {cardWkLabels.map(wk => (
                                  <div key={wk} style={{ width: "28px", textAlign: "center", fontSize: "8px", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>{wk}</div>
                                ))}
                                <div style={{ width: "22px", textAlign: "right", fontSize: "8px", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>/10</div>
                              </div>
                            </div>
                            {[...(analyzed.playoffMatchups || [])]
                              .sort((a, b) => b.totalScore - a.totalScore)
                              .slice(0, 3)
                              .map((p, i, arr) => {
                                const score = Math.round((p.totalScore / 15) * 10);
                                const sc = score >= 7 ? "var(--pos)" : score <= 4 ? "var(--neg)" : "var(--caution)";
                                const pc = posColors[p.pos] || "var(--text-secondary)";
                                return (
                                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 0 4px 6px", borderBottom: i < arr.length - 1 ? "1px solid var(--bg-surface-alt)" : "none" }}>
                                    <span style={posChipStyle(p.pos)}>{p.pos}</span>
                                    <div style={{ flex: 1, fontSize: "10px", color: "var(--text-soft-alt)", minWidth: 0 }}>{p.name}</div>
                                    <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
                                      {(p.playoffMatches || []).map((m, j) => {
                                        const oppLabel = (m.opp || "?").replace("@","").slice(0,3);
                                        return (
                                          <div key={j} style={{ ...wkChipStyle(m.color || "neutral"), width: "28px", textAlign: "center", fontSize: "8px" }}>
                                            {oppLabel}
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <div style={{ width: "22px", textAlign: "right", fontSize: "10px", fontWeight: 700, color: sc, fontFamily: "var(--font-mono)", flexShrink: 0 }}>{score}</div>
                                  </div>
                                );
                              })}
                          </div>

                          {/* Roster Situation Highlights */}
                          {cws.situationNotes.length > 0 && (
                            <div style={{ ...section({}), borderLeft: "3px solid var(--border-default)", paddingLeft: "19px" }}>
                              <div style={secLabel}>Situation Highlights</div>
                              {cws.situationNotes.slice(0, 3).map((s, i) => {
                                const pc = posColors[(analyzed.valid || []).find(p => p.name === s.name)?.pos] || "var(--text-secondary)";
                                const isRisk = s.risks.length > 0;
                                const trendIcon = s.trend === "rising" ? "↑" : s.trend === "falling" ? "↓" : "→";
                                const trendColor = s.trend === "rising" ? "var(--pos)" : s.trend === "falling" ? "var(--neg)" : "var(--text-secondary)";
                                return (
                                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "6px", padding: "5px 0 5px 6px", borderBottom: i < Math.min(cws.situationNotes.length, 3) - 1 ? "1px solid var(--bg-surface-alt)" : "none" }}>
                                    <div style={{ fontSize: "10px", color: trendColor, flexShrink: 0, fontWeight: 700, paddingTop: "2px" }}>{trendIcon}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
                                        <div style={{ fontSize: "10px", color: "var(--text-soft-alt)", fontWeight: 700 }}>{s.name}</div>
                                        <div style={{ fontSize: "7px", color: isRisk ? "var(--warn)" : "var(--pos)", background: isRisk ? "#fb923c15" : "#4ade8015", border: `1px solid ${isRisk ? "#fb923c40" : "#4ade8040"}`, borderRadius: "2px", padding: "1px 4px", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", flexShrink: 0 }}>
                                          {isRisk ? "RISK" : "UPSIDE"}
                                        </div>
                                      </div>
                                      <div style={{ fontSize: "9px", color: "var(--text-muted)", lineHeight: 1.45 }}>{s.note}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* AI Breakdown — replaces static Scout Report */}
                          <div style={{ ...section({}), background: "var(--bg-base)", borderLeft: `3px solid ${analyzed.grade === "A" || analyzed.grade === "A-" ? "var(--pos)" : analyzed.grade === "B+" || analyzed.grade === "B" ? "var(--pos-bright)" : "var(--caution)"}`, paddingLeft: "15px" }}>
                            <div style={{ ...secLabel, display: "flex", alignItems: "center", gap: "6px" }}>
                              X-Ray Breakdown
                              {aiNutshell && <span style={{ fontSize: "7px", color: "#4ade80aa", letterSpacing: "0.08em" }}>✦ AI</span>}
                            </div>
                            {(() => {
                              const raw = aiNutshell || (cws.feedback || []).join(" ");
                              if (!raw) return null;
                              // Limit to 3 sentences for card layout
                              const sentences = raw.match(/[^.!?]+[.!?]+/g) || [raw];
                              const text = sentences.slice(0, 3).join(" ").trim();

                              // Bold any player names found in the text
                              const allNames = (analyzed.valid || [])
                                .map(p => p.name)
                                .filter(n => n.length > 2)
                                .sort((a, b) => b.length - a.length);

                              let segments = [{ text, bold: false }];
                              for (const name of allNames) {
                                const next = [];
                                for (const seg of segments) {
                                  if (seg.bold) { next.push(seg); continue; }
                                  const lastName = name.split(" ").slice(-1)[0];
                                  const searchTerm = seg.text.includes(name) ? name : (lastName.length > 2 && seg.text.includes(lastName) ? lastName : null);
                                  if (!searchTerm) { next.push(seg); continue; }
                                  const idx = seg.text.indexOf(searchTerm);
                                  if (idx !== -1) {
                                    if (idx > 0) next.push({ text: seg.text.slice(0, idx), bold: false });
                                    next.push({ text: searchTerm, bold: true });
                                    const after = seg.text.slice(idx + searchTerm.length);
                                    if (after) next.push({ text: after, bold: false });
                                  } else {
                                    next.push(seg);
                                  }
                                }
                                segments = next;
                              }

                              return (
                                <div style={{ fontSize: "9px", color: "#777", lineHeight: 1.6 }}>
                                  {segments.map((seg, si) =>
                                    seg.bold
                                      ? <span key={si} style={{ color: "var(--text-soft-alt)", fontWeight: 700 }}>{seg.text}</span>
                                      : seg.text
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </>
                      );
                    })()}
                  </>
                )}

                {/* Footer */}
                <div style={{ padding: "8px 22px", display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontSize: "8px", color: "var(--text-faint)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>ROSTER X-RAY · 2026</div>
                  <div style={{ fontSize: "8px", color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>{adpVintageFor(analyzed).market} · ADP {adpVintageFor(analyzed).label}</div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ===== ADMIN PANEL — hidden, accessible via ?admin=true ===== */}
      {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("admin") === "true" && (() => {

        const handleAdminAuth = () => {
          // Auth is verified server-side on save — client just tracks session state
          if (adminPassword.trim().length > 0) {
            setAdminAuthed(true);
            setAdminAuthError(false);
            // Load current KV news into admin view
            fetch("/api/news-get")
              .then(r => r.json())
              .then(d => { setAdminNews(d.news || {}); setAdminNewsLoaded(true); })
              .catch(() => setAdminNews({}));
          } else {
            setAdminAuthError(true);
          }
        };

        const handleVerify = async () => {
          if (!adminPlayerName.trim() || !adminNewsText.trim()) return;
          setAdminVerifying(true);
          setAdminVerifyResult(null);
          setAdminError(null);
          try {
            const r = await fetch("/api/news-set", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password: adminPassword, action: "verify", playerName: adminPlayerName.trim(), newsText: adminNewsText.trim() }),
            });
            const d = await r.json();
            if (r.ok) setAdminVerifyResult(d);
            else setAdminError(d.error || "Verification failed");
          } catch { setAdminError("Network error"); }
          finally { setAdminVerifying(false); }
        };

        const handleSave = async () => {
          if (!adminPlayerName.trim() || !adminNewsText.trim()) return;
          setAdminSaving(true);
          setAdminSaveSuccess(false);
          setAdminError(null);
          try {
            const r = await fetch("/api/news-set", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password: adminPassword, action: "save", playerName: adminPlayerName.trim(), newsText: adminNewsText.trim() }),
            });
            const d = await r.json();
            if (r.ok) {
              setAdminNews(d.news || {});
              setKvNews(d.news || {});
              setAdminPlayerName("");
              setAdminNewsText("");
              setAdminVerifyResult(null);
              setAdminSaveSuccess(true);
              setTimeout(() => setAdminSaveSuccess(false), 3000);
            } else {
              setAdminError(d.error || "Save failed");
            }
          } catch { setAdminError("Network error"); }
          finally { setAdminSaving(false); }
        };

        const handleDelete = async (key) => {
          setAdminError(null);
          try {
            const r = await fetch("/api/news-set", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password: adminPassword, action: "delete", playerName: key }),
            });
            const d = await r.json();
            if (r.ok) { setAdminNews(d.news || {}); setKvNews(d.news || {}); }
            else setAdminError(d.error || "Delete failed");
          } catch { setAdminError("Network error"); }
        };

        const handleExport = () => {
          const kvOnly = adminNews;
          const blob = new Blob([JSON.stringify(kvOnly, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `rosterxray-news-backup-${new Date().toISOString().slice(0,10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
        };

        const handleImport = async () => {
          setAdminImportError(null);
          setAdminImportSuccess(false);
          let parsed;
          try {
            parsed = JSON.parse(adminImportText);
          } catch {
            setAdminImportError("Invalid JSON — check your backup file format.");
            return;
          }
          setAdminImporting(true);
          try {
            const r = await fetch("/api/news-set", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password: adminPassword, action: "import", importData: parsed }),
            });
            const d = await r.json();
            if (r.ok) {
              setAdminNews(d.news || {});
              setKvNews(d.news || {});
              setAdminImportText("");
              setAdminImportSuccess(true);
              setTimeout(() => setAdminImportSuccess(false), 3000);
            } else {
              setAdminImportError(d.error || "Import failed");
            }
          } catch { setAdminImportError("Network error"); }
          finally { setAdminImporting(false); }
        };

        const panel = { position: "fixed", inset: 0, background: "var(--bg-base)", zIndex: 9999, overflowY: "auto", padding: "32px 24px", fontFamily: "var(--font-mono)", color: "var(--text-soft-alt)" };
        const label = { fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "6px", display: "block" };
        const input_ = { width: "100%", background: "var(--bg-inset)", border: "1px solid var(--border-subtle)", borderRadius: "4px", padding: "10px 12px", color: "var(--text-soft-alt)", fontSize: "13px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
        const btn = (color) => ({ background: color || "var(--pos-solid)", border: "none", borderRadius: "4px", padding: "10px 18px", color: "#000", fontSize: "12px", fontWeight: 700, fontFamily: "inherit", cursor: "pointer", letterSpacing: "0.08em" });

        return (
          <div style={panel}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", borderBottom: "1px solid var(--bg-raised)", paddingBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "0.15em", color: "var(--text-primary)" }}>ROSTER X-RAY</div>
                <div style={{ fontSize: "10px", color: "var(--text-faint)", letterSpacing: "0.1em", marginTop: "2px" }}>ADMIN · NEWS MANAGER</div>
              </div>
              <a href={window.location.pathname} style={{ fontSize: "11px", color: "var(--text-faint)", textDecoration: "none" }}>← Exit Admin</a>
            </div>

            {!adminAuthed ? (
              /* Login */
              <div style={{ maxWidth: "360px" }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "20px" }}>Enter your admin password to continue.</div>
                <label style={label}>Password</label>
                <input
                  style={{ ...input_, marginBottom: "12px", ...(adminAuthError ? { borderColor: "var(--neg)" } : {}) }}
                  type="password"
                  value={adminPassword}
                  onChange={e => { setAdminPassword(e.target.value); setAdminAuthError(false); }}
                  onKeyDown={e => e.key === "Enter" && handleAdminAuth()}
                  placeholder="Enter password"
                />
                {adminAuthError && <div style={{ fontSize: "11px", color: "var(--neg)", marginBottom: "10px" }}>Incorrect password</div>}
                <button style={btn()} onClick={handleAdminAuth}>Unlock</button>
              </div>
            ) : (
              <div style={{ maxWidth: "600px" }}>

                {/* Add / Edit entry */}
                <div style={{ background: "var(--bg-inset)", border: "1px solid var(--bg-raised)", borderRadius: "6px", padding: "20px", marginBottom: "24px" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px", fontWeight: 700 }}>Add / Update Player News</div>

                  <label style={label}>Player Name</label>
                  <input style={{ ...input_, marginBottom: "12px" }} type="text" value={adminPlayerName} onChange={e => setAdminPlayerName(e.target.value)} placeholder="e.g. Christian McCaffrey" />

                  <label style={label}>News (one sentence)</label>
                  <textarea
                    style={{ ...input_, marginBottom: "12px", minHeight: "72px", resize: "vertical" }}
                    value={adminNewsText}
                    onChange={e => setAdminNewsText(e.target.value)}
                    placeholder="e.g. McCaffrey injured in practice, out 7 weeks — opens workload for Kaelon Black and Jordan James."
                  />

                  {/* Verify result */}
                  {adminVerifyResult && (
                    <div style={{ background: adminVerifyResult.plausible ? "#0d2a18" : "#2a0a0a", border: `1px solid ${adminVerifyResult.plausible ? "#22c55e33" : "#f8717133"}`, borderRadius: "4px", padding: "12px", marginBottom: "12px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: adminVerifyResult.plausible ? "var(--pos)" : "var(--neg)", marginBottom: "6px" }}>
                        {adminVerifyResult.plausible ? "✓ Looks plausible" : "⚠ Potential issue"}
                      </div>
                      {adminVerifyResult.concern && <div style={{ fontSize: "11px", color: "var(--warn)", marginBottom: "8px" }}>{adminVerifyResult.concern}</div>}
                      {(adminVerifyResult.affectedPlayers || []).length > 0 && (
                        <div>
                          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "4px", letterSpacing: "0.08em" }}>ALSO AFFECTED:</div>
                          {adminVerifyResult.affectedPlayers.map((p, i) => (
                            <div key={i} style={{ fontSize: "11px", color: "var(--pos-bright)", marginBottom: "2px" }}>
                              {p} — <span style={{ color: "var(--text-secondary)" }}>{(adminVerifyResult.affectedReasons || [])[i] || ""}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {adminError && <div style={{ fontSize: "11px", color: "var(--neg)", marginBottom: "10px" }}>{adminError}</div>}
                  {adminSaveSuccess && <div style={{ fontSize: "11px", color: "var(--pos)", marginBottom: "10px" }}>✓ Saved — live immediately</div>}

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button style={btn("var(--caution)")} onClick={handleVerify} disabled={adminVerifying}>
                      {adminVerifying ? "Verifying…" : "Verify First"}
                    </button>
                    <button style={btn()} onClick={handleSave} disabled={adminSaving}>
                      {adminSaving ? "Saving…" : "Save to KV"}
                    </button>
                  </div>
                </div>

                {/* Current entries */}
                <div style={{ background: "var(--bg-inset)", border: "1px solid var(--bg-raised)", borderRadius: "6px", padding: "20px" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px", fontWeight: 700 }}>
                    Current Entries ({Object.keys({ ...RECENT_NEWS, ...adminNews }).length})
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-faint)", marginBottom: "12px" }}>KV entries override hardcoded. Hardcoded entries shown in grey.</div>

                  {Object.entries({ ...RECENT_NEWS, ...adminNews }).map(([key, val]) => {
                    const isKv = adminNews.hasOwnProperty(key);
                    return (
                      <div key={key} style={{ borderBottom: "1px solid #151515", padding: "10px 0", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: isKv ? "var(--pos-bright)" : "var(--text-faint)", marginBottom: "3px" }}>
                            {key} {isKv ? <span style={{ fontSize: "9px", color: "var(--pos-solid)" }}>KV</span> : <span style={{ fontSize: "9px", color: "var(--border-default)" }}>hardcoded</span>}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.5 }}>{val}</div>
                        </div>
                        {isKv && (
                          <button
                            onClick={() => handleDelete(key)}
                            style={{ background: "none", border: "1px solid #2a1a1a", borderRadius: "3px", color: "var(--neg)", fontSize: "10px", padding: "3px 8px", cursor: "pointer", flexShrink: 0, fontFamily: "inherit" }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Export / Import backup */}
                <div style={{ background: "var(--bg-inset)", border: "1px solid var(--bg-raised)", borderRadius: "6px", padding: "20px", marginTop: "16px" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px", fontWeight: 700 }}>Backup & Restore</div>
                  <div style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "16px", lineHeight: 1.6 }}>
                    Export saves all KV entries as a JSON file. Import restores from a backup — paste the JSON contents below. Always export before uploading a new news-set.js.
                  </div>
                  <button
                    style={{ ...btn("#3b82f6"), marginBottom: "20px" }}
                    onClick={handleExport}
                    disabled={Object.keys(adminNews).length === 0}
                  >
                    ↓ Export Backup ({Object.keys(adminNews).length} KV entries)
                  </button>
                  <label style={label}>Restore from Backup (paste JSON)</label>
                  <textarea
                    style={{ ...input_, minHeight: "80px", resize: "vertical", marginBottom: "10px", fontSize: "11px" }}
                    value={adminImportText}
                    onChange={e => { setAdminImportText(e.target.value); setAdminImportError(null); }}
                    placeholder='{"player name": "news sentence", ...}'
                  />
                  {adminImportError && <div style={{ fontSize: "11px", color: "var(--neg)", marginBottom: "8px" }}>{adminImportError}</div>}
                  {adminImportSuccess && <div style={{ fontSize: "11px", color: "var(--pos)", marginBottom: "8px" }}>✓ Restored — all entries live</div>}
                  <button
                    style={btn("var(--gold)")}
                    onClick={handleImport}
                    disabled={adminImporting || !adminImportText.trim()}
                  >
                    {adminImporting ? "Restoring…" : "↑ Restore from Backup"}
                  </button>
                </div>

              </div>
            )}
          </div>
        );
      })()}

      </div>{/* end app-content */}

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Scroll to top"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "20px",
            zIndex: 1000,
            background: "var(--bg-raised)",
            border: "1px solid var(--border-default)",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            color: "var(--accent-purple)",
            fontSize: "18px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 12px #0007",
          }}
        >
          ↑
        </button>
      )}
    </div>
  );
}
