#!/usr/bin/env python3
"""yahoo-pull.py — pull YOUR Yahoo fantasy team from the Yahoo Fantasy Sports API.

WHAT THIS IS FOR
    The app's in-season features are all one step short of useful because it
    cannot see your actual league:

      * the waiver-target pool leads with "the app cannot see your league's
        waiver wire" and ranks against a plausibility heuristic
      * redraft has no opponent awareness -- it never knows who you face
      * your own roster arrives by SCREENSHOT, which is where the one-character
        misreads come from (Greg Dulcich -> "Dulchich")
      * league settings are three hardcoded presets

    `status=FA` from the API replaces the guess with the real list, and
    `scoreboard` answers who you play. One committed script, no secrets in it.

⚠️⚠️ THIS REPO IS PUBLIC. CREDENTIALS NEVER LIVE IN IT.
    A committed OAuth secret cannot be undone -- git history keeps it and
    GitHub's API and forks cache independently. So credentials are read from a
    path OUTSIDE any git repository (default ~/.config/rosterxray/yahoo.env),
    and this script REFUSES to read a credentials file that sits inside the
    repo, rather than trusting .gitignore to save you. Pulled output defaults
    outside the repo too: a roster is personal-track content, and CLAUDE.md
    rule 4 says that belongs elsewhere.

ZERO NEW DEPENDENCIES. Standard library only (urllib). yfpy and yahoofantasy
    are both good wrappers, but a public repo is a bad place to take on a
    dependency for ~200 lines of HTTP, and the fewer moving parts between you
    and a credential the better.

SETUP (once)
    ⚠️ FANTASY SPORTS ACCESS IS A SEPARATE MANUAL APPROVAL, not a checkbox.
       The app form no longer lists Fantasy Sports under API Permissions. Apply
       at https://sports.yahoo.com/developer/access/ describing the product and
       expected users (personal/single-league use qualifies; read-only is all
       that is offered). A human reviews it, with no published turnaround, and
       vague submissions are closed without reply. NOTHING BELOW WORKS UNTIL
       THAT IS APPROVED.

    1. https://developer.yahoo.com/apps/create/
       - OAuth Client Type: Confidential Client  (it holds a Client Secret)
       - Redirect URI(s): https://localhost:8000/   <- NOT "oob", the form rejects it
       - API Permissions: leave blank; tick OpenID Connect only if the form
         insists on a selection. Neither grants Fantasy access.
    2. mkdir -p ~/.config/rosterxray && chmod 700 ~/.config/rosterxray
    3. Write ~/.config/rosterxray/yahoo.env:
           YAHOO_CLIENT_ID=...
           YAHOO_CLIENT_SECRET=...
           # optional, only if you registered something else:
           # YAHOO_REDIRECT_URI=https://localhost:8000/
    4. chmod 600 ~/.config/rosterxray/yahoo.env
    5. python3 scripts/yahoo-pull.py --auth
       Opens a URL, you approve, paste the code back. The refresh token is
       written beside the credentials and reused from then on.

USE
    python3 scripts/yahoo-pull.py --teams            # list your teams, get a key
    python3 scripts/yahoo-pull.py --team <team_key>  # roster + opponent + FAs
    python3 scripts/yahoo-pull.py --team <key> --week 5
    python3 scripts/yahoo-pull.py --team <key> --json    # raw JSON to stdout, still not saved
    python3 scripts/yahoo-pull.py --self-test        # no network, no credentials

⛔⛔ NOTHING IS WRITTEN TO DISK. THE PULL IS DISPLAYED AND LET GO.
    The API Access and Use Agreement, Exhibit A section 2.c.vii, reads:
    "Developer shall not store, cache or index the Yahoo Fantasy Information."
    There is no personal-use exemption, so a script that quietly saved a copy on
    every run would be out of compliance on its FIRST run. Until Sep 15 2026 this
    file did exactly that -- it wrote ~/.config/rosterxray/yahoo_team.json
    unconditionally, with no way to switch it off.

    --out still exists, because a deliberate act is different from a default, and
    it now prints what the agreement says before it writes. Section 6 is the
    reason to think twice: on termination you must delete every copy within ten
    business days, "including any analyses, test results or other data created in
    connection with or while using" it -- so a derived summary is covered too.

    ⭐ WHAT YOU CAN KEEP INSTEAD: your own decisions. A record of what you
    started and why is a record of YOUR behaviour, not information retrieved from
    Yahoo's database, and the facts in it can come from nflverse, which carries no
    such restriction. Same shape as the betting ledger: log the REASON, not the
    market data.

✅ THE OAUTH PATH IS VERIFIED AGAINST THE LIVE API — Sep 15 2026, first real run.
    --auth completed end to end: authorize URL accepted, code exchanged, token
    written to ~/.config/rosterxray/yahoo_token.json. So the client id, the client
    secret and the redirect URI are all correct, and the token store works.

⭐⭐ WHAT A PRE-PROVISIONING FAILURE LOOKS LIKE, so nobody misdiagnoses it later.
    With a valid token but no Fantasy Sports permission attached to the app, every
    fantasy endpoint returns:

        HTTP 401  oauth_problem="additional_authorization_required"

    ⛔ THAT IS NOT A BROKEN CONFIG. It is Yahoo saying the credentials are fine and
    the APP is not entitled to this API yet. A generic "invalid credentials" read of
    it would send you back to re-check the .env, which is the wrong end of the
    problem. The fix is provisioning, which is Yahoo's side: countersignature of the
    API Access and Use Agreement, then the Fantasy permission attached to the app.

⚠️ THE FANTASY DATA PATH REMAINS UNVERIFIED. It was written against Yahoo's
    published contract and cannot be exercised here -- there are no credentials
    in this environment and there never should be. --self-test covers every part
    that does not need the network: the path safety rules, the token file
    handling and the response flattener against recorded Yahoo shapes. Treat the
    first real --auth run as the actual test, and read what it prints.
"""
import argparse, base64, json, os, sys, time, urllib.parse, urllib.request, urllib.error
from pathlib import Path

