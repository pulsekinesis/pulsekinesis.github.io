// render.js
// @pulsekinesis
//
// Markdown -> HTML, the post page template and the RSS feeds.
// Only the editor loads this file (it needs marked + highlight.js on the page).
// Readers never download it: every post is saved as a finished HTML page.

// Bump this when blog.css / blog.js change, then use "Rebuild all pages" in the
// editor so every post points at the new files instead of a cached copy.
export const ASSET_VERSION = "1";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];

const LANG_LABELS = {
    js: "JavaScript", javascript: "JavaScript", ts: "TypeScript", typescript: "TypeScript",
    lua: "Lua", luau: "Luau", py: "Python", python: "Python", css: "CSS", scss: "SCSS",
    html: "HTML", xml: "XML", json: "JSON", bash: "Bash", sh: "Shell", shell: "Shell",
    c: "C", cpp: "C++", "c++": "C++", cs: "C#", csharp: "C#", rust: "Rust", go: "Go",
    sql: "SQL", md: "Markdown", markdown: "Markdown", x86asm: "x86 ASM", asm: "Assembly",
    basic: "BASIC", diff: "Diff", yaml: "YAML", ini: "INI", glsl: "GLSL",
    text: "Text", txt: "Text", plaintext: "Text",
};

// ---------------------------------------------------------------- helpers --

export function escapeHtml(s) {
    return String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
const e = escapeHtml;

export function slugify(text) {
    return String(text ?? "")
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80)
        .replace(/-+$/, "");
}

// "2026-10-05T14:30:00-05:00" -> "October 5, 2026". Reads the date part as written,
// so a post shows the day it was written for every reader, whatever their time zone.
export function formatDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!m) return "";
    return `${MONTHS[+m[2] - 1]} ${+m[3]}, ${m[1]}`;
}

// Local time with its UTC offset, e.g. 2026-10-05T14:30:00-05:00
export function localIso(d = new Date()) {
    const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, "0");
    const off = -d.getTimezoneOffset();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
        `T${pad(d.getHours())}:${pad(d.getMinutes())}:00` +
        `${off >= 0 ? "+" : "-"}${pad(off / 60)}:${pad(off % 60)}`;
}

export function categoryLabel(site, id) {
    return site.categories?.find((c) => c.id === id)?.label ?? id;
}

function parseAttrs(s = "") {
    const out = {};
    for (const m of s.matchAll(/([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+)))?/g)) {
        out[m[1]] = m[2] ?? m[3] ?? m[4] ?? true;
    }
    return out;
}

export function youtubeId(s) {
    s = String(s ?? "").trim();
    if (/^[\w-]{11}$/.test(s)) return s;
    try {
        const u = new URL(s);
        if (u.hostname.endsWith("youtu.be")) return u.pathname.slice(1, 12);
        if (u.searchParams.get("v")) return u.searchParams.get("v").slice(0, 11);
        const m = u.pathname.match(/\/(?:embed|shorts|live|v)\/([\w-]{11})/);
        if (m) return m[1];
    } catch { /* not a URL */ }
    return "";
}

function youtubeStart(s, attrs) {
    if (attrs.start) return parseInt(attrs.start, 10) || 0;
    try {
        const t = new URL(s).searchParams.get("t") || "";
        const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(t);
        if (m) return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
    } catch { /* not a URL */ }
    return 0;
}

function absoluteUrl(v, base) {
    if (!v) return v;
    try { return new URL(v, base).href; } catch { return v; }
}

// ------------------------------------------------------------ front matter --
//
// ---
// title: "My post"
// date: "2026-10-05T14:30:00-05:00"
// categories: ["programming", "gaming"]
// banner: "media/banner.png"
// ---
// Values are JSON, but plain YAML-ish values (title: My post, categories: [a, b]) work too.

export function parsePost(src) {
    src = String(src ?? "").replace(/\r\n?/g, "\n");
    const meta = {};
    let body = src;
    const m = /^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(src);
    if (m) {
        body = src.slice(m[0].length);
        for (const line of m[1].split("\n")) {
            const kv = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
            if (kv) meta[kv[1]] = parseValue(kv[2].trim());
        }
    }
    if (typeof meta.categories === "string") meta.categories = meta.categories.split(",").map((s) => s.trim()).filter(Boolean);
    return { meta, body: body.replace(/^\n+/, "") };
}

