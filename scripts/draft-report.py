#!/usr/bin/env python3
"""
draft-report.py — build the per-round worksheet a draft report is written from.

WHAT THIS DOES, AND WHAT IT DELIBERATELY DOES NOT
  It does the mechanical half: joins the ADP table to player_metrics_2025 and
  SITUATIONS, converts ADP into a round number for a league of any size,
  computes the full-PPR premium each player carries over the half-PPR market
  the ADP source is priced in, and rates every player's W15-17 playoff slate
  against what those three defenses allowed to his position.

  It does NOT write the prose. The one-sentence reason per player is a
  judgement about which of several true facts matters, and that is a writing
  job, not a computation. This emits everything needed to write it, grouped so
  the writing is mechanical from there.

  That split is deliberate. Handing over a worksheet of inputs beats handing
  over a verdict, because the verdict hides which input produced it.

WHY THE FULL-PPR COLUMN EXISTS
  ADP_YAHOO is sourced from Fantasy Football Calculator, which is half-PPR.
  A full-PPR league therefore has a systematic mispricing: reception-heavy
  players are cheaper than they should be. ppr_delta_pg is that gap in points
  per game. It is the single largest edge available in a full-PPR draft and it
  is invisible if you read the ADP table straight.

WHY THE PLAYOFF COLUMN EXISTS, AND ITS LIMIT
  CLAUDE.md's metric hierarchy ranks matchup data 5th of 5, least stable,
  "format decisions only", and says redraft ignores W15-17. That rule is right
  for a normal league and wrong for a deep one: in a 16-team league with a
  short bench the waiver wire is empty, so a bad December cannot be repaired
  in-season and is closer to locked at draft time. The column is a TIEBREAKER
  between close options. It never makes a good player bad.

USAGE
  node scripts/extract-app-blocks.mjs > /tmp/blocks.json
  python3 scripts/draft-report.py --blocks /tmp/blocks.json --teams 16 \
      --table yahoo --scoring full --out worksheet.md

  --teams     league size, decides the round math (default 12)
  --table     yahoo | data | superflex   (default yahoo, the redraft table)
  --scoring   full | half                (default full)
  --roster    total roster spots per team, decides the draftable cutoff (default 15)
  --playoff-weeks  comma list, default 15,16,17
"""
import json, math, argparse, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TABLES = {'yahoo': 'ADP_YAHOO', 'data': 'ADP_DATA', 'superflex': 'ADP_SUPERFLEX'}


def load_schedule(path):
    """Parse the W15-17 table out of grading/data/schedule.md -> {TEAM: [w15, w16, w17]}"""
    sched = {}
    row = re.compile(r'\|\s*([A-Z]{2,3})\s*\|\s*\d+\s*\|\s*(?:vs |@)?([A-Z]{2,3})\s*\|'
                     r'\s*(?:vs |@)?([A-Z]{2,3})\s*\|\s*(?:vs |@)?([A-Z]{2,3})\s*\|')
    for line in open(path, encoding='utf-8'):
        m = row.match(line)
        if m:
            sched[m.group(1)] = [m.group(2), m.group(3), m.group(4)]
    return sched


