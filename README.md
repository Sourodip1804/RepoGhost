# 👻 RepoGhost – The Ghost in Your Codebase

<p align="center">
  <strong>Resurrect Forgotten Projects. Understand Mysterious Code. Bring Abandoned Repositories Back to Life.</strong>
</p>

<p align="center">
  An open-source AI-powered repository analyser that helps developers understand, explore, and revive forgotten codebases using local AI.
</p>

---

## 🌟 About the Project

**RepoGhost** is a local AI-powered codebase analysis tool built to help developers understand unfamiliar, abandoned, or forgotten repositories.

Every codebase has a story, but understanding an old project can sometimes feel like exploring a haunted house. Unfinished tasks, confusing file structures, undocumented functions, and mysterious code can make development difficult.

RepoGhost acts as a friendly ghost inside your repository. It scans project files, identifies unfinished tasks, analyses repository structure, and allows developers to ask questions about their code using an open-weight AI model.

The project uses **Qwen2.5:3B through Ollama**, allowing AI-powered code understanding to run locally without depending on a paid cloud AI API.

## ✨ Features

- 👻 **Repository Scanner:** Upload a project ZIP file and scan its source code.
- 📂 **Language Detection:** Identify programming languages used in the repository.
- 🔍 **Forgotten Task Detection:** Find TODO, FIXME, and HACK comments.
- 🐍 **Python Syntax Analysis:** Detect basic Python syntax errors.
- 💬 **Chat with the Ghost:** Ask questions about your repository and receive AI-generated explanations.
- 📄 **Haunted Project Report:** Generate an AI-assisted repository analysis report.
- 🔒 **Local AI Processing:** Run AI inference locally through Ollama.
- ⚡ **Interactive Dashboard:** Explore repository information through a React-based interface.

## 🛠️ Tech Stack

### Frontend
- React.js
- Vite
- JavaScript
- CSS
- Lucide React

### Backend
- Python
- FastAPI
- REST API
- Uvicorn

### AI & Machine Learning
- Qwen2.5:3B – Open-weight language model
- Ollama – Local LLM runtime

### Python Libraries
- `requests`
- `python-dotenv`
- `python-multipart`
- `fastapi`
- `uvicorn`

## 🏗️ Project Architecture

RepoGhost follows a frontend-backend architecture where the React frontend communicates with a Python FastAPI backend, which interacts with the locally running Ollama model.

```text
                 ┌──────────────────────┐
                 │      Developer      │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │    React Frontend    │
                 │   Vite + CSS         │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │     FastAPI          │
                 │      Backend         │
                 └──────────┬───────────┘
                            │
                  ┌─────────┴─────────┐
                  ▼                   ▼
          ┌───────────────┐   ┌────────────────┐
          │ Repository    │   │  AI Engine     │
          │ Analyzer      │   │                │
          └───────┬───────┘   └───────┬────────┘
                  │                 │
                  ▼                 ▼
          ┌───────────────┐   ┌────────────────┐
          │ Scan Results  │   │ Ollama         │
          │ & File Data   │   │ Qwen2.5:3B     │
          └───────┬───────┘   └───────┬────────┘
                  │                 │
                  └────────┬────────┘
                           ▼
                 ┌──────────────────────┐
                 │   RepoGhost         │
                 │   Dashboard         │
                 └──────────────────────┘
```

## 📁 Project Structure

```text
RepoGhost/
│
├── backend/
│   ├── main.py
│   ├── analyzer.py
│   ├── ai_engine.py
│   ├── requirements.txt
│   ├── .env.example
│   │
│   └── data/
│       └── repos/
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   │
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## ⚙️ Getting Started

Follow these instructions to run RepoGhost locally.

### 1. Prerequisites

Make sure you have installed:

- Python 3.10 or later
- Node.js and npm
- Git
- Ollama

### 2. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/RepoGhost.git
```

Navigate into the project:

```bash
cd RepoGhost
```

### 3. Set Up the Backend

Navigate to the backend directory:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment on Windows:

```powershell
.\venv\Scripts\Activate.ps1
```

