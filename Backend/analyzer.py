import ast #this is for the Abstract Syntax Tree (AST) module.
import os #this is for the operating system module.
from collections import Counter #this is for the Counter class from the collections module.

IGNORED_DIRS = {
    ".git", "node_modules", "venv", ".venv",
    "__pycache__", "dist", "build", ".next",
    ".idea", ".vscode"
}
