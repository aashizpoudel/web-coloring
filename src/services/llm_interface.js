/**
 * Abstract Base Class for LLM Providers.
 * Any new provider (OpenAI, Anthropic, Local) must implement these methods.
 */
export class LLMInterface {
    constructor(config) {
        if (new.target === LLMInterface) {
            throw new Error("Cannot instantiate abstract class LLMInterface directly.");
        }
        this.config = config;
    }

    /**
     * Analyzes an image and returns a text description.
     * @param {string} base64Image - The image to analyze (data URL or raw base64)
     * @returns {Promise<string>} - Description of the image
     */
    async analyzeImage(base64Image) {
        throw new Error("Method 'analyzeImage' must be implemented.");
    }

    /**
     * Generates a Ghibli-style image based on a prompt.
     * @param {string} prompt - The text prompt
     * @returns {Promise<string>} - Base64 data URL of the generated image
     */
    async generateImage(prompt) {
        throw new Error("Method 'generateImage' must be implemented.");
    }

    /**
     * Generates a black and white coloring page.
     * @param {string} description - Description of the scene
     * @returns {Promise<string>} - Base64 data URL of the line art
     */
    async generateColoringPage(description) {
        throw new Error("Method 'generateColoringPage' must be implemented.");
    }
}
