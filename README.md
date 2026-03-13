# 🍌⚒️ Banana Forge

**A Multimodal Image-to-Image Transformation Engine**
*Submitted for the Gemini Live Agent Challenge*

## 📖 Overview
Banana Forge is a full-stack application that leverages the Gemini Live API to perform highly controlled, domain-specific image-to-image transformations. Moving beyond simple image overlays, Banana Forge computes realistic physical distortion, perspective skew, and environmental lighting to seamlessly integrate flat 2D assets or modify base images within specific physical contexts.

## ✨ Key Verticals
The engine handles complex transformations across three distinct categories:

* **👗 Fashion:** Calculates warp and weft distortions for woven fabric integrations. Features a dynamic **Seasonal Mode** that reconstructs garments structurally (e.g., transforming a base shirt into a heavy, insulated winter coat with specific necklines and sleeves) while retaining the original branding DNA and color palette.
* **🏗️ Spatial:** Integrates assets into architectural environments, calculating volumetric lighting, shadows, and perspective skews to match the base room's light source.
* **⚙️ Industrial:** Applies hard-surface material properties (like brushed metal or matte plastics) to hardware prototypes and 2D assets.

## 🧠 The "Secret Sauce": Deterministic Prompt Architecture
To prevent model hallucination and ensure photorealistic consistency, Banana Forge dynamically constructs the multimodal payload on the backend based on React UI states. 

Instead of vague prompts, the Node.js backend compiles strict conditional logic. For example, in the Fashion vertical's Seasonal mode, the engine explicitly commands the API to:
1. Maintain the exact subject, pose, and background.
2. Inject specific structural variables (sleeve type, hemline, fit).
3. Apply season-specific material instructions (e.g., "heavy, insulated fabrics like wool" for Winter vs. "breathable fabrics like linen" for Summer).

## 🛠️ Tech Stack
* **Frontend:** React.js
* **Backend:** Node.js, Express
* **AI / Engine:** Gemini Live API
* **Deployment:** Render

---

## 🚀 Local Setup & Installation

If you would like to run Banana Forge locally, follow these steps:

### Setup instructions
1. Clone the repository
```bash
git clone https://github.com/shazzy152/banana-forge.git
cd banana-forge

2. Install dependencies
npm install

3. Build and Run
npm run build
npm run start

Also, do not forget to update the server/.env file:
PORT=5000
GEMINI_API_KEY=your_actual_gemini_api_key_here
CLIENT_URL=http://localhost:3000
