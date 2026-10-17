# Visual asset inventory

Every image in the owner-supplied `NBA_ASSETS` staging folder and every image the site shipped
before this work, as measured on 2026-10-17. All files opened and decoded; none was corrupt.
Machine-readable version: [`asset-inventory.json`](asset-inventory.json) (path, bytes, SHA-256,
format, size, transparency, decision). Source-to-production mapping:
[`asset-map.json`](asset-map.json).

`NBA_ASSETS` itself is not committed (it is in `.gitignore`) and was never modified.

## Totals

| Group                       |   Files |          Size | Accepted | Not used | Rejected |
| --------------------------- | ------: | ------------: | -------: | -------: | -------: |
| upgraded photo              |      16 |     31,830 KB |       15 |        0 |        1 |
| headshot                    |      59 |     13,518 KB |       59 |        0 |        0 |
| historical logo             |      15 |      4,692 KB |       15 |        0 |        0 |
| current logo                |     184 |      7,294 KB |       30 |      154 |        0 |
| site (before)               |      16 |      1,944 KB |        5 |        0 |       11 |
| **Supplied (`NBA_ASSETS`)** | **274** | **57,334 KB** |  **119** |  **154** |    **1** |

`NBA_ASSETS` also holds five text files (three `manifest.csv`, one `manifest.txt`, one
`README.txt`), read for identities, eras and usage notes. For the site images, "rejected" means
replaced by a supplied upgrade. No exact duplicates exist (SHA-256); the only near-duplicates are
the upgraded photos and the site photos they were made from.

## Upgraded and editorial photos (16 supplied)

| File                             | Size      |    Bytes | Decision | Use                                                                                                                                        |
| -------------------------------- | --------- | -------: | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `UPgradedWembyuseasnewhero.png`  | 1199×1312 | 2,078 KB | accepted | Victor Wembanyama (1641705) main photo and home hero; replaces wembanyama-hero.webp (1140x760, enlarged up to 1.39x in the hero)           |
| `UpgradedDmitch.png`             | 1536×1024 | 1,926 KB | accepted | Donovan Mitchell (1628378); replaces donovan-mitchell.jpg (678x452)                                                                        |
| `UpgradedEmbiid.png`             | 1448×1086 | 2,095 KB | accepted | Joel Embiid (203954); replaces embiid.webp (a soft upscale)                                                                                |
| `UpgradedGiannis.png`            | 1672×941  | 1,941 KB | accepted | Giannis Antetokounmpo (203507); replaces giannis.avif                                                                                      |
| `UpgradedHarden.png`             | 1146×1373 | 2,251 KB | accepted | James Harden (201935); replaces harden.avif                                                                                                |
| `UpgradedJokic.png`              | 1536×1024 | 2,080 KB | accepted | Nikola Jokic (203999); replaces jokic.webp                                                                                                 |
| `UpgradedKD.png`                 | 1536×1024 | 2,020 KB | rejected | Kevin Durant: AI over-texturing and haloing on the face; the existing 5000 px original is sharper and natural, so it was kept (re-encoded) |
| `UpgradedKawhi.png`              | 1672×941  | 2,263 KB | accepted | Kawhi Leonard (202695); replaces kawhi-leonard.jpg (JPEG blur)                                                                             |
| `UpgradedKyrie.png`              | 1536×1024 | 2,218 KB | accepted | Kyrie Irving matchup scene in the Compare page header (`/images/scenes/kyrie-matchup-*.webp`); his profile photo until 3.3                 |
| `UpgradedLebrondunk.png`         | 1254×1254 | 2,068 KB | accepted | LeBron James (2544) main photo; replaces lebron-dunk.avif                                                                                  |
| `UpgradedLuka.png`               | 1436×1095 | 2,021 KB | accepted | Luka Doncic (1629029); replaces luka-doncic.jpg                                                                                            |
| `UpgradedSteph.png`              | 1536×1024 | 1,850 KB | accepted | Stephen Curry portrait alternate and face thumbnail (new photo)                                                                            |
| `UpgradedSteph2.png`             | 1629×965  | 2,097 KB | accepted | Stephen Curry (201939) main photo; same shot as curry-action.avif, whose 2400 px file was a soft upscale                                   |
| `UpgradedWembyFOrcomparing.png`  | 1086×1448 | 2,093 KB | accepted | Victor Wembanyama portrait alternate (home comparison band) and face thumbnail                                                             |
| `Upgraded_Lebron_comparison.jpg` | 3136×2090 |   629 KB | accepted | LeBron James portrait alternate (home comparison band) and face thumbnail                                                                  |
| `Upgradedcade.png`               | 1536×1024 | 2,200 KB | accepted | Cade Cunningham (1630595); replaces cade-cunningham.jpg (640x420)                                                                          |

