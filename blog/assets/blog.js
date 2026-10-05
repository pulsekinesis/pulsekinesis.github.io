// blog.js

const SITE_JSON = "/blog/data/site.json";
const POSTS_JSON = "/blog/data/posts.json";
const ICON_CDN = "https://cdn.jsdelivr.net/npm/simple-icons@13/icons/";
const FALLBACK_IMAGE = "/images/logo.png";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const page = document.body.dataset.page || "";

window.pkWidgets = window.pkWidgets || {};

// ---------------------------------------------------------------- helpers --

function esc(s) {
    return String(s ?? "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function formatDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    return m ? `${MONTHS[+m[2] - 1]} ${+m[3]}, ${m[1]}` : "";
}

function shortDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    return m ? `${MONTHS[+m[2] - 1].slice(0, 3)} ${+m[3]}` : "";
}

function postUrl(slug) {
    return `/blog/posts/${encodeURIComponent(slug)}/`;
}

function categoryLabel(site, id) {
    return site?.categories?.find((c) => c.id === id)?.label ?? id;
}

async function getJson(url) {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return res.json();
}

function el(tag, attrs = {}, html = "") {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v === false || v == null) continue;
        node.setAttribute(k, v === true ? "" : v);
    }
    if (html) node.innerHTML = html;
    return node;
}

let toastTimer;
export function toast(message) {
    let t = document.querySelector(".toast");
    if (!t) {
        t = el("div", { class: "toast", role: "status", "aria-live": "polite" });
        document.body.append(t);
    }
    t.textContent = message;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        const ta = el("textarea", { style: "position:fixed;opacity:0" });
        ta.value = text;
        document.body.append(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        return ok;
    }
}
function activateScripts(root) {
    for (const old of root.querySelectorAll("script")) {
        const s = document.createElement("script");
        for (const a of old.attributes) s.setAttribute(a.name, a.value);
        s.textContent = old.textContent;
        old.replaceWith(s);
    }
}

// ------------------------------------------------------- background rain --

function startRain() {
    const canvas = document.getElementById("bg-canvas");
    if (!canvas || reducedMotion) return;
    const ctx = canvas.getContext("2d");
    const glyphs = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const fontSize = 16;
    let drops = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const rows = Math.floor(canvas.height / fontSize);
        drops = Array.from({ length: Math.floor(canvas.width / fontSize) }, () => -Math.floor(Math.random() * rows));
    }

    function draw() {
        ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(4, 0, 255, 0.2)";
        ctx.font = fontSize + "px monospace";
        for (let i = 0; i < drops.length; i++) {
            const y = drops[i] * fontSize;
            ctx.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], i * fontSize, y);
            if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
            drops[i]++;
        }
    }

    let timer = null;
    const run = () => { if (!timer) timer = setInterval(draw, 30); };
    const stop = () => { clearInterval(timer); timer = null; };
    resize();
    run();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : run()));
}

// ------------------------------------------------------------------ cards --

function postCard(post, site, { featured = false } = {}) {
    const url = postUrl(post.slug);
    const thumb = post.banner
        ? `<a class="thumb" href="${url}" tabindex="-1" aria-hidden="true"><img src="${esc(post.banner)}" alt="" loading="lazy"></a>`
        : `<a class="thumb placeholder" href="${url}" tabindex="-1" aria-hidden="true"><img src="${FALLBACK_IMAGE}" alt=""></a>`;
    const chips = (post.categories || [])
        .map((c) => `<a class="chip" href="/blog/archive/?category=${encodeURIComponent(c)}">${esc(categoryLabel(site, c))}</a>`).join("");
    return `<article class="post-card${featured ? " featured" : ""}">
        ${thumb}
        <div class="card-body">
            <div class="card-meta"><time datetime="${esc(post.date)}">${formatDate(post.date)}</time><span>·</span><span>${post.minutes || 1} min read</span></div>
            <h3><a href="${url}">${esc(post.title)}</a></h3>
            ${post.summary ? `<p class="summary">${esc(post.summary)}</p>` : ""}
            ${chips ? `<div class="chips">${chips}</div>` : ""}
            <a class="read-more" href="${url}" aria-label="Read ${esc(post.title)}">Read post →</a>
        </div>
    </article>`;
}

// --------------------------------------------------------------- widgets --

