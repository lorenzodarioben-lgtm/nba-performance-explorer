# Self-hosted fonts

These `woff2` files are self-hosted so the application makes no runtime request to a third-party
font CDN. They are declared in `frontend/src/styles.css` with `font-display: swap`, and the two
hero display weights are preloaded in `frontend/index.html`. See ADR-016 in `docs/DECISIONS.md`.

| Family          | Role               | Weights       | Designer     | Licence                   |
| --------------- | ------------------ | ------------- | ------------ | ------------------------- |
| Saira Condensed | Display / headings | 600, 700, 800 | Omnibus-Type | SIL Open Font License 1.1 |
| JetBrains Mono  | Technical labels   | 500, 700      | JetBrains    | SIL Open Font License 1.1 |

Both families are licensed under the **SIL Open Font License, Version 1.1**, which permits
self-hosting, bundling, and redistribution of the font files. Files are latin-subset `woff2`
obtained from Google Fonts, which distributes both under the OFL.

- Saira: https://fonts.google.com/specimen/Saira+Condensed
- JetBrains Mono: https://fonts.google.com/specimen/JetBrains+Mono
- OFL 1.1: https://openfontlicense.org
