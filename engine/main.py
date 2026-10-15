"""Layanan hitung SOLUNA (FastAPI).

Jalankan:  .venv/Scripts/python -m uvicorn main:app --port 8000
Setiap endpoint menerima {"input": {...}, "config": {...}} — config adalah konfigurasi
aktif dari basis data, digabung di atas nilai bawaan. Masukan dan konfigurasi yang
sama selalu menghasilkan keluaran yang sama (NF-7).
"""

from __future__ import annotations

import math
from typing import Any, Generic, TypeVar

from fastapi import FastAPI
from pydantic import BaseModel

from soluna_engine import assessment, compatibility, explain, lifecycle, match, planner, resilience
from soluna_engine.config import MODEL_VERSION, default_config, merge_config

app = FastAPI(title="SOLUNA Engine", version="0.1.0")

T = TypeVar("T")


class Req(BaseModel, Generic[T]):
    input: T
    config: dict[str, Any] | None = None


def _clean(obj: Any) -> Any:
    """JSON tidak mengenal Infinity: 'tidak terbatas' dikirim sebagai null."""
    if isinstance(obj, float) and (math.isinf(obj) or math.isnan(obj)):
        return None
    if isinstance(obj, dict):
        return {k: _clean(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_clean(v) for v in obj]
    return obj


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "versi_model": MODEL_VERSION}


@app.get("/config/default")
def config_default() -> dict[str, Any]:
    return default_config()


@app.post("/assess")
def post_assess(req: Req[assessment.AssessmentInput]) -> dict[str, Any]:
    return _clean(assessment.assess(req.input, merge_config(req.config)))


@app.post("/plan")
def post_plan(req: Req[planner.PlanInput]) -> dict[str, Any]:
    return _clean(planner.plan(req.input, merge_config(req.config)))


@app.post("/resilience")
def post_resilience(req: Req[resilience.ResilienceInput]) -> dict[str, Any]:
    return _clean(resilience.simulate(req.input, merge_config(req.config)))


@app.post("/compatibility")
def post_compatibility(req: Req[compatibility.CompatibilityInput]) -> dict[str, Any]:
    return _clean(compatibility.check(req.input, merge_config(req.config)))


@app.post("/lifecycle")
def post_lifecycle(req: Req[lifecycle.LifecycleInput]) -> dict[str, Any]:
    return _clean(lifecycle.analyze(req.input, merge_config(req.config)))


@app.post("/match")
def post_match(req: Req[match.MatchInput]) -> dict[str, Any]:
    return _clean(match.match(req.input, merge_config(req.config)))


@app.post("/explain")
def post_explain(req: Req[explain.ExplainInput]) -> dict[str, Any]:
    return explain.explain(req.input)
