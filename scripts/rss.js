async function loadBlogFeed() {
    const wrapper = document.getElementById('blog-wrapper');
    let container = document.getElementById('blog-container');
    if (!wrapper) return;
    if (!container) {
        container = document.createElement('div');
        container.id = 'blog-container';
        wrapper.appendChild(container);
    }
    container.innerHTML = '';

    // Fetch the RSS XML
    const response = await fetch('https://kittycrypto.ddns.net:6819/rss/kittycrypto');
    const xmlText = await response.text();

    // Parse the XML
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'application/xml');
    const items = xml.querySelectorAll('item');

    items.forEach((item, idx) => {
        const title = item.querySelector('title')?.textContent.trim() || '';
        const description = item.querySelector('description')?.textContent.trim() || '';
        const contentEncoded = item.querySelector('content\\:encoded')?.textContent.trim() || '';
        const pubDate = item.querySelector('pubDate')?.textContent.trim() || '';
        const author = item.querySelector('author')?.textContent.trim() || 'Kitty';
        const guid = item.querySelector('guid')?.textContent.trim() || '';
        const slug = guid.split('#')[1] || guid.split('/').pop() || Math.random().toString(36).slice(2);

        // Format date beside title, lighter colour
        let formattedDate = '';
        if (pubDate) {
            const d = new Date(pubDate);
            formattedDate = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        }

        // Build post
        const postDiv = document.createElement('div');
        postDiv.className = 'rss-post-block';
        postDiv.id = `post-${slug}`;
        // For alternate backgrounds
        postDiv.style.marginBottom = '22px';

        // Create title and date row
        const titleRow = document.createElement('div');
        titleRow.style.display = 'flex';
        titleRow.style.alignItems = 'center';
        titleRow.style.gap = '16px';

        const h2 = document.createElement('h2');
        h2.className = 'rss-post-title';
        h2.textContent = title;
        h2.style.marginBottom = '0';

        const dateSpan = document.createElement('span');
        dateSpan.className = 'rss-post-date';
        dateSpan.textContent = formattedDate;
        dateSpan.style.fontSize = '0.98em';
        dateSpan.style.fontWeight = '400';
        dateSpan.style.opacity = '0.65';
        dateSpan.style.marginLeft = '10px';

        titleRow.appendChild(h2);
        titleRow.appendChild(dateSpan);

        // Meta: author (if any)
        const metaDiv = document.createElement('div');
        metaDiv.className = 'rss-post-meta';
        metaDiv.innerHTML = `<span class="rss-post-author">${author}</span>`;
        // Add more meta as needed

        // Summary (optional)
        let summaryHtml = '';
        if (description && description !== contentEncoded) {
            summaryHtml = `<div class="rss-post-summary">${description}</div>`;
        }

        // Main content (full post)
        const contentDiv = document.createElement('div');
        contentDiv.className = 'rss-post-content';
        contentDiv.innerHTML = contentEncoded; // This is already HTML

        // Compose post
        postDiv.appendChild(titleRow);
        postDiv.appendChild(metaDiv);
        if (summaryHtml) postDiv.innerHTML += summaryHtml;
        postDiv.appendChild(contentDiv);

        container.appendChild(postDiv);
    });
}

window.addEventListener('DOMContentLoaded', loadBlogFeed);
