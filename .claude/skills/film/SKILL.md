---
name: film
description: Find a player's most recent game film online, read it frame by frame, and combine it with his room and market data into a CALL / WATCH. Use when the user names a player and asks to run film, watch tape, eye-test him, or see how he looks — especially a rookie or waiver add with no rate data. Triggers on "film X", "run film on X", "film script on X", "eye test X", "watch X's tape", "how does X look".
---

# Film — name a player, get the tape read

**The rubric is `ANALYST-REFERENCE.md` §11t. Read it before reading any tape.**
This file is the ORDER of work, not the method.

⛔ **Tape is primary only when no rate exists** (rookie, debut, waiver add). For a
player with 8+ games the data decides and the tape confirms — say so up front if
he is a known player.

## 1 · Find candidates — the script lists, YOU pick

```
bash scripts/film-sheets.sh --find "Player Name" [n]
```

Newest first, with upload date, age, length and a REEL column. **It never picks,
and neither should a title.** Pick by these rules, in order:

1. ⛔⛔ **The upload date must be AFTER his latest team change.** Check his team
   in `ADP_DATA` / the status feed, then the date of any trade or signing.
   *(Sep 23 2026: a Kaleb Johnson "Preseason Week 2 vs Jets" reel matched the
   query perfectly — Steelers footage, uploaded Aug 22, eight days before his
   trade to Green Bay.)*
2. ⛔ **Before September is college or last season.** College tape answers a
   different question — §11t has the table.
3. **Game film beats talk.** Skip fantasy-analysis videos; they are someone's
   opinion over clips, not the clips.
4. **`unfiltered` beats `curated`.** An "every target" reel includes the misses;
   a "best catches" reel is a winners-only sample by construction.
5. **THE DEFAULT IS HIS MOST RECENT GAME.** The user does not have to name a
   week or a reel type — "film Dalton Schultz" means the newest game he played.
   Only a named week or game ("week 2", "vs Bengals") overrides it. If the most
   recent game has no reel yet, say so and name the week you fell back to —
   never substitute an older week silently.

**Say in the reply which video you picked, and name any trap you rejected.**

## 2 · Pull the frames

```
bash scripts/film-sheets.sh "https://www.youtube.com/watch?v=<ID>" "<scratchpad>/<player>"
```

Write into the session scratchpad, never the repo. Read every `sheets/sheet_NN.png`.
For the two or three plays that matter:

```
ffmpeg -ss <sec> -i "<outdir>/video.mp4" -frames:v 1 "<outdir>/p.png"
```

⚠️ Filter chains that `select` then `fps` DUPLICATE frames — take single `-ss`
grabs instead.

## 3 · Read it, tier 1 first

- **Score bug on every play:** down, distance, quarter, score. That is the
  coaching staff voting with snaps, and it is the most predictive thing on tape.
- **What job:** early down, third down, goal line, two-minute, gadget.
- **Trait or hole:** did he win with something that travels, or through a lane
  the line built?
- ⛔ **Say what it cannot show:** why the snaps happened, pass protection, any
  rate, and anything the broadcast angle crops out.

## 4 · The half tape cannot see — never skip it

```
node scripts/scout.mjs "Player Name" --format yahoo --roster "<path to roster file>"
```

- **The room (check 1):** who else shares the snaps, and was his share INHERITED
  from an injury or EARNED? ⛔ A reel looks identical either way.
- **The market (check 4):** spread and implied team total from
  `grading/data/gameenv_2026.json`.
- ⛔ **Rosters and leagues never enter this repo** — pass the roster file by PATH
  from the private repo.

## 5 · Output

⛔⛔ **THE FIRST LINE IS ALWAYS THE LINK TO THE VIDEO THAT WAS READ** — his
instruction, Sep 23 2026: *"always provide me the link to the video we finalize
on every time... so i can watch the video myself as well."* Full URL, title,
channel, upload date and length, so he can check the read against the tape:

```
FILM: <title> · <channel> · uploaded <date> · <length>
https://www.youtube.com/watch?v=<ID>
```

Then a short read of the tape, the room table, then:

```
CALL: <add / hold / pass / start / sit>, <confidence>.
WATCH: <the one input that would change it>.
```

State the sample honestly: one game, the resolution, and which kind of reel it
was.
