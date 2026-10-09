# Packaging changes

The five supplied bookmarklets have been decoded into readable JavaScript and rebuilt as consistently encoded, single-line bookmarklet URLs. Stray Markdown escapes before dots, asterisks, underscores and backticks have been removed. A `void` wrapper prevents execution results from replacing the current document.

Small fixes made during packaging:

- **Logo Grab:** the CORS fallback displays the original image for manual saving, rather than a tainted canvas that cannot be exported. Handles a blocked fallback window, an unavailable canvas context and a failed PNG blob.
- **Passphrases:** checks whether the clipboard copy actually succeeded and shows the manual-copy prompt when it did not. Removes its temporary textarea even after a failure. The original wordlists, Math.random algorithm, punctuation, capitalisation rules and two-digit suffix are retained.
- **Halo link:** cleans up its temporary editable element and selection if copying fails. Adds a notification status role and raises the notification stacking order.
- **TidyRhea:** reformatted into readable JavaScript; retains its host restriction, selectors, layout rules, toggle behaviour and storage key.
- **Window Resizer:** reformatted and decoded; retains the three presets, custom-size form, pop-up handling and whole-window size requests.

The install page, README, bookmark import file and encoded URLs are generated from `catalog.json` and `src/`. The Passphrases upstream link is attribution and reference; no existing GitHub repo has been changed.
