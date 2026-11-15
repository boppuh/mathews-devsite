#!/usr/bin/env python3
"""Run dependency-free launch-readiness checks for the static site."""

from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse


ROOT = Path(__file__).resolve().parent.parent
HTML_FILES = (ROOT / "index.html", ROOT / "writeups/project-1.html", ROOT / "404.html")
PRODUCTION_HTML = (ROOT / "index.html", ROOT / "writeups/project-1.html")
PRODUCTION_ORIGIN = "https://ryanmathews.dev"
STYLESHEETS = tuple(sorted(ROOT.glob("*.css")))
SCRIPTS = tuple(sorted(ROOT.glob("*.js")))
SCRIPT_SOURCE_ATTRIBUTES = ("data-gsap-src", "data-scroll-trigger-src")
VOID_ELEMENTS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
    "meta", "param", "source", "track", "wbr",
}


class SiteHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[str] = []
        self.errors: list[str] = []
        self.ids: list[str] = []
        self.references: list[tuple[str, str, str]] = []
        self.images: list[dict[str, str | None]] = []
        self.canonicals: list[str] = []
        self.meta: dict[str, str] = {}
        self.json_ld: list[str] = []
        self._in_json_ld = False
        self._json_chunks: list[str] = []

    def _capture(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if element_id := values.get("id"):
            self.ids.append(element_id)
        for attribute in ("href", "src", *SCRIPT_SOURCE_ATTRIBUTES):
            if value := values.get(attribute):
                self.references.append((tag, attribute, value))
        if srcset := values.get("srcset"):
            for candidate in srcset.split(","):
                value = candidate.strip().split()[0]
                if value:
                    self.references.append((tag, "srcset", value))
        if tag == "img":
            self.images.append(values)
        if tag == "link" and values.get("rel") == "canonical" and values.get("href"):
            self.canonicals.append(values["href"] or "")
        if tag == "meta":
            key = values.get("property") or values.get("name")
            if key and values.get("content"):
                self.meta[key] = values["content"] or ""
        if tag == "script" and values.get("type") == "application/ld+json":
            self._in_json_ld = True
            self._json_chunks = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self._capture(tag, attrs)
        if tag not in VOID_ELEMENTS:
            self.stack.append(tag)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self._capture(tag, attrs)

    def handle_endtag(self, tag: str) -> None:
        if not self.stack or self.stack[-1] != tag:
            tail = ", ".join(self.stack[-3:]) or "empty"
            self.errors.append(f"unexpected </{tag}> near line {self.getpos()[0]} (stack: {tail})")
            return
        self.stack.pop()
        if tag == "script" and self._in_json_ld:
            self.json_ld.append("".join(self._json_chunks))
            self._in_json_ld = False

    def handle_data(self, data: str) -> None:
        if self._in_json_ld:
            self._json_chunks.append(data)


def fail(message: str) -> None:
    raise AssertionError(message)


def parse_html(path: Path) -> SiteHTMLParser:
    parser = SiteHTMLParser()
    parser.feed(path.read_text(encoding="utf-8"))
    parser.close()
    if parser.errors:
        fail(f"{path.relative_to(ROOT)}: {'; '.join(parser.errors)}")
    if parser.stack:
        fail(f"{path.relative_to(ROOT)}: unclosed elements: {parser.stack}")
    duplicates = [value for value, count in Counter(parser.ids).items() if count > 1]
    if duplicates:
        fail(f"{path.relative_to(ROOT)}: duplicate IDs: {duplicates}")
    for payload in parser.json_ld:
        json.loads(payload)
    for image in parser.images:
        if image.get("alt") is None:
            fail(f"{path.relative_to(ROOT)}: image is missing alt text: {image.get('src')}")
        if not image.get("width") or not image.get("height"):
            fail(f"{path.relative_to(ROOT)}: image is missing dimensions: {image.get('src')}")
    return parser


def local_target(page: Path, reference: str) -> Path | None:
    parsed = urlparse(reference)
    if parsed.scheme or parsed.netloc:
        return None
    path = unquote(parsed.path)
    if not path:
        return page.resolve()
    target = ROOT / path.lstrip("/") if path.startswith("/") else page.parent / path
    return (target / "index.html" if path.endswith("/") else target).resolve()


def validate_references(page: Path, parser: SiteHTMLParser, parsed_pages: dict[Path, SiteHTMLParser]) -> None:
    for tag, attribute, reference in parser.references:
        target = local_target(page, reference)
        if target is None:
            continue
        if not target.exists():
            fail(f"{page.relative_to(ROOT)}: missing {tag} {attribute} target: {reference}")
        fragment = urlparse(reference).fragment
        if fragment and target.suffix == ".html":
            target_parser = parsed_pages.get(target)
            if target_parser and fragment not in target_parser.ids:
                fail(f"{page.relative_to(ROOT)}: missing fragment target: {reference}")


def validate_metadata(page: Path, parser: SiteHTMLParser) -> None:
    if len(parser.canonicals) != 1:
        fail(f"{page.relative_to(ROOT)}: expected exactly one canonical URL")
    canonical = parser.canonicals[0]
    if not canonical.startswith(PRODUCTION_ORIGIN):
        fail(f"{page.relative_to(ROOT)}: invalid canonical URL: {canonical}")
    required_fields = (
        "description", "og:title", "og:description", "og:url", "og:image",
        "og:image:alt", "og:image:width", "og:image:height", "twitter:card",
        "twitter:image", "twitter:image:alt",
    )
    for required in required_fields:
        if not parser.meta.get(required):
            fail(f"{page.relative_to(ROOT)}: missing metadata field {required}")
    if parser.meta["og:url"] != canonical:
        fail(f"{page.relative_to(ROOT)}: og:url does not match canonical")
    if parser.meta["twitter:image"] != parser.meta["og:image"]:
        fail(f"{page.relative_to(ROOT)}: social image metadata does not match")
    social_image = urlparse(parser.meta["og:image"])
    if social_image.netloc == "ryanmathews.dev":
        image_path = ROOT / unquote(social_image.path).lstrip("/")
        if not image_path.exists():
            fail(f"{page.relative_to(ROOT)}: social image does not exist: {social_image.path}")


def validate_css() -> None:
    styles = {
        path: re.sub(r"/\*.*?\*/", "", path.read_text(encoding="utf-8"), flags=re.S)
        for path in STYLESHEETS
    }
    definitions = set(re.findall(r"(--[a-z0-9-]+)\s*:", "\n".join(styles.values())))
    for path in SCRIPTS:
        definitions.update(re.findall(r"setProperty\(['\"](--[a-z0-9-]+)", path.read_text(encoding="utf-8")))
    for path, css in styles.items():
        if css.count("{") != css.count("}"):
            fail(f"{path.name}: unbalanced braces")
        references = set(re.findall(r"var\((--[a-z0-9-]+)\s*\)", css))
        if missing := sorted(references - definitions):
            fail(f"{path.name}: undefined custom properties: {missing}")
        for reference in re.findall(r"""url\(\s*['"]?([^'")]+)['"]?\s*\)""", css):
            target = local_target(path, reference.strip())
            if target is not None and not target.is_file():
                fail(f"{path.name}: missing CSS asset: {reference}")


def validate_asset_versions(parsed_pages: dict[Path, SiteHTMLParser]) -> None:
    versions: dict[Path, set[str]] = {}
    for page, parser in parsed_pages.items():
        for _, _, reference in parser.references:
            target = local_target(page, reference)
            if target is None or target.suffix not in {".css", ".js"}:
                continue
            version = parse_qs(urlparse(reference).query).get("v", [""])[0]
            if not version:
                fail(f"{page.relative_to(ROOT)}: missing asset version: {reference}")
            versions.setdefault(target, set()).add(version)
    for target, values in versions.items():
        if len(values) > 1:
            fail(f"{target.relative_to(ROOT)}: inconsistent asset versions: {sorted(values)}")


def validate_sitemap(production_pages: dict[Path, SiteHTMLParser]) -> None:
    sitemap_path = ROOT / "sitemap.xml"
    tree = ET.parse(sitemap_path)
    namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locations = {element.text for element in tree.findall("sm:url/sm:loc", namespace)}
    canonicals = {parser.canonicals[0] for parser in production_pages.values()}
    if not canonicals.issubset(locations):
        fail(f"sitemap.xml: missing canonical URLs: {sorted(canonicals - locations)}")


def validate_no_placeholders() -> None:
    checked = [*HTML_FILES, *STYLESHEETS, *SCRIPTS, ROOT / "robots.txt", ROOT / "sitemap.xml"]
    banned = re.compile(r"yourdomain\.com|example\.com|lorem ipsum|EDIT HERE", re.I)
    for path in checked:
        if match := banned.search(path.read_text(encoding="utf-8")):
            fail(f"{path.relative_to(ROOT)}: production placeholder found: {match.group(0)}")


def main() -> int:
    parsed_pages = {path.resolve(): parse_html(path) for path in HTML_FILES}
    for path in HTML_FILES:
        validate_references(path, parsed_pages[path.resolve()], parsed_pages)
    production_pages = {path: parsed_pages[path.resolve()] for path in PRODUCTION_HTML}
    for path, parser in production_pages.items():
        validate_metadata(path, parser)
    validate_css()
    validate_asset_versions(parsed_pages)
    validate_sitemap(production_pages)
    validate_no_placeholders()
    html_text = "\n".join(path.read_text(encoding="utf-8") for path in HTML_FILES)
    if "Senior Software Engineer" in html_text or "<h3>Software Engineer</h3>" not in html_text:
        fail("Meta title must remain Software Engineer")
    print(f"Site validation passed: {len(HTML_FILES)} HTML pages and all production assets are ready.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, ET.ParseError, json.JSONDecodeError) as error:
        print(f"Validation failed: {error}", file=sys.stderr)
        raise SystemExit(1)
