from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from app.services.campaigns import generate_ad_copy, plan_campaign, validate_copy


class PlanState(TypedDict, total=False):
    request: dict[str, Any]
    plan: dict[str, Any]


def build_planning_graph():
    graph = StateGraph(PlanState)
    graph.add_node("recommend", lambda state: {"plan": plan_campaign(state["request"])})
    graph.set_entry_point("recommend")
    graph.add_edge("recommend", END)
    return graph.compile()


class CopyState(TypedDict, total=False):
    request: dict[str, Any]
    copy: dict[str, Any]
    issues: list[dict[str, str]]
    attempts: int


def build_copy_graph(max_revisions: int = 2):
    def generate(state: CopyState) -> dict[str, Any]:
        request = state["request"]
        return {"copy": generate_ad_copy(request["product_name"], request.get("benefits", []), request.get("verified_claims", []), request.get("variations", 3)), "attempts": state.get("attempts", 0)}

    def evaluate(state: CopyState) -> dict[str, Any]:
        return {"issues": validate_copy(state["copy"])}

    def revise(state: CopyState) -> dict[str, Any]:
        copy = dict(state["copy"])
        copy["headlines"] = [{**item, "text": item["text"][:30]} for item in copy.get("headlines", [])]
        return {"copy": copy, "attempts": state.get("attempts", 0) + 1}

    def route(state: CopyState) -> str:
        if not state.get("issues") or state.get("attempts", 0) >= max_revisions:
            return "done"
        return "revise"

    graph = StateGraph(CopyState)
    graph.add_node("generate", generate)
    graph.add_node("evaluate", evaluate)
    graph.add_node("revise", revise)
    graph.set_entry_point("generate")
    graph.add_edge("generate", "evaluate")
    graph.add_conditional_edges("evaluate", route, {"revise": "revise", "done": END})
    graph.add_edge("revise", "evaluate")
    return graph.compile()


planning_graph = build_planning_graph()
copy_graph = build_copy_graph()