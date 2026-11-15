# Ryan Mathews | Personal Website

The source for [ryanmathews.dev](https://ryanmathews.dev), a static portfolio focused on senior iOS engineering, product impact, and real-time systems.

## Stack

- Semantic HTML
- Responsive CSS with light and dark themes
- Self-hosted Geist and Geist Mono variable fonts
- Vanilla JavaScript for theme preferences, navigation state, and motion
- Locally vendored GSAP and ScrollTrigger for reading-view motion when reduced motion is off
- No framework or build step

## Local preview

From the repository root:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

Open [the Windows 95 desktop preview](http://localhost:8000/?view=desktop) to try
the portfolio windows and Start menu. Work Experience and Projects include
file lists that jump to individual roles and projects. Drag a title bar or use **Move** and the
arrow keys to position a window. Use the taskbar to switch windows or restore a
minimized one. **Read as a page** opens the full portfolio.

Choose Classic, Dark, or System under **Start → Display Settings**. The desktop
and Threads document use this preference. The standard reading view keeps its own theme.
The [Threads case study](http://localhost:8000/writeups/project-1.html) offers
both views at the same route.

## Validation

Run the launch-readiness checks with:

```bash
python3 scripts/validate_site.py
node --check script.js
node --check desktop.js
node --check desktop-theme.js
node --check desktop-documents.js
xmllint --noout sitemap.xml
```

The validator checks HTML structure, duplicate IDs, local references, image attributes,
canonical metadata, JSON-LD, CSS variables and assets, and consistent cache versions.

Before merging a redesign release, verify the deployment preview in Chrome and a
WebKit browser. Check the desktop, reading view, and case study at desktop and
phone widths. Test keyboard window controls, Start navigation, deep links and
history, display preferences, print and JavaScript-disabled browsing, and recovery
from a nested missing URL.

## Structure

```text
.
├── index.html                  # Homepage
├── styles.css                 # Shared design system and responsive styles
├── script.js                  # Theme, navigation, and motion behavior
├── 404.html                   # Custom not-found page
├── writeups/project-1.html    # Threads product-growth case study
├── assets/                    # Images, fonts, font license, logos, favicon, and social card
├── resume.pdf                 # Current résumé
├── robots.txt
└── sitemap.xml
```

## Publishing

The production site and pull-request previews are deployed through Netlify. Merging an approved pull request into `main` publishes the corresponding site update.

The Windows 95 preview is available at `/?view=desktop`. Use the PR deployment URL
to review it before publishing.

When content changes, update the relevant `lastmod` entry in `sitemap.xml` and keep canonical, Open Graph, and structured-data URLs on `https://ryanmathews.dev`.

## Credits

- [Win9x icon attribution](/assets/win9x-icons-LICENSE.md)
- [98.css license](/assets/98css-LICENSE.txt)
