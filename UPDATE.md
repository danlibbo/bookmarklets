# Add the six service desk bookmarklets

Extract `bookmarklets-update.zip` into the root of the repo created from the original bundle, keeping the folder structure, then commit the new and updated files. All generated files are included: no local build is needed to install this update with the default `danlibbo/bookmarklets` repo address.

The update adds these source files and matching `dist/*.bookmarklet.txt` URLs:

- `src/table-to-excel.js`
- `src/clean-text.js`
- `src/screenshot-tidy.js`
- `src/text-toolkit.js`
- `src/utc-converter.js`
- `src/field-inspector.js`

It replaces `README.md`, `catalog.json`, `docs/index.html`, `bookmarks.html`, `scripts/build.mjs`, `package.json` and `CHANGES.md`. The original five source files and encoded URLs are not part of the patch. If you have edited the catalogue or generator since the original bundle, merge your changes before rebuilding.

If your repo has a different owner/name, set those values in `catalog.json`, then run `npm run build` and `npm run check`. Continue publishing GitHub Pages from `main` and `/docs`.

## Will the page include future bookmarklets?

Yes, through the build process. Add a self-contained `src/<id>.js` and a matching entry to `catalog.json` with `id`, `name`, `summary`, `usage` and `note`, then run `npm run build`. This automatically updates the install page, README, import file and encoded URLs.

The browser does not scan the repo at runtime. A JavaScript file added without a catalogue entry and rebuild does not appear. Links are embedded in the generated page, which also works when opened locally. Saved bookmarks need to be reinstalled after their code changes.

## Screenshot tidy

Email and phone detection use text patterns. Names are inferred from labelled controls and table columns, certain profile fields and `Name:`-style text; names inferred from labelled values are also covered where they repeat. You can supply additional literal names/text or click an element to cover it.

Masks are opaque overlays on rendered content. They do not remove underlying HTML or page data. Names in ordinary prose, details split between elements, images, canvas content and embedded frames can be missed. Review the full intended screenshot, including browser chrome outside the webpage, before sharing. Escape, Restore page or running the bookmarklet again removes the overlays and listeners.

## Validation

JavaScript syntax and generated-file consistency were checked. Local fixtures exercised text transformations, TSV escaping, merged/hidden rows, Melbourne daylight-saving transitions, selector metadata, automatic masks and cleanup. These checks do not replace live browser/layout validation on the applications you use.
