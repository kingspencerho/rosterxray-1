import React, { useState, useMemo } from 'react';

// ============ DATA ============

// Underdog ADP May 19 2026 - top picks for fuzzy matching
const ADP_DATA = {
  "bijan robinson": { adp: 1.5, pos: "RB", team: "ATL" },
  "jahmyr gibbs": { adp: 1.6, pos: "RB", team: "DET" },
  "jamarr chase": { adp: 3.1, pos: "WR", team: "CIN" },
  "puka nacua": { adp: 4.1, pos: "WR", team: "LAR" },
  "jaxon smith njigba": { adp: 5.2, pos: "WR", team: "SEA" },
  "jsn": { adp: 5.2, pos: "WR", team: "SEA" },
  "jonathan taylor": { adp: 6.8, pos: "RB", team: "IND" },
  "christian mccaffrey": { adp: 7.2, pos: "RB", team: "SF" },
  "cmc": { adp: 7.2, pos: "RB", team: "SF" },
  "amon ra st brown": { adp: 8.0, pos: "WR", team: "DET" },
  "arsb": { adp: 8.0, pos: "WR", team: "DET" },
  "amon-ra st brown": { adp: 8.0, pos: "WR", team: "DET" },
  "ceedee lamb": { adp: 9.3, pos: "WR", team: "DAL" },
  "justin jefferson": { adp: 9.7, pos: "WR", team: "MIN" },
  "james cook": { adp: 11.0, pos: "RB", team: "BUF" },
  "ashton jeanty": { adp: 12.0, pos: "RB", team: "LV" },
  "devon achane": { adp: 13.6, pos: "RB", team: "MIA" },
  "achane": { adp: 13.6, pos: "RB", team: "MIA" },
  "saquon barkley": { adp: 14.4, pos: "RB", team: "PHI" },
  "kenneth walker iii": { adp: 15.9, pos: "RB", team: "KC" },
  "kenneth walker": { adp: 15.9, pos: "RB", team: "KC" },
  "omarion hampton": { adp: 16.1, pos: "RB", team: "LAC" },
  "derrick henry": { adp: 17.4, pos: "RB", team: "BAL" },
  "chase brown": { adp: 18.3, pos: "RB", team: "CIN" },
  "rashee rice": { adp: 19.0, pos: "WR", team: "KC" },
  "drake london": { adp: 19.7, pos: "WR", team: "ATL" },
  "brock bowers": { adp: 21.3, pos: "TE", team: "LV" },
  "jeremiyah love": { adp: 22.9, pos: "RB", team: "ARI" },
  "malik nabers": { adp: 22.9, pos: "WR", team: "NYG" },
  "trey mcbride": { adp: 24.4, pos: "TE", team: "ARI" },
  "george pickens": { adp: 25.3, pos: "WR", team: "DAL" },
  "nico collins": { adp: 25.8, pos: "WR", team: "HOU" },
  "josh jacobs": { adp: 26.5, pos: "RB", team: "GB" },
  "aj brown": { adp: 27.5, pos: "WR", team: "NE" },
  "josh allen": { adp: 30.2, pos: "QB", team: "BUF" },
  "breece hall": { adp: 30.3, pos: "RB", team: "NYJ" },
  "travis etienne jr": { adp: 31.2, pos: "RB", team: "NO" },
  "travis etienne": { adp: 31.2, pos: "RB", team: "NO" },
  "devonta smith": { adp: 32.2, pos: "WR", team: "PHI" },
  "chris olave": { adp: 32.7, pos: "WR", team: "NO" },
  "kyren williams": { adp: 34.2, pos: "RB", team: "LAR" },
  "tee higgins": { adp: 35.6, pos: "WR", team: "CIN" },
  "tetairoa mcmillan": { adp: 35.7, pos: "WR", team: "CAR" },
  "javonte williams": { adp: 36.6, pos: "RB", team: "DAL" },
  "zay flowers": { adp: 38.2, pos: "WR", team: "BAL" },
  "garrett wilson": { adp: 38.3, pos: "WR", team: "NYJ" },
  "emeka egbuka": { adp: 39.9, pos: "WR", team: "TB" },
  "ladd mcconkey": { adp: 40.5, pos: "WR", team: "LAC" },
  "luther burden": { adp: 42.5, pos: "WR", team: "CHI" },
  "bucky irving": { adp: 45.0, pos: "RB", team: "TB" },
  "mike evans": { adp: 45.3, pos: "WR", team: "SF" },
  "colston loveland": { adp: 46.6, pos: "TE", team: "CHI" },
  "cam skattebo": { adp: 46.8, pos: "RB", team: "NYG" },
  "treveyon henderson": { adp: 47.3, pos: "RB", team: "NE" },
  "jameson williams": { adp: 48.2, pos: "WR", team: "DET" },
  "david montgomery": { adp: 49.2, pos: "RB", team: "HOU" },
  "jaylen waddle": { adp: 49.9, pos: "WR", team: "DEN" },
  "terry mclaurin": { adp: 50.5, pos: "WR", team: "WAS" },
  "davante adams": { adp: 50.9, pos: "WR", team: "LAR" },
  "dj moore": { adp: 53.0, pos: "WR", team: "BUF" },
  "dandre swift": { adp: 53.6, pos: "RB", team: "CHI" },
  "lamar jackson": { adp: 54.3, pos: "QB", team: "BAL" },
  "quinshon judkins": { adp: 56.0, pos: "RB", team: "CLE" },
  "rome odunze": { adp: 56.4, pos: "WR", team: "CHI" },
  "jadarian price": { adp: 58.2, pos: "RB", team: "SEA" },
  "christian watson": { adp: 59.3, pos: "WR", team: "GB" },
  "bhayshul tuten": { adp: 60.7, pos: "RB", team: "JAX" },
  "tuten": { adp: 60.7, pos: "RB", team: "JAX" },
  "carnell tate": { adp: 60.7, pos: "WR", team: "TEN" },
  "jordyn tyson": { adp: 62.5, pos: "WR", team: "NO" },
  "joe burrow": { adp: 63.5, pos: "QB", team: "CIN" },
  "brian thomas": { adp: 64.8, pos: "WR", team: "JAX" },
  "jayden daniels": { adp: 65.6, pos: "QB", team: "WAS" },
  "tyler warren": { adp: 66.7, pos: "TE", team: "IND" },
  "marvin harrison": { adp: 67.4, pos: "WR", team: "ARI" },
  "chuba hubbard": { adp: 68.6, pos: "RB", team: "CAR" },
  "jalen hurts": { adp: 69.1, pos: "QB", team: "PHI" },
  "caleb williams": { adp: 70.3, pos: "QB", team: "CHI" },
  "drake maye": { adp: 70.9, pos: "QB", team: "NE" },
  "alec pierce": { adp: 71.5, pos: "WR", team: "IND" },
  "makai lemon": { adp: 72.5, pos: "WR", team: "PHI" },
  "rhamondre stevenson": { adp: 74.9, pos: "RB", team: "NE" },
  "parker washington": { adp: 75.4, pos: "WR", team: "JAX" },
  "dk metcalf": { adp: 76.5, pos: "WR", team: "PIT" },
  "tony pollard": { adp: 76.9, pos: "RB", team: "TEN" },
  "dak prescott": { adp: 78.1, pos: "QB", team: "DAL" },
  "tucker kraft": { adp: 80.5, pos: "TE", team: "GB" },
  "jaylen warren": { adp: 80.7, pos: "RB", team: "PIT" },
  "courtland sutton": { adp: 81.2, pos: "WR", team: "DEN" },
  "jayden reed": { adp: 82.4, pos: "WR", team: "GB" },
  "justin herbert": { adp: 83.7, pos: "QB", team: "LAC" },
  "rj harvey": { adp: 84.4, pos: "RB", team: "DEN" },
  "jordan addison": { adp: 85.6, pos: "WR", team: "MIN" },
  "trevor lawrence": { adp: 86.4, pos: "QB", team: "JAX" },
  "michael wilson": { adp: 87.6, pos: "WR", team: "ARI" },
  "chris godwin": { adp: 88.7, pos: "WR", team: "TB" },
  "kyle monangai": { adp: 90.0, pos: "RB", team: "CHI" },
  "rico dowdle": { adp: 90.5, pos: "RB", team: "PIT" },
  "jaxson dart": { adp: 90.7, pos: "QB", team: "NYG" },
  "harold fannin": { adp: 91.9, pos: "TE", team: "CLE" },
  "patrick mahomes": { adp: 92.2, pos: "QB", team: "KC" },
  "quentin johnston": { adp: 94.2, pos: "WR", team: "LAC" },
  "jakobi meyers": { adp: 95.9, pos: "WR", team: "JAX" },
  "blake corum": { adp: 96.4, pos: "RB", team: "LAR" },
  "brock purdy": { adp: 97.4, pos: "QB", team: "SF" },
  "sam laporta": { adp: 97.8, pos: "TE", team: "DET" },
  "josh downs": { adp: 99.3, pos: "WR", team: "IND" },
  "bo nix": { adp: 100.6, pos: "QB", team: "DEN" },
  "ricky pearsall": { adp: 101.7, pos: "WR", team: "SF" },
  "jk dobbins": { adp: 103.3, pos: "RB", team: "DEN" },
  "kyle pitts": { adp: 103.4, pos: "TE", team: "ATL" },
  "matthew stafford": { adp: 103.9, pos: "QB", team: "LAR" },
  "jared goff": { adp: 104.4, pos: "QB", team: "DET" },
  "matthew golden": { adp: 106.1, pos: "WR", team: "GB" },
  "kyler murray": { adp: 106.3, pos: "QB", team: "MIN" },
  "jordan love": { adp: 107.8, pos: "QB", team: "GB" },
  "michael pittman jr": { adp: 108.3, pos: "WR", team: "PIT" },
  "michael pittman": { adp: 108.3, pos: "WR", team: "PIT" },
  "xavier worthy": { adp: 110.0, pos: "WR", team: "KC" },
  "chris rodriguez": { adp: 110.9, pos: "RB", team: "JAX" },
  "tyler shough": { adp: 112.5, pos: "QB", team: "NO" },
  "romeo doubs": { adp: 113.4, pos: "WR", team: "NE" },
  "jacory croskey merritt": { adp: 114.1, pos: "RB", team: "WAS" },
  "kc concepcion": { adp: 114.8, pos: "WR", team: "CLE" },
  "baker mayfield": { adp: 115.7, pos: "QB", team: "TB" },
  "george kittle": { adp: 116.7, pos: "TE", team: "SF" },
  "wandale robinson": { adp: 117.4, pos: "WR", team: "TEN" },
  "kenneth gainwell": { adp: 117.6, pos: "RB", team: "TB" },
  "aaron jones": { adp: 120.0, pos: "RB", team: "MIN" },
  "jordan mason": { adp: 121.9, pos: "RB", team: "MIN" },
  "rachaad white": { adp: 122.9, pos: "RB", team: "WAS" },
  "jayden higgins": { adp: 123.9, pos: "WR", team: "HOU" },
  "jake ferguson": { adp: 124.3, pos: "TE", team: "DAL" },
  "travis kelce": { adp: 124.3, pos: "TE", team: "KC" },
  "jonathon brooks": { adp: 124.8, pos: "RB", team: "CAR" },
  "khalil shakir": { adp: 127.0, pos: "WR", team: "BUF" },
  "mark andrews": { adp: 127.3, pos: "TE", team: "BAL" },
  "tyrone tracy": { adp: 130.3, pos: "RB", team: "NYG" },
  "dalton kincaid": { adp: 131.3, pos: "TE", team: "BUF" },
  "malik willis": { adp: 131.7, pos: "QB", team: "MIA" },
  "jalen coker": { adp: 131.9, pos: "WR", team: "CAR" },
  "isaiah likely": { adp: 133.3, pos: "TE", team: "NYG" },
  "dallas goedert": { adp: 135.3, pos: "TE", team: "PHI" },
  "rashid shaheed": { adp: 136.8, pos: "WR", team: "SEA" },
  "oronde gadsden": { adp: 137.0, pos: "TE", team: "LAC" },
  "sam darnold": { adp: 137.4, pos: "QB", team: "SEA" },
  "cam ward": { adp: 138.4, pos: "QB", team: "TEN" },
  "omar cooper": { adp: 139.9, pos: "WR", team: "NYJ" },
  "stefon diggs": { adp: 141.1, pos: "WR", team: "FA" },
  "cj stroud": { adp: 141.4, pos: "QB", team: "HOU" },
  "jonah coleman": { adp: 141.8, pos: "RB", team: "DEN" },
  "travis hunter": { adp: 142.0, pos: "WR", team: "JAX" },
  "jalen mcmillan": { adp: 144.5, pos: "WR", team: "TB" },
  "keaton mitchell": { adp: 145.0, pos: "RB", team: "LAC" },
  "daniel jones": { adp: 146.2, pos: "QB", team: "IND" },
  "jauan jennings": { adp: 146.9, pos: "WR", team: "MIN" },
  "kenyon sadiq": { adp: 147.7, pos: "TE", team: "NYJ" },
  "woody marks": { adp: 149.0, pos: "RB", team: "HOU" },
  "hunter henry": { adp: 150.2, pos: "TE", team: "NE" },
  "isiah pacheco": { adp: 150.6, pos: "RB", team: "DET" },
  "brenton strange": { adp: 153.0, pos: "TE", team: "JAX" },
  "chig okonkwo": { adp: 153.2, pos: "TE", team: "WAS" },
  "bryce young": { adp: 153.9, pos: "QB", team: "CAR" },
  "juwan johnson": { adp: 155.5, pos: "TE", team: "NO" },
  "jalen nailor": { adp: 156.7, pos: "WR", team: "LV" },
  "tre tucker": { adp: 157.3, pos: "WR", team: "LV" },
  "zach charbonnet": { adp: 157.8, pos: "RB", team: "SEA" },
  "tyler allgeier": { adp: 159.2, pos: "RB", team: "ARI" },
  "antonio williams": { adp: 160.1, pos: "WR", team: "WAS" },
  "denzel boston": { adp: 161.3, pos: "WR", team: "CLE" },
  "tyjae spears": { adp: 162.8, pos: "RB", team: "TEN" },
  "tj hockenson": { adp: 163.9, pos: "TE", team: "MIN" },
  "dezhaun stribling": { adp: 164.1, pos: "WR", team: "SF" },
  "stribling": { adp: 164.1, pos: "WR", team: "SF" },
  "brian robinson": { adp: 165.4, pos: "RB", team: "ATL" },
  "fernando mendoza": { adp: 167.2, pos: "QB", team: "LV" },
  "dylan sampson": { adp: 167.6, pos: "RB", team: "CLE" },
  "isaac teslaa": { adp: 168.9, pos: "WR", team: "DET" },
  "deebo samuel": { adp: 170.1, pos: "WR", team: "FA" },
  "aj barner": { adp: 170.3, pos: "TE", team: "SEA" },
  "dalton schultz": { adp: 171.3, pos: "TE", team: "HOU" },
  "nicholas singleton": { adp: 173.9, pos: "RB", team: "TEN" },
  "brandon aiyuk": { adp: 175.3, pos: "WR", team: "SF" },
  "calvin ridley": { adp: 175.7, pos: "WR", team: "TEN" },
  "jacoby brissett": { adp: 177.8, pos: "QB", team: "ARI" },
  "tank bigsby": { adp: 178.4, pos: "RB", team: "PHI" },
  "geno smith": { adp: 178.9, pos: "QB", team: "NYJ" },
  "jerry jeudy": { adp: 179.9, pos: "WR", team: "CLE" },
  "gunnar helm": { adp: 181.2, pos: "TE", team: "TEN" },
  "alvin kamara": { adp: 181.2, pos: "RB", team: "NO" },
  "germie bernard": { adp: 182.5, pos: "WR", team: "PIT" },
  "emmett johnson": { adp: 183.0, pos: "RB", team: "KC" },
  "ryan flournoy": { adp: 183.1, pos: "WR", team: "DAL" },
  "mike washington": { adp: 184.2, pos: "RB", team: "LV" },
  "cade otton": { adp: 185.4, pos: "TE", team: "TB" },
  "tre harris": { adp: 185.4, pos: "WR", team: "LAC" },
  "aaron rodgers": { adp: 187.5, pos: "QB", team: "PIT" },
  "chris bell": { adp: 188.5, pos: "WR", team: "MIA" },
  "kaytron allen": { adp: 189.7, pos: "RB", team: "WAS" },
  "david njoku": { adp: 190.3, pos: "TE", team: "LAC" },
  "emanuel wilson": { adp: 192.4, pos: "RB", team: "SEA" },
  "ted hurst": { adp: 193.1, pos: "WR", team: "TB" },
  "eli stowers": { adp: 193.5, pos: "TE", team: "PHI" },
  "pat freiermuth": { adp: 194.7, pos: "TE", team: "PIT" },
  "tyreek hill": { adp: 195.7, pos: "WR", team: "FA" },
  "tank dell": { adp: 196.7, pos: "WR", team: "HOU" },
  "zachariah branch": { adp: 198.0, pos: "WR", team: "ATL" },
  "darnell mooney": { adp: 198.7, pos: "WR", team: "NYG" },
  "kayshon boutte": { adp: 200.1, pos: "WR", team: "NE" },
  "sean tucker": { adp: 200.1, pos: "RB", team: "TB" },
  "braelon allen": { adp: 200.7, pos: "RB", team: "NYJ" },
  "ray davis": { adp: 203.1, pos: "RB", team: "BUF" },
  "malik washington": { adp: 203.2, pos: "WR", team: "MIA" },
  "terrance ferguson": { adp: 205.4, pos: "TE", team: "LAR" },
  "kaelon black": { adp: 206.4, pos: "RB", team: "SF" },
  "mike gesicki": { adp: 207.8, pos: "TE", team: "CIN" },
  "dontayvion wicks": { adp: 208.0, pos: "WR", team: "PHI" },
  "cooper kupp": { adp: 208.3, pos: "WR", team: "SEA" },
  "tua tagovailoa": { adp: 208.4, pos: "QB", team: "ATL" },
  "elijah sarratt": { adp: 208.6, pos: "WR", team: "BAL" },
  "greg dulcich": { adp: 209.9, pos: "TE", team: "MIA" },
  "malachi fields": { adp: 210.0, pos: "WR", team: "NYG" },
  "troy franklin": { adp: 210.1, pos: "WR", team: "DEN" },
  "tory horton": { adp: 210.9, pos: "WR", team: "SEA" },
  "adonai mitchell": { adp: 210.9, pos: "WR", team: "NYJ" },
  "kimani vidal": { adp: 212.1, pos: "RB", team: "LAC" },
  "jake tonges": { adp: 212.3, pos: "TE", team: "SF" },
  "demond claiborne": { adp: 212.6, pos: "RB", team: "MIN" },
  "chris brazzell": { adp: 213.0, pos: "WR", team: "CAR" },
  "deshaun watson": { adp: 213.0, pos: "QB", team: "CLE" },
  "michael penix": { adp: 213.3, pos: "QB", team: "ATL" },
  "pat bryant": { adp: 213.6, pos: "WR", team: "DEN" },
  "skyler bell": { adp: 213.6, pos: "WR", team: "BUF" },
  "christian kirk": { adp: 213.7, pos: "WR", team: "SF" },
  "james conner": { adp: 213.9, pos: "RB", team: "ARI" },
  "colby parkinson": { adp: 214.1, pos: "TE", team: "LAR" },
  "rashod bateman": { adp: 214.3, pos: "WR", team: "BAL" },
  "justice hill": { adp: 214.5, pos: "RB", team: "BAL" },
  "shedeur sanders": { adp: 214.6, pos: "QB", team: "CLE" },
  "jaydon blue": { adp: 214.7, pos: "RB", team: "DAL" },
  "jakobi lane": { adp: 214.7, pos: "WR", team: "BAL" },
  "jack bech": { adp: 214.8, pos: "WR", team: "LV" },
  "keon coleman": { adp: 214.8, pos: "WR", team: "BUF" },
  "evan engram": { adp: 214.9, pos: "TE", team: "DEN" },
  "jordan james": { adp: 215.0, pos: "RB", team: "SF" },
  "jaylin noel": { adp: 215.0, pos: "WR", team: "HOU" },
  "caleb douglas": { adp: 215.0, pos: "WR", team: "MIA" },
  "tyquan thornton": { adp: 215.1, pos: "WR", team: "KC" },
  "kirk cousins": { adp: 215.2, pos: "QB", team: "LV" },
  "brenen thompson": { adp: 215.3, pos: "WR", team: "LAC" },
  "adam randall": { adp: 215.3, pos: "RB", team: "BAL" },
  "carson beck": { adp: 215.3, pos: "QB", team: "ARI" },
  "theo johnson": { adp: 215.4, pos: "TE", team: "NYG" },
  "andrei iosivas": { adp: 215.4, pos: "WR", team: "CIN" },
  "dj giddens": { adp: 215.4, pos: "RB", team: "IND" },
  "zavion thomas": { adp: 215.4, pos: "WR", team: "CHI" },
  "marshawn lloyd": { adp: 215.5, pos: "RB", team: "GB" },
  "devaughn vele": { adp: 215.5, pos: "WR", team: "NO" },
  "oscar delp": { adp: 215.5, pos: "TE", team: "NO" },
  "michael mayer": { adp: 215.5, pos: "TE", team: "LV" },
};