## NBA.com headshots (59 supplied)

All 1040×760 PNG with transparent backgrounds, from NBA.com's headshot CDN. The ID is the
manifest's NBA person ID, and it also prefixes each filename; the build refuses a file whose name
does not carry its manifest ID. Patrick Ewing (121) was listed but not delivered: the source
returned a generic silhouette, so the pack excluded him.

| NBA ID  | Player              | Pack                    | Uniform or era shown (manifest)              | Use                                          |
| ------- | ------------------- | ----------------------- | -------------------------------------------- | -------------------------------------------- |
| 947     | Allen Iverson       | Nba Legends 2000S 2010S | Philadelphia 76ers                           | headshot, thumbnail                          |
| 203076  | Anthony Davis       | Current Nba Stars       |                                              | headshot, thumbnail                          |
| 1630162 | Anthony Edwards     | Current Nba Stars       |                                              | headshot, thumbnail                          |
| 1628389 | Bam Adebayo         | Current Nba Stars       |                                              | headshot, thumbnail                          |
| 2546    | Carmelo Anthony     | Nba Legends 2000S 2010S | Los Angeles Lakers                           | headshot, thumbnail                          |
| 787     | Charles Barkley     | Nba Legends 80S 90S     | Philadelphia 76ers, late 1980s/early 1990s   | headshot, thumbnail                          |
| 1631096 | Chet Holmgren       | Current Nba Stars       |                                              | headshot, thumbnail                          |
| 2547    | Chris Bosh          | Nba Legends 2000S 2010S | Miami Heat                                   | headshot, thumbnail                          |
| 101108  | Chris Paul          | Nba Legends 2000S 2010S | Oklahoma City Thunder                        | headshot, thumbnail                          |
| 17      | Clyde Drexler       | Nba Legends 80S 90S     | Post-playing-era portrait; no team uniform   | headshot, thumbnail                          |
| 203081  | Damian Lillard      | Current Nba Stars       |                                              | headshot, thumbnail                          |
| 764     | David Robinson      | Nba Legends 80S 90S     | San Antonio Spurs, 1990s                     | headshot, thumbnail                          |
| 23      | Dennis Rodman       | Nba Legends 80S 90S     | Chicago Bulls, 1990s                         | headshot, thumbnail                          |
| 201565  | Derrick Rose        | Nba Legends 2000S 2010S | Minnesota Timberwolves                       | headshot, thumbnail                          |
| 1626164 | Devin Booker        | Current Nba Stars       |                                              | headshot, thumbnail                          |
| 87      | Dikembe Mutombo     | Nba Legends 80S 90S     | Houston Rockets, 2000s                       | headshot, thumbnail                          |
| 1717    | Dirk Nowitzki       | Nba Legends 2000S 2010S | Dallas Mavericks                             | headshot, thumbnail                          |
| 1627734 | Domantas Sabonis    | Current Nba Stars       |                                              | headshot, thumbnail                          |
| 1122    | Dominique Wilkins   | Nba Legends 80S 90S     | Atlanta Hawks, 1980s                         | headshot, thumbnail                          |
| 2730    | Dwight Howard       | Nba Legends 2000S 2010S | Los Angeles Lakers                           | headshot, thumbnail                          |
| 2548    | Dwyane Wade         | Nba Legends 2000S 2010S | Heat                                         | headshot, thumbnail                          |
| 1630532 | Franz Wagner        | Current Nba Stars       |                                              | headshot, thumbnail                          |
| 56      | Gary Payton         | Nba Legends 80S 90S     | Los Angeles Lakers, early 2000s              | headshot, thumbnail                          |
| 165     | Hakeem Olajuwon     | Nba Legends 80S 90S     | Houston Rockets, 1990s                       | headshot, thumbnail                          |
| 78318   | Isiah Thomas        | Nba Legends 80S 90S     | Detroit Pistons, 1980s/1990s                 | headshot, thumbnail                          |
| 1629630 | Ja Morant           | Current Nba Stars       |                                              | headshot, thumbnail                          |
| 1628973 | Jalen Brunson       | Current Nba Stars       |                                              | headshot, thumbnail                          |
| 1627759 | Jaylen Brown        | Current Nba Stars       |                                              | headshot, thumbnail                          |
| 1628369 | Jayson Tatum        | Current Nba Stars       |                                              | headshot, thumbnail                          |
| 202710  | Jimmy Butler        | Current Nba Stars       |                                              | headshot, thumbnail                          |
| 304     | John Stockton       | Nba Legends 80S 90S     | Utah Jazz, 1990s                             | headshot, thumbnail                          |
| 76003   | Kareem Abdul-Jabbar | Nba Legends 80S 90S     | Post-playing-era portrait; no team uniform   | headshot, thumbnail                          |
| 252     | Karl Malone         | Nba Legends 80S 90S     | Utah Jazz, 1990s                             | headshot, thumbnail                          |
| 1626157 | Karl-Anthony Towns  | Current Nba Stars       |                                              | headshot, thumbnail                          |
| 708     | Kevin Garnett       | Nba Legends 2000S 2010S | Minnesota Timberwolves                       | headshot, thumbnail                          |
| 977     | Kobe Bryant         | Nba Legends 2000S 2010S | Lakers                                       | headshot, thumbnail                          |
| 202681  | Kyrie Irving        | Current Nba Stars       |                                              | face thumbnail only (has an editorial photo) |
| 1630163 | LaMelo Ball         | Current Nba Stars       |                                              | headshot, thumbnail                          |
| 1449    | Larry Bird          | Nba Legends 80S 90S     | Boston Celtics, 1980s                        | headshot, thumbnail                          |
| 77142   | Magic Johnson       | Nba Legends 80S 90S     | Los Angeles Lakers, 1980s                    | headshot, thumbnail                          |
| 1938    | Manu Ginóbili       | Nba Legends 2000S 2010S | San Antonio Spurs                            | headshot, thumbnail                          |
| 893     | Michael Jordan      | Nba Legends 80S 90S     | Chicago Bulls, 1990s                         | headshot, thumbnail                          |
| 1631094 | Paolo Banchero      | Current Nba Stars       |                                              | headshot, thumbnail                          |
| 2200    | Pau Gasol           | Nba Legends 2000S 2010S | San Antonio Spurs                            | headshot, thumbnail                          |
| 1718    | Paul Pierce         | Nba Legends 2000S 2010S | Boston Celtics                               | headshot, thumbnail                          |
| 951     | Ray Allen           | Nba Legends 2000S 2010S | Milwaukee Bucks                              | headshot, thumbnail                          |
| 397     | Reggie Miller       | Nba Legends 80S 90S     | Indiana Pacers, late 1990s/2000s             | headshot, thumbnail                          |
| 201566  | Russell Westbrook   | Nba Legends 2000S 2010S | Sacramento Kings                             | headshot, thumbnail                          |
| 937     | Scottie Pippen      | Nba Legends 80S 90S     | Chicago Bulls, 1990s                         | headshot, thumbnail                          |
| 406     | Shaquille O'Neal    | Nba Legends 80S 90S     | Los Angeles Lakers, 2000s                    | headshot, thumbnail                          |
| 431     | Shawn Kemp          | Nba Legends 80S 90S     | Orlando Magic, early 2000s                   | headshot, thumbnail                          |
| 959     | Steve Nash          | Nba Legends 2000S 2010S | No NBA uniform (Brooklyn Nets coaching polo) | headshot, thumbnail                          |
| 1495    | Tim Duncan          | Nba Legends 2000S 2010S | Spurs                                        | headshot, thumbnail                          |
| 2225    | Tony Parker         | Nba Legends 2000S 2010S | Charlotte Hornets                            | headshot, thumbnail                          |
| 1503    | Tracy McGrady       | Nba Legends 2000S 2010S | Houston Rockets                              | headshot, thumbnail                          |
| 1629027 | Trae Young          | Current Nba Stars       |                                              | headshot, thumbnail                          |
| 1630178 | Tyrese Maxey        | Current Nba Stars       |                                              | headshot, thumbnail                          |
| 1713    | Vince Carter        | Nba Legends 2000S 2010S | Atlanta Hawks                                | headshot, thumbnail                          |
| 1629627 | Zion Williamson     | Current Nba Stars       |                                              | headshot, thumbnail                          |

