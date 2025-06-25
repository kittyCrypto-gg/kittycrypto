import { setupReader, activateImageNavigation } from "./reader.js";

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

	getRootDocument(root) {
		if (root.createElement) return root;
		if (root.ownerDocument) return root.ownerDocument;
		return document;
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
			readerToggle.addEventListener("click", instance.handleToggleClick);
			readerToggle.__readerListener = true;
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
		const doc = this.getRootDocument(root);
		list.forEach(({ src, alt, hasContainer }) => {
			const img = Array.from(imgs).find(i =>
				(i.currentSrc || i.src) === src && i.alt === alt
			);
			if (!img) return;
			img.classList.add("chapter-image");
			if (hasContainer && !img.closest(".chapter-image-container")) {
				const wrapper = doc.createElement("div");
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

			document.body.classList.add("reader-mode");
			this.readerToggle.textContent = this.disableText;
			this.readerToggle.classList.add("active");
			this.readerActive = true;
		} else {
			alert("Could not extract readable content.");
		}
	}

	disableReaderMode() {
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
	}

	handleToggleClick() {
		if (this.readerActive) {
			this.disableReaderMode();
		} else {
			this.enableReaderMode();
		}
	}
}

export const setupReaderToggle = ReaderToggle.setup;