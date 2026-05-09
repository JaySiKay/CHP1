import json
import base64
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    CENTRAL_DB_URL: str
    FIREBASE_CREDENTIALS: str

    @property
    def firebase_dict(self) -> dict:
        try:
            decoded_bytes = base64.b64decode(self.FIREBASE_CREDENTIALS)
            return json.loads(decoded_bytes.decode("utf-8"))
        except Exception as e:
            raise ValueError(f"Mistake of getting FIREBASE_CREDENTIALS: {e}")

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        env_file_encoding="utf-8"
    )


settings = Settings()