## Historical team marks (15 supplied)

All 1024×1024 transparent PNG, identified from SportsLogos.Net per the manifest. Each is applied
only within its **actual** logo years, which are often narrower than the filename's range.

| File                                | Team                              | Filename range | Actual mark (manifest)                                       | Seasons it is shown for |
| ----------------------------------- | --------------------------------- | -------------- | ------------------------------------------------------------ | ----------------------- |
| `bobcats_2004_2014.png`             | Charlotte Bobcats                 | 2004-2014      | 2004/05-2006/07 primary                                      | 2004-05 to 2006-07      |
| `bullets_1973_1997.png`             | Washington Bullets                | 1973-1997      | 1987/88-1996/97 primary (Washington Bullets 1974/75-1996/97) | 1987-88 to 1996-97      |
| `clippers_sandiego_1978_1984.png`   | San Diego Clippers                | 1978-1984      | 1978/79-1981/82 primary                                      | 1978-79 to 1981-82      |
| `grizzlies_vancouver_1995_2001.png` | Vancouver Grizzlies               | 1995-2001      | 1995/96-2000/01 primary                                      | 1995-96 to 2000-01      |
| `hornets_charlotte_1988_2002.png`   | Charlotte Hornets                 | 1988-2002      | 1988/89-2001/02 primary                                      | 1988-89 to 2001-02      |
| `hornets_neworleans_2002_2013.png`  | New Orleans Hornets               | 2002-2013      | 2008/09-2012/13 primary                                      | 2008-09 to 2012-13      |
| `hornets_nookc_2005_2007.png`       | New Orleans/Oklahoma City Hornets | 2005-2007      | 2005/06-2006/07 alternate (Oklahoma City wordmark)           | 2005-06 to 2006-07      |
| `jazz_neworleans_1974_1979.png`     | New Orleans Jazz                  | 1974-1979      | 1974/75-1978/79 primary                                      | 1974-75 to 1978-79      |
| `kings_kansascity_1975_1985.png`    | Kansas City Kings                 | 1975-1985      | 1975/76-1984/85 primary                                      | 1975-76 to 1984-85      |
| `nets_newjersey_1990_2012.png`      | New Jersey Nets                   | 1990-2012      | 1997/98-2011/12 primary                                      | 1997-98 to 2011-12      |
| `rockets_classic_1995_2003.png`     | Houston Rockets                   | 1995-2003      | 1995/96-2002/03 primary                                      | 1995-96 to 2002-03      |
| `spurs_classic_1976_2002.png`       | San Antonio Spurs                 | 1976-2002      | 1976/77-1988/89 primary                                      | 1976-77 to 1988-89      |
| `suns_classic_1992_2000.png`        | Phoenix Suns                      | 1992-2000      | 1992/93-1999/00 primary                                      | 1992-93 to 1999-00      |
| `supersonics_1975_1995.png`         | Seattle SuperSonics               | 1975-1995      | 1975/76-1994/95 primary                                      | 1975-76 to 1994-95      |
| `supersonics_1995_2008.png`         | Seattle SuperSonics               | 1995-2008      | 1995/96-2000/01 primary                                      | 1995-96 to 2000-01      |

