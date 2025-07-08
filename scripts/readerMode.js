import { setupReader, activateImageNavigation, readerIsFullyLoaded } from "./reader.js";
import { reloadReadAloud } from "./readAloud.js";

class ReaderToggle {
	readerActive = false;
	originalNodeClone = null;
	readerToggle = null;
	enableText = "";
	disableText = "";

	constructor(readerToggle) {
		this.readerToggle = readerToggle;
		this.enableText = readerToggle.getAttribute("data-enable");
		this.disableText = readerToggle.getAttribute("data-disable");
		this.handleToggleClick = this.handleToggleClick.bind(this);
	}

	static async setup() {
		if (document.readyState === "loading") {
			await new Promise(resolve =>
				document.addEventListener("DOMContentLoaded", resolve, { once: true })
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
				observer.observe(document.body, { childList: true, subtree: true });
			});
		}

		if (!readerToggle) return false;

		const instance = new ReaderToggle(readerToggle);
		instance.syncButtonState();

		if (!readerToggle.__readerListener) {
			readerToggle.addEventListener("click", await instance.handleToggleClick);
			readerToggle.__readerListener = true;
		}

		// Automatically enable reader mode if URL contains reader=true
		if (window.location.search.includes("reader=true")) {
			await readerIsFullyLoaded();
			await instance.enableReaderMode();
		}

		return true;
	}

	syncButtonState() {
		if (document.body.classList.contains("reader-mode")) {
			this.readerToggle.textContent = this.disableText;
			this.readerToggle.classList.add("active");
		} else {
			this.readerToggle.textContent = this.enableText;
			this.readerToggle.classList.remove("active");
		}
	}

	storeChapterImages(root = document) {
		return Array.from(root.querySelectorAll("img.chapter-image")).map(img => ({
			src: img.currentSrc || img.src,
			alt: img.alt,
			hasContainer: !!img.closest(".chapter-image-container")
		}));
	}

	async ensureReadabilityLoaded() {
		if (window.Readability) return;
		await new Promise((resolve, reject) => {
			const script = document.createElement("script");
			script.src = "https://cdn.jsdelivr.net/npm/@mozilla/readability@0.5.0/Readability.min.js";
			script.onload = resolve;
			script.onerror = reject;
			document.head.appendChild(script);
		});
	}

	restoreChapterImages(list, root) {
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

	async enableReaderMode() {
		const imgArray = this.storeChapterImages(document);

		await this.ensureReadabilityLoaded();

		const articleElem = document.querySelector("article#reader, main, article");
		if (!articleElem) {
			alert("No article found for reader mode.");
			return;
		}

		if (!this.originalNodeClone)
			this.originalNodeClone = articleElem.cloneNode(true);

		const docClone = document.cloneNode(true);
		const reader = new window.Readability(docClone);
		const parsed = reader.parse();

		if (parsed && parsed.content) {
			articleElem.innerHTML = parsed.content;
			this.restoreChapterImages(imgArray, articleElem);
			articleElem.classList.add("reader-container");

			// Update the URL to include ?reader=true (or &reader=true if there are other query parameters)
			const url = new URL(window.location);
			if (!url.searchParams.has("reader")) {
				url.searchParams.set("reader", "true");
			}
			window.history.pushState({}, "", url);

			document.body.classList.add("reader-mode");
			this.readerToggle.textContent = this.disableText;
			this.readerToggle.classList.add("active");
			this.readerActive = true;
		} else {
			alert("Could not extract readable content.");
		}
	}

	async disableReaderMode() {
		const articleElem = document.querySelector("article#reader, main, article");
		if (articleElem && this.originalNodeClone) {
			const restored = this.originalNodeClone.cloneNode(true);
			articleElem.replaceWith(restored);
			const newRoot = restored.ownerDocument || document;
			setupReader(restored);
		}

		document.body.classList.remove("reader-mode");
		this.readerToggle.textContent = this.enableText;
		this.readerToggle.classList.remove("active");
		this.readerActive = false;

		// Remove ?reader=true from the URL when disabling reader mode
		const url = new URL(window.location);
		url.searchParams.delete("reader");
		window.history.pushState({}, "", url);
	}

	async handleToggleClick() {
		this.readerActive ? await this.disableReaderMode() : await this.enableReaderMode();
		return;
	}
}

export const setupReaderToggle = ReaderToggle.setup;