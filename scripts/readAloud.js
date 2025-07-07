const buttons = {
    play: { icon: "▶️", action: "Start Read Aloud" },
    pause: { icon: "⏸️", action: "Pause Read Aloud" },
    stop: { icon: "⏹️", action: "Stop Read Aloud" },
    info: { icon: "ℹ️", action: "Show Info" },
    close: { icon: "❎", action: "Close Read Aloud Menu" },
    help: { icon: "❇️", action: "Help" }
};

const ENGLISH_VOICES = [
    { name: "en-US-JennyNeural", locale: "en-US", description: "American English (US), Female, Jenny (default)" },
    { name: "en-US-AriaNeural", locale: "en-US", description: "American English (US), Female, Aria" },
    { name: "en-GB-SoniaNeural", locale: "en-GB", description: "British English (UK), Female, Sonia" },
    { name: "en-GB-LibbyNeural", locale: "en-GB", description: "British English (UK), Female, Libby" },
    { name: "en-AU-NatashaNeural", locale: "en-AU", description: "Australian English (AU), Female, Natasha" },
    { name: "en-CA-ClaraNeural", locale: "en-CA", description: "Canadian English (CA), Female, Clara" },
    { name: "en-IN-NeerjaNeural", locale: "en-IN", description: "Indian English (IN), Female, Neerja" },
    { name: "en-NZ-MollyNeural", locale: "en-NZ", description: "New Zealand English (NZ), Female, Molly" },
    { name: "en-IE-EmilyNeural", locale: "en-IE", description: "Irish English (IE), Female, Emily" },
    { name: "en-ZA-LeahNeural", locale: "en-ZA", description: "South African English (ZA), Female, Leah" }
];

const AZURE_REGIONS = [
    "eastus", "eastus2", "southcentralus", "westus2", "westus3",
    "australiaeast", "southeastasia", "northeurope", "swedencentral",
    "uksouth", "westeurope", "centralus", "northcentralus",
    "westus", "southafricanorth", "centralindia", "eastasia",
    "japaneast", "japanwest", "koreacentral", "canadacentral",
    "francecentral", "germanywestcentral", "norwayeast", "switzerlandnorth",
    "uaenorth", "brazilsouth"
];

const readAloudMenuHTML = `
    <div class="read-aloud-header">
        Read Aloud
    </div>
    <div class="read-aloud-controls">
        <input id="read-aloud-apikey" type="text" placeholder="Azure Speech API Key" style="width: 170px; margin-right: 4px;" />
        <select id="read-aloud-region" style="margin-right: 4px;">
        ${AZURE_REGIONS.map(region => `<option value="${region}">${region}</option>`).join('')}
        </select>
        <select id="read-aloud-voice" style="margin-right: 4px;">
        ${ENGLISH_VOICES.map(v => `<option value="${v.name}">${v.description}</option>`).join('')}
        </select>
        <button id="read-aloud-toggle-playpause">${buttons.play.icon}</button>
        <button id="read-aloud-stop">${buttons.stop.icon}</button>
        <button id="read-aloud-info" title="Info">${buttons.info.icon}</button>
        <button id="read-aloud-help" title="Help">${buttons.help.icon}</button>
        <button id="read-aloud-hide" title="Hide Menu">${buttons.close.icon}</button>
    </div>
    <span id="read-aloud-status"></span>
`;


const helpModal = `
    <div class="modal-header">
        <h2>Azure Speech Service Read Aloud Help</h2>
        </div>
        <div class="modal-content">
        <ul>
            <li>To use this feature, you need an Azure Speech API key and region.</li>
            <li>Get your API key <a href="https://portal.azure.com/" target="_blank" rel="noopener">here</a>.</li>
            <li>Paste your API key in the field.</li>
            <li>Select your region and preferred voice.</li>
            <li>Use the play button to start.</li>
        </ul>
        <p>
            For further help, see the 
            <a href="https://learn.microsoft.com/en-gb/azure/ai-services/speech-service/" target="_blank" rel="noopener">official docs</a>.
        </p>
        <p class="modal-note">
            <b>Note:</b> KittyCrypto.gg will <u>NOT</u> store your API key or region server-side. It is saved only in your browser's local storage.<br>
            See the full implementation on 
            <a href="https://github.com/kittyCrypto-gg/kittycrypto/blob/main/scripts/readAloud.js" target="_blank" rel="noopener">GitHub</a>.
        </p>
        <p class="modal-note">
            <b>Note:</b> Click anywhere outside this modal to close it.<br>
            You can also press <kbd>Esc</kbd> to close it.
        </p>
        </div>
`;

window.readAloudState = {
    paused: true,
    pressed: false,
    currentParagraphIndex: 0,
    currentParagraphId: null,
    paragraphs: [],
    synthesizer: null,
    lastSpokenText: '',
    voiceName: ENGLISH_VOICES[0].name,
    speechKey: '',
    serviceRegion: ''
};

