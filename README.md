# mathews-devsite

A minimalist, production-ready resume website for software engineers. Built with HTML, CSS, and vanilla JavaScript—no frameworks, no build step.

## Features

- **Fast & Lightweight**: No dependencies, minimal JavaScript, optimized SVGs
- **Responsive**: Mobile-first design that looks great on all devices
- **Accessible**: Semantic HTML, keyboard navigation, skip links, ARIA labels
- **Dark Mode**: Automatic (system preference) + manual toggle
- **SEO Ready**: Open Graph tags, Twitter cards, JSON-LD structured data, sitemap
- **Easy to Customize**: All content marked with "EDIT HERE" comments

## Quick Start

### Preview Locally

1. Clone or download this repository
2. Open a terminal in the project directory
3. Start a local server:

   ```bash
   # Python 3
   python -m http.server 8000

   # Python 2
   python -m SimpleHTTPServer 8000

   # Node.js (if you have npx)
   npx serve

   # PHP
   php -S localhost:8000
   ```

4. Open [http://localhost:8000](http://localhost:8000) in your browser

## Customization Guide

### Step 1: Update Personal Information

Search for `EDIT HERE` comments throughout the codebase. Key files to edit:

#### index.html
- **Line ~10-12**: Page title and meta description
- **Line ~15**: Canonical URL (your domain)
- **Line ~18-24**: Open Graph tags
- **Line ~37-46**: JSON-LD structured data (name, email, social links)
- **Line ~71**: Your name
- **Line ~74**: Your title/role
- **Line ~77-80**: Your value proposition/tagline
- **Line ~84-85**: Status badge (open to work, location)
- **Line ~90-101**: Primary links (email, GitHub, LinkedIn)
- **Lines ~110+**: Projects section
- **Lines ~180+**: Experience section
- **Lines ~250+**: Skills section
- **Lines ~310+**: Writing/Open Source section
- **Lines ~350+**: Contact section

#### writeups/project-1.html
- Update the case study content with your actual project details
- Duplicate this file for additional project writeups

#### assets/og-image.svg
- Update the name and tagline in the SVG
- Update the domain at the bottom

#### robots.txt & sitemap.xml
- Replace `yourdomain.com` with your actual domain

### Step 2: Add Your Resume PDF

Replace the placeholder `resume.pdf` with your actual resume:

1. Export your resume as a PDF
2. Name it `resume.pdf`
3. Place it in the root directory (same level as `index.html`)

### Step 3: Update Images (Optional)

#### Headshot
Uncomment the headshot line in `index.html` (~line 67) and either:
- Replace `assets/headshot-placeholder.svg` with your photo
- Update the `src` to point to your image file

#### Favicon
Edit `assets/favicon.svg` to change the initials or colors.

#### Open Graph Image
Edit `assets/og-image.svg` or replace with a 1200x630 PNG/JPG for better social media previews.

### Step 4: Customize Colors (Optional)

Edit the CSS custom properties in `styles.css` (lines 10-40) to change:
- Primary color (`--color-primary`)
- Background colors
- Text colors
- Border colors

## File Structure

```
mathews-devsite/
├── index.html          # Main page with all sections
├── styles.css          # All styles including dark mode
├── script.js           # Theme toggle, year update
├── 404.html            # Error page
├── robots.txt          # Search engine directives
├── sitemap.xml         # Sitemap for SEO
├── resume.pdf          # Your resume (replace placeholder)
├── README.md           # This file
├── assets/
│   ├── favicon.svg     # Browser tab icon
│   ├── og-image.svg    # Social sharing image
│   ├── headshot-placeholder.svg
│   └── project-placeholder.svg
└── writeups/
    └── project-1.html  # Sample case study
```

## Deployment

### GitHub Pages

1. Create a new repository on GitHub
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin git@github.com:USERNAME/REPO.git
   git push -u origin main
   ```
3. Go to repository **Settings** → **Pages**
4. Under "Source", select **main** branch
5. Your site will be live at `https://USERNAME.github.io/REPO/`

**Note**: If deploying to a subpath (like `/REPO/`), the relative paths (`./`) should work correctly.

### Custom Domain with GitHub Pages

1. In your DNS provider, add:
   - A record: `185.199.108.153` (and .109, .110, .111)
   - Or CNAME: `USERNAME.github.io`
2. In repository **Settings** → **Pages**, enter your custom domain
3. Check "Enforce HTTPS"
4. Update all URLs in `index.html`, `sitemap.xml`, and `robots.txt`

### Netlify

1. Connect your GitHub repository to Netlify
2. Deploy settings:
   - Build command: (leave empty)
   - Publish directory: `.` or `/`
3. Your site deploys automatically on push

**Custom Domain**: Add in Netlify dashboard under **Domain settings**

### Vercel

1. Import your repository to Vercel
2. Framework Preset: **Other**
3. No build settings needed
4. Deploy

**Custom Domain**: Add in Vercel dashboard under **Domains**

### Cloudflare Pages

1. Connect your repository
2. Build settings:
   - Build command: (leave empty)
   - Build output directory: `/`
3. Deploy

## Performance Tips

This site is already optimized, but here are additional tips:

1. **Images**: If you add photos, compress them with [Squoosh](https://squoosh.app/) or use WebP format
2. **Fonts**: The site uses system fonts for instant loading
3. **CSS**: Consider using a tool like [PurgeCSS](https://purgecss.com/) if you remove sections
4. **Caching**: Most static hosts handle this automatically

## Accessibility Features

- Skip to main content link
- Semantic HTML structure (`header`, `main`, `nav`, `section`, `article`, `footer`)
- ARIA labels on interactive elements
- Keyboard-navigable (tab through all links and buttons)
- Focus indicators on all interactive elements
- Respects `prefers-reduced-motion` for animations
- Sufficient color contrast in both light and dark modes

## Browser Support

Works in all modern browsers:
- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)

## License

This template is free to use for personal and commercial projects. Attribution is appreciated but not required.

---

Built with HTML, CSS, and a little vanilla JS. No frameworks, no build step, no nonsense.