function parseValue(v) {
    if (v === "") return "";
    try { return JSON.parse(v); } catch { /* fall through */ }
    if (v.startsWith("[") && v.endsWith("]")) {
        return v.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    }
    return v.replace(/^'(.*)'$/, "$1");
}

const META_ORDER = ["title", "date", "updated", "categories", "banner", "banner_alt", "summary"];

export function serializePost(meta, body) {
    const keys = [...META_ORDER.filter((k) => k in meta), ...Object.keys(meta).filter((k) => !META_ORDER.includes(k))];
    const lines = keys
        .filter((k) => meta[k] !== undefined && meta[k] !== null && meta[k] !== "" && !(Array.isArray(meta[k]) && !meta[k].length))
        .map((k) => `${k}: ${JSON.stringify(meta[k])}`);
    return `---\n${lines.join("\n")}\n---\n\n${String(body ?? "").trim()}\n`;
}

// --------------------------------------------------------------- markdown --
//
// Extra syntax on top of GitHub-flavored markdown (each on its own line):
//   !audio[Song title](media/song.mp3){artist="Someone" cover="media/cover.png" loop}
//   !video[Caption](media/clip.mp4){poster="media/poster.png" loop muted autoplay}
//   !youtube[Caption](https://youtu.be/VIDEO_ID){start=30}
// Code fences can carry a file name:  ```lua title="Gun.lua"

const MEDIA_RE = /^!(audio|video|youtube)\[([^\]\n]*)\]\(\s*<?([^)\s>]+)>?\s*\)(?:\{([^}\n]*)\})?[ \t]*(?:\n+|$)/;

// Tracker modules (played in the browser by libopenmpt, see blog.js).
export const TRACKER_EXT = ["mod", "s3m", "xm", "it", "mptm", "mo3", "669", "amf", "ams", "c67", "dbm", "digi", "dmf", "dsm",
    "dtm", "far", "fmt", "gdm", "imf", "ice", "j2b", "m15", "mdl", "med", "mms", "mt2", "mtm", "mus", "nst", "okt", "plm",
    "psm", "pt36", "ptm", "sfx", "sfx2", "st26", "stk", "stm", "stx", "stp", "symmod", "ult", "umx", "wow", "xmf"];
const TRACKER_RE = new RegExp(`\\.(${TRACKER_EXT.join("|")})(?:[?#].*)?$`, "i");

export function isTracker(src) {
    return TRACKER_RE.test(String(src ?? ""));
}

function trackerExt(src) {
    return (TRACKER_RE.exec(src)?.[1] || "").toLowerCase();
}

let setupDone = false;
function setup() {
    if (setupDone) return;
    const hl = window.hljs;
    if (hl) {
        hl.registerAliases(["luau"], { languageName: "lua" });
        if (hl.getLanguage("x86asm")) hl.registerAliases(["asm", "nasm"], { languageName: "x86asm" });
    }
    setupDone = true;
}

