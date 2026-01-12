/**
 * Line Art Processing Module
 * Enhances coloring book line art to prevent fill leaks
 */

/**
 * Process line art image to create clean, gap-free boundaries
 * @param {HTMLImageElement} img - Source image
 * @param {Object} options - Processing options
 * @returns {Object} - Processed line art data and dimensions
 */
export function processLineArt(img, options = {}) {
    const {
        threshold = 200,      // Brightness threshold (0-255) for line detection
        dilationRadius = 2,   // How much to thicken lines (pixels)
        gaussianBlur = false, // Apply blur before processing
        edgeDetect = false,   // Use edge detection instead of threshold
    } = options;

    // Create canvas at image's natural size
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;

    // Draw original image
    ctx.drawImage(img, 0, 0);

    // Get image data
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Step 1: Convert to grayscale
    imageData = toGrayscale(imageData);

    // Step 2: Optional Gaussian blur to reduce noise
    if (gaussianBlur) {
        imageData = applyGaussianBlur(imageData, canvas.width, canvas.height);
    }

    // Step 3: Threshold to binary (black lines on white)
    if (edgeDetect) {
        imageData = applySobelEdgeDetection(imageData, canvas.width, canvas.height);
    }
    imageData = applyThreshold(imageData, threshold);

    // Step 4: Dilate to thicken lines and close gaps
    if (dilationRadius > 0) {
        imageData = applyDilation(imageData, canvas.width, canvas.height, dilationRadius);
    }

    return {
        data: imageData.data,
        width: canvas.width,
        height: canvas.height
    };
}

/**
 * Create a high-quality line art image from source
 * Converts to pure binary (black=0, white=255) with NO gray values
 * Uses the SAME binary data for both display and boundary detection
 * @param {HTMLImageElement} img - Source image
 * @param {Object} options - Processing options
 * @returns {Object} - { dataURL: string, boundaryData: Uint8ClampedArray, width: number, height: number }
 */
export function createHighQualityLineArt(img, options = {}) {
    const {
        threshold = 200,      // Brightness threshold: below = black line, above = white
        dilationRadius = 1,   // Thicken lines to close tiny gaps
    } = options;

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    // Create canvas at image's natural size
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = width;
    canvas.height = height;

    // Draw original image
    ctx.drawImage(img, 0, 0);

    // Get image data
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Step 1: Convert to pure binary (black or white only)
    for (let i = 0; i < data.length; i += 4) {
        // Calculate grayscale brightness
        const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

        // Pure binary: either 0 (black) or 255 (white)
        const binary = brightness < threshold ? 0 : 255;

        data[i] = binary;
        data[i + 1] = binary;
        data[i + 2] = binary;
        data[i + 3] = 255; // Full opacity
    }

    // Step 2: Dilate black pixels to thicken lines and close gaps
    if (dilationRadius > 0) {
        const output = new Uint8ClampedArray(data.length);
        output.set(data);

        // Create circular kernel offsets
        const kernel = [];
        for (let dy = -dilationRadius; dy <= dilationRadius; dy++) {
            for (let dx = -dilationRadius; dx <= dilationRadius; dx++) {
                if (dx * dx + dy * dy <= dilationRadius * dilationRadius) {
                    kernel.push({ dx, dy });
                }
            }
        }

        // Dilate: if any pixel in the original is black, spread it to neighbors
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;

                // If this pixel is black in original
                if (data[idx] === 0) {
                    // Make all neighbors black in output
                    for (const { dx, dy } of kernel) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const nIdx = (ny * width + nx) * 4;
                            output[nIdx] = 0;
                            output[nIdx + 1] = 0;
                            output[nIdx + 2] = 0;
                        }
                    }
                }
            }
        }

        // Copy back
        for (let i = 0; i < data.length; i++) {
            data[i] = output[i];
        }
    }

    // Put processed data back to canvas
    ctx.putImageData(imageData, 0, 0);

    // Return the SAME binary data for both display and boundary detection
    return {
        dataURL: canvas.toDataURL('image/png'),
        boundaryData: new Uint8ClampedArray(data),  // Copy of the binary data
        width: width,
        height: height
    };
}



/**
 * Convert image to grayscale
 */
function toGrayscale(imageData) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        // Luminance formula
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
    }
    return imageData;
}

/**
 * Apply binary threshold - pixels below threshold become black (line), above become white
 */
function applyThreshold(imageData, threshold) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const gray = data[i];
        const binary = gray < threshold ? 0 : 255;
        data[i] = binary;
        data[i + 1] = binary;
        data[i + 2] = binary;
    }
    return imageData;
}

/**
 * Morphological dilation - thickens dark lines
 * Uses a circular structuring element
 */
function applyDilation(imageData, width, height, radius) {
    const data = imageData.data;
    const output = new Uint8ClampedArray(data.length);

    // Copy original data
    output.set(data);

    // Create circular kernel
    const kernel = [];
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            if (dx * dx + dy * dy <= radius * radius) {
                kernel.push({ dx, dy });
            }
        }
    }

    // For each pixel
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;

            // If this pixel is already black, check if neighbors should become black
            if (data[idx] === 0) {
                // Dilate: make all neighbors within radius black too
                for (const { dx, dy } of kernel) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const nIdx = (ny * width + nx) * 4;
                        output[nIdx] = 0;
                        output[nIdx + 1] = 0;
                        output[nIdx + 2] = 0;
                        output[nIdx + 3] = 255;
                    }
                }
            }
        }
    }

    // Copy output back
    for (let i = 0; i < data.length; i++) {
        data[i] = output[i];
    }

    return imageData;
}

