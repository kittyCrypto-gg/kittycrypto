import { replaceTategaki } from './tategaki.js';

const params = new URLSearchParams(window.location.search);
const storyPath = params.get("story");
let chapter = parseInt(params.get("chapter") || "1");

const fallback = document.getElementById('js-content-fallback');
if (fallback) fallback.style.display = 'none';

const chapterCacheKey = `chapterCache_${storyPath}`;
let lastKnownChapter = parseInt(localStorage.getItem(chapterCacheKey) || "0");

const readerRoot = document.getElementById("reader");
const storyPickerRoot = document.getElementById("story-picker");

// Reader-specific cookie helpers to avoid collision with main.js
function setReaderCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `reader_${name}=${value}; expires=${expires}; path=/`;
}

function getReaderCookie(name) {
  const cookies = document.cookie.split("; ");
  const cookie = cookies.find(row => row.startsWith(`reader_${name}=`));
  return cookie ? cookie.split("=")[1] : null;
}

// Helper to check for aliases of tags in the cleaned or bloated XML
function getElementsByAliases(doc, aliases) {
  for (const tag of aliases) {
    const found = doc.getElementsByTagName(tag);
    if (found.length > 0) return Array.from(found);
  }
  return [];
}

function prevBtnEn(chapter, chapters) {
  const hasChapter0 = chapters.includes(0);
  chapter = Number(chapter);
  if (chapter <= 1 && !hasChapter0) return false;
  if (chapter <= 0) return false;
  return true;
}

function updatePrevButtonState() {
  const chapters = JSON.parse(localStorage.getItem(chapterCacheKey) || "[]");
  const enablePrev = prevBtnEn(chapter, chapters);

  document.querySelectorAll(".btn-prev").forEach(btn => {
    btn.disabled = !enablePrev;
  });
}

function clearBookmarkForCurrentChapter() {
  const storyKey = makeStoryKey(storyPath);
  const key = `bookmark_${storyKey}_ch${chapter}`;
  localStorage.removeItem(key);
  showTemporaryNotice("Bookmark cleared for this chapter.");
}

function showTemporaryNotice(message, timeout = 1000) {
  const notice = document.createElement("div");
  notice.textContent = message;
  notice.style.position = "fixed";
  notice.style.top = "50%"; // halfway down the viewport
  notice.style.left = "50%";
  notice.style.transform = "translate(-50%, -50%)"; // centre horizontally and vertically
  notice.style.background = "var(--chatroom-bg-colour)";
  notice.style.color = "var(--chatroom-text-colour)";
  notice.style.padding = "10px 20px";
  notice.style.borderRadius = "8px";
  notice.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  notice.style.zIndex = "9999";
  document.body.appendChild(notice);

  setTimeout(() => {
    notice.remove();
  }, timeout);
}

// Inject navigation bars at top and bottom
function injectNav() {
  const navHTML = `
  <div class="chapter-navigation">
    <button class="btn-clear-bookmark">↩️</button>
    <button class="btn-prev">⏪</button>
    <input class="chapter-display" type="text" value="1" readonly style="width: 2ch; text-align: center; border: none; background: transparent; font-weight: bold;" />
    <input class="chapter-input" type="number" min="0" style="width: 2ch; text-align: center;" />
    <button class="btn-jump">⏯️</button>
    <button class="chapter-end" disabled style="width: 2ch; text-align: center; font-weight: bold;"></button>
    <button class="btn-next">⏩</button>
    <button class="btn-scroll-down">⏬</button>
    <button class="btn-info">ℹ️</button>
  </div>
  <div class="font-controls">
    <button class="font-decrease">➖</button>
    <button class="font-reset">🔁</button>
    <button class="font-increase">➕</button>
  </div>
`;

  const navTop = document.createElement("div");
  navTop.innerHTML = navHTML;
  const navBottom = navTop.cloneNode(true);

  // Replace ⏬ with ⏫ in the bottom nav
  const scrollDownBtn = navBottom.querySelector(".btn-scroll-down");
  if (scrollDownBtn) {
    scrollDownBtn.textContent = "⏫";
    scrollDownBtn.classList.remove("btn-scroll-down");
    scrollDownBtn.classList.add("btn-scroll-up");
  }

  readerRoot.insertAdjacentElement("beforebegin", navTop);
  readerRoot.insertAdjacentElement("afterend", navBottom);
}

