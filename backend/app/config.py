from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Environment
    ENVIRONMENT: str = "development"  # "development" | "production"

    # Application
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    PUBLIC_BASE_URL: str = "http://localhost:5173"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./htmlhost.db"

    # JWT
    JWT_SECRET: str = "dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Encryption for stored API keys (generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
    ENCRYPTION_KEY: str = ""

    # LLM defaults (platform-level, user can override)
    LLM_MODEL: str = "deepseek-chat"
    LLM_API_KEY: str = ""
    LLM_BASE_URL: str = "https://api.deepseek.com"

    # HTML generation strategy — "two_step" (Step1 refine+select libs → Step2) | "single_step" (LLM writes full page incl. CDN)
    GENERATION_STRATEGY: str = "two_step"

    # DeepSeek thinking mode — default OFF. Set LLM_THINKING=true in .env to enable (V4 models think by default).
    LLM_THINKING: bool = False

    # Admin accounts: comma-separated phone numbers or user_ids with admin privileges
    ADMIN_USER_IDS: str = ""

    # API Proxy
    PROXY_ALLOWED_DOMAINS: str = "api.openweathermap.org,api.github.com,restapi.amap.com"
    PROXY_WHITELIST_MODE: str = "open"  # "open" or "strict"

    # Content Safety
    CONTENT_FILTER_ENABLED: bool = True

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


settings = Settings()
