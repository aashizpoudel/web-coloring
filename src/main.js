import { WelcomeScreen } from './components/WelcomeScreen';
import { CanvasEditor } from './components/CanvasEditor';
import { AudioManager } from './services/audio_manager';
import './style.css';

const app = document.querySelector('#app');
let APP_DATA = { music: [], images: [] }; // Store loaded config

// Persistence Logic
const saveState = (imageSrc, editor) => {
    try {
        const state = {
            imageSrc: imageSrc,
            drawingData: editor.getDrawingData(),
            timestamp: Date.now(),
            audio: {
                track: AudioManager.getCurrentTrack(),
                paused: AudioManager.audio ? AudioManager.audio.paused : true,
                muted: AudioManager.isMuted(),
                volume: AudioManager.getVolume()
            }
        };
        localStorage.setItem('vibe_coloring_state', JSON.stringify(state));
    } catch (e) {
        console.warn('Save failed', e);
    }
};

const loadState = () => {
    try {
        const raw = localStorage.getItem('vibe_coloring_state');
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
};

// Default color palette for coloring pages (black/white images don't extract well)
const DEFAULT_COLOR_PALETTE = [
    '#e63946', // Red
    '#f4a261', // Orange
    '#e9c46a', // Yellow
    '#2a9d8f', // Teal
    '#264653', // Dark Blue
    '#a855f7', // Purple
    '#ec4899', // Pink
    '#22c55e', // Green
];

const renderWelcome = (pages = APP_DATA.images) => {
    app.innerHTML = '';
    app.appendChild(WelcomeScreen(handleSelectImage, pages));
};

// Handle image selection (from gallery or upload)
const handleSelectImage = (imageSrc) => {

    // Loading UI
    app.innerHTML = `
    <div class="h-screen w-full flex flex-col items-center justify-center bg-orange-50 space-y-6">
      <div class="relative w-24 h-24">
        <div class="absolute inset-0 border-4 border-orange-200 rounded-full animate-ping"></div>
        <div class="absolute inset-0 border-4 border-orange-500 rounded-full animate-spin border-t-transparent"></div>
      </div>
      <p class="text-stone-600  text-xl animate-pulse">Loading coloring page...</p>
    </div>
  `;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        console.log('Image loaded successfully');
        renderEditor(imageSrc, DEFAULT_COLOR_PALETTE);
    };
    img.onerror = (err) => {
        console.error('Failed to load image:', err);
        alert('Failed to load image. Please try again.');
        renderWelcome();
    };
    img.src = imageSrc;
};

