export async function setupReaderToggle() {
    // Wait for DOMContentLoaded if needed
    if (document.readyState === "loading") {
        await new Promise(resolve =>
            document.addEventListener("DOMContentLoaded", resolve, { once: true })
        );
        console.log('[readerMode] DOMContentLoaded (async)');
    }

    // Try direct lookup first
    let readerToggle = document.getElementById("reader-toggle");
    if (!readerToggle) {
        // Use MutationObserver to wait for injection
        readerToggle = await new Promise(resolve => {
            const observer = new MutationObserver(() => {
                const el = document.getElementById("reader-toggle");
                if (el) {
                    observer.disconnect();
                    resolve(el);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        });
        console.log('[readerMode] #reader-toggle appeared via MutationObserver');
    }

    if (!readerToggle) {
        console.warn("[readerMode] #reader-toggle not found at all");
        return false;
    }

    // Attach the click event
    const enable = readerToggle.getAttribute("data-enable");
    const disable = readerToggle.getAttribute("data-disable");
    console.log('[readerMode] Enable text:', enable, 'Disable text:', disable);

    readerToggle.addEventListener('click', () => {
        console.log('[readerMode] Reader toggle clicked');

        // Log function availability
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
    return true;
}