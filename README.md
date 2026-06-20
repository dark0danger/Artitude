<div align="center">
  <img src="ui/public/Logo.png" alt="Artitude Logo" width="120" />
  <h1>Artitude V2</h1>
  <p><b>Advanced AI Design Co-Pilot with Real-Time Streaming and Spatial Vision</b></p>
  
  <p>
    <a href="https://github.com/dark0danger/Artitude"><img src="https://img.shields.io/badge/Status-Active-success.svg?style=for-the-badge" alt="Status" /></a>
    <a href="https://github.com/dark0danger/Artitude"><img src="https://img.shields.io/badge/Python-3.10%2B-blue.svg?style=for-the-badge" alt="Python" /></a>
    <a href="https://github.com/dark0danger/Artitude"><img src="https://img.shields.io/badge/React-Vite-blueviolet.svg?style=for-the-badge" alt="React" /></a>
    <a href="https://github.com/dark0danger/Artitude"><img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="License" /></a>
  </p>
</div>

---

## Overview

**Artitude** is an autonomous AI co-pilot designed for brand managers, art directors, and designers. It ensures that every design asset aligns perfectly with your brand's core identity by leveraging cutting-edge Vision AI and Retrieval-Augmented Generation (RAG). 

By acting as a continuous integration check for design, Artitude helps teams maintain aesthetic consistency, avoid market collisions, and elevate their creative output.

---

## Architecture & Workflow

Artitude utilizes a state-of-the-art agentic workflow powered by LangGraph, FastApi, and React.

| Phase | Description |
| :--- | :--- |
| **Ingestion Pipeline** | Brand guidelines are loaded, chunked using a recursive character text splitter, embedded using OpenAI embeddings, and stored in ChromaDB. |
| **Vision Extraction** | Uploaded designs are analyzed by the Vision model to extract dominant hex colors, typography styles, layout density, and visual theme tags. |
| **Context Retrieval** | The system performs a similarity search against ChromaDB using the extracted visual properties to find relevant brand rules. |
| **Synthesis & Streaming** | LangGraph orchestrates the synthesis process. The AI generates a narrative review streamed back to the frontend via SSE, followed by a structured JSON payload containing specific findings, bounding boxes, and actionable feedback. |

---

## Key Features

- **Brand Guidelines Ingestion (RAG)**
  Upload your source-of-truth brand documentation (PDFs, text files). Artitude indexes every rule, color code, and typographic scale into a local vector database.

- **Real-Time Design Review**
  Upload design drafts for instant critique. Artitude uses Vision AI to analyze the image, retrieves relevant brand rules, and streams a comprehensive review covering **Brand Consistency**, **Market Collisions**, and **Design Enhancements**.

- **Competitor Intelligence**
  Input a competitor's website URL to automatically scrape and extract their Brand Kit (primary colors, typography) to ensure your designs remain distinct.

- **Project Dashboards**
  Monitor your brand consistency metrics, track health scores over time, and manage multiple intelligence campaigns from a centralized hub.

---

## Technology Stack

### Backend Infrastructure
- **FastAPI**: High-performance API routing and Server-Sent Events (SSE) streaming.
- **LangGraph**: Agentic workflow orchestration and state management.
- **ChromaDB**: Local, persistent vector database for RAG capabilities.
- **OpenAI via GitHub Models**: Leveraging `gpt-4o` for spatial vision and complex reasoning, and `gpt-4o-mini` for fast extraction.

### Frontend Client
- **React & Vite**: Lightning-fast UI rendering and development experience.
- **Tailwind CSS**: Utility-first styling for premium, custom aesthetics.
- **Framer Motion**: Fluid micro-animations and layout transitions.

---

## Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **GitHub Token** (with Models access)

### 1. Backend Setup

```bash
# Clone the repository
git clone https://github.com/dark0danger/Artitude.git
cd Artitude

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env to include your GITHUB_TOKEN
```

### 2. Frontend Setup

```bash
cd ui
npm install
```

### 3. Running the Application

**Start the Backend Server** (from the root directory):
```bash
python main.py serve
```
*The API will be available at `http://localhost:8000`.*

**Start the Frontend Server**:
```bash
cd ui
npm run dev
```
*Visit `http://localhost:5173` to launch the Artitude workspace.*

---

## License

This project is open-source and available under the MIT License.
