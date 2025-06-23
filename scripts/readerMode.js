document.addEventListener("DOMContentLoaded", () => {
    const readerToggle = document.getElementById("reader-toggle");
    if (!readerToggle) return;

    // Get the icons injected by main.js from the config
    const enable = readerToggle.getAttribute("data-enable");
    const disable = readerToggle.getAttribute("data-disable");

    readerToggle.addEventListener('click', () => {
        if (!window.enableReaderMode || !window.disableReaderMode || !window.isReaderModeActive) {
            console.warn('Reader mode functions not found.');
            return;
        }

        if (window.isReaderModeActive()) {
            window.disableReaderMode();
            readerToggle.textContent = enable;
            return;
        }

        window.enableReaderMode();
        readerToggle.textContent = disable;
    });
});