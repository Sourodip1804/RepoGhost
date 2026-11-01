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

def scan_repository(repo_path):
    files=[]
    languages = Counter()
    todos =[]
    errors =[]
    code_chunks=[]
    