AUTH_BASE = "https://api.login.yahoo.com/oauth2"
API_BASE = "https://fantasysports.yahooapis.com/fantasy/v2"
DEFAULT_DIR = Path.home() / ".config" / "rosterxray"
# ⚠️ NOT "oob". Yahoo's OAuth docs still document out-of-band as a valid
# redirect_uri, and their app-creation FORM rejects it — the form is the source
# of truth and the docs lag. Registering with a loopback URL is what works now.
#
# NOTHING LISTENS ON THIS PORT, and nothing needs to. After you approve, Yahoo
# redirects the browser to https://localhost:8000/?code=XXXX, the page fails to
# load, and the CODE IS IN THE URL BAR. That is the value to paste back.
#
# It must be BYTE-IDENTICAL between the authorize call and the token exchange or
# Yahoo returns invalid_grant, which is why it is stored in the token file and
# reused on refresh rather than re-derived.
DEFAULT_REDIRECT = "https://localhost:8000/"
REPO_ROOT = Path(__file__).resolve().parent.parent


# --- path safety -----------------------------------------------------------
def inside_repo(p: Path) -> bool:
    """True if p is inside this git repo. Used to REFUSE, not to warn."""
    try:
        Path(p).resolve().relative_to(REPO_ROOT)
        return True
    except ValueError:
        return False


def assert_outside_repo(p: Path, what: str) -> Path:
    if inside_repo(p):
        sys.exit(
            f"REFUSED: {what} would sit inside the repo at {p}.\n"
            f"This repo is PUBLIC and a committed secret cannot be undone.\n"
            f"Keep it outside any git repo, e.g. {DEFAULT_DIR}/."
        )
    return p


# --- credentials -----------------------------------------------------------
def load_env(path: Path) -> dict:
    """Minimal KEY=VALUE reader. No dependency, no shell evaluation."""
    out = {}
    if not path.exists():
        return out
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def creds(env_path: Path) -> tuple:
    env = load_env(env_path)
    cid = os.environ.get("YAHOO_CLIENT_ID") or env.get("YAHOO_CLIENT_ID")
    sec = os.environ.get("YAHOO_CLIENT_SECRET") or env.get("YAHOO_CLIENT_SECRET")
    if not cid or not sec:
        sys.exit(
            f"No Yahoo credentials found.\n"
            f"Looked in {env_path} and the environment.\n"
            f"See the setup block at the top of this file."
        )
    return cid, sec


# --- oauth -----------------------------------------------------------------
def _post(url: str, data: dict, cid: str, sec: str) -> dict:
    basic = base64.b64encode(f"{cid}:{sec}".encode()).decode()
    req = urllib.request.Request(
        url,
        data=urllib.parse.urlencode(data).encode(),
        headers={"Authorization": f"Basic {basic}",
                 "Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")[:400]
        sys.exit(f"Yahoo returned HTTP {e.code} on the token call:\n  {body}")


def authorize(cid: str, sec: str, token_path: Path, redirect: str) -> dict:
    url = f"{AUTH_BASE}/request_auth?" + urllib.parse.urlencode(
        {"client_id": cid, "redirect_uri": redirect, "response_type": "code", "language": "en-us"}
    )
    print("\n1. Open this URL and approve access:\n")
    print("   " + url + "\n")
    if redirect.startswith("http"):
        print(f"2. Your browser will fail to load {redirect} — that is EXPECTED,")
        print("   nothing is listening there. Copy the `code` value out of the URL bar:")
        print(f"      {redirect}?code=THIS_PART\n")
        prompt = "3. Paste the code: "
    else:
        prompt = "2. Paste the code Yahoo shows you: "
    code = input(prompt).strip()
    if not code:
        sys.exit("No code entered.")
    # Tolerate a pasted full URL rather than just the code — an easy mistake to
    # make when the value is being lifted out of an address bar.
    if "code=" in code:
        code = urllib.parse.parse_qs(urllib.parse.urlparse(code).query).get("code", [code])[0]
    tok = _post(f"{AUTH_BASE}/get_token",
                {"client_id": cid, "client_secret": sec, "redirect_uri": redirect,
                 "code": code, "grant_type": "authorization_code"}, cid, sec)
    tok["redirect_uri"] = redirect
    save_token(tok, token_path)
    print(f"\nAuthorized. Token saved to {token_path} (mode 600).")
    return tok


def save_token(tok: dict, path: Path) -> None:
    assert_outside_repo(path, "the Yahoo token file")
    tok = dict(tok)
    # Absolute expiry, because a stored relative `expires_in` is meaningless
    # the moment the process ends.
    tok["expires_at"] = time.time() + int(tok.get("expires_in", 3600)) - 60
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(tok, indent=2))
    os.chmod(path, 0o600)
    # WINDOWS CANNOT DO THIS, AND THE WARNING BELONGS HERE RATHER THAN IN A TEST.
    # os.chmod on Windows toggles only the read-only bit; it cannot set POSIX
    # permission triplets, so the file stays readable by any account on the machine.
    # The protection genuinely does not apply, so say so AT THE MOMENT A REAL TOKEN
    # IS WRITTEN rather than as a red test the reader learns to scroll past. A
    # warning at the point of risk beats a failing assertion about a platform where
    # the risk cannot be removed.
    if os.name == "nt" and (path.stat().st_mode & 0o777) != 0o600:
        print(f"  WARNING: {path} is NOT permission-restricted. Windows does not "
              f"support chmod 600, so any account on this machine can read this "
              f"token. Keep it outside shared or synced folders.")


def access_token(cid: str, sec: str, token_path: Path) -> str:
    if not token_path.exists():
        sys.exit(f"Not authorized yet. Run:  python3 {Path(__file__).name} --auth")
    tok = json.loads(token_path.read_text())
    if time.time() < tok.get("expires_at", 0):
        return tok["access_token"]
    # Access tokens last an hour; the refresh token is what makes this a
    # one-time setup rather than a weekly chore.
    redirect = tok.get("redirect_uri", DEFAULT_REDIRECT)
    fresh = _post(f"{AUTH_BASE}/get_token",
                  {"client_id": cid, "client_secret": sec, "redirect_uri": redirect,
                   "refresh_token": tok["refresh_token"], "grant_type": "refresh_token"}, cid, sec)
    fresh.setdefault("refresh_token", tok["refresh_token"])
    fresh["redirect_uri"] = redirect
    save_token(fresh, token_path)
    return fresh["access_token"]