/**
 * Sobel edge detection - finds edges in the image
 */
function applySobelEdgeDetection(imageData, width, height) {
    const data = imageData.data;
    const output = new Uint8ClampedArray(data.length);

    // Initialize output to white
    for (let i = 0; i < output.length; i += 4) {
        output[i] = 255;
        output[i + 1] = 255;
        output[i + 2] = 255;
        output[i + 3] = 255;
    }

    // Sobel kernels
    const sobelX = [
        [-1, 0, 1],
        [-2, 0, 2],
        [-1, 0, 1]
    ];
    const sobelY = [
        [-1, -2, -1],
        [0, 0, 0],
        [1, 2, 1]
    ];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let gx = 0, gy = 0;

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const idx = ((y + ky) * width + (x + kx)) * 4;
                    const gray = data[idx];
                    gx += gray * sobelX[ky + 1][kx + 1];
                    gy += gray * sobelY[ky + 1][kx + 1];
                }
            }

            const magnitude = Math.sqrt(gx * gx + gy * gy);
            const idx = (y * width + x) * 4;

            // Invert: edges become black
            const edge = magnitude > 50 ? 0 : 255;
            output[idx] = edge;
            output[idx + 1] = edge;
            output[idx + 2] = edge;
            output[idx + 3] = 255;
        }
    }

    // Copy output back
    for (let i = 0; i < data.length; i++) {
        data[i] = output[i];
    }

    return imageData;
}

/**
 * Apply 3x3 Gaussian blur
 */
function applyGaussianBlur(imageData, width, height) {
    const data = imageData.data;
    const output = new Uint8ClampedArray(data.length);

    // 3x3 Gaussian kernel (normalized)
    const kernel = [
        [1 / 16, 2 / 16, 1 / 16],
        [2 / 16, 4 / 16, 2 / 16],
        [1 / 16, 2 / 16, 1 / 16]
    ];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let r = 0, g = 0, b = 0;

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const idx = ((y + ky) * width + (x + kx)) * 4;
                    const weight = kernel[ky + 1][kx + 1];
                    r += data[idx] * weight;
                    g += data[idx + 1] * weight;
                    b += data[idx + 2] * weight;
                }
            }

            const idx = (y * width + x) * 4;
            output[idx] = r;
            output[idx + 1] = g;
            output[idx + 2] = b;
            output[idx + 3] = 255;
        }
    }

    // Copy output back (keep edges from original)
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            data[idx] = output[idx];
            data[idx + 1] = output[idx + 1];
            data[idx + 2] = output[idx + 2];
        }
    }

    return imageData;
}

/**
 * Apply line smoothing/anti-aliasing to binary line art
 * Makes lines appear smoother by adding subtle gray transitions at edges
 */
function applyLineSmoothing(data, width, height) {
    const output = new Uint8ClampedArray(data.length);
    output.set(data);

    // Simple anti-aliasing: for each edge pixel, blend with neighbors
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            const current = data[idx];

            // Check if this is an edge pixel (black next to white or vice versa)
            let blackNeighbors = 0;
            let whiteNeighbors = 0;

            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nIdx = ((y + dy) * width + (x + dx)) * 4;
                    if (data[nIdx] < 128) {
                        blackNeighbors++;
                    } else {
                        whiteNeighbors++;
                    }
                }
            }

            // If this pixel has mixed neighbors, apply subtle smoothing
            if (blackNeighbors > 0 && whiteNeighbors > 0) {
                // Create a gradient based on neighbor ratio
                const ratio = blackNeighbors / 8;
                const smoothed = Math.round(255 * (1 - ratio * 0.3));

                if (current > 128) {
                    // White pixel with black neighbors - darken slightly
                    const blended = Math.min(255, Math.max(0, smoothed));
                    output[idx] = blended;
                    output[idx + 1] = blended;
                    output[idx + 2] = blended;
                }
            }
        }
    }

    // Copy back
    for (let i = 0; i < data.length; i++) {
        data[i] = output[i];
    }
}

/**
 * Create a debug canvas showing the processed line art
 */
export function debugLineArt(processedData) {
    const canvas = document.createElement('canvas');
    canvas.width = processedData.width;
    canvas.height = processedData.height;
    const ctx = canvas.getContext('2d');

    const imageData = ctx.createImageData(processedData.width, processedData.height);
    imageData.data.set(processedData.data);
    ctx.putImageData(imageData, 0, 0);

    return canvas.toDataURL();
}

// Keep existing exports
export const extractColors = (imageElement, colorCount = 8) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imageElement.naturalWidth || imageElement.width;
    canvas.height = imageElement.naturalHeight || imageElement.height;

    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const colorMap = {};

    for (let i = 0; i < imageData.length; i += 40) {
        const r = imageData[i];
        const g = imageData[i + 1];
        const b = imageData[i + 2];
        const a = imageData[i + 3];

        if (a < 128) continue;

        const qr = Math.round(r / 32) * 32;
        const qg = Math.round(g / 32) * 32;
        const qb = Math.round(b / 32) * 32;

        const key = `${qr},${qg},${qb}`;
        colorMap[key] = (colorMap[key] || 0) + 1;
    }

    const sortedColors = Object.entries(colorMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, colorCount)
        .map(([key]) => {
            const [r, g, b] = key.split(',').map(Number);
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        });

    return sortedColors;
};

export const applyGhibliFilter = (imageElement) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imageElement.naturalWidth || imageElement.width;
    canvas.height = imageElement.naturalHeight || imageElement.height;

    ctx.filter = 'saturate(130%) contrast(110%) brightness(105%)';
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL();
};
