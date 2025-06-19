// Util: Format date as yyyy.mm.dd
function formatDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd}`;
}

// Create a single blog post element
function createBlogPost({ title, description, contentEncoded, pubDate, author, slug }, idx) {
    const formattedDate = formatDate(pubDate);

    // Wrapper div for one post
    const postDiv = document.createElement('div');
    postDiv.className = 'rss-post-block';
    postDiv.id = `post-${slug}`;

    // Header (title + date)
    const titleRow = document.createElement('div');
    titleRow.className = 'rss-post-header';
    titleRow.innerHTML = `
        <span class="rss-post-title">${title}</span>
        <span class="rss-post-date">${formattedDate}</span>
    `;

    // Meta (author)
    const metaDiv = document.createElement('div');
    metaDiv.className = 'rss-post-meta';
    metaDiv.innerHTML = `<span class="rss-post-author">${author}</span>`;

    // Summary (collapsible, clickable)
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'rss-post-summary summary-collapsed';
    summaryDiv.setAttribute('tabindex', '0');
    summaryDiv.innerHTML = `
        <span class="summary-arrow">▶️</span>
        <span class="summary-text">${description}</span>
    `;

    // Content (hidden by default)
    const contentDiv = document.createElement('div');
    contentDiv.className = 'rss-post-content content-collapsed';
    contentDiv.style.overflow = 'hidden';
    contentDiv.style.maxHeight = '0';
    contentDiv.innerHTML = contentEncoded;

    // Toggle logic
    summaryDiv.addEventListener('click', function () {
        const expanded = contentDiv.classList.toggle('content-expanded');
        contentDiv.classList.toggle('content-collapsed', !expanded);
        const arrow = this.querySelector('.summary-arrow');
        if (expanded) {
            arrow.textContent = '🔽';
            contentDiv.style.maxHeight = contentDiv.scrollHeight + 'px';
        } else {
            arrow.textContent = '▶️';
            contentDiv.style.maxHeight = '0';
        }
    });

    // Compose and return
    postDiv.appendChild(titleRow);
    postDiv.appendChild(metaDiv);
    postDiv.appendChild(summaryDiv);
    postDiv.appendChild(contentDiv);
    return postDiv;
}

// Render all posts into the container
function renderPosts(posts) {
    const wrapper = document.getElementById('blog-wrapper');
    let container = document.getElementById('blog-container');
    if (!wrapper) return;
    if (!container) {
        container = document.createElement('div');
        container.id = 'blog-container';
        wrapper.appendChild(container);
    }
    container.innerHTML = '';
    posts.forEach((post, idx) => {
        container.appendChild(createBlogPost(post, idx));
    });
}

// Parse RSS XML to array of post data
function parseRssItems(xmlText) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'application/xml');
    const items = xml.querySelectorAll('item');
    return Array.from(items).map(item => {
        const title = item.querySelector('title')?.textContent.trim() || '';
        const description = item.querySelector('description')?.textContent.trim() || '';
        const contentEncoded = item.querySelector('content\\:encoded')?.textContent.trim() || '';
        const pubDate = item.querySelector('pubDate')?.textContent.trim() || '';
        const author = item.querySelector('author')?.textContent.trim() || 'Kitty';
        const guid = item.querySelector('guid')?.textContent.trim() || '';
        const slug = guid.split('#')[1] || guid.split('/').pop() || Math.random().toString(36).slice(2);
        return { title, description, contentEncoded, pubDate, author, slug };
    });
}

// Main loader
async function loadBlogFeed() {
    const response = await fetch('https://kittycrypto.ddns.net:6819/rss/kittycrypto');
    const xmlText = await response.text();
    const posts = parseRssItems(xmlText);
    renderPosts(posts);
}

window.addEventListener('DOMContentLoaded', loadBlogFeed);