


from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    #postgress DNS
    database_url: str


    cors_origins: str = "http://localhost:8080"

    #talksasa credentials
    talksasa_base_url: str = "https://bulksms.talksasa.com/api/v3"
    talksasa_api_key: str = ""
    talksasa_sender_id: str = ""

    delete_confirmation_code: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
    

settings = Settings()    











