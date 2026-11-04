# RamPace Games — sideloaded iOS app for RamPaceCorp games

An App Store–style iPhone/iPad app with every RamPaceCorp game:

- **PLAY** runs a game fullscreen inside the RamPace app.
- **Add to Home Screen** gives a game its own app icon on the iPhone. It opens
  fullscreen like a normal app, never expires, and doesn't use a sideload slot.

The games themselves live in this repo's `docs/games/` folder and are hosted free by
**GitHub Pages**. The game list is `Resources/games.json`; the app downloads the latest
copy every time it opens, so adding or updating a game never needs an app rebuild.

| Game | Folder |
|---|---|
| MSHSAA Basketball Manager 27 | `docs/games/bm27/` |
| Backrooms Unsighted (Unity) | `docs/games/backrooms-unsighted/` |
| Survival Protocol | `docs/games/survival-protocol/` |
| Next Level Pick-Em | `docs/games/next-level-pickem/` |
| VBL Volleyball League | `docs/games/vbl/` |

---

## 1. Put it on GitHub (one time)

1. Make a free account at **github.com**, and install **GitHub Desktop** (desktop.github.com).
2. GitHub Desktop → **File → New Repository** → name it **`rampace-games`** → Create.
3. **Show in Explorer**, then copy **everything inside** this folder into it, including the
   hidden `.github` folder (File Explorer → View → Show → Hidden items).
   `project.yml` must sit directly inside `rampace-games`.
4. Open `Sources\Config.swift` in Notepad and change `YOUR-GITHUB` to your GitHub
   username. That's the only edit. Save.
5. GitHub Desktop → type `First version` → **Commit to main** → **Publish repository**.
   **Uncheck "Keep this code private."**
   GitHub Desktop may warn that two Backrooms files are over 50 MB. That's fine, so continue.
   (GitHub's limit is 100 MB per file.)

## 2. Turn on GitHub Pages (one time)

This puts the games online at `https://YOUR-USERNAME.github.io/rampace-games/`.

1. On github.com open the repo → **Settings** → **Pages** (left side).
2. **Source:** Deploy from a branch. **Branch:** `main`, folder **`/docs`** → **Save**.
3. Wait 1–3 minutes. Test it on your phone in Safari:
   `https://YOUR-USERNAME.github.io/rampace-games/games/vbl/index.html`

## 3. Build the app (no Mac needed)

1. Repo → **Actions** tab → **Build IPA**. It starts by itself after you publish
   (or click **Run workflow**).
2. Wait for the green check (~5–10 min). Open the run → **Artifacts** → **GameStore-ipa**.
3. Unzip it to get **GameStore.ipa**.
   Red X? Open it, click the failed step, and send the error to Claude.

## 4. Install on your iPhone (iTunes + Sideloadly)

1. Install **iTunes** and **iCloud** from **apple.com** (not the Microsoft Store versions),
   then **Sideloadly** from sideloadly.io. Restart the PC.
2. Plug in the iPhone, unlock it, tap **Trust**.
3. Sideloadly: drag in **GameStore.ipa**, enter your Apple ID, click **Start**.
4. iPhone: **Settings → General → VPN & Device Management** → your Apple ID → **Trust**.
5. iPhone: **Settings → Privacy & Security → Developer Mode** → on → restart → **Turn On**.
6. Open **RamPace**.

Every **7 days** (free Apple ID), plug in and click **Start** in Sideloadly again.

## 5. Put a game on your Home Screen

1. In RamPace, open a game → **Add to Home Screen** → **Get Started**.
2. Tap **Allow** to download the profile, then **Done**.
3. Open **Settings** → **Profile Downloaded** (near the top) → **Install** → passcode →
   **Install** → **Done**.
4. The game's icon is on your Home Screen. It opens fullscreen like an app.

Notes:
- Settings shows **Not Verified**. That's normal for anything outside the App Store.
- Home Screen icons **never expire**, even when the RamPace app needs its 7-day refresh.
- If nothing happens after **Get Started**, tap **Use the Safari app instead**.
  (Only Safari can install profiles. If you changed your default browser, switch back
  to Safari or open the link there.)
- Remove one by holding its icon → **Remove App**, or Settings → General →
  VPN & Device Management → the game's profile → Remove.
- Save data in the Home Screen version is separate from playing inside RamPace,
  except for games with online accounts (BM27, Pick-Em, VBL).

---

## Adding a new game

1. Put the game's web build in its own folder: `docs/games/<game-id>/`
   (it needs an `index.html`). For Unity, use a **Web** build with
   **Compression Format: Disabled**, or Gzip with **Decompression Fallback** on, since
   GitHub Pages can't serve Unity's plain `.gz` files.
2. Put a square PNG icon (512×512 is ideal) at `docs/icons/<game-id>.png`.
3. Add an entry to `Resources/games.json`:

```json
{
  "id": "my-game",
  "title": "My Game",
  "shortName": "My Game",
  "subtitle": "One line under the title",
  "description": "Longer text for the game page.",
  "genre": "Action",
  "version": "1.0",
  "launch": "web",
  "url": "games/my-game/index.html",
  "iconURL": "icons/my-game.png",
  "colors": ["#38B6FF", "#1A2240"],
  "featured": false,
  "landscape": false,
  "updated": "Nov 2026"
}
```

4. GitHub Desktop → **Commit to main** → **Push origin**. Within a few minutes, pull
   down on the Today tab in RamPace to see it. No app rebuild needed.

Field notes:
- `shortName`: the label under the Home Screen icon. Keep it about 12 characters.
- `url`/`iconURL`: paths are relative to the GitHub Pages site. A full `https://…` link
  (itch.io, another host) works too.
- `launch`: `"web"` plays in the app and can go on the Home Screen; `"link"` just opens
  the link in Safari (for downloads like a PC mod).
- `status`: optional tag like `"Demo"`, `"Early Access"` or `"Coming Soon"`.
- `featured`: `true` gives it a big card on the Today tab.
- `landscape`: `true` shows a "rotate your device" tip.
- `url: null` shows a greyed-out **SOON** button.

## Updating a game

Replace the files in its `docs/games/<game-id>/` folder → Commit → Push.
Players get the new version next time they open it, both in the app and from the Home Screen icon.

## What's not in this repo (on purpose)

The setup files for BM27, VBL and Next Level Pick-Em (Supabase `.sql`, Netlify functions,
READMEs with secrets like the Pick-Em `CRON_SECRET`) were left out. This repo is public,
so keep those on your PC only.

---

## Project layout

```
project.yml                       XcodeGen description of the iOS app
Sources/Config.swift              GitHub username + branding        ← edit this
Sources/HomeScreenInstaller.swift Add to Home Screen (Web Clip profiles)
Sources/Views/                    Today, Games, Search, game page, player, install guide
Resources/games.json              the game list                     ← edit to add games
Resources/Assets.xcassets         app icon, RamPace logo, game icons
docs/games/                       the hosted games (GitHub Pages)
docs/icons/                       game icons for the web + new games
.github/workflows/build-ipa.yml   cloud build → GameStore.ipa
```
