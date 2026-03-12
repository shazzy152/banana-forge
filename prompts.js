// ── Classifier ────────────────────────────────────────────────────────────────
const CLASSIFIER_PROMPT =
    "Analyze this image and categorize it into exactly ONE of these domains: " +
    "INDUSTRIAL, SPATIAL, or FASHION. " +
    "If the image is unrecognizable, pure text, or does not fit any design category, " +
    "return strictly the word: UNKNOWN.";

// ── Domain extraction prompts ─────────────────────────────────────────────────
const EXTRACTION_PROMPTS = {
    INDUSTRIAL:
        "Act as a master industrial designer. Analyze this product image. " +
        "You MUST return a raw JSON object (no markdown formatting) with two top-level keys: " +
        '"description" (a brief 2-sentence visual analysis) and "dynamicOptions". ' +
        'Inside "dynamicOptions", provide 7 arrays of strings containing highly relevant, ' +
        "realistic options for redesigning this specific product. " +
        'The keys must be: "manufacturingProcesses", "materials", "finishes", "colors", "formFactors", "cmfThemes", and "wearLevels". ' +
        'For the "formFactors" array, provide 4-5 descriptive industrial design languages or structural styles ' +
        "relevant to this object (e.g., Rugged & Utilitarian, Sleek & Aerodynamic, Brutalist, High-Tech Medical). " +
        'For the "cmfThemes" array, provide 4-5 highly specific, cohesive Color, Material, and Finish (CMF) design languages ' +
        "tailored to this exact product. Each theme should be a rich, evocative phrase that names the material palette and aesthetic " +
        "(e.g., for a camera: 'Vintage Leica Brass & Hand-Stitched Leather', 'Matte Magnesium Alloy & Carbon Fibre Grip', " +
        "'Transparent Skeleton & Anodized Titanium'; for furniture: 'Mid-Century Teak & Bouclé Upholstery', " +
        "'Japandi Washi Paper & Pale Ash Wood'). Make every theme specific to this object's function and user context. " +
        'For the "wearLevels" array, provide 4-5 realistic physical aging or stress scenarios appropriate for ' +
        "how this specific object is actually used in the real world. Each option should describe the type and severity of wear " +
        "(e.g., for a power tool: 'Construction Site Dust & Deep Gouge Scratches', 'Prolonged UV Fade & Grip Rubber Cracking'; " +
        "for a watch: 'Desk-Diving Micro-scratches & Lume Fade', 'Adventure Hiking Dings & Bezel Wear'; " +
        "for a sneaker: 'Six-Month Daily Wear Creasing & Sole Yellowing', 'Festival Mud & Fraying Lace Ends'). " +
        "Provide 4-5 options for each array.",


    SPATIAL:
        "Act as a master interior architect. Analyze this interior photo. " +
        "You MUST return a raw JSON object (no markdown) with two top-level keys: " +
        '"description" (a brief spatial analysis) and "dynamicOptions". ' +
        'Inside "dynamicOptions", provide 4 arrays of strings. ' +
        'The keys must be: "targetObjects" (identify 4-5 specific prominent items in the room, ' +
        'e.g., "Main Sofa", "Central Rug", "Dining Table", plus add "Entire Room" as the first option), ' +
        '"designStyles" (e.g., Bauhaus, Japandi, Mid-Century Modern), ' +
        '"materialsAndColors" (e.g., Emerald Green Velvet, Raw Blonde Wood), and ' +
        '"lightingMoods". ' +
        'For "lightingMoods", the FIRST item in the array MUST accurately describe the actual lighting ' +
        'currently present in the photo, prefixed strictly with "Original:" ' +
        '(e.g., "Original: Bright Mid-Day Sunlight"). ' +
        "The remaining 3-4 items should be alternative lighting moods " +
        "(e.g., Golden Hour Sunlight, Moody Cinematic Night, Soft Overcast Morning). " +
        "Provide 4-5 options for each array.",

    FASHION:
        "Act as a master fashion designer, tailor, and creative director. Analyze this outfit and subject. " +
        "You MUST return a raw JSON object (no markdown) with two top-level keys: " +
        '"description" (a brief visual analysis) and "dynamicOptions". ' +
        'Inside "dynamicOptions", provide 7 arrays of strings. ' +
        'The keys must be: "targetGarments" (identify 3-4 specific pieces being worn, ' +
        'e.g., "Main Jacket", "Trousers", plus "Entire Outfit" as the first option), ' +
        '"fabricTypes" (e.g., Heavy Raw Denim, Translucent Silk, Chunky Knit Wool), ' +
        '"patternsAndColors" (e.g., Matte Black Solid, Geometric Houndstooth, Cyberpunk Circuitry), ' +
        '"photoshootContexts" (provide 4-5 distinct, vivid settings that would suit this specific outfit, ' +
        'e.g., "Parisian Street Cafe", "Neon Cyberpunk Alley", "Minimalist Concrete Studio"), ' +
        '"lightingMoods" (provide 4-5 lighting setups that complement the outfit, ' +
        'e.g., "Golden Hour Backlight", "Studio Softbox High-Key", "Moody Film Noir Shadows"), ' +
        '"cameraAngles" (provide 4-5 perspective choices best for this look, ' +
        'e.g., "Low Angle Hero Shot", "Eye-Level Portrait", "Wide Angle Full Body"), and ' +
        '"cameraTechs" (provide 4-5 technical camera effects, ' +
        'e.g., "f/1.8 Shallow Depth of Field (Bokeh)", "Motion Blur/Long Exposure", ' +
        '"Kodak Portra 400 Film Grain", "Crisp f/8 Deep Focus"). ' +
        "IMPORTANT: Tailor ALL photoshoot recommendations specifically to the style of the analyzed garment. " +
        "For example, if it is streetwear, suggest urban contexts and fisheye or low-angle lenses; " +
        "if it is a formal gown, suggest ballrooms and telephoto portrait lenses. " +
        "Provide 4-5 options for each array.",
};

module.exports = { CLASSIFIER_PROMPT, EXTRACTION_PROMPTS };