const builtInWidgets = {
    about(w, ctx, body) {
        body.innerHTML = (w.image ? `<img class="avatar" src="${esc(w.image)}" alt="">` : "") +
            (w.html || `<p>${esc(w.markdown || ctx.site.description || "")}</p>`);
    },

    search(w, ctx, body) {
        const q = new URLSearchParams(location.search).get("q") || "";
        body.innerHTML = `<form class="search-form" action="/blog/archive/" method="get" role="search">
            <input type="search" name="q" value="${esc(q)}" placeholder="${esc(w.placeholder || "Search posts…")}" aria-label="Search posts">
            <button class="btn" type="submit" aria-label="Search">Go</button>
        </form>`;
    },

    categories(w, { site, posts }, body) {
        const current = new URLSearchParams(location.search).get("category");
        const counts = {};
        for (const p of posts) for (const c of p.categories || []) counts[c] = (counts[c] || 0) + 1;
        body.innerHTML = `<div class="chips">${(site.categories || []).map((c) =>
            `<a class="chip${current === c.id ? " active" : ""}" href="/blog/archive/?category=${encodeURIComponent(c.id)}">${esc(c.label)}<span class="count">${counts[c.id] || 0}</span></a>`
        ).join("")}</div>`;
    },

    socials(w, { site }, body) {
        const links = w.links || site.socials || [];
        const ul = el("div", { class: "social-list" });
        for (const s of links) {
            const icon = s.icon ? (/^(https?:|\/)/.test(s.icon) ? s.icon : `${ICON_CDN}${s.icon}.svg`) : "";
            const iconHtml = icon ? `<span class="social-icon" style="--icon:url('${esc(icon)}')" aria-hidden="true"></span>` : "";
            if (s.copy) {
                const b = el("button", { type: "button", title: `Copy ${s.label} name: ${s.copy}` }, `${iconHtml}<span>${esc(s.label)}</span>`);
                b.addEventListener("click", async () => {
                    if (await copyText(s.copy)) toast(`Copied “${s.copy}”`);
                });
                ul.append(b);
            } else {
                const external = /^https?:/.test(s.url || "");
                ul.append(el("a", { href: s.url || "#", target: external ? "_blank" : null, rel: external ? "noopener me" : null }, `${iconHtml}<span>${esc(s.label)}</span>`));
            }
        }
        body.replaceChildren(ul);
    },

    subscribe(w, { site }, body) {
        const feed = `${site.url}/blog/feed.xml`;
        const sub = site.subscribe || {};
        body.innerHTML = `
            <p>${esc(w.text || "Follow new posts in any feed reader (Feedly, Inoreader, NetNewsWire…).")}</p>
            <div class="feed-row">
                <input type="text" readonly value="${esc(feed)}" aria-label="Feed address">
                <button class="btn small" type="button" data-copy>Copy</button>
            </div>
            <select class="feed-select" aria-label="Which posts">
                <option value="">All posts</option>
                ${(site.categories || []).map((c) => `<option value="${esc(c.id)}">${esc(c.label)} only</option>`).join("")}
            </select>
            ${sub.email_form_action ? `
            <form class="email-form" action="${esc(sub.email_form_action)}" method="post" target="_blank">
                <input type="email" name="${esc(sub.email_field_name || "email")}" required placeholder="you@example.com" aria-label="Email address">
                <button class="btn small" type="submit">Join</button>
            </form>${sub.email_note ? `<p class="muted" style="font-size:13px;margin-top:6px">${esc(sub.email_note)}</p>` : ""}` : ""}`;
        const input = body.querySelector("input[readonly]");
        body.querySelector("[data-copy]").addEventListener("click", async () => {
            if (await copyText(input.value)) toast("Feed address copied");
        });
        body.querySelector(".feed-select").addEventListener("change", (ev) => {
            input.value = ev.target.value ? `${site.url}/blog/feeds/${ev.target.value}.xml` : feed;
        });
        input.addEventListener("focus", () => input.select());
    },

    blogroll(w, { site }, body) {
        renderLinkList(w.links || site.blogroll || [], body, w.empty || "Nothing here yet.");
    },

    links(w, ctx, body) {
        renderLinkList(w.links || [], body, w.empty || "");
    },

    recent(w, { posts }, body) {
        const list = posts.slice(0, w.count || 5);
        body.innerHTML = list.length
            ? `<ul class="link-list">${list.map((p) => `<li><a href="${postUrl(p.slug)}">${esc(p.title)}</a><span class="note">${formatDate(p.date)}</span></li>`).join("")}</ul>`
            : `<p class="muted">No posts yet.</p>`;
    },

    clock(w, ctx, body) {
        const tz = w.timezone || "America/Chicago";
        body.innerHTML = `<div class="clock-face" aria-live="off"></div><div class="clock-date"></div>`;
        const face = body.firstElementChild;
        const date = body.lastElementChild;
        const tick = () => {
            const now = new Date();
            face.textContent = now.toLocaleTimeString(navigator.language || "en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit" });
            date.textContent = now.toLocaleDateString(navigator.language || "en-US", { timeZone: tz, weekday: "long", month: "short", day: "numeric", timeZoneName: "short" });
        };
        tick();
        setInterval(tick, 1000);
    },

    html(w, ctx, body) {
        body.innerHTML = w.html || "";
        activateScripts(body);
    },

    markdown(w, ctx, body) {
        body.innerHTML = w.html || `<p>${esc(w.markdown || "")}</p>`;
    },
};
builtInWidgets.text = builtInWidgets.markdown;

function renderLinkList(links, body, empty) {
    if (!links.length) {
        body.innerHTML = empty ? `<p class="muted">${esc(empty)}</p>` : "";
        return;
    }
    body.innerHTML = `<ul class="link-list">${links.map((l) =>
        `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.name || l.label || l.url)}</a>${l.description ? `<span class="note">${esc(l.description)}</span>` : ""}</li>`
    ).join("")}</ul>`;
}

