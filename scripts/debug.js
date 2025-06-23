function setupDebugPanel() {
    if (window.__DEBUG_PANEL__) return window.__DEBUG_PANEL__;

    const debugDiv = document.createElement('div');
    debugDiv.className = 'debug';
    debugDiv.style.fontFamily = 'monospace, monospace';

    function injectDiv() {
        document.body.appendChild(debugDiv);
        if (new URLSearchParams(window.location.search).get("debug") === "true") {
            debugDiv.classList.add('visible');
        } else if (new URLSearchParams(window.location.search).get("debug") === "false" || new URLSearchParams(window.location.search).get("debug") === null || !new URLSearchParams(window.location.search).has("debug")) {
            debugDiv.classList.remove('visible');
        }
    }
    if (document.readyState === "loading") {
        document.addEventListener('DOMContentLoaded', injectDiv);
    } else {
        injectDiv();
    }

    // Emoji map
    const EMOJI = {
        log: "📝",
        error: "❌",
        warn: "⚠️",
        info: "ℹ️"
    };

    // Formatter
    function format(msg, type = "log") {
        const time = new Date().toLocaleTimeString();
        return `${EMOJI[type] || EMOJI.log} [${time}] ${msg}`;
    }

    // Save native console refs only ONCE
    const orig = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        info: console.info,
        clear: console.clear
    };

    // Proxy
    ["log", "error", "warn", "info"].forEach(type => {
        console[type] = function (...args) {
            orig[type].apply(console, args);
            // Combine message
            const msg = args.map(a =>
                typeof a === "object" && a !== null
                    ? (a instanceof Error ? (a.stack || a.toString()) : JSON.stringify(a, null, 2))
                    : String(a)
            ).join(" ");
            debugDiv.classList.add('visible');
            debugDiv.textContent += (debugDiv.textContent ? "\n" : "") + format(msg, type);
            debugDiv.scrollTop = debugDiv.scrollHeight;
        };
    });

    // Proxy clear
    console.clear = function () {
        orig.clear.apply(console, arguments);
        debugDiv.textContent = "";
    };

    window.__DEBUG_PANEL__ = {
        show(msg = "") {
            debugDiv.classList.add('visible');
            debugDiv.textContent = typeof msg === "object" ? JSON.stringify(msg, null, 2) : msg;
        },
        hide() {
            debugDiv.classList.remove('visible');
            debugDiv.textContent = "";
        },
        clear() {
            debugDiv.textContent = "";
        },
        el: debugDiv
    };

    return window.__DEBUG_PANEL__;
}

function propagateDebugParamInLinks() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("debug") !== "true") return;

    document.querySelectorAll('a[href]').forEach(link => {
        let href = link.getAttribute('href');
        if (
            !href ||
            href.startsWith('http') ||
            href.startsWith('#') ||
            href.startsWith('mailto:') ||
            href.includes('debug=true')
        ) return;

        // Split at ? or # to get base and suffix
        let [base, suffix] = href.split(/([?#].*)/);
        let joiner = suffix && suffix.startsWith('?') ? '&' : '?';
        link.setAttribute('href', base + joiner + 'debug=true' + (suffix || ''));
    });
}


// Call immediately if you want to guarantee the panel is ready
setupDebugPanel();
propagateDebugParamInLinks();