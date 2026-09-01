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
    admin_email: str = "contact.smarthireai@proton.me"
    admin_password: str = ""
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://127.0.0.1:8000/api"
    cookie_secure: bool = False
    cookie_same_site: str = "lax"
    google_client_id: str = ""
    google_client_secret: str = ""
    github_client_id: str = ""
    github_client_secret: str = ""
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

    @property
    def frontend_base_url(self) -> str:
        return self.frontend_url

    @property
    def oauth_google_client_id(self) -> str:
        return self.google_client_id

    @property
    def oauth_google_client_secret(self) -> str:
        return self.google_client_secret

    @property
    def oauth_github_client_id(self) -> str:
        return self.github_client_id

    @property
    def oauth_github_client_secret(self) -> str:
        return self.github_client_secret


@lru_cache
def get_settings() -> Settings:
    return Settings()
