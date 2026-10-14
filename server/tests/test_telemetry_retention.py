from app.telemetry import (
    InMemoryTelemetryService,
    JsonFileTelemetryRepository,
    TelemetryEvent,
)


def event(index):
    return TelemetryEvent(
        event_id=f"e{index}",
        event_type="game_opened",
        timestamp_ms=index,
    )


def test_retention_keeps_newest_events_in_memory_and_file(tmp_path):
    path=tmp_path/"telemetry.json"
    repo=JsonFileTelemetryRepository(
        path,
        max_events=3,
    )
    service=InMemoryTelemetryService(
        repository=repo
    )

    for index in range(5):
        service.record(
            event(index)
        )

    assert [
        item["event_id"]
        for item
        in service.events()
    ]==[
        "e2","e3","e4"
    ]

    restarted=InMemoryTelemetryService(
        repository=
            JsonFileTelemetryRepository(
                path,
                max_events=3,
            )
    )

    assert [
        item["event_id"]
        for item
        in restarted.events()
    ]==[
        "e2","e3","e4"
    ]


def test_deduplication_applies_to_retained_window(tmp_path):
    path=tmp_path/"telemetry.json"
    service=InMemoryTelemetryService(
        repository=
            JsonFileTelemetryRepository(
                path,
                max_events=2,
            )
    )

    service.record(event(0))
    service.record(event(1))
    service.record(event(2))

    assert service.record(
        event(2)
    ) is False

    # e0 retention penceresinden çıktı; yeni olay olarak tekrar alınabilir.
    assert service.record(
        event(0)
    ) is True


def test_health_exposes_retention_limit(tmp_path):
    repo=JsonFileTelemetryRepository(
        tmp_path/"telemetry.json",
        max_events=2,
    )
    repo.save([
        event(1),
        event(2),
    ])

    health=repo.health()

    assert health["retention_limit"]==2
    assert health["retention_active"] is True


def test_invalid_retention_limit_rejected(tmp_path):
    try:
        JsonFileTelemetryRepository(
            tmp_path/"telemetry.json",
            max_events=0,
        )
    except Exception as exc:
        assert (
            "retention"
            in str(exc).lower()
        )
    else:
        raise AssertionError(
            "Geçersiz retention limiti reddedilmeliydi."
        )


def test_memory_only_service_is_bounded_without_repository():
    # Canlı kipte depo bağlanmaz; liste yine de süreç yaşadıkça büyümemeli.
    service=InMemoryTelemetryService(max_events=10)

    for index in range(200):
        service.record(event(index))

    retained=[item["event_id"] for item in service.events()]
    assert len(retained) <= 11
    assert retained[-1] == "e199"
    assert "e0" not in retained
    assert len(service._event_ids) == len(retained)
    # Pencereden çıkan olay yeniden alınabilir, penceredeki yinelenir.
    assert service.record(event(199)) is False
    assert service.record(event(0)) is True


def test_overlong_identifiers_are_rejected():
    service=InMemoryTelemetryService(max_events=10)
    for field in ("event_id", "player_id", "session_id"):
        values={"event_id":"ok", "event_type":"game_opened", "timestamp_ms":1}
        values[field]="x" * 257
        try:
            service.record(TelemetryEvent(**values))
        except ValueError:
            continue
        raise AssertionError(f"Aşırı uzun {field} reddedilmeliydi.")
