import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.model_registry import MODEL_SPECS, check_model


def main() -> int:
    results = [check_model(key) for key in MODEL_SPECS]
    print(json.dumps(results, indent=2))
    return 0 if all(item["available"] for item in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())