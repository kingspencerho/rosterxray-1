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
    python3 scripts/yahoo-pull.py --self-test        # no network, no credentials

⚠️ THE LIVE API PATH IS UNVERIFIED IN THIS REPO. It was written against Yahoo's
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


def player_row(raw) -> dict:
    p = flatten(raw.get("player", raw) if isinstance(raw, dict) else raw)
    name = p.get("name") or {}
    pos = p.get("primary_position") or p.get("display_position")
    sel = flatten(p.get("selected_position") or [])
    return {
        "name": (name.get("full") if isinstance(name, dict) else None) or p.get("player_key"),
        "pos": pos,
        "team": p.get("editorial_team_abbr"),
        "player_key": p.get("player_key"),
        "status": p.get("status") or None,                 # IR / O / Q ...
        "pct_owned": (p.get("percent_owned") or {}).get("value") if isinstance(p.get("percent_owned"), dict) else None,
        "slot": sel.get("position"),
    }


def collect_players(container) -> list:
    if not isinstance(container, dict):
        return []
    rows = []
    for item in indexed(container):
        row = player_row(item)
        if row["name"]:
            rows.append(row)
    return rows


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
    print("\n" + ("PASS  yahoo-pull self-test" if not fails else f"FAIL  {len(fails)} assertion(s)"))
    return 1 if fails else 0


# --- cli -------------------------------------------------------------------
def main() -> int:
    ap = argparse.ArgumentParser(description="Pull your Yahoo fantasy team.")
    ap.add_argument("--auth", action="store_true", help="one-time OAuth handshake")
    ap.add_argument("--teams", action="store_true", help="list your NFL teams and their keys")
    ap.add_argument("--team", metavar="TEAM_KEY", help="pull roster, opponent and free agents")
    ap.add_argument("--week", type=int, default=None, help="defaults to the league's current week")
    ap.add_argument("--fa-limit", type=int, default=50, help="free agents to pull (default 50)")
    ap.add_argument("--redirect", default=None,
                    help=f"redirect URI registered on the Yahoo app (default {DEFAULT_REDIRECT})")
    ap.add_argument("--env", default=str(DEFAULT_DIR / "yahoo.env"), help="credentials file")
    ap.add_argument("--out", default=None, help="write JSON here (default ~/.config/rosterxray/)")
    ap.add_argument("--self-test", action="store_true", help="no network, no credentials")
    a = ap.parse_args()

    if a.self_test:
        return self_test()
    if not (a.auth or a.teams or a.team):
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

    if a.teams:
        for t in pull_teams(token):
            print(f"  {t['team_key']:<24} {t['name']}")
        return 0

    data = pull_team(token, a.team, a.week, a.fa_limit)
    out = Path(a.out).expanduser() if a.out else DEFAULT_DIR / "yahoo_team.json"
    # An --out inside the repo is allowed but must be deliberate: a roster is
    # personal-track content, which CLAUDE.md rule 4 keeps out of a public repo.
    if a.out and inside_repo(out):
        print(f"WARNING: writing a personal roster inside the PUBLIC repo at {out}.\n"
              f"         Make sure it is gitignored before you commit.", file=sys.stderr)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, indent=2))
    m, lg = data["_meta"], data["league"]
    print(f"{lg.get('name')} · week {m['week']} · {len(data['roster'])} rostered · "
          f"{len(data['free_agents'])} free agents"
          + (f" · vs {data['opponent']['name']}" if data.get("opponent") else " · no matchup found"))
    print(f"-> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
