import { setupReader } from "./reader.js";

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

	function storeChapterImages(root = document) {
		return Array.from(root.querySelectorAll("img.chapter-image")).map(img => ({
			src: img.currentSrc || img.src,
			alt: img.alt
		}));
	}

	function restoreChapterImages(list, root) {
		if (!Array.isArray(list) || !root) return;
		const imgs = root.querySelectorAll("img");
		list.forEach(({ src, alt }) => {
			const img = Array.from(imgs).find(i =>
				(i.currentSrc || i.src) === src && i.alt === alt
			);
			if (img) img.classList.add("chapter-image");
		});
	}

	async function enableReaderMode() {
		const imgArray = storeChapterImages(document);

		await ensureReadabilityLoaded();

		const articleElem = document.querySelector("article#reader, main, article");
		if (!articleElem) {
			alert("No article found for reader mode.");
			return;
		}

		if (!originalNodeClone)
			originalNodeClone = articleElem.cloneNode(true);

		const docClone = document.cloneNode(true);
		const reader = new window.Readability(docClone);
		const parsed = reader.parse();

		if (parsed && parsed.content) {
			articleElem.innerHTML = parsed.content;
			restoreChapterImages(imgArray, articleElem);

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

			// Reinitialise chapter functionality with the new root
			const newRoot = restored.ownerDocument || document; // in most cases, just document
			setupReader(restored); // pass the restored article as root
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