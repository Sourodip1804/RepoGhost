import ast #this is for the Abstract Syntax Tree (AST) module.
import os #this is for the operating system module.
from collections import Counter #this is for the Counter class from the collections module.

IGNORED_DIRS = {
    ".git", "node_modules", "venv", ".venv",
    "__pycache__", "dist", "build", ".next",
    ".idea", ".vscode"
}

CODE_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx",
    ".html", ".css", ".java", ".cpp", ".c",
    ".h", ".cs", ".go", ".rs", ".php",
    ".json", ".md", ".sql"
}

MAX_FILE_SIZE = 5_000_000  # 5 MB

def scan_repository(root_path):
    files=[]
    languages = Counter()
    todos =[]
    errors =[]
    code_chunks=[]

    for current_root, dirs, filenames in os.walk(root_path):
        dirs[:]=[
            directory for directory in dirs
            if  directory not in IGNORED_DIRS
        ] #this is for the list of directories to ignore during the scan.

        for filename in filenames:
            extension = os.path.splittext(filename)[1].lower() #this is for the file extension of the current file.
            if extension not in CODE_EXTENSIONS:
                continue #this is for the file extension of the current file.
            full_path = os.path.join(current_root, filename) #this is for the full path of the current file.
            try:
                if os.path.getsize(full_path)>MAX_FILE_SIZE:
                    continue
                with open(
                    full_path,
                    "r",
                    encoding="utf-8",
                    errors="ignore"
                ) as file:
                    content = file.read()

                relative_path = os.path.relpath(
                    full_path, root_path
                ).replace("\\", "/")

                files.append(relative_path)

                language = extension.lstrip(".")
                languages[language] += 1

                # Find unfinished code comments
                for line_number, line in enumerate(
                    content.splitlines(), start=1
                ):
                    upper_line = line.upper()

                    for keyword in ["TODO", "FIXME", "HACK"]:
                        if keyword in upper_line:
                            todos.append({
                                "file": relative_path,
                                "line": line_number,
                                "type": keyword,
                                "content": line.strip()
                            })

                # Check Python syntax
                if extension == ".py":
                    try:
                        ast.parse(content)
                    except SyntaxError as error:
                        errors.append({
                            "file": relative_path,
                            "line": error.lineno,
                            "message": error.msg
                        })

                # Keep limited code context for the AI
                if content.strip():
                    code_chunks.append({
                        "file": relative_path,
                        "content": content[:12000]
                    })
            except (OSError, UnicodeError):
                continue
    return{
        "total_files": len(files),
        "files": files,
        "languages": dict(languages),
        "todos": todos,
        "errors": errors,
        "code_chunks": code_chunks
    }
