# Compact window and menu-bar reference notes

## Scope
Improve compact-mode controls and menu-bar access only. Preserve the restored Work Cycles home, scenic backgrounds, onboarding, and session accounting.

## Primary guidance
- Apple menu bar: https://developer.apple.com/design/human-interface-guidelines/the-menu-bar
  - Standard Window > Minimize sends a window to the Dock. Do not replace it with compact mode.
  - Keep supported menu actions visible; disable actions unavailable in the current context.
  - Use a native menu for a simple menu-bar extra, not a custom popover.
  - Use black/clear template imagery so the system handles light/dark/selected appearance.
  - Menu-bar extras may be hidden by the system. Keep Dock and window paths usable.
  - Let people choose menu-bar extras. Bud explicitly requested menu-bar access in this pass.
- Apple windows: https://developer.apple.com/design/human-interface-guidelines/windows
  - Preserve familiar window behavior and avoid control/content overlap.
  - Adapt to supported window sizes rather than accidentally hiding content.
- Electron Tray: https://www.electronjs.org/docs/latest/api/tray
  - Template images with Retina variants; monospacedDigit countdown title.
  - Context menu and tray lifecycle must be maintained in the main process.

Apple source content was retrieved through its documentation JSON endpoints after the HTML pages required JavaScript.

## Mobbin references inspected
- ClassDojo timer: https://mobbin.com/screens/ec30015b-6480-4642-9a99-1e219b71ae47
  - Dominant countdown, clearly separated pause control. Its colorful full-screen style is not a native Mac window reference.
- Fireflies recording: https://mobbin.com/screens/f519c0d2-0551-4855-8c27-b353efbe7d85
  - Explicit Pause and Stop labels, status above elapsed time. Not a macOS menu-bar pattern.
- Spotify player: https://mobbin.com/screens/be8895a2-0a79-45d3-a07a-fb7c3c836b5e
  - Compact playback controls separate from expand/display actions. Web player evidence only.

The Mobbin tool searches web/iOS, not native macOS. Apple guidance takes precedence for window controls and the menu-bar extra.

## Intended acceptance
- Explicit Compact/Expand controls, readable countdown, target and phase.
- Solid compact surfaces, no hover-dependent opacity or essential hidden controls.
- Normal minimize behavior; accurate countdown while hidden/minimized.
- Persistent menu-bar access, state-specific pause/resume and disabled irrelevant actions.
- Same session/renderer across compact, minimize, close-to-menu-bar, and reopen.
- Accessible review/continue route at phase completion without forced foreground activation.
- No new dependencies, network services, permissions, or home-screen redesign.