// Font size logic
function updateFontSize(delta = 0) {
  const current = parseFloat(getReaderCookie("fontSize")) || 1;
  const newSize = Math.max(0.7, Math.min(2.0, current + delta));
  setReaderCookie("fontSize", newSize.toFixed(2));
  readerRoot.style.setProperty("font-size", `${newSize}em`);
  refreshTategakiFont();
}

function showNavigationInfo() {
  alert(`Navigation Button Guide:

  ↩️  – Clear the current bookmark
  ⏪  – Go to previous chapter
  ⏯️  – Jump to a specific chapter
  ⏩  – Go to next chapter
  ⏬  – Scroll to the end of the page
  ⏫  – Scroll to the top of the page

Font Controls:
  ➖  – Decrease font size
  🔁  – Reset font size to default
  ➕  – Increase font size`);
}


function bindNavigationEvents() {
  const chapters = JSON.parse(localStorage.getItem(chapterCacheKey) || "[]");
  document.querySelectorAll(".btn-prev").forEach(btn => btn.onclick = () => {
    if (!prevBtnEn(chapter, chapters)) {
      btn.disabled = true;
      return;
    }
    jumpTo(chapter - 1);
  });

  document.querySelectorAll(".btn-next").forEach(btn => btn.onclick = () => {
    if (chapter < lastKnownChapter) jumpTo(chapter + 1);
  });

  // Jump to the chapter typed next to this button
  document.querySelectorAll(".btn-jump").forEach(btn => {
    btn.onclick = () => {
      const input = btn.parentElement.querySelector(".chapter-input");
      if (!input) return;

      const val = parseInt(input.value, 10);
      if (!isNaN(val) && val >= 0 && val <= lastKnownChapter) {
        jumpTo(val);
      }
    };
  });

  document.querySelectorAll(".chapter-input").forEach(input => {
    input.value = chapter;
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const val = parseInt(e.target.value);
        if (val >= 0 && val <= lastKnownChapter) jumpTo(val);
      }
    });
  });

  document.querySelectorAll(".btn-rescan").forEach(btn => btn.onclick = async () => {
    localStorage.removeItem(chapterCacheKey);
    lastKnownChapter = await discoverChapters();
    updateNav();
  });

  document.querySelectorAll(".btn-clear-bookmark").forEach(btn => {
    btn.onclick = clearBookmarkForCurrentChapter;
  });

  document.querySelectorAll(".font-increase").forEach(btn => btn.onclick = () => updateFontSize(0.1));
  document.querySelectorAll(".font-decrease").forEach(btn => btn.onclick = () => updateFontSize(-0.1));
  document.querySelectorAll(".font-reset").forEach(btn => btn.onclick = () => updateFontSize(0));
  document.querySelectorAll(".btn-info").forEach(btn => btn.onclick = showNavigationInfo);
}

async function populateStoryPicker() {
  if (!storyPickerRoot) return;
  try {
    const res = await fetch("scripts/stories.json");
    if (!res.ok) throw new Error("No stories found");
    const stories = await res.json();

    const select = document.createElement("select");
    select.className = "story-selector";
    select.innerHTML = `<option value="">Select a story...</option>`;
    Object.entries(stories).forEach(([name, path]) => {
      const opt = document.createElement("option");
      opt.value = path;
      opt.textContent = name;
      if (path === storyPath) opt.selected = true;
      select.appendChild(opt);
    });

    select.onchange = () => {
      if (select.value) {
        window.location.search = `?story=${encodeURIComponent(select.value)}&chapter=1`;
      }
    };

    storyPickerRoot.appendChild(select);
  } catch (err) {
    console.warn("No stories found or failed to load stories.json", err);
  }
}

