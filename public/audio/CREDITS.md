# Ambient audio — provenance and licences

Three tracks, played in the order below and looped as a set by
`src/utils/ambientMusic.ts`. Files are named `artist--title.mp3`. They are
served verbatim from `/audio/` and deliberately kept out of the service worker's
precache (29 MB is not something to install on a reader's device unasked).

| File | Artist | Title | Source | Licence |
| :-- | :-- | :-- | :-- | :-- |
| `vilnius-hang--what-is-that.mp3` | vilnius.hang | *what is that* (arranged by Saulius Petreikis), from *on its way* (2009) | Jamendo | CC BY-NC-SA 3.0 — stated in the file's own ID3 tags |
| `hang-massive--luminous-emptiness.mp3` | Hang Massive | *Luminous Emptiness* | untagged; container metadata indicates a DASH stream rip | **Unverified.** This is a commercially released recording. No licence is embedded and none is on record here. Confirm rights or replace before any public deployment. |
| `aaron-ximm--blue-moon-gold-sun.mp3` | Aaron Ximm | *Blue Moon Gold Sun*, track 9 of *Handpans and the Hang* (2013) | Free Music Archive — `freemusicarchive.org/music/Aaron_Ximm/Handpans_and_the_Hang/` | CC BY-NC-SA 3.0 US — stated in the file's own ID3 tags |

The two Creative Commons licences are **non-commercial** and **share-alike**.
Attribution is required in any distribution; this file is that attribution and
should ship with the app.

Provenance above was read from the files' embedded tags on 2026-09-02, not from
an external lookup.
