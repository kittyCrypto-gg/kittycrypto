function setupDebugPanel() {
    if (window.__DEBUG_PANEL__) return window.__DEBUG_PANEL__;

    // Make panel
    const debugDiv = document.createElement('div');
    debugDiv.className = 'debug';
    debugDiv.style.fontFamily = 'monospace, monospace';

    function injectDiv() {
        document.body.appendChild(debugDiv);
        if (new URLSearchParams(window.location.search).get("debug") === "true") {
            debugDiv.classList.add('visible');
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

    // Proxy the native console methods
    ["log", "error", "warn", "info"].forEach(type => {
        const orig = console[type];
        console[type] = function (...args) {
            orig.apply(console, args);
            // Render as string (object support)
            const msg = args.map(a => typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)).join(" ");
            debugDiv.classList.add('visible');
            debugDiv.textContent += (debugDiv.textContent ? "\n" : "") + format(msg, type);
            // Auto-scroll
            debugDiv.scrollTop = debugDiv.scrollHeight;
        };
    });

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

// Call immediately if you want to guarantee the panel is ready
setupDebugPanel();