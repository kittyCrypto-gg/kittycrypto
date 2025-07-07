const buttons = {
    play: { icon: "▶️", action: "Start Read Aloud" },
    pause: { icon: "⏸️", action: "Pause Read Aloud" },
    stop: { icon: "⏹️", action: "Stop Read Aloud" },
    next: { icon: "⏩", action: "Next Paragraph" },
    prev: { icon: "⏪", action: "Previous Paragraph" },
    restart: { icon: "⏮️", action: "Restart" },
    info: { icon: "ℹ️", action: "Show Info" },
    help: { icon: "❓", action: "Help" }
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
        <input id="read-aloud-apikey" type="password" placeholder="Azure Speech API Key" style="width: 170px; margin-right: 4px;" />
        <select id="read-aloud-region" style="margin-right: 4px;">
            ${AZURE_REGIONS.map(region => `<option value="${region}">${region}</option>`).join('')}
        </select>
        <select id="read-aloud-voice" style="margin-right: 4px;">
            ${ENGLISH_VOICES.map(v => `<option value="${v.name}">${v.description}</option>`).join('')}
        </select>
        <select id="read-aloud-rate" style="margin-right: 4px;">
            ${[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => `<option value="${rate}">${rate}x</option>`).join('')}
        </select>
        <button id="read-aloud-toggle-playpause">${buttons.play.icon}</button>
        <button id="read-aloud-stop">${buttons.stop.icon}</button>
        <button id="read-aloud-prev">${buttons.prev.icon}</button>
        <button id="read-aloud-next">${buttons.next.icon}</button>
        <button id="read-aloud-restart">${buttons.restart.icon}</button>
        <button id="read-aloud-info" title="Info">${buttons.info.icon}</button>
        <button id="read-aloud-help" title="Help">${buttons.help.icon}</button>
    </div>
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
    serviceRegion: '',
    speechRate: 1.0
};

function buildSSML(text, voiceName, rate) {
    // Map UI rates to Azure SSML prosody rates
    const rateMap = {
        0.5: '-50%',
        0.75: '-25%',
        1: '0%',
        1.25: '25%',
        1.5: '50%',
        1.75: '75%',
        2: '100%',
    };
    const prosodyRate = rateMap[rate] || '95%';
    return `
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
            xmlns:mstts="http://www.w3.org/2001/mstts"
            xml:lang="en-US">
            <voice name="${voiceName}">
                <prosody rate="${prosodyRate}">
                ${escapeXml(text)}
                </prosody>
            </voice>
        </speak>
    `;
}

function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, c => ({
        '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
    }[c]));
}


