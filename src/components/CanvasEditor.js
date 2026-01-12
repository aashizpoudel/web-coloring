import { createHighQualityLineArt } from '../utils/image_processing';

const waterDropSound = '/audio/water_drop.mp3';
const bubblePopSound = '/audio/bubble_pop.mp3';

/**
 * Canvas Editor with fixed internal resolution
 * Uses the image's natural size as the canvas size, 
 * and CSS scaling to fit the container.
 * This ensures painting and line art are always perfectly aligned.
 */
export class CanvasEditor {
    constructor(container, imageSrc, options = {}) {
        this.container = container;
        this.currentColor = options.initialColor || '#000000';
        this.onUpdate = options.onUpdate;
        this.mode = 'fill'; // 'brush', 'fill', 'pan', 'eraser'
        this.brushSize = 10;
        this.isDrawing = false;
        this.isPanning = false;

        // Transform state
        this.zoom = 1;
        this.pan = { x: 0, y: 0 };
        this.lastTouchDist = 0;
        this.startPan = { x: 0, y: 0 };

        // Line art boundary data
        this.lineArtData = null;
        this.lineArtWidth = 0;
        this.lineArtHeight = 0;

        this.init(imageSrc, options.initialDrawingData);
    }

    init(imageSrc, initialDrawingData) {
        // Load the original image first
        this.img = new Image();
        this.img.crossOrigin = 'anonymous';
        this.img.src = imageSrc;

        this.img.onload = () => {
            console.log('Original image loaded, processing line art...');

            // Process the image to create high-quality binary line art
            const processed = createHighQualityLineArt(this.img, {
                threshold: 200,
                dilationRadius: 0,   // No dilation - keep lines thin
            });

            this.lineArtData = processed.boundaryData;
            this.lineArtWidth = processed.width;
            this.lineArtHeight = processed.height;
            const processedLineArtURL = processed.dataURL;

            console.log(`Line art processed: ${this.lineArtWidth}x${this.lineArtHeight}`);

            // Create the editor structure
            this.createEditorDOM(processedLineArtURL);

            // Restore previous drawing if available
            if (initialDrawingData) {
                this.loadDrawingData(initialDrawingData);
            }

            this.setupEvents();
            this.fitToScreen();

            // Listen for window resize to update scaling
            window.addEventListener('resize', () => this.fitToScreen());
        };
    }

    /**
     * Load existing coloring data onto the canvas
     */
    loadDrawingData(dataURL) {
        const img = new Image();
        img.src = dataURL;
        img.onload = () => {
            this.ctx.drawImage(img, 0, 0);
        };
    }

    /**
     * Get just the coloring layer
     */
    getDrawingData() {
        return this.canvas.toDataURL('image/png');
    }

    /**
     * Create the DOM structure for the editor
     * Uses a fixed-size inner container that gets scaled with CSS
     */
    createEditorDOM(lineArtURL) {
        // Outer wrapper - fills container, clips overflow
        this.wrapper = document.createElement('div');
        this.wrapper.className = "relative w-full h-full overflow-hidden bg-stone-100 touch-none select-none";

        // Inner container - fixed size matching image dimensions
        this.innerContainer = document.createElement('div');
        this.innerContainer.style.position = 'absolute';
        this.innerContainer.style.width = this.lineArtWidth + 'px';
        this.innerContainer.style.height = this.lineArtHeight + 'px';
        this.innerContainer.style.transformOrigin = '0 0'; // Transform from top-left for easier math
        this.innerContainer.style.willChange = 'transform';
        this.innerContainer.style.backfaceVisibility = 'hidden';
        this.innerContainer.style.boxShadow = '0 20px 50px rgba(0,0,0,0.1)';

        // Canvas Layer (Drawing)
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.lineArtWidth;
        this.canvas.height = this.lineArtHeight;
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.touchAction = 'none';
        this.canvas.style.imageRendering = 'auto'; // Smooth scaling

        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';

        // Fill with white background
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Line art overlay
        this.overlayImg = document.createElement('img');
        this.overlayImg.src = lineArtURL;
        this.overlayImg.style.position = 'absolute';
        this.overlayImg.style.top = '0';
        this.overlayImg.style.left = '0';
        this.overlayImg.style.width = '100%';
        this.overlayImg.style.height = '100%';
        this.overlayImg.style.pointerEvents = 'none';
        this.overlayImg.style.mixBlendMode = 'multiply';
        this.overlayImg.style.imageRendering = 'auto';
        this.overlayImg.style.webkitFontSmoothing = 'antialiased';

        // Brush Cursor Preview (Circle)
        this.cursorPreview = document.createElement('div');
        this.cursorPreview.className = "pointer-events-none fixed border border-stone-800 rounded-full z-50 hidden";
        this.cursorPreview.style.transform = 'translate(-50%, -50%)';
        this.cursorPreview.style.boxShadow = '0 0 4px rgba(255, 255, 255, 0.8), inset 0 0 2px rgba(255, 255, 255, 0.8)'; // detailed visibility

        // Assemble the DOM
        this.innerContainer.appendChild(this.canvas);
        this.innerContainer.appendChild(this.overlayImg);
        this.wrapper.appendChild(this.innerContainer);
        // Append cursor to container
        this.container.appendChild(this.cursorPreview);
        this.container.appendChild(this.wrapper);
    }

