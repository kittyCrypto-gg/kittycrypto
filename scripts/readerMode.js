import { setupReader, activateImageNavigation } from "./reader.js";

export function storeChapterImages(root = document) {
	return Array.from(root.querySelectorAll("img.chapter-image")).map(img => ({
		src: img.currentSrc || img.src,
		alt: img.alt,
		hasContainer: !!img.closest(".chapter-image-container")
	}));
}

export function restoreChapterImages(list, root) {
	if (!Array.isArray(list) || !root) return;
	const imgs = root.querySelectorAll("img");
	list.forEach(({ src, alt, hasContainer }) => {
		const img = Array.from(imgs).find(i =>
			(i.currentSrc || i.src) === src && i.alt === alt
		);
		if (!img) return;
		img.classList.add("chapter-image");
		if (hasContainer && !img.closest(".chapter-image-container")) {
			const wrapper = root.createElement ? root.createElement("div") : document.createElement("div");
			wrapper.className = "chapter-image-container";
			img.replaceWith(wrapper);
			wrapper.appendChild(img);
		}
	});
	activateImageNavigation(root);
}

export async function ensureReadabilityLoaded() {
	if (window.Readability) return;
	await new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = "https://cdn.jsdelivr.net/npm/@mozilla/readability@0.5.0/Readability.min.js";
		script.onload = resolve;
		script.onerror = reject;
		document.head.appendChild(script);
	});
}

export async function enableReaderMode({ readerToggle, disableText, originalNodeCloneRef }) {
	const imgArray = storeChapterImages(document);

	await ensureReadabilityLoaded();

	const articleElem = document.querySelector("article#reader, main, article");
	if (!articleElem) {
		alert("No article found for reader mode.");
		return;
	}

	if (!originalNodeCloneRef.value) {
		originalNodeCloneRef.value = articleElem.cloneNode(true);
	}

	const docClone = document.cloneNode(true);
	const reader = new window.Readability(docClone);
	const parsed = reader.parse();

	if (parsed && parsed.content) {
		articleElem.innerHTML = parsed.content;
		restoreChapterImages(imgArray, articleElem);

		document.body.classList.add("reader-mode");
		readerToggle.textContent = disableText;
		readerToggle.classList.add("active");
		return true;
	} else {
		alert("Could not extract readable content.");
		return false;
	}
}

export function disableReaderMode({ readerToggle, enableText, originalNodeCloneRef }) {
	const articleElem = document.querySelector("article#reader, main, article");
	if (articleElem && originalNodeCloneRef.value) {
		const restored = originalNodeCloneRef.value.cloneNode(true);
		articleElem.replaceWith(restored);
		setupReader(restored);
	}
	document.body.classList.remove("reader-mode");
	readerToggle.textContent = enableText;
	readerToggle.classList.remove("active");
}

export async function setupReaderToggle() {
	if (document.readyState === "loading") {
		await new Promise(resolve =>
			document.addEventListener("DOMContentLoaded", resolve, { once: true })
		);
	}

	let readerToggle = document.getElementById("reader-toggle");
	if (readerToggle) return true;

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
	if (!readerToggle) return false;

	const enableText = readerToggle.getAttribute("data-enable");
	const disableText = readerToggle.getAttribute("data-disable");

	let readerActive = false;
	const originalNodeCloneRef = { value: null };

	const toggleReaderMode = async () => {
		if (readerActive) {
			disableReaderMode({ readerToggle, enableText, originalNodeCloneRef });
			readerActive = false;
		} else {
			const success = await enableReaderMode({ readerToggle, disableText, originalNodeCloneRef });
			if (success) readerActive = true;
		}
	};

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