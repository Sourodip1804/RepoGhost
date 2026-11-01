import ast
import os
from collections import Counter

IGNORED_DIRS = {
    ".git", "node_modules", "venv", ".venv", "__pycache__",
    "dist", "build", ".next", ".idea", ".vscode"
}
CODE_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".html", ".css",
    ".java", ".cpp", ".c", ".h", ".cs", ".go", ".rs",
    ".php", ".json", ".md", ".sql", ".yml", ".yaml"
}
MAX_FILE_SIZE = 200_000

def scan_repository(root_path):
    files, todos, errors, chunks = [], [], [], []
    languages = Counter()

    for current_root, dirs, filenames in os.walk(root_path):
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]
        for filename in filenames:
            ext = os.path.splitext(filename)[1].lower()
            if ext not in CODE_EXTENSIONS:
                continue
            full_path = os.path.join(current_root, filename)
            try:
                if os.path.getsize(full_path) > MAX_FILE_SIZE:
                    continue
                with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                relative = os.path.relpath(full_path, root_path).replace("\\", "/")
                files.append(relative)
                languages[ext.lstrip(".") or "unknown"] += 1

                for line_no, line in enumerate(content.splitlines(), 1):
                    upper = line.upper()
                    for marker in ("TODO", "FIXME", "HACK"):
                        if marker in upper:
                            todos.append({
                                "file": relative, "line": line_no,
                                "type": marker, "content": line.strip()[:300]
                            })

                if ext == ".py":
                    try:
                        ast.parse(content)
                    except SyntaxError as exc:
                        errors.append({
                            "file": relative, "line": exc.lineno,
                            "message": exc.msg
                        })

                if content.strip():
                    chunks.append({"file": relative, "content": content[:12000]})
            except (OSError, UnicodeError):
                continue

    return {
        "total_files": len(files),
        "files": files[:500],
        "languages": dict(languages),
        "todos": todos[:300],
        "errors": errors[:100],
        "code_chunks": chunks[:150]
    }
