"""Orchestrate endpoint — kicks off the full simulation pipeline."""

from fastapi import APIRouter, Query

from app.schemas.responses import SuccessResponse
from app.services.orchestrator_service import run_orchestrated_simulation

router = APIRouter(prefix="/api/orchestrate", tags=["orchestrate"])


@router.post("/run", response_model=SuccessResponse[dict])
async def run_simulation(
    scenario: str = Query("uri", description="Scenario: uri or normal"),
    forecast_hour: int = Query(36, ge=0, le=47, description="Forecast hour offset"),
    grid_region: str = Query("ERCOT", description="Grid region"),
) -> SuccessResponse[dict]:
    """Run the full orchestrated simulation pipeline.

    Chains demand → cascade → price → alerts → crew dispatch, writing
    progress to Supabase for real-time frontend updates.
    """
    result = run_orchestrated_simulation(
        scenario=scenario,
        forecast_hour=forecast_hour,
        grid_region=grid_region,
    )
    return SuccessResponse(data=result)
