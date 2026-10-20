# Notices

## Upstream project

Ajar is a redesign of **Intender**, originally created by Jonathan Moregård:

- Source: https://github.com/jonathanmoregard/intender
- Licence: GNU Affero General Public License v3.0

The interaction model — intercepting a navigation to a configured site and
asking the visitor to type an intention before letting them through — comes
from that project. This repository keeps the idea and the licence, and reduces
the implementation to the parts described in the README.

Changes from the original: a single-list settings page replacing the full
options screen, a two-row prompt with inline ghost completion instead of a
separate phrase line, simplified URL matching, and removal of every optional
feature (inactivity timer, copy protection toggle, breath animation, debug
logging, popup). No source file is shared verbatim.

Because the original is licensed under the AGPL-3.0, this work is distributed
under the same licence; see [LICENSE](LICENSE). If you run a modified version
of this code as a network service, the AGPL requires you to offer its source.

## The name

The upstream project asks, in its own NOTICE, that derivative projects avoid
the same or a confusingly similar name. This fork was originally developed
under the name *Intender* for personal use, and has been renamed to **Ajar** so
that there is no ambiguity about which project is the original.

Ajar is not affiliated with, endorsed by, or published by the Intender project.
It is a personal, non-commercial fork and is not distributed through any
extension store.

## Icons

The ghost glyph is from [Tabler Icons](https://github.com/tabler/tabler-icons)
by Paweł Kuna, MIT licensed.