## Current team marks (30 teams, 184 files)

Each team folder holds six PNG framings of the same mark (`big_circle`, `big_circle_badge`,
`big_square`, `small_circle`, `small_circle_badge`, `small_square`: 512 or 128 px). Four teams
also have an SVG. The `big_circle` PNG (the transparent primary mark at 512 px) is used for all 30
teams. The other 150 PNGs are alternative framings of the same mark and are not used. The
Cavaliers, Pistons and Lakers SVGs are the same marks as their PNGs. The 76ers SVG is a different
mark (a ball badge) that renders cropped. None of the SVGs are used.

| Team ID    | Team                   | Shown from         | Confidence | Note                                                                                            |
| ---------- | ---------------------- | ------------------ | ---------- | ----------------------------------------------------------------------------------------------- |
| 1610612737 | Atlanta Hawks          | 2015-16            | high       |                                                                                                 |
| 1610612738 | Boston Celtics         | 1998-99            | medium     | Shamrock roundel: a Celtics mark since about 1998-99; earlier seasons fall back.                |
| 1610612751 | Brooklyn Nets          | 2012-13            | high       |                                                                                                 |
| 1610612766 | Charlotte Hornets      | 2014-15            | high       |                                                                                                 |
| 1610612741 | Chicago Bulls          | 1966-67            | high       |                                                                                                 |
| 1610612739 | Cleveland Cavaliers    | 2022-23            | medium     | Current "C" mark; earlier seasons fall back.                                                    |
| 1610612742 | Dallas Mavericks       | 2001-02            | medium     |                                                                                                 |
| 1610612743 | Denver Nuggets         | 2018-19            | high       |                                                                                                 |
| 1610612765 | Detroit Pistons        | 1983-84 to 1995-96 | medium     | The 2017 mark revived the 1979-96 basketball roundel.                                           |
| 1610612765 | Detroit Pistons        | 2017-18            | high       |                                                                                                 |
| 1610612744 | Golden State Warriors  | 2010-11            | high       |                                                                                                 |
| 1610612745 | Houston Rockets        | 2019-20            | high       |                                                                                                 |
| 1610612754 | Indiana Pacers         | 2005-06            | medium     |                                                                                                 |
| 1610612746 | LA Clippers            | 2024-25            | high       |                                                                                                 |
| 1610612747 | Los Angeles Lakers     | 1983-84            | medium     | Same wordmark-on-ball design throughout; colours and lettering refined over time.               |
| 1610612763 | Memphis Grizzlies      | 2004-05            | medium     |                                                                                                 |
| 1610612748 | Miami Heat             | 1988-89            | high       |                                                                                                 |
| 1610612749 | Milwaukee Bucks        | 2015-16            | high       |                                                                                                 |
| 1610612750 | Minnesota Timberwolves | 2017-18            | high       |                                                                                                 |
| 1610612740 | New Orleans Pelicans   | 2013-14            | high       |                                                                                                 |
| 1610612752 | New York Knicks        | 1992-93            | medium     |                                                                                                 |
| 1610612760 | Oklahoma City Thunder  | 2008-09            | high       |                                                                                                 |
| 1610612753 | Orlando Magic          | 2010-11            | high       |                                                                                                 |
| 1610612755 | Philadelphia 76ers     | 2015-16            | medium     |                                                                                                 |
| 1610612756 | Phoenix Suns           | 2013-14            | high       |                                                                                                 |
| 1610612757 | Portland Trail Blazers | 2017-18            | high       |                                                                                                 |
| 1610612758 | Sacramento Kings       | 2016-17            | high       |                                                                                                 |
| 1610612759 | San Antonio Spurs      | 2002-03            | medium     |                                                                                                 |
| 1610612761 | Toronto Raptors        | 2015-16            | high       |                                                                                                 |
| 1610612762 | Utah Jazz              | 2025-26            | medium     | Purple note mark supplied as current (the 2025-26 return to purple); earlier seasons fall back. |
| 1610612764 | Washington Wizards     | 2015-16            | high       |                                                                                                 |

