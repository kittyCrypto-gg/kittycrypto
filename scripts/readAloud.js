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

// Read aloud state (fully independent of visual reading state!)
window.readAloudState = {
    paused: true,
    currentParagraphIndex: 0,
    currentParagraphId: null,
    paragraphs: [],
    synthesizer: null,
    lastSpokenText: '',
    voiceName: ENGLISH_VOICES[0].name,
    speechKey: '',
    serviceRegion: ''
};

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

    // Always use the DOM for paragraph splits; state is managed internally
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

    // Save read state
    window.readAloudState.paused = false;
    window.readAloudState.currentParagraphIndex = startIdx;
    window.readAloudState.currentParagraphId = paragraphs[startIdx] ? paragraphs[startIdx].id : null;
    window.readAloudState.paragraphs = paragraphs;
    window.readAloudState.voiceName = voiceName;
    window.readAloudState.speechKey = speechKey;
    window.readAloudState.serviceRegion = serviceRegion;

    speakParagraph(startIdx);
}

// Speak a single paragraph by index
function speakParagraph(idx) {
    const state = window.readAloudState;
    if (state.paused || idx >= state.paragraphs.length) return;

    const paragraph = state.paragraphs[idx];
    const plainText = paragraph.innerText.replace(/\s+/g, ' ').trim();
    if (!plainText) {
        speakParagraph(idx + 1);
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

// Pause read aloud and store current position
function pauseReadAloud() {
    const state = window.readAloudState;
    state.paused = true;
    if (state.synthesizer) {
        state.synthesizer.stopSpeakingAsync(() => {
            state.synthesizer.close();
            state.synthesizer = null;
        });
    }
    // Store *audio* position only for resuming read aloud (not for visual bookmark)
    localStorage.setItem('readAloudAudioPosition', JSON.stringify({
        paragraphId: state.currentParagraphId,
        paragraphIndex: state.currentParagraphIndex
    }));
}

// Resume read aloud from the last spoken paragraph
function resumeReadAloud() {
    const state = window.readAloudState;
    state.paused = false;
    const idx = state.currentParagraphIndex || 0;
    speakParagraph(idx);
}

// Clear read aloud state and stop audio
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

// Save preferred voice to localStorage
function savePreferredVoice(voiceName) {
    localStorage.setItem('readAloudPreferredVoice', voiceName);
}

// Save API key
function saveApiKey(apiKey) {
    localStorage.setItem('readAloudSpeechApiKey', apiKey);
}

// Save service region
function saveRegion(region) {
    localStorage.setItem('readAloudSpeechRegion', region);
}