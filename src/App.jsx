import { useState, useEffect, useMemo, useRef } from "react";
import "./App.css";

// ── Timeout-aware fetch wrapper ───────────────────────────────────────────────
async function fetchWithTimeout(url, options = {}, timeout = 30000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        return response;
    } catch (err) {
        if (err.name === "AbortError") {
            throw new Error("Model is experiencing high usage — switch to a different image model");
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

function App() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
    const [isLoading, setIsLoading] = useState(false);
    const [domain, setDomain] = useState(null);
    const [dnaData, setDnaData] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    // ── Model state ───────────────────────────────────────────────────────────
    const [selectedImageModel, setSelectedImageModel] = useState("gemini-2.5-flash-image");

    // ── Industrial Fabrication state ──────────────────────────────────────────
    const [industrialAnalysis, setIndustrialAnalysis] = useState(null);
    const [selectedProcess, setSelectedProcess] = useState("");
    const [selectedMaterial, setSelectedMaterial] = useState("");
    const [selectedFinish, setSelectedFinish] = useState("");
    const [selectedColor, setSelectedColor] = useState("");
    const [selectedFormFactor, setSelectedFormFactor] = useState("");
    const [isExplodedView, setIsExplodedView] = useState(false);
    const [isFabricating, setIsFabricating] = useState(false);
    const [fabricateResult, setFabricateResult] = useState(null);
    const [activeIndustrialTab, setActiveIndustrialTab] = useState("material");
    const [selectedCmfTheme, setSelectedCmfTheme] = useState("Premium Luxury (Gold & Leather)");
    const [selectedWearLevel, setSelectedWearLevel] = useState("Light Scuffs (1 Year)");

    // ── Spatial Design state ──────────────────────────────────────────────────
    const [spatialAnalysis, setSpatialAnalysis] = useState(null);
    const [selectedTarget, setSelectedTarget] = useState("");
    const [selectedStyle, setSelectedStyle] = useState("");
    const [selectedSpatialMaterial, setSelectedSpatialMaterial] = useState("");
    const [selectedLighting, setSelectedLighting] = useState("");
    const [spatialMode, setSpatialMode] = useState("redesign");
    const [objectsToRemove, setObjectsToRemove] = useState([]);
    const [isRedesigning, setIsRedesigning] = useState(false);
    const [spatialResult, setSpatialResult] = useState(null);

    // ── Fashion Design state ─────────────────────────────────────────────────
    const [fashionAnalysis, setFashionAnalysis] = useState(null);
    const [selectedGarment, setSelectedGarment] = useState("");
    const [selectedFabric, setSelectedFabric] = useState("");
    const [selectedPattern, setSelectedPattern] = useState("");
    const [isTailoring, setIsTailoring] = useState(false);
    const [fashionResult, setFashionResult] = useState(null);
    const [activeFashionTab, setActiveFashionTab] = useState("material");
    const [selectedSeason, setSelectedSeason] = useState("Winter (Heavy/Insulated)");
    const [selectedSleeve, setSelectedSleeve] = useState("Long Sleeve");
    const [selectedNeckline, setSelectedNeckline] = useState("Standard/Crew");
    const [selectedHemline, setSelectedHemline] = useState("Standard/Ankle-length");
    const [selectedFit, setSelectedFit] = useState("Regular/Straight");
    const [selectedContext, setSelectedContext] = useState("");
    const [selectedFashionLighting, setSelectedFashionLighting] = useState("");
    const [selectedLens, setSelectedLens] = useState("");
    const [selectedCameraTech, setSelectedCameraTech] = useState("");

    const fileInputRef = useRef(null);
    const [modalImage, setModalImage] = useState(null);

    // ── Clipboard paste listener ──────────────────────────────────────────────
    useEffect(() => {
        function handlePaste(e) {
            const files = e.clipboardData?.files;
            if (files && files.length > 0 && files[0].type.startsWith("image/")) {
                e.preventDefault();
                setSelectedFile(files[0]);
            }
        }

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, []);

    // ── Image preview URL (with automatic cleanup) ────────────────────────────
    const previewUrl = useMemo(() => {
        if (!selectedFile) return null;
        const url = URL.createObjectURL(selectedFile);
        return url;
    }, [selectedFile]);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    function handleFileChange(e) {
        setSelectedFile(e.target.files[0] || null);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!selectedFile) return;

        setIsLoading(true);
        setDnaData(null);
        setDomain(null);
        setErrorMessage(null);
        setIndustrialAnalysis(null);
        setFabricateResult(null);
        setSpatialAnalysis(null);
        setSpatialResult(null);
        setFashionAnalysis(null);
        setFashionResult(null);

        try {
            const formData = new FormData();
            formData.append("image", selectedFile);
            formData.append("model", selectedModel);

            const res = await fetchWithTimeout("/api/extract", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                const msg = errBody.message || errBody.error || "Something went wrong";
                setErrorMessage(msg);
                setIsLoading(false);
                return;
            }

            const data = await res.json();

            // ── INDUSTRIAL dynamic category ───────────────────────────────
            if (data.category === "INDUSTRIAL" && data.analysis?.dynamicOptions) {
                setDomain("INDUSTRIAL");
                setIndustrialAnalysis(data.analysis);

                const opts = data.analysis.dynamicOptions;
                setSelectedProcess(opts.manufacturingProcesses?.[0] ?? "");
                setSelectedMaterial(opts.materials?.[0] ?? "");
                setSelectedFinish(opts.finishes?.[0] ?? "");
                setSelectedColor(opts.colors?.[0] ?? "");
                setSelectedFormFactor(opts.formFactors?.[0] ?? "");
                setSelectedCmfTheme(opts.cmfThemes?.[0] ?? "Premium Luxury (Gold & Leather)");
                setSelectedWearLevel(opts.wearLevels?.[0] ?? "Light Scuffs (1 Year)");

                setDnaData({
                    inputTokens: data.inputTokens,
                    outputTokens: data.outputTokens,
                    totalTokens: data.totalTokens,
                    costInDollars: data.costInDollars,
                });

                // ── SPATIAL dynamic category ──────────────────────────────────
            } else if (data.category === "SPATIAL" && data.analysis?.dynamicOptions) {
                setDomain("SPATIAL");
                setSpatialAnalysis(data.analysis);

                const opts = data.analysis.dynamicOptions;
                setSelectedTarget(opts.targetObjects?.[0] ?? "");
                setSelectedStyle(opts.designStyles?.[0] ?? "");
                setSelectedSpatialMaterial(opts.materialsAndColors?.[0] ?? "");
                setSelectedLighting(opts.lightingMoods?.[0] ?? "");

                setDnaData({
                    inputTokens: data.inputTokens,
                    outputTokens: data.outputTokens,
                    totalTokens: data.totalTokens,
                    costInDollars: data.costInDollars,
                });

                // ── FASHION dynamic category ──────────────────────────────────
            } else if (data.category === "FASHION" && data.analysis?.dynamicOptions) {
                setDomain("FASHION");
                setFashionAnalysis(data.analysis);

                const opts = data.analysis.dynamicOptions;
                setSelectedGarment(opts.targetGarments?.[0] ?? "");
                setSelectedFabric(opts.fabricTypes?.[0] ?? "");
                setSelectedPattern(opts.patternsAndColors?.[0] ?? "");
                setSelectedContext(opts.photoshootContexts?.[0] ?? "");
                setSelectedFashionLighting(opts.lightingMoods?.[0] ?? "");
                setSelectedLens(opts.cameraAngles?.[0] ?? "");
                setSelectedCameraTech(opts.cameraTechs?.[0] ?? "");

                setDnaData({
                    inputTokens: data.inputTokens,
                    outputTokens: data.outputTokens,
                    totalTokens: data.totalTokens,
                    costInDollars: data.costInDollars,
                });
            } else if (data.domain && data.dnaData) {
                setDomain(data.domain);
                setDnaData({
                    ...data.dnaData,
                    inputTokens: data.inputTokens,
                    outputTokens: data.outputTokens,
                    totalTokens: data.totalTokens,
                    costInDollars: data.costInDollars,
                });
            } else {
                setDomain(null);
                setDnaData(data);
            }
        } catch (err) {
            console.error("Error:", err.message);
            setErrorMessage(err.message || "An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    }


    // ── Fabrication handler ───────────────────────────────────────────────────
    async function handleFabricate() {
        setIsFabricating(true);
        setFabricateResult(null);
        setErrorMessage(null);

        try {
            // Convert the uploaded image to a base64 string.
            let originalImage = null;
            if (selectedFile) {
                originalImage = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result.split(",")[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(selectedFile);
                });
            }

            const payload = { originalImage, imageModel: selectedImageModel, isExplodedView };

            if (activeIndustrialTab === "cmf") {
                payload.mode = "cmf";
                payload.cmfTheme = selectedCmfTheme;
            } else if (activeIndustrialTab === "stress") {
                payload.mode = "stress";
                payload.wearLevel = selectedWearLevel;
            } else {
                payload.mode = "material";
                payload.manufacturingProcess = selectedProcess;
                payload.material = selectedMaterial;
                payload.finish = selectedFinish;
                payload.color = selectedColor;
                payload.formFactor = selectedFormFactor;
            }

            console.log("Sending payload:", payload);

            const res = await fetchWithTimeout("/api/generate-industrial", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.error || "Fabrication request failed");
            }

            const data = await res.json();
            setFabricateResult(data);
        } catch (err) {
            console.error("Fabricate error:", err.message);
            setErrorMessage(err.message || "Fabrication failed");
        } finally {
            setIsFabricating(false);
        }
    }

    // ── Spatial Design handler ────────────────────────────────────────────────
    async function handleSpatialDesign() {
        setIsRedesigning(true);
        setSpatialResult(null);
        setErrorMessage(null);

        try {
            // Convert the uploaded image to a base64 string.
            let originalImage = null;
            if (selectedFile) {
                originalImage = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result.split(",")[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(selectedFile);
                });
            }

            const res = await fetchWithTimeout("/api/generate-spatial", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    originalImage,
                    spatialMode,
                    targetObject: selectedTarget,
                    objectsToRemove,
                    style: selectedStyle,
                    material: selectedSpatialMaterial,
                    lighting: selectedLighting,
                    imageModel: selectedImageModel,
                }),
            });

            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.error || "Spatial redesign request failed");
            }

            const data = await res.json();
            setSpatialResult(data);
        } catch (err) {
            console.error("Spatial design error:", err.message);
            setErrorMessage(err.message || "Spatial redesign failed");
        } finally {
            setIsRedesigning(false);
        }
    }

    // ── Fashion Design handler ────────────────────────────────────────────────
    async function handleFashionDesign() {
        setIsTailoring(true);
        setFashionResult(null);
        setErrorMessage(null);

        try {
            // Convert the uploaded image to a base64 string.
            let originalImage = null;
            if (selectedFile) {
                originalImage = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result.split(",")[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(selectedFile);
                });
            }

            const payload = { originalImage, imageModel: selectedImageModel };

            if (activeFashionTab === "material") {
                payload.mode = "material";
                payload.garment = selectedGarment;
                payload.fabric = selectedFabric;
                payload.pattern = selectedPattern;
            } else if (activeFashionTab === "seasonal") {
                payload.mode = "seasonal";
                payload.garment = selectedGarment;
                payload.season = selectedSeason;
                payload.sleeve = selectedSleeve;
                payload.neckline = selectedNeckline;
                payload.hemline = selectedHemline;
                payload.fit = selectedFit;
            } else if (activeFashionTab === "photoshoot") {
                payload.mode = "photoshoot";
                payload.context = selectedContext;
                payload.lighting = selectedFashionLighting;
                payload.lens = selectedLens;
                payload.cameraTech = selectedCameraTech;
            }

            const res = await fetchWithTimeout("/api/generate-fashion", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.error || "Fashion design request failed");
            }

            const data = await res.json();
            setFashionResult(data);
        } catch (err) {
            console.error("Fashion design error:", err.message);
            setErrorMessage(err.message || "Fashion design failed");
        } finally {
            setIsTailoring(false);
        }
    }

    // ── Recursive value renderer ──────────────────────────────────────────────
    function renderValue(key, value) {
        // ─ colorPalette: render swatches ─────────────────────────────────────
        if (key === "colorPalette" && value && typeof value === "object" && !Array.isArray(value)) {
            return (
                <div>
                    {Object.entries(value).map(([group, hex]) => {
                        const swatches = Array.isArray(hex) ? hex : [hex];
                        return (
                            <div key={group} style={{ marginBottom: "6px" }}>
                                <em style={{ textTransform: "capitalize" }}>{group}:</em>
                                <ul style={{ margin: "4px 0 0 0", paddingLeft: 0 }}>
                                    {swatches.map((h) => (
                                        <li key={h} style={{ display: "flex", alignItems: "center", gap: "8px", listStyle: "none", marginBottom: "3px" }}>
                                            <span style={{
                                                display: "inline-block",
                                                width: "18px",
                                                height: "18px",
                                                borderRadius: "3px",
                                                backgroundColor: h,
                                                border: "1px solid #ccc",
                                                flexShrink: 0,
                                            }} />
                                            {h}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            );
        }

        // ─ Array ──────────────────────────────────────────────────────────────
        if (Array.isArray(value)) {
            return (
                <ul style={{ paddingLeft: "18px", margin: "4px 0" }}>
                    {value.map((item, i) => (
                        <li key={i}>{typeof item === "object" ? renderValue(key, item) : String(item)}</li>
                    ))}
                </ul>
            );
        }

        // ─ Nested object ──────────────────────────────────────────────────────
        if (typeof value === "object" && value !== null) {
            return (
                <div style={{ paddingLeft: "12px", borderLeft: "2px solid #e5e7eb", marginTop: "4px" }}>
                    {Object.entries(value).map(([k, v]) => (
                        <div key={k} style={{ marginBottom: "6px" }}>
                            <strong style={{ textTransform: "capitalize" }}>{k.replace(/([A-Z])/g, " $1")}:</strong>
                            {renderValue(k, v)}
                        </div>
                    ))}
                </div>
            );
        }

        // ─ Primitive ──────────────────────────────────────────────────────────
        return <span> {String(value)}</span>;
    }

    const TOKEN_KEYS = new Set(["inputTokens", "outputTokens", "totalTokens", "costInDollars"]);

    return (
        <div className="app-shell">

            {/* ═══════════════════════════════════════════════════════════════
                TOP HEADER
            ═══════════════════════════════════════════════════════════════ */}
            <header className="top-header">
                <div className="header-logo">
                    🍌 Banana Forge
                    <span className="separator">|</span>
                    <span className="subtitle">Multimodal Design Intelligence: Product · Fashion · Spatial</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {domain && (
                        <div className="domain-badge">
                            Category: {domain}
                        </div>
                    )}
                </div>
            </header>

            {/* ═══════════════════════════════════════════════════════════════
                MAIN CONTAINER — two columns
            ═══════════════════════════════════════════════════════════════ */}
            <div className="main-container">

                {/* ─────────────────────────────────────────────────────────
                    LEFT COLUMN — Workspace
                ───────────────────────────────────────────────────────── */}
                <div className="workspace-column">

                    {/* ── Hidden file input ────────────────────────────── */}
                    <input
                        ref={fileInputRef}
                        id="image-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleFileChange}
                        style={{ display: "none" }}
                    />

                    {/* ── Upload bar / Progress bar (swap) ────────────── */}
                    {(isLoading || isFabricating || isRedesigning || isTailoring) ? (
                        <div className="progress-bar-track">
                            <div className="progress-bar-fill">
                                ANALYZING: Processing design parameters…
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="upload-bar">
                            <div
                                id="dropzone"
                                className="dropzone"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {previewUrl
                                    ? <span style={{ fontWeight: 600, color: "#0d9488" }}>✓ Image loaded — click to change</span>
                                    : <span className="dropzone-text">Click to select a file, or <kbd>⌘V</kbd> to paste</span>
                                }
                            </div>
                            <button
                                id="submit-btn"
                                type="submit"
                                className="btn-primary"
                                disabled={!selectedFile || isLoading}
                            >
                                Analyze
                            </button>
                        </form>
                    )}

                    {/* ── Error banner ─────────────────────────────────── */}
                    {errorMessage && (
                        <div id="error-banner" className="error-banner" role="alert">
                            Error: {errorMessage}
                        </div>
                    )}

                    {/* ── Side-by-side Image Workspace ─────────────────── */}
                    {(() => {
                        const resultImage =
                            fabricateResult?.imageUrl ||
                            spatialResult?.imageUrl ||
                            fashionResult?.imageUrl ||
                            null;

                        const resultPrompt =
                            fabricateResult?.imagePrompt ||
                            spatialResult?.imagePrompt ||
                            fashionResult?.imagePrompt ||
                            null;

                        return (
                            <div className="image-workspace">
                                {/* ── Input Sketch (Left Pane) ────────────── */}
                                <div className="image-pane">
                                    {previewUrl ? (
                                        <>
                                            <img
                                                id="image-preview"
                                                src={previewUrl}
                                                alt="Input sketch"
                                                style={{ cursor: "pointer" }}
                                                onClick={() => setModalImage(previewUrl)}
                                            />
                                            <div className="image-pane-label">Input Sketch</div>
                                        </>
                                    ) : (
                                        <div className="render-placeholder">
                                            <div className="render-placeholder-icon">🖼️</div>
                                            <div className="render-placeholder-text">No image uploaded</div>
                                        </div>
                                    )}
                                </div>

                                {/* ── AI Render (Right Pane) ──────────────── */}
                                <div className="image-pane">
                                    {resultImage ? (
                                        <>
                                            <img
                                                src={resultImage}
                                                alt="AI render"
                                                style={{ cursor: "pointer" }}
                                                onClick={() => setModalImage(resultImage)}
                                            />
                                            <div className="image-pane-label">AI Render</div>
                                        </>
                                    ) : (
                                        <div className="render-placeholder">
                                            <div className="render-placeholder-icon">✨</div>
                                            <div className="render-placeholder-text">
                                                {(isFabricating || isRedesigning || isTailoring)
                                                    ? "Generating…"
                                                    : "AI render will appear here"}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                </div>

                {/* ─────────────────────────────────────────────────────────
                    RIGHT COLUMN — Control Panel
                ───────────────────────────────────────────────────────── */}
                <div className="control-panel">

                    {/* ── Model selectors ──────────────────────────────── */}
                    <div className="section-label">Models</div>

                    <div className="model-selector-group">
                        <div>
                            <label htmlFor="model-select">Analysis</label>
                            <select
                                id="model-select"
                                className="model-select"
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                            >
                                <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                                <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                                <option value="gemini-3-flash-preview">gemini-3-flash-preview</option>
                                <option value="gemini-3.1-flash-lite-preview">gemini-3.1-flash-lite-preview</option>
                                <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="image-model-select">Image Gen</label>
                            <select
                                id="image-model-select"
                                className="model-select"
                                value={selectedImageModel}
                                onChange={(e) => setSelectedImageModel(e.target.value)}
                            >
                                <option value="gemini-3.1-flash-image-preview">Nano Banana 2</option>
                                <option value="gemini-3-pro-image-preview">Nano Banana Pro</option>
                                <option value="gemini-2.5-flash-image">Nano Banana</option>
                            </select>
                        </div>
                    </div>

                    <hr className="divider" />

                    {/* ══════════════════════════════════════════════════════
                        INDUSTRIAL — Fabrication Sandbox controls
                    ══════════════════════════════════════════════════════ */}
                    {domain === "INDUSTRIAL" && industrialAnalysis?.dynamicOptions && (
                        <div id="fabrication-sandbox">
                            <div className="section-label">Fabrication Sandbox</div>

                            {/* Exploded view toggle (independent of tabs) */}
                            <label className="checkbox-label">
                                <input
                                    id="exploded-view-toggle"
                                    type="checkbox"
                                    checked={isExplodedView}
                                    onChange={(e) => setIsExplodedView(e.target.checked)}
                                />
                                <span className="custom-checkbox" />
                                <span>Render as Exploded View Diagram</span>
                            </label>

                            {/* Tab navigation */}
                            <div className="tab-group">
                                {[
                                    { id: "material", label: "Material Matrix", tip: "Swap materials, finishes, and colors on the detected object" },
                                    { id: "cmf", label: "CMF Storyteller", tip: "Apply a full Color-Material-Finish design language theme" },
                                    { id: "stress", label: "Stress Test", tip: "Simulate realistic physical wear-and-tear aging on the object" },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        id={`industrial-tab-${tab.id}`}
                                        className={`tab-btn${activeIndustrialTab === tab.id ? " active" : ""}`}
                                        onClick={() => setActiveIndustrialTab(tab.id)}
                                        title={tab.tip}
                                        data-tooltip={tab.tip}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Material Matrix tab */}
                            {activeIndustrialTab === "material" && (
                                <div className="options-grid">
                                    <div>
                                        <label htmlFor="process-select">Manufacturing Process</label>
                                        <select id="process-select" value={selectedProcess} onChange={(e) => setSelectedProcess(e.target.value)}>
                                            {industrialAnalysis.dynamicOptions.manufacturingProcesses?.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="material-select">Material</label>
                                        <select id="material-select" value={selectedMaterial} onChange={(e) => setSelectedMaterial(e.target.value)}>
                                            {industrialAnalysis.dynamicOptions.materials?.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="finish-select">Finish</label>
                                        <select id="finish-select" value={selectedFinish} onChange={(e) => setSelectedFinish(e.target.value)}>
                                            {industrialAnalysis.dynamicOptions.finishes?.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="color-select">Color</label>
                                        <select id="color-select" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)}>
                                            {industrialAnalysis.dynamicOptions.colors?.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="formfactor-select">Form Factor</label>
                                        <select id="formfactor-select" value={selectedFormFactor} onChange={(e) => setSelectedFormFactor(e.target.value)}>
                                            {industrialAnalysis.dynamicOptions.formFactors?.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* CMF Storyteller tab */}
                            {activeIndustrialTab === "cmf" && (
                                <div className="options-grid">
                                    <div>
                                        <label htmlFor="cmf-theme-select">CMF Theme</label>
                                        <select id="cmf-theme-select" value={selectedCmfTheme} onChange={(e) => setSelectedCmfTheme(e.target.value)}>
                                            {industrialAnalysis.dynamicOptions.cmfThemes?.length
                                                ? industrialAnalysis.dynamicOptions.cmfThemes.map((theme, i) => (
                                                    <option key={i} value={theme}>{theme}</option>
                                                ))
                                                : <option disabled>Analyze image to generate options…</option>
                                            }
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Stress Test tab */}
                            {activeIndustrialTab === "stress" && (
                                <div className="options-grid">
                                    <div>
                                        <label htmlFor="wear-level-select">Wear Level</label>
                                        <select id="wear-level-select" value={selectedWearLevel} onChange={(e) => setSelectedWearLevel(e.target.value)}>
                                            {industrialAnalysis.dynamicOptions.wearLevels?.length
                                                ? industrialAnalysis.dynamicOptions.wearLevels.map((wear, i) => (
                                                    <option key={i} value={wear}>{wear}</option>
                                                ))
                                                : <option disabled>Analyze image to generate options…</option>
                                            }
                                        </select>
                                    </div>
                                </div>
                            )}



                            {isFabricating ? (
                                <>
                                    <div className="spinner" />
                                    <p className="loading-text">Analyzing material properties…</p>
                                </>
                            ) : (
                                <button id="fabricate-btn" className="btn-generate" onClick={handleFabricate}>
                                    ⚡ Fabricate Concept
                                </button>
                            )}
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════════
                        SPATIAL — Spatial Isolator controls
                    ══════════════════════════════════════════════════════ */}
                    {domain === "SPATIAL" && spatialAnalysis?.dynamicOptions && (
                        <div id="spatial-isolator">
                            <div className="section-label">Spatial Isolator</div>

                            {/* Mode selector */}
                            <div className="options-grid">
                                <div>
                                    <label htmlFor="spatial-mode-select">Mode</label>
                                    <select
                                        id="spatial-mode-select"
                                        value={spatialMode}
                                        onChange={(e) => { setSpatialMode(e.target.value); setObjectsToRemove([]); }}
                                    >
                                        <option value="redesign">Redesign Object(s)</option>
                                        <option value="remove">Remove Object(s)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Redesign mode */}
                            {spatialMode === "redesign" && (
                                <div className="options-grid">
                                    <div>
                                        <label htmlFor="target-select">Target Object</label>
                                        <select id="target-select" value={selectedTarget} onChange={(e) => setSelectedTarget(e.target.value)}>
                                            {spatialAnalysis.dynamicOptions.targetObjects?.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="style-select">Design Style</label>
                                        <select id="style-select" value={selectedStyle} onChange={(e) => setSelectedStyle(e.target.value)}>
                                            {spatialAnalysis.dynamicOptions.designStyles?.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="spatial-material-select">Material &amp; Color</label>
                                        <select id="spatial-material-select" value={selectedSpatialMaterial} onChange={(e) => setSelectedSpatialMaterial(e.target.value)}>
                                            {spatialAnalysis.dynamicOptions.materialsAndColors?.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Remove mode */}
                            {spatialMode === "remove" && (
                                <div style={{ marginBottom: "16px" }}>
                                    <strong style={{ display: "block", marginBottom: "8px", fontSize: "0.82rem" }}>Select objects to remove:</strong>
                                    {spatialAnalysis.dynamicOptions.targetObjects?.map((obj) => (
                                        <label key={obj} className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={objectsToRemove.includes(obj)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setObjectsToRemove((prev) => [...prev, obj]);
                                                    } else {
                                                        setObjectsToRemove((prev) => prev.filter((o) => o !== obj));
                                                    }
                                                }}
                                            />
                                            <span className="custom-checkbox" />
                                            <span>{obj}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {/* Lighting (always visible) */}
                            <div className="options-grid">
                                <div>
                                    <label htmlFor="lighting-select">Lighting Mood</label>
                                    <select id="lighting-select" value={selectedLighting} onChange={(e) => setSelectedLighting(e.target.value)}>
                                        {spatialAnalysis.dynamicOptions.lightingMoods?.map((opt) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>


                            {isRedesigning ? (
                                <>
                                    <div className="spinner" />
                                    <p className="loading-text">Reimagining the space…</p>
                                </>
                            ) : (
                                <button id="redesign-space-btn" className="btn-generate" onClick={handleSpatialDesign}>
                                    ⚡ Redesign Space
                                </button>
                            )}
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════════
                        FASHION — Fashion Matrix controls
                    ══════════════════════════════════════════════════════ */}
                    {domain === "FASHION" && fashionAnalysis?.dynamicOptions && (
                        <div id="fashion-matrix">
                            <div className="section-label">Fashion Matrix</div>

                            {/* Tab navigation */}
                            <div className="tab-group">
                                <button
                                    id="tab-material-lab"
                                    className={`tab-btn${activeFashionTab === "material" ? " active" : ""}`}
                                    onClick={() => setActiveFashionTab("material")}
                                    title="Swap fabrics, patterns, and colors on the garment"
                                    data-tooltip="Swap fabrics, patterns, and colors on the garment"
                                >
                                    Material Lab
                                </button>
                                <button
                                    id="tab-seasonal-adapter"
                                    className={`tab-btn${activeFashionTab === "seasonal" ? " active" : ""}`}
                                    onClick={() => setActiveFashionTab("seasonal")}
                                    title="Adapt the garment for a different season with sleeve, fit & neckline controls"
                                    data-tooltip="Adapt the garment for a different season with sleeve, fit & neckline controls"
                                >
                                    Seasonal
                                </button>
                                <button
                                    id="tab-photoshoot-director"
                                    className={`tab-btn${activeFashionTab === "photoshoot" ? " active" : ""}`}
                                    onClick={() => setActiveFashionTab("photoshoot")}
                                    title="Relocate the subject into a new environment with custom lighting & lens"
                                    data-tooltip="Relocate the subject into a new environment with custom lighting & lens"
                                >
                                    Photoshoot
                                </button>
                            </div>

                            {/* ── Material Lab ────────────────────────────── */}
                            {activeFashionTab === "material" && (
                                <div id="fashion-tab-material">
                                    <div className="options-grid">
                                        <div>
                                            <label htmlFor="garment-select">Target Garment</label>
                                            <select id="garment-select" value={selectedGarment} onChange={(e) => setSelectedGarment(e.target.value)}>
                                                {fashionAnalysis.dynamicOptions.targetGarments?.map((opt) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="fabric-select">Fabric Type</label>
                                            <select id="fabric-select" value={selectedFabric} onChange={(e) => setSelectedFabric(e.target.value)}>
                                                {fashionAnalysis.dynamicOptions.fabricTypes?.map((opt) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="pattern-select">Pattern &amp; Color</label>
                                            <select id="pattern-select" value={selectedPattern} onChange={(e) => setSelectedPattern(e.target.value)}>
                                                {fashionAnalysis.dynamicOptions.patternsAndColors?.map((opt) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>


                                    {isTailoring ? (
                                        <div className="spinner" />
                                    ) : (
                                        <button id="tailor-btn" className="btn-generate" onClick={handleFashionDesign}>
                                            ⚡ Tailor Garment
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* ── Seasonal Adapter ────────────────────────── */}
                            {activeFashionTab === "seasonal" && (
                                <div id="fashion-tab-seasonal">
                                    <div className="options-grid">
                                        <div>
                                            <label htmlFor="garment-select-seasonal">Target Garment</label>
                                            <select id="garment-select-seasonal" value={selectedGarment} onChange={(e) => setSelectedGarment(e.target.value)}>
                                                {fashionAnalysis.dynamicOptions.targetGarments?.map((opt) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="season-select">Season</label>
                                            <select id="season-select" value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)}>
                                                <option value="Summer (Light/Breathable)">Summer (Light/Breathable)</option>
                                                <option value="Winter (Heavy/Insulated)">Winter (Heavy/Insulated)</option>
                                                <option value="Monsoon (Waterproof/Tech)">Monsoon (Waterproof/Tech)</option>
                                                <option value="Autumn (Layered/Knit)">Autumn (Layered/Knit)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="sleeve-select">Sleeve Style</label>
                                            <select id="sleeve-select" value={selectedSleeve} onChange={(e) => setSelectedSleeve(e.target.value)}>
                                                <option value="Sleeveless">Sleeveless</option>
                                                <option value="Short Sleeve">Short Sleeve</option>
                                                <option value="3/4 Sleeve">3/4 Sleeve</option>
                                                <option value="Long Sleeve">Long Sleeve</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="neckline-select">Neckline &amp; Collar</label>
                                            <select id="neckline-select" value={selectedNeckline} onChange={(e) => setSelectedNeckline(e.target.value)}>
                                                <option value="Standard/Crew">Standard/Crew</option>
                                                <option value="Deep V-Neck/Open">Deep V-Neck/Open</option>
                                                <option value="Turtleneck/High-Roll">Turtleneck/High-Roll</option>
                                                <option value="Collared/Button-up">Collared/Button-up</option>
                                                <option value="Off-Shoulder">Off-Shoulder</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="hemline-select">Hemline &amp; Length</label>
                                            <select id="hemline-select" value={selectedHemline} onChange={(e) => setSelectedHemline(e.target.value)}>
                                                <option value="Standard/Ankle-length">Standard/Ankle-length</option>
                                                <option value="Micro/Mini (Short)">Micro/Mini (Short)</option>
                                                <option value="Midi/Calf-length">Midi/Calf-length</option>
                                                <option value="Floor-length/Stacked">Floor-length/Stacked</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="fit-select">Silhouette &amp; Fit</label>
                                            <select id="fit-select" value={selectedFit} onChange={(e) => setSelectedFit(e.target.value)}>
                                                <option value="Regular/Straight">Regular/Straight</option>
                                                <option value="Slim/Tapered">Slim/Tapered</option>
                                                <option value="Loose/Oversized">Loose/Oversized</option>
                                                <option value="Flowy/Wide-leg">Flowy/Wide-leg</option>
                                                <option value="Structured/Cargo">Structured/Cargo</option>
                                            </select>
                                        </div>
                                    </div>


                                    {isTailoring ? (
                                        <div className="spinner" />
                                    ) : (
                                        <button id="adapt-season-btn" className="btn-generate" onClick={handleFashionDesign}>
                                            ⚡ Adapt to Season
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* ── Photoshoot Director ──────────────────────── */}
                            {activeFashionTab === "photoshoot" && (
                                <div id="fashion-tab-photoshoot">
                                    <div className="options-grid">
                                        <div>
                                            <label htmlFor="context-select">Context / Scene</label>
                                            <select id="context-select" value={selectedContext} onChange={(e) => setSelectedContext(e.target.value)}>
                                                {fashionAnalysis.dynamicOptions.photoshootContexts?.map((opt) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="fashion-lighting-select">Lighting</label>
                                            <select id="fashion-lighting-select" value={selectedFashionLighting} onChange={(e) => setSelectedFashionLighting(e.target.value)}>
                                                {fashionAnalysis.dynamicOptions.lightingMoods?.map((opt) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="lens-select">Lens / Perspective</label>
                                            <select id="lens-select" value={selectedLens} onChange={(e) => setSelectedLens(e.target.value)}>
                                                {fashionAnalysis.dynamicOptions.cameraAngles?.map((opt) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="camera-tech-select">Camera Tech / Film Look</label>
                                            <select id="camera-tech-select" value={selectedCameraTech} onChange={(e) => setSelectedCameraTech(e.target.value)}>
                                                {fashionAnalysis.dynamicOptions.cameraTechs?.map((opt) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>


                                    {isTailoring ? (
                                        <div className="spinner" />
                                    ) : (
                                        <button id="transport-subject-btn" className="btn-generate" onClick={handleFashionDesign}>
                                            ⚡ Transport Subject
                                        </button>
                                    )}
                                </div>
                            )}

                            {isTailoring && (
                                <p className="loading-text">
                                    {activeFashionTab === "material"
                                        ? "Crafting your garment design…"
                                        : activeFashionTab === "seasonal"
                                            ? "Adapting garment for the season…"
                                            : "Directing the photoshoot…"}
                                </p>
                            )}
                        </div>
                    )}

                    {/* ── No domain yet — hint ────────────────────────── */}
                    {!domain && (
                        <div className="workspace-empty" style={{ flex: 1 }}>
                            <div className="workspace-empty-icon">⚙️</div>
                            <span>Controls will appear here after analysis</span>
                        </div>
                    )}
                </div>

            </div>

            {/* ═══════════════════════════════════════════════════════════════
                IMAGE LIGHTBOX MODAL
            ═══════════════════════════════════════════════════════════════ */}
            {modalImage && (
                <div
                    className="image-modal-overlay"
                    onClick={() => setModalImage(null)}
                    onKeyDown={(e) => e.key === "Escape" && setModalImage(null)}
                    tabIndex={-1}
                    role="dialog"
                >
                    <img
                        src={modalImage}
                        alt="Enlarged view"
                        className="image-modal-content"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}

export default App;