function mediaExtension(feed) {
    return {
        name: "pkMedia",
        level: "block",
        start(src) {
            const m = src.match(/(^|\n)!(?:audio|video|youtube)\[/);
            return m ? m.index + m[1].length : undefined;
        },
        tokenizer(src) {
            const m = MEDIA_RE.exec(src);
            if (!m) return undefined;
            return { type: "pkMedia", raw: m[0], kind: m[1], label: m[2].trim(), src: m[3], attrs: parseAttrs(m[4]) };
        },
        renderer(t) {
            return feed ? mediaFeed(t) : mediaPage(t);
        },
    };
}

function mediaPage({ kind, label, src, attrs }) {
    const cap = label ? `<figcaption>${e(label)}</figcaption>` : "";
    if (kind === "audio") {
        const artist = typeof attrs.artist === "string" ? attrs.artist : "";
        const cover = typeof attrs.cover === "string" ? ` data-cover="${e(attrs.cover)}"` : "";
        if (isTracker(src)) {
            // No <audio> tag: browsers can't play modules natively. blog.js builds the player.
            return `<figure class="pk-player pk-audio pk-tracker" data-src="${e(src)}" data-ext="${trackerExt(src)}" data-title="${e(label)}" data-artist="${e(artist)}"${cover}${attrs.loop ? " data-loop" : ""}>` +
                `<a class="pk-tracker-fallback" href="${e(src)}" download>♪ ${e(label || "Untitled")} <span>(.${trackerExt(src)} module)</span></a>` +
                `<figcaption>${e(label || "Untitled")}${artist ? ` <span class="pk-artist">— ${e(artist)}</span>` : ""}</figcaption></figure>\n`;
        }
        return `<figure class="pk-player pk-audio" data-title="${e(label)}" data-artist="${e(artist)}"${cover}>` +
            `<audio src="${e(src)}" preload="metadata" controls${attrs.loop ? " loop" : ""}></audio>` +
            `<figcaption>${e(label || "Untitled")}${artist ? ` <span class="pk-artist">— ${e(artist)}</span>` : ""}</figcaption></figure>\n`;
    }
    if (kind === "video") {
        const flags = (attrs.loop ? " loop" : "") + (attrs.muted || attrs.autoplay ? " muted" : "") + (attrs.autoplay ? " autoplay" : "");
        const poster = typeof attrs.poster === "string" ? ` poster="${e(attrs.poster)}"` : "";
        return `<figure class="pk-player pk-video"><video src="${e(src)}" preload="metadata" controls playsinline${poster}${flags}></video>${cap}</figure>\n`;
    }
    const id = youtubeId(src);
    if (!id) return `<p class="pk-error">Couldn't find a YouTube video ID in <code>${e(src)}</code></p>\n`;
    const start = youtubeStart(src, attrs);
    const watch = `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}s` : ""}`;
    return `<figure class="pk-youtube" data-id="${id}"${start ? ` data-start="${start}"` : ""}>` +
        `<a class="pk-yt-link" href="${e(watch)}" target="_blank" rel="noopener">` +
        `<img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="${e(label || "YouTube video")}" loading="lazy">` +
        `<span class="pk-yt-play" aria-hidden="true"></span></a>${cap}</figure>\n`;
}

// Feed readers don't run our scripts, so media falls back to plain tags and links.
function mediaFeed({ kind, label, src, attrs }) {
    if (kind === "audio") {
        if (isTracker(src)) {
            return `<p><a href="${e(src)}">♪ ${e(label || "Listen")}</a> (.${trackerExt(src)} tracker module, plays on the blog or in OpenMPT / MilkyTracker)</p>\n`;
        }
        return `<p><audio controls preload="none" src="${e(src)}"></audio><br><a href="${e(src)}">♪ ${e(label || "Listen")}</a></p>\n`;
    }
    if (kind === "video") {
        const poster = typeof attrs.poster === "string" ? ` poster="${e(attrs.poster)}"` : "";
        return `<p><video controls preload="none" src="${e(src)}"${poster} style="max-width:100%"></video>${label ? `<br>${e(label)}` : ""}</p>\n`;
    }
    const id = youtubeId(src);
    if (!id) return "";
    const watch = `https://www.youtube.com/watch?v=${id}`;
    return `<p><a href="${watch}"><img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="${e(label || "YouTube video")}"></a><br><a href="${watch}">▶ ${e(label || "Watch on YouTube")}</a></p>\n`;
}

/**
 * Render markdown.
 *   mode:    "page" (the blog) or "feed" (RSS readers: no scripts, absolute URLs)
 *   base:    rewrite relative URLs against this absolute URL
 *   resolve: (url) => replacement | undefined, checked before `base`
 *            (the editor uses it to show media that hasn't been saved yet)
 */
