require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

// ── Gemini client (reuses the same env key as the rest of the backend) ────────
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const DEFAULT_MODEL = "gemini-2.5-flash-image";

/**
 * Generate a conceptual image from a text prompt using the Gemini image
 * generation API.
 *
 * @param   {string}  prompt      - A descriptive text prompt for image generation.
 * @param   {string}  [modelName]  - Model to use (defaults to gemini-3-pro-image-preview).
 * @param   {string}  [base64Image] - Optional base64-encoded reference image for image-to-image.
 * @returns {Promise<{ base64: string, mimeType: string }>}
 *          Resolves with the generated image's base64 data and MIME type.
 * @throws  Will throw an error if the generation request fails.
 */
async function generateConceptualImage(prompt, modelName, base64Image) {
    if (!prompt || typeof prompt !== "string") {
        throw new Error("generateConceptualImage requires a non-empty string prompt.");
    }

    const model = modelName || DEFAULT_MODEL;

    try {
        console.log(`[imageGen] Requesting image from model "${model}"${base64Image ? " (image-to-image)" : ""}…`);

        // Build the parts array: text prompt + optional reference image.
        const parts = [{ text: prompt }];

        if (base64Image) {
            parts.push({
                inlineData: {
                    mimeType: "image/png",
                    data: base64Image,
                },
            });
        }

        const TIMEOUT_MS = 28000;
        const response = await Promise.race([
            ai.models.generateContent({
                model,
                contents: [{ parts }],
                config: {
                    responseModalities: ["TEXT", "IMAGE"],
                },
            }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Model is experiencing high usage — switch to a different image model")), TIMEOUT_MS)
            ),
        ]);

        // Walk through the response parts and find the first inline image.
        const responseParts = response?.candidates?.[0]?.content?.parts ?? [];

        for (const part of responseParts) {
            if (part.inlineData) {
                const { mimeType, data } = part.inlineData;
                console.log(`[imageGen] ✅ Image generated successfully (${mimeType}, ${Math.round(data.length / 1024)} KB base64).`);
                return { base64: data, mimeType };
            }
        }

        // Model responded but included no image data.
        throw new Error(`Model "${model}" returned a response without image data.`);
    } catch (err) {
        console.error(`[imageGen] ❌ Model "${model}" failed:`, err.message ?? err);
        throw err;
    }
}

module.exports = { generateConceptualImage };