    /**
     * Initial fit of image to screen
     */
    fitToScreen() {
        const wrapperRect = this.wrapper.getBoundingClientRect();
        const padding = 40;

        const availableWidth = wrapperRect.width - padding;
        const availableHeight = wrapperRect.height - padding;

        const scaleX = availableWidth / this.lineArtWidth;
        const scaleY = availableHeight / this.lineArtHeight;
        this.zoom = Math.min(scaleX, scaleY, 0.9); // Limit max initial zoom

        // Center it
        this.pan.x = (wrapperRect.width - this.lineArtWidth * this.zoom) / 2;
        this.pan.y = (wrapperRect.height - this.lineArtHeight * this.zoom) / 2;

        this.updateTransform();
    }

    updateTransform() {
        this.innerContainer.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
        this.updateCursorSize();
    }

    updateCursorSize() {
        if ((this.mode === 'brush' || this.mode === 'eraser') && this.cursorPreview) {
            const size = this.brushSize * this.zoom;
            this.cursorPreview.style.width = size + 'px';
            this.cursorPreview.style.height = size + 'px';
            this.cursorPreview.style.borderRadius = '50%';

            if (this.mode === 'eraser') {
                // High contrast for eraser
                this.cursorPreview.style.borderColor = '#333';
                this.cursorPreview.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
            } else {
                // Restore brush visual
                this.setColor(this.currentColor);
            }
        }
    }

    initAudio() {
        this.unfillAudio = this.fillAudio = new Audio(bubblePopSound);
        this.unfillAudio.volume = 0.5;

        this.playFillSound = () => {
            const sound = this.fillAudio.cloneNode();
            sound.volume = 0.5;
            sound.play().catch(() => { });
        };

        this.playUnfillSound = () => {
            const sound = this.unfillAudio.cloneNode();
            sound.volume = 0.5;
            sound.play().catch(() => { });
        };
    }