function renderSidebar(site, posts) {
    const aside = document.getElementById("sidebar");
    if (!aside) return;
    aside.replaceChildren();
    for (const w of site.sidebar || []) {
        if (w.hidden) continue;
        const fn = window.pkWidgets[w.type] || builtInWidgets[w.type];
        if (!fn) {
            console.warn(`[blog] unknown widget type "${w.type}"`);
            continue;
        }
        const section = el("section", {
            class: `widget widget-${w.type}${w.panel === false ? "" : " panel"}${w.class ? " " + w.class : ""}`,
            id: w.id || null,
        });
        if (w.title) section.append(el("h2", { class: "widget-title" }, esc(w.title)));
        const body = el("div", { class: "widget-body" });
        section.append(body);
        aside.append(section);
        try {
            fn(w, { site, posts }, body);
        } catch (err) {
            console.error(`[blog] widget "${w.type}" failed`, err);
            body.innerHTML = `<p class="muted">This widget hit an error.</p>`;
        }
    }
}

// ------------------------------------------------------------- front page --

async function renderHome(site, posts) {
    const intro = document.getElementById("intro");
    if (intro) {
        intro.innerHTML = `<h1>${esc(site.tagline || "")}</h1><p>${esc(site.description || "")}</p>`;
    }

    const projWrap = document.getElementById("projects");
    if (projWrap) {
        const title = document.getElementById("projects-title");
        if (title) title.firstChild.textContent = site.projects_title || "Highlighted Projects";
        const projects = site.projects || [];
        projWrap.closest("section").hidden = !projects.length;
        projWrap.innerHTML = projects.map((p, i) => `
            <a class="project-card" href="${esc(p.url || "#")}" ${/^https?:/.test(p.url || "") ? 'target="_blank" rel="noopener"' : ""}>
                <span class="project-icon"><img data-i="${i}" src="${esc(p.image || FALLBACK_IMAGE)}" alt="" loading="lazy"></span>
                <span class="project-name">${esc(p.name)}</span>
                ${p.description ? `<span class="project-desc">${esc(p.description)}</span>` : ""}
            </a>`).join("");
        loadRobloxIcons(projects, projWrap);
    }

    const recent = document.getElementById("recent");
    if (recent) {
        const list = posts.slice(0, site.recent_count || 6);
        recent.innerHTML = list.length
            ? list.map((p, i) => postCard(p, site, { featured: i === 0 })).join("")
            : `<p class="empty-note panel">No posts yet. Check back soon!</p>`;
    }
}

async function loadRobloxIcons(projects, wrap) {
    const ids = projects.map((p) => p.roblox_universe).filter(Boolean);
    if (!ids.length) return;
    try {
        const res = await fetch(`https://thumbnails.roproxy.com/v1/games/icons?universeIds=${ids.join(",")}&size=150x150&format=Png&isCircular=false`);
        if (!res.ok) return;
        const { data = [] } = await res.json();
        for (const item of data) {
            if (!item.imageUrl || item.state !== "Completed") continue;
            const i = projects.findIndex((p) => String(p.roblox_universe) === String(item.targetId));
            const img = wrap.querySelector(`img[data-i="${i}"]`);
            if (img) img.src = item.imageUrl;
        }
    } catch (err) {
        console.warn("[blog] couldn't load Roblox icons", err);
    }
}

// ---------------------------------------------------------------- archive --

