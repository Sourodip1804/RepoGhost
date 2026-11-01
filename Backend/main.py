
import os
import uuid
import shutil
import zipfile

from pathlib import Path, PurePosixPath

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException
)

from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from analyzer import scan_repository
from ai_engine import ask_local_model, MODEL_NAME


app = FastAPI(title="RepoGhost API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data" / "repos"
DATA_DIR.mkdir(parents=True, exist_ok=True)

repositories = {}


class ChatRequest(BaseModel):
    question: str


def safe_extract(zip_file, destination):

    ignored = {
        ".git", "node_modules", "venv",
        ".venv", "__pycache__", "dist", "build"
    }

    total_size = 0
    count = 0

    for info in zip_file.infolist():

        if info.is_dir():
            continue

        parts = PurePosixPath(
            info.filename.replace("\\", "/")
        ).parts

        if not parts or ".." in parts:
            continue

        if any(part in ignored for part in parts):
            continue

        # Ignore symbolic links
        if (info.external_attr >> 16) & 0o170000 == 0o120000:
            continue

        total_size += info.file_size
        count += 1

        if total_size > 200 * 1024 * 1024:
            raise HTTPException(
                413,
                "Extracted ZIP exceeds 200 MB."
            )

        if count > 1500:
            raise HTTPException(
                413,
                "Too many files in ZIP."
            )

        target = destination.joinpath(*parts)

        target.resolve().relative_to(
            destination.resolve()
        )

        target.parent.mkdir(
            parents=True,
            exist_ok=True
        )

        with zip_file.open(info) as source:
            with open(target, "wb") as output:
                shutil.copyfileobj(source, output)


def get_repository(repo_id):

    repo = repositories.get(repo_id)

    if not repo:
        raise HTTPException(
            404,
            "Repository not found. Upload it again."
        )

    return repo


@app.get("/")
def home():

    return {
        "message": "RepoGhost API is running"
    }


@app.get("/api/health")
def health():

    return {
        "status": "ok",
        "model": MODEL_NAME
    }


@app.post("/api/upload")
async def upload_repository(
    file: UploadFile = File(...)
):

    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(
            400,
            "Please upload a ZIP file."
        )

    content = await file.read(
        50 * 1024 * 1024 + 1
    )

    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(
            413,
            "ZIP must be smaller than 50 MB."
        )

    repo_id = str(uuid.uuid4())

    repo_dir = DATA_DIR / repo_id
    source_dir = repo_dir / "source"

    repo_dir.mkdir(parents=True, exist_ok=True)
    source_dir.mkdir(parents=True, exist_ok=True)

    zip_path = repo_dir / "upload.zip"

    try:

        zip_path.write_bytes(content)

        with zipfile.ZipFile(zip_path) as archive:
            safe_extract(archive, source_dir)

    except zipfile.BadZipFile:

        shutil.rmtree(repo_dir, ignore_errors=True)

        raise HTTPException(
            400,
            "Invalid ZIP archive."
        )

    except Exception:

        shutil.rmtree(repo_dir, ignore_errors=True)
        raise

    zip_path.unlink(missing_ok=True)

    scan = scan_repository(str(source_dir))

    if scan["total_files"] == 0:

        shutil.rmtree(repo_dir, ignore_errors=True)

        raise HTTPException(
            400,
            "No supported source files found."
        )

    repositories[repo_id] = {
        "name": Path(file.filename).stem,
        "path": str(source_dir),
        "scan": scan
    }

    public_scan = {
        key: value
        for key, value in scan.items()
        if key != "code_chunks"
    }

    return {
        "repo_id": repo_id,
        "name": Path(file.filename).stem,
        "scan": public_scan
    }


@app.get("/api/repository/{repo_id}")
def repository_details(repo_id: str):

    repo = get_repository(repo_id)

    scan = repo["scan"]

    return {
        "repo_id": repo_id,
        "name": repo["name"],
        "scan": {
            key: value
            for key, value in scan.items()
            if key != "code_chunks"
        }
    }


def select_context(scan, question="", limit=6):

    chunks = scan["code_chunks"]

    words = [
        word.lower()
        for word in question.split()
        if len(word) > 2
    ]

    scored = []

    for chunk in chunks:

        text = (
            chunk["file"].lower()
            + "\n"
            + chunk["content"].lower()
        )

        score = sum(
            text.count(word)
            for word in words
        )

        scored.append((score, chunk))

    scored.sort(
        key=lambda item: item[0],
        reverse=True
    )

    selected = [
        chunk
        for _, chunk in scored[:limit]
    ]

    return "\n\n".join(
        f"FILE: {chunk['file']}\n"
        f"{chunk['content'][:5000]}"
        for chunk in selected
    )[:24000]


@app.post("/api/chat/{repo_id}")
def chat(repo_id: str, body: ChatRequest):

    repo = get_repository(repo_id)

    question = body.question.strip()

    if not question:
        raise HTTPException(
            400,
            "Question cannot be empty."
        )

    context = select_context(
        repo["scan"],
        question
    )

    prompt = f"""
    Repository: {repo['name']}

    Relevant source code:
    {context}

    Repository files:
    {repo['scan']['files'][:100]}

    User question:
    {question}

    Explain clearly and mention relevant file paths.
    Do not invent files or functions.
    """

    try:

        answer = ask_local_model(prompt)

        return {
            "answer": answer,
            "model": MODEL_NAME
        }

    except RuntimeError as error:

        raise HTTPException(
            503,
            str(error)
        )


@app.get("/api/report/{repo_id}")
def generate_report(repo_id: str):

    repo = get_repository(repo_id)

    scan = repo["scan"]

    context = select_context(
        scan,
        "project architecture main app entry point",
        limit=8
    )

    prompt = f"""
    Review this software project.

    Project: {repo['name']}

    Total files: {scan['total_files']}

    Languages: {scan['languages']}

    Unfinished tasks: {scan['todos'][:40]}

    Python syntax findings: {scan['errors'][:30]}

    Relevant code:
    {context}

    Create a report with these sections:

    1. Project overview
    2. Architecture
    3. Unfinished work
    4. Potential improvements
    5. Recommended next steps

    Only report facts supported by the supplied context.
    Do not claim that you executed the project.
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

    except RuntimeError as error:

        raise HTTPException(
            503,
            str(error)
        )


@app.delete("/api/repository/{repo_id}")
def delete_repository(repo_id: str):

    repo = get_repository(repo_id)

    repo_path = Path(repo["path"]).parent

    shutil.rmtree(
        repo_path,
        ignore_errors=True
    )

    repositories.pop(repo_id, None)

    return {
        "message": "Repository deleted."
    }
