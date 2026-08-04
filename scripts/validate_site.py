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
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parent.parent
HTML_FILES = (ROOT / "index.html", ROOT / "writeups/project-1.html", ROOT / "404.html")
PRODUCTION_HTML = (ROOT / "index.html", ROOT / "writeups/project-1.html")
PRODUCTION_ORIGIN = "https://ryanmathews.dev"
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
        for attribute in ("href", "src"):
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
    if parsed.scheme or reference.startswith(("mailto:", "tel:", "data:")):
        return None
    relative = unquote(parsed.path)
    return (page.parent / relative).resolve() if relative else page.resolve()


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
    css = (ROOT / "styles.css").read_text(encoding="utf-8")
    without_comments = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    if without_comments.count("{") != without_comments.count("}"):
        fail("styles.css: unbalanced braces")
    definitions = set(re.findall(r"(--[a-z0-9-]+)\s*:", css))
    references = set(re.findall(r"var\((--[a-z0-9-]+)", css))
    if missing := sorted(references - definitions):
        fail(f"styles.css: undefined custom properties: {missing}")


def validate_sitemap(production_pages: dict[Path, SiteHTMLParser]) -> None:
    sitemap_path = ROOT / "sitemap.xml"
    tree = ET.parse(sitemap_path)
    namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locations = {element.text for element in tree.findall("sm:url/sm:loc", namespace)}
    canonicals = {parser.canonicals[0] for parser in production_pages.values()}
    if not canonicals.issubset(locations):
        fail(f"sitemap.xml: missing canonical URLs: {sorted(canonicals - locations)}")


def validate_no_placeholders() -> None:
    checked = [*HTML_FILES, ROOT / "styles.css", ROOT / "script.js", ROOT / "robots.txt", ROOT / "sitemap.xml"]
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