function renderArchive(site, posts) {
    const root = document.getElementById("archive");
    if (!root) return;
    const params = new URLSearchParams(location.search);
    let q = params.get("q") || "";
    let cat = params.get("category") || "";

    root.innerHTML = `
        <div class="archive-controls">
            <input type="search" id="archive-q" placeholder="Search titles, text and categories…" aria-label="Search posts" value="${esc(q)}">
            <div class="chips" id="archive-cats">
                <button type="button" class="chip" data-cat="">All</button>
                ${(site.categories || []).map((c) => `<button type="button" class="chip" data-cat="${esc(c.id)}">${esc(c.label)}</button>`).join("")}
            </div>
            <p class="archive-count" id="archive-count" aria-live="polite"></p>
        </div>
        <div id="archive-results"></div>`;

    const input = root.querySelector("#archive-q");
    const results = root.querySelector("#archive-results");
    const count = root.querySelector("#archive-count");

    const searchable = posts.map((p) => ({
        p,
        title: (p.title || "").toLowerCase(),
        hay: [p.title, p.summary, p.text, ...(p.categories || []).map((c) => categoryLabel(site, c))].join(" ").toLowerCase(),
    }));

    function highlight(text, terms) {
        let out = esc(text);
        for (const t of terms) {
            if (t.length < 2) continue;
            out = out.replace(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"), '<mark class="hit">$1</mark>');
        }
        return out;
    }

    function snippet(p, terms) {
        const text = p.text || "";
        const lower = text.toLowerCase();
        const hit = terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0).sort((a, b) => a - b)[0];
        if (hit == null || (p.summary || "").toLowerCase().includes(terms[0])) return p.summary || "";
        const start = Math.max(0, hit - 70);
        return (start ? "…" : "") + text.slice(start, hit + 150).trim() + "…";
    }

    function update() {
        const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
        let list = searchable.filter(({ p, hay }) =>
            (!cat || (p.categories || []).includes(cat)) && terms.every((t) => hay.includes(t)));
        if (terms.length) {
            list = list.sort((a, b) => terms.filter((t) => b.title.includes(t)).length - terms.filter((t) => a.title.includes(t)).length);
        }

        for (const b of root.querySelectorAll("#archive-cats .chip")) b.classList.toggle("active", b.dataset.cat === cat);
        const label = cat ? ` in ${categoryLabel(site, cat)}` : "";
        count.textContent = terms.length
            ? `${list.length} result${list.length === 1 ? "" : "s"} for “${q}”${label}`
            : `${list.length} post${list.length === 1 ? "" : "s"}${label}`;

        if (!list.length) {
            results.innerHTML = `<p class="empty-note">Nothing found.</p>`;
            return;
        }

        let html = "";
        let year = null;
        const grouped = !terms.length;
        if (!grouped) html += `<ul class="archive-list">`;
        for (const { p } of list) {
            const y = (p.date || "").slice(0, 4);
            if (grouped && y !== year) {
                if (year !== null) html += `</ul>`;
                html += `<h2 class="archive-year">${esc(y)}</h2><ul class="archive-list">`;
                year = y;
            }
            const chips = (p.categories || []).map((c) => `<a class="chip" href="?category=${encodeURIComponent(c)}">${esc(categoryLabel(site, c))}</a>`).join("");
            html += `<li class="archive-item">
                <time datetime="${esc(p.date)}">${grouped ? shortDate(p.date) : formatDate(p.date)}</time>
                <h2><a href="${postUrl(p.slug)}">${highlight(p.title, terms)}</a></h2>
                <p>${highlight(terms.length ? snippet(p, terms) : p.summary || "", terms)}</p>
                ${chips ? `<div class="chips">${chips}</div>` : ""}
            </li>`;
        }
        html += `</ul>`;
        results.innerHTML = html;
    }

    function syncUrl() {
        const u = new URL(location.href);
        q ? u.searchParams.set("q", q) : u.searchParams.delete("q");
        cat ? u.searchParams.set("category", cat) : u.searchParams.delete("category");
        history.replaceState(null, "", u);
        const side = document.querySelector(".widget-search input");
        if (side) side.value = q;
        for (const a of document.querySelectorAll(".widget-categories .chip")) {
            a.classList.toggle("active", new URL(a.href).searchParams.get("category") === cat);
        }
    }

    let t;
    input.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(() => { q = input.value.trim(); update(); syncUrl(); }, 120);
    });
    root.querySelector("#archive-cats").addEventListener("click", (ev) => {
        const b = ev.target.closest("[data-cat]");
        if (!b) return;
        cat = b.dataset.cat === cat ? "" : b.dataset.cat;
        update();
        syncUrl();
    });
    
    results.addEventListener("click", (ev) => {
        const a = ev.target.closest("a.chip");
        if (!a) return;
        ev.preventDefault();
        cat = new URL(a.href).searchParams.get("category") || "";
        update();
        syncUrl();
        window.scrollTo({ top: root.offsetTop - 20 });
    });

    update();
}

// ------------------------------------------------------------------- post --

function renderPostExtras(site, posts) {
    const slug = document.body.dataset.slug;
    const nav = document.getElementById("post-nav");
    const i = posts.findIndex((p) => p.slug === slug);
    if (nav && i >= 0) {
        const older = posts[i + 1];
        const newer = posts[i - 1];
        nav.innerHTML =
            (older ? `<a class="prev" href="${postUrl(older.slug)}"><span class="dir">← Older</span>${esc(older.title)}</a>` : "") +
            (newer ? `<a class="next" href="${postUrl(newer.slug)}"><span class="dir">Newer →</span>${esc(newer.title)}</a>` : "");
    }
    addTableOfContents();
}

function addTableOfContents() {
    const aside = document.getElementById("sidebar");
    const heads = [...document.querySelectorAll(".post-body h2[id], .post-body h3[id]")];
    if (!aside || heads.length < 3) return;
    const section = el("section", { class: "widget widget-toc panel" });
    section.innerHTML = `<h2 class="widget-title">Contents</h2><div class="widget-body"><ul class="toc-list">${heads.map((h) => {
        const text = [...h.childNodes].filter((n) => !(n.classList?.contains("heading-anchor"))).map((n) => n.textContent).join("").trim();
        return `<li><a class="depth-${h.tagName[1]}" href="#${h.id}">${esc(text)}</a></li>`;
    }).join("")}</ul></div>`;
    aside.prepend(section);

    const links = new Map([...section.querySelectorAll("a")].map((a) => [a.getAttribute("href").slice(1), a]));
    const io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            for (const a of links.values()) a.classList.remove("current");
            links.get(entry.target.id)?.classList.add("current");
        }
    }, { rootMargin: "0px 0px -70% 0px" });
    heads.forEach((h) => io.observe(h));
}

function readProgress() {
    const bar = document.querySelector(".read-progress");
    const article = document.querySelector(".post");
    if (!bar || !article) return;
    let queued = false;
    const update = () => {
        queued = false;
        const r = article.getBoundingClientRect();
        const total = r.height - window.innerHeight;
        const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
        bar.style.setProperty("--progress", p.toFixed(4));
    };
    window.addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
    update();
}

// --------------------------------------------------------------- feedback --

function setupFeedback(site) {
    const form = document.getElementById("feedback-form");
    if (!form) return;
    const fb = site.feedback || {};
    if (fb.endpoint) form.action = fb.endpoint;
    form.querySelector('[name="_next"]').value = `${location.origin}/blog/feedback/?sent=1`;
    form.querySelector('[name="_subject"]').value = fb.subject || "New feedback from the blog";

    const params = new URLSearchParams(location.search);
    if (params.get("sent")) {
        document.getElementById("feedback-sent").hidden = false;
        form.hidden = true;
    }
    const about = params.get("post");
    if (about) {
        const topic = form.querySelector('[name="topic"]');
        topic.value = "A blog post";
        form.querySelector('[name="post"]').value = about;
    }
    form.addEventListener("submit", () => {
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = "Sending…";
    });
}