const renderEditor = (imageSrc, savedDrawingData = null) => {
    app.innerHTML = '';

    const container = document.createElement('div');
    container.className = "h-screen w-full flex flex-col bg-stone-100 overflow-hidden fade-in";

    // Header
    const header = document.createElement('header');
    header.className = "h-14 bg-white shadow-sm flex items-center justify-between px-6 z-10 flex-shrink-0";
    header.innerHTML = `
    <h1 class=" font-bold text-xl text-stone-800">Coloring Book</h1>
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-3 bg-stone-100 rounded-lg px-3 py-1.5">
        <select id="music-selector" class="bg-transparent text-sm text-stone-600 outline-none cursor-pointer pr-1" title="Select Music">
          ${APP_DATA.music.map(track => `<option value="${track.id}">${track.name}</option>`).join('')}
        </select>
        <div class="w-px h-4 bg-stone-300"></div>
        <button id="mute-btn" class="text-lg hover:scale-110 transition-transform" title="Mute/Unmute">🔊</button>
        <input type="range" id="volume-slider" min="0" max="100" value="50" 
          class="w-20 h-1.5 bg-stone-300 rounded-lg appearance-none cursor-pointer accent-orange-500"
          title="Volume">
      </div>
      <div class="flex gap-2">
        <button id="save-btn" class="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg font-bold text-sm hover:bg-orange-200">Save Art</button>
        <button id="home-btn" class="px-4 py-2 text-stone-500 hover:text-stone-800">Exit</button>
      </div>
    </div>
  `;

    // Main content area
    const mainArea = document.createElement('div');
    mainArea.className = "flex-1 flex overflow-hidden p-4 gap-4";

    // Left Sidebar - Tools + Colors with soft shadow
    const leftSidebar = document.createElement('div');
    leftSidebar.className = "w-72 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] flex flex-col p-4 z-10 overflow-y-auto";

    // Tools section with brush size
    const toolsSection = document.createElement('div');
    toolsSection.className = "flex flex-col gap-3 pb-4 border-b border-stone-100";
    toolsSection.innerHTML = `
        <div class="flex items-center gap-2">
            <button class="tool-btn active flex items-center justify-center w-10 h-10 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors" data-mode="fill" title="Fill">
                <span class="text-xl">🪣</span>
            </button>
            <button class="tool-btn flex items-center justify-center w-10 h-10 rounded-xl bg-stone-50 hover:bg-stone-100 transition-colors" data-mode="brush" title="Brush">
                <span class="text-xl">🖌️</span>
            </button>
            <button class="tool-btn flex items-center justify-center w-10 h-10 rounded-xl bg-stone-50 hover:bg-stone-100 transition-colors" data-mode="pan" title="Pan/Zoom">
                <span class="text-xl">✋</span>
            </button>
            <button class="tool-btn flex items-center justify-center w-10 h-10 rounded-xl bg-stone-50 hover:bg-stone-100 transition-colors" data-mode="eraser" title="Eraser">
                <span class="text-xl">🧼</span>
            </button>
        </div>
        <div class="flex items-center gap-2">
            <span class="text-xs text-stone-400">Size</span>
            <input type="range" id="brush-size" min="2" max="40" value="10" 
                class="flex-1 h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-orange-500">
            <span id="brush-size-value" class="text-xs text-stone-500 w-6 text-right">10</span>
        </div>
    `;

    // Color Palette section
    const PALETTE_COLORS = [
        '#e63946', '#f4a261', '#e9c46a', '#2a9d8f', '#264653', '#a855f7',
        '#ec4899', '#22c55e', '#3b82f6', '#8b5cf6', '#06b6d4', '#84cc16'
    ];

    const paletteSection = document.createElement('div');
    paletteSection.className = "py-4 border-b border-stone-100";
    paletteSection.innerHTML = `<div class="text-xs text-orange-500 font-bold mb-3">Palette</div>`;

    const paletteGrid = document.createElement('div');
    paletteGrid.className = "grid grid-cols-6 gap-2";
    PALETTE_COLORS.forEach(c => {
        const btn = document.createElement('button');
        btn.className = "color-btn w-8 h-8 rounded-full border-2 border-white shadow-sm transition-all hover:scale-110";
        btn.style.backgroundColor = c;
        btn.dataset.color = c;
        paletteGrid.appendChild(btn);
    });
    paletteSection.appendChild(paletteGrid);

    // Skin Tone section
    const SKIN_TONES = [
        '#8d5524', '#c68642', '#e0ac69', '#f1c27d', '#ffdbac', '#ffe0bd',
        '#6b4423', '#a57449', '#d4a574', '#e8c4a2', '#fad4c0', '#ffe5d4'
    ];

    const skinSection = document.createElement('div');
    skinSection.className = "py-4 border-b border-stone-100";
    skinSection.innerHTML = `<div class="text-xs text-orange-500 font-bold mb-3">Skin tone</div>`;

    const skinGrid = document.createElement('div');
    skinGrid.className = "grid grid-cols-6 gap-2";
    SKIN_TONES.forEach(c => {
        const btn = document.createElement('button');
        btn.className = "color-btn w-8 h-8 rounded-full border-2 border-white shadow-sm transition-all hover:scale-110";
        btn.style.backgroundColor = c;
        btn.dataset.color = c;
        skinGrid.appendChild(btn);
    });
    skinSection.appendChild(skinGrid);

    // Hair Color section
    const HAIR_COLORS = [
        '#000000', '#4a3728', '#8b4513', '#d2691e', '#ff8c00', '#daa520',
        '#f5deb3', '#c0c0c0', '#808080', '#2f1810', '#5c3317', '#a0522d'
    ];

    const hairSection = document.createElement('div');
    hairSection.className = "py-4";
    hairSection.innerHTML = `<div class="text-xs text-orange-500 font-bold mb-3">Hair color</div>`;

    const hairGrid = document.createElement('div');
    hairGrid.className = "grid grid-cols-6 gap-2";
    HAIR_COLORS.forEach(c => {
        const btn = document.createElement('button');
        btn.className = "color-btn w-8 h-8 rounded-full border-2 border-white shadow-sm transition-all hover:scale-110";
        btn.style.backgroundColor = c;
        btn.dataset.color = c;
        hairGrid.appendChild(btn);
    });
    hairSection.appendChild(hairGrid);

    // Assemble sidebar
    leftSidebar.appendChild(toolsSection);
    leftSidebar.appendChild(paletteSection);
    leftSidebar.appendChild(skinSection);
    leftSidebar.appendChild(hairSection);

    // Canvas Area with soft shadow
    const canvasArea = document.createElement('div');
    canvasArea.className = "flex-1 relative bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] cursor-crosshair overflow-hidden";

    // Assemble layout
    mainArea.appendChild(leftSidebar);
    mainArea.appendChild(canvasArea);

    container.appendChild(header);
    container.appendChild(mainArea);
    app.appendChild(container);

    const editor = new CanvasEditor(canvasArea, imageSrc, {
        initialColor: PALETTE_COLORS[0],
        initialDrawingData: savedDrawingData,
        onUpdate: () => saveState(imageSrc, editor)
    });

    // Events
    container.querySelector('#home-btn').onclick = () => {
        localStorage.removeItem('vibe_coloring_state');
        location.reload();
    };
    container.querySelector('#save-btn').onclick = () => {
        const link = document.createElement('a');
        link.download = 'my-coloring.png';
        link.href = editor.getImageDataURL();
        link.click();
    };

    // Tool selection
    container.querySelectorAll('.tool-btn').forEach(btn => {
        btn.onclick = (e) => {
            const target = e.currentTarget;
            container.querySelectorAll('.tool-btn').forEach(b => {
                b.classList.remove('bg-orange-100', 'border-2', 'border-orange-400');
                b.classList.add('bg-stone-50');
            });
            target.classList.remove('bg-stone-50');
            target.classList.add('bg-orange-100', 'border-2', 'border-orange-400'); // Active state
            editor.setMode(target.dataset.mode);
        };
    });

    // Color selection (unified for all palettes)
    const handleColorSelect = (target) => {
        container.querySelectorAll('.color-btn').forEach(b => {
            b.classList.remove('ring-2', 'ring-orange-400', 'ring-offset-2', 'scale-110');
            b.style.borderColor = 'white';
        });
        target.classList.add('ring-2', 'ring-orange-400', 'ring-offset-2', 'scale-110');
        target.style.borderColor = 'transparent';
        editor.setColor(target.dataset.color);
    };

    container.querySelectorAll('.color-btn').forEach(btn => {
        btn.onclick = (e) => handleColorSelect(e.currentTarget);
    });

    // Initialize first color as active
    const firstColorBtn = container.querySelector('.color-btn');
    if (firstColorBtn) handleColorSelect(firstColorBtn);

    // Brush size control
    const brushSlider = container.querySelector('#brush-size');
    const brushValue = container.querySelector('#brush-size-value');

    if (brushSlider && brushValue) {
        brushSlider.oninput = (e) => {
            const size = parseInt(e.target.value);
            brushValue.textContent = size;
            editor.setBrushSize(size);
        };
    }

    // Volume control events
    const muteBtn = container.querySelector('#mute-btn');
    const volumeSlider = container.querySelector('#volume-slider');

    const updateMuteIcon = () => {
        const isMuted = AudioManager.isMuted();
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
        volumeSlider.disabled = isMuted;
        volumeSlider.classList.toggle('opacity-50', isMuted);
    };

    // Music selector changes track
    const musicSelector = container.querySelector('#music-selector');
    musicSelector.onchange = (e) => {
        AudioManager.switchTrack(e.target.value);
    };

    // Slider controls volume
    volumeSlider.oninput = (e) => {
        AudioManager.setVolume(e.target.value / 100);
    };

    // Mute button toggles mute
    muteBtn.onclick = () => {
        AudioManager.mute();
        updateMuteIcon();
    };

    // Sync UI with current Audio State
    updateMuteIcon();
    if (volumeSlider) volumeSlider.value = AudioManager.getVolume() * 100;
    if (musicSelector) musicSelector.value = AudioManager.getCurrentTrack() || 'lofi';
};

