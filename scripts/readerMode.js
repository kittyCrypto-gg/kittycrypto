function setupReaderToggle() {
    document.addEventListener("DOMContentLoaded", () => {
        console.log('[readerMode] DOMContentLoaded');

        const readerToggle = document.getElementById("reader-toggle");
        if (!readerToggle) {
            console.warn("[readerMode] #reader-toggle not found");
            return;
        }
        console.log('[readerMode] Found #reader-toggle');

        // Get the icons injected by main.js from the config
        const enable = readerToggle.getAttribute("data-enable");
        const disable = readerToggle.getAttribute("data-disable");
        console.log('[readerMode] Enable text:', enable, 'Disable text:', disable);

        readerToggle.addEventListener('click', () => {
            console.log('[readerMode] Reader toggle clicked');

            // Log the existence of window functions
            console.log(
                '[readerMode] window.enableReaderMode:', typeof window.enableReaderMode,
                '| window.disableReaderMode:', typeof window.disableReaderMode,
                '| window.isReaderModeActive:', typeof window.isReaderModeActive
            );

            if (!window.enableReaderMode || !window.disableReaderMode || !window.isReaderModeActive) {
                console.warn('[readerMode] Reader mode functions not found.');
                return;
            }

            const isActive = window.isReaderModeActive();
            console.log('[readerMode] isReaderModeActive:', isActive);

            if (isActive) {
                window.disableReaderMode();
                readerToggle.textContent = enable;
                console.log('[readerMode] Reader mode disabled, text set to', enable);
                return;
            }

            window.enableReaderMode();
            readerToggle.textContent = disable;
            console.log('[readerMode] Reader mode enabled, text set to', disable);
        });
    });
}

setupReaderToggle();