from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = ""
    secret_key: str = ""
    algorithm: str = ""
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 14
    remember_me_refresh_token_expire_days: int = 30
    email_verification_token_expire_minutes: int = 60
    password_reset_token_expire_minutes: int = 30
    require_verified_login: bool = True
    frontend_base_url: str = "http://localhost:5173"
    cookie_secure: bool = False
    cookie_same_site: str = "lax"
    oauth_google_client_id: str = ""
    oauth_google_client_secret: str = ""
    oauth_github_client_id: str = ""
    oauth_github_client_secret: str = ""
    upload_folder: str = "app/uploads"
    report_folder: str = "app/reports"
    cors_origins: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_use_tls: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