async function loadChapter(n) {
  try {
    const res = await fetch(`${storyPath}/chapt${n}.xml`);
    if (!res.ok) throw new Error("Chapter not found");
    const xmlText = await res.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");
    // Use the helper function to support both "w:p" and "paragraph" tags
    const paras = getElementsByAliases(xmlDoc, ["w:p", "paragraph"]);
    let htmlContent = paras.map(p => {
      const isCleaned = p.tagName === "paragraph";
      const pPr = isCleaned ? null : p.getElementsByTagName("w:pPr")[0];
      let style = "";
      if (!isCleaned && pPr) {
        const styleEl = pPr.getElementsByTagName("w:pStyle")[0];
        if (styleEl) style = styleEl.getAttribute("w:val") || "";
      }
      let tag = "p";
      let className = "reader-paragraph";
      if (style === "Title") {
        tag = "h1";
        className = "reader-title";
      } else if (style === "Heading1" || style === "Heading2") {
        tag = "h2";
        className = "reader-subtitle";
      } else if (style === "Quote") {
        tag = "blockquote";
        className = "reader-quote";
      } else if (style === "IntenseQuote") {
        tag = "blockquote";
        className = "reader-quote reader-intense";
      }
      const runs = isCleaned
        ? [p.textContent || ""]
        : Array.from(p.getElementsByTagName("w:r")).map(run => {
          const text = Array.from(run.getElementsByTagName("w:t"))
            .map(t => t.textContent)
            .join("");
          const rPr = run.getElementsByTagName("w:rPr")[0];
          let spanClass = [];
          if (rPr) {
            if (rPr.getElementsByTagName("w:b").length) spanClass.push("reader-bold");
            if (rPr.getElementsByTagName("w:i").length) spanClass.push("reader-italic");
            if (rPr.getElementsByTagName("w:u").length) spanClass.push("reader-underline");
            if (rPr.getElementsByTagName("w:strike").length) spanClass.push("reader-strike");
            if (rPr.getElementsByTagName("w:smallCaps").length) spanClass.push("reader-smallcaps");
          }
          return `<span class="${spanClass.join(" ")}">${text}</span>`;
        }).join("");
      return `<${tag} class="${className}">${runs}</${tag}>`;
    }).join("\n");
    // Process Tategaki and images
    htmlContent = replaceTategaki(htmlContent);
    htmlContent = replaceImageTags(htmlContent);
    htmlContent = injectBookmarksIntoHTML(htmlContent, storyPath, chapter);

    // Render the HTML
    readerRoot.innerHTML = htmlContent;

    // Start tracking scroll progress
    observeAndSaveBookmarkProgress();

    // Scroll to the saved bookmark after DOM layout is ready
    requestAnimationFrame(() => {
      restoreBookmark(storyPath, chapter);
    });

    // Activate features
    activateImageNavigation();
    chapter = n;
    updateNav();
    bindNavigationEvents();
    setReaderCookie(`bookmark_${encodeURIComponent(storyPath)}`, chapter);
    window.scrollTo(0, 0);
    function injectNav() {
      const navHTML = `
    <div class="chapter-navigation">
      <button class="btn-prev">⏪</button>
      <input class="chapter-display" type="text" value="1" readonly style="width: 2ch; text-align: center; border: none; background: transparent; font-weight: bold;" />
      <input class="chapter-input" type="number" min="0" style="width: 2ch; text-align: center;" />
      <button class="btn-jump">⏯️</button>
      <button class="chapter-end" disabled style="width: 2ch; text-align: center; font-weight: bold;"></button>
      <button class="btn-next">⏩</button>
      <button class="btn-scroll-down">⏬</button>
    </div>
    <div class="font-controls">
      <button class="font-decrease">➖</button>
      <button class="font-reset">🔁</button>
      <button class="font-increase">➕</button>
    </div>
  `;

      const navTop = document.createElement("div");
      navTop.innerHTML = navHTML;
      const navBottom = navTop.cloneNode(true);

      // Replace ⏬ with ⏫ in the bottom nav
      const scrollDownBtn = navBottom.querySelector(".btn-scroll-down");
      if (scrollDownBtn) {
        scrollDownBtn.textContent = "⏫";
        scrollDownBtn.classList.remove("btn-scroll-down");
        scrollDownBtn.classList.add("btn-scroll-up");
      }

      readerRoot.insertAdjacentElement("beforebegin", navTop);
      readerRoot.insertAdjacentElement("afterend", navBottom);

      updatePrevButtonState();
    }
  } catch (err) {
    readerRoot.innerHTML = `
      <div class="chapter-404">
        <h2>📕 Chapter ${n} Not Found</h2>
        <p>Looks like this XML chapter doesn't exist yet.</p>
      </div>
    `;
    console.error(err);
  }
}