## Site images before this work (16)

| File                           | Size      |  Bytes | Decision             | Note                                                           |
| ------------------------------ | --------- | -----: | -------------------- | -------------------------------------------------------------- |
| `favicon.svg`                  | vector    |   0 KB | kept                 | site mark; app icons derived from it                           |
| `cade-cunningham.jpg`          | 640×420   |  86 KB | replaced             | superseded by the supplied upgrade; removed from public/images |
| `curry-action.avif`            | 2400×1422 |  68 KB | replaced             | superseded by the supplied upgrade; removed from public/images |
| `donovan-mitchell.jpg`         | 678×452   |  21 KB | replaced             | superseded by the supplied upgrade; removed from public/images |
| `durant.avif`                  | 5000×3333 | 558 KB | kept as build source | moved to scripts/assets/originals; re-encoded to WebP variants |
| `embiid.webp`                  | 2048×1153 |  97 KB | replaced             | superseded by the supplied upgrade; removed from public/images |
| `giannis.avif`                 | 1920×1080 |  81 KB | replaced             | superseded by the supplied upgrade; removed from public/images |
| `haliburton.webp`              | 2560×1707 | 264 KB | kept as build source | no upgrade supplied; moved to scripts/assets/originals         |
| `harden.avif`                  | 980×1174  |  64 KB | replaced             | superseded by the supplied upgrade; removed from public/images |
| `jokic.webp`                   | 1500×1000 | 136 KB | replaced             | superseded by the supplied upgrade; removed from public/images |
| `kawhi-leonard.jpg`            | 1920×1081 | 144 KB | replaced             | superseded by the supplied upgrade; removed from public/images |
| `lebron-dunk.avif`             | 1200×1200 |  97 KB | replaced             | superseded by the supplied upgrade; removed from public/images |
| `luka-doncic.jpg`              | 1200×915  | 115 KB | replaced             | superseded by the supplied upgrade; removed from public/images |
| `nba-logo.png`                 | 180×386   |  16 KB | kept                 | site header mark, unchanged                                    |
| `shai-gilgeous-alexander.webp` | 1067×1600 | 112 KB | kept as build source | no upgrade supplied; moved to scripts/assets/originals         |
| `wembanyama-hero.webp`         | 1140×760  |  83 KB | replaced             | superseded by the supplied upgrade; removed from public/images |