export function showReadAloudMenu() {
    //console.log('[DEBUG] Read Aloud menu button pressed');
    window.readAloudState.pressed = true;

    //change icon to data-disable (<button id="read-aloud-toggle" class="theme-toggle-button" data-enable="🔊" data-disable="🔇" title="Read Aloud" style="bottom: 140px;">🔊</button>)
    const toggleBtn = document.getElementById('read-aloud-toggle');
    if (toggleBtn) {
        toggleBtn.textContent = toggleBtn.getAttribute('data-disable');
        toggleBtn.classList.add('active');
        toggleBtn.removeEventListener('click', showReadAloudMenu);
        toggleBtn.addEventListener('click', closeReadAloudMenu);
    }

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
    const rateDropdown = document.getElementById('read-aloud-rate');
    const playPauseBtn = document.getElementById('read-aloud-toggle-playpause');
    const stopBtn = document.getElementById('read-aloud-stop');
    const prevBtn = document.getElementById('read-aloud-prev');
    const nextBtn = document.getElementById('read-aloud-next');
    const restartBtn = document.getElementById('read-aloud-restart');
    const infoBtn = document.getElementById('read-aloud-info');
    const helpBtn = document.getElementById('read-aloud-help');

    if (!playPauseBtn || !stopBtn || !prevBtn || !nextBtn || !restartBtn || !apikeyInput || !regionDropdown || !voiceDropdown || !rateDropdown || !infoBtn || !helpBtn) {
        console.error('Read Aloud menu elements not found');
        return;
    }
    //console.log('[DEBUG] Read Aloud menu elements found:', {
    //    playPauseBtn, stopBtn, apikeyInput, regionDropdown, voiceDropdown, infoBtn, helpBtn
    //});

    // Restore from localStorage etc.
    apikeyInput.value = localStorage.getItem('readAloudSpeechApiKey') || '';
    regionDropdown.value = localStorage.getItem('readAloudSpeechRegion') || AZURE_REGIONS[0];
    voiceDropdown.value = localStorage.getItem('readAloudPreferredVoice') || ENGLISH_VOICES[0].name;
    rateDropdown.value = getSpeechRate().toString();

    apikeyInput.addEventListener('input', e => saveApiKey(e.target.value.trim()));
    regionDropdown.addEventListener('change', e => saveRegion(e.target.value));
    voiceDropdown.addEventListener('change', e => savePreferredVoice(e.target.value));

    playPauseBtn.addEventListener('click', async () => {
        const state = window.readAloudState;
        if (!state.paused) {
            playPauseBtn.textContent = buttons.play.icon;
            await pauseReadAloud()
            return;
        }
        playPauseBtn.textContent = buttons.pause.icon;
        state.speechKey = apikeyInput.value.trim();
        state.serviceRegion = regionDropdown.value;
        state.voiceName = voiceDropdown.value;
        if (!state.paragraphs.length) {
            await readAloud(state.speechKey, state.serviceRegion, state.voiceName);
            return;
        }
        await resumeReadAloud();
    });

    stopBtn.addEventListener('click', async () => {
        playPauseBtn.textContent = buttons.play.icon;
        await clearReadAloud();
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

    prevBtn.addEventListener('click', async () => {
        await prevParagraph();
    });

    nextBtn.addEventListener('click', async () => {
        await nextParagraph();
    });

    restartBtn.addEventListener('click', async () => {
        await restartReadAloudFromBeginning();
    });

    rateDropdown.addEventListener('change', e => {
        const rate = parseFloat(e.target.value);
        window.readAloudState.speechRate = rate;
        saveSpeechRate(rate);
    });

    window.readAloudState.speechRate = getSpeechRate();

    initReadAloudMenuDrag();
    if (typeof menu._resetMenuPosition === 'function') {
        menu._resetMenuPosition();
    }
}

async function restartReadAloudFromBeginning() {
    const state = window.readAloudState;
    state.paused = true;
    if (state.currentAudio) {
        state.currentAudio.pause();
        state.currentAudio.currentTime = 0;
        state.currentAudio = null;
    }
    await stopSpeakingAsync();

    if (!state.paragraphs.length) return; // extra guard

    state.currentParagraphIndex = 0;
    state.currentParagraphId = state.paragraphs[0] ? state.paragraphs[0].id : null;
    state.paused = false;
    await speakParagraph(0);
}


async function closeReadAloudMenu() {
    const menu = document.getElementById('read-aloud-menu');
    if (!menu) return;
    //change icon to data-disable (<button id="read-aloud-toggle" class="theme-toggle-button" data-enable="🔊" data-disable="🔇" title="Read Aloud" style="bottom: 140px;">🔊</button>)
    const toggleBtn = document.getElementById('read-aloud-toggle');
    if (toggleBtn) {
        toggleBtn.textContent = toggleBtn.getAttribute('data-enable');
        toggleBtn.classList.remove('active');
        toggleBtn.removeEventListener('click', closeReadAloudMenu);
        toggleBtn.addEventListener('click', showReadAloudMenu);
    }

    menu.style.display = 'none';
    const playPauseBtn = document.getElementById('read-aloud-toggle-playpause');
    if (playPauseBtn) playPauseBtn.textContent = buttons.play.icon;
    window.readAloudState.pressed = false;
    await clearReadAloud()
}

// Initialise the Speech SDK
async function readAloud(speechKey, serviceRegion, voiceName = ENGLISH_VOICES[0].name, tag = 'article', id = 'reader', className = 'reader-container', startFromId = null) {
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

    await speakParagraph(startIdx);
}

async function speakParagraph(idx) {
    const now = new Date();
    //console.log('speakParagraph called for idx:', idx, ' at ', now.toLocaleTimeString());
    const state = window.readAloudState;
    if (state.paused || idx >= state.paragraphs.length) return;

    if (state.currentParagraphIndex !== undefined && state.paragraphs[state.currentParagraphIndex]) {
        fadeOutHighlight(state.paragraphs[state.currentParagraphIndex]);
    }

    const paragraph = state.paragraphs[idx];
    highlightParagraph(paragraph);
    scrollParagraphIntoView(paragraph);
    const plainText = paragraph.innerText.replace(/\s+/g, ' ').trim();
    if (!plainText) {
        await speakParagraph(idx + 1);
        return;
    }

    if (!state.speechKey || !state.serviceRegion) {
        window.alert('Please enter your Azure Speech API key and region in the Read Aloud menu.');
        return;
    }

    if (typeof SpeechSDK === 'undefined') {
        window.alert('Speech SDK is not loaded. Please check your connection or script includes.');
        return;
    }

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(state.speechKey, state.serviceRegion);
    speechConfig.speechSynthesisVoiceName = state.voiceName;
    speechConfig.setProperty(
        SpeechSDK.PropertyId.SpeechSynthesisOutputFormat,
        SpeechSDK.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3
    );
    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, null);

    state.synthesizer = synthesizer;
    state.currentParagraphIndex = idx;
    state.currentParagraphId = paragraph.id;
    state.lastSpokenText = plainText;

    try {
        const audioData = await new Promise((resolve, reject) => {

            const ssml = buildSSML(plainText, state.voiceName, state.speechRate);
            synthesizer.speakSsmlAsync(
                ssml,
                result => {
                    if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
                        resolve(result.audioData);
                    } else {
                        reject(new Error(result.errorDetails || "Speech synthesis failed"));
                    }
                },
                error => {
                    reject(error);
                }
            );
        });

        // Play audio and await its completion
        await playAudioBlob(audioData);

        synthesizer.close();
        state.synthesizer = null;
        if (!state.paused) {
            await speakParagraph(idx + 1);
        }
    } catch (error) {
        synthesizer.close();
        state.synthesizer = null;
        console.error(error);
        if (!state.paused) {
            await speakParagraph(idx + 1);
        }
    }
}

