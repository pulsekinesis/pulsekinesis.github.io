document.addEventListener("DOMContentLoaded", () => {
    const hoverText = document.getElementById("hover_text");
    var defaultText = hoverText.textContent;
    const mobileText = "Press to Start";

    const infoBox = document.getElementById("info-box");
    const infoBody = document.getElementById("info-body");
    const closeBtn = document.getElementById("info-close");

    const open = () => infoBox.classList.add("open");
    const close = () => infoBox.classList.remove("open");

    const loadedScripts = {};

    function LoadTargetScript(src) {
        if (!loadedScripts[src]) {
                loadedScripts[src] = new Promise((resolve, reject) => {
                const s = document.createElement("script");
                s.src = src;
                s.onload = resolve;
                s.onerror = () => {
                    delete loadedScripts[src]; // allow a retry on the next click
                    s.remove();
                    reject(new Error("Failed to load " + src));
                };
                document.body.appendChild(s);
            });
        }

        return loadedScripts[src];
    }

    function preventDefault(e) {
        e.preventDefault();
    }

    function handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        if (width <= 674) {
            defaultText = mobileText;
        } else {
            defaultText = hoverText.textContent;
        }

        hoverText.textContent = defaultText;

        document.querySelectorAll("#info-btn").forEach((btn) => {
            if (width <= 674 & !btn.classList.contains("isMobile")) {
                btn.classList.add("isMobile");
            } else if (width > 674 & btn.classList.contains("isMobile")) {
                btn.classList.remove("isMobile");
            }
        });
    }

    document.querySelectorAll("#info-btn").forEach((btn) => {
        // Hover: show this button's data-hover text
        btn.addEventListener("mouseenter", () => {
            hoverText.textContent = btn.dataset.hover || defaultText;
        });

        btn.addEventListener("mouseleave", () => {
            if (btn.classList.contains("isMobile")) return;
            hoverText.textContent = defaultText;
        });

        btn.addEventListener("click", async () => {
            if (btn.classList.contains("loading")) return;
            
            // load the template
            const tpl = btn.querySelector("template");
            infoBody.replaceChildren(tpl ? tpl.content.cloneNode(true) : "");

            // load the script
            const src = btn.dataset.script;
            if (src) {
                btn.classList.add("loading");

                try {
                    await LoadTargetScript(src);
                } catch (err) {
                    console.error(err);
                }
                
                btn.classList.remove("loading");
            }

            // event caller
            document.dispatchEvent(new CustomEvent("infobox:open", {
                detail: { button: btn, body: infoBody }
            }));

            // open
            open();
        });
    });

    window.addEventListener('resize', handleResize);

    closeBtn.addEventListener("click", close);
    infoBox.addEventListener("click", (e) => { if (e.target === infoBox) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

    document.getElementById('core').classList.add('visible');

    handleResize();
});
