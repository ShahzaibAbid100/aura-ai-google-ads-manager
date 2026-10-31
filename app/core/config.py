from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str = "sqlite:///./storage/aura.db"
    secret_key: str = "development-only-change-me"
    fernet_key: str = ""
    google_client_id: str = ""
    google_client_secret: str = ""
    google_ads_developer_token: str = ""
    google_ads_customer_id: str = ""
    google_ads_enable_writes: bool = False
    ai_provider: str = "mock"
    local_llm_path: str = ""
    image_model_path: str = ""
    video_model_path: str = ""
    vision_model_path: str = ""
    pixart_encoder_model_path: str = ""
    ocr_detection_model_path: str = ""
    ocr_recognition_model_path: str = ""
    image_provider: str = "mock"
    video_provider: str = "mock"
    vision_provider: str = "mock"
    ocr_provider: str = "mock"
    google_ads_provider: str = "mock"
    local_llm_max_new_tokens: int = 384
    local_llm_temperature: float = 0.2
    local_llm_max_memory_gib: float = 7.0
    image_inference_steps: int = 1
    ltx_video_inference_enabled: bool = False
    storage_dir: Path = Path("storage")
    cors_origins: list[str] = ["http://localhost:3000"]
    api_auth_token: str = ""
    max_crawl_bytes: int = 1_500_000
    crawl_timeout_seconds: float = 8.0
    oauth_redirect_uri: str = "http://localhost:8000/api/v1/google-ads/oauth/callback"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    def validate_google_oauth(self) -> None:
        if not self.google_client_id or not self.google_client_secret:
            raise ValueError("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required for live OAuth")


@lru_cache
def get_settings() -> Settings:
    return Settings()