async function playAudioBlob(audioData) {
    return new Promise((resolve, reject) => {
        const audioBlob = new Blob([audioData], { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        // Save the audio reference to state
        window.readAloudState.currentAudio = audio;

        audio.onended = () => {
            window.readAloudState.currentAudio = null;
            resolve();
        };
        audio.onerror = e => {
            window.readAloudState.currentAudio = null;
            reject(e);
        };
        audio.play();
    });
}

async function pauseReadAloud() {
    const state = window.readAloudState;
    state.paused = true;
    if (state.currentAudio) state.currentAudio.pause();
    fadeOutHighlight(state.paragraphs[state.currentParagraphIndex]);

    await stopSpeakingAsync();
    localStorage.setItem('readAloudAudioPosition', JSON.stringify({
        paragraphId: state.currentParagraphId,
        paragraphIndex: state.currentParagraphIndex
    }));
}

async function resumeReadAloud() {
    const state = window.readAloudState;
    state.paused = false;
    const idx = state.currentParagraphIndex || 0;
    await speakParagraph(idx);
}

async function clearReadAloud() {
    const state = window.readAloudState;
    fadeOutHighlight(state.paragraphs[state.currentParagraphIndex]);
    state.currentParagraphIndex = 0;
    state.currentParagraphId = state.paragraphs[0] ? state.paragraphs[0].id : null;
    state.paused = true;
    if (state.currentAudio) {
        state.currentAudio.pause();
        state.currentAudio.currentTime = 0;
        state.currentAudio = null;
    }
    await stopSpeakingAsync();
    localStorage.removeItem('readAloudAudioPosition');
}

async function stopSpeakingAsync() {
    const state = window.readAloudState;
    if (state.synthesizer && typeof state.synthesizer.stopSpeakingAsync === "function") {
        return new Promise(resolve => {
            state.synthesizer.stopSpeakingAsync(() => {
                state.synthesizer.close();
                state.synthesizer = null;
                resolve();
            });
        });
    } else if (state.synthesizer && typeof state.synthesizer.close === "function") {
        state.synthesizer.close();
        state.synthesizer = null;
    }
    return Promise.resolve();
}

function highlightParagraph(paragraph) {
    // Remove from all
    window.readAloudState.paragraphs.forEach(p => {
        p.classList.remove('read-aloud-active', 'read-aloud-fadeout');
    });
    // Add to current
    if (paragraph) {
        paragraph.classList.add('read-aloud-active');
        paragraph.classList.remove('read-aloud-fadeout');
    }
}

function fadeOutHighlight(paragraph) {
    if (paragraph) {
        paragraph.classList.add('read-aloud-fadeout');
        setTimeout(() => {
            paragraph.classList.remove('read-aloud-active', 'read-aloud-fadeout');
        }, 600);
    }
}

function scrollParagraphIntoView(paragraph) {
    if (!paragraph) return;
    paragraph.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });
}