def api(path: str, token: str) -> dict:
    url = f"{API_BASE}/{path}"
    url += ("&" if "?" in url else "?") + "format=json"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")[:400]
        sys.exit(f"Yahoo returned HTTP {e.code} for {path}:\n  {body}")


# --- the shape ------------------------------------------------------------
# ⚠️ YAHOO'S JSON IS NOT A LIST OF OBJECTS. A collection comes back as a dict
# keyed by STRINGIFIED INDEX with a sibling "count", and each element is often a
# LIST OF SINGLE-KEY DICTS that has to be merged before it means anything:
#
#   {"0": {"player": [[{"player_key": "..."}, {"name": {...}}], {"selected_position": ...}]},
#    "1": {...}, "count": 2}
#
# Both quirks have to be handled or the parse silently returns nothing, which is
# the silent-drop class this repo has fixed repeatedly. flatten() merges the
# fragment lists; indexed() turns the numeric dict back into a real list.
def flatten(node):
    """Merge Yahoo's list-of-single-key-dicts fragments into one dict."""
    if isinstance(node, dict):
        return node
    if not isinstance(node, list):
        return {}
    out = {}
    for part in node:
        if isinstance(part, dict):
            out.update(part)
        elif isinstance(part, list):
            out.update(flatten(part))
    return out


def indexed(node):
    """Yahoo's numeric-keyed collection -> a plain list, in index order."""
    if not isinstance(node, dict):
        return []
    keys = sorted((k for k in node if k.isdigit()), key=int)
    return [node[k] for k in keys]


def _positions(node) -> list:
    """eligible_positions arrives as [{"position": "WR"}, ...] or a numeric-keyed dict."""
    items = node if isinstance(node, list) else indexed(node) if isinstance(node, dict) else []
    out = []
    for it in items:
        pos = flatten(it).get("position") if not isinstance(it, str) else it
        if pos:
            out.append(pos)
    return out


def player_row(raw) -> dict:
    p = flatten(raw.get("player", raw) if isinstance(raw, dict) else raw)
    name = p.get("name") or {}
    pos = p.get("primary_position") or p.get("display_position")
    sel = flatten(p.get("selected_position") or [])
    bye = flatten(p.get("bye_weeks") or {}).get("week") if p.get("bye_weeks") else None
    return {
        "name": (name.get("full") if isinstance(name, dict) else None) or p.get("player_key"),
        "pos": pos,
        "team": p.get("editorial_team_abbr"),
        "player_key": p.get("player_key"),
        "status": p.get("status") or None,                 # IR / O / Q ...
        "pct_owned": (p.get("percent_owned") or {}).get("value") if isinstance(p.get("percent_owned"), dict) else None,
        "slot": sel.get("position"),
        "eligible": _positions(p.get("eligible_positions")),
        "bye": int(bye) if str(bye or "").isdigit() else None,
        "editable": p.get("is_editable"),
    }


# --- the lineup check: no AI, no storage, every team in one command ---------
# WHAT IT IS (Oct 3 2026, his ask): the Sunday-morning sweep he was doing league by
# league, as one command. For every team it flags a STARTER who is out, doubtful,
# questionable or on bye, and an EMPTY starting slot, then names healthy bench
# players who can legally fill that slot, ordered by PUBLIC expected points.
# WHY IT IS SHAPED THIS WAY: the agreement's Approved Use Case is "automating
# personal roster analysis and start/sit decisions", so this is squarely in scope.
# The two hard limits are kept on purpose:
#   * nothing is written to disk (Exhibit A 2.c.vii: no store, cache or index)
#   * no AI touches the data (Exhibit A 3.e). The rules below are plain code.
# Yahoo supplies the roster, slots, injury tag and bye week. The cross-check
# (Sleeper's public feed) and the ordering (nflverse expected points) are public
# data the app already refreshes, so the decision logic owes Yahoo nothing.
BENCH_SLOTS = {"BN", "IR", "IR+", "IL", "IL+", "NA"}
OUT_TAGS = {"O": "OUT", "IR": "IR", "IR-R": "IR", "PUP-R": "PUP", "PUP-P": "PUP", "PUP": "PUP",
            "NFI-R": "NFI", "NFI-A": "NFI", "SUSP": "SUSPENDED", "NA": "INACTIVE",
            "D": "DOUBTFUL", "COVID-19": "OUT"}
PUBLIC_OUT = {"out", "ir", "doubtful", "pup", "sus", "suspended", "nfi", "na", "dnr"}


def _key(name: str) -> str:
    """Name key shared by Yahoo and the public layers: lowercase, no punctuation."""
    # Mirrors the app's normalize(): hyphens become spaces, other punctuation goes.
    # "Amon-Ra St. Brown" -> "amon ra st brown", the key the public files use.
    n = "".join(ch for ch in (name or "").lower().replace("-", " ") if ch.isalnum() or ch == " ")
    return " ".join(n.split())


def _lookup(table: dict, name: str):
    k = _key(name)
    if k in table:
        return table[k]
    for suf in (" jr", " sr", " ii", " iii", " iv"):        # Kenneth Walker III vs walker
        if k.endswith(suf) and k[: -len(suf)] in table:
            return table[k[: -len(suf)]]
        if k + suf in table:
            return table[k + suf]
    return None