def slate_rater(fpa):
    """Return (rate_one, quartiles). FPA = points a defense ALLOWS, so higher = softer."""
    cuts = {}
    for pos, by_team in fpa.items():
        v = sorted(by_team.values())
        n = len(v)
        cuts[pos] = (v[n // 4], v[n // 2], v[3 * n // 4])

    def rate(pos, opp):
        allowed = fpa.get(pos, {}).get(opp)
        if allowed is None:
            return None, None
        q1, q2, q3 = cuts[pos]
        if allowed >= q3: return allowed, 'soft'
        if allowed >= q2: return allowed, 'good'
        if allowed >= q1: return allowed, 'even'
        return allowed, 'hard'
    return rate


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--blocks', required=True, help='JSON from extract-app-blocks.mjs')
    ap.add_argument('--teams', type=int, default=12)
    ap.add_argument('--roster', type=int, default=15)
    ap.add_argument('--table', choices=TABLES, default='yahoo')
    ap.add_argument('--scoring', choices=['full', 'half'], default='full')
    ap.add_argument('--playoff-weeks', default='15,16,17')
    ap.add_argument('--out', default='-')
    a = ap.parse_args()

    B = json.load(open(a.blocks, encoding='utf-8'))
    adp = B[TABLES[a.table]]
    sit = B.get('SITUATIONS', {})
    news = B.get('RECENT_NEWS', {})
    metrics = json.load(open(f'{ROOT}/grading/data/player_metrics_2025.json', encoding='utf-8'))
    sos = json.load(open(f'{ROOT}/grading/data/sos_2026.json', encoding='utf-8'))
    sched = load_schedule(f'{ROOT}/grading/data/schedule.md')
    rate = slate_rater(sos['_fpa_computed'])

    draftable = a.teams * a.roster
    ppr_mult = 0.5 if a.scoring == 'full' else 0.0   # gap vs the half-PPR source

    rows = []
    for name, d in adp.items():
        if d.get('adp') is None:
            continue
        m = metrics.get(name, {})
        gp, rec = m.get('gp') or 0, m.get('rec') or 0
        s = sit.get(name) or {}
        team, pos = d.get('team'), d.get('pos')
        po = None
        if team in sched and pos:
            tiers = [rate(pos, o) for o in sched[team]]
            if all(t[1] for t in tiers):
                score = sum({'soft': 3, 'good': 2, 'even': 1, 'hard': 0}[t[1]] for t in tiers)
                po = {'score': score, 'opps': sched[team], 'tiers': [t[1] for t in tiers]}
        rows.append(dict(
            name=name, adp=d['adp'], pos=pos, team=team,
            rnd=math.ceil(d['adp'] / a.teams),
            gp=gp, rec=rec, tgt_sh=m.get('tgt_sh'), wopr=m.get('wopr'),
            snap_sh=m.get('snap_sh'), hvt=m.get('hvt_pg'),
            usable=m.get('usable_rate'), dud=m.get('dud_rate'),
            rz=m.get('rz_tgt'), gz=m.get('gz_car'),
            ppr_delta_pg=round(ppr_mult * rec / gp, 2) if gp else None,
            verdict=s.get('verdict'), trend=s.get('trend'),
            note=s.get('trendNote'), news=news.get(name),
            playoff=po,
        ))
    rows.sort(key=lambda r: r['adp'])
    inside = [r for r in rows if r['adp'] <= draftable]

    def f(v, n=2):
        return '-' if v is None else (f'{v:.{n}f}' if isinstance(v, float) else str(v))

    out = []
    out.append(f'# Draft worksheet — {a.teams} teams, {a.scoring} PPR, `{TABLES[a.table]}`\n')
    out.append(f'{len(inside)} players inside the {draftable}-pick draftable universe '
               f'({a.teams} teams x {a.roster} roster spots).\n')
    out.append('`+PPR` is points per game this player gains over the half-PPR market the ADP is '
               'priced in. `Slate` is the W' + a.playoff_weeks.replace(',', '/W') +
               ' matchup rating out of 9, a TIEBREAKER only.\n')
    for rnd in range(1, a.roster + 1):
        rs = [r for r in inside if r['rnd'] == rnd]
        if not rs:
            continue
        lo, hi = (rnd - 1) * a.teams + 1, rnd * a.teams
        out.append(f'\n## Round {rnd} — picks {lo}-{hi}\n')
        for r in rs:
            po = r['playoff']
            slate = (f"{po['score']}/9 " + ' '.join(f'{o}:{t}' for o, t in zip(po['opps'], po['tiers']))) if po else '-'
            out.append(f"### {r['name']}  ·  {r['pos']} {r['team']}  ·  ADP {r['adp']}")
            out.append(f"- 2025: {r['gp']}g, {r['rec']} rec, tgt_sh {f(r['tgt_sh'])}, wopr {f(r['wopr'])}, "
                       f"snap_sh {f(r['snap_sh'])}, usable {f(r['usable'])}, dud {f(r['dud'])}")
            out.append(f"- **+PPR {f(r['ppr_delta_pg'])} pts/gm**  ·  slate {slate}"
                       f"  ·  verdict **{r['verdict'] or 'none'}** / {r['trend'] or '-'}")
            if r['news']:
                out.append(f"- NEWS: {r['news']}")
            if r['note']:
                out.append(f"- NOTE: {r['note']}")
            out.append('')
    text = '\n'.join(out)
    if a.out == '-':
        sys.stdout.write(text)
    else:
        open(a.out, 'w', encoding='utf-8').write(text)
        print(f'wrote {a.out}  ({len(inside)} players, {len(text):,} bytes)', file=sys.stderr)


if __name__ == '__main__':
    main()
