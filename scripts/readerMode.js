export async function setupReaderToggle() {
    // Wait for DOMContentLoaded if needed
    if (document.readyState === "loading") {
        await new Promise(resolve =>
            document.addEventListener("DOMContentLoaded", resolve, { once: true })
        );
    }

    // Wait for the reader toggle button to be present
    let readerToggle = document.getElementById("reader-toggle");
    if (!readerToggle) {
        // In case of late injection
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
    }

    if (!readerToggle) return false;

    const enableText = readerToggle.getAttribute("data-enable");
    const disableText = readerToggle.getAttribute("data-disable");

    // Define the toggle function
    const toggleReaderMode = () => {
        const active = document.body.classList.toggle("reader-mode");
        readerToggle.textContent = active ? disableText : enableText;
        readerToggle.classList.toggle('active', active);
    };

    // Sync initial state
    if (document.body.classList.contains("reader-mode")) {
        readerToggle.textContent = disableText;
        readerToggle.classList.add('active');
    } else {
        readerToggle.textContent = enableText;
        readerToggle.classList.remove('active');
    }

    // Only attach once
    if (!readerToggle.__readerListener) {
        readerToggle.addEventListener('click', toggleReaderMode);
        readerToggle.__readerListener = true;
    }

    return true;
}