def check_team(roster: list, slots: dict, week, pub_status: dict, pub_exp: dict) -> list:
    """Pure function: roster rows + {slot: count} -> list of flags. No I/O at all."""
    flags = []
    def problem(p):
        if p.get("bye") and week and p["bye"] == week:
            return "BYE"
        tag = OUT_TAGS.get(p.get("status") or "")
        if tag:
            return tag
        if (p.get("status") or "") == "Q":
            return "QUESTIONABLE"
        pub = _lookup(pub_status, p.get("name") or "") or {}
        ps = str(pub.get("injury_status") or "").strip().lower()
        if ps in PUBLIC_OUT:
            return f"PUBLIC FEED: {pub.get('injury_status')}"
        return None

    def options(slot):
        bench = [b for b in roster if (b.get("slot") or "BN") == "BN"
                 and slot in (b.get("eligible") or []) and problem(b) in (None, "QUESTIONABLE")]
        ranked = sorted(bench, key=lambda b: -((_lookup(pub_exp, b["name"]) or {}).get("exp_pg") or 0))
        return [(b["name"], b.get("pos"), (_lookup(pub_exp, b["name"]) or {}).get("exp_pg"),
                 problem(b)) for b in ranked[:3]]

    filled = {}
    for p in roster:
        s = p.get("slot")
        if not s or s in BENCH_SLOTS:
            continue
        filled[s] = filled.get(s, 0) + 1
        why = problem(p)
        if why:
            flags.append({"kind": "starter", "slot": s, "player": p, "why": why,
                          "locked": p.get("editable") in (0, "0"), "options": options(s)})
    for s, need in slots.items():
        if s in BENCH_SLOTS:
            continue
        for _ in range(max(0, need - filled.get(s, 0))):
            flags.append({"kind": "empty", "slot": s, "player": None, "why": "EMPTY",
                          "locked": False, "options": options(s)})
    return flags


def _roster_slots(settings_league: dict) -> dict:
    st = flatten(settings_league.get("settings") or [])
    out = {}
    for rp in (st.get("roster_positions") or []):
        r = flatten(rp).get("roster_position") or flatten(rp)
        r = flatten(r)
        if r.get("position") and str(r.get("is_starting_position", 1)) != "0":
            out[r["position"]] = out.get(r["position"], 0) + int(r.get("count") or 1)
    return out


def _public_layers() -> tuple:
    """The app's own PUBLIC data (Sleeper status, nflverse expected). Never Yahoo's."""
    def load(name, key):
        p = REPO_ROOT / "grading" / "data" / name
        try:
            d = json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return {}
        d = d.get(key, d) if isinstance(d, dict) else {}
        return {_key(k): v for k, v in d.items() if isinstance(v, dict)}
    return load("status_2026.json", "players"), load("expected_2026.json", "players")


def run_check(token: str) -> int:
    """Every team, flags only. PRINTS, NEVER WRITES - that is the agreement."""
    pub_status, pub_exp = _public_layers()
    teams = pull_teams(token)
    rows, need = [], 0
    for t in teams:
        lg = flatten(((api(f"league/{t['league_key']}/settings", token)
                       .get("fantasy_content") or {}).get("league") or []))
        week = int(lg.get("current_week") or 0) or None
        roster = api(f"team/{t['team_key']}/roster", token)
        rc = flatten(((roster.get("fantasy_content") or {}).get("team") or []))
        players = ((rc.get("roster") or {}).get("0") or {}).get("players") or (rc.get("roster") or {}).get("players") or {}
        flags = check_team(collect_players(players), _roster_slots(lg), week, pub_status, pub_exp)
        need += 1 if any(not f["locked"] for f in flags) else 0
        rows.append((lg.get("name") or t["league_key"], t.get("name"), week, flags))
        time.sleep(0.2)                               # be gentle with the Rate Limits (2.c.v)
    print(f"LINEUP CHECK · {len(teams)} teams · {need} need attention · shown, not saved")
    for league, team, week, flags in rows:
        print(f"\n  {league} · {team} · week {week or '?'}")
        if not flags:
            print("    ok  every starter active")
            continue
        for f in flags:
            p = f["player"]
            who = f"{p['name']} ({p.get('team') or '-'})" if p else "slot EMPTY"
            lock = "  [game started - locked]" if f["locked"] else ""
            print(f"    !!  {f['slot']:<6} {who:<34} {f['why']}{lock}")
            if f["options"] and not f["locked"]:
                opts = ", ".join(f"{n} {pos} ({e if e is not None else '-'}/g"
                                 f"{', Q' if w == 'QUESTIONABLE' else ''})" for n, pos, e, w in f["options"])
                print(f"        bench options by public expected pts: {opts}")
            elif not f["locked"]:
                print("        no eligible healthy bench player: a waiver add is the only fix")
    print("\n  Statuses: Yahoo's tag, cross-checked against the public injury feed."
          "\n  Bench order: nflverse expected points per game (public). Nothing here was saved.")
    return 0


def collect_players(container) -> list:
    if not isinstance(container, dict):
        return []
    rows = []
    for item in indexed(container):
        row = player_row(item)
        if row["name"]:
            rows.append(row)
    return rows


# --- the waiver check: the REAL available list, scored by the app's own code -----
# WHAT IT IS (Oct 3 2026, his ask): "who is available in MY league that the
# numbers like". The app's waiver pool has always had to guess the wire. This pulls
# each league's actual available players (status=A covers free agents AND players
# on waivers) and hands them, IN MEMORY, to scripts/waiver-score.mjs, which runs
# the app's own scoreFreeAgent and breakout board on exactly that list.
# Nothing is copied from App.jsx into Python, so the two cannot disagree.
# Nothing is written to disk and no AI reads it (Exhibit A 2.c.vii, 3.e).
# "Player availability" is named in the Approved Use Case, and an available list
# is a subset of a league, not "all players in a fantasy league" (2.c.x).
YAHOO_PAGE = 25          # Yahoo caps a players collection at 25 per request


def _available_path(league_key: str, start: int) -> str:
    return f"league/{league_key}/players;status=A;sort=AR;start={start};count={YAHOO_PAGE}"


def pull_available(token: str, league_key: str, limit: int) -> list:
    rows = []
    for start in range(0, limit, YAHOO_PAGE):
        d = api(_available_path(league_key, start), token)
        lc = flatten(((d.get("fantasy_content") or {}).get("league") or []))
        page = collect_players(lc.get("players") or {})
        rows.extend(page)
        if len(page) < YAHOO_PAGE:
            break
        time.sleep(0.2)                              # Rate Limits (2.c.v)
    return rows