async function discoverChapters() {
  let i = 1;
  let chapters = [];

  // Check for Chapter 0 existence first
  try {
    const path = `${storyPath}/chapt0.xml`;
    //console.log(`Checking for Chapter 0 at ${path}`);
    const res = await fetch(path, { method: "HEAD" });
    if (res.ok) {
      chapters.push(0);
    }
  } catch (err) {
    //console.log('No chapter 0');
  }

  // Discover remaining chapters
  while (true) {
    try {
      const path = `${storyPath}/chapt${i}.xml`;
      //console.log(`Reading Chapter ${i} in ${path}`);
      const res = await fetch(path, { method: "HEAD" });
      if (!res.ok) break;
      chapters.push(i);
      i++;
    } catch (err) {
      console.error(`Error at chapt${i}:`, err);
      break;
    }
  }

  const last = i - 1;
  lastKnownChapter = chapters.length > 0 ? Math.max(...chapters) : 0;
  localStorage.setItem(chapterCacheKey, JSON.stringify(chapters));
  lastKnownChapter = chapters.length > 0 ? Math.max(...chapters) : 0;
  return chapters;
}

function jumpTo(n) {
  // Attempt to get story path from URL (decoded) or fallback to localStorage
  let currentStoryPath = decodeURIComponent(storyPath) || localStorage.getItem('currentStoryPath');

  // If no story path is found, alert the user and prevent the jump
  if (!currentStoryPath) {
    alert("No story selected. Please select a story first.");
    return;
  }

  // Save the current story path for future navigation
  localStorage.setItem('currentStoryPath', currentStoryPath);

  // Properly encode the URL before setting it
  const encodedPath = encodeURIComponent(currentStoryPath);
  window.location.search = `?story=${encodedPath}&chapter=${n}`;
}

function replaceImageTags(htmlContent) {
  // Regex to match ::img:url:...:alt:...::
  const imageWithAltRegex = /::img:url:(.*?):alt:(.*?)::/g;

  // Replace each ::img:url:...:alt:...:: with an <img> wrapped in a div
  htmlContent = htmlContent.replace(imageWithAltRegex, (match, url, alt) => {
    return `
      <div class="chapter-image-container">
        <img 
          src="${url.trim()}" 
          alt="${alt.trim()}" 
          class="chapter-image" 
          loading="lazy" 
          onerror="this.onerror=null; this.src='/path/to/fallback-image.png'; this.alt='Image not found';"
        />
      </div>
    `;
  });

  // Match images without alt text: ::img:url:...::
  const imageWithoutAltRegex = /::img:url:(.*?)::/g;
  return htmlContent.replace(imageWithoutAltRegex, (match, url) => {
    return `
      <div class="chapter-image-container">
        <img 
          src="${url.trim()}" 
          alt="Chapter Image" 
          class="chapter-image" 
          loading="lazy" 
          onerror="this.onerror=null; this.src='/path/to/fallback-image.png'; this.alt='Image not found';"
        />
      </div>
    `;
  });
}

function refreshTategakiFont() {
  // current computed body font-size in px
  const px = parseFloat(getComputedStyle(readerRoot).fontSize);
  document
    .querySelectorAll(".tategaki-container svg text")
    .forEach(t => t.setAttribute("font-size", px));
}

function updateNav() {
  document.querySelectorAll(".chapter-display").forEach(el => el.value = chapter);
  document.querySelectorAll(".chapter-end").forEach(btn => btn.textContent = lastKnownChapter);

  // If Chapter 0 is detected, allow the Previous button to activate when on Chapter 1
  const chapters = JSON.parse(localStorage.getItem(chapterCacheKey) || "[]");
  const hasChapter0 = chapters.includes(0);

  document.querySelectorAll(".btn-next").forEach(btn => {
    btn.disabled = chapter === lastKnownChapter;
  });

  updatePrevButtonState();
}

async function initReader() {
  await populateStoryPicker();
  if (!storyPath) return;

  injectNav();

  const chapters = await discoverChapters();

  if (!params.get("chapter")) {
    const bookmark = parseInt(getReaderCookie(`bookmark_${encodeURIComponent(storyPath)}`));
    if (bookmark && chapters.includes(bookmark)) {
      chapter = bookmark;
    } else {
      chapter = 1;
    }
  }

  await loadChapter(chapter);

  const initialFont = parseFloat(getReaderCookie("fontSize")) || 1;
  readerRoot.style.setProperty("font-size", `${initialFont}em`);
}

