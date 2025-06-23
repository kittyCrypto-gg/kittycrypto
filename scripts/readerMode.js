document.addEventListener("DOMContentLoaded", () => {
    const readerToggle = document.getElementById("reader-toggle");
    if (!readerToggle) return;

    // Get the icons injected by main.js from the config
    const enable = readerToggle.getAttribute("data-enable");
    const disable = readerToggle.getAttribute("data-disable");

    readerToggle.addEventListener("click", () => {
        const isReader = document.body.classList.toggle("reader-mode");
        readerToggle.textContent = isReader ? disable : enable;
    });
});