    setupEvents() {
        this.initAudio();

        // Prevent context menu
        this.wrapper.addEventListener('contextmenu', (e) => e.preventDefault());

        // Mouse Wheel Zoom
        this.wrapper.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

        // Pointer Events (Unified Mouse/Touch)
        this.wrapper.addEventListener('pointerdown', (e) => this.handleStart(e));

        // Track mouse globally for smoother dragging, but also locally for cursor
        window.addEventListener('pointermove', (e) => this.handleMove(e));
        window.addEventListener('pointerup', (e) => this.handleEnd(e));

        // Cursor visibility
        this.wrapper.addEventListener('pointerenter', () => {
            if (this.mode === 'brush' || this.mode === 'eraser') this.cursorPreview.classList.remove('hidden');
        });
        this.wrapper.addEventListener('pointerleave', () => {
            this.cursorPreview.classList.add('hidden');
        });

        // Touch specific checks
        this.wrapper.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) e.preventDefault();
        }, { passive: false });
    }

    handleWheel(e) {
        e.preventDefault();

        const delta = -Math.sign(e.deltaY);
        const zoomStep = 0.1;
        const newZoom = Math.max(0.1, Math.min(5, this.zoom + delta * zoomStep));

        if (newZoom === this.zoom) return;

        // Zoom towards mouse pointer
        const rect = this.wrapper.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate offset relative to current pan
        const renderX = (mouseX - this.pan.x) / this.zoom;
        const renderY = (mouseY - this.pan.y) / this.zoom;

        this.zoom = newZoom;

        // Recalculate pan to keep point stationary
        this.pan.x = mouseX - renderX * this.zoom;
        this.pan.y = mouseY - renderY * this.zoom;

        this.updateTransform();
    }

    getCoords(e) {
        // We need coords relative to the inner canvas
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    handleStart(e) {
        // Handle 2-finger touch
        if (e.pointerType === 'touch' && !e.isPrimary) return;

        // Check for Middle Mouse or Spacebar logic if we wanted hidden shortcuts
        // But for now, rely on Tool Mode or Touch Gestures

        if (this.mode === 'pan' || e.button === 1) {
            this.isPanning = true;
            this.startPan = { x: e.clientX - this.pan.x, y: e.clientY - this.pan.y };
            this.wrapper.style.cursor = 'grabbing';
            return;
        }

        const { x, y } = this.getCoords(e);
        this.isDrawing = true;

        if (this.mode === 'fill') {
            const isRightClick = e.button === 2;
            this.floodFill(x, y, isRightClick ? '#FFFFFF' : this.currentColor, isRightClick);
            this.isDrawing = false; // Fill is one-shot
        } else {
            // Brush or Eraser
            if (e.button !== 2) { // Left click only
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.ctx.strokeStyle = this.mode === 'eraser' ? '#FFFFFF' : this.currentColor;
                this.ctx.lineWidth = this.brushSize;
            }
        }
    }

    handleMove(e) {
        // Update brush/eraser cursor position
        if ((this.mode === 'brush' || this.mode === 'eraser') && this.cursorPreview) {
            this.cursorPreview.style.top = e.clientY + 'px';
            this.cursorPreview.style.left = e.clientX + 'px';
        }

        if (this.isPanning) {
            this.pan.x = e.clientX - this.startPan.x;
            this.pan.y = e.clientY - this.startPan.y;
            this.updateTransform();
            return;
        }

        if (!this.isDrawing || this.mode === 'fill') return;

        const { x, y } = this.getCoords(e);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
    }

    handleEnd() {
        this.isPanning = false;
        this.isDrawing = false;

        // Restore cursor based on mode
        if (this.mode === 'pan') {
            this.wrapper.style.cursor = 'grab';
        } else if (this.mode === 'brush' || this.mode === 'eraser') {
            this.wrapper.style.cursor = 'none';
        } else if (this.mode === 'fill') {
            // Keep bucket
        }
        this.ctx.closePath();

        // Notify update for persistence
        if (this.onUpdate) {
            // Only update if we were drawing (brush/eraser) or just did a fill
            // Note: floodFill happens on start, but saving on end is fine and covers all
            this.onUpdate();
        }
    }

    setColor(color) {
        this.currentColor = color;
        if (this.cursorPreview) {
            this.cursorPreview.style.borderColor = color === '#FFFFFF' ? '#000000' : color;
            this.cursorPreview.style.backgroundColor = color + '20'; // Slight tint
        }
    }

    setBrushSize(size) {
        this.brushSize = size;
        this.updateCursorSize();
    }

    setMode(mode) {
        this.mode = mode;
        this.wrapper.style.touchAction = 'none';

        if (mode === 'brush' || mode === 'eraser') {
            this.wrapper.style.cursor = 'none';
            if (this.cursorPreview) {
                this.cursorPreview.classList.remove('hidden');
                this.updateCursorSize();
            }
        } else if (mode === 'fill') {
            // Paint bucket cursor
            this.wrapper.style.cursor = "crosshair";
            if (this.cursorPreview) this.cursorPreview.classList.add('hidden');
        } else if (mode === 'pan') {
            this.wrapper.style.cursor = 'grab';
            if (this.cursorPreview) this.cursorPreview.classList.add('hidden');
        }
    }

    // Pinch Zoom Handling (needs specialized touch events since pointer events don't expose pinch distance easily)
    // We already added 'wheel' for mouse. 
    // For robust touch pinch-zoom, we'd need to track 2 active pointers.
    // Given the complexity of robust multi-touch in raw JS, 
    // and the request for "Pan and Zoom Tool", we rely on the Pan tool for movement 
    // and pinch gestures if supported or simple buttons.
    // Currently, the mouse wheel zoom works for trackpads.
    // Native browser pinch-zoom is disabled via touch-action: none.

    // Simplest Pinch Zoom implementation for this context:
    // Browser default pinch zoom might actually be desirable if we weren't doing custom canvas rendering.
    // But since we are, we should implement a basic tracker.

    /**
     * Check if a pixel is a boundary (black line)
     */
    isLineBoundary(x, y) {
        if (!this.lineArtData) return false;
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        if (ix < 0 || ix >= this.lineArtWidth || iy < 0 || iy >= this.lineArtHeight) return true;
        const pos = (iy * this.lineArtWidth + ix) * 4;
        return this.lineArtData[pos] === 0;
    }

    /**
     * Animated flood fill
     */
    floodFill(startX, startY, fillColor, isUnfill = false) {
        const width = this.canvas.width;
        const height = this.canvas.height;

        startX = Math.round(startX);
        startY = Math.round(startY);

        if (this.isLineBoundary(startX, startY)) return;

        const imageData = this.ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        const startPos = (startY * width + startX) * 4;
        const targetR = data[startPos], targetG = data[startPos + 1], targetB = data[startPos + 2], targetA = data[startPos + 3];

        const fillR = parseInt(fillColor.slice(1, 3), 16);
        const fillG = parseInt(fillColor.slice(3, 5), 16);
        const fillB = parseInt(fillColor.slice(5, 7), 16);

        if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === 255) return;

        const visited = new Uint8Array(width * height);
        const tolerance = 32;
        const colorMatches = (pos) => {
            return Math.abs(data[pos] - targetR) <= tolerance &&
                Math.abs(data[pos + 1] - targetG) <= tolerance &&
                Math.abs(data[pos + 2] - targetB) <= tolerance;
        };

        const pixelsToFill = [];
        const queue = [[startX, startY]];

        while (queue.length > 0) {
            const [x, y] = queue.shift();
            if (x < 0 || x >= width || y < 0 || y >= height) continue;

            const pixelIndex = y * width + x;
            if (visited[pixelIndex]) continue;
            visited[pixelIndex] = 1;
            const pos = pixelIndex * 4;

            if (this.isLineBoundary(x, y)) continue;
            if (!colorMatches(pos)) continue;

            pixelsToFill.push({ pos, origR: data[pos], origG: data[pos + 1], origB: data[pos + 2] });
            queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }

        if (pixelsToFill.length === 0) return;

        if (isUnfill) this.playUnfillSound();
        else this.playFillSound();

        // Immediate fill for performance on large areas, can add animation back if needed
        for (const pixel of pixelsToFill) {
            const { pos } = pixel;
            data[pos] = fillR;
            data[pos + 1] = fillG;
            data[pos + 2] = fillB;
            data[pos + 3] = 255;
        }
        this.ctx.putImageData(imageData, 0, 0);
    }

    getImageDataURL() {
        const mergedCanvas = document.createElement('canvas');
        mergedCanvas.width = this.canvas.width;
        mergedCanvas.height = this.canvas.height;
        const mergedCtx = mergedCanvas.getContext('2d');

        // Fill white background first (Fixes transparency issue)
        mergedCtx.fillStyle = '#FFFFFF';
        mergedCtx.fillRect(0, 0, mergedCanvas.width, mergedCanvas.height);

        // Draw coloring layer
        mergedCtx.drawImage(this.canvas, 0, 0);

        // Draw line art
        mergedCtx.globalCompositeOperation = 'multiply';
        mergedCtx.drawImage(this.overlayImg, 0, 0);

        return mergedCanvas.toDataURL('image/png');
    }
}
