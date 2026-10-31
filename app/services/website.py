import ipaddress
import socket
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from app.core.config import get_settings


def validate_public_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("Only public http(s) URLs without embedded credentials are allowed")
    host = parsed.hostname.rstrip(".").lower()
    if host == "localhost" or host.endswith(".localhost") or host.endswith(".local"):
        raise ValueError("Local network destinations are not allowed")
    try:
        addresses = {entry[4][0] for entry in socket.getaddrinfo(host, parsed.port or (443 if parsed.scheme == "https" else 80))}
    except socket.gaierror as exc:
        raise ValueError("Website host could not be resolved") from exc
    for address in addresses:
        ip = ipaddress.ip_address(address)
        if not ip.is_global:
            raise ValueError("Private or non-public network destinations are not allowed")
    return url


def analyze_website(url: str) -> dict[str, object]:
    settings = get_settings()
    current_url = validate_public_url(url)
    body = b""
    for _ in range(4):
        with httpx.Client(timeout=settings.crawl_timeout_seconds, follow_redirects=False, headers={"User-Agent": "AuraAdsAnalyzer/1.0"}) as client:
            with client.stream("GET", current_url) as response:
                if response.status_code in {301, 302, 303, 307, 308}:
                    location = response.headers.get("location")
                    if not location:
                        raise ValueError("Website returned an invalid redirect")
                    current_url = validate_public_url(urljoin(current_url, location))
                    continue
                response.raise_for_status()
                content_type = response.headers.get("content-type", "")
                if "text/html" not in content_type:
                    raise ValueError("Website did not return HTML")
                for chunk in response.iter_bytes():
                    body += chunk
                    if len(body) > settings.max_crawl_bytes:
                        raise ValueError("Website response exceeded the configured size limit")
                break
    else:
        raise ValueError("Website exceeded the redirect limit")

    soup = BeautifulSoup(body, "html.parser")
    title = soup.title.get_text(" ", strip=True) if soup.title else ""
    description_tag = soup.find("meta", attrs={"name": "description"})
    description = description_tag.get("content", "") if description_tag else ""
    useful_text = " ".join(soup.stripped_strings)
    images = [urljoin(current_url, image.get("src", "")) for image in soup.find_all("img") if image.get("src")][:30]
    logo = next((urljoin(current_url, image.get("src", "")) for image in soup.find_all("img") if "logo" in " ".join(image.get("class", [])).lower() or "logo" in image.get("alt", "").lower()), None)
    links = [urljoin(current_url, link.get("href", "")) for link in soup.find_all("a") if link.get("href", "").startswith("/")][:20]
    return {
        "url": current_url, "business_name": title, "description": description,
        "products_services": [], "categories": [], "pricing": [], "logo_url": logo,
        "colors": [], "text": useful_text[:12000], "images": images,
        "landing_pages": links, "metadata": {"title": title, "description": description},
        "provider": "httpx+beautifulsoup",
    }