function activateImageNavigation() {
  // First, clear any existing overlays and listeners to avoid duplication
  document.querySelectorAll(".image-nav").forEach(nav => nav.remove());

  document.querySelectorAll(".chapter-image-container").forEach(container => {
    const image = container.querySelector(".chapter-image");

    // === Create Navigation Overlay ===
    const navOverlay = document.createElement("div");
    navOverlay.classList.add("image-nav");
    navOverlay.innerHTML = `
      <button class="btn-up">⬆️</button>
      <div class="horizontal">
        <button class="btn-left">⬅️</button>
        <button class="btn-center">⏺️</button>
        <button class="btn-right">➡️</button>
      </div>
      <button class="btn-down">⬇️</button>
    `;

    container.appendChild(navOverlay);

    // === State Logic ===
    let posX = 50;
    let posY = 50;
    const step = 5;

    const updatePosition = () => {
      image.style.transformOrigin = `${posX}% ${posY}%`;
    };

    // === Holdable Button Logic (JS-safe) ===
    const startHold = (onHold) => {
      const interval = setInterval(onHold, 100);
      const stopHold = () => {
        clearInterval(interval);
        document.removeEventListener("mouseup", stopHold);
        document.removeEventListener("touchend", stopHold);
        document.removeEventListener("mouseleave", stopHold);
      };
      document.addEventListener("mouseup", stopHold);
      document.addEventListener("touchend", stopHold);
      document.addEventListener("mouseleave", stopHold);
      onHold(); // immediate execution
    };

    navOverlay.querySelector(".btn-up").addEventListener("mousedown", () => {
      startHold(() => {
        posY = Math.max(0, posY - step);
        updatePosition();
      });
    });

    navOverlay.querySelector(".btn-down").addEventListener("mousedown", () => {
      startHold(() => {
        posY = Math.min(100, posY + step);
        updatePosition();
      });
    });

    navOverlay.querySelector(".btn-left").addEventListener("mousedown", () => {
      startHold(() => {
        posX = Math.max(0, posX - step);
        updatePosition();
      });
    });

    navOverlay.querySelector(".btn-right").addEventListener("mousedown", () => {
      startHold(() => {
        posX = Math.min(100, posX + step);
        updatePosition();
      });
    });

    // Touch support for mobile
    navOverlay.querySelector(".btn-up").addEventListener("touchstart", () => {
      startHold(() => {
        posY = Math.max(0, posY - step);
        updatePosition();
      });
    });

    navOverlay.querySelector(".btn-down").addEventListener("touchstart", () => {
      startHold(() => {
        posY = Math.min(100, posY + step);
        updatePosition();
      });
    });

    navOverlay.querySelector(".btn-left").addEventListener("touchstart", () => {
      startHold(() => {
        posX = Math.max(0, posX - step);
        updatePosition();
      });
    });

    navOverlay.querySelector(".btn-right").addEventListener("touchstart", () => {
      startHold(() => {
        posX = Math.min(100, posX + step);
        updatePosition();
      });
    });

    // Centre button is click only
    navOverlay.querySelector(".btn-center").addEventListener("click", () => {
      posX = 50;
      posY = 50;
      updatePosition();
    });

    // === Zoom toggle ===
    const toggleZoom = () => {
      if (image.classList.contains("active")) {
        image.classList.remove("active");
        navOverlay.classList.remove("active");
      } else {
        image.classList.add("active");
        navOverlay.classList.add("active");
      }
    };

    image.addEventListener("click", toggleZoom);

    container.addEventListener("mouseleave", () => {
      navOverlay.classList.remove("active");
    });

    // === Swipe support for mobile ===
    enableImageSwipeNavigation(image, () => posX, () => posY, (x, y) => {
      posX = x;
      posY = y;
      updatePosition();
    });
  });

  // === Swipe handler helper ===
  function enableImageSwipeNavigation(image, getX, getY, setPosition) {
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let isSwiping = false;

    image.addEventListener("touchstart", e => {
      if (!image.classList.contains("active")) return;
      if (e.touches.length === 1) {
        isSwiping = true;
        startX = lastX = e.touches[0].clientX;
        startY = lastY = e.touches[0].clientY;
      }
    }, { passive: true });

    image.addEventListener("touchmove", e => {
      if (!isSwiping || e.touches.length !== 1) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;

      const deltaX = currentX - lastX;
      const deltaY = currentY - lastY;
      lastX = currentX;
      lastY = currentY;

      const pxToPercent = 300; // base: 300px for full range
      let newX = getX() - (deltaX / pxToPercent) * 100;
      let newY = getY() - (deltaY / pxToPercent) * 100;

      newX = Math.min(100, Math.max(0, newX));
      newY = Math.min(100, Math.max(0, newY));
      setPosition(newX, newY);
    }, { passive: true });

    image.addEventListener("touchend", () => {
      isSwiping = false;
    });
  }
}

