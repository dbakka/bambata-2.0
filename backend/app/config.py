import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "BAMBATA 2.0 - AI DJ Mashup Studio"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api"

    # API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    YOUTUBE_API_KEY: str = os.getenv("YOUTUBE_API_KEY", "")
    MODAL_TOKEN_ID: str = os.getenv("MODAL_TOKEN_ID", "")
    MODAL_TOKEN_SECRET: str = os.getenv("MODAL_TOKEN_SECRET", "")

    # Host and CORS
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "*"
    ]

    # Directories
    STORAGE_DIR: Path = BASE_DIR / "storage"
    TEMP_DIR: Path = BASE_DIR / "storage" / "temp"
    RENDERS_DIR: Path = BASE_DIR / "storage" / "renders"
    PREVIEWS_DIR: Path = BASE_DIR / "storage" / "previews"

    def init_directories(self):
        self.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        self.TEMP_DIR.mkdir(parents=True, exist_ok=True)
        self.RENDERS_DIR.mkdir(parents=True, exist_ok=True)
        self.PREVIEWS_DIR.mkdir(parents=True, exist_ok=True)

settings = Settings()
settings.init_directories()