FLEX_LETTERS = {"Q": "QB", "W": "WR", "R": "RB", "T": "TE"}
SKILL_POS = ("QB", "RB", "WR", "TE")


def _rec_points(settings_league: dict):
    """Points per reception from the league's stat modifiers (Yahoo stat_id 11).
    None when the settings do not say, which is reported as 'scoring unknown'."""
    st = flatten(settings_league.get("settings") or [])
    mods = flatten(st.get("stat_modifiers") or {})
    stats = mods.get("stats") or []
    items = stats if isinstance(stats, list) else indexed(stats)
    found = False
    for it in items:
        sd = flatten(flatten(it).get("stat") or it)
        if str(sd.get("stat_id")) == "11":
            try:
                return float(sd.get("value"))
            except (TypeError, ValueError):
                return None
        found = True
    return 0.0 if found else None


def league_context(slots: dict, roster: list, rec) -> dict:
    """Pure: lineup slots + your roster -> where you are SHORT (cannot fill a
    starting slot with a healthy player) and THIN (no healthy backup).
    Healthy means not on IR and not carrying an out-type Yahoo tag."""
    def healthy(p):
        return (p.get("slot") not in ("IR", "IR+", "IL", "IL+")
                and not OUT_TAGS.get(p.get("status") or ""))
    have = {pos: sum(1 for p in roster if p.get("pos") == pos and healthy(p)) for pos in SKILL_POS}
    need = {pos: int(slots.get(pos, 0)) for pos in SKILL_POS}
    short = [pos for pos in SKILL_POS if have[pos] < need[pos]]
    thin = [pos for pos in SKILL_POS if need[pos] and have[pos] == need[pos]]
    # Spare players are SHARED between flex slots, so they are used up one slot at
    # a time, most restrictive flex first. Counting the same spare receiver for a
    # W/R/T and a Q/W/R/T would report a superflex as covered when it is not.
    spare = {pos: max(0, have[pos] - need[pos]) for pos in SKILL_POS}
    flexes = sorted(((sl, n, [FLEX_LETTERS[c] for c in sl.split("/") if c in FLEX_LETTERS])
                     for sl, n in slots.items() if "/" in sl), key=lambda x: len(x[2]))
    flex = []
    for slot, n, elig in flexes:
        for _ in range(int(n)):
            src = next((pos for pos in elig if spare[pos] > 0), None)
            if src:
                spare[src] -= 1
            elif not any(f["slot"] == slot for f in flex):
                flex.append({"slot": slot, "positions": elig})
    superflex = any("Q" in s_.split("/") and "/" in s_ for s_ in slots) or need["QB"] >= 2
    return {"rec": rec, "slots": {k: v for k, v in slots.items()}, "short": short,
            "thin": thin, "flex_short": flex, "superflex": superflex}


def run_waivers(token: str, limit: int) -> int:
    import subprocess
    leagues, seen = [], set()
    for t in pull_teams(token):
        if t["league_key"] in seen:                  # two teams in one league = one wire
            continue
        seen.add(t["league_key"])
        lg = flatten(((api(f"league/{t['league_key']}/settings", token)
                       .get("fantasy_content") or {}).get("league") or []))
        avail = pull_available(token, t["league_key"], limit)
        roster = api(f"team/{t['team_key']}/roster", token)
        rc = flatten(((roster.get("fantasy_content") or {}).get("team") or []))
        mine = collect_players(((rc.get("roster") or {}).get("0") or {}).get("players")
                               or (rc.get("roster") or {}).get("players") or {})
        leagues.append({"label": lg.get("name") or t["league_key"],
                        "context": league_context(_roster_slots(lg), mine, _rec_points(lg)),
                        "players": [{"name": r["name"], "pos": r["pos"], "team": r["team"],
                                     "status": r["status"], "pct_owned": None} for r in avail]})
    # Handed over on stdin, never through a file.
    done = subprocess.run(["node", "scripts/waiver-score.mjs"], cwd=REPO_ROOT,
                          input=json.dumps({"leagues": leagues}), text=True, encoding="utf-8")
    return done.returncode


# --- pulls -----------------------------------------------------------------
def pull_teams(token: str) -> list:
    d = api("users;use_login=1/games;game_keys=nfl/teams", token)
    out = []
    users = ((d.get("fantasy_content") or {}).get("users") or {})
    for u in indexed(users):
        games = (flatten(u.get("user", [])) or {}).get("games") or {}
        for g in indexed(games):
            teams = (flatten(g.get("game", [])) or {}).get("teams") or {}
            for t in indexed(teams):
                tm = flatten(t.get("team", []))
                if tm.get("team_key"):
                    out.append({"team_key": tm.get("team_key"), "name": tm.get("name"),
                                "league_key": ".".join(tm["team_key"].split(".")[:3])})
    return out


def pull_team(token: str, team_key: str, week, fa_limit: int) -> dict:
    league_key = ".".join(team_key.split(".")[:3])
    wk = f";week={week}" if week else ""
    roster = api(f"team/{team_key}/roster{wk}", token)
    rc = flatten(((roster.get("fantasy_content") or {}).get("team") or []))
    players = ((rc.get("roster") or {}).get("0") or {}).get("players") or (rc.get("roster") or {}).get("players") or {}

    settings = api(f"league/{league_key}/settings", token)
    lc = flatten(((settings.get("fantasy_content") or {}).get("league") or []))

    sb = api(f"league/{league_key}/scoreboard{wk}", token)
    sc = flatten(((sb.get("fantasy_content") or {}).get("league") or []))
    opponent = None
    for m in indexed((sc.get("scoreboard") or {}).get("0", {}).get("matchups")
                     or (sc.get("scoreboard") or {}).get("matchups") or {}):
        teams = (flatten(m.get("matchup", [])) or {}).get("teams") or {}
        names = [flatten(t.get("team", [])) for t in indexed(teams)]
        keys = [n.get("team_key") for n in names]
        if team_key in keys:
            other = [n for n in names if n.get("team_key") != team_key]
            if other:
                opponent = {"team_key": other[0].get("team_key"), "name": other[0].get("name")}
            break

    fas = api(f"league/{league_key}/players;status=FA;sort=AR;count={fa_limit}", token)
    fc = flatten(((fas.get("fantasy_content") or {}).get("league") or []))

    return {
        "_meta": {
            "source": "Yahoo Fantasy Sports API",
            "pulled_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "team_key": team_key, "league_key": league_key,
            "week": week or lc.get("current_week"),
        },
        "league": {
            "name": lc.get("name"), "num_teams": lc.get("num_teams"),
            "scoring_type": lc.get("scoring_type"), "current_week": lc.get("current_week"),
        },
        "opponent": opponent,
        "roster": collect_players(players),
        "free_agents": collect_players(fc.get("players") or {}),
    }


