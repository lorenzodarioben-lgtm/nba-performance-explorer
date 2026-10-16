# Image quality audit

How each player photo was judged, what the browser actually renders, and the visual defects found
and fixed during integration. Screenshots are in [`screenshots/`](screenshots/); each pairs the
3.2 release (`0e184db`) with this branch.

## Method

**Choosing between an original and its upgrade.** Each pair was judged on four things:

- Side-by-side sheets at equal height, for composition, crop and identity.
- Native-resolution face crops enlarged equally, for real detail versus blur, JPEG damage and
  upscaling artefacts (over-texture, halos, invented features).
- Pixel dimensions against the largest frame each photo fills.
- The rendered result in a production build.

**Measuring the rendered result.** A Playwright audit loaded the production build (port 4310) at
three sizes:

- 1440 × 900;
- 1920 × 1080;
- 390 × 844 (mobile, touch).

For every photo wider than 120 CSS px it measured the **effective enlargement**:

- the variant's real width (its filename gives it, because `srcset` reports density-corrected
  sizes);
- that width against the box it fills, with `object-fit: cover` scaling by the larger ratio.

**Pages audited.** 23 routes at each size:

- home and players landing;
- two player heroes (action photo and headshot) and two record rooms;
- scoreboard and two game pages;
- current and 1995-96 standings;
- teams and a 1995-96 team page;
- team rankings, champions and awards, record book and leaders;
- eras, comparison studio, similarity finder and NBA.com lineups;
- bracket and film room.

## Photo decisions

| Player                       | Before         | Supplied upgrade      | Face crop at native size                                                                       | Decision                           |
| ---------------------------- | -------------- | --------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------- |
| Victor Wembanyama (hero)     | 1140×760 WebP  | 1199×1312             | Old: soft, smeared skin and hair. New: sharp, natural.                                         | Upgrade                            |
| Victor Wembanyama (portrait) | —              | 1086×1448             | Sharp, natural.                                                                                | Added (portrait frames)            |
| Stephen Curry                | 2400×1422 AVIF | 1629×965 (same shot)  | Old: an upscale; despite 2,400 px the face is soft. New: clean detail.                         | Upgrade                            |
| Stephen Curry (portrait)     | —              | 1536×1024             | Sharp, natural.                                                                                | Added (portrait, thumbnail)        |
| LeBron James                 | 1200×1200 AVIF | 1254×1254 (same shot) | New is sharper. The shot shows the back of his head, so his thumbnail comes from the portrait. | Upgrade                            |
| LeBron James (portrait)      | —              | 3136×2090 JPEG        | Sharp, natural.                                                                                | Added (portrait, thumbnail)        |
| Kevin Durant                 | 5000×3333 AVIF | 1536×1024             | Old: genuine, natural detail. New: AI over-texturing on skin, haloed edges, oversaturation.    | **Kept the original** (re-encoded) |
| Giannis Antetokounmpo        | 1920×1080 AVIF | 1672×941              | New has visibly more natural detail.                                                           | Upgrade                            |
| Donovan Mitchell             | 678×452 JPEG   | 1536×1024             | Old too small for any large frame.                                                             | Upgrade                            |
| Luka Dončić                  | 1200×915 JPEG  | 1436×1095             | New is sharper, with a wider crop.                                                             | Upgrade                            |
| Nikola Jokić                 | 1500×1000 WebP | 1536×1024             | Slightly sharper; no artefacts.                                                                | Upgrade                            |
| Joel Embiid                  | 2048×1153 WebP | 1448×1086             | Old: an upscale with a soft face. New: crisp.                                                  | Upgrade                            |
| James Harden                 | 980×1174 AVIF  | 1146×1373             | New is sharper.                                                                                | Upgrade                            |
| Kawhi Leonard                | 1920×1081 JPEG | 1672×941              | Old: JPEG blur on the face. New: crisp.                                                        | Upgrade                            |
| Cade Cunningham              | 640×420 JPEG   | 1536×1024             | Old too small.                                                                                 | Upgrade                            |
| Kyrie Irving                 | —              | 1536×1024             | Natural; the subject is small in frame, so it uses a focal point.                              | Added                              |
| Shai Gilgeous-Alexander      | 1067×1600 WebP | —                     | Acceptable; no upgrade supplied.                                                               | Kept (re-encoded)                  |
| Tyrese Haliburton            | 2560×1707 WebP | —                     | Acceptable; no upgrade supplied.                                                               | Kept (re-encoded)                  |

