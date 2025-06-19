function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}`;
}

// Creates one post block
function createBlogPost({title, description, content, date, author}, idx) {
  const postDiv = document.createElement('div');
  postDiv.className = 'rss-post-block';
  postDiv.id = `post-${idx}`;

  // Header (title + date)
  const titleRow = document.createElement('div');
  titleRow.className = 'rss-post-header';
  titleRow.innerHTML = `
    <span class="rss-post-title">${title}</span>
    <span class="rss-post-date">${formatDate(date)}</span>
  `;

  // Meta (author)
  const metaDiv = document.createElement('div');
  metaDiv.className = 'rss-post-meta';
  metaDiv.innerHTML = `<span class="rss-post-author">${author}</span>`;

  // Summary (clickable)
  const summaryDiv = document.createElement('div');
  summaryDiv.className = 'rss-post-summary summary-collapsed';
  summaryDiv.setAttribute('tabindex', '0');
  summaryDiv.innerHTML = `
    <span class="summary-arrow">▶️</span>
    <span class="summary-text">${description}</span>
  `;

  // Content (starts collapsed)
  const contentDiv = document.createElement('div');
  contentDiv.className = 'rss-post-content content-collapsed';
  contentDiv.style.overflow = 'hidden';
  contentDiv.style.maxHeight = '0';
  contentDiv.innerHTML = content;

  // Compose
  postDiv.appendChild(titleRow);
  postDiv.appendChild(metaDiv);
  postDiv.appendChild(summaryDiv);
  postDiv.appendChild(contentDiv);

  // Toggle logic
  summaryDiv.addEventListener('click', function () {
    // Toggle expanded/collapsed classes
    const expanded = contentDiv.classList.toggle('content-expanded');
    contentDiv.classList.toggle('content-collapsed', !expanded);
    // Animate
    if (expanded) {
      summaryDiv.querySelector('.summary-arrow').textContent = '🔽';
      contentDiv.style.maxHeight = contentDiv.scrollHeight + 'px';
    } else {
      summaryDiv.querySelector('.summary-arrow').textContent = '▶️';
      contentDiv.style.maxHeight = '0';
    }
  });

  return postDiv;
}

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

  // Parse XML
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'application/xml');
  const items = xml.querySelectorAll('item');

  items.forEach((item, idx) => {
    const title = item.querySelector('title')?.textContent.trim() || '';
    const description = item.querySelector('description')?.textContent.trim() || '';
    const contentEncoded = item.querySelector('content\\:encoded')?.textContent.trim() || '';
    const pubDate = item.querySelector('pubDate')?.textContent.trim() || '';
    const author = item.querySelector('author')?.textContent.trim() || 'Kitty';

    const postDiv = createBlogPost({
      title,
      description,
      content: contentEncoded,
      date: pubDate,
      author,
    }, idx);

    container.appendChild(postDiv);
  });
}

window.addEventListener('DOMContentLoaded', loadBlogFeed);