// -------------------------------------------------------------- enhancers --

const ICONS = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5h4.5v15H6zM13.5 4.5H18v15h-4.5z"/></svg>',
    vol: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3z"/><path d="M14 7.2v9.6a5 5 0 0 0 0-9.6z"/></svg>',
    mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3z"/><path d="M15 9.4 16.4 8l2.1 2.1L20.6 8 22 9.4l-2.1 2.1 2.1 2.1-1.4 1.4-2.1-2.1-2.1 2.1-1.4-1.4 2.1-2.1z"/></svg>',
    full: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v2H6v4H4zM14 4h6v6h-2V6h-4zM4 14h2v4h4v2H4zM18 14h2v6h-6v-2h4z"/></svg>',
};

function fmtTime(s) {
    if (!isFinite(s)) return "0:00";
    s = Math.max(0, Math.floor(s));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = String(s % 60).padStart(2, "0");
    return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

function makeBar(bar, { get, set, label, step = 0.05 }) {
    bar.setAttribute("role", "slider");
    bar.setAttribute("tabindex", "0");
    bar.setAttribute("aria-label", label);
    bar.setAttribute("aria-valuemin", "0");
    bar.setAttribute("aria-valuemax", "100");
    const fromEvent = (ev) => {
        const r = bar.getBoundingClientRect();
        return Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
    };
    bar.addEventListener("pointerdown", (ev) => {
        bar.setPointerCapture(ev.pointerId);
        bar.classList.add("dragging");
        set(fromEvent(ev));
    });
    bar.addEventListener("pointermove", (ev) => {
        if (bar.classList.contains("dragging")) set(fromEvent(ev));
    });
    const end = () => bar.classList.remove("dragging");
    bar.addEventListener("pointerup", end);
    bar.addEventListener("pointercancel", end);
    bar.addEventListener("keydown", (ev) => {
        const v = get();
        if (ev.key === "ArrowRight" || ev.key === "ArrowUp") set(Math.min(1, v + step));
        else if (ev.key === "ArrowLeft" || ev.key === "ArrowDown") set(Math.max(0, v - step));
        else if (ev.key === "Home") set(0);
        else if (ev.key === "End") set(1);
        else return;
        ev.preventDefault();
    });
    return (v) => {
        bar.style.setProperty("--value", v);
        bar.setAttribute("aria-valuenow", Math.round(v * 100));
    };
}

function barMarkup(cls = "") {
    return `<div class="pk-bar ${cls}"><div class="pk-buffer"></div><div class="pk-fill"></div><div class="pk-knob"></div></div>`;
}

const allMedia = new Set();
function onlyOnePlaying(media) {
    allMedia.add(media);
    media.addEventListener("play", () => {
        for (const m of allMedia) if (m !== media && !m.paused) m.pause();
    });
}

function wireCommon(fig, media, root) {
    const playBtn = root.querySelector(".pk-btn.play");
    const muteBtn = root.querySelector(".pk-btn.mute");
    const time = root.querySelector(".pk-time");
    const seek = root.querySelector(".pk-bar.seek");
    const vol = root.querySelector(".pk-bar.pk-vol");

    const toggle = () => (media.paused ? media.play() : media.pause());
    playBtn.addEventListener("click", toggle);

    const setSeek = makeBar(seek, {
        label: "Seek",
        get: () => (media.duration ? media.currentTime / media.duration : 0),
        set: (v) => { if (media.duration) media.currentTime = v * media.duration; },
        step: 0.02,
    });
    const setVol = vol && makeBar(vol, {
        label: "Volume",
        get: () => (media.muted ? 0 : media.volume),
        set: (v) => { media.volume = v; media.muted = v === 0; },
        step: 0.1,
    });

    muteBtn?.addEventListener("click", () => { media.muted = !media.muted; });

    const sync = () => {
        const playing = !media.paused && !media.ended;
        fig.classList.toggle("playing", playing);
        playBtn.innerHTML = playing ? ICONS.pause : ICONS.play;
        playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
    };
    const tick = () => {
        setSeek(media.duration ? media.currentTime / media.duration : 0);
        time.textContent = `${fmtTime(media.currentTime)} / ${fmtTime(media.duration)}`;
        if (media.buffered.length && media.duration) {
            seek.style.setProperty("--buffer", media.buffered.end(media.buffered.length - 1) / media.duration);
        }
    };
    const volSync = () => {
        setVol?.(media.muted ? 0 : media.volume);
        if (muteBtn) {
            muteBtn.innerHTML = media.muted || media.volume === 0 ? ICONS.mute : ICONS.vol;
            muteBtn.setAttribute("aria-label", media.muted ? "Unmute" : "Mute");
        }
    };

    media.addEventListener("play", sync);
    media.addEventListener("pause", sync);
    media.addEventListener("ended", sync);
    media.addEventListener("timeupdate", tick);
    media.addEventListener("durationchange", tick);
    media.addEventListener("progress", tick);
    media.addEventListener("loadedmetadata", tick);
    media.addEventListener("volumechange", volSync);
    sync();
    tick();
    volSync();
    onlyOnePlaying(media);
    return toggle;
}

// ------------------------------------------------------- tracker modules --
// .mod .s3m .xm .it .mptm (and ~40 older formats) play through libopenmpt,
// compiled to WebAssembly by the chiptune3 project. It's only downloaded the
// first time someone presses play on a module.

const CHIPTUNE_URL = "https://cdn.jsdelivr.net/npm/chiptune3@0.8.9/chiptune3.js";

const Tracker = {
    ready: null,
    player: null,
    analyser: null,
    current: null,
    load() {
        return (this.ready ||= (async () => {
            const { ChiptuneJsPlayer } = await import(CHIPTUNE_URL);
            const player = new ChiptuneJsPlayer({ repeatCount: 0 });
            await new Promise((resolve, reject) => {
                player.onInitialized(resolve);
                setTimeout(() => reject(new Error("The tracker engine took too long to start")), 20000);
            });
            this.analyser = player.context.createAnalyser();
            this.analyser.fftSize = 128;
            player.gain.connect(this.analyser);
            player.onMetadata((meta) => this.current?.onMeta(meta));
            player.onProgress((p) => this.current?.onProgress(p));
            player.onEnded(() => this.current?.onEnded());
            player.onError((err) => this.current?.onError(err));
            this.player = player;
            return this;
        })().catch((err) => {
            this.ready = null;
            throw err;
        }));
    },
};

class TrackerMedia extends EventTarget {
    constructor(src, loop) {
        super();
        this.src = src;
        this.loop = loop;
        this.paused = true;
        this.ended = false;
        this.duration = NaN;
        this.buffered = { length: 0 };
        this.meta = null;
        this.pos = null;
        this._time = 0;
        this._volume = 1;
        this._muted = false;
        this._file = null;
        this._lastTick = 0;
    }

    emit(type) { this.dispatchEvent(new Event(type)); }
    get active() { return Tracker.current === this && Tracker.player; }

    get currentTime() { return this._time; }
    set currentTime(v) {
        this._time = Math.max(0, v);
        if (this.active && !this.ended) Tracker.player.setPos(this._time);
        this.emit("timeupdate");
    }

    get volume() { return this._volume; }
    set volume(v) { this._volume = v; this.applyVolume(); this.emit("volumechange"); }
    get muted() { return this._muted; }
    set muted(v) { this._muted = Boolean(v); this.applyVolume(); this.emit("volumechange"); }
    applyVolume() { if (this.active) Tracker.player.setVol(this._muted ? 0 : this._volume); }

    async play() {
        this.emit("waiting");
        try {
            const t = await Tracker.load();
            if (!this._file) {
                const res = await fetch(this.src);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                this._file = await res.arrayBuffer();
            }
            if (t.player.context.state === "suspended") await t.player.context.resume();
            if (t.current !== this || this.ended) {
                if (t.current && t.current !== this) t.current.pause();
                t.current = this;
                this.ended = false;
                t.player.setRepeatCount(this.loop ? -1 : 0);
                t.player.play(this._file);
                if (this._time > 0) t.player.setPos(this._time);
            } else {
                t.player.unpause();
            }
            this.applyVolume();
            this.paused = false;
            this.emit("play");
        } catch (err) {
            this.onError({ type: err.message });
        }
    }

    pause() {
        if (this.paused) return;
        if (this.active) Tracker.player.pause();
        this.paused = true;
        this.emit("pause");
    }

    onMeta(meta) {
        this.meta = meta;
        this.duration = meta.dur || NaN;
        this.emit("durationchange");
        this.emit("loadedmetadata");
    }

    onProgress(p) {
        this._time = p.pos;
        this.pos = p;
        const now = performance.now();
        if (now - this._lastTick > 100) {   // the engine reports ~350 times a second
            this._lastTick = now;
            this.emit("timeupdate");
        }
    }

    onEnded() {
        if (this.ended) return;
        this.ended = true;
        this.paused = true;
        this._time = 0;
        Tracker.player.stop();
        this.emit("pause");
        this.emit("ended");
        this.emit("timeupdate");
    }

    onError(err) {
        this.paused = true;
        this.emit("pause");
        this.dispatchEvent(new CustomEvent("trackererror", { detail: err?.type || "unknown error" }));
    }
}

function enhanceAudio(fig) {
    const tracker = fig.classList.contains("pk-tracker");
    const audio = tracker ? new TrackerMedia(fig.dataset.src, fig.hasAttribute("data-loop")) : fig.querySelector("audio");
    if (!audio) return;
    if (!tracker) audio.removeAttribute("controls");
    const title = fig.dataset.title || "Untitled";
    const artist = fig.dataset.artist || "";
    const cover = fig.dataset.cover || FALLBACK_IMAGE;
    const ext = tracker ? (fig.dataset.ext || fig.dataset.src.split(/[?#]/)[0].split(".").pop() || "").toLowerCase().slice(0, 8) : "";

    const ui = el("div", { class: "pk-audio-ui" }, `
        <canvas class="pk-viz" aria-hidden="true"></canvas>
        <div class="pk-cover"><img src="${esc(cover)}" alt=""></div>
        <div class="pk-main">
            <div class="pk-title" title="${esc(title)}">${esc(title)}</div>
            ${artist ? `<div class="pk-artist-line">${esc(artist)}</div>` : ""}
            <div class="pk-controls">
                <button type="button" class="pk-btn play" aria-label="Play">${ICONS.play}</button>
                ${barMarkup("seek")}
                <span class="pk-time">0:00 / 0:00</span>
                <button type="button" class="pk-btn mute" aria-label="Mute">${ICONS.vol}</button>
                ${barMarkup("pk-vol")}
            </div>
            ${tracker ? `<div class="pk-tracker-info"><span class="pk-trk-status">.${esc(ext)} module · press play</span><a href="${esc(fig.dataset.src)}" download title="Download the module">⇩ .${esc(ext)}</a></div>` : ""}
        </div>`);
    fig.prepend(ui);
    fig.classList.add("enhanced");
    wireCommon(fig, audio, ui);

    if (tracker) {
        const status = ui.querySelector(".pk-trk-status");
        const pad = (n, w = 2) => String(n ?? 0).padStart(w, "0");
        let raf = 0;
        const describe = () => {
            const m = audio.meta;
            if (!m) return;
            const kind = (m.type || ext).toUpperCase();
            const channels = m.song?.channels?.length || 0;
            const p = audio.pos;
            status.textContent = `${kind} · ${channels} ch` +
                (p ? ` · ORD ${pad(p.order)}/${pad(m.totalOrders)} · PAT ${pad(p.pattern)} · ROW ${pad(p.row)}` : "") +
                (m.tracker ? ` · ${m.tracker}` : "");
        };
        const loop = () => { describe(); raf = requestAnimationFrame(loop); };
        audio.addEventListener("waiting", () => { if (!audio.meta) status.textContent = "loading the tracker engine…"; });
        audio.addEventListener("loadedmetadata", () => {
            const m = audio.meta;
            if (!fig.dataset.title && m.title) ui.querySelector(".pk-title").textContent = m.title;
            if (!artist && m.artist) {
                ui.querySelector(".pk-title").insertAdjacentHTML("afterend", `<div class="pk-artist-line">${esc(m.artist)}</div>`);
            }
            describe();
        });
        audio.addEventListener("play", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); });
        audio.addEventListener("pause", () => { cancelAnimationFrame(raf); describe(); });
        audio.addEventListener("trackererror", (ev) => {
            status.textContent = `couldn't play this module (${ev.detail})`;
            fig.classList.add("error");
        });
        visualizer(fig, audio, ui.querySelector(".pk-viz"), () => (Tracker.current === audio ? Tracker.analyser : null));
    } else {
        visualizer(fig, audio, ui.querySelector(".pk-viz"), mediaElementAnalyser(audio));
    }
}

function mediaElementAnalyser(audio) {
    let analyser = null;
    let tried = false;
    return () => {
        if (analyser || tried) return analyser;
        tried = true;
        try {
            const u = new URL(audio.currentSrc || audio.src, location.href);
            if (u.origin !== location.origin && u.protocol !== "blob:") return null;
            const AC = window.AudioContext || window.webkitAudioContext;
            const ac = (mediaElementAnalyser.ctx ||= new AC());
            const src = ac.createMediaElementSource(audio);
            analyser = ac.createAnalyser();
            analyser.fftSize = 128;
            src.connect(analyser);
            analyser.connect(ac.destination);
            if (ac.state === "suspended") ac.resume();
        } catch {
            analyser = null;
        }
        return analyser;
    };
}

function visualizer(fig, audio, canvas, getAnalyser) {
    if (reducedMotion) return;
    const ctx = canvas.getContext("2d");
    let data = null;
    let raf = 0;

    const draw = () => {
        const analyser = getAnalyser();
        if (analyser && (!data || data.length !== analyser.frequencyBinCount)) data = new Uint8Array(analyser.frequencyBinCount);
        if (analyser) analyser.getByteFrequencyData(data);
        const w = (canvas.width = canvas.clientWidth);
        const h = (canvas.height = canvas.clientHeight);
        ctx.clearRect(0, 0, w, h);
        const bars = Math.max(16, Math.floor(w / 9));
        const t = performance.now() / 1000;
        for (let i = 0; i < bars; i++) {
            const v = analyser
                ? data[Math.floor((i / bars) * data.length * 0.8)] / 255
                : 0.25 + 0.2 * Math.sin(t * 3 + i * 0.5) * Math.sin(t * 1.7 + i * 0.23) + 0.1 * Math.sin(t * 7 + i);
            const bh = Math.max(2, v * h);
            const g = ctx.createLinearGradient(0, h - bh, 0, h);
            g.addColorStop(0, "#4dbeff");
            g.addColorStop(1, "#2839fd");
            ctx.fillStyle = g;
            ctx.fillRect(i * 9, h - bh, 6, bh);
        }
        if (!audio.paused) raf = requestAnimationFrame(draw);
    };

    audio.addEventListener("play", () => {
        getAnalyser();
        mediaElementAnalyser.ctx?.state === "suspended" && mediaElementAnalyser.ctx.resume();
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(draw);
    });
    audio.addEventListener("pause", () => cancelAnimationFrame(raf));
}

function enhanceVideo(fig) {
    const video = fig.querySelector("video");
    if (!video) return;
    video.removeAttribute("controls");
    const frame = el("div", { class: "pk-video-frame", tabindex: "-1" });
    video.replaceWith(frame);
    frame.append(video);
    frame.insertAdjacentHTML("beforeend", `
        <button type="button" class="pk-big-play" aria-label="Play video">${ICONS.play}</button>
        <div class="pk-video-bar">
            <button type="button" class="pk-btn play" aria-label="Play">${ICONS.play}</button>
            ${barMarkup("seek")}
            <span class="pk-time">0:00 / 0:00</span>
            <button type="button" class="pk-btn mute" aria-label="Mute">${ICONS.vol}</button>
            ${barMarkup("pk-vol")}
            <button type="button" class="pk-btn fs" aria-label="Fullscreen">${ICONS.full}</button>
        </div>`);
    fig.classList.add("enhanced");
    const toggle = wireCommon(fig, video, frame);
    frame.querySelector(".pk-big-play").addEventListener("click", toggle);
    video.addEventListener("click", toggle);
    frame.querySelector(".pk-btn.fs").addEventListener("click", () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else (frame.requestFullscreen?.() ?? video.webkitEnterFullscreen?.());
    });
    frame.addEventListener("keydown", (ev) => {
        if (ev.target.closest(".pk-bar")) return;
        if (ev.key === " " || ev.key === "k") { ev.preventDefault(); toggle(); }
        if (ev.key === "f") frame.querySelector(".pk-btn.fs").click();
    });

    // Hide the controls while the mouse rests on a playing video.
    let idle;
    const wake = () => {
        fig.classList.remove("idle");
        clearTimeout(idle);
        idle = setTimeout(() => fig.classList.add("idle"), 2200);
    };
    frame.addEventListener("pointermove", wake);
    frame.addEventListener("pointerleave", () => !video.paused && fig.classList.add("idle"));
    video.addEventListener("play", wake);
    video.addEventListener("pause", () => { clearTimeout(idle); fig.classList.remove("idle"); });
}

function enhanceYouTube(fig) {
    const link = fig.querySelector(".pk-yt-link");
    if (!link) return;
    link.addEventListener("click", (ev) => {
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
        ev.preventDefault();
        const id = fig.dataset.id;
        const start = fig.dataset.start ? `&start=${fig.dataset.start}` : "";
        const iframe = el("iframe", {
            src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0${start}`,
            title: link.querySelector("img")?.alt || "YouTube video",
            allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen",
            allowfullscreen: true,
            loading: "lazy",
        });
        link.replaceWith(iframe);
    });
}

function setupLightbox() {
    let overlay = null;
    const open = (img) => {
        if (!overlay) {
            overlay = el("div", { class: "info-overlay", role: "dialog", "aria-modal": "true", "aria-label": "Image viewer" }, `
                <div class="info-content panel">
                    <button type="button" class="info-close" aria-label="Close">&times;</button>
                    <img alt=""><p></p>
                </div>`);
            document.body.append(overlay);
            overlay.addEventListener("click", (ev) => {
                if (ev.target === overlay || ev.target.closest(".info-close")) close();
            });
            document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") close(); });
        }
        const big = overlay.querySelector("img");
        big.src = img.currentSrc || img.src;
        big.alt = img.alt;
        const caption = img.closest("figure")?.querySelector("figcaption")?.textContent || img.alt || "";
        const p = overlay.querySelector("p");
        p.textContent = caption;
        p.hidden = !caption;
        overlay.classList.add("open");
        overlay.querySelector(".info-close").focus();
    };
    const close = () => overlay?.classList.remove("open");
    document.addEventListener("click", (ev) => {
        const img = ev.target.closest(".prose img");
        if (!img || img.closest("a, .pk-player, .pk-youtube")) return;
        open(img);
    });
}

export function enhance(root = document) {
    root.querySelectorAll(".pk-audio:not(.enhanced)").forEach(enhanceAudio);
    root.querySelectorAll(".pk-video:not(.enhanced)").forEach(enhanceVideo);
    root.querySelectorAll(".pk-youtube:not(.enhanced)").forEach((f) => { f.classList.add("enhanced"); enhanceYouTube(f); });
}

document.addEventListener("click", async (ev) => {
    const btn = ev.target.closest(".code-copy");
    if (!btn) return;
    const code = btn.closest(".code-block")?.querySelector("code");
    if (!code) return;
    if (await copyText(code.innerText)) {
        btn.textContent = "copied!";
        btn.classList.add("done");
        setTimeout(() => { btn.textContent = "copy"; btn.classList.remove("done"); }, 1500);
    }
});

// ------------------------------------------------------------------- boot --

async function boot() {
    startRain();
    enhance();
    setupLightbox();
    if (page === "post") readProgress();

    let site = null;
    let posts = [];
    try {
        [site, { posts = [] } = {}] = await Promise.all([getJson(SITE_JSON), getJson(POSTS_JSON).catch(() => ({ posts: [] }))]);
    } catch (err) {
        console.error("[blog] couldn't load site data", err);
        return;
    }
    posts = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
    window.pkBlog.site = site;
    window.pkBlog.posts = posts;

    renderSidebar(site, posts);
    if (page === "home") await renderHome(site, posts);
    if (page === "archive") renderArchive(site, posts);
    if (page === "post") renderPostExtras(site, posts);
    if (page === "feedback") setupFeedback(site);

    document.dispatchEvent(new CustomEvent("pkblog:ready", { detail: { site, posts } }));
}

window.pkBlog = { enhance, toast, site: null, posts: [] };
boot();