**Headshots.** The 59 NBA.com headshots are uniform 1040 × 760 transparent cutouts with clean
mattes. None showed compression or matting defects. Some show a later uniform, or no uniform:

- Kareem Abdul-Jabbar and Clyde Drexler are post-career portraits.
- Steve Nash is in a coaching polo.
- Carmelo Anthony is in a 2020s Lakers jersey.

The site presents them neutrally: no page treats a uniform as evidence of a team or season.

## Enlargement before and after

| Frame                                | Before                                                            | After                                                    |
| ------------------------------------ | ----------------------------------------------------------------- | -------------------------------------------------------- |
| Home hero, 1440 × 900                | 1140 px source enlarged **1.15×**, and the source itself was soft | 1199 px variant, no enlargement                          |
| Home hero, 1920 × 1080               | **1.39×**                                                         | 1199 px variant, no enlargement (the box is 1196 CSS px) |
| Wembanyama profile hero, 1920 × 1080 | **1.13×**                                                         | None                                                     |
| Players board cards                  | Mitchell and Cade at their limits (678 and 640 px)                | 640 px variants or larger; downscaled                    |
| All 23 routes at 3 sizes             | —                                                                 | **No photo enlarged** (every scale ≤ 1.0 at 1×)          |

On high-density screens (2×) at 1440 px and wider, the hero still has fewer device pixels than
the frame. The largest supplied hero source is 1199 px wide. Even so, it is a far cleaner source
than the soft 1140 px file it replaces.

## Defects found during the audit and fixed

| Defect                                                                                            | Where                            | Fix                                                                                                              |
| ------------------------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| The new portrait-format hero put Wembanyama's face under the headline and clipped the ball        | Home                             | Focal point moved to the top; image widened to 115% of its frame on desktop; `sizes` corrected                   |
| `sizes` told the browser 893 px for a 1,089 px box, so it loaded the 960 px variant               | Home hero                        | `sizes` matches the real box: `min(72vw, 1200px)`                                                                |
| Team marks overlapped the large abbreviations on narrow plates                                    | Teams directory                  | Plates with a mark grow to 160 px; the mark sits in clear space                                                  |
| One side of a game header had a mark and the other none (Cleveland 2015-16, the Clippers in 2024) | Game, film room and series cards | The missing side keeps a neutral ring of the same size                                                           |
| Headshot thumbnails cut off foreheads and chins; action thumbnails left faces tiny                | Every compact list               | Face crops recut: 1.12× the head box for headshots, 1.08× the face box for action photos                         |
| Players page loaded 2.8 MB at 1× and 5.6 MB on a 3× phone                                         | Players landing                  | Added 360 px headshot and 640 px action variants; aspect-aware `sizes` for cropped frames. Now 1.6 MB and 3.3 MB |
| Kyrie Irving's headshot files were built but unused                                               | Build                            | Headshot variants are skipped for players with an editorial photo; his headshot still makes his thumbnail        |
| Comparison band asked for 340 px for a landscape photo cropped to 3:4                             | Home                             | `sizes` scales by the crop                                                                                       |
| Dark historical marks (classic Spurs, Bullets) disappeared on charcoal                            | Standings, team pages            | A soft light halo on those two marks                                                                             |

## Final audit results (production build)

All 23 routes × 3 sizes:

- horizontal overflow: none;
- broken images: none;
- failed image requests: none;
- requests to any host other than the site: none;
- enlarged photos: none.

Representative marks, faces and fallbacks per page (desktop, from the audit log):

| Page                              | Team marks shown | Neutral fallbacks | Player faces | Initials (no photo) |
| --------------------------------- | ---------------: | ----------------: | -----------: | ------------------: |
| Teams directory                   |               60 |                 0 |            — |                   — |
| Current standings                 |               60 |                 0 |            — |                   — |
| 1995-96 standings                 |               22 |                36 |            — |                   — |
| Champions and awards              |               63 |                23 |           82 |                   4 |
| Scoreboard (2016-06-19)           |               39 |                 1 |            7 |                   5 |
| Gary Payton record room           |               15 |                 3 |            — |                   — |
| Record book                       |                — |                 — |           15 |                   0 |
| Similarity finder                 |                — |                 — |            7 |                   3 |
| NBA.com lineups (2023-24 Celtics) |                1 |                 0 |            2 |                  17 |
| Bracket                           |               30 |                 0 |            — |                   — |

The 1995-96 fallbacks are deliberate. Those seasons used marks that were not supplied, so they show
a neutral ring rather than a later brand.
