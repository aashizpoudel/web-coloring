import { GoogleGenerativeAI } from "@google/generative-ai";
import { LLMInterface } from "./llm_interface";

export class GeminiProvider extends LLMInterface {
    constructor(apiKey) {
        super({ apiKey });
        this.apiKey = apiKey;
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    // Step 1: Analyze the uploaded image to get a prompt
    async analyzeImage(base64Image) {
        try {
            // Remove header if present
            const base64Data = base64Image.includes('base64,')
                ? base64Image.split('base64,')[1]
                : base64Image;

            const prompt = "Describe this image in detail so I can recreate it as a Studio Ghibli illustration. Focus on the main subject, setting, and colors. Keep it within 50 words.";

            const imagePart = {
                inlineData: {
                    data: base64Data,
                    mimeType: "image/jpeg", // Assuming JPEG for simplicity, usually fine
                },
            };

            const result = await this.model.generateContent([prompt, imagePart]);
            const text = result.response.text();
            console.log("Image Description:", text);
            return text;
        } catch (error) {
            console.error("Vision API Error:", error);
            throw new Error("Failed to analyze image. Ensure your key supports Gemini Vision.");
        }
    }

    // Step 2: Generate new image based on description
    async generateImage(prompt) {
        // Using Imagen 3 via REST API
        // Endpoint: https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict

        const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${this.apiKey}`;

        const refinedPrompt = `Studio Ghibli style illustration, anime art, ${prompt} --aspect_ratio=1:1`;

        // Note: The payload format for Google AI Studio REST API for Imagen
        const payload = {
            instances: [
                { prompt: refinedPrompt }
            ],
            parameters: {
                sampleCount: 1,
                // aspectRatio: "1:1" // Some versions use param, some use prompt suffix
            }
        };

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Imagen API Error (${response.status}): ${errText}`);
            }

            const data = await response.json();

            // Structure: predictions[0].bytesBase64Encoded or similar
            // Check actual response format for Imagen on Vertex/Studio
            // Usually: { predictions: [ { bytesBase64Encoded: "..." } ] } OR { predictions: ["base64string"] }

            if (data.predictions && data.predictions[0]) {
                // It handles both object with bytesBase64Encoded property or direct string
                const prediction = data.predictions[0];
                const base64 = prediction.bytesBase64Encoded || prediction;
                return `data:image/png;base64,${base64}`;
            }

            throw new Error("No image data in response");

        } catch (error) {
            console.error("Image Generation Error:", error);
            // Fallback tip for user
            if (error.message.includes("404") || error.message.includes("403")) {
                throw new Error("Image Generation failed. Your API Key might not have access to 'imagen-3.0-generate-001'.");
            }
            throw error;
        }
    }

    async generateColoringPage(description) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${this.apiKey}`;
        const refinedPrompt = `Black and white coloring page, clean line art, no shading, white background, ${description} --aspect_ratio=1:1`;

        const payload = {
            instances: [{ prompt: refinedPrompt }],
            parameters: { sampleCount: 1 }
        };

        const response = await fetch(url, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Coloring Page Generation failed");

        const data = await response.json();
        const prediction = data.predictions[0];
        const base64 = prediction.bytesBase64Encoded || prediction;
        return `data:image/png;base64,${base64}`;
    }
}
