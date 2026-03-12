require("dotenv").config();

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { GoogleGenAI } = require("@google/genai");
const { CLASSIFIER_PROMPT, EXTRACTION_PROMPTS } = require("./prompts");
const { generateConceptualImage } = require("./services/imageGenerationService");

const app = express();
const PORT = process.env.PORT || 3001;

// ── Gemini client ─────────────────────────────────────────────────────────────
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ── Retry helper ──────────────────────────────────────────────────────────────
/**
 * Calls ai.models.generateContent with automatic 503 retry.
 * @param {object} params  - Arguments forwarded to generateContent.
 * @param {number} retries - Maximum number of retry attempts (default 3).
 * @param {number} delayMs - Milliseconds to wait between attempts (default 2000).
 */
async function callWithRetry(params, retries = 3, delayMs = 2000) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await ai.models.generateContent(params);
        } catch (err) {
            const is503 =
                err?.status === 503 ||
                err?.statusCode === 503 ||
                String(err?.message).includes("503") ||
                String(err?.message).toLowerCase().includes("overloaded") ||
                String(err?.message).toLowerCase().includes("high demand");

            if (is503 && attempt < retries) {
                console.warn(`Gemini 503 on attempt ${attempt + 1}/${retries + 1} — retrying in ${delayMs}ms…`);
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            } else {
                // Re-throw, preserving the original HTTP status code.
                const out = new Error(err?.message || "Gemini API error");
                out.is503 = is503;
                out.statusCode = err?.status ?? err?.statusCode ?? (is503 ? 503 : 500);
                throw out;
            }
        }
    }
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Multer ────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    },
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type: ${file.mimetype}`));
        }
    },
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "Server is up and running!",
        timestamp: new Date().toISOString(),
    });
});

/**
 * POST /api/extract
 * Accepts a multipart upload with field name "image".
 * Two-step flow: classify domain → domain-specific extraction.
 * Response: { domain, dnaData, inputTokens, outputTokens, totalTokens, costInDollars }
 */
app.post("/api/extract", upload.single("image"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No image file uploaded. Use field name 'image'." });
    }

    const filePath = req.file.path;
    const model = req.body?.model || "gemini-2.0-flash";

    try {
        // Shared inline image payload reused across both calls.
        const base64Image = fs.readFileSync(filePath).toString("base64");
        const mimeType = req.file.mimetype;

        const imageInlineData = {
            inlineData: { mimeType, data: base64Image },
        };

        // ── Step 1: Classify the domain ───────────────────────────────────────
        const classifyResponse = await callWithRetry({
            model,
            contents: [{ parts: [{ text: CLASSIFIER_PROMPT }, imageInlineData] }],
        });

        const domain = classifyResponse.text.trim().toUpperCase();

        console.log(`[extract] classified as: ${domain}`);

        // Safety valve: reject unrecognised or UNKNOWN domains before making a second API call.
        if (!EXTRACTION_PROMPTS[domain]) {
            return res.status(400).json({
                error: true,
                message: "Image could not be classified into a design domain. Extraction cancelled.",
            });
        }

        const extractionPrompt = EXTRACTION_PROMPTS[domain];

        // ── Step 2: Extract domain-specific DNA ───────────────────────────────
        const extractResponse = await callWithRetry({
            model,
            contents: [{ parts: [{ text: extractionPrompt }, imageInlineData] }],
            config: { responseMimeType: "application/json" },
        });

        const rawText = extractResponse.text.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();

        let parsedData;
        try {
            parsedData = JSON.parse(rawText);
        } catch {
            return res.status(500).json({
                error: "Gemini returned a non-JSON response.",
                raw: rawText,
            });
        }

        // ── Token usage & cost (sum of both calls) ────────────────────────────
        const u1 = classifyResponse.usageMetadata ?? {};
        const u2 = extractResponse.usageMetadata ?? {};

        const inputTokens = (u1.promptTokenCount ?? 0) + (u2.promptTokenCount ?? 0);
        const outputTokens = (u1.candidatesTokenCount ?? 0) + (u2.candidatesTokenCount ?? 0);
        const totalTokens = (u1.totalTokenCount ?? 0) + (u2.totalTokenCount ?? 0) || (inputTokens + outputTokens);

        // Pricing: $0.50 / 1M input tokens, $3.00 / 1M output tokens
        const costInDollars =
            (inputTokens / 1_000_000) * 0.50 +
            (outputTokens / 1_000_000) * 3.00;

        // ── Dynamic category response ─────────────────────────────────────────
        if (domain === "INDUSTRIAL") {
            return res.json({
                category: "INDUSTRIAL",
                analysis: parsedData,
                inputTokens,
                outputTokens,
                totalTokens,
                costInDollars,
            });
        }

        if (domain === "SPATIAL") {
            return res.json({
                category: "SPATIAL",
                analysis: parsedData,
                inputTokens,
                outputTokens,
                totalTokens,
                costInDollars,
            });
        }

        if (domain === "FASHION") {
            return res.json({
                category: "FASHION",
                analysis: parsedData,
                inputTokens,
                outputTokens,
                totalTokens,
                costInDollars,
            });
        }

        // ── Default response for other domains ────────────────────────────────
        return res.json({
            domain,
            dnaData: parsedData,
            inputTokens,
            outputTokens,
            totalTokens,
            costInDollars,
        });
    } catch (err) {
        console.error("Gemini error:", err);
        const status = err.statusCode ?? 500;
        return res.status(status).json({ error: true, message: err.message || "An API error occurred" });
    } finally {
        fs.unlink(filePath, () => { });
    }
});

/**
 * POST /api/generate-industrial
 * Accepts { mode, process, material, finish, color, formFactor,
 *           cmfTheme, wearLevel, isExplodedView, originalImage, imageModel } in the JSON body.
 * mode === 'cmf'    → applies a full CMF design language theme.
 * mode === 'stress' → applies realistic physical wear-and-tear aging.
 * mode === 'material' (default) → standard material/finish prompt.
 * Response: { success, imageUrl, imagePrompt }
 */
app.post("/api/generate-industrial", async (req, res) => {
    res.setTimeout(28000, () => {
        if (!res.headersSent) {
            res.status(504).json({ success: false, error: "Model is experiencing high usage — switch to a different image model" });
        }
    });

    const {
        mode = "material",
        process, material, finish, color, formFactor,
        cmfTheme = "", wearLevel = "",
        isExplodedView,
        originalImage, imageModel,
    } = req.body ?? {};

    // ── Construct prompt based on mode ───────────────────────────────────
    let imagePrompt;

    if (mode === "cmf") {
        imagePrompt =
            `Image-to-image transformation. Maintain the exact structural geometry and form factor of the original object. ` +
            `Apply a cohesive "${cmfTheme}" Color, Material, and Finish (CMF) design language across the entire product. ` +
            `Harmonize the textures and colors to strictly fit this theme.`;
    } else if (mode === "stress") {
        imagePrompt =
            `Image-to-image transformation. Maintain the exact structural geometry, core materials, and form factor of the original object. ` +
            `Apply realistic physical wear-and-tear corresponding to "${wearLevel}". ` +
            `Introduce appropriate textures such as scratches, dust, oxidation, patina, or faded colors to simulate this aging process physically on the surfaces.`;
    } else {
        // ── Standard material mode ────────────────────────────────────────
        imagePrompt =
            `Image-to-image transformation. Maintain the exact structural geometry, form factor, and proportions of the original object. ` +
            `Reimagine this object as a ${formFactor} product manufactured using ${process} out of ${material}. ` +
            `The surface should have a ${finish} finish and be colored ${color}. ` +
            `Render as a fully assembled product with stark, high-end studio photography lighting.`;
    }

    // ── Exploded view override (applies to all modes) ─────────────────
    if (isExplodedView) {
        imagePrompt +=
            ` Render this as a technical, highly detailed exploded-view engineering diagram. ` +
            `The individual components should be separated along a single axis, suspended in mid-air against a clean background.`;
    }

    console.log(`[generate-industrial] mode="${mode}" prompt=${imagePrompt}`);

    try {
        const imageResult = await generateConceptualImage(imagePrompt, imageModel, originalImage);
        const imageUrl = `data:${imageResult.mimeType};base64,${imageResult.base64}`;

        return res.json({
            success: true,
            imageUrl,
            imagePrompt,
        });
    } catch (err) {
        console.error("[generate-industrial] error:", err);
        return res.status(500).json({
            success: false,
            error: err.message || "An error occurred during industrial image generation.",
        });
    }
});

/**
 * POST /api/generate-spatial
 * Accepts { targetObject, style, material, lighting, originalImage, imageModel }
 * in the JSON body.
 * Constructs a dynamic spatial redesign prompt and generates an image-to-image
 * transformation.
 * Response: { success, imageUrl, imagePrompt }
 */
app.post("/api/generate-spatial", async (req, res) => {
    res.setTimeout(28000, () => {
        if (!res.headersSent) {
            res.status(504).json({ success: false, error: "Model is experiencing high usage — switch to a different image model" });
        }
    });

    const {
        spatialMode, targetObject, objectsToRemove,
        style, material, lighting,
        originalImage, imageModel,
    } = req.body ?? {};

    // ── Lighting logic ───────────────────────────────────────────────────
    let lightingInstruction;
    if (lighting.startsWith("Original:")) {
        lightingInstruction =
            "Maintain the EXACT original lighting, shadows, and color temperature of the scene. Do not alter the ambient light.";
    } else {
        lightingInstruction =
            `Change the ambient and direct lighting of the scene to reflect a ${lighting} atmosphere.`;
    }

    // ── Action logic based on spatialMode ─────────────────────────────────
    let imagePrompt;

    if (spatialMode === "remove") {
        if ((objectsToRemove ?? []).includes("Entire Room")) {
            imagePrompt =
                `Image-to-image transformation. ` +
                `Strip away ALL furniture, decor, rugs, and soft furnishings. ` +
                `Render this strictly as an empty, unfurnished architectural shell. ` +
                `Seamlessly reconstruct the bare floors and walls. ` +
                `Maintain the exact architectural layout, windows, and doors. ` +
                `${lightingInstruction}`;
        } else {
            const removeList = (objectsToRemove ?? []).join(", ");
            imagePrompt =
                `Image-to-image transformation. ` +
                `Maintain the EXACT architectural shell, background, and all unselected furniture exactly as they are. ` +
                `${lightingInstruction} ` +
                `Completely erase and remove the following objects: ${removeList}. ` +
                `Seamlessly reconstruct the background, walls, and floor where those objects used to be.`;
        }
    } else {
        // Default: redesign
        if (targetObject === "Entire Room") {
            imagePrompt =
                `Image-to-image transformation. ` +
                `Maintain the exact structural room, background, walls, and floors exactly as they are. ` +
                `${lightingInstruction} ` +
                `Completely redesign all furniture within the room to match the ${style} aesthetic made of ${material}. ` +
                `Ensure perfect perspective and scale.`;
        } else {
            imagePrompt =
                `Image-to-image transformation. ` +
                `Maintain the exact structural room, background, walls, floors, and all other furniture exactly as they are. ` +
                `${lightingInstruction} ` +
                `Isolate ONLY the ${targetObject} and completely replace it with a new version designed in a ${style} aesthetic made of ${material}. ` +
                `Ensure perfect perspective and scale.`;
        }
    }

    console.log(`[generate-spatial] mode="${spatialMode}" lighting="${lighting}" prompt=${imagePrompt}`);

    try {
        const imageResult = await generateConceptualImage(imagePrompt, imageModel, originalImage);
        const imageUrl = `data:${imageResult.mimeType};base64,${imageResult.base64}`;

        return res.json({
            success: true,
            imageUrl,
            imagePrompt,
        });
    } catch (err) {
        console.error("[generate-spatial] error:", err);
        return res.status(500).json({
            success: false,
            error: err.message || "An error occurred during spatial image generation.",
        });
    }
});

/**
 * POST /api/generate-fashion
 * Accepts { mode, garment, fabric, pattern, season, sleeve,
 *           context, lighting, lens, originalImage, imageModel }
 * in the JSON body.
 * mode === 'seasonal'   → season-adaptive prompt with sleeve override.
 * mode === 'photoshoot'  → relocates subject to a new environment/lighting/lens.
 * mode === 'material' (default) → fabric + pattern redesign logic.
 * Response: { success, imageUrl, imagePrompt, metrics: { imageCost, modelUsed } }
 */
app.post("/api/generate-fashion", async (req, res) => {
    res.setTimeout(28000, () => {
        if (!res.headersSent) {
            res.status(504).json({ success: false, error: "Model is experiencing high usage — switch to a different image model" });
        }
    });

    const {
        mode, garment, fabric, pattern,
        season, sleeve, neckline, hemline, fit,
        context, lighting, lens, cameraTech,
        originalImage, imageModel,
    } = req.body ?? {};

    let imagePrompt;

    if (mode === "photoshoot") {
        // ── Photoshoot Director mode ─────────────────────────────────────
        imagePrompt =
            `Image-to-image transformation. Maintain the subject, their pose, facial features, and the exact garment design details. ` +
            `Completely replace the background to place the subject in a ${context}. ` +
            `Relight the scene to match a ${lighting} mood. ` +
            `Simulate the perspective of a ${lens}. ` +
            `Apply specific camera characteristics: ${cameraTech}. ` +
            `Ensure the lighting on the subject creates a cohesive composite with the new background.`;
    } else if (mode === "seasonal") {
        // ── Season-specific fabric instruction ───────────────────────────
        let seasonInstruction;
        if (season?.startsWith("Winter")) {
            seasonInstruction =
                "Reconstruct the garment using heavy, insulated fabrics like wool, down, or fleece. " +
                "Add layered elements, thicker collars, and thermal textures suitable for freezing temperatures.";
        } else if (season?.startsWith("Summer")) {
            seasonInstruction =
                "Reconstruct the garment using ultra-lightweight, breathable fabrics like linen, cotton, or sheer mesh. " +
                "Open up the cut for maximum airflow and heat reduction.";
        } else if (season?.startsWith("Monsoon")) {
            seasonInstruction =
                "Reconstruct the garment using waterproof, high-tech synthetic materials with a glossy or matte water-repellent finish. " +
                "Add functional elements like sealed zippers or a hood.";
        } else if (season?.startsWith("Autumn")) {
            seasonInstruction =
                "Reconstruct the garment using cozy, mid-weight textures like knitwear, corduroy, or flannel. " +
                "Focus on warmth and comfort.";
        } else {
            seasonInstruction = "Adapt the garment for the specified season.";
        }

        imagePrompt =
            `Image-to-image transformation. Maintain the subject, pose, and background exactly. ` +
            `Isolate the ${garment}. ${seasonInstruction} ` +
            `Crucially, alter the garment's structure to feature: ${sleeve}s, a ${neckline} neckline design, ` +
            `a ${hemline} hemline, and an overall ${fit} silhouette. ` +
            `Apply these structural changes logically to the targeted garment type while retaining its original branding DNA and color palette.`;
    } else {
        // ── Default / Material mode ──────────────────────────────────────
        let isolationInstruction;
        if (garment === "Entire Outfit") {
            isolationInstruction =
                "Completely redesign the subject's entire outfit.";
        } else {
            isolationInstruction =
                `Maintain the core subject, their pose, face, skin tone, background, and all other clothing items exactly as they are. ` +
                `Isolate ONLY the ${garment} and completely redesign it.`;
        }

        imagePrompt =
            `Image-to-image transformation. ${isolationInstruction} ` +
            `Change the material to ${fabric} featuring a ${pattern} design. ` +
            `Recalculate all physical tension points, folds, drape, and gravity to accurately reflect ` +
            `the weight and physical properties of the new fabric. ` +
            `Render as high-end editorial fashion photography.`;
    }

    console.log(`[generate-fashion] mode="${mode}" garment="${garment}" prompt=${imagePrompt}`);

    try {
        const imageResult = await generateConceptualImage(imagePrompt, imageModel, originalImage);
        const imageUrl = `data:${imageResult.mimeType};base64,${imageResult.base64}`;

        // ── Per-model cost calculation ───────────────────────────────────
        const MODEL_COSTS = {
            "gemini-3.1-flash-image-preview": 0.067,
            "gemini-3-pro-image-preview": 0.134,
            "gemini-2.5-flash-image": 0.039,
        };
        const imageCost = MODEL_COSTS[imageModel] ?? 0;

        return res.json({
            success: true,
            imageUrl,
            imagePrompt,
            metrics: {
                imageCost,
                modelUsed: imageModel,
            },
        });
    } catch (err) {
        console.error("[generate-fashion] error:", err);
        return res.status(500).json({
            success: false,
            error: err.message || "An error occurred during fashion image generation.",
        });
    }
});

// ── Serve React Frontend ──────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')));

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});

module.exports = { app, upload };