// Helper to safely resume audio
const ensureAudioPlaying = () => {
    if (!AudioManager.audio || !AudioManager.audio.paused) return;

    AudioManager.play();

    const resume = () => {
        if (AudioManager.audio && AudioManager.audio.paused) {
            AudioManager.play();
        }
        ['click', 'keydown', 'touchstart'].forEach(e =>
            document.removeEventListener(e, resume, { capture: true })
        );
    };

    ['click', 'keydown', 'touchstart'].forEach(e =>
        document.addEventListener(e, resume, { capture: true })
    );
};

const initApp = async () => {
    try {
        const [musicRes, imagesRes] = await Promise.all([
            fetch('/data/music.json'),
            fetch('/data/images.json')
        ]);

        APP_DATA.music = await musicRes.json();
        APP_DATA.images = await imagesRes.json();

        // Populate AudioManager
        APP_DATA.music.forEach(track => {
            if (track.id !== 'none' && track.url) {
                AudioManager.addTrack(track.id, track.url);
            }
        });
        AudioManager.switchTrack('none');

        const saved = loadState();
        if (saved && saved.imageSrc) {
            // Restore audio state if available
            if (saved.audio) {
                if (saved.audio.track) AudioManager.switchTrack(saved.audio.track);
                AudioManager.setVolume(saved.audio.volume ?? 0.5);
                if (AudioManager.audio) AudioManager.audio.muted = !!saved.audio.muted;

                if (!saved.audio.paused) {
                    ensureAudioPlaying();
                }
            } else {
                // Legacy save (no audio state): Default to none
                if (!AudioManager.getCurrentTrack() || AudioManager.getCurrentTrack() === 'default') {
                    AudioManager.switchTrack('none');
                }
            }

            // If we have a saved state, load it directly
            renderEditor(saved.imageSrc, saved.drawingData);
        } else {
            renderWelcome(APP_DATA.images);
        }
    } catch (e) {
        console.error("Failed to initialize app:", e);
    }
};

initApp();
