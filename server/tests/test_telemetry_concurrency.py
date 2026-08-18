from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from app.telemetry import (
    InMemoryTelemetryService,
    JsonFileTelemetryRepository,
    TelemetryEvent,
)


def test_persistent_telemetry_handles_concurrent_writes(
    tmp_path: Path,
):
    repo=JsonFileTelemetryRepository(
        tmp_path/"telemetry.json",
        max_events=500,
    )
    service=InMemoryTelemetryService(
        repository=repo,
    )

    def record(index: int):
        return service.record(
            TelemetryEvent(
                event_id=f"event-{index}",
                event_type=
                    "web_test_stability_snapshot",
                timestamp_ms=1000+index,
                metadata={
                    "test_run_id":"r",
                    "stability":"stable",
                },
            )
        )

    with ThreadPoolExecutor(
        max_workers=12
    ) as executor:
        results=list(
            executor.map(
                record,
                range(80),
            )
        )

    assert all(results)
    assert len(
        repo.load()
    )==80
    assert not list(
        tmp_path.glob(
            "*.tmp"
        )
    )