def render(data: dict, summary: str) -> None:
    """Print the pull so a human can read it. WRITES NOTHING - that is the point.

    A wall of raw JSON is not a Sunday-morning instrument. The two questions this
    view answers are the two the app cannot answer today: who is on my roster with
    what injury tag, and who is actually available in MY league.
    """
    print(summary)
    roster = data.get("roster") or []
    if roster:
        print("\nROSTER (%d)" % len(roster))
        for p in roster:
            print("  %-4s %-3s %-26s %-4s %s" % (
                p.get("slot") or "-", p.get("pos") or "-",
                p.get("name") or "?", p.get("team") or "-", p.get("status") or ""))
    fas = data.get("free_agents") or []
    if fas:
        print("\nFREE AGENTS (%d, by rank)" % len(fas))
        for p in fas:
            own = p.get("pct_owned")
            own = ("%s%%" % own).rjust(5) if own not in (None, "") else "    -"
            print("  %s  %-3s %-26s %-4s %s" % (
                own, p.get("pos") or "-", p.get("name") or "?",
                p.get("team") or "-", p.get("status") or ""))


# --- self test -------------------------------------------------------------
def self_test() -> int:
    fails = []
    def ok(label, cond, extra=""):
        print(("  ok   " if cond else "  FAIL ") + label + ("" if cond else f"  <{extra}>"))
        if not cond:
            fails.append(label)

    print("\npath safety — the rule a public repo cannot get wrong")
    ok("a path inside the repo is detected", inside_repo(REPO_ROOT / "yahoo.env"))
    ok("the default credential dir is OUTSIDE the repo", not inside_repo(DEFAULT_DIR / "yahoo.env"))
    ok("the default output dir is OUTSIDE the repo", not inside_repo(DEFAULT_DIR / "yahoo_team.json"))
    ok("scripts/ is correctly seen as inside the repo", inside_repo(Path(__file__).resolve()))

    print("\nYahoo's shape — both quirks, or the parse silently returns nothing")
    frag = [{"player_key": "nfl.p.1"}, {"name": {"full": "Justin Jefferson"}},
            [{"editorial_team_abbr": "MIN"}, {"primary_position": "WR"}]]
    f = flatten(frag)
    ok("list-of-fragments merges", f.get("name", {}).get("full") == "Justin Jefferson", json.dumps(f)[:80])
    ok("nested fragment lists merge too", f.get("primary_position") == "WR")
    coll = {"0": {"player": frag}, "1": {"player": [{"player_key": "nfl.p.2"},
            {"name": {"full": "Chase Brown"}}, {"status": "Q"}]}, "count": 2}
    ok("numeric-keyed collection -> list, in order", [x["name"] for x in collect_players(coll)]
       == ["Justin Jefferson", "Chase Brown"], json.dumps(collect_players(coll))[:120])
    ok("injury status survives", collect_players(coll)[1]["status"] == "Q")
    ok("count/other non-numeric keys are not treated as rows", len(indexed(coll)) == 2)
    ok("an empty collection is empty, not a crash", collect_players({}) == [])
    ok("a malformed row is dropped, not fatal", collect_players({"0": {"player": [{}]}}) == [])

    print("\ntoken handling")
    # ⚠️ A REAL ASSERTION, exercised against a temp file. The first version of
    # this block read `... or True`, which always passes -- the guard-that-
    # cannot-fail trap this repo has now hit five times. Assert the behaviour.
    import tempfile
    with tempfile.TemporaryDirectory() as td:
        tp = Path(td) / "yahoo_token.json"
        before = time.time()
        save_token({"access_token": "A", "refresh_token": "R", "expires_in": 3600}, tp)
        saved = json.loads(tp.read_text())
        ok("expires_at is stored ABSOLUTE, not a relative expires_in",
           before + 3000 < saved.get("expires_at", 0) < before + 3600,
           str(saved.get("expires_at")))
        # PLATFORM-AWARE RATHER THAN DELETED (his call, Sep 6 2026 - option A).
        # chmod 600 is a POSIX concept. On Windows os.chmod toggles the read-only
        # bit and nothing else, so this reads 0o666 and CAN NEVER PASS there. It
        # passed in CI (Linux) and failed on the only machine anyone develops on,
        # which is the worst possible split: a permanently red suite teaches you to
        # stop reading it, and this repo already records eleven bugs that
        # accumulated behind eleven ignored build warnings.
        # So on Windows assert what IS true and controllable - the file exists and
        # lives outside the repo - and save_token prints the real warning.
        mode = oct(tp.stat().st_mode & 0o777)
        if os.name == "nt":
            ok("the token file is written (chmod 600 is POSIX-only; see the save-time warning)",
               tp.exists() and tp.stat().st_size > 0, mode)
        else:
            ok("the token file is chmod 600", mode == "0o600", mode)
        ok("a live token is reused without a network call",
           access_token("id", "sec", tp) == "A")
        # An expired token must NOT be returned. Proven by pointing the refresh
        # at a path that cannot resolve: reuse would return "A" and pass wrongly.
        saved["expires_at"] = time.time() - 1
        tp.write_text(json.dumps(saved))
        expired_reused = False
        try:
            expired_reused = access_token("id", "sec", tp) == "A"
        except SystemExit:
            pass
        except Exception:
            pass
        ok("an EXPIRED token is never reused", not expired_reused)
    # The token path is subject to the same refusal as the credentials path.
    refused = False
    try:
        save_token({"access_token": "x"}, REPO_ROOT / "yahoo_token.json")
    except SystemExit:
        refused = True
    ok("saving a token INSIDE the repo is refused", refused)
    ok("no token file was created in the repo", not (REPO_ROOT / "yahoo_token.json").exists())
    print("\nthe no-cache default — the pull is shown, not saved")
    import io as _io, contextlib as _ctx
    _sample = {
        "_meta": {"week": 2}, "league": {"name": "Test League", "num_teams": 12},
        "opponent": {"name": "Them"},
        "roster": [{"name": "Justin Jefferson", "pos": "WR", "team": "MIN",
                    "slot": "WR", "status": None, "pct_owned": 99}],
        "free_agents": [{"name": "Caleb Douglas", "pos": "WR", "team": "MIA",
                         "status": "Q", "pct_owned": 12}],
    }
    _buf = _io.StringIO()
    with _ctx.redirect_stdout(_buf):
        render(_sample, "summary line")
    _shown = _buf.getvalue()
    # Assert the SHAPE, not the column widths: a cosmetic width change must not
    # fail this, but dropping the slot or the team column must.
    _rline = next((l for l in _shown.splitlines() if "Justin Jefferson" in l), "")
    ok("the roster line leads with the lineup slot and carries the team",
       _rline.strip().startswith("WR") and "MIN" in _rline, _rline)
    ok("it prints free agents with ownership and injury tag",
       "Caleb Douglas" in _shown and "12%" in _shown and "Q" in _shown)
    ok("it prints the summary line", "summary line" in _shown)

    print("\nthe lineup check - plain rules, synthetic players, no Yahoo data")
    _pos = _positions([{"position": "WR"}, {"position": "W/R/T"}])
    ok("eligible positions parse from Yahoo's fragment list", _pos == ["WR", "W/R/T"], _pos)
    _lg = {"settings": [{"roster_positions": [
        {"roster_position": {"position": "QB", "count": 1, "is_starting_position": 1}},
        {"roster_position": {"position": "WR", "count": 2, "is_starting_position": 1}},
        {"roster_position": {"position": "W/R/T", "count": 1, "is_starting_position": 1}},
        {"roster_position": {"position": "BN", "count": 5, "is_starting_position": 0}}]}]}
    _slots = _roster_slots(_lg)
    ok("roster slots count starters only", _slots == {"QB": 1, "WR": 2, "W/R/T": 1}, _slots)
    ok("the name key matches the public files", _key("Amon-Ra St. Brown") == "amon ra st brown")
    _ros = [
        {"name": "Qb One", "slot": "QB", "eligible": ["QB"], "status": None, "bye": 5},
        {"name": "Wr Out", "slot": "WR", "eligible": ["WR", "W/R/T"], "status": "O", "bye": 9},
        {"name": "Wr Ok", "slot": "WR", "eligible": ["WR", "W/R/T"], "status": None, "bye": 9},
        {"name": "Bench Good", "slot": "BN", "eligible": ["WR", "W/R/T"], "status": None, "bye": 9},
        {"name": "Bench Bad", "slot": "BN", "eligible": ["WR", "W/R/T"], "status": None, "bye": 9},
        {"name": "Bench Hurt", "slot": "BN", "eligible": ["WR", "W/R/T"], "status": "IR", "bye": 9},
        {"name": "Feed Out", "slot": "BN", "eligible": ["WR"], "status": None, "bye": 9},
    ]
    _exp = {"bench good": {"exp_pg": 12.0}, "bench bad": {"exp_pg": 4.0}}
    _f = check_team(_ros, _slots, 5, {"feed out": {"injury_status": "Out"}}, _exp)
    _by = {(x["slot"], x["why"]): x for x in _f}
    ok("a starter on bye is flagged", ("QB", "BYE") in _by, list(_by))
    ok("a starter tagged O is flagged OUT", ("WR", "OUT") in _by, list(_by))
    ok("an unfilled starting slot is flagged EMPTY", ("W/R/T", "EMPTY") in _by, list(_by))
    _opts = [o[0] for o in _by.get(("WR", "OUT"), {}).get("options", [])]
    ok("bench options order by public expected points", _opts[:2] == ["Bench Good", "Bench Bad"], _opts)
    ok("an injured bench player is never offered", "Bench Hurt" not in _opts, _opts)
    ok("a bench player the public feed calls Out is never offered", "Feed Out" not in _opts, _opts)
    ok("a healthy starter raises nothing",
       not any(x["player"] and x["player"]["name"] == "Wr Ok" for x in _f))
    ok("a locked starter is marked as locked",
       check_team([{"name": "L", "slot": "QB", "eligible": ["QB"], "status": "O", "editable": 0}],
                  {"QB": 1}, 5, {}, {})[0]["locked"])
    _src = Path(__file__).read_text(encoding="utf-8")
    _body = _src[_src.index("def run_check("):_src.index("# --- pulls")]
    ok("the lineup check writes nothing to disk",
       not any(t in _body for t in ("write_text", "open(", ".dump(")), "found a write in run_check")

    print("\nthe waiver check - pagination and the in-memory handoff")
    ok("the available list asks for free agents AND waivers, 25 at a time",
       _available_path("461.l.1", 50) == "league/461.l.1/players;status=A;sort=AR;start=50;count=25")
    _wsrc = Path(__file__).read_text(encoding="utf-8")
    _wbody = _wsrc[_wsrc.index("def run_waivers("):_wsrc.index("# --- pulls")]
    ok("the waiver check hands the list over on stdin, never through a file",
       "input=json.dumps" in _wbody and not any(t in _wbody for t in ("write_text", "open(", ".dump(")))
    ok("the waiver check scores with the app's own code, not a Python copy",
       "waiver-score.mjs" in _wbody and "scoreFreeAgent" not in _wbody.split("# Handed over")[1])

    print("\nleague awareness - scoring and weak spots, synthetic league")
    _set = {"settings": [{"stat_modifiers": {"stats": [
        {"stat": {"stat_id": 4, "value": "0.04"}}, {"stat": {"stat_id": 11, "value": "1"}}]}}]}
    ok("full PPR is read off stat 11", _rec_points(_set) == 1.0, _rec_points(_set))
    ok("no reception modifier reads as standard",
       _rec_points({"settings": [{"stat_modifiers": {"stats": [{"stat": {"stat_id": 4, "value": "0.04"}}]}}]}) == 0.0)
    ok("missing modifiers read as unknown, not standard", _rec_points({"settings": [{}]}) is None)
    _sl = {"QB": 1, "RB": 2, "WR": 3, "TE": 1, "W/R/T": 1, "Q/W/R/T": 1}
    _mine = ([{"pos": "QB", "slot": "QB"}] +
             [{"pos": "RB", "slot": "RB"}, {"pos": "RB", "slot": "RB", "status": "O"}] +
             [{"pos": "WR", "slot": "WR"}] * 4 + [{"pos": "TE", "slot": "TE"}, {"pos": "TE", "slot": "IR"}])
    _ctx = league_context(_sl, _mine, 0.5)
    ok("an RB room with one healthy back for two slots is SHORT", "RB" in _ctx["short"], _ctx)
    ok("one healthy TE for one slot is THIN, and an IR body does not count", "TE" in _ctx["thin"], _ctx)
    ok("a QB slot plus a superflex is recognised as superflex", _ctx["superflex"])
    ok("four healthy WRs for three slots is neither short nor thin",
       "WR" not in _ctx["short"] and "WR" not in _ctx["thin"])
    ok("flex slots with no spare healthy players are flagged",
       any(f["slot"] == "Q/W/R/T" for f in _ctx["flex_short"]), _ctx["flex_short"])

    print("\n" + ("PASS  yahoo-pull self-test" if not fails else f"FAIL  {len(fails)} assertion(s)"))
    return 1 if fails else 0


