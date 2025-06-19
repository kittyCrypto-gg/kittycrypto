async function loadBlogFeed() {
    const container = document.getElementById('blog-container');
    if (!container) return;

    // Fetch the RSS XML
    const response = await fetch('https://kittycrypto.ddns.net:6819/rss/kittycrypto');
    const xmlText = await response.text();

    // Parse the XML
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'application/xml');

    // Find all items
    const items = xml.querySelectorAll('item');

    items.forEach(item => {
        const title = item.querySelector('title')?.textContent.trim() || '';
        const description = item.querySelector('description')?.textContent.trim() || '';
        const contentEncoded = item.querySelector('content\\:encoded')?.textContent.trim() || '';
        const pubDate = item.querySelector('pubDate')?.textContent.trim() || '';
        const guid = item.querySelector('guid')?.textContent.trim() || '';
        const slug = guid.split('#')[1] || guid.split('/').pop() || Math.random().toString(36).slice(2);

        // Create post div
        const postDiv = document.createElement('div');
        postDiv.className = 'blog-post';
        postDiv.id = `post-${slug}`;

        // Format date nicely
        let formattedDate = '';
        if (pubDate) {
            const d = new Date(pubDate);
            formattedDate = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        }

        // Build HTML content
        postDiv.innerHTML = `
            <h2 class="blog-title">${title}</h2>
            <div class="blog-meta">${formattedDate}</div>
            <div class="blog-summary">${description}</div>
            <div class="blog-content">${contentEncoded}</div>
        `;
        container.appendChild(postDiv);
    });
}

// Call on page load
window.addEventListener('DOMContentLoaded', loadBlogFeed);