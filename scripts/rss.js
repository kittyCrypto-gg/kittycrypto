// Utility: Parse the XML and extract items
function parseRSS(xml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    return Array.from(doc.querySelectorAll('item')).map(item => {
        const contentTags = item.getElementsByTagName('content:encoded');
        const contentEncoded = (contentTags.length ? contentTags[0].textContent.trim() : "");
        return {
            title: item.querySelector('title')?.textContent.trim() || '',
            description: item.querySelector('description')?.textContent.trim() || '',
            content: contentEncoded,
            pubDate: item.querySelector('pubDate')?.textContent.trim() || '',
            author: item.querySelector('author')?.textContent.trim() || 'Kitty',
            guid: item.querySelector('guid')?.textContent.trim() || ''
        };
    });
}

// Utility: Format date to yyyy.mm.dd
function formatDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return "";
    return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`;
}

// Render a single post
function renderPost(post) {
    const postDiv = document.createElement('div');
    postDiv.className = 'rss-post-block';

    postDiv.innerHTML = `
        <div class="rss-post-header">
            <span class="rss-post-title">${post.title}</span>
            <span class="rss-post-date">${formatDate(post.pubDate)}</span>
        </div>
        <div class="rss-post-meta"><span class="rss-post-author">By: ${post.author}</span></div>
        <div class="rss-post-summary summary-collapsed" tabindex="0">
            <span class="summary-arrow">▶️</span>
            <span class="summary-text">${post.description}</span>
        </div>
        <div class="rss-post-content content-collapsed" style="overflow: hidden; max-height: 0;"></div>
    `;
    // Set content
    postDiv.querySelector('.rss-post-content').innerHTML = marked.parse(post.content);

    // Toggle logic
    postDiv.querySelector('.rss-post-summary').addEventListener('click', function () {
        const contentDiv = this.nextElementSibling;
        const expanded = contentDiv.classList.toggle('content-expanded');
        contentDiv.classList.toggle('content-collapsed', !expanded);
        if (expanded) {
            this.querySelector('.summary-arrow').textContent = '🔽';
            contentDiv.style.maxHeight = contentDiv.scrollHeight + 'px';
        } else {
            this.querySelector('.summary-arrow').textContent = '▶️';
            contentDiv.style.maxHeight = '0px';
        }
        // Remove focus after click to prevent highlight from lingering
        this.blur();
    });
    postDiv.querySelector('.rss-post-summary').addEventListener('keypress', function (e) {
        // Keyboard accessibility: Enter or Space toggles
        if (e.key === "Enter" || e.key === " ") {
            this.click();
        }
    });
    return postDiv;
}

// Fetch and render the feed
async function loadBlogFeed() {
    const wrapper = document.getElementById('blog-wrapper');
    if (!wrapper) return;
    let container = document.getElementById('blog-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'blog-container';
        wrapper.appendChild(container);
    }
    container.innerHTML = '';

    const response = await fetch('https://kittycrypto.ddns.net:6819/rss/kittycrypto');
    const xmlText = await response.text();
    const posts = parseRSS(xmlText);
    posts.forEach(post => container.appendChild(renderPost(post)));
}

window.addEventListener('DOMContentLoaded', loadBlogFeed);