async function nextParagraph() {
    const state = window.readAloudState;
    if (!state.paragraphs.length) return;

    // Fade out old paragraph (if any)
    fadeOutHighlight(state.paragraphs[state.currentParagraphIndex]);

    if (state.currentAudio) {
        state.currentAudio.pause();
        state.currentAudio.currentTime = 0;
        state.currentAudio = null;
    }
    await stopSpeakingAsync();
    state.paused = true;

    let idx = state.currentParagraphIndex;
    if (idx < state.paragraphs.length - 1) idx++;
    else idx = 0;

    state.currentParagraphIndex = idx;
    state.currentParagraphId = state.paragraphs[idx].id;

    highlightParagraph(state.paragraphs[idx]);
    scrollParagraphIntoView(state.paragraphs[idx]);

    state.paused = false;
    await speakParagraph(idx);
}

async function prevParagraph() {
    const state = window.readAloudState;
    if (!state.paragraphs.length) return;

    // Fade out old paragraph (if any)
    fadeOutHighlight(state.paragraphs[state.currentParagraphIndex]);

    // Stop audio and synthesiser
    if (state.currentAudio) {
        state.currentAudio.pause();
        state.currentAudio.currentTime = 0;
        state.currentAudio = null;
    }
    await stopSpeakingAsync();
    state.paused = true;

    // Move to previous index (wrap to end if at zero)
    let idx = state.currentParagraphIndex;
    if (idx > 0) idx--;
    else idx = state.paragraphs.length - 1;

    // Update state
    state.currentParagraphIndex = idx;
    state.currentParagraphId = state.paragraphs[idx].id;

    // Highlight the new paragraph immediately (while old is fading out)
    highlightParagraph(state.paragraphs[idx]);
    scrollParagraphIntoView(state.paragraphs[idx]);

    state.paused = false;
    await speakParagraph(idx);
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

function saveSpeechRate(rate) {
    localStorage.setItem('readAloudSpeechRate', rate);
}
function getSpeechRate() {
    return parseFloat(localStorage.getItem('readAloudSpeechRate')) || 1.0;
}

function initReadAloudMenuDrag() {
  const menu = document.getElementById('read-aloud-menu');
  if (!menu || menu._dragListenersAdded) return;

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  const dragHandle = menu.querySelector('.read-aloud-header') || menu;

  const getClientPos = e => {
    if (e.touches && e.touches.length) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
      return { x: e.clientX, y: e.clientY };
    }
  };

  const startDrag = e => {
    const pos = getClientPos(e);
    isDragging = true;
    menu.classList.add('dragging');
    offsetX = pos.x - menu.offsetLeft;
    offsetY = pos.y - menu.offsetTop;
    e.preventDefault();
  };

  const moveDrag = e => {
    if (!isDragging) return;
    const pos = getClientPos(e);
    menu.style.left = `${pos.x - offsetX}px`;
    menu.style.top = `${pos.y - offsetY}px`;
    menu.style.transform = 'none';
    e.preventDefault();
  };

  const endDrag = e => {
    if (isDragging) {
      menu.classList.remove('dragging');
      isDragging = false;
    }
    if (e && e.preventDefault) e.preventDefault();
  };

  // Mouse events
  dragHandle.addEventListener('mousedown', startDrag);
  document.addEventListener('mousemove', moveDrag);
  document.addEventListener('mouseup', endDrag);

  // Touch events
  dragHandle.addEventListener('touchstart', startDrag, { passive: false });
  document.addEventListener('touchmove', moveDrag, { passive: false });
  document.addEventListener('touchend', endDrag, { passive: false });

  menu._dragListenersAdded = true;
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