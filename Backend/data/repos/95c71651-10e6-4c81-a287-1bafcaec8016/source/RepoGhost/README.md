# RepoGhost — The Ghost in Your Codebase

RepoGhost is a local-first AI codebase explorer. Upload a ZIP of a code repository, scan its files and unfinished-work markers, ask questions about the code, and generate a project review using a model served locally by Ollama.

## Features

- ZIP upload with extraction limits and path-traversal protection
- Source file and language inventory
- TODO / FIXME / HACK marker discovery
- Python syntax parsing
- Local Ollama-powered repository Q&A
- AI-generated project review
- React dashboard with a dark, spooky visual theme

## Requirements

- Python 3.10+
- Node.js 18+
- Ollama installed
- Enough RAM for the model you choose

## 1. Download a model

```powershell
ollama pull qwen2.5:3b
ollama list
```

Keep Ollama running. The backend uses `http://localhost:11434` by default.

## 2. Start the backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend health: http://127.0.0.1:8000/api/health  
API docs: http://127.0.0.1:8000/docs

## 3. Start the frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## 4. Use it

1. Export or download a GitHub repository as a ZIP.
2. Upload the ZIP to RepoGhost.
3. Review the scan results.
4. Open Ask the Ghost and ask about your code.
5. Generate the Haunted Report.

## Change the model

Edit `backend/.env`:

```env
OLLAMA_URL=http://localhost:11434
MODEL_NAME=qwen2.5:3b
```

Use a model that you have downloaded with `ollama pull`. Restart the backend after changing the model.

## Privacy and limitations

- Model inference runs through the local Ollama service; source code is not sent to a hosted AI API by this application.
- The model download requires internet. After the model and dependencies are installed, the app can be used offline.
- Uploaded files are stored under `backend/data/repos` until deleted or the backend data folder is cleared.
- The MVP keeps repository metadata in server memory. Restarting the backend clears the active repository sessions; upload again to continue.
- This is a prototype, not a security scanner. It does not execute uploaded code.
- AI answers can be wrong. Verify suggestions before applying them.
- The current report uses a small selection of relevant code files, not a complete semantic index. ChromaDB / embeddings can be added as a later upgrade.
- Do not upload secrets, credentials, private keys, or source code you are not authorized to share.

## Project structure

```text
RepoGhost/
├── backend/
│   ├── main.py
│   ├── analyzer.py
│   ├── ai_engine.py
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── package.json
    └── vite.config.js
```
