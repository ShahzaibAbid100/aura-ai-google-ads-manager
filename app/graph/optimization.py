from typing import Any, TypedDict

from langgraph.graph import END, StateGraph
from pydantic import BaseModel, ValidationError

from app.core.config import get_settings
from app.providers.llm import get_llm_provider
from app.services.analytics import normalize_metrics, optimize


class OptimizationState(TypedDict, total=False):
    metrics: dict[str, Any]
    normalized: dict[str, float]
    recommendations: list[dict[str, str]]
    provider: str


class RecommendationOutput(BaseModel):
    recommendations: list[dict[str, str]]


def build_optimization_graph():
    def evaluate(state: OptimizationState) -> dict[str, Any]:
        return {"normalized": normalize_metrics(state["metrics"])}

    def recommend(state: OptimizationState) -> dict[str, Any]:
        if get_settings().ai_provider != "local":
            return {"recommendations": optimize(state["normalized"]), "provider": "mock"}
        prompt = "Analyze these metrics and return only JSON: {\"recommendations\":[{\"area\":string,\"recommendation\":string,\"rationale\":string}]}. Recommendations only; never propose automatic account changes. Metrics: " + str(state["normalized"])
        try:
            output = RecommendationOutput.model_validate(get_llm_provider().generate_json(prompt))
        except (ValueError, ValidationError) as exc:
            raise RuntimeError(f"Local model returned invalid optimization recommendations: {exc}") from exc
        return {"recommendations": output.model_dump()["recommendations"], "provider": "local-real"}

    graph = StateGraph(OptimizationState)
    graph.add_node("evaluate", evaluate)
    graph.add_node("recommend", recommend)
    graph.set_entry_point("evaluate")
    graph.add_edge("evaluate", "recommend")
    graph.add_edge("recommend", END)
    return graph.compile()


optimization_graph = build_optimization_graph()