export function showReadAloudMenu() {
    //console.log('[DEBUG] Read Aloud menu button pressed');
    window.readAloudState.pressed = true;

    const menu = document.getElementById('read-aloud-menu');
    if (!menu) {
        console.error('Read Aloud menu element not found in DOM');
        return;
    }
    //console.log('[DEBUG] Read Aloud menu found:', menu);

    // If already visible, do nothing
    if (menu.style.display === 'flex') return;
    //console.log('[DEBUG] Showing Read Aloud menu');

    // Populate the menu
    menu.innerHTML = readAloudMenuHTML;
    menu.style.display = 'flex';
    //console.log('[DEBUG] Read Aloud menu populated');

    const apikeyInput = document.getElementById('read-aloud-apikey');
    const regionDropdown = document.getElementById('read-aloud-region');
    const voiceDropdown = document.getElementById('read-aloud-voice');
    const playPauseBtn = document.getElementById('read-aloud-toggle-playpause');
    const stopBtn = document.getElementById('read-aloud-stop');
    const infoBtn = document.getElementById('read-aloud-info');
    const helpBtn = document.getElementById('read-aloud-help');
    const statusSpan = document.getElementById('read-aloud-status');
    const hideBtn = document.getElementById('read-aloud-hide');

    if (!playPauseBtn || !stopBtn || !statusSpan || !hideBtn || !apikeyInput || !regionDropdown || !voiceDropdown || !infoBtn || !helpBtn) {
        console.error('Read Aloud menu elements not found');
        return;
    }
    //console.log('[DEBUG] Read Aloud menu elements found:', {
    //    playPauseBtn, stopBtn, statusSpan, hideBtn, apikeyInput, regionDropdown, voiceDropdown, infoBtn, helpBtn
    //});

    // Restore from localStorage etc.
    apikeyInput.value = localStorage.getItem('readAloudSpeechApiKey') || '';
    regionDropdown.value = localStorage.getItem('readAloudSpeechRegion') || AZURE_REGIONS[0];
    voiceDropdown.value = localStorage.getItem('readAloudPreferredVoice') || ENGLISH_VOICES[0].name;

    apikeyInput.addEventListener('input', e => saveApiKey(e.target.value.trim()));
    regionDropdown.addEventListener('change', e => saveRegion(e.target.value));
    voiceDropdown.addEventListener('change', e => savePreferredVoice(e.target.value));

    playPauseBtn.addEventListener('click', () => {
        const state = window.readAloudState;
        if (!state.paused) {
            playPauseBtn.textContent = buttons.play.icon;
            statusSpan.textContent = 'Paused';
            pauseReadAloud();
            return;
        }
        playPauseBtn.textContent = buttons.pause.icon;
        statusSpan.textContent = 'Reading...';
        state.speechKey = apikeyInput.value.trim();
        state.serviceRegion = regionDropdown.value;
        state.voiceName = voiceDropdown.value;
        if (!state.paragraphs.length) {
            readAloud(state.speechKey, state.serviceRegion, state.voiceName);
            return;
        }
        resumeReadAloud();
    });

    stopBtn.addEventListener('click', () => {
        playPauseBtn.textContent = buttons.play.icon;
        statusSpan.textContent = '';
        clearReadAloud();
    });

    hideBtn.addEventListener('click', () => {
        clearReadAloud();
        menu.style.display = 'none';
        playPauseBtn.textContent = buttons.play.icon;
        statusSpan.textContent = '';
        window.readAloudState.pressed = false;
    });

    infoBtn.addEventListener('click', () => {
        const info = Object.entries(buttons)
            .map(([key, val]) => `${val.icon} — ${val.action}`)
            .join('\n');
        window.alert(`Read Aloud Menu Buttons:\n\n${info}`);
    });

    helpBtn.addEventListener('click', () => {
        openCustomModal(helpModal, "readaloud-help-modal");
    });

    initReadAloudMenuDrag();
    if (typeof menu._resetMenuPosition === 'function') {
        menu._resetMenuPosition();
    }
}


// Initialise the Speech SDK
function readAloud(speechKey, serviceRegion, voiceName = ENGLISH_VOICES[0].name, tag = 'article', id = 'reader', className = 'reader-container', startFromId = null) {
    let selector = tag;
    if (id) selector += `#${id}`;
    if (className) selector += `.${className}`;
    const container = document.querySelector(selector);
    if (!container) {
        console.error(`Element not found: ${selector}`);
        return;
    }

    const paragraphs = Array.from(container.querySelectorAll('.reader-bookmark'));
    if (!paragraphs.length) {
        console.error('No paragraphs found for read aloud.');
        return;
    }

    let startIdx = 0;
    if (startFromId) {
        const idx = paragraphs.findIndex(p => p.id === startFromId);
        if (idx >= 0) startIdx = idx;
    }

    window.readAloudState.paused = false;
    window.readAloudState.currentParagraphIndex = startIdx;
    window.readAloudState.currentParagraphId = paragraphs[startIdx] ? paragraphs[startIdx].id : null;
    window.readAloudState.paragraphs = paragraphs;
    window.readAloudState.voiceName = voiceName;
    window.readAloudState.speechKey = speechKey;
    window.readAloudState.serviceRegion = serviceRegion;

    speakParagraph(startIdx);
}