## Added in the 3.3 UX polish (2026-10-17)

Three more supplied images, all decoded and checked. Built by the same pipeline: profile photos go
in `ACTION` and section imagery in `SCENES`, with outputs listed in
[`asset-map.json`](asset-map.json).

| File                                                            | Size           |    Bytes | SHA-256 (first 12) | Decision | Production files                                                                                                    |
| --------------------------------------------------------------- | -------------- | -------: | ------------------ | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `NEWKYRIEPLAYERIMAGE.jpg`                                       | 1500×1000 JPEG |   135 KB | `6414f2a66508`     | accepted | Kyrie Irving (202681) profile photo: `/images/players/action/irving-{640,960,1500}.webp` (33, 57, 113 KB)           |
| `kobetoshaquseastheimageforthehistoricalseasonsectionimage.png` | 1672×941 PNG   | 2,658 KB | `92f89d213915`     | accepted | Season navigator header (`/history` index only): `/images/scenes/kobe-shaq-{800,1200,1672}.webp` (113, 200, 299 KB) |
| `buzzerbeater.webp`                                             | 2519×1889 WebP |   633 KB | `bed5b78a840d`     | accepted | Scoreboard (`/games`) header: `/images/scenes/kawhi-buzzer-{800,1280,1920}.webp` (91, 204, 420 KB)                  |

`UpgradedKyrie.png` is no longer Kyrie Irving's profile photo. It is kept as the `kyrie-matchup`
scene (`/images/scenes/kyrie-matchup-{640,960,1536}.webp`). Kawhi Leonard's profile photo
(`UpgradedKawhi.png`) is unchanged.

## Supplied but not present

- **Patrick Ewing headshot:** the source returned a silhouette, so the pack excluded it.
- **Social preview image:** none was supplied. The 1200×630 `og-image.jpg` is a capture of the
  site's own home page, made from the integrated photos.
- **Section hero photographs:** none were supplied, so none were added.
- **Award icons:** none were supplied, and none were created.
