import base64
import hashlib
import secrets
from urllib.parse import urlencode

from cryptography.fernet import Fernet

from app.core.config import get_settings


class OAuthStateStore:
    def __init__(self) -> None:
        self._states: dict[str, str] = {}

    def create(self, verifier: str) -> str:
        state = secrets.token_urlsafe(32)
        self._states[state] = verifier
        return state

    def consume(self, state: str) -> str | None:
        return self._states.pop(state, None)


oauth_states = OAuthStateStore()


def oauth_authorization_url(state: str, code_challenge: str) -> str:
    settings = get_settings()
    settings.validate_google_oauth()
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.oauth_redirect_uri,
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/adwords",
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        "access_type": "offline",
        "prompt": "consent",
    }
    return "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)


def create_pkce_pair() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(48)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
    return verifier, challenge


def get_fernet() -> Fernet:
    configured = get_settings().fernet_key
    if configured:
        return Fernet(configured.encode())
    # Development-only process key; deployments must configure FERNET_KEY for restart-safe decryption.
    key = base64.urlsafe_b64encode(hashlib.sha256(get_settings().secret_key.encode()).digest())
    return Fernet(key)


def encrypt_tokens(tokens: dict[str, str]) -> str:
    import json

    return get_fernet().encrypt(json.dumps(tokens).encode()).decode()


def decrypt_tokens(value: str) -> dict[str, str]:
    import json

    return json.loads(get_fernet().decrypt(value.encode()))

def refresh_google_access_token(encrypted_tokens: str) -> tuple[str, str]:
    import httpx

    settings = get_settings()
    settings.validate_google_oauth()
    tokens = decrypt_tokens(encrypted_tokens)
    response = httpx.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "refresh_token": tokens["refresh_token"],
            "grant_type": "refresh_token",
        },
        timeout=10.0,
    )
    response.raise_for_status()
    access_token = response.json().get("access_token")
    if not access_token:
        raise RuntimeError("Google OAuth refresh response did not contain an access token")
    tokens["access_token"] = access_token
    tokens["expires_in"] = str(response.json().get("expires_in", ""))
    return access_token, encrypt_tokens(tokens)
