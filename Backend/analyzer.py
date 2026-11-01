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