function makeStoryKey(storyPath) {
  return encodeURIComponent(storyPath).replace(/\W/g, '_');
}

function injectBookmarksIntoHTML(htmlContent, storyPath, chapter) {
  const storyKey = makeStoryKey(storyPath);
  const bookmarkId = localStorage.getItem(`bookmark_${storyKey}_ch${chapter}`);
  let counter = 0;

  return htmlContent.replace(
    /<(p|h1|h2|blockquote)(.*?)>([\s\S]*?)<\/\1>/g,
    (match, tag, attrs, inner) => {
      const id = `bm-${storyKey}-ch${chapter}-${counter++}`;
      const emojiSpan = id === bookmarkId
        ? `<span class="bookmark-emoji" aria-label="bookmark">🔖</span> `
        : '';
      return `<div class="reader-bookmark" id="${id}"><${tag}${attrs}>${emojiSpan}${inner}</${tag}></div>`;
    }
  );
}

function observeAndSaveBookmarkProgress() {
  const bookmarks = Array.from(document.querySelectorAll(".reader-bookmark"));
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) return;

      const id = entry.target.id;
      const match = id.match(/^bm-([^]+)-ch(\d+)-\d+$/);
      if (!match) return;

      const storyKey = match[1];
      const chapter = match[2];
      const key = `bookmark_${storyKey}_ch${chapter}`;
      const newIndex = bookmarks.findIndex(el => el.id === id);

      if (newIndex === bookmarks.length - 1) {
        localStorage.removeItem(key);
        return;
      }

      const savedId = localStorage.getItem(key);
      const savedIndex = bookmarks.findIndex(el => el.id === savedId);
      if (newIndex <= savedIndex) return;

      localStorage.setItem(key, id);
    }
  }, {
    threshold: 0.6
  });

  setTimeout(() => {
    bookmarks.forEach(el => observer.observe(el));
  }, 1000);
}

function restoreBookmark(storyPath, chapter) {
  const storyKey = makeStoryKey(storyPath);
  const key = `bookmark_${storyKey}_ch${chapter}`;
  const id = localStorage.getItem(key);
  if (!id) return;

  const bookmarkDiv = document.getElementById(id);
  if (!bookmarkDiv) return;

  // Scroll to the next bokmark if available
  const nextBookmark = bookmarkDiv.nextElementSibling;
  if (nextBookmark) {
    const scrollY = nextBookmark.getBoundingClientRect().top
    window.scrollTo({ top: scrollY, behavior: "smooth" });
  }

  // Apply highlight to the actual bookmarked paragraph (not the one we're scrolling to)
  bookmarkDiv.classList.add("reader-highlight");

  setTimeout(() => {
    bookmarkDiv.classList.add("fade-out");
    bookmarkDiv.addEventListener("transitionend", () => {
      bookmarkDiv.classList.remove("reader-highlight", "fade-out");
    }, { once: true });
  }, 5000);
}

function restoreLastStoryRead() {
  const params = new URLSearchParams(window.location.search);
  const story = params.get("story");
  const chapter = params.get("chapter");
  const lastKey = "lastStoryRead";

  if (story && chapter !== null) {
    localStorage.setItem(lastKey, JSON.stringify({ story, chapter }));
    return;
  }

  const last = localStorage.getItem(lastKey);
  if (!last) return;

  try {
    const { story, chapter } = JSON.parse(last);
    if (!story || chapter === null) return;

    const encoded = `?story=${encodeURIComponent(story)}&chapter=${chapter}`;
    window.location.search = encoded;
  } catch (e) {
    console.warn("Failed to parse lastStoryRead:", e);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  restoreLastStoryRead();
  initReader();
  activateImageNavigation();
});

document.addEventListener("click", (e) => {
  const target = e.target;
  const bookmarks = Array.from(document.querySelectorAll(".reader-bookmark"));
  if (!bookmarks.length) return;

  if (target.classList.contains("btn-scroll-down")) {
    const upBtn = document.querySelector(".btn-scroll-up");
    if (!upBtn) return;
    upBtn.scrollIntoView({ behavior: "smooth" });
    return;
  }

  if (target.classList.contains("btn-scroll-up")) {
    const downBtn = document.querySelector(".btn-scroll-down");
    if (!downBtn) return;
    downBtn.scrollIntoView({ behavior: "smooth" });
    return;
  }
});

export async function setupReader() {
  await loadChapterFromUrl();
  setupChapterNavigation();
  setupChapterImageZoom();
  setupFontControls();
}