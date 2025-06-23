export async function setupReaderToggle() {
	if (document.readyState === "loading") {
		await new Promise(resolve =>
			document.addEventListener("DOMContentLoaded", resolve, {
				once: true
			})
		);
	}

	let readerToggle = document.getElementById("reader-toggle");
	if (!readerToggle) {
		readerToggle = await new Promise(resolve => {
			const observer = new MutationObserver(() => {
				const el = document.getElementById("reader-toggle");
				if (el) {
					observer.disconnect();
					resolve(el);
				}
			});
			observer.observe(document.body, {
				childList: true,
				subtree: true
			});
		});
	}

	if (!readerToggle) return false;

	const enableText = readerToggle.getAttribute("data-enable");
	const disableText = readerToggle.getAttribute("data-disable");

	let readerActive = false;
	let originalNodeClone = null;

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

		const articleElem = document.querySelector("article#reader, main, article");
		if (!articleElem) {
			alert("No article found for reader mode.");
			return;
		}

		if (!originalNodeClone) {
			originalNodeClone = articleElem.cloneNode(true);
		}

		const docClone = document.cloneNode(true);
		const reader = new window.Readability(docClone);
		const parsed = reader.parse();

		if (parsed && parsed.content) {
			articleElem.innerHTML = parsed.content;
			document.body.classList.add("reader-mode");
			readerToggle.textContent = disableText;
			readerToggle.classList.add("active");
			readerActive = true;
		} else {
			alert("Could not extract readable content.");
		}
	}

	function disableReaderMode() {
		const articleElem = document.querySelector("article#reader, main, article");
		if (articleElem && originalNodeClone) {
			const restored = originalNodeClone.cloneNode(true);
			articleElem.replaceWith(restored);

			// Reinitialise chapter functionality
			if (typeof window.setupReader === "function") {
				window.setupReader();
			}
			if (typeof window.setupChapterNavigation === "function") {
				window.setupChapterNavigation();
			}
		}

		document.body.classList.remove("reader-mode");
		readerToggle.textContent = enableText;
		readerToggle.classList.remove("active");
		readerActive = false;
	}

	function toggleReaderMode() {
		if (readerActive) {
			disableReaderMode();
		} else {
			enableReaderMode();
		}
	}

	// Sync button state on load
	if (document.body.classList.contains("reader-mode")) {
		readerToggle.textContent = disableText;
		readerToggle.classList.add("active");
	} else {
		readerToggle.textContent = enableText;
		readerToggle.classList.remove("active");
	}

	if (!readerToggle.__readerListener) {
		readerToggle.addEventListener("click", toggleReaderMode);
		readerToggle.__readerListener = true;
	}

	return true;
}