export function renderMarkdown(md, { mode = "page", base = "", resolve = null, siteOrigin = "" } = {}) {
    setup();
    const feed = mode === "feed";
    const used = new Map();
    const headings = [];
    const instance = new window.marked.Marked();

    instance.use({
        gfm: true,
        extensions: [mediaExtension(feed)],
        renderer: {
            heading({ tokens, depth }) {
                const inner = this.parser.parseInline(tokens);
                const text = htmlToText(inner);
                let id = slugify(text) || "section";
                const n = used.get(id) || 0;
                used.set(id, n + 1);
                if (n) id += `-${n}`;
                headings.push({ depth, text, id });
                if (feed) return `<h${depth}>${inner}</h${depth}>\n`;
                return `<h${depth} id="${id}">${inner}<a class="heading-anchor" href="#${id}" aria-label="Link to this section">#</a></h${depth}>\n`;
            },
            code({ text, lang }) {
                const info = (lang || "").trim();
                const language = (/^[^\s{]+/.exec(info) || [""])[0].toLowerCase();
                const attrs = parseAttrs(info.slice(language.length).replace(/[{}]/g, " "));
                if (feed) return `<pre><code>${e(text)}</code></pre>\n`;
                const hl = window.hljs;
                const known = language && hl?.getLanguage(language);
                const body = known ? hl.highlight(text, { language, ignoreIllegals: true }).value : e(text);
                const label = typeof attrs.title === "string" ? attrs.title : (LANG_LABELS[language] || language || "text");
                return `<figure class="code-block"><figcaption class="code-head"><span class="code-lang">${e(label)}</span>` +
                    `<button type="button" class="code-copy">copy</button></figcaption>` +
                    `<pre><code class="hljs${language ? ` language-${e(language)}` : ""}">${body}</code></pre></figure>\n`;
            },
        },
    });

    const raw = instance.parse(String(md ?? ""));
    return { html: postProcess(raw, { feed, base, resolve, siteOrigin }), headings };
}

function postProcess(html, { feed, base, resolve, siteOrigin }) {
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    const root = tpl.content;

    // A paragraph holding just an image (optionally wrapped in a link) becomes a figure.
    // The image title becomes the caption:  ![alt](media/pic.png "Caption")
    for (const p of [...root.querySelectorAll("p")]) {
        const kids = [...p.childNodes].filter((n) => !(n.nodeType === 3 && !n.textContent.trim()));
        if (kids.length !== 1) continue;
        const only = kids[0];
        const img = only.nodeName === "IMG" ? only
            : (only.nodeName === "A" && only.children.length === 1 && only.firstElementChild.nodeName === "IMG" && !only.textContent.trim()) ? only.firstElementChild
            : null;
        if (!img) continue;
        const fig = document.createElement("figure");
        fig.className = "post-figure";
        fig.append(only);
        const caption = img.getAttribute("title");
        if (caption) {
            const fc = document.createElement("figcaption");
            fc.textContent = caption;
            fig.append(fc);
        }
        p.replaceWith(fig);
    }

    for (const img of root.querySelectorAll("img")) {
        if (!img.hasAttribute("loading")) img.setAttribute("loading", "lazy");
        img.setAttribute("decoding", "async");
    }

    if (!feed) {
        for (const t of [...root.querySelectorAll("table")]) {
            const wrap = document.createElement("div");
            wrap.className = "table-wrap";
            t.replaceWith(wrap);
            wrap.append(t);
        }
    }

    for (const a of root.querySelectorAll("a[href]")) {
        const href = a.getAttribute("href");
        if (/^https?:\/\//i.test(href) && !(siteOrigin && href.startsWith(siteOrigin)) && !a.hasAttribute("target")) {
            a.setAttribute("target", "_blank");
            a.setAttribute("rel", "noopener");
        }
    }

    if (base || resolve) {
        for (const el of root.querySelectorAll("[src],[href],[poster],[data-cover],[data-src]")) {
            for (const attr of ["src", "href", "poster", "data-cover", "data-src"]) {
                const v = el.getAttribute(attr);
                if (v != null) el.setAttribute(attr, resolveUrl(v, base, resolve));
            }
        }
    }

    return tpl.innerHTML;
}

export function resolveUrl(v, base, resolve) {
    if (resolve) {
        const r = resolve(v);
        if (r) return r;
    }
    if (!base || /^(?:[a-z][a-z0-9+.-]*:|#)/i.test(v)) return v;
    return absoluteUrl(v, base);
}

export function htmlToText(html) {
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    tpl.content.querySelectorAll(".heading-anchor, .code-copy, .code-head, .pk-tracker-fallback, script, style").forEach((n) => n.remove());
    return tpl.content.textContent.replace(/\s+/g, " ").trim();
}

export function readingMinutes(text) {
    return Math.max(1, Math.round((text.match(/\S+/g) || []).length / 220));
}

export function autoSummary(html, max = 220) {
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    const p = [...tpl.content.querySelectorAll("p")].find((x) => x.textContent.trim().length > 20);
    const text = (p?.textContent || htmlToText(html)).replace(/\s+/g, " ").trim();
    if (text.length <= max) return text;
    return text.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

// -------------------------------------------------------------- templates --

const RSS_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="5" cy="19" r="2.2"/><path d="M3 10.5A10.5 10.5 0 0 1 13.5 21h-3A7.5 7.5 0 0 0 3 13.5z"/><path d="M3 4a17 17 0 0 1 17 17h-3A14 14 0 0 0 3 7z"/></svg>`;

// Keep in sync with the copies in blog/index.html, archive/ and feedback/.
export function siteHeader(active = "") {
    const cls = (k) => (k === active ? ` class="active" aria-current="page"` : "");
    return `<header class="site-header">
    <a class="brand" href="/blog/"><span class="website-title">pulsekinesis</span><span class="brand-sub">blog</span></a>
    <p class="pronounce">(PULS·kih·NEE·sis)</p>
    <nav class="main-menu" aria-label="Main">
        <a href="/">Home</a>
        <a href="/blog/"${cls("blog")}>Blog</a>
        <a href="/blog/archive/"${cls("archive")}>Archive</a>
        <a href="/blog/feedback/"${cls("feedback")}>Feedback</a>
        <a class="menu-rss" href="/blog/feed.xml" title="RSS feed" aria-label="RSS feed">${RSS_ICON}</a>
    </nav>
</header>`;
}

export function siteFooter() {
    return `<footer class="site-footer">
    <hr class="dots">
    <p>pulsekinesis · <a href="/">portfolio</a> · <a href="/blog/feed.xml">rss</a> · <a href="/blog/feedback/">feedback</a></p>
</footer>`;
}

function inlineSafe(code, tag) {
    return String(code ?? "").replace(new RegExp(`</(${tag})`, "gi"), "<\\/$1");
}

/**
 * The full HTML page for one post.
 *   css/js:  the post's custom code. With inline=true it's embedded (editor preview),
 *            otherwise the page links post.css / post.js next to it.
 */
export function postPage({ site, slug, meta, html, minutes, css = "", js = "", inline = false, baseHref = "" }) {
    const url = `${site.url}/blog/posts/${slug}/`;
    const title = meta.title || "Untitled";
    const summary = meta.summary || "";
    const ogImage = meta.banner ? absoluteUrl(meta.banner, url) : `${site.url}/images/logo.png`;
    const cats = (meta.categories || []);
    const chips = cats.map((id) => `<a class="chip" href="/blog/archive/?category=${encodeURIComponent(id)}">${e(categoryLabel(site, id))}</a>`).join("");
    const updated = meta.updated && meta.updated.slice(0, 10) !== (meta.date || "").slice(0, 10)
        ? ` · updated <time datetime="${e(meta.updated)}">${formatDate(meta.updated)}</time>` : "";
    const hasCss = css.trim() !== "";
    const hasJs = js.trim() !== "";
    const v = ASSET_VERSION;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
${baseHref ? `<base href="${e(baseHref)}">\n` : ""}<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${e(title)} · ${e(site.title)}</title>
<meta name="description" content="${e(summary)}">
<meta name="author" content="${e(site.author)}">
<link rel="canonical" href="${e(url)}">
<link rel="icon" type="image/x-icon" href="/images/favicon.ico">
<link rel="alternate" type="application/rss+xml" title="${e(site.title)} blog" href="/blog/feed.xml">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${e(site.title)}">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(summary)}">
<meta property="og:url" content="${e(url)}">
<meta property="og:image" content="${e(ogImage)}">
${meta.banner_alt ? `<meta property="og:image:alt" content="${e(meta.banner_alt)}">\n` : ""}<meta property="article:published_time" content="${e(meta.date || "")}">
${cats.map((c) => `<meta property="article:tag" content="${e(categoryLabel(site, c))}">`).join("\n")}
<meta name="twitter:card" content="${meta.banner ? "summary_large_image" : "summary"}">
<meta name="theme-color" content="#0008FF">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=PT+Serif:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/blog/assets/blog.css?v=${v}">
<link rel="stylesheet" href="/blog/assets/custom.css?v=${v}">
${hasCss ? (inline ? `<style id="post-css">\n${inlineSafe(css, "style")}\n</style>` : `<link rel="stylesheet" href="post.css">`) : ""}
</head>
<body class="blog" data-page="post" data-slug="${e(slug)}">
<canvas id="bg-canvas" class="backg-canvas" aria-hidden="true"></canvas>
<div class="read-progress" aria-hidden="true"></div>
${siteHeader("blog")}
<div class="layout">
    <main class="content" id="main">
        <article class="post panel">
${meta.banner ? `            <figure class="post-banner"><img src="${e(meta.banner)}" alt="${e(meta.banner_alt || "")}" fetchpriority="high"></figure>\n` : ""}            <header class="post-head">
                ${chips ? `<div class="chips">${chips}</div>` : ""}
                <h1 class="post-title">${e(title)}</h1>
                <p class="post-meta"><time datetime="${e(meta.date || "")}">${formatDate(meta.date)}</time> · ${minutes} min read${updated}</p>
            </header>
            <hr class="dots">
            <div class="post-body prose">
${html}
            </div>
            <footer class="post-foot">
                <hr class="dots">
                <nav class="post-nav" id="post-nav" aria-label="More posts"></nav>
            </footer>
        </article>
    </main>
    <aside class="sidebar" id="sidebar" aria-label="Sidebar"></aside>
</div>
${siteFooter()}
<script src="/blog/assets/custom.js?v=${v}" defer></script>
<script type="module" src="/blog/assets/blog.js?v=${v}"></script>
${hasJs ? (inline ? `<script type="module" id="post-js">\n${inlineSafe(js, "script")}\n</script>` : `<script type="module" src="post.js"></script>`) : ""}
</body>
</html>
`;
}

// ------------------------------------------------------------------ feeds --

function x(s) {
    return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function cdata(s) {
    return `<![CDATA[${String(s ?? "").replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

/**
 * RSS 2.0 feed. items: [{ entry, html }] newest first, where entry is a posts.json
 * entry and html is the post rendered with mode "feed".
 */
export function buildFeed({ site, items, category = null }) {
    const blogUrl = `${site.url}/blog/`;
    const self = category ? `${site.url}/blog/feeds/${category.id}.xml` : `${site.url}/blog/feed.xml`;
    const title = category ? `${site.title} blog · ${category.label}` : `${site.title} blog`;
    const itemXml = items.map(({ entry, html }) => {
        const url = `${site.url}/blog/posts/${entry.slug}/`;
        const banner = entry.banner ? `<p><img src="${x(absoluteUrl(entry.banner, url))}" alt="${x(entry.banner_alt || "")}"></p>\n` : "";
        return `    <item>
        <title>${x(entry.title)}</title>
        <link>${x(url)}</link>
        <guid isPermaLink="true">${x(url)}</guid>
        <pubDate>${new Date(entry.date).toUTCString()}</pubDate>
        <dc:creator>${x(site.author)}</dc:creator>
${(entry.categories || []).map((c) => `        <category>${x(categoryLabel(site, c))}</category>`).join("\n")}
        <description>${x(entry.summary)}</description>
        <content:encoded>${cdata(banner + html)}</content:encoded>
    </item>`;
    }).join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
    <title>${x(title)}</title>
    <link>${x(blogUrl)}</link>
    <description>${x(site.description)}</description>
    <language>en</language>
    <atom:link href="${x(self)}" rel="self" type="application/rss+xml"/>
    <image>
        <url>${x(site.url)}/images/logo.png</url>
        <title>${x(title)}</title>
        <link>${x(blogUrl)}</link>
    </image>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${itemXml}
</channel>
</rss>
`;
}
