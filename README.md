# Ajar

Type an intention before entering a site.

*Ajar* — a door left slightly open. You have to push it yourself.

A minimal redesign of [Intender](https://github.com/jonathanmoregard/intender):
same idea, far fewer moving parts. Two screens — one line to type into, one
list to configure.

<br>

## How it works

1. You add a site and the phrase you want to have to type before entering it.
2. Opening that site (or any page below the path you configured) swaps the tab
   for a single prompt.
3. The phrase appears as a ghost completion right where you are typing.
   Type it, press Enter, and the site opens.

The prompt shows the phrase inline instead of printing it on a separate line:
the part you have typed is solid, the rest is a faded continuation after the
caret. The underline tells you where you stand — neutral while you are on
track, green once the phrase is complete, red as soon as you have left it.

Small typos are forgiven. How much is forgiven grows with the phrase: short
phrases have to be typed exactly, longer ones tolerate a character or two. This
is always on; there is no switch for it.

## What is different from the original

- **One setting only.** The list of sites. Every other option of the original
  is gone and its behaviour is pinned to the original defaults: typo tolerance
  on, intention text not copyable, no inactivity timer, no breath animation, no
  debug logging.
- **A two-row prompt.** Wordmark and destination, then a borderless input with
  a single rule under it. The phrase is a ghost completion inside the input,
  not a separate line.
- **A single list.** No cards, no toggles, no advanced panel.
- **Light and dark**, following the system preference, on warm off-white and
  off-black rather than pure `#fff` / `#000`.

Matching, the redirect-to-prompt flow and the "already inside this site" logic
follow the original's behaviour: a tab that has been granted access to a site
is not asked again while it stays there, and leaving the site resets it.

## Install

Chromium only, unpacked. There is no store listing.

Grab `ajar-<version>.zip` from [Releases][releases], open `chrome://extensions`,
switch on **Developer mode**, and drag the zip onto the page. Chrome unpacks it
into your profile and labels it as an unpacked extension — that is what loading
from disk means, and it has no effect on how the extension works.

To build it yourself:

```bash
npm install
npm run zip          # builds dist/ and packs release/ajar-<version>.zip
```

For development, `npm run dev` rebuilds on change — reload the extension from
`chrome://extensions` to pick up the new bundle. Loading `dist/` directly as an
unpacked extension works as well.

[releases]: https://github.com/QuarkPixel/ajar/releases

## Using it

Click the toolbar icon to open the list. Each row is a site and a phrase:

| Site            | Intention         |
| --------------- | ----------------- |
| `twitter.com`   | `my task is done` |
| `reddit.com/r/` | `I am looking…`   |

- A bare hostname also covers its sub-domains, so `x.com` covers `m.x.com`.
- Add a path to narrow it down: `youtube.com/shorts` only guards Shorts.
- Rows with an empty phrase are ignored; a red underline means the site could
  not be parsed and the row will not match anything.

Everything saves as you type. The prompt can be dismissed with `Esc`, which
takes you back where you came from.

## Built with

Vite + TypeScript, no framework, no runtime dependencies. Three entry points:
a module service worker, the prompt page and the options page. All state lives
in `chrome.storage.local`; per-tab grants live in `chrome.storage.session`.

```
src/
  background.ts        navigation watching, grants, redirects
  lib/fuzzy.ts         edit distance, complete / on-track judgement, ghost hint
  lib/rules.ts         site patterns and URL matching
  lib/store.ts         the one list, persisted
  intention/           the prompt page
  options/             the list
  styles/tokens.css    colours and type, light + dark
```

## Licence

AGPL-3.0. This is a derivative work of
[jonathanmoregard/intender](https://github.com/jonathanmoregard/intender),
which is licensed under the AGPL-3.0 — so this one is too, and the source is
published for exactly that reason. See [NOTICE.md](NOTICE.md) for the
attribution details.

The ghost icon is from [Tabler Icons](https://github.com/tabler/tabler-icons)
(MIT).
