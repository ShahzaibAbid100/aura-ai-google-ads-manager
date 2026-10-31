import argparse
import json
from pathlib import Path
import sys
from typing import Any

from fastapi.routing import APIRoute

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def build_and_validate() -> dict[str, Any]:
    from app.main import app

    schema = app.openapi()
    if not schema.get("openapi", "").startswith("3."):
        raise ValueError("FastAPI generated an unsupported OpenAPI version")
    paths = schema.get("paths", {})
    if not paths:
        raise ValueError("OpenAPI document contains no paths")
    operations: set[str] = set()
    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        for method in route.methods or set():
            if method in {"HEAD", "OPTIONS"}:
                continue
            operation_id = route.operation_id or route.unique_id
            if operation_id in operations:
                raise ValueError(f"Duplicate OpenAPI operation identifier: {operation_id}")
            operations.add(operation_id)
            item = paths.get(route.path)
            if not item or method.lower() not in item:
                raise ValueError(f"Route is missing from generated OpenAPI: {method} {route.path}")
            response = item[method.lower()].get("responses", {}).get("200") or item[method.lower()].get("responses", {}).get("202")
            if response is None:
                raise ValueError(f"Route has no successful response contract: {method} {route.path}")
            if route.response_model is not None and not response.get("content"):
                raise ValueError(f"JSON response model missing from schema: {method} {route.path}")
    for required in ("/api/v1/models/status", "/api/v1/campaigns/{campaign_id}/approve", "/api/v1/google-ads/report"):
        if required not in paths:
            raise ValueError(f"Required API path missing from OpenAPI: {required}")
    return schema


def main() -> int:
    parser = argparse.ArgumentParser(description="Export and validate the backend OpenAPI document.")
    parser.add_argument("--check", action="store_true", help="Fail if the checked-in OpenAPI file is not current")
    parser.add_argument("--output", type=Path, default=ROOT / "openapi.json")
    args = parser.parse_args()
    schema = build_and_validate()
    content = json.dumps(schema, indent=2, sort_keys=True) + "\n"
    if args.check:
        if not args.output.is_file() or args.output.read_text(encoding="utf-8") != content:
            raise SystemExit(f"OpenAPI document is missing or stale: {args.output}. Run scripts/export_openapi.py")
    else:
        args.output.write_text(content, encoding="utf-8")
    print(f"OpenAPI {schema['openapi']} valid: {len(schema['paths'])} paths, output={args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
