# Focus Cycles

A fast, minimalist Mac focus timer built on [Sebastian Marshall](https://sebastianmarshall.com)'s **Work Cycles** method from Ultraworking: set an intention before every work cycle, review after, and let the patterns compound. The ethos: eliminate the meta-work, amplify the real work.

![Focus Cycles](docs/screenshot.png)

## Download

Grab the latest `.zip` from [Releases](../../releases), unzip, and drag **Focus Cycles.app** to Applications.

macOS will warn that the app is from an unidentified developer (it isn't code-signed). Two ways past that, one time only:

- Right-click the app, choose **Open**, then **Open** again, or
- Run `xattr -dr com.apple.quarantine "/Applications/Focus Cycles.app"` in Terminal.

Apple Silicon (M1 or newer) only.

## What it does

- **Work Cycles flow.** Pick 1 to 12 cycles. A one-cycle sprint asks a single question and starts the timer. Longer sessions run the full protocol: prep, then plan / focus / review for each cycle, then a debrief. Every prompt is skippable.
- **History that means something.** Local dashboard with focus time, streak, 7-day chart, target hit rate, and every plan, review, and debrief you wrote. Export to CSV anytime.
- **Crash-proof.** Quit or crash mid-session and it resumes exactly where you left off, timer included.
- **Focus sounds.** Lofi (Lofi Girl's 1 A.M Study Session, looped), Synthwave radio, or locally generated Rain that works offline. One key toggles it all off.
- **The rest.** Rotating landscape backgrounds (drop your own in `backgrounds/`), local weather, light and dark themes, gentle chimes, desktop notifications.

Everything stays on your Mac. No accounts, no server, no analytics.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` | Start session, pause and resume |
| `S` | Skip current focus or break |
| `1`–`9` | Set cycle count |
| `M` | Music on and off |
| `H` | History |
| `T` | Light and dark theme |
| `B` | Next background |
| `Esc` | Go back, cancel |
| `?` | Show all shortcuts |

## Build from source

```bash
git clone https://github.com/budhennekes/focus-cycles.git
cd focus-cycles
npm install
npm start          # run in development
npm run package    # build the .app into dist/
```

The whole app is one HTML file ([index.html](index.html)) plus a small Electron wrapper ([main.js](main.js)).

## Credits

- The Work Cycles method was created by **Sebastian Marshall** and the team at [Ultraworking](https://www.ultraworking.com).
- Lofi and synthwave audio streams from [Lofi Girl](https://www.youtube.com/@LofiGirl), played through YouTube's embedded player.
- Weather by [Open-Meteo](https://open-meteo.com). Built-in backgrounds from [Unsplash](https://unsplash.com).

## License

[MIT](LICENSE)