// 4for4 Superflex ADP (12-team) — overall pick numbers
const ADP_SUPERFLEX = {
  "josh allen": { adp: 1, pos: "QB", team: "BUF" },
  "jahmyr gibbs": { adp: 2, pos: "RB", team: "DET" },
  "bijan robinson": { adp: 3, pos: "RB", team: "ATL" },
  "ja'marr chase": { adp: 4, pos: "WR", team: "CIN" },
  "jamarr chase": { adp: 4, pos: "WR", team: "CIN" },
  "puka nacua": { adp: 5, pos: "WR", team: "LAR" },
  "lamar jackson": { adp: 6, pos: "QB", team: "BAL" },
  "jaxon smith-njigba": { adp: 7, pos: "WR", team: "SEA" },
  "jsn": { adp: 7, pos: "WR", team: "SEA" },
  "christian mccaffrey": { adp: 8, pos: "RB", team: "SF" },
  "cmc": { adp: 8, pos: "RB", team: "SF" },
  "drake maye": { adp: 9, pos: "QB", team: "NE" },
  "jonathan taylor": { adp: 10, pos: "RB", team: "IND" },
  "jayden daniels": { adp: 11, pos: "QB", team: "WAS" },
  "joe burrow": { adp: 12, pos: "QB", team: "CIN" },
  "brock bowers": { adp: 13, pos: "TE", team: "LV" },
  "amon-ra st. brown": { adp: 14, pos: "WR", team: "DET" },
  "amon ra st brown": { adp: 14, pos: "WR", team: "DET" },
  "arsb": { adp: 14, pos: "WR", team: "DET" },
  "trey mcbride": { adp: 15, pos: "TE", team: "ARI" },
  "ashton jeanty": { adp: 16, pos: "RB", team: "LV" },
  "james cook": { adp: 17, pos: "RB", team: "BUF" },
  "jalen hurts": { adp: 18, pos: "QB", team: "PHI" },
  "de'von achane": { adp: 19, pos: "RB", team: "MIA" },
  "devon achane": { adp: 19, pos: "RB", team: "MIA" },
  "achane": { adp: 19, pos: "RB", team: "MIA" },
  "ceedee lamb": { adp: 20, pos: "WR", team: "DAL" },
  "justin jefferson": { adp: 21, pos: "WR", team: "MIN" },
  "caleb williams": { adp: 22, pos: "QB", team: "CHI" },
  "omarion hampton": { adp: 23, pos: "RB", team: "LAC" },
  "justin herbert": { adp: 24, pos: "QB", team: "LAC" },
  "jaxson dart": { adp: 25, pos: "QB", team: "NYG" },
  "saquon barkley": { adp: 26, pos: "RB", team: "PHI" },
  "chase brown": { adp: 27, pos: "RB", team: "CIN" },
  "trevor lawrence": { adp: 28, pos: "QB", team: "JAX" },
  "dak prescott": { adp: 29, pos: "QB", team: "DAL" },
  "kenneth walker": { adp: 30, pos: "RB", team: "SEA" },
  "jeremiyah love": { adp: 31, pos: "RB", team: "ARI" },
  "drake london": { adp: 32, pos: "WR", team: "ATL" },
  "brock purdy": { adp: 33, pos: "QB", team: "SF" },
  "rashee rice": { adp: 34, pos: "WR", team: "KC" },
  "patrick mahomes": { adp: 35, pos: "QB", team: "KC" },
  "derrick henry": { adp: 36, pos: "RB", team: "BAL" },
  "colston loveland": { adp: 37, pos: "TE", team: "CHI" },
  "malik nabers": { adp: 38, pos: "WR", team: "NYG" },
  "matthew stafford": { adp: 39, pos: "QB", team: "LAR" },
  "bo nix": { adp: 40, pos: "QB", team: "DEN" },
  "josh jacobs": { adp: 41, pos: "RB", team: "GB" },
  "nico collins": { adp: 42, pos: "WR", team: "HOU" },
  "jared goff": { adp: 43, pos: "QB", team: "DET" },
  "breece hall": { adp: 44, pos: "RB", team: "NYJ" },
  "kyler murray": { adp: 45, pos: "QB", team: "MIN" },
  "george pickens": { adp: 46, pos: "WR", team: "DAL" },
  "chris olave": { adp: 47, pos: "WR", team: "NO" },
  "tyler shough": { adp: 48, pos: "QB", team: "NO" },
  "kyren williams": { adp: 49, pos: "RB", team: "LAR" },
  "baker mayfield": { adp: 50, pos: "QB", team: "TB" },
  "aj brown": { adp: 51, pos: "WR", team: "NE" },
  "a.j. brown": { adp: 51, pos: "WR", team: "NE" },
  "travis etienne": { adp: 52, pos: "RB", team: "JAX" },
  "jordan love": { adp: 53, pos: "QB", team: "GB" },
  "tyler warren": { adp: 54, pos: "TE", team: "IND" },
  "javonte williams": { adp: 55, pos: "RB", team: "DAL" },
  "cam skattebo": { adp: 56, pos: "RB", team: "NYG" },
  "tetairoa mcmillan": { adp: 57, pos: "WR", team: "CAR" },
  "devonta smith": { adp: 58, pos: "WR", team: "PHI" },
  "malik willis": { adp: 59, pos: "QB", team: "MIA" },
  "quinshon judkins": { adp: 60, pos: "RB", team: "CLE" },
  "bucky irving": { adp: 61, pos: "RB", team: "TB" },
  "garrett wilson": { adp: 62, pos: "WR", team: "NYJ" },
  "tee higgins": { adp: 63, pos: "WR", team: "CIN" },
  "sam darnold": { adp: 64, pos: "QB", team: "SEA" },
  "zay flowers": { adp: 65, pos: "WR", team: "BAL" },
  "cj stroud": { adp: 66, pos: "QB", team: "HOU" },
  "c.j. stroud": { adp: 66, pos: "QB", team: "HOU" },
  "david montgomery": { adp: 67, pos: "RB", team: "HOU" },
  "daniel jones": { adp: 68, pos: "QB", team: "IND" },
  "emeka egbuka": { adp: 69, pos: "WR", team: "TB" },
  "treveyon henderson": { adp: 70, pos: "RB", team: "NE" },
  "harold fannin": { adp: 71, pos: "TE", team: "CLE" },
  "cam ward": { adp: 72, pos: "QB", team: "TEN" },
  "dandre swift": { adp: 73, pos: "RB", team: "CHI" },
  "d'andre swift": { adp: 73, pos: "RB", team: "CHI" },
  "ladd mcconkey": { adp: 74, pos: "WR", team: "LAC" },
  "tucker kraft": { adp: 75, pos: "TE", team: "GB" },
  "luther burden": { adp: 76, pos: "WR", team: "CHI" },
  "bhayshul tuten": { adp: 77, pos: "RB", team: "JAX" },
  "bryce young": { adp: 78, pos: "QB", team: "CAR" },
  "jaylen waddle": { adp: 79, pos: "WR", team: "MIA" },
  "davante adams": { adp: 80, pos: "WR", team: "LAR" },
  "kyle pitts": { adp: 81, pos: "TE", team: "ATL" },
  "jadarian price": { adp: 82, pos: "RB", team: "SEA" },
  "dj moore": { adp: 83, pos: "WR", team: "BUF" },
  "d.j. moore": { adp: 83, pos: "WR", team: "BUF" },
  "sam laporta": { adp: 84, pos: "TE", team: "DET" },
  "chuba hubbard": { adp: 85, pos: "RB", team: "CAR" },
  "terry mclaurin": { adp: 86, pos: "WR", team: "WAS" },
  "jameson williams": { adp: 87, pos: "WR", team: "DET" },
  "rome odunze": { adp: 88, pos: "WR", team: "CHI" },
  "mike evans": { adp: 89, pos: "WR", team: "SF" },
  "jacoby brissett": { adp: 90, pos: "QB", team: "ARI" },
  "christian watson": { adp: 91, pos: "WR", team: "GB" },
  "carnell tate": { adp: 92, pos: "WR", team: "TEN" },
  "fernando mendoza": { adp: 93, pos: "QB", team: "LV" },
  "rj harvey": { adp: 94, pos: "RB", team: "DEN" },
  "jaylen warren": { adp: 95, pos: "RB", team: "PIT" },
  "geno smith": { adp: 96, pos: "QB", team: "NYJ" },
  "travis kelce": { adp: 97, pos: "TE", team: "KC" },
  "george kittle": { adp: 98, pos: "TE", team: "SF" },
  "rhamondre stevenson": { adp: 99, pos: "RB", team: "NE" },
  "alec pierce": { adp: 100, pos: "WR", team: "IND" },
  "marvin harrison": { adp: 101, pos: "WR", team: "ARI" },
  "mhj": { adp: 101, pos: "WR", team: "ARI" },
  "jordyn tyson": { adp: 102, pos: "WR", team: "NO" },
  "jake ferguson": { adp: 103, pos: "TE", team: "DAL" },
  "tony pollard": { adp: 104, pos: "RB", team: "TEN" },
  "rico dowdle": { adp: 105, pos: "RB", team: "PIT" },
  "courtland sutton": { adp: 106, pos: "WR", team: "DEN" },
  "kyle monangai": { adp: 107, pos: "RB", team: "CHI" },
  "aaron rodgers": { adp: 108, pos: "QB", team: "PIT" },
  "dalton kincaid": { adp: 109, pos: "TE", team: "BUF" },
  "brian thomas": { adp: 110, pos: "WR", team: "JAX" },
  "btj": { adp: 110, pos: "WR", team: "JAX" },
  "kenneth gainwell": { adp: 111, pos: "RB", team: "TB" },
  "michael wilson": { adp: 112, pos: "WR", team: "ARI" },
  "dallas goedert": { adp: 113, pos: "TE", team: "PHI" },
  "dk metcalf": { adp: 114, pos: "WR", team: "PIT" },
  "isaiah likely": { adp: 115, pos: "TE", team: "BAL" },
  "jk dobbins": { adp: 116, pos: "RB", team: "DEN" },
  "j.k. dobbins": { adp: 116, pos: "RB", team: "DEN" },
  "parker washington": { adp: 117, pos: "WR", team: "JAX" },
  "mark andrews": { adp: 118, pos: "TE", team: "BAL" },
  "blake corum": { adp: 119, pos: "RB", team: "LAR" },
  "oronde gadsden": { adp: 120, pos: "TE", team: "LAC" },
  "makai lemon": { adp: 121, pos: "WR", team: "PHI" },
  "chris godwin": { adp: 122, pos: "WR", team: "TB" },
  "aaron jones": { adp: 123, pos: "RB", team: "MIN" },
  "jonathon brooks": { adp: 124, pos: "RB", team: "CAR" },
  "rachaad white": { adp: 125, pos: "RB", team: "WAS" },
  "jakobi meyers": { adp: 126, pos: "WR", team: "JAX" },
  "tua tagovailoa": { adp: 127, pos: "QB", team: "ATL" },
  "juwan johnson": { adp: 128, pos: "TE", team: "NO" },
  "kenyon sadiq": { adp: 129, pos: "TE", team: "NYJ" },
  "jordan addison": { adp: 130, pos: "WR", team: "MIN" },
  "michael pittman": { adp: 131, pos: "WR", team: "PIT" },
  "jacory croskey-merritt": { adp: 132, pos: "RB", team: "WAS" },
  "brenton strange": { adp: 133, pos: "TE", team: "JAX" },
  "jordan mason": { adp: 134, pos: "RB", team: "MIN" },
  "jayden reed": { adp: 135, pos: "WR", team: "GB" },
  "wandale robinson": { adp: 136, pos: "WR", team: "TEN" },
  "wan'dale robinson": { adp: 136, pos: "WR", team: "TEN" },
  "ricky pearsall": { adp: 137, pos: "WR", team: "SF" },
  "chig okonkwo": { adp: 138, pos: "TE", team: "WAS" },
  "josh downs": { adp: 139, pos: "WR", team: "IND" },
  "quentin johnston": { adp: 140, pos: "WR", team: "LAC" },
  "chris rodriguez": { adp: 141, pos: "RB", team: "JAX" },
  "deshaun watson": { adp: 142, pos: "QB", team: "CLE" },
  "zach charbonnet": { adp: 143, pos: "RB", team: "SEA" },
  "hunter henry": { adp: 144, pos: "TE", team: "NE" },
  "kc concepcion": { adp: 145, pos: "WR", team: "CLE" },
  "xavier worthy": { adp: 146, pos: "WR", team: "KC" },
  "romeo doubs": { adp: 147, pos: "WR", team: "NE" },
  "tj hockenson": { adp: 148, pos: "TE", team: "MIN" },
  "t.j. hockenson": { adp: 148, pos: "TE", team: "MIN" },
  "michael penix": { adp: 149, pos: "QB", team: "ATL" },
  "tyrone tracy": { adp: 150, pos: "RB", team: "NYG" },
  "khalil shakir": { adp: 151, pos: "WR", team: "BUF" },
  "matthew golden": { adp: 152, pos: "WR", team: "GB" },
  "woody marks": { adp: 153, pos: "RB", team: "HOU" },
  "jonah coleman": { adp: 154, pos: "RB", team: "DEN" },
  "tyler allgeier": { adp: 155, pos: "RB", team: "ARI" },
  "dalton schultz": { adp: 156, pos: "TE", team: "HOU" },
  "jayden higgins": { adp: 157, pos: "WR", team: "HOU" },
  "tyjae spears": { adp: 158, pos: "RB", team: "TEN" },
  "jalen coker": { adp: 159, pos: "WR", team: "CAR" },
  "isiah pacheco": { adp: 160, pos: "RB", team: "DET" },
  "stefon diggs": { adp: 161, pos: "WR", team: "NE" },
  "dylan sampson": { adp: 162, pos: "RB", team: "CLE" },
  "aj barner": { adp: 163, pos: "TE", team: "SEA" },
  "keaton mitchell": { adp: 164, pos: "RB", team: "LAC" },
  "gunnar helm": { adp: 165, pos: "TE", team: "TEN" },
  "kirk cousins": { adp: 166, pos: "QB", team: "LV" },
  "rashid shaheed": { adp: 167, pos: "WR", team: "NO" },
  "alvin kamara": { adp: 168, pos: "RB", team: "NO" },
  "cade otton": { adp: 169, pos: "TE", team: "TB" },
  "eli stowers": { adp: 170, pos: "TE", team: "PHI" },
  "jalen mcmillan": { adp: 171, pos: "WR", team: "TB" },
  "emmett johnson": { adp: 172, pos: "RB", team: "KC" },
  "omar cooper": { adp: 173, pos: "WR", team: "NYJ" },
  "travis hunter": { adp: 174, pos: "WR", team: "JAX" },
  "shedeur sanders": { adp: 175, pos: "QB", team: "CLE" },
  "jauan jennings": { adp: 176, pos: "WR", team: "MIN" },
  "nicholas singleton": { adp: 177, pos: "RB", team: "TEN" },
  "pat freiermuth": { adp: 178, pos: "TE", team: "PIT" },
  "david njoku": { adp: 179, pos: "TE", team: "LAC" },
  "emanuel wilson": { adp: 180, pos: "RB", team: "SEA" },
  "brian robinson": { adp: 181, pos: "RB", team: "ATL" },
  "kaytron allen": { adp: 182, pos: "RB", team: "WAS" },
  "denzel boston": { adp: 183, pos: "WR", team: "CLE" },
  "deebo samuel": { adp: 184, pos: "WR", team: "WAS" },
  "terrance ferguson": { adp: 185, pos: "TE", team: "LAR" },
  "mike washington": { adp: 186, pos: "RB", team: "LV" },
  "greg dulcich": { adp: 187, pos: "TE", team: "MIA" },
  "tre tucker": { adp: 188, pos: "WR", team: "LV" },
  "braelon allen": { adp: 189, pos: "RB", team: "NYJ" },
  "jalen nailor": { adp: 190, pos: "WR", team: "LV" },
  "antonio williams": { adp: 191, pos: "WR", team: "WAS" },
  "brandon aiyuk": { adp: 192, pos: "WR", team: "SF" },
  "jerry jeudy": { adp: 193, pos: "WR", team: "CLE" },
  "tank bigsby": { adp: 194, pos: "RB", team: "PHI" },
  "justice hill": { adp: 195, pos: "RB", team: "BAL" },
  "jake tonges": { adp: 196, pos: "TE", team: "SF" },
  "chris bell": { adp: 197, pos: "WR", team: "MIA" },
  "james conner": { adp: 198, pos: "RB", team: "ARI" },
  "tank dell": { adp: 199, pos: "WR", team: "HOU" },
  "de'zhaun stribling": { adp: 200, pos: "WR", team: "SF" },
  "dezhaun stribling": { adp: 200, pos: "WR", team: "SF" },
  "stribling": { adp: 200, pos: "WR", team: "SF" },
  "isaac teslaa": { adp: 201, pos: "WR", team: "DET" },
  "mike gesicki": { adp: 202, pos: "TE", team: "CIN" },
  "kimani vidal": { adp: 203, pos: "RB", team: "LAC" },
  "evan engram": { adp: 204, pos: "TE", team: "DEN" },
  "demond claiborne": { adp: 205, pos: "RB", team: "MIN" },
  "jordan james": { adp: 206, pos: "RB", team: "SF" },
  "calvin ridley": { adp: 207, pos: "WR", team: "TEN" },
  "colby parkinson": { adp: 208, pos: "TE", team: "LAR" },
  "darnell mooney": { adp: 209, pos: "WR", team: "NYG" },
  "carson beck": { adp: 210, pos: "QB", team: "ARI" },
  "tyreek hill": { adp: 211, pos: "WR", team: "MIA" },
  "ray davis": { adp: 212, pos: "RB", team: "BUF" },
  "kaelon black": { adp: 213, pos: "RB", team: "SF" },
  "tre' harris": { adp: 214, pos: "WR", team: "LAC" },
  "ryan flournoy": { adp: 215, pos: "WR", team: "DAL" },
  "germie bernard": { adp: 216, pos: "WR", team: "PIT" },
  "kayshon boutte": { adp: 217, pos: "WR", team: "NE" },
  "sean tucker": { adp: 218, pos: "RB", team: "TB" },
  "mason taylor": { adp: 219, pos: "TE", team: "NYJ" },
  "adonai mitchell": { adp: 220, pos: "WR", team: "NYJ" },
  "ted hurst": { adp: 221, pos: "WR", team: "TB" },
  "malik washington": { adp: 222, pos: "WR", team: "MIA" },
  "theo johnson": { adp: 223, pos: "TE", team: "NYG" },
  "zachariah branch": { adp: 224, pos: "WR", team: "ATL" },
  "jaylen wright": { adp: 225, pos: "RB", team: "MIA" },
  "christian kirk": { adp: 226, pos: "WR", team: "SF" },
  "samaje perine": { adp: 227, pos: "RB", team: "CIN" },
  "justin fields": { adp: 228, pos: "QB", team: "KC" },
  "dawson knox": { adp: 229, pos: "TE", team: "BUF" },
  "keenan allen": { adp: 230, pos: "WR", team: "FA" },
  "troy franklin": { adp: 231, pos: "WR", team: "DEN" },
  "cooper kupp": { adp: 232, pos: "WR", team: "SEA" },
  "dontayvion wicks": { adp: 233, pos: "WR", team: "PHI" },
  "jack bech": { adp: 234, pos: "WR", team: "LV" },
  "malachi fields": { adp: 235, pos: "WR", team: "NYG" },
  "jaydon blue": { adp: 236, pos: "RB", team: "DAL" },
  "ollie gordon": { adp: 237, pos: "RB", team: "MIA" },
  "eli heidenreich": { adp: 287, pos: "RB", team: "PIT" },
  "heidenreich": { adp: 287, pos: "RB", team: "PIT" },
};

// Tournament configurations — week weights for grade rollup
const TOURNAMENTS = {
  main: { name: "General", entries: "4,500", weights: [1, 1, 1], note: "Balanced format · ceiling and floor both matter · no bad picks", format: "standard" },
  bbm7: { name: "BBM VII", entries: "672k", weights: [2, 1, 1], note: "W15 is everything · 1-of-14 advances · swing for the ceiling", format: "standard" },
  puppy: { name: "The Puppy", entries: "225k", weights: [1, 2, 1.5], note: "W16 is the kill shot · survive to W17 or go home", format: "standard" },
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
  "travis etienne": "Etienne signed with NO on a 2yr/$14M deal, signaling he's taken Kamara's starting role.",
  "travis etienne jr": "Etienne signed with NO on a 2yr/$14M deal, signaling he's taken Kamara's starting role.",
  "alvin kamara": "Kamara lost his starting job in NO — Etienne signed a 2yr/$14M deal and is now RB1.",
  "wandale robinson": "Robinson moved to TEN where Carnell Tate (2026 draft pick) is the clear WR1, limiting Robinson's ceiling.",
  "carnell tate": "Tate was drafted by TEN in 2026 and is projected as their WR1, ahead of Robinson on the depth chart.",
  "aj brown": "AJ Brown was traded to NE (2028 1st + 2027 5th), leaving PHI — no longer on PHI.",
  "malik nabers": "Nabers had a 2nd knee cleanup (scar tissue removal) in 2026 and Week 1 availability is uncertain.",
  "rashee rice": "Rice is serving a 30-day jail sentence and missed OTAs — availability and role for Week 1 unclear.",
  "luther burden": "Burden is trending toward the CHI WR1 starter role per 2026 camp reports.",
  "eli stowers": "Stowers won the Mackey Award in 2025; with Goedert as bridge and AJ Brown gone from PHI, his TE1 path accelerated.",
  "jonah coleman": "Coleman is DEN's top RB prospect — Payton compared him to Dobbins; Harvey inefficient (3.7 YPC) opens the door.",
  "kenneth gainwell": "Gainwell signed a 2yr/$14M deal with TB, signaling a real role — legitimate committee back alongside Bucky Irving.",
  "myles garrett": "Garrett was traded to LAR (Jared Verse + 2027 1st + picks), no longer on CLE.",
};

