
import os
import requests
from dotenv import load_dotenv

load_dotenv()

OLLAMA_URL = os.getenv(
    "OLLAMA_URL",
    "http://localhost:11434"
)

MODEL_NAME = os.getenv(
    "MODEL_NAME",
    "qwen2.5:3b"
)


def ask_local_model(prompt):

    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/chat",

            json={
                "model": MODEL_NAME,

                "messages": [
                    {
                        "role": "system",
                        "content": """
                        You are RepoGhost, a senior software
                        engineer.

                        Explain code clearly.
                        Use the supplied repository context.
                        Mention relevant file names.
                        Never invent code or files.
                        """
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],

                "stream": False,

                "options": {
                    "temperature": 0.2,
                    "num_ctx": 4096,
                    "num_predict": 500
                }
            },

            timeout=180
        )

        response.raise_for_status()

        result = response.json()

        return result["message"]["content"]

    except requests.exceptions.ConnectionError:
        raise RuntimeError(
            "Cannot connect to Ollama. "
            "Please start Ollama."
        )

    except requests.exceptions.Timeout:
        raise RuntimeError(
            "AI response timed out. Try a shorter question."
        )

    except requests.exceptions.RequestException as error:
        raise RuntimeError(str(error))
