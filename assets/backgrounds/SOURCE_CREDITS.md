# Background collection provenance

## Nature photos (preferred built-in collection)
Recovered exactly from the 15 Unsplash image IDs used by Focus Cycles in git commits `ac6dd80`, `8bf7883`, and `203bdb2`. Those earlier releases loaded the images at runtime. Version 1.4.14 bundles local 1920px JPEG renditions so the app stays zero-network.

Original image IDs, in preserved order:
`1470770841072-f978cf4d019e`, `1501854140801-50d01698950b`, `1500534314209-a25ddb2bd429`, `1469474968028-56623f02e42e`, `1441974231531-c6227db76b6e`, `1433086966358-54859d0ed716`, `1475924156734-496f6cac6ec1`, `1464822759023-fed622ff2c3b`, `1506260408121-e353d10b87c7`, `1470071459604-3b5ec3a7fe05`, `1458668383970-8ddd3927deed`, `1518495973542-4542c06a5843`, `1519681393784-d120267933ba`, `1504198266287-1659872e6590`, `1472214103451-9374bd1c798e`.

Download pattern: `https://images.unsplash.com/photo-<ID>?w=1920&q=82&auto=format&fit=crop`
License evidence: https://unsplash.com/license — irrevocable worldwide license to download, copy, modify, distribute, and use images free for commercial and non-commercial purposes. This app is not an image-library competitor and does not sell the images unmodified.

## Illustrated scenery
The six locally authored SVG scenes introduced in 1.4.13 remain available as a separate collection: Morning Ridge, Quiet Lake, Cedar Path, Blue Hour, Distant Coast, and Autumn Hollow.

Personal imports remain local in IndexedDB and are never copied from protected folders without the user choosing files.

## Fresh photos (added in 1.4.17)

These three files are bundled under new stable IDs and do not replace or mutate the original 15-photo collection. Each source page explicitly marks the photograph CC0 1.0, permitting copying, modification, distribution, and commercial use without additional permission. The bundled files are resized, mildly desaturated JPEG derivatives for calm in-app display.

- `misty-yosemite.jpg` — “Misty day at Yosemite,” source/author record: https://commons.wikimedia.org/wiki/File:Misty_day_at_Yosemite_(Unsplash).jpg — CC0 1.0.
- `pacific-coast.jpg` — “Pacific Coast,” Alanthebox: https://commons.wikimedia.org/wiki/File:Pacific_Coast.JPG — CC0 1.0.
- `blue-mesa.jpg` — “Blue Mesa Landscape,” Mshuang2: https://commons.wikimedia.org/wiki/File:Blue_Mesa_Landscape.jpg — CC0 1.0.

License deed: https://creativecommons.org/publicdomain/zero/1.0/deed.en

Bundled SHA-256 hashes are recorded in `FRESH_PHOTO_MANIFEST.sha256`.
