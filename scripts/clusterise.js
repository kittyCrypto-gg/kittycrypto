export function loadClusterizeJS(callback) {
    if (window.Clusterize) return callback();
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/gh/NeXTs/Clusterize.js@master/clusterize.js";
    script.onload = callback;
    document.head.appendChild(script);
}

function getElement(target) {
    if (target instanceof Element) return target;
    if (typeof target === 'string' && target[0] === '#') return document.getElementById(target.slice(1));
    if (typeof target === 'string' && target[0] === '.') return document.querySelector(target);
    if (typeof target === 'string') return document.getElementById(target) || document.querySelector('.' + target);
    return null;
}

export function prepareClusteriseDOM(target) {
    const container = getElement(target);
    if (!container) return;
    if (container.querySelector('.clusterise-scroll')) return;

    const baseId = container.id || 'clusterise';
    const scrollArea = document.createElement('div');
    scrollArea.className = 'clusterise-scroll';
    scrollArea.id = `${baseId}-scroll-area`;

    const contentArea = document.createElement('div');
    contentArea.className = 'clusterise-content';
    contentArea.id = `${baseId}-content-area`;

    while (container.firstChild) contentArea.appendChild(container.firstChild);
    scrollArea.appendChild(contentArea);
    container.appendChild(scrollArea);
    container.classList.add('clusterise');
}

export function initClusterise(target) {
    if (!window.Clusterize) throw new Error("Clusterize.js not loaded");
    const container = getElement(target);
    if (!container) throw new Error("Target container not found");

    const baseId = container.id || 'clusterise';
    const scrollId = `${baseId}-scroll-area`;
    const contentId = `${baseId}-content-area`;

    return new Clusterize({
        scrollId,
        contentId,
        rows: []
    });
}

export function updtClusterised(target, clusteriseInstance, messageSelector = '.chat-message') {
    const container = getElement(target);
    if (!clusteriseInstance || !container) return;
    const rows = Array.from(container.querySelectorAll(messageSelector)).map(el => el.outerHTML);
    clusteriseInstance.update(rows);
}  