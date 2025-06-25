import { setupReader, activateImageNavigation } from "./reader.js";

// Ensure Readability library is loaded
async function ensureReadabilityLoaded() {
	if (window.Readability) return;

	await new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src =
			"https://cdn.jsdelivr.net/npm/@mozilla/readability@0.5.0/Readability.min.js";
		script.onload = resolve;
		script.onerror = reject;
		document.head.appendChild(script);
	});
}

// Store chapter images before Readability modifies the article content.
function storeChapterImages(root = document) {
	// Store info about each image: src, alt, and if it's inside .chapter-image-container
	return Array.from(root.querySelectorAll("img.chapter-image")).map(img => ({
		src: img.currentSrc || img.src,
		alt: img.alt,
		hasContainer: !!img.closest(".chapter-image-container"),
	}));
}

// Restore chapter images after Readability has modified the article content.
function restoreChapterImages(list, root) {
	if (!Array.isArray(list) || !root) return;

	const imgs = root.querySelectorAll("img");

	list.forEach(({ src, alt, hasContainer }) => {
		const img = Array.from(imgs).find(
			i => (i.currentSrc || i.src) === src && i.alt === alt,
		);
		if (!img) return;

		img.classList.add("chapter-image");

		// Ensure .chapter-image-container exists
		if (hasContainer && !img.closest(".chapter-image-container")) {
			const wrapper = document.createElement("div");
			wrapper.className = "chapter-image-container";
			img.replaceWith(wrapper);
			wrapper.appendChild(img);
		}
	});

	// Now restore navigation handlers
	activateImageNavigation(root);
}

// Enable Reader Mode and parse the article content
async function enableReaderMode(state) {
	const { readerToggle, disableText } = state;

	const imgArray = storeChapterImages(document);
	await ensureReadabilityLoaded();

	// Target article element
	const articleElem = document.querySelector("article#reader, main, article");
	if (!articleElem) {
		alert("No article found for reader mode.");
		return;
	}

	// Save original markup once
	if (!state.originalNodeClone) {
		state.originalNodeClone = articleElem.cloneNode(true);
	}

	// Parse with Readability
	const docClone = document.cloneNode(true);
	const reader = new window.Readability(docClone);
	const parsed = reader.parse();

	if (parsed && parsed.content) {
		articleElem.innerHTML = parsed.content;
		restoreChapterImages(imgArray, articleElem);

		document.body.classList.add("reader-mode");
		readerToggle.textContent = disableText;
		readerToggle.classList.add("active");
		state.readerActive = true;
	} else {
		alert("Could not extract readable content.");
	}
}

// Disable Reader Mode and restore original content
function disableReaderMode(state) {
	const { readerToggle, enableText, originalNodeClone } = state;

	const articleElem = document.querySelector("article#reader, main, article");
	if (articleElem && originalNodeClone) {
		const restored = originalNodeClone.cloneNode(true);
		articleElem.replaceWith(restored);

		// Re-initialise chapter functionality with the new root
		setupReader(restored); // pass the restored article as root
	}

	document.body.classList.remove("reader-mode");
	readerToggle.textContent = enableText;
	readerToggle.classList.remove("active");
	state.readerActive = false;
}

// Toggle Reader Mode based on current state
async function toggleReaderMode(state) {
	if (state.readerActive) {
		disableReaderMode(state);
	} else {
		await enableReaderMode(state);
	}
}

// Export the setup function to be used in other scripts
export async function setupReaderToggle() {
	// Wait for DOMContentLoaded if necessary 
	if (document.readyState === "loading") {
		await new Promise(resolve =>
			document.addEventListener("DOMContentLoaded", resolve, { once: true }),
		);
	}

	// Find (or wait for) #reader-toggle in the DOM 
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

	// Prepare shared state for the helper functions 
	const state = {
		readerToggle,
		enableText: readerToggle.getAttribute("data-enable"),
		disableText: readerToggle.getAttribute("data-disable"),
		readerActive: false,
		originalNodeClone: null,
	};

	// Sync button state on load 
	if (document.body.classList.contains("reader-mode")) {
		readerToggle.textContent = state.disableText;
		readerToggle.classList.add("active");
		state.readerActive = true;
	} else {
		readerToggle.textContent = state.enableText;
		readerToggle.classList.remove("active");
	}

	// Attach click handler (only once) 
	if (!readerToggle.__readerListener) {
		readerToggle.addEventListener("click", () => toggleReaderMode(state));
		readerToggle.__readerListener = true;
	}

	return true;
}