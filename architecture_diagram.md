# System Architecture

This document provides a visual representation of how the application components connect with each other, including the frontend, backend, local file system, and Google Gemini API.

```mermaid
graph TD
    %% Define Styles
    classDef frontend fill:#61DAFB,stroke:#333,stroke-width:2px,color:#000
    classDef backend fill:#68A063,stroke:#333,stroke-width:2px,color:#000
    classDef storage fill:#ffb84d,stroke:#333,stroke-width:2px,color:#000
    classDef external fill:#4285F4,stroke:#333,stroke-width:2px,color:#FFF

    %% Subgraphs for grouped components
    subgraph Client ["Client Side"]
        UI["React Frontend (Vite)"]:::frontend
    end

    subgraph ServerSide ["Server Side (Node.js/Express)"]
        BE["Express Backend<br/>(index.js)"]:::backend
        FS[(Local File System<br/>'uploads/' directory)]:::storage
        Services["Image Generation Service<br/>(services/)"]:::backend
    end

    subgraph External ["External Services (Google)"]
        GeminiText["Google Gemini Text/Vision Models<br/>(e.g., gemini-2.0-flash)"]:::external
        GeminiImage["Google Image Generation Models<br/>(e.g., gemini-2.0-flash-image)"]:::external
    end

    %% Diagram Flow
    UI -- "1. Uploads Image & Settings<br/>(Multipart Form/JSON)" --> BE
    BE -- "2. Stores file temporarily" --> FS
    BE -- "3. Reads file for processing" --> FS
    FS -- "4. Deletes file after process completes" --> BE

    %% Gemini Integration
    BE -- "5a. Prompts & Image to Classify/Extract" --> GeminiText
    GeminiText -- "JSON Document (Design DNA)" --> BE

    %% Generation Integration
    BE -- "5b. Conceptual Prompts" --> Services
    Services -- "Generate Image Request" --> GeminiImage
    GeminiImage -- "Base64 Rendered Image" --> Services
    Services -- "Parsed Image Data" --> BE

    %% Response
    BE -- "6. JSON Response<br/>(Metrics, Image URLs, DNA Data)" --> UI

```

### Component Details

- **React Frontend (Vite)**: The user interface where users upload images, configure generation settings (like Fashion, Industrial, Spatial modes), and view the generated designs and cost metrics.
- **Express Backend ([index.js](file:///Users/imadsharieff/Desktop/dna/index.js))**: The orchestrator. It serves the statically built frontend, provides RESTful API endpoints (`/api/extract`, `/api/generate-industrial`, etc.), securely holds the `GEMINI_API_KEY`, manages chunked responses to bypass server timeouts, and routes prompts.
- **Local File System (`uploads/`)**: Handled by Multer, the backend temporarily stores uploaded images before submitting them to Gemini as base64 inline data, and systematically cleans them up to free disk space immediately after processing.
- **Google Gemini Text/Vision Models**: The AI core for analyzing user images. Used specifically in the `/api/extract` flow to classify the image domain (Fashion, Industrial, Spatial) and extract "Design DNA."
- **Google Image Generation Models**: Wrapped by the [services/imageGenerationService.js](file:///Users/imadsharieff/Desktop/dna/services/imageGenerationService.js), this handles text-to-image or image-to-image AI conceptualization and returns generated designs based on the formulated prompts from the Express backend.