# --- cli -------------------------------------------------------------------
def main() -> int:
    # Team names carry emoji; a cp1252 Windows console crashes on them (Oct 3 2026).
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    ap = argparse.ArgumentParser(description="Pull your Yahoo fantasy team.")
    ap.add_argument("--auth", action="store_true", help="one-time OAuth handshake")
    ap.add_argument("--teams", action="store_true", help="list your NFL teams and their keys")
    ap.add_argument("--team", metavar="TEAM_KEY", help="pull roster, opponent and free agents")
    ap.add_argument("--waivers", action="store_true",
                    help="every league's AVAILABLE players, scored by the app's waiver and "
                         "breakout logic. Shown, never saved")
    ap.add_argument("--check", action="store_true",
                    help="lineup check across EVERY team: starters out/questionable/on bye, "
                         "empty slots, bench options. Shown, never saved")
    ap.add_argument("--week", type=int, default=None, help="defaults to the league's current week")
    ap.add_argument("--fa-limit", type=int, default=50, help="free agents to pull (default 50)")
    ap.add_argument("--redirect", default=None,
                    help=f"redirect URI registered on the Yahoo app (default {DEFAULT_REDIRECT})")
    ap.add_argument("--env", default=str(DEFAULT_DIR / "yahoo.env"), help="credentials file")
    ap.add_argument("--json", action="store_true",
                    help="raw JSON to stdout instead of the readable view (still not saved)")
    ap.add_argument("--out", default=None,
                    help="ALSO save a copy here. Off by default: the agreement forbids "
                         "storing Yahoo Fantasy Information")
    ap.add_argument("--self-test", action="store_true", help="no network, no credentials")
    a = ap.parse_args()

    if a.self_test:
        return self_test()
    if not (a.auth or a.teams or a.team or a.check or a.waivers):
        ap.print_help()
        return 2

    env_path = assert_outside_repo(Path(a.env).expanduser(), "the credentials file")
    token_path = env_path.parent / "yahoo_token.json"
    cid, sec = creds(env_path)

    if a.auth:
        env = load_env(env_path)
        redirect = a.redirect or env.get("YAHOO_REDIRECT_URI") or DEFAULT_REDIRECT
        authorize(cid, sec, token_path, redirect)
        return 0

    token = access_token(cid, sec, token_path)

    if a.check:
        return run_check(token)
    if a.waivers:
        return run_waivers(token, max(a.fa_limit, 100))

    if a.teams:
        for t in pull_teams(token):
            print(f"  {t['team_key']:<24} {t['name']}")
        return 0

    data = pull_team(token, a.team, a.week, a.fa_limit)
    m, lg = data["_meta"], data["league"]
    summary = (f"{lg.get('name')} · week {m['week']} · {lg.get('num_teams') or '?'} teams · "
               f"{len(data['roster'])} rostered · {len(data['free_agents'])} free agents"
               + (f" · vs {data['opponent']['name']}" if data.get("opponent") else " · no matchup found"))

    # DISPLAY, DO NOT STORE. Both branches print and neither touches the disk.
    if a.json:
        print(json.dumps(data, indent=2))
    else:
        render(data, summary)

    # --out is the deliberate exception, and it says so out loud before it writes.
    if a.out:
        out = Path(a.out).expanduser()
        # An --out inside the repo is allowed but must be deliberate: a roster is
        # personal-track content, which CLAUDE.md rule 4 keeps out of a public repo.
        if inside_repo(out):
            print(f"WARNING: writing a personal roster inside the PUBLIC repo at {out}.\n"
                  f"         Make sure it is gitignored before you commit.", file=sys.stderr)
        print("NOTE: the API agreement restricts storing Yahoo Fantasy Information\n"
              "      (Exhibit A 2.c.vii). Delete this file when you are done with it.",
              file=sys.stderr)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(data, indent=2))
        print(f"-> {out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