// Player verdicts from memory — date-stamped for freshness check
const VERDICTS = {
  "hubbard": { verdict: "fade", date: "2026-05-19", reason: "3.8 YPC, Brooks returning, classic Hubbard Trap", confidence: "HIGH" },
  "chuba hubbard": { verdict: "fade", date: "2026-05-19", reason: "3.8 YPC, Brooks returning, classic Hubbard Trap", confidence: "HIGH" },
  "rj harvey": { verdict: "fade", date: "2026-05-19", reason: "3.7 YPC, pass-pro issues, ADP rising wrong way", confidence: "HIGH" },
  "jk dobbins": { verdict: "fade", date: "2026-05-19", reason: "Two major knee surgeries, Harvey ahead", confidence: "HIGH" },
  "j.k. dobbins": { verdict: "fade", date: "2026-05-19", reason: "Two major knee surgeries, Harvey ahead", confidence: "HIGH" },
  "tony pollard": { verdict: "fade", date: "2026-05-19", reason: "31 years old, Cam Ward era TEN = pass-first", confidence: "HIGH" },
  "tyler allgeier": { verdict: "fade", date: "2026-05-19", reason: "Three-way committee, Brissett QB, 36.1% run rate", confidence: "HIGH" },
  "mike washington": { verdict: "fade", date: "2026-05-19", reason: "Combine fraud, 10 career fumbles, no tape", confidence: "MEDIUM" },
  "jaxson dart": { verdict: "TARGET", date: "2026-06-03", reason: "NYG run-heavy limits ceiling but W17 @DAL + DAL bottom-5 defense is a real spike week; late-round leverage play", confidence: "MEDIUM" },
  "ja'kobi lane": { verdict: "HARD FADE", date: "2026-05-19", reason: "BAL run-heaviest, Minter HC, WR targets suppressed", confidence: "HIGH" },
  "jakobi lane": { verdict: "HARD FADE", date: "2026-05-19", reason: "BAL run-heaviest, Minter HC, WR targets suppressed", confidence: "HIGH" },
  "lamar jackson": { verdict: "hold", date: "2026-06-04", reason: "Mixed playoff schedule — W15 @PIT tough, W17 @CIN soft; scheme uncertainty under Minter/Doyle is the real flag", confidence: "MEDIUM" },
  // Targets
  "luther burden": { verdict: "TARGET", date: "2026-05-19", reason: "2.83 YPRR rookie, 26.1% target rate, Moore vacated", confidence: "HIGH" },
  "jadarian price": { verdict: "TARGET", date: "2026-05-19", reason: "R1 capital, run-first scheme, Charbonnet ACL", confidence: "HIGH" },
  "kc concepcion": { verdict: "TARGET", date: "2026-05-19", reason: "R1 capital at R5 ADP, WR1 role, vacated targets", confidence: "HIGH" },
  "carnell tate": { verdict: "TARGET", date: "2026-05-19", reason: "R1 capital, WR1 role confirmed, refined route runner", confidence: "HIGH" },
  "kyler murray": { verdict: "TARGET", date: "2026-05-19", reason: "Top-5 QB ceiling at QB17 IF wins job. MIN W16-17 elite", confidence: "HIGH (conditional)" },
  "tyler shough": { verdict: "TARGET", date: "2026-06-03", reason: "Closed 2025 with 22+ PPG in last 3 starts, locked NO job, ADP reflects real momentum", confidence: "MEDIUM-HIGH" },
  "caleb williams": { verdict: "TARGET", date: "2026-05-19", reason: "Year 3 leap, Ben Johnson retained, best NFC stack anchor", confidence: "HIGH" },
  "brock bowers": { verdict: "TARGET", date: "2026-05-19", reason: "TE1 in easiest 3-week playoff window in league", confidence: "HIGH" },
  "harold fannin": { verdict: "TARGET", date: "2026-06-03", reason: "72/731/6 as rookie, 31% target share, Monken now HC brings same pass-heavy identity as HC", confidence: "HIGH" },
  "cam skattebo": { verdict: "TARGET", date: "2026-05-19", reason: "Workhorse profile, Harbaugh run-heavy = volume", confidence: "HIGH" },
  "kaytron allen": { verdict: "TARGET", date: "2026-06-03", reason: "Best late dart, WAS run-heavy, Quinn retained as HC", confidence: "LOTTERY" },
  "omarion hampton": { verdict: "TARGET", date: "2026-05-19", reason: "McDaniel zone-run scheme-perfect", confidence: "HIGH" },
  "jaylen warren": { verdict: "TARGET", date: "2026-06-03", reason: "RB17 in 2025, PPR-friendly, McCarthy HC brings run-heavy identity to PIT", confidence: "HIGH" },
  "eli stowers": { verdict: "TARGET (2027)", date: "2026-05-19", reason: "Buy now at ADP 195, TE1 job 2027 when Goedert gone", confidence: "MEDIUM-HIGH" },
  // 2026 role-concern fades — filtered from pivot recommendations
  "alvin kamara": { verdict: "HARD FADE", date: "2026-05-26", reason: "Etienne signed as lead back, Kamara entering twilight", confidence: "HIGH" },
  "alvin kamara": { verdict: "HARD FADE", date: "2026-05-26", reason: "Etienne signed as lead back, Kamara entering twilight", confidence: "HIGH" },
  "david montgomery": { verdict: "fade", date: "2026-05-26", reason: "HOU added competition, age concern at 28", confidence: "MEDIUM" },
  "d'andre swift": { verdict: "fade", date: "2026-05-26", reason: "Committee back in CHI, no clear bell-cow role", confidence: "MEDIUM" },
  "breece hall": { verdict: "fade", date: "2026-05-26", reason: "Contract narrative, NYJ rebuild, role uncertainty", confidence: "MEDIUM" },
  "derrick henry": { verdict: "TARGET", date: "2026-06-03", reason: "Defied age cliff every season, BAL run-heavy, W16 CLE and W17 @CIN are soft closes", confidence: "MEDIUM" },
  "stefon diggs": { verdict: "HARD FADE", date: "2026-05-26", reason: "Free agent, no team, effectively retired", confidence: "HIGH" },
  "christian mccaffrey": { verdict: "hold", date: "2026-06-04", reason: "Elite talent but injury fragility is a real ADP risk at this price", confidence: "MEDIUM" },
  "cmc": { verdict: "hold", date: "2026-06-04", reason: "Elite talent but injury fragility is a real ADP risk at this price", confidence: "MEDIUM" },
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
// riskFlags: creeping_committee | injury_history | ol_dependency | contract_year | qb_uncertainty
// roleCeiling: slot_only | rz_dependent
//   slot_only    → sub-7 aDOT WR; high target share but no downfield or red zone role; hard TD ceiling cap
//   rz_dependent → player value almost entirely TD-driven; near-zero floor if not scoring
const SITUATIONS = {
  "bijan robinson": { verdict: "TARGET", trend: "stable", trendNote: "Locked bell-cow, zero backfield competition", situationFlags: ["scheme_fit"], riskFlags: [] },
  "jahmyr gibbs": { verdict: "TARGET", trend: "stable", trendNote: "Co-lead with Montgomery but target share is elite", situationFlags: ["scheme_fit"], riskFlags: [] },
  "saquon barkley": { verdict: "TARGET", trend: "stable", trendNote: "Workhorse with AJ Brown gone — even more targets now", situationFlags: ["target_vacuum"], riskFlags: [] },
  "james cook": { verdict: "TARGET", trend: "stable", trendNote: "Bellcow in top-5 offense, no real competition", situationFlags: ["scheme_fit"], riskFlags: [] },
  "ashton jeanty": { verdict: "TARGET", trend: "rising", trendNote: "Early camp reports: workhorse usage from Day 1", situationFlags: ["breakout_profile"], riskFlags: [] },
  "devon achane": { verdict: "TARGET", trend: "stable", trendNote: "Elite pass-catcher in MIA offense, locked role — new staff inherits a featured weapon", situationFlags: ["scheme_fit"], riskFlags: [] },
  "omarion hampton": { verdict: "TARGET", trend: "rising", trendNote: "McDaniel zone-run fit is elite — scheme match grade A+", situationFlags: ["scheme_fit", "breakout_profile"], riskFlags: [] },
  "cam skattebo": { verdict: "TARGET", trend: "stable", trendNote: "Harbaugh run-heavy, Skattebo has workhorse ceiling", situationFlags: ["scheme_fit"], riskFlags: [] },
  "jadarian price": { verdict: "TARGET", trend: "rising", trendNote: "R1 capital, Charbonnet ACL, run-first SEA scheme", situationFlags: ["breakout_profile", "scheme_fit"], riskFlags: [] },
  "kaytron allen": { verdict: "TARGET", trend: "stable", trendNote: "WAS run-heavy under Quinn, new OC Blough — scheme continuity intact, lottery at ADP", situationFlags: ["scheme_fit"], riskFlags: [] },
  "jaylen warren": { verdict: "TARGET", trend: "stable", trendNote: "PPR-friendly role, McCarthy now HC at PIT — run-heavy system suits Warren's receiving back profile", situationFlags: ["scheme_fit"], riskFlags: [] },
  "travis etienne": { verdict: "TARGET", trend: "stable", trendNote: "New team NO, signed as lead back — fresh situation", situationFlags: ["committee_breaker"], riskFlags: [] },
  "brock bowers": { verdict: "TARGET", trend: "stable", trendNote: "TE1 in league's easiest playoff window", situationFlags: ["target_vacuum"], riskFlags: [] },
  "harold fannin": { verdict: "TARGET", trend: "stable", trendNote: "72/731/6 as rookie, 31% target share, elite floor", situationFlags: ["target_vacuum"], riskFlags: [] },
  "trey mcbride": { verdict: "TARGET", trend: "stable", trendNote: "Locked TE1 with elite target share in ARI air attack", situationFlags: ["target_vacuum"], riskFlags: [] },
  "caleb williams": { verdict: "TARGET", trend: "rising", trendNote: "Year 3 leap expected, Ben Johnson retained, CHI stack anchor", situationFlags: ["breakout_profile"], riskFlags: [] },
  "carnell tate": { verdict: "TARGET", trend: "stable", trendNote: "R1 capital, WR1 role confirmed in TEN offense", situationFlags: ["breakout_profile"], riskFlags: [] },
  "kc concepcion": { verdict: "TARGET", trend: "stable", trendNote: "R1 pick at WR5 ADP, vacated CLE target tree is massive", situationFlags: ["target_vacuum", "breakout_profile"], riskFlags: [] },
  "jadarian price": { verdict: "TARGET", trend: "rising", trendNote: "R1 capital + Charbonnet ACL = path to workhorse snaps", situationFlags: ["committee_breaker", "breakout_profile"], riskFlags: [] },
  "luther burden": { verdict: "TARGET", trend: "rising", trendNote: "Camp reports trending toward WR1 starter role in CHI", situationFlags: ["breakout_profile", "target_vacuum"], riskFlags: [] },
  "eli stowers": { verdict: "TARGET", trend: "stable", trendNote: "AJ Brown to NE strengthens PHI TE target share — buy window open", situationFlags: ["target_vacuum"], riskFlags: [] },
  "jonah coleman": { verdict: "TARGET", trend: "rising", trendNote: "Camp reports trending toward every-down role as Harvey struggles in pass pro", situationFlags: ["committee_breaker", "scheme_fit"], riskFlags: [] },
  "quinshon judkins": { verdict: "TARGET", trend: "rising", trendNote: "CLE bell cow — Mitchell depth chart situation resolved, Judkins locked in as lead back with full workhorse path", situationFlags: ["breakout_profile"], riskFlags: [] },
  "bhayshul tuten": { verdict: "TARGET", trend: "stable", trendNote: "Best back in JAX room after last year's breakout flashes", situationFlags: ["committee_breaker"], riskFlags: [] },
  // Risk/fade situations
  "rj harvey": { verdict: "fade", trend: "falling", trendNote: "Pass-pro issues, ADP rising into the mistake zone", situationFlags: [], riskFlags: ["creeping_committee", "ol_dependency"] },
  "jk dobbins": { verdict: "fade", trend: "falling", trendNote: "Two major knee surgeries, Harvey clearly ahead in depth chart", situationFlags: [], riskFlags: ["injury_history", "creeping_committee"] },
  "tony pollard": { verdict: "fade", trend: "falling", trendNote: "31 years old, Cam Ward era TEN is pass-first now", situationFlags: [], riskFlags: ["contract_year"] },
  "tyler allgeier": { verdict: "fade", trend: "stable", trendNote: "Three-way committee, Brissett QB, 36.1% run rate is brutal", situationFlags: [], riskFlags: ["creeping_committee"] },
  "breece hall": { verdict: "hold", trend: "falling", trendNote: "Contract narrative + NYJ rebuild = role uncertainty; still the most talented back on the roster but creeping committee risk is real — monitor camp", situationFlags: [], riskFlags: ["contract_year", "creeping_committee"] },
  "david montgomery": { verdict: "TARGET", trend: "stable", trendNote: "HOU bellcow — 2yr/$16.5M deal replaces Mixon as RB1, traded assets confirm org commitment; age 29 is the only real risk flag", situationFlags: ["scheme_fit"], riskFlags: ["injury_history"] },
  "d'andre swift": { verdict: "fade", trend: "falling", trendNote: "No bell-cow role in CHI committee", situationFlags: [], riskFlags: ["creeping_committee"] },
  "dandre swift": { verdict: "fade", trend: "falling", trendNote: "No bell-cow role in CHI committee", situationFlags: [], riskFlags: ["creeping_committee"] },
  "derrick henry": { verdict: "TARGET", trend: "stable", trendNote: "Has defied the age cliff every season — BAL run-heavy with soft W16-17 closing schedule", situationFlags: ["scheme_fit"], riskFlags: [] },
  "christian mccaffrey": { verdict: "hold", trend: "falling", trendNote: "Injury history the real concern — missed significant 2024 time, SF scheme unchanged under Shanahan; elite talent but fragility is a legitimate ADP risk at this price", situationFlags: [], riskFlags: ["injury_history"] },
  "cmc": { verdict: "hold", trend: "falling", trendNote: "Injury history the real concern — missed significant 2024 time, SF scheme unchanged under Shanahan; elite talent but fragility is a legitimate ADP risk at this price", situationFlags: [], riskFlags: ["injury_history"] },
  "malik nabers": { verdict: "hold", trend: "falling", trendNote: "2nd knee cleanup, Week 1 uncertain — real fragility risk at 22.9 ADP but elite talent; monitor camp availability before committing at this price", situationFlags: [], riskFlags: ["injury_history"] },
  "rashee rice": { verdict: "hold", trend: "falling", trendNote: "30-day jail sentence, misses OTAs — real chemistry and availability risk near term, but elite talent in Mahomes offense; discounted ADP makes the risk more palatable", situationFlags: [], riskFlags: ["injury_history"] },
  "lamar jackson": { verdict: "hold", trend: "stable", trendNote: "BAL playoff schedule is mixed — W15 @PIT tough, W16 CLE neutral, W17 @CIN soft (+0.12 EPA); new HC Minter/OC Doyle scheme uncertainty is the real ceiling risk, not the schedule", situationFlags: [], riskFlags: [] },
  "jaxson dart": { verdict: "TARGET", trend: "rising", trendNote: "NYG run-heavy limits QB ceiling but W17 @DAL is a real spike week — late-round leverage play at ADP discount", situationFlags: ["breakout_profile"], riskFlags: [] },
  "mike washington": { verdict: "fade", trend: "stable", trendNote: "Combine fraud, 10 career fumbles, no NFL tape", situationFlags: [], riskFlags: ["creeping_committee"] },
  "kenneth gainwell": { verdict: "TARGET", trend: "rising", trendNote: "2yr/$14M TB contract signals real role — legitimate committee back alongside Bucky Irving; pass-catching upside in Robinson system", situationFlags: ["scheme_fit"], riskFlags: ["creeping_committee"] },
  // === QB UNCERTAINTY FLAGS ===
  // These suppress stack credit and cap pass-catcher ceilings via qb_uncertainty risk flag
  "michael penix": { verdict: "fade", trend: "stable", trendNote: "ATL QB competition with Tua Tagovailoa — starting role unconfirmed, treat as contingent play until camp settles", situationFlags: [], riskFlags: ["qb_uncertainty"] },
  "michael penix jr": { verdict: "fade", trend: "stable", trendNote: "ATL QB competition with Tua Tagovailoa — starting role unconfirmed, treat as contingent play until camp settles", situationFlags: [], riskFlags: ["qb_uncertainty"] },
  "tua tagovailoa": { verdict: "fade", trend: "stable", trendNote: "Signed with ATL, competing with Penix for starting role — new team, unproven situation, no longer on MIA", situationFlags: [], riskFlags: ["qb_uncertainty"] },
  "aaron rodgers": { verdict: "fade", trend: "falling", trendNote: "Age 42 in 2026, injury history real concern — Howard and Allar capable of pushing for snaps if Rodgers struggles early", situationFlags: [], riskFlags: ["injury_history"] },
  "will howard": { verdict: "fade", trend: "stable", trendNote: "PIT backup competing with Rodgers — only relevant if Rodgers misses time; contingent value only", situationFlags: [], riskFlags: ["qb_uncertainty"] },
  "shedeur sanders": { verdict: "fade", trend: "stable", trendNote: "CLE QB competition with Watson — lowest completion % among QBs with 200+ attempts in 2025, starting role genuinely uncertain", situationFlags: [], riskFlags: ["qb_uncertainty"] },
  "deshaun watson": { verdict: "fade", trend: "stable", trendNote: "CLE QB competition with Sanders — one of worst EPA/dropback marks last two seasons, lead only if Sanders misses camp", situationFlags: [], riskFlags: ["qb_uncertainty", "injury_history"] },
  "jacoby brissett": { verdict: "fade", trend: "stable", trendNote: "ARI holdout situation heading into 2026 camp — contract dispute creates genuine Week 1 availability uncertainty", situationFlags: [], riskFlags: ["qb_uncertainty"] },
  // === ROLE CEILING FLAGS ===
  // slot_only: high target share WRs locked into short/underneath routes, no red zone role, hard TD ceiling cap
  "khalil shakir": { verdict: "fade", trend: "stable", trendNote: "Elite slot stats but sub-6 aDOT, zero red zone role — PPR floor, not a ceiling asset", situationFlags: [], riskFlags: [], roleCeiling: "slot_only" },
  "jakobi meyers": { verdict: "fade", trend: "stable", trendNote: "Possession slot, sub-7 aDOT — high floor, no boom ceiling without a red zone role change", situationFlags: [], riskFlags: [], roleCeiling: "slot_only" },
  "josh downs": { verdict: "fade", trend: "stable", trendNote: "Slot-only role in IND offense, limited air yards despite target volume — TD regression risk", situationFlags: [], riskFlags: [], roleCeiling: "slot_only" },
  "wandale robinson": { verdict: "fade", trend: "stable", trendNote: "Pure slot, sub-6 aDOT — Carnell Tate drafted as TEN WR1 further caps Robinson's ceiling; depth flier only", situationFlags: [], riskFlags: [], roleCeiling: "slot_only" },
  "parker washington": { verdict: "TARGET", trend: "rising", trendNote: "JAX WR1 breakout in 2025 — 65/954/6 with 19 catches of 20+ yards; perimeter YPRR (2.59) better than slot (1.87), Coen offense, Lawrence chemistry ascending", situationFlags: ["breakout_profile"], riskFlags: [] },
  "jahan dotson": { verdict: "fade", trend: "stable", trendNote: "Career 7.2 aDOT, pure slot role — now WR3 in ATL behind London and Mooney with no red zone path", situationFlags: [], riskFlags: [], roleCeiling: "slot_only" },
  "demario douglas": { verdict: "fade", trend: "stable", trendNote: "NE check-down valve, sub-8 aDOT — YAC-dependent with zero air yards upside in Maye offense", situationFlags: [], riskFlags: [], roleCeiling: "slot_only" },
  "tutu atwell": { verdict: "fade", trend: "stable", trendNote: "MIA gadget/speed role, sub-8 aDOT — no defined role and Willis run-first offense caps ceiling further", situationFlags: [], riskFlags: [], roleCeiling: "slot_only" },
  "malik washington": { verdict: "fade", trend: "falling", trendNote: "MIA slot with 5.2 aDOT in 2025 — now facing competition from three rookie WRs plus Atwell and Tolbert in Willis run-first offense; volume entirely schemed", situationFlags: [], riskFlags: ["creeping_committee"], roleCeiling: "slot_only" },
  "christian kirk": { verdict: "fade", trend: "falling", trendNote: "Age 30 WR3 in SF behind Evans and Pearsall — career slot profile, Shanahan run-heavy, Stribling 2nd-round pick adds further role pressure", situationFlags: [], riskFlags: [], roleCeiling: "slot_only" },
  // rz_dependent: players whose fantasy value is almost entirely TD-driven; near-zero floor without scoring
  "blake corum": { verdict: "fade", trend: "stable", trendNote: "Pure goal-line role in LAR — fantasy value collapses to near zero if not scoring TDs", situationFlags: [], riskFlags: [], roleCeiling: "rz_dependent" },
  "rachaad white": { verdict: "fade", trend: "stable", trendNote: "WAS committee back with no defined role — value is entirely situational, no TD equity locked in", situationFlags: [], riskFlags: ["confirmed_committee"], roleCeiling: "rz_dependent" },
  "aaron jones": { verdict: "fade", trend: "falling", trendNote: "Age cliff + MIN committee — role dependent on Alexander injury; near-zero floor if healthy backfield", situationFlags: [], riskFlags: ["creeping_committee", "injury_history"], roleCeiling: "rz_dependent" },
  // === ADDITIONAL COMMITTEE RB FLAGS (2026) ===
  "jaylen warren": { verdict: "TARGET", trend: "stable", trendNote: "PPR-friendly role, McCarthy now HC at PIT — run-heavy system suits Warren's receiving back profile, but Dowdle added as real competition", situationFlags: ["scheme_fit"], riskFlags: ["creeping_committee"] },
  "rico dowdle": { verdict: "fade", trend: "stable", trendNote: "Added to PIT committee — 1300+ scrimmage yards each of past two seasons, McCarthy history, real threat to Warren workload", situationFlags: [], riskFlags: ["confirmed_committee"] },
  "kaytron allen": { verdict: "TARGET", trend: "stable", trendNote: "WAS run-heavy under Quinn, new OC Blough — scheme continuity intact, lottery at ADP, but crowded backfield with White/Ford/Croskey-Merritt competing", situationFlags: ["scheme_fit"], riskFlags: ["creeping_committee"] },

  "jacory croskey merritt": { verdict: "fade", trend: "stable", trendNote: "WAS committee back — four-way competition in a run-heavy scheme limits any single back's upside", situationFlags: [], riskFlags: ["confirmed_committee"] },
  "tyjae spears": { verdict: "fade", trend: "falling", trendNote: "TEN committee with Pollard — injury-plagued, career-low attempts in 2025, no role clarity expected in 2026", situationFlags: [], riskFlags: ["confirmed_committee", "injury_history"] },
  "rhamondre stevenson": { verdict: "fade", trend: "falling", trendNote: "NE committee with Henderson — clock ticking on his role as Henderson projects as the long-term RB1", situationFlags: [], riskFlags: ["creeping_committee"] },
  "treveyon henderson": { verdict: "TARGET", trend: "rising", trendNote: "NE RB1 ceiling is real — Drake Maye offense is ascending and Henderson is the long-term answer, Stevenson's clock is ticking", situationFlags: ["breakout_profile"], riskFlags: [] },
  "josh jacobs": { verdict: "fade", trend: "falling", trendNote: "GB arrest situation June 2026 — legal issues create real availability risk, downgrade significantly if he misses time", situationFlags: [], riskFlags: ["injury_history", "contract_year"] },
  // === ADDITIONAL COMMITTEE RB GAPS (2026) ===
  "dylan sampson": { verdict: "fade", trend: "stable", trendNote: "CLE committee — best-case 70% of a putrid offense's backfield touches; upside severely capped by team situation", situationFlags: [], riskFlags: ["confirmed_committee"] },
  "braelon allen": { verdict: "fade", trend: "stable", trendNote: "NYJ committee with Hall — when Hall misses time splits evenly with Isaiah Davis, no workhorse upside as standalone", situationFlags: [], riskFlags: ["confirmed_committee"] },
  "isaiah davis": { verdict: "fade", trend: "stable", trendNote: "NYJ depth behind Hall and Allen — three-way committee with no clear role definition", situationFlags: [], riskFlags: ["confirmed_committee"] },
  "david montgomery": { verdict: "TARGET", trend: "stable", trendNote: "HOU bellcow — 2yr/$16.5M deal replaces Mixon as RB1, traded assets confirm org commitment; age 29 is the only real risk flag", situationFlags: ["scheme_fit"], riskFlags: ["injury_history"] },
  "woody marks": { verdict: "fade", trend: "stable", trendNote: "HOU committee with Montgomery — functional rookie (911 scrimmage yards) but 3.6 YPC limits standalone upside; passing-down role only", situationFlags: [], riskFlags: ["confirmed_committee"] },
  "jerome ford": { verdict: "fade", trend: "stable", trendNote: "WAS committee depth — part of four-way competition with Allen/White/Croskey-Merritt, no defined role", situationFlags: [], riskFlags: ["confirmed_committee"] },
  "jaleel mclaughlin": { verdict: "fade", trend: "stable", trendNote: "DEN depth behind Dobbins/Harvey/Coleman — four-way committee, essentially a practice squad candidate", situationFlags: [], riskFlags: ["confirmed_committee"] },
  // JAX — both Tuten and Rodriguez are targets in Liam Coen offense, but genuine committee risk
  "chris rodriguez": { verdict: "TARGET", trend: "stable", trendNote: "JAX committee with Tuten in elite Liam Coen offense — real carries and workhorse path if Tuten slips; ADP value makes the risk worthwhile", situationFlags: ["scheme_fit"], riskFlags: ["creeping_committee"] },
  "lequint allen": { verdict: "fade", trend: "stable", trendNote: "JAX makeshift committee — neither Allen nor Rodriguez has locked a lead role; value is situational", situationFlags: [], riskFlags: ["confirmed_committee"] },
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
  "lequint allen": { verdict: "fade", trend: "stable", trendNote: "JAX makeshift committee with Tuten — neither back eclipsed 68.0 PFF rushing grade in 2025, no lead-back clarity", situationFlags: [], riskFlags: ["confirmed_committee"] },
  "javonte williams": { verdict: "TARGET", trend: "stable", trendNote: "DAL 3yr/$24M re-sign — bell cow with bottom-5 defense generating positive game scripts; Malik Davis and Jaydon Blue competing for RB2 role behind him", situationFlags: ["scheme_fit"], riskFlags: [] },
  "malik davis": { verdict: "fade", trend: "stable", trendNote: "DAL RB2 competition with Jaydon Blue — neither back has locked a role behind Javonte; pure handcuff/committee depth", situationFlags: [], riskFlags: ["creeping_committee"] },
  "jaydon blue": { verdict: "fade", trend: "stable", trendNote: "DAL RB2 competition with Malik Davis — younger option with pass-catching upside, but no defined role until one separates in camp", situationFlags: [], riskFlags: ["creeping_committee"] },
  "eli heidenreich": { verdict: "fade", trend: "stable", trendNote: "PIT third RB behind Warren and Dowdle — drafted for passing situations and gadget work, no standalone value without injuries ahead of him", situationFlags: [], riskFlags: ["confirmed_committee"] },
  "carson beck": { verdict: "fade", trend: "stable", trendNote: "ARI backup QB behind Brissett — contingent value only if holdout persists deep into camp; monitor Brissett contract situation before drafting", situationFlags: [], riskFlags: ["qb_uncertainty"] },
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
  const tierColor = total >= 9 ? "#4ade80" : total >= 7.5 ? "#a3e635" : total >= 6 ? "#facc15" : total >= 4.5 ? "#fb923c" : "#f87171";

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

const ADP_YAHOO = {
  "jamarr chase": { adp: 1.0, pos: "WR", team: "CIN" },
  "bijan robinson": { adp: 2.0, pos: "RB", team: "ATL" },
  "jahmyr gibbs": { adp: 3.0, pos: "RB", team: "DET" },
  "puka nacua": { adp: 4.0, pos: "WR", team: "LAR" },
  "jaxon smith njigba": { adp: 5.0, pos: "WR", team: "SEA" },
  "jsn": { adp: 5.0, pos: "WR", team: "SEA" },
  "christian mccaffrey": { adp: 6.0, pos: "RB", team: "SF" },
  "cmc": { adp: 6.0, pos: "RB", team: "SF" },
  "ceedee lamb": { adp: 7.0, pos: "WR", team: "DAL" },
  "jonathan taylor": { adp: 8.0, pos: "RB", team: "IND" },
  "amon ra st brown": { adp: 9.0, pos: "WR", team: "DET" },
  "arsb": { adp: 9.0, pos: "WR", team: "DET" },
  "james cook": { adp: 10.0, pos: "RB", team: "BUF" },
  "ashton jeanty": { adp: 11.0, pos: "RB", team: "LV" },
  "justin jefferson": { adp: 12.0, pos: "WR", team: "MIN" },
  "devon achane": { adp: 13.0, pos: "RB", team: "MIA" },
  "achane": { adp: 13.0, pos: "RB", team: "MIA" },
  "chase brown": { adp: 14.0, pos: "RB", team: "CIN" },
  "saquon barkley": { adp: 15.0, pos: "RB", team: "PHI" },
  "drake london": { adp: 16.0, pos: "WR", team: "ATL" },
  "rashee rice": { adp: 17.0, pos: "WR", team: "KC" },
  "brock bowers": { adp: 18.0, pos: "TE", team: "LV" },
  "nico collins": { adp: 19.0, pos: "WR", team: "HOU" },
  "omarion hampton": { adp: 20.0, pos: "RB", team: "LAC" },
  "kenneth walker": { adp: 21.0, pos: "RB", team: "KC" },
  "trey mcbride": { adp: 22.0, pos: "TE", team: "ARI" },
  "george pickens": { adp: 23.0, pos: "WR", team: "DAL" },
  "malik nabers": { adp: 24.0, pos: "WR", team: "NYG" },
  "jeremiyah love": { adp: 25.0, pos: "RB", team: "ARI" },
  "josh allen": { adp: 26.0, pos: "QB", team: "BUF" },
  "chris olave": { adp: 27.0, pos: "WR", team: "NO" },
  "derrick henry": { adp: 28.0, pos: "RB", team: "BAL" },
  "aj brown": { adp: 29.0, pos: "WR", team: "NE" },
  "lamar jackson": { adp: 30.0, pos: "QB", team: "BAL" },
  "josh jacobs": { adp: 31.0, pos: "RB", team: "GB" },
  "tetairoa mcmillan": { adp: 32.0, pos: "WR", team: "CAR" },
  "devonta smith": { adp: 33.0, pos: "WR", team: "PHI" },
  "tee higgins": { adp: 34.0, pos: "WR", team: "CIN" },
  "drake maye": { adp: 35.0, pos: "QB", team: "NE" },
  "colston loveland": { adp: 36.0, pos: "TE", team: "CHI" },
  "garrett wilson": { adp: 37.0, pos: "WR", team: "NYJ" },
  "kyren williams": { adp: 38.0, pos: "RB", team: "LAR" },
  "travis etienne": { adp: 39.0, pos: "RB", team: "NO" },
  "breece hall": { adp: 40.0, pos: "RB", team: "NYJ" },
  "javonte williams": { adp: 41.0, pos: "RB", team: "DAL" },
  "zay flowers": { adp: 42.0, pos: "WR", team: "BAL" },
  "ladd mcconkey": { adp: 43.0, pos: "WR", team: "LAC" },
  "davante adams": { adp: 44.0, pos: "WR", team: "LAR" },
  "jaylen waddle": { adp: 45.0, pos: "WR", team: "DEN" },
  "luther burden": { adp: 46.0, pos: "WR", team: "CHI" },
  "joe burrow": { adp: 47.0, pos: "QB", team: "CIN" },
  "terry mclaurin": { adp: 48.0, pos: "WR", team: "WAS" },
  "bucky irving": { adp: 49.0, pos: "RB", team: "TB" },
  "jameson williams": { adp: 50.0, pos: "WR", team: "DET" },
  "cam skattebo": { adp: 51.0, pos: "RB", team: "NYG" },
  "jayden daniels": { adp: 52.0, pos: "QB", team: "WAS" },
  "emeka egbuka": { adp: 53.0, pos: "WR", team: "TB" },
  "jalen hurts": { adp: 54.0, pos: "QB", team: "PHI" },
  "treveyon henderson": { adp: 55.0, pos: "RB", team: "NE" },
  "dandre swift": { adp: 56.0, pos: "RB", team: "CHI" },
  "dj moore": { adp: 57.0, pos: "WR", team: "BUF" },
  "christian watson": { adp: 58.0, pos: "WR", team: "GB" },
  "tyler warren": { adp: 59.0, pos: "TE", team: "IND" },
  "chuba hubbard": { adp: 60.0, pos: "RB", team: "CAR" },
  "rome odunze": { adp: 61.0, pos: "WR", team: "CHI" },
  "quinshon judkins": { adp: 62.0, pos: "RB", team: "CLE" },
  "tucker kraft": { adp: 63.0, pos: "TE", team: "GB" },
  "bhayshul tuten": { adp: 64.0, pos: "RB", team: "JAX" },
  "carnell tate": { adp: 65.0, pos: "WR", team: "TEN" },
  "mike evans": { adp: 66.0, pos: "WR", team: "SF" },
  "david montgomery": { adp: 67.0, pos: "RB", team: "HOU" },
  "justin herbert": { adp: 68.0, pos: "QB", team: "LAC" },
  "jaxson dart": { adp: 69.0, pos: "QB", team: "NYG" },
  "jaylen warren": { adp: 70.0, pos: "RB", team: "PIT" },
  "jordyn tyson": { adp: 71.0, pos: "WR", team: "NO" },
  "jadarian price": { adp: 72.0, pos: "RB", team: "SEA" },
  "marvin harrison jr": { adp: 73.0, pos: "WR", team: "ARI" },
  "mhj": { adp: 73.0, pos: "WR", team: "ARI" },
  "makai lemon": { adp: 74.0, pos: "WR", team: "PHI" },
  "rico dowdle": { adp: 75.0, pos: "RB", team: "PIT" },
  "alec pierce": { adp: 76.0, pos: "WR", team: "IND" },
  "rj harvey": { adp: 77.0, pos: "RB", team: "DEN" },
  "caleb williams": { adp: 78.0, pos: "QB", team: "CHI" },
  "courtland sutton": { adp: 79.0, pos: "WR", team: "DEN" },
  "harold fannin": { adp: 80.0, pos: "TE", team: "CLE" },
  "michael wilson": { adp: 81.0, pos: "WR", team: "ARI" },
  "dk metcalf": { adp: 82.0, pos: "WR", team: "PIT" },
  "rhamondre stevenson": { adp: 83.0, pos: "RB", team: "NE" },
  "sam laporta": { adp: 84.0, pos: "TE", team: "DET" },
  "tony pollard": { adp: 85.0, pos: "RB", team: "TEN" },
  "chris godwin": { adp: 86.0, pos: "WR", team: "TB" },
  "trevor lawrence": { adp: 87.0, pos: "QB", team: "JAX" },
  "kyle pitts": { adp: 88.0, pos: "TE", team: "ATL" },
  "dak prescott": { adp: 89.0, pos: "QB", team: "DAL" },
  "brian thomas jr": { adp: 90.0, pos: "WR", team: "JAX" },
  "btj": { adp: 90.0, pos: "WR", team: "JAX" },
  "ricky pearsall": { adp: 91.0, pos: "WR", team: "SF" },
  "kyle monangai": { adp: 92.0, pos: "RB", team: "CHI" },
  "jk dobbins": { adp: 93.0, pos: "RB", team: "DEN" },
  "parker washington": { adp: 94.0, pos: "WR", team: "JAX" },
  "blake corum": { adp: 95.0, pos: "RB", team: "LAR" },
  "jakobi meyers": { adp: 96.0, pos: "WR", team: "JAX" },
  "kyler murray": { adp: 97.0, pos: "QB", team: "MIN" },
  "jacory croskey merritt": { adp: 98.0, pos: "RB", team: "WAS" },
  "bo nix": { adp: 99.0, pos: "QB", team: "DEN" },
  "dalton kincaid": { adp: 100.0, pos: "TE", team: "BUF" },
  "brock purdy": { adp: 101.0, pos: "QB", team: "SF" },
  "jordan addison": { adp: 102.0, pos: "WR", team: "MIN" },
  "oronde gadsden": { adp: 103.0, pos: "TE", team: "LAC" },
  "kenneth gainwell": { adp: 104.0, pos: "RB", team: "TB" },
  "patrick mahomes": { adp: 105.0, pos: "QB", team: "KC" },
  "michael pittman jr": { adp: 106.0, pos: "WR", team: "PIT" },
  "dallas goedert": { adp: 107.0, pos: "TE", team: "PHI" },
  "tyler allgeier": { adp: 108.0, pos: "RB", team: "ARI" },
  "aaron jones": { adp: 109.0, pos: "RB", team: "MIN" },
  "travis kelce": { adp: 110.0, pos: "TE", team: "KC" },
  "josh downs": { adp: 111.0, pos: "WR", team: "IND" },
  "wandale robinson": { adp: 112.0, pos: "WR", team: "TEN" },
  "jayden reed": { adp: 113.0, pos: "WR", team: "GB" },
  "quentin johnston": { adp: 114.0, pos: "WR", team: "LAC" },
  "jordan mason": { adp: 115.0, pos: "RB", team: "MIN" },
  "rachaad white": { adp: 116.0, pos: "RB", team: "WAS" },
  "jayden higgins": { adp: 117.0, pos: "WR", team: "HOU" },
  "jake ferguson": { adp: 118.0, pos: "TE", team: "DAL" },
  "zach charbonnet": { adp: 119.0, pos: "RB", team: "SEA" },
  "isaiah likely": { adp: 120.0, pos: "TE", team: "NYG" },
  "george kittle": { adp: 121.0, pos: "TE", team: "SF" },
  "tyrone tracy": { adp: 122.0, pos: "RB", team: "NYG" },
  "chris rodriguez": { adp: 123.0, pos: "RB", team: "JAX" },
  "jonathon brooks": { adp: 124.0, pos: "RB", team: "CAR" },
  "romeo doubs": { adp: 125.0, pos: "WR", team: "NE" },
  "jalen coker": { adp: 126.0, pos: "WR", team: "CAR" },
  "malik willis": { adp: 127.0, pos: "QB", team: "MIA" },
  "matthew stafford": { adp: 128.0, pos: "QB", team: "LAR" },
  "xavier worthy": { adp: 129.0, pos: "WR", team: "KC" },
  "kc concepcion": { adp: 130.0, pos: "WR", team: "CLE" },
  "tyjae spears": { adp: 131.0, pos: "RB", team: "TEN" },
  "woody marks": { adp: 132.0, pos: "RB", team: "HOU" },
  "khalil shakir": { adp: 133.0, pos: "WR", team: "BUF" },
  "matthew golden": { adp: 134.0, pos: "WR", team: "GB" },
  "jonah coleman": { adp: 135.0, pos: "RB", team: "DEN" },
  "jared goff": { adp: 136.0, pos: "QB", team: "DET" },
  "jordan love": { adp: 137.0, pos: "QB", team: "GB" },
  "keaton mitchell": { adp: 138.0, pos: "RB", team: "LAC" },
  "tyler shough": { adp: 139.0, pos: "QB", team: "NO" },
  "stefon diggs": { adp: 140.0, pos: "WR", team: "-" },
  "braelon allen": { adp: 141.0, pos: "RB", team: "NYJ" },
  "dylan sampson": { adp: 142.0, pos: "RB", team: "CLE" },
  "baker mayfield": { adp: 143.0, pos: "QB", team: "TB" },
  "mark andrews": { adp: 144.0, pos: "TE", team: "BAL" },
  "brenton strange": { adp: 145.0, pos: "TE", team: "JAX" },
  "brian robinson": { adp: 146.0, pos: "RB", team: "ATL" },
  "isiah pacheco": { adp: 147.0, pos: "RB", team: "DET" },
  "denzel boston": { adp: 148.0, pos: "WR", team: "CLE" },
  "hunter henry": { adp: 149.0, pos: "TE", team: "NE" },
  "deebo samuel": { adp: 150.0, pos: "WR", team: "-" },
  "emanuel wilson": { adp: 151.0, pos: "RB", team: "SEA" },
  "cj stroud": { adp: 152.0, pos: "QB", team: "HOU" },
  "mike washington jr": { adp: 153.0, pos: "RB", team: "LV" },
  "alvin kamara": { adp: 154.0, pos: "RB", team: "NO" },
  "james conner": { adp: 155.0, pos: "RB", team: "ARI" },
  "omar cooper jr": { adp: 156.0, pos: "WR", team: "NYJ" },
  "tank bigsby": { adp: 157.0, pos: "RB", team: "PHI" },
  "bryce young": { adp: 158.0, pos: "QB", team: "CAR" },
  "brandon aiyuk": { adp: 159.0, pos: "WR", team: "SF" },
  "juwan johnson": { adp: 160.0, pos: "TE", team: "NO" },
  "sam darnold": { adp: 161.0, pos: "QB", team: "SEA" },
  "jalen mcmillan": { adp: 162.0, pos: "WR", team: "TB" },
  "jerry jeudy": { adp: 163.0, pos: "WR", team: "CLE" },
  "cam ward": { adp: 164.0, pos: "QB", team: "TEN" },
  "jauan jennings": { adp: 165.0, pos: "WR", team: "MIN" },
  "daniel jones": { adp: 166.0, pos: "QB", team: "IND" },
  "nicholas singleton": { adp: 167.0, pos: "RB", team: "TEN" },
  "rashid shaheed": { adp: 168.0, pos: "WR", team: "SEA" },
  "adonai mitchell": { adp: 169.0, pos: "WR", team: "NYJ" },
  "kayshon boutte": { adp: 170.0, pos: "WR", team: "NE" },
  "kaytron allen": { adp: 171.0, pos: "RB", team: "WAS" },
  "ray davis": { adp: 172.0, pos: "RB", team: "BUF" },
  "emmett johnson": { adp: 173.0, pos: "RB", team: "KC" },
  "kenyon sadiq": { adp: 174.0, pos: "TE", team: "NYJ" },
  "chigoziem okonkwo": { adp: 175.0, pos: "TE", team: "WAS" },
  "kimani vidal": { adp: 176.0, pos: "RB", team: "LAC" },
  "tyreek hill": { adp: 177.0, pos: "WR", team: "-" },
  "tj hockenson": { adp: 178.0, pos: "TE", team: "MIN" },
  "terrance ferguson": { adp: 179.0, pos: "TE", team: "LAR" },
  "jacoby brissett": { adp: 180.0, pos: "QB", team: "ARI" },
  "antonio williams": { adp: 181.0, pos: "WR", team: "WAS" },
  "sean tucker": { adp: 182.0, pos: "RB", team: "TB" },
  "calvin ridley": { adp: 183.0, pos: "WR", team: "TEN" },
  "chris bell": { adp: 184.0, pos: "WR", team: "MIA" },
  "dalton schultz": { adp: 185.0, pos: "TE", team: "HOU" },
  "jack bech": { adp: 186.0, pos: "WR", team: "LV" },
  "eli stowers": { adp: 187.0, pos: "TE", team: "PHI" },
  "troy franklin": { adp: 189.0, pos: "WR", team: "DEN" },
  "tre tucker": { adp: 190.0, pos: "WR", team: "LV" },
  "tre harris": { adp: 191.0, pos: "WR", team: "LAC" },
  "jalen nailor": { adp: 192.0, pos: "WR", team: "LV" },
  "isaac teslaa": { adp: 193.0, pos: "WR", team: "DET" },
  "trey benson": { adp: 194.0, pos: "RB", team: "ARI" },
  "aj barner": { adp: 195.0, pos: "TE", team: "SEA" },
  "ryan flournoy": { adp: 196.0, pos: "WR", team: "DAL" },
  "germie bernard": { adp: 197.0, pos: "WR", team: "PIT" },
  "jake tonges": { adp: 199.0, pos: "TE", team: "SF" },
  "david njoku": { adp: 201.0, pos: "TE", team: "LAC" },
  "darnell mooney": { adp: 202.0, pos: "WR", team: "NYG" },
  "fernando mendoza": { adp: 203.0, pos: "QB", team: "LV" },
  "colby parkinson": { adp: 204.0, pos: "TE", team: "LAR" },
  "tank dell": { adp: 205.0, pos: "WR", team: "HOU" },
  "dezhaun stribling": { adp: 206.0, pos: "WR", team: "SF" },
  "aaron rodgers": { adp: 207.0, pos: "QB", team: "PIT" },
  "pat freiermuth": { adp: 208.0, pos: "TE", team: "PIT" },
  "gunnar helm": { adp: 209.0, pos: "TE", team: "TEN" },
  "cooper kupp": { adp: 210.0, pos: "WR", team: "SEA" },
  "geno smith": { adp: 211.0, pos: "QB", team: "NYJ" },
  "jordan james": { adp: 212.0, pos: "RB", team: "SF" },
  "dontayvion wicks": { adp: 213.0, pos: "WR", team: "PHI" },
  "christian kirk": { adp: 214.0, pos: "WR", team: "SF" },
  "zachariah branch": { adp: 215.0, pos: "WR", team: "ATL" },
  "justice hill": { adp: 216.0, pos: "RB", team: "BAL" },
  "malachi fields": { adp: 217.0, pos: "WR", team: "NYG" },
  "ted hurst": { adp: 218.0, pos: "WR", team: "TB" },
  "travis hunter": { adp: 219.0, pos: "WR", team: "JAX" },
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
  "rashod bateman": { adp: 238.0, pos: "WR", team: "BAL" },
  "ollie gordon": { adp: 241.0, pos: "RB", team: "MIA" },
  "samaje perine": { adp: 242.0, pos: "RB", team: "CIN" },
  "skyler bell": { adp: 243.0, pos: "WR", team: "BUF" },
  "najee harris": { adp: 246.0, pos: "RB", team: "-" },
  "tyquan thornton": { adp: 247.0, pos: "WR", team: "KC" },
  "dawson knox": { adp: 248.0, pos: "TE", team: "BUF" },
  "darius slayton": { adp: 249.0, pos: "WR", team: "NYG" },
  "cade otton": { adp: 252.0, pos: "TE", team: "TB" },
  "malik washington": { adp: 254.0, pos: "WR", team: "MIA" },
  "tua tagovailoa": { adp: 255.0, pos: "QB", team: "ATL" },
  "kaelon black": { adp: 256.0, pos: "RB", team: "SF" },
  "greg dulcich": { adp: 257.0, pos: "TE", team: "MIA" },
  "deshaun watson": { adp: 260.0, pos: "QB", team: "CLE" },
  "michael penix jr": { adp: 261.0, pos: "QB", team: "ATL" },
  "keenan allen": { adp: 262.0, pos: "WR", team: "-" },
  "tory horton": { adp: 264.0, pos: "WR", team: "SEA" },
  "chris brazzell ii": { adp: 265.0, pos: "WR", team: "CAR" },
  "malik davis": { adp: 266.0, pos: "RB", team: "DAL" },
  "marshawn lloyd": { adp: 267.0, pos: "RB", team: "GB" },
  "jakobi lane": { adp: 268.0, pos: "WR", team: "BAL" },
  "dj giddens": { adp: 269.0, pos: "RB", team: "IND" },
  "carson beck": { adp: 270.0, pos: "QB", team: "ARI" },
  "jahan dotson": { adp: 271.0, pos: "WR", team: "ATL" },
  "lequint allen": { adp: 272.0, pos: "RB", team: "JAX" },
  "darnell washington": { adp: 273.0, pos: "TE", team: "PIT" },
  "chris brooks": { adp: 274.0, pos: "RB", team: "GB" },
  "ty johnson": { adp: 275.0, pos: "RB", team: "BUF" },
  "oscar delp": { adp: 276.0, pos: "TE", team: "NO" },
  "hollywood brown": { adp: 277.0, pos: "WR", team: "PHI" },
  "kaleb johnson": { adp: 278.0, pos: "RB", team: "PIT" },
  "caleb douglas": { adp: 279.0, pos: "WR", team: "MIA" },
  "george holani": { adp: 280.0, pos: "RB", team: "SEA" },
  "andrei iosivas": { adp: 281.0, pos: "WR", team: "CIN" },
  "kendrick bourne": { adp: 282.0, pos: "WR", team: "ARI" },
  "cole kmet": { adp: 283.0, pos: "TE", team: "CHI" },
  "marvin mims": { adp: 284.0, pos: "WR", team: "DEN" },
  "demond claiborne": { adp: 289.0, pos: "RB", team: "MIN" },
  "theo johnson": { adp: 299.0, pos: "TE", team: "NYG" },
  "adam randall": { adp: 300.0, pos: "RB", team: "BAL" },
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
const COACHING_ADJ = {
  BAL: { all: -2.5, note: "Minter HC, top-8 D projection" },
  PIT: { all: -2.0, note: "Patrick Graham DC, top-10" },
  CLE: { all: -1.0, note: "Schwartz gone, slight regression" },
  GB: { all: -1.5, note: "Parsons added, top-10 when healthy" },
  CHI: { all: +1.5, note: "Lost Allen/Greenard/Hargrave" },
  DAL: { all: +2.0, note: "Parsons + Diggs gone, bottom-5" },
  WAS: { all: +1.5, note: "Full rebuild, stays bottom-5" },
  NYJ: { all: +1.0, note: "Improving but still bottom-8" },
  TEN: { all: +1.0, note: "Saleh needs time, bottom-5" },
};

// 2026 offseason projection adjustments — position-specific deltas
// Applied ONLY when user selects "2026 Est." mode. Not real data — estimates based on roster moves.
// Positive delta = easier matchup (defense got worse), negative = harder (defense improved).
const OFFSEASON_ADJ_2026 = {
  CIN: { wr: -1.5, rb: -1.0, te: -1.0, note: "Lou Anarumo back, secondary upgraded" },
  BAL: { wr: -1.0, rb: -0.5, te: -0.5, note: "Minter DC promotion, Humphrey healthy" },
  CAR: { wr: +1.5, rb: +1.0, te: +1.0, note: "Lost Brian Burns, thin secondary" },
  LAR: { wr: -1.0, rb: -0.5, te: -0.5, note: "Myles Garrett arrived (Verse + picks), pass rush upgraded — tougher matchup" },
  CLE: { wr: -1.0, rb: -0.5, te: -0.5, note: "Verse arrival strengthens pass rush" },
  NYG: { wr: +1.5, rb: +1.0, te: +1.0, note: "Rebuilding D, bottom-5 projection" },
  WAS: { wr: +1.0, rb: +0.5, te: +0.5, note: "Full rebuild, Payne age concern" },
  KC:  { wr: -0.5, rb: -0.5, te: -0.5, note: "Spagnuolo continuity, secondary intact" },
  JAX: { wr: -1.0, rb: -0.5, te: -0.5, note: "New DC, cap space used on defense" },
  DAL: { wr: +2.0, rb: +1.5, te: +1.5, note: "Parsons + Diggs gone, bottom-3 projection" },
};

const normalize = (s) => s.toLowerCase().trim().replace(/[.,'']/g, "").replace(/-/g, " ").replace(/\s+/g, " ");

// Build a reverse index of lastName -> [{key, entry}] for initial-based matching (Yahoo "C. McCaffrey")
const buildLastNameIndex = (table) => {
  const idx = {};
  for (const key of Object.keys(table)) {
    const parts = key.split(" ");
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
  const titleCase = (k) => k.split(" ").map(w => w.length <= 2 && /^(jr|sr|ii|iii|iv)$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const mk = (key, entry, extra = {}) => ({ ...entry, name: titleCase(key), matchedKey: key, ...extra });

  // 1. Exact normalized match
  if (table[norm]) return mk(norm, table[norm]);

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
    const restWords = initialMatch[2].split(" ");
    const last = restWords[restWords.length - 1];
    const idx = getLastNameIndex(table);
    const candidates = (idx[last] || []).filter(c => c.key.split(" ")[0][0] === initial);
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
  const rawLines = text.split("\n").map(l => l.trim());
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

    reconstructed.push({ name: player.name || nameRows[n].line, player, pick });
  }

  // === ADP PLAUSIBILITY GUARD ===
  // A pick number differing from ADP by more than 80 is almost certainly a parser
  // artifact. Real drafts don't see 80+ pick deviations from ADP regularly.
  // Tighter now that pick selection uses closest-to-ADP logic above.
  reconstructed.forEach(r => {
    if (r.pick != null && r.player?.adp != null) {
      const diff = Math.abs(r.pick - r.player.adp);
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
      .map(r => Math.abs(r.pick - (r.player?.adp || r.pick)))
      .sort((a, b) => a - b)[Math.floor(detectedPicks.length / 2)];
    const deltaConfidence = medianDiff < 45;

    // Fail if BOTH checks fail — null out all picks silently
    // Intentionally lenient: one bad check is not enough to discard everything
    if (!rangeConfidence && !deltaConfidence) {
      reconstructed.forEach(r => { r.pick = null; });
    }
  }

  return reconstructed;
};

const parseRoster = (text, format = "standard") => {
  // Try the universal preprocessor first (handles app dumps + horizontal formats)
  const pre = preprocessRoster(text, format);
  if (pre && pre.length > 0) {
    let detectedPickNumbers = false;
    const picks = pre.map((r, idx) => {
      if (r.pick != null) detectedPickNumbers = true;
      return {
        ...r.player,
        name: r.player.name,
        pickNum: idx + 1,
        actualPick: r.pick != null ? r.pick : null,  // null = unknown, never fabricate from index
        raw: r.name,
      };
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
  // apply coaching adjustment (always on)
  const adj = COACHING_ADJ[opp];
  if (adj) pts -= adj.all;
  // apply 2026 offseason layer (only in projected mode)
  if (useProjected) {
    const offAdj = OFFSEASON_ADJ_2026[opp];
    if (offAdj) {
      const delta = offAdj[pos.toLowerCase()];
      if (delta != null) pts -= delta;
    }
  }

  // Rank-based tiering using position-specific distribution
  const allPts = Object.values(FPA[pos]).sort((a, b) => b - a);
  const rank = allPts.findIndex(v => v <= pts) + 1;

  let tier, color, score;
  if (rank <= 8) { tier = "Smash"; color = "elite"; score = 5; }
  else if (rank <= 14) { tier = "Good"; color = "solid"; score = 4; }
  else if (rank <= 20) { tier = "Even"; color = "neutral"; score = 3; }
  else if (rank <= 26) { tier = "Hard"; color = "tough"; score = 2; }
  else { tier = "Avoid"; color = "wall"; score = 1; }

  return { tier, color, score, opp, pts: pts.toFixed(1), rank };
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

  // ADP deltas — calibrated thresholds per format
  // Underdog standard: large sample, tight distribution → flag at ±15
  // 4for4 SF: smaller sample, wider distribution → flag at ±25 (and value cap at +35)
  const reachThreshold = format === "superflex" ? 25 : 15;
  const valueThreshold = format === "superflex" ? 25 : 15;
  const detectThreshold = format === "superflex" ? 15 : 8;

  let adpFlags = [];
  if (hasPickNumbers) {
    adpFlags = valid.filter(p => p.actualPick != null).map(p => ({
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
        QB: { min: 3, max: 5, msg: `${posCounts.QB} QB (SF target 3-5)` },
        RB: { min: 4, max: 8, msg: `${posCounts.RB} RB (SF target 4-8)` },
        WR: { min: 5, max: 10, msg: `${posCounts.WR} WR (SF target 5-10)` },
        TE: { min: 1, max: 3, msg: `${posCounts.TE} TE (SF target 1-3)` },
      }
    : {
        WR: { min: 5, max: 8, msg: `${posCounts.WR} WR (target 5-8)` },
        RB: { min: 4, max: 7, msg: `${posCounts.RB} RB (target 4-7)` },
        TE: { min: 1, max: 3, msg: `${posCounts.TE} TE (target 1-3)` },
        QB: { min: 2, max: 3, msg: `${posCounts.QB} QB (target 2-3)` },
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
        const m = getMatchupTier(opp, player.pos, useProjected);
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
    const matchups = opps.map((opp, i) => getMatchupTier(opp, p.pos, useProjected));
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
    if (!hasPickNumbers && !player.actualPick) return;
    const pickNum = player.actualPick;
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
  if (tournamentKey === "puppy") {
    // The Puppy: W16 kill shot — reward stacks with strong W16 specifically
    const w16Elite = primaryStacks.filter(s => s.avgPerWeek[1] >= 4);
    if (w16Elite.length >= 1) {
      strengths.push(`${w16Elite.length} stack(s) with elite W16 kill-shot ceiling`);
    }
  } else if (tournamentKey === "bbm7") {
    // BBM VII: W15 spike — reward stacks with strong W15
    const w15Elite = primaryStacks.filter(s => s.avgPerWeek[0] >= 4);
    if (w15Elite.length >= 1) {
      strengths.push(`${w15Elite.length} stack(s) with W15 spike ceiling`);
    }
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

  // Fix 4: Playoff quality modifier — clean construction + elite windows = bonus
  const topStackHasEliteWindow = eliteStacks.length >= 1;
  const constructionClean = majorIssues.length === 0;
  if (constructionClean && topStackHasEliteWindow) {
    score += 0.5; // clean build + elite playoff window compound bonus
  }

  // Bring-back bonus — game stacks are positively correlated
  // Fix 1: reduced from +0.8 to +0.35 — bring-backs are correlated value, not a stack
  const qbBringBacks = bringBacks.filter(b => b.hasQB && b.bringBackPieces.some(p => p.pos === "WR" || p.pos === "TE"));
  if (qbBringBacks.length >= 1) {
    strengths.push(`${qbBringBacks.length} game stack(s) with bring-back correlation`);
    score += qbBringBacks.length * 0.35;
  }

  // Orphan analysis
  const noEdgeOrphans = orphans.filter(o => o.tier === "No Edge");
  const strongOrphans = orphans.filter(o => o.tier === "Elite Window" || o.tier === "Strong Matchups");
  if (strongOrphans.length >= 2) {
    strengths.push(`${strongOrphans.length} orphan(s) with strong playoff matchups`);
    score += 0.5;
  }
  if (noEdgeOrphans.length >= 3) {
    weaknesses.push(`${noEdgeOrphans.length} orphans with no matchup or value edge`);
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
    weaknesses.push(`Slot ceiling trap${slotOnlyPlayers.length > 1 ? "s" : ""}: ${names} — high target share, no downfield or red zone role`);
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
      strengths.push(`${leverageStacks.length} sharp/leverage stack(s) for large field`);
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

  return {
    valid, picks, posCounts, stacks, stackGrades, adpFlags, benchmarkIssues,
    grade, strengths, weaknesses, goodStacks, eliteStacks, primaryStacks,
    tournament, hasPickNumbers, format, score,
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
  const adj = COACHING_ADJ[oppClean];
  if (adj) pts -= adj.all;
  if (useProjected) {
    const offAdj = OFFSEASON_ADJ_2026[oppClean];
    if (offAdj) {
      const delta = offAdj[pos.toLowerCase()];
      if (delta != null) pts -= delta;
    }
  }
  const allPts = Object.values(FPA[pos]).sort((a, b) => b - a);
  const rank = allPts.findIndex(v => v <= pts) + 1;
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
    adpFlags = valid.filter(p => p.actualPick != null).map(p => ({
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
    weaknesses.push(`Slot ceiling trap${rdSlotOnly.length > 1 ? "s" : ""}: ${names} — high target share, no downfield or red zone role`);
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
  const [analysisMode, setAnalysisMode] = useState("bestball"); // "bestball" | "redraft"
  const [redraftLeague, setRedraftLeague] = useState("yahoo_std");
  const [customConfig, setCustomConfig] = useState(DEFAULT_CUSTOM_CONFIG);
  const [customExpanded, setCustomExpanded] = useState(false);
  const [benchExpanded, setBenchExpanded] = useState(false);
  const [exportingCard, setExportingCard] = useState(false);
  const [exportedDataUrl, setExportedDataUrl] = useState(null);
  const [gradeExplainerOpen, setGradeExplainerOpen] = useState(false);
  const [showPickAnalysis, setShowPickAnalysis] = useState(false);
  const [uploadTabClicked, setUploadTabClicked] = useState(false);
  const [dataMode, setDataMode] = useState("actual");
  const [aiNutshell, setAiNutshell] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPivotNotes, setAiPivotNotes] = useState({});
  const [aiStandoutDetails, setAiStandoutDetails] = useState({});
  const [aiBenchMoveNotes, setAiBenchMoveNotes] = useState({});
  const [aiLineupNotes, setAiLineupNotes] = useState({});
  const [aiBringBackNotes, setAiBringBackNotes] = useState({});

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
  const exportCardRef = React.useRef(null);

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

      const cardHeight = card.scrollHeight;

      const canvas = await window.html2canvas(card, {
        backgroundColor: "#0a0a0a",
        scale: 2,
        useCORS: true,
        logging: false,
        width: 390,
        height: cardHeight,
        windowWidth: 450,
        windowHeight: cardHeight,
        onclone: (clonedDoc, clonedEl) => {
          // In the cloned document, position at absolute 0,0 with no clipping
          clonedEl.style.position = "absolute";
          clonedEl.style.top = "0";
          clonedEl.style.left = "10px";
          clonedEl.style.visibility = "visible";
          clonedEl.style.width = "390px";
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

const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList).filter(f => f.type.startsWith("image/"));
    if (files.length === 0) {
      setExtractError("Only image files supported");
      return;
    }
    setExtractError(null);
    const processed = await Promise.all(files.map(async (f) => ({
      name: f.name,
      type: f.type,
      data: await fileToBase64(f),
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
          text: `These are screenshots of a fantasy football best ball draft roster (likely Underdog, Yahoo, Sleeper, or similar).

Extract every player name from the roster. Return ONLY a JSON array of player name strings in draft order if pick numbers are visible. No markdown, no code fences, no preamble, no trailing text — just the raw JSON array.

Example output exactly:
["Bijan Robinson","Tetairoa McMillan","Trey McBride","Caleb Williams"]

Include ALL skill position players visible across all images (QB, RB, WR, TE). Skip kickers and defenses. Deduplicate if the same player appears twice.`
        }
      ];

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
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
            players = parsed.filter(p => typeof p === "string" && p.trim().length > 1);
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
        if (filtered.length >= 5) players = filtered;
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
            !/^(QB|RB|WR|TE|Round|Pick|ADP|Bye)/i.test(l)
          );
        if (extracted.length >= 5) players = extracted;
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
      players = players.filter(p => {
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

      // Dedupe
      players = [...new Set(players.map(p => p.trim()))];

      const newInput = players.join("\n");
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
    try {
      const isRedraft = result.mode === "redraft";

      // === SHARED CONTEXT ===
      const rosterLines = (result.valid || []).map(p =>
        `${p.name} (${p.pos}·${p.team}${p.actualPick ? ` pick ${p.actualPick}` : ""}${p.adp ? ` ADP ${p.adp}` : ""})`
      ).join(", ");

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
        ? (result.playoffMatchups || []).slice(0, 5).map(p =>
            `${p.name} (${p.pos}): W15 ${p.w15?.tier || "—"} W16 ${p.w16?.tier || "—"} W17 ${p.w17?.tier || "—"}`
          ).join("; ")
        : "";

      // === PIVOT CONTEXT for prompt ===
      const pivotForPrompt = !isRedraft
        ? (result.topPivots || []).slice(0, 3).map(pv =>
            `${pv.picked.name} (${pv.picked.pos}·${pv.picked.team} ADP ${pv.picked.adp}) → alt: ${pv.alternatives[0]?.name} (${pv.alternatives[0]?.pos}·${pv.alternatives[0]?.team} ADP ${pv.alternatives[0]?.adp})`
          ).join(" | ")
        : "";

      // === STANDOUT CONTEXT for prompt ===
      const standoutsForPrompt = !isRedraft
        ? (result.rosterStandouts || []).map(s =>
            `${s.player.name} (${s.player.pos}·${s.player.team}) — label: ${s.label}`
          ).join(" | ")
        : "";

      // === BRING-BACK CONTEXT ===
      const bringBackForPrompt = !isRedraft
        ? (result.bringBacks || []).map(bb =>
            `${bb.week} ${bb.teamA?.team || bb.stackTeam} vs ${bb.teamB?.team || bb.opponent}: ${(bb.allPieces || [...(bb.stackPieces||[]), ...(bb.bringBackPieces||[])]).map(p => `${p.name} ${p.pos}`).join(", ")}`
          ).join(" | ")
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

      // === SYSTEM PROMPT ===
      const systemPrompt = `You are RosterXRay — a sharp, opinionated fantasy football analyst. Your voice is direct, specific, and slightly savage. You write like a trusted analyst who has seen thousands of rosters.

CRITICAL DATA PRIORITY — follow this exactly, no exceptions:
1. "Player situations" in the user prompt = verified app data. Treat as ground truth. Never contradict it.
2. "Recent news" in the user prompt = breaking news override. Treat as ground truth. Never contradict it.
3. Your training knowledge = fallback only, for players not covered by 1 or 2 above.
If a player appears in situations or recent news, use ONLY that data for their role, team, and situation. Do not blend in your own knowledge about that player.

FORMAT: Return valid JSON only. No markdown, no explanation outside the JSON.
{
  "nutshell": "3-4 sentence breakdown. Lead with the single most important truth. Name specific players. Second person. No grade letter. No filler.",
  "gradeModifier": 0,
  "modifierReason": "one sentence explaining the adjustment, or null if no adjustment",
  "pivotNotes": { "AltPlayerName": "one sentence on whether this swap is actually worth it" },
  "standoutDetails": { "PlayerName": "one sharp sentence, under 20 words, specific to their 2026 situation" },
  "bringBackNotes": { "TEAMAVSTEAMB_WEEK": "one sentence on why this game is or isn't a real ceiling game — reference the teams, QB situations, blowout risk, or defensive matchup" },
  "lineupNotes": { "W15": "one sentence on the most important start/sit decision this week", "W16": "...", "W17": "..." },
  "benchMoveNotes": { "PlayerName": "one sentence — is this bench role actually what it appears to be? Any role concern, opportunity, or situation the formula might have missed?" }
}

Rules per section:
- pivotNotes: only the alt players (suggested swaps). Flag role concerns honestly.
- standoutDetails: specific situation, not just matchup quality. Under 20 words.
- bringBackNotes: key format "TEAMAVSTEAMB_WEEK" e.g. "DALVSNYG_W17". Focus on whether this is a real ceiling game or just a coincidence.
- lineupNotes: redraft only. One sentence per playoff week covering the most important decision.
- benchMoveNotes: redraft only. One sentence per player — use your own knowledge of their 2025 season, role, and 2026 situation. The formula only looks at matchups and ADP, not player history or narrative. Give a balanced read: acknowledge real strengths and real concerns. A former elite player on a new team deserves credit for their track record — don't just focus on the downside. An organizational commitment signal like a big contract is real signal of intent. Be honest about ceiling AND floor without being brutal. One sentence, specific, fair.

gradeModifier rules:
+2 = meaningfully stronger than score suggests
+1 = slight upside the score undersells
0  = score is accurate
-1 = one real flaw the score missed
-2 = significant structural problem the score missed

Never reference internal numbers the user cannot see. Plain language only.

Mode: ${isRedraft ? "REDRAFT — focus on floor, schedule, lineup depth, bye weeks, injury insurance. The league structure is provided in the user prompt — use it to calibrate expectations. In a superflex league 3 QBs is correct roster construction, not a problem. In a 14-team league shallow depth is expected. Never penalize correct format-specific construction. Skip pivotNotes, standoutDetails, bringBackNotes — return empty objects for those." : `BEST BALL (${tournamentName}) — focus on ceiling, stacks, playoff window, boom/bust variance. Skip lineupNotes and benchMoveNotes — return empty objects for those.`}`;

      // === LEAGUE CONTEXT for AI prompt ===
      const leagueContext = isRedraft ? (() => {
        const lg = result.league || {};
        const lineup = lg.lineup || {};
        const parts = [];
        if (lg.teams) parts.push(`${lg.teams}-team league`);
        if (lg.scoring) parts.push(lg.scoring);
        if (lg.isSuperflex) parts.push("SUPERFLEX (2QB required)");
        const lineupStr = Object.entries(lineup).filter(([,v]) => v > 0)
          .map(([k,v]) => `${v} ${k}`).join(", ");
        if (lineupStr) parts.push(`Lineup: ${lineupStr}`);
        if (lg.benchSize) parts.push(`${lg.benchSize} bench spots`);
        return parts.join(" · ");
      })() : "";

      // === RECENT NEWS CONTEXT — roster-filtered (KV overrides hardcoded) ===
      const newsContext = (result.valid || [])
        .map(p => {
          const key = normalize(p.name);
          return mergedNews[key] ? `${p.name}: ${mergedNews[key]}` : null;
        })
        .filter(Boolean)
        .join("\n");

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
${situationsContext ? `\nPlayer situations (verified app data — use as ground truth):\n${situationsContext}` : ""}
${newsContext ? `\nRecent news (breaking updates — override everything above for these players):\n${newsContext}` : ""}
Analyze this best ball roster. Return JSON only.`;

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (!response.ok) throw new Error("API error");
      const data = await response.json();
      const raw = data?.content?.[0]?.text?.trim();
      if (!raw) return;

      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      if (parsed.nutshell) setAiNutshell(parsed.nutshell);
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
      // Silent fail — static content stays as fallback
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
      fetchAiNutshell(result);
    } else {
      const fmt = TOURNAMENTS[tournament].format || "standard";
      const picks = parseRoster(input, fmt);
      const result = analyzeRoster(picks, tournament, showPickAnalysis && picks.hasPickNumbers, dataMode === "projected");
      setAnalyzed(result);
      fetchAiNutshell(result);
    }
  };

  const handleExample = () => {
    // Pick the example that flexes the active analysis mode's best output.
    setInput(analysisMode === "redraft" ? exampleRosterRedraft : exampleRosterBestBall);
  };

  const tierStyle = (color) => {
    const styles = {
      elite: { bg: "#0d3320", border: "#22c55e", text: "#4ade80" },
      solid: { bg: "#1e2a1a", border: "#84cc16", text: "#a3e635" },
      neutral: { bg: "#2a2618", border: "#eab308", text: "#facc15" },
      tough: { bg: "#2a1a18", border: "#f97316", text: "#fb923c" },
      wall: { bg: "#2e1414", border: "#ef4444", text: "#f87171" },
    };
    return styles[color] || styles.neutral;
  };

  const gradeColor = (g) => {
    if (g.startsWith("A")) return "#4ade80";
    if (g.startsWith("B")) return "#a3e635";
    if (g.startsWith("C")) return "#facc15";
    return "#f87171";
  };

  // Shared style for native select dropdowns in custom builder (mobile-friendly)
  const selectStyle = {
    width: "100%",
    background: "#161020",
    color: "#fafafa",
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
      { text: "#60a5fa", border: "#3b82f6", bg: "#0e1a2e", label: "W15" }, // blue
      { text: "#c084fc", border: "#a855f7", bg: "#1a1030", label: "W16" }, // purple
      { text: "#2dd4bf", border: "#14b8a6", bg: "#0d2420", label: "W17" }, // teal
    ];
    return palette[weekIdx] || palette[0];
  };

  // Position palette — fourth dedicated color family. Distinct from matchups
  // (green/red), weeks (blue/purple/teal). Each position gets one consistent color
  // wherever it appears, so a user scanning the page can group by position visually.
  const posColor = (pos) => {
    const map = {
      QB: { text: "#fbbf24", border: "#f59e0b", bg: "#2a1f08" }, // amber
      RB: { text: "#22d3ee", border: "#06b6d4", bg: "#08222a" }, // cyan
      WR: { text: "#f472b6", border: "#ec4899", bg: "#2a0e1e" }, // pink/magenta
      TE: { text: "#a78bfa", border: "#8b5cf6", bg: "#1a1230" }, // violet
    };
    return map[pos] || { text: "#888", border: "#444", bg: "#1a1a1a" };
  };

  // Reusable color-key legend so any-skill users learn the matchup scale once.
  // Green = great matchup for your player, red = brutal.
  const MatchupLegend = () => (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: "10px",
      fontSize: "9px",
      color: "#888",
      marginBottom: "12px",
      letterSpacing: "0.03em",
      alignItems: "center",
    }}>
      <span style={{ color: "#666", textTransform: "uppercase", letterSpacing: "0.1em" }}>Matchup:</span>
      <span style={{ color: "#4ade80", fontWeight: 600 }}>Smash</span>
      <span style={{ color: "#a3e635", fontWeight: 600 }}>Good</span>
      <span style={{ color: "#facc15", fontWeight: 600 }}>Even</span>
      <span style={{ color: "#fb923c", fontWeight: 600 }}>Hard</span>
      <span style={{ color: "#f87171", fontWeight: 600 }}>Avoid</span>
      <span style={{ color: "#555" }}>· vs that week's opponent defense</span>
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      color: "#e5e5e5",
      fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
      padding: "24px 24px 0 24px",
      margin: 0,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Bebas+Neue&display=swap');

        *, *::before, *::after { box-sizing: border-box; }
        html, body {
          margin: 0;
          padding: 0;
          background: #0a0a0a;
          min-height: 100%;
        }
        #root {
          margin: 0;
          padding: 0;
          background: #0a0a0a;
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
          scrollbar-color: #333 #0a0a0a;
        }
        .scroll-shadow::-webkit-scrollbar { width: 6px; }
        .scroll-shadow::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        button:hover:not(:disabled) { filter: brightness(1.15); }
        textarea:focus { outline: none; border-color: #4ade80 !important; }

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
          50%       { box-shadow: 0 0 10px 2px rgba(74, 222, 128, 0.25); }
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
      `}</style>

      {/* Header */}
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{
          borderBottom: "1px solid #222",
          paddingBottom: "16px",
          marginBottom: "24px",
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
            <h1 style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "50px",
              letterSpacing: "0.03em",
              margin: 0,
              color: "#fafafa",
              lineHeight: 1,
            }}>
              ROSTER{" "}
              <span
                className="xray-gradient-flicker"
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
            </h1>
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
          <div style={{ fontSize: "10px", color: "#666", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "8px" }}>
            Analysis Mode
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <button
              onClick={() => { setAnalysisMode("bestball"); setAnalyzed(null); setInput(""); setExportedDataUrl(null); }}
              style={{
                background: analysisMode === "bestball" ? "#0d3320" : "#0f0f0f",
                border: `1px solid ${analysisMode === "bestball" ? "#22c55e" : "#222"}`,
                borderRadius: "4px",
                padding: "14px 16px",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: "13px", color: analysisMode === "bestball" ? "#4ade80" : "#fafafa", fontWeight: 600, letterSpacing: "0.02em" }}>
                🏆 Best Ball Tournament
              </div>
              <div style={{ fontSize: "10px", color: "#666", marginTop: "4px" }}>
                Find your stacks · exploit playoff matchups · win
              </div>
            </button>
            <button
              onClick={() => { setAnalysisMode("redraft"); setAnalyzed(null); setInput(""); setExportedDataUrl(null); }}
              style={{
                background: analysisMode === "redraft" ? "#1e1a3a" : "#0f0f0f",
                border: `1px solid ${analysisMode === "redraft" ? "#a855f7" : "#222"}`,
                borderRadius: "4px",
                padding: "14px 16px",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: "13px", color: analysisMode === "redraft" ? "#c084fc" : "#fafafa", fontWeight: 600, letterSpacing: "0.02em" }}>
                💰 Redraft League
              </div>
              <div style={{ fontSize: "10px", color: "#666", marginTop: "4px" }}>
                Weekly matchups · money on the line · don't blow it
              </div>
            </button>
          </div>
        </div>

        {/* Data Mode Toggle: 2025 Actual vs 2026 Projected */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "10px", color: "#666", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "8px" }}>
            Data Mode
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <button
              onClick={() => { setDataMode("actual"); setAnalyzed(null); }}
              style={{
                background: dataMode === "actual" ? "#0d1f33" : "#0f0f0f",
                border: `1px solid ${dataMode === "actual" ? "#22d3ee" : "#222"}`,
                borderRadius: "4px", padding: "12px 14px",
                cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              }}
            >
              <div style={{ fontSize: "13px", color: dataMode === "actual" ? "#22d3ee" : "#fafafa", fontWeight: 600 }}>
                📊 2025 Data
              </div>
              <div style={{ fontSize: "10px", color: "#666", marginTop: "4px" }}>
                Real stats from last season
              </div>
            </button>
            <button
              onClick={() => { setDataMode("projected"); setAnalyzed(null); }}
              style={{
                background: dataMode === "projected" ? "#1a1200" : "#0f0f0f",
                border: `1px solid ${dataMode === "projected" ? "#f59e0b" : "#222"}`,
                borderRadius: "4px", padding: "12px 14px",
                cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              }}
            >
              <div style={{ fontSize: "13px", color: dataMode === "projected" ? "#fbbf24" : "#fafafa", fontWeight: 600 }}>
                🔮 2026 Est.
              </div>
              <div style={{ fontSize: "10px", color: "#666", marginTop: "4px" }}>
                Adjusted for offseason moves
              </div>
            </button>
          </div>
          {dataMode === "projected" && (
            <div style={{
              marginTop: "8px", padding: "8px 12px",
              background: "#1a1200", border: "1px solid #f59e0b55",
              borderRadius: "4px", display: "flex", alignItems: "flex-start", gap: "8px",
            }}>
              <span style={{ fontSize: "12px", flexShrink: 0 }}>⚠️</span>
              <div style={{ fontSize: "10px", color: "#d97706", lineHeight: 1.5 }}>
                <strong>Estimated mode</strong> — matchup ratings reflect projected 2026 defensive changes based on offseason moves. These are not real stats. Switch to <strong>2025 Data</strong> for ground truth.
              </div>
            </div>
          )}
        </div>

        {/* Tournament selector — Best Ball only */}
        {analysisMode === "bestball" && (
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "10px", color: "#666", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "8px" }}>
            Tournament Structure
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "6px" }}>
            {Object.entries(TOURNAMENTS).map(([key, t]) => (
              <button
                key={key}
                onClick={() => {
                  setTournament(key);
                  if (analyzed) {
                    const fmt = TOURNAMENTS[key].format || "standard";
                    const picks = parseRoster(input, fmt);
                    const result = analyzeRoster(picks, key, picks.hasPickNumbers, dataMode === "projected");
                    setAnalyzed(result);
                  }
                }}
                style={{
                  background: tournament === key ? "#0d3320" : "#0f0f0f",
                  border: `1px solid ${tournament === key ? "#22c55e" : "#222"}`,
                  borderRadius: "4px",
                  padding: "10px 12px",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
                  <span style={{
                    fontSize: "12px",
                    color: tournament === key ? "#4ade80" : "#fafafa",
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                  }}>
                    {t.name}
                  </span>
                  <span style={{ fontSize: "9px", color: "#666", letterSpacing: "0.05em" }}>
                    {t.entries}
                  </span>
                </div>
                <div style={{ fontSize: "10px", color: "#666", marginTop: "4px", lineHeight: 1.4 }}>
                  {t.format === "superflex" ? (
                    <span style={{ color: "#a855f7" }}>SUPERFLEX · 4for4 ADP</span>
                  ) : (
                    <>W15·{t.weights[0]}x  W16·{t.weights[1]}x  W17·{t.weights[2]}x</>
                  )}
                </div>
              </button>
            ))}
          </div>
          <div style={{ fontSize: "10px", color: "#555", marginTop: "6px", letterSpacing: "0.03em" }}>
            {TOURNAMENTS[tournament].note}
          </div>
        </div>
        )}

        {/* Redraft League selector — 3 quick presets + Custom builder */}
        {analysisMode === "redraft" && (
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "10px", color: "#666", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "8px" }}>
            League Configuration
          </div>

          {/* Quick preset buttons + Custom toggle */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "6px" }}>
            {Object.entries(REDRAFT_LEAGUES).map(([key, l]) => (
              <button
                key={key}
                onClick={() => {
                  setRedraftLeague(key);
                  setCustomExpanded(false);
                  if (analyzed) {
                    const picks = parseRosterRedraft(input);
                    const result = analyzeRedraft(picks, REDRAFT_LEAGUES[key], picks.hasPickNumbers, dataMode === "projected");
                    setAnalyzed(result);
                  }
                }}
                style={{
                  background: redraftLeague === key ? "#1e1a3a" : "#0f0f0f",
                  border: `1px solid ${redraftLeague === key ? "#a855f7" : "#222"}`,
                  borderRadius: "4px",
                  padding: "10px 12px",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
                  <span style={{
                    fontSize: "12px",
                    color: redraftLeague === key ? "#c084fc" : "#fafafa",
                    fontWeight: 600,
                  }}>
                    {l.name}
                  </span>
                  <span style={{ fontSize: "9px", color: "#666" }}>
                    {l.scoring}
                  </span>
                </div>
                <div style={{ fontSize: "10px", color: "#666", marginTop: "4px" }}>
                  {Object.entries(l.lineup).filter(([, c]) => c > 0).map(([p, c]) => `${c}${p}`).join(" · ")}
                </div>
              </button>
            ))}
            {/* Custom button */}
            <button
              onClick={() => {
                setRedraftLeague("custom");
                setCustomExpanded(true);
                if (analyzed) {
                  const picks = parseRosterRedraft(input);
                  const result = analyzeRedraft(picks, buildLeagueFromConfig(customConfig), picks.hasPickNumbers, dataMode === "projected");
                  setAnalyzed(result);
                }
              }}
              style={{
                background: redraftLeague === "custom" ? "#1e1a3a" : "#0f0f0f",
                border: `1px solid ${redraftLeague === "custom" ? "#a855f7" : "#222"}`,
                borderRadius: "4px",
                padding: "10px 12px",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
                <span style={{
                  fontSize: "12px",
                  color: redraftLeague === "custom" ? "#c084fc" : "#fafafa",
                  fontWeight: 600,
                }}>
                  ⚙ Custom
                </span>
                <span style={{ fontSize: "9px", color: "#666" }}>
                  {customExpanded ? "▼" : "▶"}
                </span>
              </div>
              <div style={{ fontSize: "10px", color: "#666", marginTop: "4px" }}>
                Build your own league · match your exact setup
              </div>
            </button>
          </div>

          {/* Selected league context line */}
          <div style={{ fontSize: "10px", color: "#555", marginTop: "6px", letterSpacing: "0.03em" }}>
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
              <div style={{ fontSize: "10px", color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>
                Customize Your League
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "8px",
              }}>
                {/* Teams */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", color: "#888", marginBottom: "3px", letterSpacing: "0.05em", textTransform: "uppercase" }}>Teams</label>
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
                  <label style={{ display: "block", fontSize: "10px", color: "#888", marginBottom: "3px", letterSpacing: "0.05em", textTransform: "uppercase" }}>Scoring</label>
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
                  <label style={{ display: "block", fontSize: "10px", color: "#888", marginBottom: "3px", letterSpacing: "0.05em", textTransform: "uppercase" }}>QB Slots</label>
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
                  </select>
                </div>

                {/* RB slots */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", color: "#888", marginBottom: "3px", letterSpacing: "0.05em", textTransform: "uppercase" }}>RB Slots</label>
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
                  </select>
                </div>

                {/* WR slots */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", color: "#888", marginBottom: "3px", letterSpacing: "0.05em", textTransform: "uppercase" }}>WR Slots</label>
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
                  </select>
                </div>

                {/* TE slots */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", color: "#888", marginBottom: "3px", letterSpacing: "0.05em", textTransform: "uppercase" }}>TE Slots</label>
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
                  </select>
                </div>

                {/* FLEX slots */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", color: "#888", marginBottom: "3px", letterSpacing: "0.05em", textTransform: "uppercase" }}>FLEX</label>
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
                  </select>
                </div>

                {/* SFLEX slot (QB/RB/WR/TE) */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", color: "#888", marginBottom: "3px", letterSpacing: "0.05em", textTransform: "uppercase" }}>SFLEX</label>
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
                  </select>
                </div>

                {/* Bench size */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", color: "#888", marginBottom: "3px", letterSpacing: "0.05em", textTransform: "uppercase" }}>Bench</label>
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
                  <label style={{ display: "block", fontSize: "10px", color: "#888", marginBottom: "3px", letterSpacing: "0.05em", textTransform: "uppercase" }}>IR</label>
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
                  <label style={{ display: "block", fontSize: "10px", color: "#888", marginBottom: "3px", letterSpacing: "0.05em", textTransform: "uppercase" }}>Playoffs</label>
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


        {/* Mode toggle */}
        <div style={{ display: "flex", gap: "0", marginBottom: "16px", borderBottom: "1px solid #222" }}>
          <button
            onClick={() => { setMode("upload"); setUploadTabClicked(true); }}
            className={!uploadTabClicked && mode !== "upload" ? "upload-tab-glow" : ""}
            style={{
              background: "transparent",
              color: mode === "upload" ? "#4ade80" : "#666",
              border: "none",
              borderBottom: mode === "upload" ? "2px solid #4ade80" : "2px solid transparent",
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
              color: mode === "paste" ? "#4ade80" : "#666",
              border: "none",
              borderBottom: mode === "paste" ? "2px solid #4ade80" : "2px solid transparent",
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
                border: `2px dashed ${dragOver ? "#4ade80" : "#333"}`,
                background: dragOver ? "#0d1f14" : "#0d0d0d",
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
              <div style={{ fontSize: "14px", color: "#fafafa", marginBottom: "6px", fontWeight: 600 }}>
                Drop your roster screenshot — see what your league-mates can't
              </div>
              <div style={{ fontSize: "11px", color: "#666", letterSpacing: "0.05em" }}>
                Underdog · Yahoo · Sleeper · ESPN · works with any screenshot
              </div>
              <div style={{ fontSize: "10px", color: "#888", letterSpacing: "0.04em", marginTop: "6px" }}>
                For best results: upload all roster screens · 18 players (best ball) · full roster for redraft · K/DEF auto-filtered
              </div>
            </div>

            {/* Image previews */}
            {uploadedImages.length > 0 && (
              <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "8px" }}>
                {uploadedImages.map((img, i) => (
                  <div key={i} style={{ position: "relative", border: "1px solid #222", borderRadius: "4px", overflow: "hidden", background: "#0a0a0a" }}>
                    <img src={img.preview} alt={img.name} style={{ width: "100%", height: "120px", objectFit: "cover", display: "block" }} />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        background: "rgba(0,0,0,0.8)",
                        color: "#f87171",
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
              <div style={{ marginTop: "10px", padding: "10px 14px", background: "#2e1414", border: "1px solid #7c2d12", borderRadius: "4px", color: "#fb923c", fontSize: "12px" }}>
                {extractError}
              </div>
            )}

            {debugResponse && (
              <details style={{ marginTop: "8px" }} open={!!extractError}>
                <summary style={{ cursor: "pointer", fontSize: "11px", color: "#666", letterSpacing: "0.1em", textTransform: "uppercase", padding: "6px 0" }}>
                  Show Debug Response
                </summary>
                <pre style={{
                  background: "#0a0a0a",
                  border: "1px solid #222",
                  borderRadius: "3px",
                  padding: "10px",
                  fontSize: "10px",
                  color: "#888",
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
                style={{
                  background: "#4ade80",
                  color: "#0a0a0a",
                  border: "none",
                  padding: "10px 24px",
                  fontSize: "12px",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: uploadedImages.length > 0 && !extracting ? "pointer" : "not-allowed",
                  opacity: uploadedImages.length > 0 && !extracting ? 1 : 0.4,
                  borderRadius: "3px",
                }}
              >
                {extracting ? <span><span className="strobe-dot" style={{ marginRight: "5px" }}>●</span>Extracting…</span> : "Extract & Analyze →"}
              </button>
              {uploadedImages.length > 0 && (
                <button
                  onClick={() => { uploadedImages.forEach(i => URL.revokeObjectURL(i.preview)); setUploadedImages([]); }}
                  style={{
                    background: "transparent",
                    color: "#888",
                    border: "1px solid #333",
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
              borderLeft: "3px solid #4ade80",
              borderRadius: "5px",
              padding: "12px 14px",
              marginBottom: "12px",
            }}>
              <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px" }}>
                📋 How to paste your roster (15 sec)
              </div>
              <div style={{ fontSize: "12px", color: "#cfcfcf", lineHeight: 1.6 }}>
                <div style={{ marginBottom: "4px" }}><span style={{ color: "#4ade80", fontWeight: 700 }}>1.</span> Screenshot your roster on Underdog / Yahoo / Sleeper / ESPN.</div>
                <div style={{ marginBottom: "4px" }}><span style={{ color: "#4ade80", fontWeight: 700 }}>2.</span> Open the screenshot in Photos. Press-and-hold the player names — your phone selects the text <span style={{ color: "#888" }}>(iPhone "Live Text" · Android "Lens")</span>. Tap <span style={{ color: "#fff" }}>Copy</span>.</div>
                <div><span style={{ color: "#4ade80", fontWeight: 700 }}>3.</span> Paste it in the box below and hit Analyze.</div>
              </div>
              <div style={{ fontSize: "11px", color: "#888", marginTop: "9px", paddingTop: "8px", borderTop: "1px solid #1e3a28", lineHeight: 1.6 }}>
                <span style={{ color: "#aaa", fontWeight: 600 }}>Best format:</span> one player per line, pick number at the end —
                <div style={{ marginTop: "4px", fontFamily: "inherit", color: "#7dd3a8", background: "#0a140e", borderRadius: "3px", padding: "6px 9px" }}>
                  Jayden Daniels 64<br/>Bijan Robinson 2<br/>Nico Collins 19
                </div>
                <span style={{ color: "#666" }}>Pick numbers are optional — names alone still work (you just won't get ADP value/reach flags).</span>
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
                borderLeft: "3px solid #4ade80",
                borderRadius: "5px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "10px", color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "2px" }}>
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
                background: "#111",
                color: "#e5e5e5",
                border: "1px solid #2a2a2a",
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
                border: `2px solid ${showPickAnalysis ? "#4ade80" : "#444"}`,
                borderRadius: "3px",
                background: showPickAnalysis ? "#4ade80" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.15s",
              }}>
                {showPickAnalysis && <span style={{ color: "#0a0a0a", fontSize: "10px", fontWeight: 900, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontSize: "11px", color: showPickAnalysis ? "#aaa" : "#555", lineHeight: 1.4 }}>
                My roster includes pick numbers — show ADP value / reach analysis
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
              <button
                onClick={handleAnalyze}
                disabled={!input.trim()}
                style={{
                  background: "#4ade80",
                  color: "#0a0a0a",
                  border: "none",
                  padding: "10px 24px",
                  fontSize: "12px",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: input.trim() ? "pointer" : "not-allowed",
                  opacity: input.trim() ? 1 : 0.4,
                  borderRadius: "3px",
                }}
              >
                Analyze →
              </button>

              {analyzed && (
                <button
                  onClick={() => { setAnalyzed(null); setInput(""); setAiNutshell(null); setAiLoading(false); setAiPivotNotes({}); setAiStandoutDetails({}); setAiBenchMoveNotes({}); setAiLineupNotes({}); setAiBringBackNotes({}); }}
                  style={{
                    background: "transparent",
                    color: "#666",
                    border: "1px solid #2a2a2a",
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

        {/* Output */}
        {analyzed && analyzed.mode !== "redraft" && (
          <div className="fade-in">
            {/* Grade banner */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "24px",
              alignItems: "center",
              background: "linear-gradient(135deg, #0f0f0f, #161616)",
              border: "1px solid #2a2a2a",
              borderRadius: "6px",
              padding: "24px",
              marginBottom: "20px",
            }}>
              <div className="grade-pulse" style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "110px",
                lineHeight: 1,
                color: gradeColor(analyzed.grade),
                letterSpacing: "-0.02em",
              }}>
                {analyzed.grade}
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#666", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "8px" }}>
                  Overall Ceiling Rating · <span style={{ color: "#4ade80" }}>{analyzed.tournament.name}</span>
                </div>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "13px" }}>
                  <span><span style={{ color: "#666" }}>QB</span> <span style={{ color: "#fafafa" }}>{analyzed.posCounts.QB}</span></span>
                  <span><span style={{ color: "#666" }}>RB</span> <span style={{ color: "#fafafa" }}>{analyzed.posCounts.RB}</span></span>
                  <span><span style={{ color: "#666" }}>WR</span> <span style={{ color: "#fafafa" }}>{analyzed.posCounts.WR}</span></span>
                  <span><span style={{ color: "#666" }}>TE</span> <span style={{ color: "#fafafa" }}>{analyzed.posCounts.TE}</span></span>
                  <span style={{ marginLeft: "auto", color: "#666" }}>
                    {analyzed.valid.length}/{analyzed.picks.length} matched
                  </span>
                </div>
                {analyzed.valid.length < 10 && (
                  <div style={{
                    marginTop: "10px",
                    padding: "8px 12px",
                    background: "#1a1200",
                    border: "1px solid #7c5c00",
                    borderRadius: "4px",
                    fontSize: "11px",
                    color: "#f59e0b",
                    letterSpacing: "0.03em",
                  }}>
                    ⚠ Only {analyzed.valid.length} player{analyzed.valid.length !== 1 ? "s" : ""} detected — upload more screens for a complete analysis · 18 players (best ball) · full roster for redraft · K/DEF auto-filtered
                  </div>
                )}
                {(analyzed.nutshell || aiLoading) && (
                  <div style={{
                    marginTop: "14px",
                    padding: "10px 12px",
                    background: "#0a0a0a",
                    border: "1px solid #222",
                    borderLeft: `3px solid ${gradeColor(analyzed.grade)}`,
                    borderRadius: "3px",
                    fontSize: "13px",
                    color: "#e5e5e5",
                    lineHeight: 1.55,
                  }}>
                    <div style={{ fontSize: "9px", color: "#666", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px" }}>
                      Your team in a nutshell
                      {aiLoading && (
                        <span className="strobe-dot" style={{ fontSize: "8px", color: "#4ade80", letterSpacing: "0.08em" }}>● ANALYZING</span>
                      )}
                      {aiNutshell && !aiLoading && (
                        <span style={{ fontSize: "8px", color: "#4ade80aa", letterSpacing: "0.08em" }}>✦ AI</span>
                      )}
                    </div>
                    {aiLoading ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {[100, 85, 70].map((w, i) => (
                          <div key={i} style={{
                            height: "12px",
                            width: `${w}%`,
                            background: "linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%)",
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
                <div style={{ marginTop: "12px", display: "flex", gap: "24px", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "#666", letterSpacing: "0.1em", textTransform: "uppercase" }}>Strengths</div>
                    <ul style={{ margin: "4px 0 0", padding: "0 0 0 16px", fontSize: "12px", color: "#a3e635" }}>
                      {analyzed.strengths.length > 0 ? analyzed.strengths.map((s, i) => <li key={i}>{s}</li>) : <li style={{ color: "#555" }}>None identified</li>}
                    </ul>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "#666", letterSpacing: "0.1em", textTransform: "uppercase" }}>Weaknesses</div>
                    <ul style={{ margin: "4px 0 0", padding: "0 0 0 16px", fontSize: "12px", color: "#fb923c" }}>
                      {analyzed.weaknesses.length > 0 ? analyzed.weaknesses.map((w, i) => <li key={i}>{w}</li>) : <li style={{ color: "#555" }}>None flagged</li>}
                    </ul>
                  </div>
                </div>

                {/* Grading explainer toggle */}
                <div style={{ marginTop: "12px" }}>
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
                      color: "#22d3ee",
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
                      background: "#0a0a0a",
                      border: "1px solid #1e1e1e",
                      borderRadius: "4px",
                    }}>
                      <div style={{ fontSize: "9px", color: "#555", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "8px" }}>
                        Grade factors · Best Ball
                      </div>
                      {[
                        { label: "Stacks", note: "QB + pass-catcher from same team. More stacks, better matchups = higher grade.", color: "#4ade80" },
                        { label: "Construction", note: "Right position counts. Targets: 6–7 WR, 5–6 RB, 2–3 TE, 2–3 QB.", color: "#4ade80" },
                        { label: "Playoff window", note: "W15–W17 opponent quality. Soft schedules rewarded, tough ones penalized.", color: "#4ade80" },
                        { label: "Bring-backs", note: "Players from both sides of a playoff game. Shootouts help multiple roster spots.", color: "#4ade80" },
                        { label: "AI review", note: "An AI layer adjusts the grade based on player situations the formula can't see.", color: "#22d3ee" },
                      ].map((f, i) => (
                        <div key={i} style={{ display: "flex", gap: "8px", alignItems: "baseline", marginBottom: i < 4 ? "6px" : 0 }}>
                          <span style={{ fontSize: "9px", fontWeight: 700, color: f.color, whiteSpace: "nowrap", minWidth: "80px" }}>{f.label}</span>
                          <span style={{ fontSize: "10px", color: "#666", lineHeight: 1.4 }}>{f.note}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{
                  marginTop: "14px",
                  paddingTop: "12px",
                  borderTop: "1px solid #1a1a1a",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                    <button
                      onClick={handleExportCard}
                      disabled={exportingCard}
                      style={{
                        background: exportingCard ? "#1a1a1a" : "linear-gradient(90deg, #1d4ed8, #2563eb)",
                        border: "1px solid #3b82f644",
                        borderRadius: "4px",
                        padding: "8px 16px",
                        color: exportingCard ? "#555" : "#93c5fd",
                        fontSize: "12px",
                        fontWeight: 700,
                        fontFamily: "'Inter', sans-serif",
                        letterSpacing: "0.03em",
                        cursor: exportingCard ? "default" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: exportingCard ? "none" : "0 0 12px #3b82f633",
                      }}
                    >
                      {exportingCard ? "⏳ Generating…" : "📤 Share X-Ray"}
                    </button>
                    <button
                      onClick={() => { setAnalyzed(null); setInput(""); setExportedDataUrl(null); setUploadedImages([]); setAiNutshell(null); setAiLoading(false); setAiPivotNotes({}); setAiStandoutDetails({}); setAiBenchMoveNotes({}); setAiLineupNotes({}); setAiBringBackNotes({}); }}
                      style={{
                        background: "transparent",
                        border: "1px solid #333",
                        borderRadius: "4px",
                        padding: "8px 14px",
                        color: "#555",
                        fontSize: "11px",
                        fontWeight: 600,
                        fontFamily: "'Inter', sans-serif",
                        letterSpacing: "0.03em",
                        cursor: "pointer",
                      }}
                    >
                      ↩ New Analysis
                    </button>
                  </div>
                  {exportedDataUrl && (
                    <div style={{ marginTop: "14px" }}>
                      <img
                        src={exportedDataUrl}
                        alt="Roster X-Ray Grade Card"
                        style={{ width: "100%", borderRadius: "6px", display: "block", marginBottom: "8px" }}
                      />
                      <div style={{ fontSize: "11px", color: "#555", lineHeight: 1.6 }}>
                        📱 <span style={{ color: "#888" }}>iOS:</span> Long-press the image → <strong style={{ color: "#aaa" }}>Add to Photos</strong> or <strong style={{ color: "#aaa" }}>Save to Files</strong><br />
                        💻 <span style={{ color: "#888" }}>Desktop:</span> Right-click → <strong style={{ color: "#aaa" }}>Save Image As</strong>
                      </div>
                    </div>
                  )}
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
                <div style={{ color: "#fb923c", fontWeight: 600, marginBottom: "4px", letterSpacing: "0.05em" }}>UNMATCHED</div>
                <div style={{ color: "#a8a29e" }}>
                  {analyzed.picks.filter(p => p.notFound).map(p => p.raw).join(" · ")}
                </div>
              </div>
            )}

            {/* Stacks */}
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "24px",
                letterSpacing: "0.05em",
                margin: "0 0 4px",
                color: "#fafafa",
              }}>
                STACKS · PLAYOFF MATCHUPS
              </h2>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "10px", lineHeight: 1.5, maxWidth: "640px" }}>
                A stack = a QB + at least one pass-catcher from the same team. When your QB throws a touchdown, your receiver scores too — <span style={{ color: "#22d3ee", fontWeight: 600 }}>double the upside</span>. The matchup rating shows how favorable their shared playoff schedule is.
              </div>
              <MatchupLegend />
              {analyzed.stackGrades.length === 0 && (
                <div style={{ color: "#666", fontSize: "13px", padding: "12px", border: "1px dashed #2a2a2a", borderRadius: "4px" }}>
                  No multi-player team groupings detected.
                </div>
              )}
              {analyzed.stackGrades.map((stack, idx) => {
                const total = stack.normalizedScore;
                const stackTier = total >= 12 ? "Elite" : total >= 10 ? "Strong" : total >= 8 ? "Neutral" : "Weak";
                const stackColor = total >= 12 ? "#4ade80" : total >= 10 ? "#a3e635" : total >= 8 ? "#facc15" : "#f87171";
                return (
                  <div key={idx} style={{
                    background: "#0f0f0f",
                    border: "1px solid #222",
                    borderRadius: "4px",
                    padding: "16px",
                    marginBottom: "10px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                      <div>
                        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "22px", color: "#fafafa", letterSpacing: "0.05em" }}>
                          {stack.team}
                        </span>
                        <span style={{ marginLeft: "10px", fontSize: "10px", color: "#666", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                          {stack.type} {stack.hasQB ? "· w/ QB" : "· no QB"}
                        </span>
                      </div>
                      <span style={{ fontSize: "11px", color: stackColor, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>
                        {stackTier} Matchups
                      </span>
                    </div>

                    <div style={{ fontSize: "12px", color: "#888", marginBottom: "10px" }}>
                      {stack.players.map(p => (
                        <span key={p.name} style={{ marginRight: "12px" }}>
                          <span style={{ color: "#fafafa" }}>{p.name}</span> <span style={{ color: "#555" }}>{p.pos}</span>
                        </span>
                      ))}
                    </div>

                    {/* Week grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                      {["W15", "W16", "W17"].map((wk, wkIdx) => {
                        const details = stack.weekDetails[wkIdx];
                        return (
                          <div key={wk} style={{
                            background: "#161616",
                            border: "1px solid #222",
                            borderRadius: "3px",
                            padding: "8px 10px",
                          }}>
                            <div style={{ fontSize: "10px", color: "#666", letterSpacing: "0.1em", marginBottom: "4px" }}>
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
                                  <span>{d.name} <span style={{ color: "#555" }}>({d.pos})</span></span>
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
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: "24px",
                  letterSpacing: "0.05em",
                  margin: "0 0 4px",
                  color: "#fafafa",
                }}>
                  BRING-BACK STACKS · SAME GAME
                </h2>
                <div style={{ fontSize: "11px", color: "#888", marginBottom: "10px", lineHeight: 1.5, maxWidth: "640px" }}>
                  You roster players from <span style={{ color: "#22d3ee", fontWeight: 600 }}>both sides</span> of the same playoff game. If that game turns into a shootout, multiple players on your team spike at once — stacked upside in the week that matters most.
                </div>
                {/* Week color key — categorical, not the matchup scale */}
                <div style={{ display: "flex", gap: "12px", fontSize: "9px", marginBottom: "12px", letterSpacing: "0.05em", flexWrap: "wrap" }}>
                  <span style={{ color: weekColor(0).text, fontWeight: 600 }}>● W15</span>
                  <span style={{ color: weekColor(1).text, fontWeight: 600 }}>● W16</span>
                  <span style={{ color: weekColor(2).text, fontWeight: 600 }}>● W17</span>
                  <span style={{ color: "#555" }}>· playoff week color</span>
                </div>
                {analyzed.bringBacks.map((bb, idx) => {
                  const wc = weekColor(bb.weekIdx);
                  const isCeiling = bb.isCeilingGame;
                  const aiNote = aiPivotNotes[`bringback_${bb.stackTeam}_${bb.opponent}_${bb.week}`];
                  return (
                  <div key={idx} style={{
                    background: isCeiling ? "#050d1a" : wc.bg,
                    border: isCeiling ? `1px solid #22d3ee99` : `1px solid ${wc.border}55`,
                    borderLeft: isCeiling ? `3px solid #22d3ee` : `3px solid ${wc.border}`,
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
                          color: "#22d3ee", fontWeight: 700, background: "#051520",
                          border: "1px solid #22d3ee66", borderRadius: "3px",
                          padding: "1px 7px", fontSize: "9px",
                        }}>🔥 CEILING GAME</span>
                      ) : bb.hasQB && (
                        <span style={{
                          color: "#4ade80", fontWeight: 700, background: "#0d3320",
                          border: "1px solid #22c55e66", borderRadius: "3px",
                          padding: "1px 7px", fontSize: "9px",
                        }}>★ QB GAME STACK</span>
                      )}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "12px", alignItems: "center", fontSize: "12px" }}>
                      <div>
                        <div style={{ color: "#888", fontSize: "10px", letterSpacing: "0.05em", marginBottom: "4px" }}>{bb.teamA.team}</div>
                        {bb.teamA.players.map(p => (
                          <div key={p.name} style={{ color: "#fafafa" }}>
                            {p.name} <span style={{ color: "#555" }}>{p.pos}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ color: wc.text, fontSize: "20px", textAlign: "center" }}>↔</div>
                      <div>
                        <div style={{ color: "#888", fontSize: "10px", letterSpacing: "0.05em", marginBottom: "4px" }}>{bb.teamB.team}</div>
                        {bb.teamB.players.map(p => (
                          <div key={p.name} style={{ color: "#fafafa" }}>
                            {p.name} <span style={{ color: "#555" }}>{p.pos}</span>
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
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: "24px",
                  letterSpacing: "0.05em",
                  margin: "0 0 4px",
                  color: "#fafafa",
                }}>
                  SOLO PICKS · NO TEAM STACK
                </h2>
                <div style={{ fontSize: "11px", color: "#888", marginBottom: "10px", lineHeight: 1.5, maxWidth: "640px" }}>
                  Players you drafted <span style={{ color: "#22d3ee", fontWeight: 600 }}>without any teammates</span>. Solo picks aren't automatically bad — what matters is their <span style={{ color: "#22d3ee", fontWeight: 600 }}>playoff matchup</span>. The chips below show each player's W15/W16/W17 difficulty.
                </div>
                <MatchupLegend />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "8px" }}>
                  {analyzed.orphans.sort((a, b) => b.normalized - a.normalized).map((o, i) => {
                    const s = tierStyle(o.color);
                    return (
                      <div key={i} style={{
                        background: "#0f0f0f",
                        border: "1px solid #2a2a2a",
                        borderRadius: "4px",
                        padding: "10px 12px",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                          <span style={{ fontSize: "12px", color: "#fafafa", fontWeight: 600 }}>{o.name}</span>
                          <span style={{ fontSize: "9px", color: "#666", letterSpacing: "0.05em" }}>{o.pos} · {o.team}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                          <span style={{
                            display: "inline-block",
                            fontSize: "9px",
                            color: o.tier === "Elite Window" ? "#4ade80"
                                 : o.tier === "Strong Matchups" ? "#a3e635"
                                 : o.tier === "Soft Spot" ? "#facc15"
                                 : "#fb923c",
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
                              color: "#22d3ee",
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
                                <div style={{ color: "#666", fontSize: "8px", letterSpacing: "0.05em" }}>{["W15", "W16", "W17"][j]}</div>
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
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: "24px",
                  letterSpacing: "0.05em",
                  margin: "0 0 4px",
                  color: "#fafafa",
                }}>
                  WHAT IF YOU HAD<span style={{ color: "#666" }}>...</span>
                </h2>
                <div style={{ fontSize: "11px", color: "#888", marginBottom: "8px", lineHeight: 1.5, maxWidth: "640px" }}>
                  Every pick has a road not taken. Here are the players sitting at <span style={{ color: "#22d3ee", fontWeight: 600 }}>similar ADP</span> as your picks — and whether grabbing them instead would have built a stronger roster.
                </div>
                {/* Upgrade tier legend */}
                <div style={{ display: "flex", gap: "10px", fontSize: "9px", marginBottom: "12px", letterSpacing: "0.05em", flexWrap: "wrap" }}>
                  <span style={{ color: "#4ade80", fontWeight: 600 }}>■ BIG UPGRADE</span>
                  <span style={{ color: "#facc15", fontWeight: 600 }}>■ UPGRADE</span>
                  <span style={{ color: "#60a5fa", fontWeight: 600 }}>■ SLIGHT</span>
                  <span style={{ color: "#333" }}>· vs your actual pick's playoff matchups</span>
                </div>
                {analyzed.topPivots.map((pivot, idx) => {
                  // Determine best alt tier for card left border color
                  const bestAlt = pivot.alternatives[0];
                  const cardAccent = bestAlt?.improvement >= 4 ? "#22c55e"
                    : bestAlt?.improvement >= 2 ? "#f59e0b"
                    : "#333";

                  return (
                  <div key={idx} style={{
                    background: "#0f0f0f",
                    border: "1px solid #222",
                    borderLeft: `3px solid ${cardAccent}`,
                    borderRadius: "4px",
                    padding: "10px 14px",
                    marginBottom: "8px",
                  }}>
                    {/* Picked player header */}
                    <div style={{ fontSize: "12px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span style={{ color: "#555", fontSize: "10px", fontFamily: "monospace" }}>Pick #{pivot.pickNum}</span>
                      <span style={{ color: "#ffffff", fontWeight: 700, fontSize: "13px" }}>{pivot.picked.name}</span>
                      <span style={{
                        fontSize: "9px", fontWeight: 700,
                        color: pivot.picked.pos === "QB" ? "#f59e0b" : pivot.picked.pos === "RB" ? "#22d3ee" : pivot.picked.pos === "WR" ? "#4ade80" : "#c084fc",
                        background: pivot.picked.pos === "QB" ? "#f59e0b18" : pivot.picked.pos === "RB" ? "#22d3ee18" : pivot.picked.pos === "WR" ? "#4ade8018" : "#c084fc18",
                        border: `1px solid ${pivot.picked.pos === "QB" ? "#f59e0b44" : pivot.picked.pos === "RB" ? "#22d3ee44" : pivot.picked.pos === "WR" ? "#4ade8044" : "#c084fc44"}`,
                        borderRadius: "3px", padding: "1px 5px", fontFamily: "monospace",
                      }}>{pivot.picked.pos}·{pivot.picked.team}</span>
                      <span style={{ color: "#444", fontSize: "10px", fontFamily: "monospace" }}>ADP {pivot.picked.adp}</span>
                    </div>
                    <div style={{ fontSize: "9px", color: "#444", letterSpacing: "0.08em", marginBottom: "6px", textTransform: "uppercase", fontFamily: "monospace" }}>Pivot Options</div>
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
                            <span style={{ color: "#444", fontSize: "10px" }}>{alt.pos} · {alt.team} · ADP {alt.adp}</span>
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
                              background: "linear-gradient(90deg, #22c55e, #16a34a)",
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
                              color: alt.brokenWeekLabel === "W16" ? "#f87171" : "#f97316",
                              fontWeight: 800,
                              padding: "2px 7px",
                              borderRadius: "3px",
                              fontSize: "9px",
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              flexShrink: 0,
                            }}>⚠ Breaks {alt.brokenWeekLabel} Bring-Back</span>
                          )}
                          <span style={{ color: "#888", fontSize: "10px", lineHeight: 1.4 }}>
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
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: "24px",
                  letterSpacing: "0.05em",
                  margin: "0 0 4px",
                  color: "#fafafa",
                }}>
                  BYE WEEK MAP
                </h2>
                <div style={{ fontSize: "11px", color: "#888", marginBottom: "6px", lineHeight: 1.5, maxWidth: "640px" }}>
                  Each bye week shows which of your players are sitting that week. Watch for <span style={{ color: "#22d3ee", fontWeight: 600 }}>stacked-position byes</span> — too many <span style={{ color: posColor("RB").text }}>RBs</span> or <span style={{ color: posColor("WR").text }}>WRs</span> on the same week creates a hole.
                </div>
                <div style={{ display: "flex", gap: "10px", fontSize: "9px", marginBottom: "10px", letterSpacing: "0.05em" }}>
                  <span style={{ color: posColor("QB").text, fontWeight: 600 }}>● QB</span>
                  <span style={{ color: posColor("RB").text, fontWeight: 600 }}>● RB</span>
                  <span style={{ color: posColor("WR").text, fontWeight: 600 }}>● WR</span>
                  <span style={{ color: posColor("TE").text, fontWeight: 600 }}>● TE</span>
                </div>
                <div style={{
                  background: "#0f0f0f",
                  border: "1px solid #222",
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
                        borderBottom: "1px solid #1a1a1a",
                        alignItems: "center",
                      }}>
                        <span style={{
                          fontSize: "12px",
                          color: conflict ? "#fb923c" : "#888",
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
                                color: "#e5e5e5",
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
                    <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #2a2a2a", fontSize: "10px", color: "#fb923c" }}>
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
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: "24px",
                  letterSpacing: "0.05em",
                  margin: "0 0 4px",
                  color: "#fafafa",
                }}>
                  FIELD DIFFERENTIATION
                </h2>
                <div style={{ fontSize: "11px", color: "#888", marginBottom: "12px", lineHeight: 1.5, maxWidth: "640px" }}>
                  Win big tournaments by being different from the field. <span style={{ color: "#22d3ee", fontWeight: 600 }}>Chalky teams</span> are owned by most of your opponents — low leverage. <span style={{ color: "#22d3ee", fontWeight: 600 }}>Leverage teams</span> are yours alone — that's where the edge lives.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "8px" }}>
                  {analyzed.stackGrades.map((stack, i) => {
                    const isLeverage = stack.uniqueness?.includes("Leverage");
                    const isChalk = stack.uniqueness?.includes("Chalk");
                    const color = isLeverage ? "#4ade80" : isChalk ? "#fb923c" : "#facc15";
                    const bg = isLeverage ? "#0d3320" : isChalk ? "#2a1a18" : "#2a2618";
                    return (
                      <div key={i} style={{
                        background: bg,
                        border: `1px solid ${color}`,
                        borderRadius: "4px",
                        padding: "10px 12px",
                      }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#fafafa", marginBottom: "4px" }}>
                          {stack.team}
                        </div>
                        <div style={{ fontSize: "10px", color: color, fontWeight: 600, letterSpacing: "0.05em" }}>
                          {stack.uniqueness?.toUpperCase()}
                        </div>
                        <div style={{ fontSize: "9px", color: "#666", marginTop: "4px" }}>
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
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: "24px",
                  letterSpacing: "0.05em",
                  margin: "0 0 4px",
                  color: "#fafafa",
                }}>
                  🎯 ROSTER STANDOUTS
                </h2>
                <div style={{ fontSize: "11px", color: "#888", marginBottom: "12px", lineHeight: 1.5, maxWidth: "640px" }}>
                  Your roster's <span style={{ color: "#22d3ee", fontWeight: 600 }}>best assets</span> — the picks most likely to win you a week. One highlight per player, picked from your <span style={{ color: "#22d3ee", fontWeight: 600 }}>biggest edges</span>.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "8px" }}>
                  {analyzed.rosterStandouts.map((s, i) => {
                    const pc = posColor(s.player.pos);
                    return (
                      <div key={i} style={{
                        background: "#0d1a12",
                        border: "1px solid #1e3a28",
                        borderLeft: "3px solid #4ade80",
                        borderRadius: "4px",
                        padding: "10px 12px",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                          <span style={{ fontSize: "16px" }}>{s.icon}</span>
                          <span style={{
                            fontSize: "9px",
                            color: "#4ade80",
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                          }}>{s.label}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "5px", gap: "8px" }}>
                          <span style={{ fontSize: "13px", color: "#fafafa", fontWeight: 600 }}>{s.player.name}</span>
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
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: "24px",
                  letterSpacing: "0.05em",
                  margin: "0 0 12px",
                  color: "#fafafa",
                }}>
                  ADP DELTAS
                </h2>
                <div style={{
                  background: "#0f0f0f",
                  border: "1px solid #222",
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
                      borderBottom: i < analyzed.adpFlags.length - 1 ? "1px solid #1a1a1a" : "none",
                    }}>
                      <span style={{ color: "#666", width: "32px" }}>#{p.actualPick}</span>
                      <span><span style={{ color: "#fafafa" }}>{p.name}</span> <span style={{ color: "#555" }}>{p.pos} · {p.team}</span></span>
                      <span style={{
                        color: p.delta > 0 ? "#4ade80" : "#fb923c",
                        fontWeight: 600,
                        fontSize: "11px",
                        letterSpacing: "0.05em",
                      }}>
                        {p.delta > 0 ? `+${p.delta.toFixed(0)} VALUE` : `${p.delta.toFixed(0)} REACH`}
                        <span style={{ color: "#555", marginLeft: "6px", fontWeight: 400 }}>(ADP {p.adp})</span>
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
                border: "1px dashed #333",
                borderRadius: "4px",
                fontSize: "11px",
                color: "#888",
                letterSpacing: "0.02em",
              }}>
                <span style={{ color: "#666", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>ADP Delta · </span>
                Add pick numbers to enable ADP delta analysis. Format: "Gibbs 1" or "1 Gibbs" or "Pick 24 Nabers".
              </div>
            )}

            {/* Full roster */}
            <div>
              <h2 style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "24px",
                letterSpacing: "0.05em",
                margin: "0 0 4px",
                color: "#fafafa",
              }}>
                FULL ROSTER
              </h2>
              <p style={{ fontSize: "11px", color: "#666", margin: "0 0 10px", maxWidth: "640px", lineHeight: 1.5 }}>
                {analyzed.hasPickNumbers
                  ? "Sorted by draft slot — your picks from Round 1 to the wire."
                  : "Your full roster. Add pick numbers to unlock draft slot and ADP value analysis."}
              </p>
              <div style={{
                background: "#0f0f0f",
                border: "1px solid #222",
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
                      borderBottom: i < analyzed.picks.length - 1 ? "1px solid #1a1a1a" : "none",
                      fontSize: "12px",
                      alignItems: "center",
                      opacity: p.notFound ? 0.4 : 1,
                    }}>
                      {analyzed.hasPickNumbers && (
                        <span style={{ color: "#444", fontSize: "10px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {pickNum != null ? `#${pickNum}` : "—"}
                        </span>
                      )}
                      <span>
                        <span style={{ color: "#fafafa", fontWeight: 600 }}>{p.name}</span>
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
                            color: "#fb923c",
                            background: "#2a1a0e",
                            border: "1px solid #fb923c55",
                            padding: "1px 5px",
                            borderRadius: "2px",
                          }}>
                            {rcFlag.roleCeiling === "slot_only" ? "SLOT TRAP" : "TD DEPENDENT"}
                          </span>
                        )}
                      </span>
                      <span style={{ color: "#555", fontSize: "10px" }}>
                        {p.team && BYES[p.team] ? `Bye ${BYES[p.team]}` : "—"}
                      </span>
                      <span style={{ color: "#666", fontSize: "10px" }}>
                        {p.adp ? `ADP ${p.adp}` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* === REDRAFT OUTPUT === */}
        {analyzed && analyzed.mode === "redraft" && (
          <div className="fade-in">
            {/* Grade banner */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "24px",
              alignItems: "center",
              background: "linear-gradient(135deg, #0f0f0f, #161616)",
              border: "1px solid #2a2a2a",
              borderRadius: "6px",
              padding: "24px",
              marginBottom: "20px",
            }}>
              <div className="grade-pulse" style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "110px",
                lineHeight: 1,
                color: gradeColor(analyzed.grade),
                letterSpacing: "-0.02em",
              }}>
                {analyzed.grade}
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#888", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "8px" }}>
                  Redraft Grade · <span style={{ color: "#c084fc" }}>{analyzed.league.name}</span>
                </div>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "13px" }}>
                  <span><span style={{ color: "#666" }}>QB</span> <span style={{ color: "#fafafa" }}>{analyzed.posCounts.QB}</span></span>
                  <span><span style={{ color: "#666" }}>RB</span> <span style={{ color: "#fafafa" }}>{analyzed.posCounts.RB}</span></span>
                  <span><span style={{ color: "#666" }}>WR</span> <span style={{ color: "#fafafa" }}>{analyzed.posCounts.WR}</span></span>
                  <span><span style={{ color: "#666" }}>TE</span> <span style={{ color: "#fafafa" }}>{analyzed.posCounts.TE}</span></span>
                  <span style={{ marginLeft: "auto", color: "#666" }}>
                    {analyzed.valid.length}/{analyzed.picks.length} matched
                  </span>
                </div>
                {analyzed.valid.length < 10 && (
                  <div style={{
                    marginTop: "10px",
                    padding: "8px 12px",
                    background: "#1a1200",
                    border: "1px solid #7c5c00",
                    borderRadius: "4px",
                    fontSize: "11px",
                    color: "#f59e0b",
                    letterSpacing: "0.03em",
                  }}>
                    ⚠ Only {analyzed.valid.length} player{analyzed.valid.length !== 1 ? "s" : ""} detected — upload more screens for a complete analysis · 18 players (best ball) · full roster for redraft · K/DEF auto-filtered
                  </div>
                )}
                {(analyzed.nutshell || aiLoading) && (
                  <div style={{
                    marginTop: "14px",
                    padding: "10px 12px",
                    background: "#0a0a0a",
                    border: "1px solid #222",
                    borderLeft: `3px solid ${gradeColor(analyzed.grade)}`,
                    borderRadius: "3px",
                    fontSize: "13px",
                    color: "#e5e5e5",
                    lineHeight: 1.55,
                  }}>
                    <div style={{ fontSize: "9px", color: "#666", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px" }}>
                      Your team in a nutshell
                      {aiLoading && (
                        <span className="strobe-dot" style={{ fontSize: "8px", color: "#c084fc", letterSpacing: "0.08em" }}>● ANALYZING</span>
                      )}
                      {aiNutshell && !aiLoading && (
                        <span style={{ fontSize: "8px", color: "#c084fcaa", letterSpacing: "0.08em" }}>✦ AI</span>
                      )}
                    </div>
                    {aiLoading ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {[100, 85, 70].map((w, i) => (
                          <div key={i} style={{
                            height: "12px",
                            width: `${w}%`,
                            background: "linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%)",
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
                <div style={{ marginTop: "12px", display: "flex", gap: "24px", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "#666", letterSpacing: "0.1em", textTransform: "uppercase" }}>Strengths</div>
                    <ul style={{ margin: "4px 0 0", padding: "0 0 0 16px", fontSize: "12px", color: "#a3e635" }}>
                      {analyzed.strengths.length > 0 ? analyzed.strengths.map((s, i) => <li key={i}>{s}</li>) : <li style={{ color: "#555" }}>None identified</li>}
                    </ul>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "#666", letterSpacing: "0.1em", textTransform: "uppercase" }}>Weaknesses</div>
                    <ul style={{ margin: "4px 0 0", padding: "0 0 0 16px", fontSize: "12px", color: "#fb923c" }}>
                      {analyzed.weaknesses.length > 0 ? analyzed.weaknesses.map((w, i) => <li key={i}>{w}</li>) : <li style={{ color: "#555" }}>None flagged</li>}
                    </ul>
                  </div>
                </div>

                {/* Grading explainer toggle — redraft */}
                <div style={{ marginTop: "12px" }}>
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
                      color: "#22d3ee",
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
                      background: "#0a0a0a",
                      border: "1px solid #1e1e1e",
                      borderRadius: "4px",
                    }}>
                      <div style={{ fontSize: "9px", color: "#555", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "8px" }}>
                        Grade factors · Redraft
                      </div>
                      {[
                        { label: "Lineup caliber", note: "Average ADP of your starters. Lower = better players = better grade.", color: "#c084fc" },
                        { label: "Depth", note: "Enough RBs and WRs to survive injuries. Targets: 4–5 RB, 5–6 WR.", color: "#c084fc" },
                        { label: "Bye weeks", note: "Starters sharing the same bye = lineup hole that week. Penalized by count.", color: "#c084fc" },
                        { label: "Playoff schedule", note: "W15–W17 matchup quality for your starters. Soft slates rewarded.", color: "#c084fc" },
                        { label: "AI review", note: "An AI layer adjusts the grade based on player situations the formula can't see.", color: "#22d3ee" },
                      ].map((f, i) => (
                        <div key={i} style={{ display: "flex", gap: "8px", alignItems: "baseline", marginBottom: i < 4 ? "6px" : 0 }}>
                          <span style={{ fontSize: "9px", fontWeight: 700, color: f.color, whiteSpace: "nowrap", minWidth: "90px" }}>{f.label}</span>
                          <span style={{ fontSize: "10px", color: "#666", lineHeight: 1.4 }}>{f.note}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{
                  marginTop: "14px",
                  paddingTop: "12px",
                  borderTop: "1px solid #2a2040",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                    <button
                      onClick={handleExportCard}
                      disabled={exportingCard}
                      style={{
                        background: exportingCard ? "#1a1a1a" : "linear-gradient(90deg, #1d4ed8, #2563eb)",
                        border: "1px solid #3b82f644",
                        borderRadius: "4px",
                        padding: "8px 16px",
                        color: exportingCard ? "#555" : "#93c5fd",
                        fontSize: "12px",
                        fontWeight: 700,
                        fontFamily: "'Inter', sans-serif",
                        letterSpacing: "0.03em",
                        cursor: exportingCard ? "default" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: exportingCard ? "none" : "0 0 12px #3b82f633",
                      }}
                    >
                      {exportingCard ? "⏳ Generating…" : "📤 Share X-Ray"}
                    </button>
                    <button
                      onClick={() => { setAnalyzed(null); setInput(""); setExportedDataUrl(null); setUploadedImages([]); setAiNutshell(null); setAiLoading(false); setAiPivotNotes({}); setAiStandoutDetails({}); setAiBenchMoveNotes({}); setAiLineupNotes({}); setAiBringBackNotes({}); }}
                      style={{
                        background: "transparent",
                        border: "1px solid #333",
                        borderRadius: "4px",
                        padding: "8px 14px",
                        color: "#555",
                        fontSize: "11px",
                        fontWeight: 600,
                        fontFamily: "'Inter', sans-serif",
                        letterSpacing: "0.03em",
                        cursor: "pointer",
                      }}
                    >
                      ↩ New Analysis
                    </button>
                  </div>
                  {exportedDataUrl && (
                    <div style={{ marginTop: "14px" }}>
                      <img
                        src={exportedDataUrl}
                        alt="Roster X-Ray Grade Card"
                        style={{ width: "100%", borderRadius: "6px", display: "block", marginBottom: "8px" }}
                      />
                      <div style={{ fontSize: "11px", color: "#555", lineHeight: 1.6 }}>
                        📱 <span style={{ color: "#888" }}>iOS:</span> Long-press the image → <strong style={{ color: "#aaa" }}>Add to Photos</strong> or <strong style={{ color: "#aaa" }}>Save to Files</strong><br />
                        💻 <span style={{ color: "#888" }}>Desktop:</span> Right-click → <strong style={{ color: "#aaa" }}>Save Image As</strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Starting Lineup */}
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "24px",
                letterSpacing: "0.05em",
                margin: "0 0 4px",
                color: "#fafafa",
              }}>
                STARTING LINEUP · OPTIMAL
              </h2>
              <p style={{ fontSize: "11px", color: "#666", margin: "0 0 10px", maxWidth: "640px", lineHeight: 1.5 }}>
                Your <span style={{ color: "#22d3ee", fontWeight: 600 }}>best possible lineup</span> based on ADP — the players most likely to start every week. ADP shown for reference.
              </p>
              <div style={{
                background: "#0f0f0f",
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
                        borderBottom: i < rows.length - 1 ? "1px solid #1a1a1a" : "none",
                        alignItems: "center",
                        fontSize: "12px",
                      }}>
                        <span style={{
                          color: r.isFirstInSlot ? "#c084fc" : "transparent",
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                          fontSize: "11px",
                        }}>
                          {r.slot}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                          <span style={{ color: "#fafafa", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                        <span style={{ color: "#666", fontSize: "10px", whiteSpace: "nowrap" }}>
                          ADP <span style={{ color: "#a8a8a8", fontWeight: 600 }}>{Math.round(r.player.adp)}</span>
                        </span>
                      </div>
                    );
                  });
                })()}
                <div style={{ fontSize: "10px", color: "#666", marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #2a2a2a", letterSpacing: "0.05em" }}>
                  Overall starting lineup avg ADP: <span style={{ color: "#c084fc", fontWeight: 600 }}>{analyzed.avgStarterADP.toFixed(1)}</span>
                </div>
              </div>
            </div>

            {/* Positional Depth */}
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "24px",
                letterSpacing: "0.05em",
                margin: "0 0 12px",
                color: "#fafafa",
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
                      background: "#0f0f0f",
                      border: `1px solid ${color}40`,
                      borderLeft: `3px solid ${color}`,
                      borderRadius: "4px",
                      padding: "10px 12px",
                    }}>
                      <div style={{ fontSize: "14px", color: "#fafafa", fontWeight: 600 }}>{pos}: {d.count}</div>
                      <div style={{ fontSize: "10px", color: "#666", marginTop: "4px" }}>
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
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: "24px",
                  letterSpacing: "0.05em",
                  margin: "0 0 4px",
                  color: "#fafafa",
                }}>
                  BYE WEEK CONFLICTS
                </h2>
                <p style={{ fontSize: "11px", color: "#666", margin: "0 0 10px", maxWidth: "640px", lineHeight: 1.5 }}>
                  When multiple starters <span style={{ color: "#22d3ee", fontWeight: 600 }}>share the same bye</span>, you're forced to start backups in their place. Critical = your entire position is on bye that week. Warning = partial hole.
                </p>
                {analyzed.criticalByeConflicts.map((c, i) => (
                  <div key={i} style={{
                    background: c.severity === "critical" ? "#2e1414" : c.severity === "warning" ? "#2a2618" : "#141414",
                    border: `1px solid ${c.severity === "critical" ? "#dc2626" : c.severity === "warning" ? "#eab308" : "#333"}`,
                    borderLeft: `3px solid ${c.severity === "critical" ? "#dc2626" : c.severity === "warning" ? "#eab308" : "#555"}`,
                    borderRadius: "3px",
                    padding: "8px 12px",
                    marginBottom: "6px",
                    fontSize: "12px",
                  }}>
                    <span style={{ color: c.severity === "critical" ? "#f87171" : c.severity === "warning" ? "#facc15" : "#666", fontWeight: c.severity === "info" ? 400 : 600, letterSpacing: "0.05em" }}>
                      {c.severity === "critical" ? "⚠ CRITICAL · " : c.severity === "warning" ? "⚠ " : "ℹ "}{c.msg}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Playoff Schedule */}
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "24px",
                letterSpacing: "0.05em",
                margin: "0 0 4px",
                color: "#fafafa",
              }}>
                PLAYOFF SCHEDULE · STARTERS
              </h2>
              <p style={{ fontSize: "11px", color: "#666", margin: "0 0 10px", maxWidth: "640px", lineHeight: 1.5 }}>
                The playoff weeks that <span style={{ color: "#22d3ee", fontWeight: 600 }}>make or break</span> your season. Each /10 score reflects how favorable a starter's W15–W17 matchups are — 7+ is <span style={{ color: "#4ade80", fontWeight: 600 }}>good</span>, 4 or below is a <span style={{ color: "#f87171", fontWeight: 600 }}>red flag</span>.
              </p>
              <MatchupLegend />
              <div style={{
                background: "#0f0f0f",
                border: "1px solid #2a1a3a",
                borderRadius: "4px",
                padding: "12px 16px",
              }}>
                {analyzed.playoffMatchups.map((p, i) => {
                  const scoreOf10 = Math.round((p.totalScore / 15) * 10);
                  const scoreColor = scoreOf10 >= 7 ? "#4ade80" : scoreOf10 <= 4 ? "#f87171" : "#facc15";
                  const pc = (() => {
                    if (p.pos === "QB") return { bg: "#fbbf2420", border: "#fbbf24", text: "#fbbf24" };
                    if (p.pos === "RB") return { bg: "#22d3ee20", border: "#22d3ee", text: "#22d3ee" };
                    if (p.pos === "WR") return { bg: "#f472b620", border: "#f472b6", text: "#f472b6" };
                    return { bg: "#a78bfa20", border: "#a78bfa", text: "#a78bfa" };
                  })();
                  return (
                    <div key={i} style={{
                      padding: "8px 0",
                      borderBottom: i < analyzed.playoffMatchups.length - 1 ? "1px solid #1a1a1a" : "none",
                    }}>
                      {/* Row 1: name + pos chip + score */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                          <span style={{ color: "#fafafa", fontSize: "12px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                          fontFamily: "'Bebas Neue', sans-serif",
                          letterSpacing: "0.03em",
                          flexShrink: 0,
                          marginLeft: "8px",
                        }}>
                          {scoreOf10}<span style={{ color: "#555", fontSize: "10px", fontWeight: 500 }}>/10</span>
                        </span>
                      </div>
                      {/* Row 2: matchup chips */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                        {p.playoffMatches.map((m, j) => {
                          const s = tierStyle(m.color);
                          return (
                            <span key={j} style={{
                              fontSize: "10px",
                              color: s.text,
                              fontWeight: 500,
                              whiteSpace: "nowrap",
                            }}>
                              W{m.week} {m.opp}·<span style={{ fontWeight: 700 }}>{m.tier}</span>
                            </span>
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
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "24px",
                letterSpacing: "0.05em",
                margin: "0 0 4px",
                color: "#fafafa",
              }}>
                WEEKLY ROAD AHEAD
              </h2>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "10px", lineHeight: 1.5, maxWidth: "640px" }}>
                Your full season at a glance — every starter, every week. Green weeks are <span style={{ color: "#4ade80" }}>smashable</span>; red weeks are <span style={{ color: "#f87171" }}>landmines</span>. The <span style={{ color: "#22d3ee", fontWeight: 600 }}>separator marks</span> where the playoffs begin.
              </div>
              <MatchupLegend />
              <div style={{
                background: "#0f0f0f",
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
                        background: "#0f0f0f",
                        zIndex: 2,
                        paddingLeft: "12px",
                        paddingRight: "10px",
                        fontSize: "9px",
                        color: "#555",
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
                                color: isPlayoff ? "#c084fc" : "#555",
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
                            borderTop: "1px solid #1a1a1a",
                            marginTop: "4px",
                          }}>
                            <div style={{
                              position: "sticky",
                              left: 0,
                              width: "120px",
                              flexShrink: 0,
                              background: "#0f0f0f",
                              zIndex: 2,
                              paddingLeft: "12px",
                              paddingRight: "10px",
                              fontSize: "9px",
                              color: "#888",
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
                          borderBottom: isLast ? "none" : "1px solid #1a1a1a",
                          opacity: isBench ? 0.78 : 1,
                        }}>
                          <div style={{
                            position: "sticky",
                            left: 0,
                            width: "120px",
                            flexShrink: 0,
                            background: "#0f0f0f",
                            zIndex: 2,
                            paddingLeft: "12px",
                            paddingRight: "10px",
                            minWidth: 0,
                          }}>
                            <div style={{ color: "#fafafa", fontWeight: 600, fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                                      background: "#1a1a1a",
                                      border: `1px solid ${isPlayoff ? "#3a2a4a" : "#2a2a2a"}`,
                                      borderRadius: "3px",
                                      padding: "3px 2px",
                                      textAlign: "center",
                                      color: "#555",
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
                                    <span style={{ color: "#666", fontSize: "8px" }}>{isAway ? "@" : ""}</span>{teamCode}
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
                        borderTop: "1px solid #1a1a1a",
                      }}>
                        <div style={{
                          position: "sticky",
                          left: 0,
                          background: "#0f0f0f",
                          zIndex: 2,
                          paddingLeft: "12px",
                          paddingRight: "10px",
                        }}>
                          <button
                            onClick={() => setBenchExpanded(!benchExpanded)}
                            style={{
                              background: benchExpanded ? "#1a1030" : "transparent",
                              border: `1px solid ${benchExpanded ? "#a855f7" : "#3a2a4a"}`,
                              color: benchExpanded ? "#c084fc" : "#888",
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
                <div style={{ fontSize: "9px", color: "#555", marginTop: "8px", paddingTop: "6px", borderTop: "1px solid #1a1a1a", letterSpacing: "0.05em", padding: "6px 12px 0" }}>
                  ← swipe to scroll all 18 weeks · <span style={{ color: "#c084fc", fontWeight: 600 }}>purple W15–W17</span> = playoff matchups · player names stay locked
                </div>
              </div>
            </div>

            {/* Lineup Confidence */}
            {analyzed.lineupConfidencePreview && analyzed.lineupConfidencePreview.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h2 style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: "24px",
                  letterSpacing: "0.05em",
                  margin: "0 0 4px",
                  color: "#fafafa",
                }}>
                  LINEUP CONFIDENCE
                </h2>
                <p style={{ fontSize: "11px", color: "#666", margin: "0 0 8px", maxWidth: "640px" }}>
                  Which starters to lock in and who to consider sitting — based on matchup tiers when you have options at that position.
                </p>
                <div style={{ display: "flex", gap: "14px", fontSize: "10px", marginBottom: "12px", flexWrap: "wrap" }}>
                  <span><span style={{ color: "#4ade80", fontWeight: 700 }}>▲ Start</span> <span style={{ color: "#555" }}>— great matchup, lock them in</span></span>
                  <span><span style={{ color: "#f87171", fontWeight: 700 }}>▼ Sit?</span> <span style={{ color: "#555" }}>— tough matchup, bench if you have options</span></span>
                </div>
                {analyzed.lineupConfidencePreview.map((wk, i) => (
                  <div key={i} style={{
                    background: "#0f0f0f",
                    border: "1px solid #1e1e1e",
                    borderRadius: "3px",
                    padding: "8px 12px",
                    marginBottom: "6px",
                  }}>
                    <div style={{
                      fontSize: "10px",
                      fontFamily: "'Bebas Neue', sans-serif",
                      letterSpacing: "0.1em",
                      color: wk.week >= 15 ? "#c084fc" : "#555",
                      marginBottom: "6px",
                    }}>
                      WEEK {wk.week}{wk.week >= 15 ? " · PLAYOFFS" : ""}
                    </div>
                    {wk.week >= 15 && aiLineupNotes[`W${wk.week}`] && (
                      <div style={{ fontSize: "10px", color: "#c084fcaa", lineHeight: 1.5, marginBottom: "8px", paddingBottom: "6px", borderBottom: "1px solid #2a2a2a", fontStyle: "italic" }}>
                        {aiLineupNotes[`W${wk.week}`]}
                      </div>
                    )}
                    {wk.locks.length > 0 && (
                      <div style={{ marginBottom: wk.concerns.length > 0 ? "6px" : 0 }}>
                        {wk.locks.map((l, j) => {
                          const pc = posColor(l.pos);
                          return (
                            <div key={j} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px", fontSize: "12px" }}>
                              <span style={{ color: "#4ade80", fontSize: "10px", width: "14px", flexShrink: 0 }}>▲</span>
                              <span style={{ color: "#fafafa", fontWeight: 600 }}>{l.name}</span>
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
                              <span style={{ color: "#4ade80", fontSize: "10px" }}>
                                vs {l.matchup.opp.replace("@","")} · {l.matchup.tier}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {wk.concerns.length > 0 && (
                      <div>
                        {wk.concerns.map((c, j) => {
                          const pc = posColor(c.pos);
                          return (
                            <div key={j} style={{ marginBottom: j < wk.concerns.length - 1 ? "6px" : 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: c.suggestion ? "4px" : "3px", fontSize: "12px" }}>
                                <span style={{ color: "#f87171", fontSize: "10px", width: "14px", flexShrink: 0 }}>▼</span>
                                <span style={{ color: "#fafafa", fontWeight: 600 }}>{c.name}</span>
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
                                <span style={{ color: "#f87171", fontSize: "10px" }}>
                                  vs {c.matchup.opp.replace("@","")} · {c.matchup.tier}
                                </span>
                              </div>
                              {c.suggestion && (() => {
                                const spc = posColor(c.suggestion.pos);
                                const isCrossPos = c.suggestion.pos !== c.pos;
                                return (
                                  <div style={{ paddingLeft: "20px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", marginBottom: "2px" }}>
                                      <span style={{ color: "#60a5fa", fontSize: "9px", flexShrink: 0 }}>💡</span>
                                      <span style={{ color: "#aaa" }}>
                                        <span style={{ color: "#fafafa", fontWeight: 600 }}>{c.suggestion.name.split(" ").pop()}</span>
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
                                        <span style={{ color: "#60a5fa", fontSize: "10px" }}>
                                          {c.suggestion.matchup.tier} matchup this week
                                        </span>
                                      </span>
                                    </div>
                                    {c.disclaimers && c.disclaimers.map((d, di) => (
                                      <div key={di} style={{ fontSize: "9px", color: "#666", paddingLeft: "12px", marginBottom: "1px", lineHeight: 1.4 }}>
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
                ))}
              </div>
            )}

            {/* Handcuffs */}
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "24px",
                letterSpacing: "0.05em",
                margin: "0 0 4px",
                color: "#fafafa",
              }}>
                HANDCUFFS · INSURANCE
              </h2>
              <p style={{ fontSize: "11px", color: "#666", margin: "0 0 12px", maxWidth: "640px", lineHeight: 1.5 }}>
                A handcuff is the <span style={{ color: "#22d3ee", fontWeight: 600 }}>backup RB</span> on the same team as your starter. If your RB1 gets hurt, the handcuff <span style={{ color: "#22d3ee", fontWeight: 600 }}>inherits the workload</span> — rostering them means you don't lose the value twice.
              </p>
              {analyzed.handcuffStatus.map((h, i) => (
                <div key={i} style={{
                  background: "#0f0f0f",
                  border: `1px solid ${h.hasHandcuff ? "#22c55e40" : "#f8717140"}`,
                  borderLeft: `3px solid ${h.hasHandcuff ? "#22c55e" : "#f87171"}`,
                  borderRadius: "3px",
                  padding: "8px 12px",
                  marginBottom: "6px",
                  fontSize: "12px",
                }}>
                  <span style={{ color: "#fafafa", fontWeight: 600 }}>{h.rb.name}</span>
                  <span style={{ color: "#555", marginLeft: "6px" }}>({h.rb.team})</span>
                  {h.hasHandcuff ? (
                    <span style={{ marginLeft: "10px", color: "#4ade80" }}>
                      ✓ Handcuffed: {h.handcuff.name} <span style={{ color: "#555" }}>(ADP {h.handcuff.adp})</span>
                    </span>
                  ) : (
                    <span style={{ marginLeft: "10px", color: "#f87171" }}>
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
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: "24px",
                  letterSpacing: "0.05em",
                  margin: "0 0 4px",
                  color: "#fafafa",
                }}>
                  BENCH MOVES
                </h2>
                <p style={{ fontSize: "11px", color: "#666", margin: "0 0 12px", maxWidth: "640px" }}>
                  Your bench, broken down by role — <span style={{ color: "#22d3ee", fontWeight: 600 }}>handcuffs</span> to lock in, <span style={{ color: "#22d3ee", fontWeight: 600 }}>streamers</span> to rotate in on good matchups, and <span style={{ color: "#22d3ee", fontWeight: 600 }}>bye-week fills</span> to plan around.
                </p>
                {analyzed.benchMoves.map((alert, i) => {
                  const urgencyBorder = alert.urgency === "high" ? "#22c55e" : alert.urgency === "medium" ? "#60a5fa" : "#555";
                  const urgencyBg = alert.urgency === "high" ? "#22c55e15" : alert.urgency === "medium" ? "#60a5fa10" : "#0f0f0f";
                  const pc = (() => {
                    const pos = alert.player.pos;
                    if (pos === "QB") return { bg: "#fbbf2420", border: "#fbbf24", text: "#fbbf24" };
                    if (pos === "RB") return { bg: "#22d3ee20", border: "#22d3ee", text: "#22d3ee" };
                    if (pos === "WR") return { bg: "#f472b620", border: "#f472b6", text: "#f472b6" };
                    return { bg: "#a78bfa20", border: "#a78bfa", text: "#a78bfa" };
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
                          fontFamily: "'Bebas Neue', sans-serif",
                          letterSpacing: "0.08em",
                          color: urgencyBorder,
                          background: `${urgencyBorder}20`,
                          padding: "2px 6px",
                          borderRadius: "2px",
                        }}>
                          {alert.label}
                        </span>
                        <span style={{ color: "#fafafa", fontWeight: 600 }}>{alert.player.name}</span>
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
                          <span style={{ color: "#666", marginLeft: "8px" }}>· {alert.matchupNote}</span>
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
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "24px",
                letterSpacing: "0.05em",
                margin: "0 0 4px",
                color: "#fafafa",
              }}>
                BENCH
              </h2>
              <p style={{ fontSize: "11px", color: "#666", margin: "0 0 10px", maxWidth: "640px", lineHeight: 1.5 }}>
                Your non-starters — depth for <span style={{ color: "#22d3ee", fontWeight: 600 }}>injuries, byes, matchups</span>. Bye week shown so you can plan ahead.
              </p>
              <div style={{
                background: "#0f0f0f",
                border: "1px solid #2a1a3a",
                borderRadius: "4px",
                padding: "12px 16px",
              }}>
                {analyzed.bench.map((p, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "12px", padding: "4px 0", borderBottom: i < analyzed.bench.length - 1 ? "1px solid #1a1a1a" : "none", fontSize: "12px", alignItems: "center" }}>
                    <span><span style={{ color: "#fafafa" }}>{p.name}</span> <span style={{ color: "#555" }}>{p.pos}·{p.team}</span></span>
                    <span style={{ color: "#666", fontSize: "10px" }}>Bye {BYES[p.team]}</span>
                    <span style={{ color: "#888", fontSize: "10px" }}>ADP {p.adp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{
          marginTop: "32px",
          paddingTop: "16px",
          borderTop: "1px solid #1a1a1a",
          fontSize: "10px",
          color: "#444",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}>
          ADP: Underdog half-PPR May 19 · FPA: 2025 Rotowire · EPA adj: 2026 coaching projections
        </div>

        {/* === HIDDEN EXPORT CARD (Option B — Reference Card) === */}
        <div
          ref={exportCardRef}
          style={{
            position: "fixed",
            top: 0,
            left: "-9999px",
            width: "420px",
            background: "#0a0a0a",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            border: "1px solid #1a1a1a",
            visibility: "hidden",
            boxSizing: "border-box",
            paddingLeft: "2px",
          }}
        >
          {analyzed && (() => {
            const isBB = analyzed.mode !== "redraft";
            const gc = analyzed.grade === "A" || analyzed.grade === "A-" ? "#4ade80"
              : analyzed.grade === "B+" || analyzed.grade === "B" ? "#a3e635"
              : analyzed.grade === "C+" || analyzed.grade === "C" ? "#facc15"
              : "#f87171";
            const accentColor = isBB ? "#22c55e" : "#c084fc";

            // Dynamic playoff week labels — respects W14-16 vs W15-17 league setting
            const cardPlayoffWeeks = isBB ? [15, 16, 17] : (analyzed.league?.playoffWeeks || [15, 16, 17]);
            const cardWkLabels = cardPlayoffWeeks.map(w => `W${w}`);

            // Shared inline styles
            const secLabel = { fontSize: "8px", color: "#666", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "7px", fontFamily: "'Inter', 'DM Sans', sans-serif", fontWeight: 600 };
            const row = { display: "flex", alignItems: "center", gap: "7px", padding: "3px 0", borderBottom: "1px solid #0d0d0d", fontSize: "11px" };
            const slotStyle = { fontSize: "9px", color: "#333", width: "26px", flexShrink: 0, fontFamily: "monospace" };
            const nameStyle = { color: "#e0e0e0", fontWeight: 500, flex: 1 };
            const teamStyle = { fontSize: "9px", color: "#3a3a3a" };

            const posChipStyle = (pos) => {
              const map = {
                QB: { bg: "#fbbf2418", border: "#fbbf2444", color: "#fbbf24" },
                RB: { bg: "#22d3ee18", border: "#22d3ee44", color: "#22d3ee" },
                WR: { bg: "#f472b618", border: "#f472b644", color: "#f472b6" },
                TE: { bg: "#a78bfa18", border: "#a78bfa44", color: "#a78bfa" },
                FLEX: { bg: "#94a3b818", border: "#94a3b844", color: "#94a3b8" },
              };
              const c = map[pos] || map.FLEX;
              return { fontSize: "8px", fontWeight: 700, background: c.bg, border: `1px solid ${c.border}`, color: c.color, padding: "0", width: "26px", height: "16px", borderRadius: "2px", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1, textAlign: "center", boxSizing: "border-box" };
            };

            const wkChipStyle = (color) => {
              const map = {
                elite:   { bg: "#0d2a18", color: "#4ade80" },
                solid:   { bg: "#1a2a0a", color: "#a3e635" },
                neutral: { bg: "#2a2000", color: "#facc15" },
                tough:   { bg: "#2a1400", color: "#fb923c" },
                wall:    { bg: "#2a0a0a", color: "#f87171" },
              };
              const c = map[color] || { bg: "#1a1a1a", color: "#444" };
              return { fontSize: "8px", fontWeight: 700, padding: "0", width: "28px", height: "16px", borderRadius: "2px", background: c.bg, color: c.color, fontFamily: "monospace", display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1, textAlign: "center", boxSizing: "border-box" };
            };

            const section = (children, extraStyle = {}) => ({
              padding: "8px 18px",
              borderBottom: "1px solid #111",
              ...extraStyle,
            });

            return (
              <div>
                {/* Header */}
                <div style={{ background: "#0f0f0f", borderBottom: "1px solid #1a1a1a", padding: "10px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 900, fontSize: "13px", letterSpacing: "0.2em", color: "#444", textTransform: "uppercase" }}>ROSTER X-RAY</div>
                  <div style={{ fontSize: "9px", color: accentColor, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    {isBB ? (analyzed.tournament?.name || "Best Ball") : (analyzed.league?.name || "Redraft")}
                  </div>
                </div>

                {/* Grade bar */}
                <div style={{ background: "#111", padding: "10px 16px", display: "flex", alignItems: "center", gap: "14px", borderBottom: "1px solid #1a1a1a" }}>
                  <div style={{ fontWeight: 900, fontSize: "52px", lineHeight: 1, color: gc, letterSpacing: "-0.01em", flexShrink: 0 }}>{analyzed.grade}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: "14px", marginBottom: "5px", fontSize: "12px" }}>
                      {["QB","RB","WR","TE"].map(pos => (
                        <span key={pos}><span style={{ color: "#444", fontSize: "10px" }}>{pos} </span><span style={{ color: "#fafafa", fontWeight: 600 }}>{analyzed.posCounts[pos] || 0}</span></span>
                      ))}
                    </div>
                    {(aiNutshell || analyzed.nutshell) && (
                      <div style={{ fontSize: "10px", color: "#888", lineHeight: 1.45 }}>{
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
                          <div key={i} style={{ fontSize: "9px", color: "#4ade80", lineHeight: 1.4 }}>✓ {s}</div>
                        ))}
                        {(analyzed.weaknesses || []).slice(0, 1).map((w, i) => (
                          <div key={i} style={{ fontSize: "9px", color: "#fb923c", lineHeight: 1.4 }}>⚠ {w}</div>
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
                              <div style={{ fontSize: "12px", fontWeight: 700, color: "#fafafa", letterSpacing: "0.05em" }}>{stack.team}</div>
                              <div style={{ fontSize: "8px", color: "#444", letterSpacing: "0.08em", textTransform: "uppercase" }}>{stack.type}{stack.hasQB ? " · w/ QB" : ""}</div>
                              {/* Fixed week column headers — dynamic based on league playoff weeks */}
                              <div style={{ display: "flex", gap: "2px", marginLeft: "auto" }}>
                                {cardWkLabels.map(wk => (
                                  <div key={wk} style={{ width: "30px", textAlign: "center", fontSize: "8px", color: "#555", fontFamily: "monospace", letterSpacing: "0.05em" }}>{wk}</div>
                                ))}
                              </div>
                            </div>
                            {/* One row per player */}
                            {players.map((p, pi) => (
                              <div key={pi} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "3px 0 3px 10px", borderBottom: pi < players.length - 1 ? "1px solid #0d0d0d" : "none" }}>
                                <span style={posChipStyle(p.pos)}>{p.pos}</span>
                                <div style={{ flex: 1, fontSize: "11px", color: "#e0e0e0" }}>{p.name}</div>
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
                          const posColors = { QB: "#f59e0b", RB: "#22d3ee", WR: "#4ade80", TE: "#c084fc" };
                          const pc = posColors[s.player?.pos] || "#888";
                          return (
                            <div key={i} style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "8px",
                              padding: "5px 0",
                              borderBottom: i < (analyzed.rosterStandouts||[]).length - 1 ? "1px solid #0d0d0d" : "none",
                            }}>
                              <div style={{ fontSize: "12px", flexShrink: 0, lineHeight: 1 }}>{s.icon}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "2px", flexWrap: "wrap" }}>
                                  <div style={{ fontSize: "8px", color: "#555", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "monospace" }}>{s.label}</div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "2px" }}>
                                  <div style={{ fontSize: "10px", color: "#e0e0e0", fontWeight: 700, paddingLeft: "2px" }}>{s.player?.name}</div>
                                  {s.player?.pos && (
                                    <div style={{ fontSize: "8px", fontWeight: 700, color: pc, background: pc + "18", border: "1px solid " + pc + "44", borderRadius: "3px", padding: "1px 4px", fontFamily: "monospace", flexShrink: 0 }}>
                                      {s.player.pos}{s.player.team ? "·" + s.player.team : ""}
                                    </div>
                                  )}
                                </div>
                                <div style={{ fontSize: "9px", color: "#666", lineHeight: 1.4 }}>{aiStandoutDetails[s.player?.name] || s.detail}</div>
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
                      const posColors = { QB: "#f59e0b", RB: "#22d3ee", WR: "#4ade80", TE: "#c084fc" };

                      // Component bar helper
                      const compBar = (label, val, max, color) => (
                        <div style={{ marginBottom: "7px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "3px" }}>
                            <div style={{ fontSize: "8px", color, opacity: 0.75, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Inter', 'DM Sans', sans-serif", fontWeight: 600 }}>{label}</div>
                            <div style={{ fontSize: "9px", color, fontWeight: 700, fontFamily: "'Inter', monospace" }}>{val.toFixed(1)}<span style={{ color: "#333", fontWeight: 400 }}>/{max}</span></div>
                          </div>
                          <div style={{ height: "3px", background: "#1a1a1a", borderRadius: "2px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${(val / max) * 100}%`, background: color, borderRadius: "2px", transition: "width 0.3s" }} />
                          </div>
                        </div>
                      );

                      return (
                        <>
                          {/* Thin divider between grade and CWS */}
                          <div style={{ height: "1px", background: "linear-gradient(to right, #222, #333, #222)", margin: "0" }} />

                          {/* CWS Centerpiece */}
                          <div style={{ ...section({}), background: "#0d0d0d", padding: "12px 18px" }}>
                            <div style={{ ...secLabel, marginBottom: "2px" }}>Playoff Ceiling Rating</div>
                            <div style={{ fontSize: "9px", color: "#555", lineHeight: 1.4, marginBottom: "8px" }}>
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
                                <div style={{ fontSize: "8px", color: "#444", fontFamily: "monospace", lineHeight: 1 }}>out of 10.0</div>
                              </div>
                            </div>
                            {/* Component bars */}
                            {compBar("Schedule Quality", cws.comp1, 4, cws.comp1 >= 3.5 ? "#4ade80" : cws.comp1 >= 2.5 ? "#facc15" : "#f87171")}
                            {compBar("Starter Caliber", cws.comp2, 4, cws.comp2 >= 3.5 ? "#4ade80" : cws.comp2 >= 2.5 ? "#facc15" : "#f87171")}
                            {compBar("Roster Situations", cws.comp3, 2, cws.comp3 >= 1.5 ? "#4ade80" : cws.comp3 >= 1.0 ? "#facc15" : "#f87171")}
                          </div>

                          {/* Playoff schedule chips — top 3 starters */}
                          <div style={section({})}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                              <div style={secLabel}>Playoff Threats</div>
                              <div style={{ display: "flex", gap: "2px" }}>
                                {cardWkLabels.map(wk => (
                                  <div key={wk} style={{ width: "28px", textAlign: "center", fontSize: "8px", color: "#555", fontFamily: "monospace" }}>{wk}</div>
                                ))}
                                <div style={{ width: "22px", textAlign: "right", fontSize: "8px", color: "#555", fontFamily: "monospace" }}>/10</div>
                              </div>
                            </div>
                            {[...(analyzed.playoffMatchups || [])]
                              .sort((a, b) => b.totalScore - a.totalScore)
                              .slice(0, 3)
                              .map((p, i, arr) => {
                                const score = Math.round((p.totalScore / 15) * 10);
                                const sc = score >= 7 ? "#4ade80" : score <= 4 ? "#f87171" : "#facc15";
                                const pc = posColors[p.pos] || "#888";
                                return (
                                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 0 4px 6px", borderBottom: i < arr.length - 1 ? "1px solid #0d0d0d" : "none" }}>
                                    <span style={posChipStyle(p.pos)}>{p.pos}</span>
                                    <div style={{ flex: 1, fontSize: "10px", color: "#e0e0e0", minWidth: 0 }}>{p.name}</div>
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
                                    <div style={{ width: "22px", textAlign: "right", fontSize: "10px", fontWeight: 700, color: sc, fontFamily: "monospace", flexShrink: 0 }}>{score}</div>
                                  </div>
                                );
                              })}
                          </div>

                          {/* Roster Situation Highlights */}
                          {cws.situationNotes.length > 0 && (
                            <div style={{ ...section({}), borderLeft: "3px solid #333", paddingLeft: "19px" }}>
                              <div style={secLabel}>Situation Highlights</div>
                              {cws.situationNotes.slice(0, 3).map((s, i) => {
                                const pc = posColors[(analyzed.valid || []).find(p => p.name === s.name)?.pos] || "#888";
                                const isRisk = s.risks.length > 0;
                                const trendIcon = s.trend === "rising" ? "↑" : s.trend === "falling" ? "↓" : "→";
                                const trendColor = s.trend === "rising" ? "#4ade80" : s.trend === "falling" ? "#f87171" : "#888";
                                return (
                                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "6px", padding: "5px 0 5px 6px", borderBottom: i < Math.min(cws.situationNotes.length, 3) - 1 ? "1px solid #0d0d0d" : "none" }}>
                                    <div style={{ fontSize: "10px", color: trendColor, flexShrink: 0, fontWeight: 700, paddingTop: "2px" }}>{trendIcon}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
                                        <div style={{ fontSize: "10px", color: "#e0e0e0", fontWeight: 700 }}>{s.name}</div>
                                        <div style={{ fontSize: "7px", color: isRisk ? "#fb923c" : "#4ade80", background: isRisk ? "#fb923c15" : "#4ade8015", border: `1px solid ${isRisk ? "#fb923c40" : "#4ade8040"}`, borderRadius: "2px", padding: "1px 4px", fontFamily: "monospace", letterSpacing: "0.06em", flexShrink: 0 }}>
                                          {isRisk ? "RISK" : "UPSIDE"}
                                        </div>
                                      </div>
                                      <div style={{ fontSize: "9px", color: "#666", lineHeight: 1.45 }}>{s.note}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* AI Breakdown — replaces static Scout Report */}
                          <div style={{ ...section({}), background: "#0a0a0a", borderLeft: `3px solid ${analyzed.grade === "A" || analyzed.grade === "A-" ? "#4ade80" : analyzed.grade === "B+" || analyzed.grade === "B" ? "#a3e635" : "#facc15"}`, paddingLeft: "15px" }}>
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
                                      ? <span key={si} style={{ color: "#e0e0e0", fontWeight: 700 }}>{seg.text}</span>
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
                  <div style={{ fontSize: "8px", color: "#444", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace" }}>ROSTER X-RAY · 2026</div>
                  <div style={{ fontSize: "8px", color: "#444", fontFamily: "monospace" }}>{isBB ? "Underdog half-PPR" : "Yahoo half-PPR"} · ADP May 19</div>
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

        const panel = { position: "fixed", inset: 0, background: "#0a0a0a", zIndex: 9999, overflowY: "auto", padding: "32px 24px", fontFamily: "'IBM Plex Mono', monospace", color: "#e0e0e0" };
        const label = { fontSize: "10px", color: "#666", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "6px", display: "block" };
        const input_ = { width: "100%", background: "#111", border: "1px solid #222", borderRadius: "4px", padding: "10px 12px", color: "#e0e0e0", fontSize: "13px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
        const btn = (color) => ({ background: color || "#22c55e", border: "none", borderRadius: "4px", padding: "10px 18px", color: "#000", fontSize: "12px", fontWeight: 700, fontFamily: "inherit", cursor: "pointer", letterSpacing: "0.08em" });

        return (
          <div style={panel}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", borderBottom: "1px solid #1a1a1a", paddingBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "0.15em", color: "#fafafa" }}>ROSTER X-RAY</div>
                <div style={{ fontSize: "10px", color: "#444", letterSpacing: "0.1em", marginTop: "2px" }}>ADMIN · NEWS MANAGER</div>
              </div>
              <a href={window.location.pathname} style={{ fontSize: "11px", color: "#444", textDecoration: "none" }}>← Exit Admin</a>
            </div>

            {!adminAuthed ? (
              /* Login */
              <div style={{ maxWidth: "360px" }}>
                <div style={{ fontSize: "12px", color: "#666", marginBottom: "20px" }}>Enter your admin password to continue.</div>
                <label style={label}>Password</label>
                <input
                  style={{ ...input_, marginBottom: "12px", ...(adminAuthError ? { borderColor: "#f87171" } : {}) }}
                  type="password"
                  value={adminPassword}
                  onChange={e => { setAdminPassword(e.target.value); setAdminAuthError(false); }}
                  onKeyDown={e => e.key === "Enter" && handleAdminAuth()}
                  placeholder="Enter password"
                />
                {adminAuthError && <div style={{ fontSize: "11px", color: "#f87171", marginBottom: "10px" }}>Incorrect password</div>}
                <button style={btn()} onClick={handleAdminAuth}>Unlock</button>
              </div>
            ) : (
              <div style={{ maxWidth: "600px" }}>

                {/* Add / Edit entry */}
                <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "6px", padding: "20px", marginBottom: "24px" }}>
                  <div style={{ fontSize: "11px", color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px", fontWeight: 700 }}>Add / Update Player News</div>

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
                      <div style={{ fontSize: "11px", fontWeight: 700, color: adminVerifyResult.plausible ? "#4ade80" : "#f87171", marginBottom: "6px" }}>
                        {adminVerifyResult.plausible ? "✓ Looks plausible" : "⚠ Potential issue"}
                      </div>
                      {adminVerifyResult.concern && <div style={{ fontSize: "11px", color: "#fb923c", marginBottom: "8px" }}>{adminVerifyResult.concern}</div>}
                      {(adminVerifyResult.affectedPlayers || []).length > 0 && (
                        <div>
                          <div style={{ fontSize: "10px", color: "#666", marginBottom: "4px", letterSpacing: "0.08em" }}>ALSO AFFECTED:</div>
                          {adminVerifyResult.affectedPlayers.map((p, i) => (
                            <div key={i} style={{ fontSize: "11px", color: "#a3e635", marginBottom: "2px" }}>
                              {p} — <span style={{ color: "#888" }}>{(adminVerifyResult.affectedReasons || [])[i] || ""}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {adminError && <div style={{ fontSize: "11px", color: "#f87171", marginBottom: "10px" }}>{adminError}</div>}
                  {adminSaveSuccess && <div style={{ fontSize: "11px", color: "#4ade80", marginBottom: "10px" }}>✓ Saved — live immediately</div>}

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button style={btn("#facc15")} onClick={handleVerify} disabled={adminVerifying}>
                      {adminVerifying ? "Verifying…" : "Verify First"}
                    </button>
                    <button style={btn()} onClick={handleSave} disabled={adminSaving}>
                      {adminSaving ? "Saving…" : "Save to KV"}
                    </button>
                  </div>
                </div>

                {/* Current entries */}
                <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "6px", padding: "20px" }}>
                  <div style={{ fontSize: "11px", color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px", fontWeight: 700 }}>
                    Current Entries ({Object.keys({ ...RECENT_NEWS, ...adminNews }).length})
                  </div>
                  <div style={{ fontSize: "10px", color: "#444", marginBottom: "12px" }}>KV entries override hardcoded. Hardcoded entries shown in grey.</div>

                  {Object.entries({ ...RECENT_NEWS, ...adminNews }).map(([key, val]) => {
                    const isKv = adminNews.hasOwnProperty(key);
                    return (
                      <div key={key} style={{ borderBottom: "1px solid #151515", padding: "10px 0", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: isKv ? "#a3e635" : "#444", marginBottom: "3px" }}>
                            {key} {isKv ? <span style={{ fontSize: "9px", color: "#22c55e" }}>KV</span> : <span style={{ fontSize: "9px", color: "#333" }}>hardcoded</span>}
                          </div>
                          <div style={{ fontSize: "11px", color: "#666", lineHeight: 1.5 }}>{val}</div>
                        </div>
                        {isKv && (
                          <button
                            onClick={() => handleDelete(key)}
                            style={{ background: "none", border: "1px solid #2a1a1a", borderRadius: "3px", color: "#f87171", fontSize: "10px", padding: "3px 8px", cursor: "pointer", flexShrink: 0, fontFamily: "inherit" }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Export / Import backup */}
                <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "6px", padding: "20px", marginTop: "16px" }}>
                  <div style={{ fontSize: "11px", color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px", fontWeight: 700 }}>Backup & Restore</div>
                  <div style={{ fontSize: "11px", color: "#555", marginBottom: "16px", lineHeight: 1.6 }}>
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
                  {adminImportError && <div style={{ fontSize: "11px", color: "#f87171", marginBottom: "8px" }}>{adminImportError}</div>}
                  {adminImportSuccess && <div style={{ fontSize: "11px", color: "#4ade80", marginBottom: "8px" }}>✓ Restored — all entries live</div>}
                  <button
                    style={btn("#f59e0b")}
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

    </div>
  );
}