Install the required dependencies:

```bash
python -m pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file inside the backend directory.

Add the following configuration:

```env
OLLAMA_URL=http://localhost:11434
MODEL_NAME=qwen2.5:3b
```

### 5. Install and Run Ollama

Download Ollama from:

https://ollama.com/

Pull the Qwen2.5:3B model:

```bash
ollama pull qwen2.5:3b
```

Make sure Ollama is running locally.

### 6. Start the Backend Server

From the backend directory, execute:

```bash
uvicorn main:app --reload --reload-exclude "data/**" --port 8000
```

The backend will be available at:

```text
http://127.0.0.1:8000
```

FastAPI documentation:

```text
http://127.0.0.1:8000/docs
```

### 7. Set Up the Frontend

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install the dependencies:

```bash
npm install
```

Install Lucide React:

```bash
npm install lucide-react
```

Start the development server:

```bash
npm run dev
```

Open the application in your browser:

```text
http://localhost:5173
```

## 🔄 How It Works

1. **Upload:** Upload a repository as a ZIP file through the dashboard.
2. **Extraction:** The backend extracts the repository into its local storage directory.
3. **Analysis:** The analyzer scans source files, detects languages, and identifies TODO, FIXME, and HACK markers.
4. **Context Preparation:** Relevant repository information is selected for AI processing.
5. **AI Interaction:** Qwen2.5:3B processes the provided context through Ollama.
6. **Results:** View scan results, chat with the Ghost, and generate an AI-assisted project report.

## 🔌 API Endpoints

RepoGhost uses FastAPI to expose REST API endpoints.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Check backend health |
| POST | `/api/upload` | Upload and analyse a repository ZIP |
| GET | `/api/repository/{repo_id}` | Retrieve repository information |
| POST | `/api/chat/{repo_id}` | Ask questions about a repository |
| GET | `/api/report/{repo_id}` | Generate a project report |
| DELETE | `/api/repository/{repo_id}` | Remove a repository |

Interactive API documentation is available at `/docs`.

## 🔐 Privacy & Security

RepoGhost is designed around local AI processing.

- AI inference runs locally using Ollama.
- Repository files are processed by the local backend.
- No paid cloud AI API is required for the core AI workflow.
- Uploaded repositories are stored locally.

**Note:** The current implementation uses local storage and in-memory repository sessions. It is intended for local development and experimentation, not yet for production deployment.

## 🚀 Future Improvements

Some features I would like to introduce in future versions:

- [ ] GitHub repository integration.
- [ ] Semantic code search using vector embeddings.
- [ ] Support for more programming languages and deeper static analysis.
- [ ] AI-powered bug detection and suggestions.
- [ ] Code dependency and architecture visualisation.
- [ ] Repository history analysis.
- [ ] Downloadable PDF project reports.
- [ ] Support for multiple open-weight AI models.
- [ ] Improved repository context retrieval for larger codebases.

## 🤝 Contributing

Contributions are welcome!

If you have ideas for improving RepoGhost, feel free to:

1. Fork this repository.
2. Create a new feature branch.
3. Make your changes.
4. Commit your changes.
5. Open a Pull Request.

```bash
git checkout -b feature/your-feature
git add .
git commit -m "Add: your feature"
git push origin feature/your-feature
```

## 🏆 Hacktoberfest

This project was built as a submission for:

**Hacktoberfest Open-Source AI Challenge – Week 4: Ghost in the Machine**

The idea behind this project is simple:

*Every codebase deserves a second life.*

## 👨‍💻 Author

**Sourodip Mahato**

- GitHub: [Your GitHub Profile](https://github.com/Sourodip1804)
- LinkedIn: [Sourodip Mahato](https://linkedin.com/in/sourodipmahato/)

## ⭐ Support

If you find RepoGhost interesting or useful, consider giving the repository a ⭐ on GitHub.

Feedback, suggestions, and contributions are always welcome!

---

<p align="center">
  <strong>👻 RepoGhost — Every Codebase Has a Ghost.</strong>
  <br/>
  Built with ❤️ using Open-Source AI.
</p>
