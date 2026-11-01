import os
import shutil
import uuid
import zipfile
from pathlib import Path, PurePosixPath

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from analyzer import scan_repository
from ai_engine import ask_local_model, MODEL_NAME, OLLAMA_URL

load_dotenv()
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data" / "repos"
DATA_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="RepoGhost API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MVP storage: repository scan results remain available until the backend restarts.
repositories = {}

MAX_UPLOAD_BYTES = 50 * 1024 * 1024
MAX_EXTRACTED_FILES = 1500
MAX_TOTAL_UNCOMPRESSED = 200 * 1024 * 1024

class ChatRequest(BaseModel):
    question: str

def safe_extract(zip_file: zipfile.ZipFile, destination: Path):
    total_size = 0
    accepted = 0
    ignored = {".git", "node_modules", "venv", ".venv", "__pycache__", "dist", "build"}

    for info in zip_file.infolist():
        if info.is_dir():
            continue
        if info.file_size > MAX_UPLOAD_BYTES:
            continue
        parts = PurePosixPath(info.filename.replace("\\", "/")).parts
        if not parts or any(p in ("..", "") for p in parts) or PurePosixPath(info.filename).is_absolute():
            continue
        if any(part in ignored for part in parts):
            continue
        # Skip symbolic links.
        if (info.external_attr >> 16) & 0o170000 == 0o120000:
            continue

        total_size += info.file_size
        if total_size > MAX_TOTAL_UNCOMPRESSED:
            raise HTTPException(413, "ZIP expands beyond the 200 MB extraction limit.")
        accepted += 1
        if accepted > MAX_EXTRACTED_FILES:
            raise HTTPException(413, "Too many files in ZIP (limit: 1500).")

        target = destination.joinpath(*parts)
        target.resolve().relative_to(destination.resolve())
        target.parent.mkdir(parents=True, exist_ok=True)
        with zip_file.open(info) as source, open(target, "wb") as output:
            shutil.copyfileobj(source, output)

    if accepted == 0:
        raise HTTPException(400, "No supported files found in this ZIP.")

def get_repo(repo_id: str):
    repo = repositories.get(repo_id)
    if not repo:
        raise HTTPException(404, "Repository not found. Upload it again.")
    return repo

@app.get("/")
def home():
    return {"message": "RepoGhost API is running"}

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "ollama_url": OLLAMA_URL
    }

@app.post("/api/upload")
async def upload_repository(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(400, "Please upload a .zip repository file.")

    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "ZIP file must be 50 MB or smaller.")

    repo_id = str(uuid.uuid4())
    repo_dir = DATA_DIR / repo_id
    repo_dir.mkdir(parents=True, exist_ok=True)
    zip_path = repo_dir / "upload.zip"

    try:
        zip_path.write_bytes(content)
        with zipfile.ZipFile(zip_path) as archive:
            safe_extract(archive, repo_dir / "source")
    except zipfile.BadZipFile:
        shutil.rmtree(repo_dir, ignore_errors=True)
        raise HTTPException(400, "The uploaded file is not a valid ZIP archive.")
    except Exception:
        shutil.rmtree(repo_dir, ignore_errors=True)
        raise

    zip_path.unlink(missing_ok=True)
    source_dir = repo_dir / "source"
    scan = scan_repository(str(source_dir))
    if scan["total_files"] == 0:
        shutil.rmtree(repo_dir, ignore_errors=True)
        raise HTTPException(400, "No supported source files found in the ZIP.")

    repositories[repo_id] = {
        "name": Path(file.filename).stem,
        "path": str(source_dir),
        "scan": scan
    }
    return {
        "repo_id": repo_id,
        "name": Path(file.filename).stem,
        "scan": {k: v for k, v in scan.items() if k != "code_chunks"}
    }

@app.get("/api/repository/{repo_id}")
def repository_details(repo_id: str):
    repo = get_repo(repo_id)
    scan = repo["scan"]
    return {
        "repo_id": repo_id,
        "name": repo["name"],
        "scan": {k: v for k, v in scan.items() if k != "code_chunks"}
    }

def select_context(scan, question="", limit=6):
    chunks = scan["code_chunks"]
    words = [w.lower() for w in question.split() if len(w) > 2]
    scored = []
    for chunk in chunks:
        text = chunk["file"].lower() + "\n" + chunk["content"].lower()
        score = sum(text.count(word) for word in words)
        scored.append((score, chunk))
    scored.sort(key=lambda item: item[0], reverse=True)
    selected = [chunk for _, chunk in scored[:limit]]
    return "\n\n".join(
        f'FILE: {c["file"]}\n```text\n{c["content"][:5000]}\n```'
        for c in selected
    )[:24000]

@app.post("/api/chat/{repo_id}")
def chat(repo_id: str, body: ChatRequest):
    repo = get_repo(repo_id)
    question = body.question.strip()
    if not question:
        raise HTTPException(400, "Question cannot be empty.")
    context = select_context(repo["scan"], question)
    prompt = f"""
Repository: {repo['name']}

Relevant repository files:
{context}

Repository file list:
{chr(10).join(repo['scan']['files'][:100])}

User question:
{question}

Explain your answer clearly. Mention relevant file paths. Do not invent files or functions.
"""
    try:
        answer = ask_local_model(prompt)
        return {"answer": answer, "model": MODEL_NAME}
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))

@app.get("/api/report/{repo_id}")
def report(repo_id: str):
    repo = get_repo(repo_id)
    scan = repo["scan"]
    context = select_context(scan, "project entry point main app architecture", limit=8)
    prompt = f"""
Create a practical codebase review for this repository: {repo['name']}.
Use only the supplied evidence. Do not claim to have run tests.

File count: {scan['total_files']}
Languages: {scan['languages']}
TODO/FIXME/HACK markers: {len(scan['todos'])}
Python syntax findings: {len(scan['errors'])}

Markers:
{scan['todos'][:40]}

Python syntax findings:
{scan['errors'][:30]}

Relevant source:
{context}

Return sections: Project overview, Architecture clues, Existing unfinished work,
Potential improvements, Suggested next steps. Clearly distinguish observed facts
from suggestions.
"""
    try:
        answer = ask_local_model(prompt)
        return {
            "report": answer,
            "stats": {
                "total_files": scan["total_files"],
                "languages": scan["languages"],
                "todos": len(scan["todos"]),
                "errors": len(scan["errors"])
            }
        }
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))

@app.delete("/api/repository/{repo_id}")
def delete_repository(repo_id: str):
    repo = get_repo(repo_id)
    repo_path = Path(repo["path"]).parent
    shutil.rmtree(repo_path, ignore_errors=True)
    repositories.pop(repo_id, None)
    return {"message": "Repository deleted."}