function speakParagraph(idx) {
    const state = window.readAloudState;
    if (state.paused || idx >= state.paragraphs.length) return;

    const paragraph = state.paragraphs[idx];
    const plainText = paragraph.innerText.replace(/\s+/g, ' ').trim();
    if (!plainText) {
        speakParagraph(idx + 1);
        return;
    }

    if (!state.speechKey || !state.serviceRegion) {
        window.alert('Please enter your Azure Speech API key and region in the Read Aloud menu.');
        return;
    }

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(state.speechKey, state.serviceRegion);
    speechConfig.speechSynthesisVoiceName = state.voiceName;
    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig);

    state.synthesizer = synthesizer;
    state.currentParagraphIndex = idx;
    state.currentParagraphId = paragraph.id;
    state.lastSpokenText = plainText;

    synthesizer.speakTextAsync(
        plainText,
        result => {
            synthesizer.close();
            state.synthesizer = null;
            if (!state.paused) speakParagraph(idx + 1);
        },
        error => {
            synthesizer.close();
            state.synthesizer = null;
            console.error(error);
            if (!state.paused) speakParagraph(idx + 1);
        }
    );
}

function pauseReadAloud() {
    const state = window.readAloudState;
    state.paused = true;
    if (state.synthesizer) {
        state.synthesizer.stopSpeakingAsync(() => {
            state.synthesizer.close();
            state.synthesizer = null;
        });
    }
    localStorage.setItem('readAloudAudioPosition', JSON.stringify({
        paragraphId: state.currentParagraphId,
        paragraphIndex: state.currentParagraphIndex
    }));
}

function resumeReadAloud() {
    const state = window.readAloudState;
    state.paused = false;
    const idx = state.currentParagraphIndex || 0;
    speakParagraph(idx);
}

function clearReadAloud() {
    const state = window.readAloudState;
    state.currentParagraphIndex = 0;
    state.currentParagraphId = state.paragraphs[0] ? state.paragraphs[0].id : null;
    state.paused = true;
    if (state.synthesizer) {
        state.synthesizer.stopSpeakingAsync(() => {
            state.synthesizer.close();
            state.synthesizer = null;
        });
    }
    localStorage.removeItem('readAloudAudioPosition');
}

function savePreferredVoice(voiceName) {
    localStorage.setItem('readAloudPreferredVoice', voiceName);
}
function saveApiKey(apiKey) {
    localStorage.setItem('readAloudSpeechApiKey', apiKey);
}
function saveRegion(region) {
    localStorage.setItem('readAloudSpeechRegion', region);
}

function initReadAloudMenuDrag() {
    const menu = document.getElementById('read-aloud-menu');
    if (!menu) return;

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    const getMainMenuBottom = () => {
        const nav = document.getElementById('main-menu');
        if (!nav) return 0;
        const rect = nav.getBoundingClientRect();
        return rect.bottom + window.scrollY;
    };

    const dragHandle = menu.querySelector('.read-aloud-header') || menu;

    dragHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        menu.classList.add('dragging');
        offsetX = e.clientX - menu.offsetLeft;
        offsetY = e.clientY - menu.offsetTop;
        e.preventDefault();
    });

    const onMouseMove = (e) => {
        if (!isDragging) return;
        let newLeft = e.clientX - offsetX;
        let newTop = e.clientY - offsetY;
        menu.style.left = `${newLeft}px`;
        menu.style.top = `${newTop}px`;
    };

    const onMouseUp = () => {
        if (isDragging) {
            menu.classList.remove('dragging');
            isDragging = false;
        }
    };

    // Snap menu just below nav when shown or on resize
    const resetMenuPosition = () => {
        const minTop = getMainMenuBottom();
        menu.style.left = '0px';
        menu.style.top = `${minTop}px`;
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    window.addEventListener('resize', () => {
        if (menu.style.display !== 'none') {
            // Reset to (0, minTop) on resize for simplicity
            resetMenuPosition();
        }
    });

    menu._resetMenuPosition = resetMenuPosition;
}

function openCustomModal(html, modalId = "readaloud-help-modal") {
    // Only one modal at a time
    if (document.getElementById(modalId)) return;

    // Create overlay
    const overlay = document.createElement("div");
    overlay.id = "modal-overlay";

    // Create modal container
    const modal = document.createElement("div");
    modal.id = modalId;
    modal.className = "modal";

    // Disable scrolling while modal is open
    document.body.classList.add("no-scroll");

    modal.innerHTML = html;

    // Append modal and overlay
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close modal when clicking outside
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closeCustomModal(modalId);
        window.closeCustomModal = closeCustomModal;
    });

    // Close modal on Escape key
    document.addEventListener("keydown", function handleEscape(event) {
        if (event.key === "Escape") {
            closeCustomModal(modalId);
            document.removeEventListener("keydown", handleEscape);
        }
    });
}

function closeCustomModal(modalId = "readaloud-help-modal") {
    const overlay = document.getElementById("modal-overlay");
    if (overlay) overlay.remove();
    document.body.classList.remove("no-scroll");
}