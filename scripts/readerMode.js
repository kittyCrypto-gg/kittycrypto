
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

  // Store the original HTML so we can restore it later
  let originalContent = null;
  let readerActive = false;

  // Helper: Load Readability from CDN if not present
  async function ensureReadabilityLoaded() {
    if (window.Readability) return;
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@mozilla/readability@0.5.0/Readability.min.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function enableReaderMode() {
    await ensureReadabilityLoaded();
    // Try to find the article
    const articleElem = document.querySelector("article#reader, main, article");
    if (!articleElem) {
      alert("No article found for reader mode.");
      return;
    }
    // Save the original for restore
    if (!originalContent) {
      originalContent = articleElem.innerHTML;
    }
    // Use Readability
    const docClone = document.cloneNode(true);
    const reader = new window.Readability(docClone, { debug: false });
    const parsed = reader.parse();
    if (parsed && parsed.content) {
      articleElem.innerHTML = parsed.content;
      readerActive = true;
      readerToggle.textContent = disableText;
      readerToggle.classList.add('active');
      document.body.classList.add('reader-mode');
    } else {
      alert("Could not extract readable content.");
    }
  }

  function disableReaderMode() {
    const articleElem = document.querySelector("article#reader, main, article");
    if (articleElem && originalContent !== null) {
      articleElem.innerHTML = originalContent;
    }
    readerActive = false;
    readerToggle.textContent = enableText;
    readerToggle.classList.remove('active');
    document.body.classList.remove('reader-mode');
  }

  function toggleReaderMode() {
    if (readerActive) {
      disableReaderMode();
    } else {
      enableReaderMode();
    }
  }

  // Sync initial state
  if (document.body.classList.contains("reader-mode")) {
    readerToggle.textContent = disableText;
    readerToggle.classList.add('active');
  } else {
    readerToggle.textContent = enableText;
    readerToggle.classList.remove('active');
  }

  // Attach event listener only once
  if (!readerToggle.__readerListener) {
    readerToggle.addEventListener('click', toggleReaderMode);
    readerToggle.__readerListener = true;
  }

  return true;
}