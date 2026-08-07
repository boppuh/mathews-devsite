# Ryan Mathews — Personal Website

The source for [ryanmathews.dev](https://ryanmathews.dev), a static portfolio focused on senior iOS engineering, product impact, and real-time systems.

## Stack

- Semantic HTML
- Responsive CSS with light and dark themes
- Self-hosted Geist and Geist Mono variable fonts
- Vanilla JavaScript for theme preferences, navigation state, and motion
- Locally vendored GSAP and ScrollTrigger for progressive motion
- No framework or build step

## Local preview

From the repository root:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## Validation

Run the launch-readiness checks with:

```bash
python3 scripts/validate_site.py
node --check script.js
xmllint --noout sitemap.xml
```

The validation script checks HTML structure, duplicate IDs, local references, image dimensions and alt text, canonical URLs, JSON-LD, CSS variables, and production-domain placeholders.

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

When content changes, update the relevant `lastmod` entry in `sitemap.xml` and keep canonical, Open Graph, and structured-data URLs on `https://ryanmathews.dev`.
