from dataclasses import dataclass

from .simulation import BattleLayoutSpec, SimulationReport


@dataclass(slots=True, frozen=True)
class BalanceThresholds:
    max_side_advantage: float = 0.10
    max_timeout_rate: float = 0.10
    max_draw_rate: float = 0.40
    max_layout_win_share: float = 0.60
    require_equal_module_count: bool = True


@dataclass(slots=True, frozen=True)
class BalanceAnalysis:
    total_matches: int
    resolved_matches: int
    side_a_wins: int
    side_b_wins: int
    side_advantage: float
    timeout_rate: float
    draw_rate: float
    win_share_by_layout: dict[str, float]
    module_count_by_layout: dict[str, int]
    issues: tuple[str, ...]
    is_acceptable: bool


def analyze_balance(
    report: SimulationReport,
    layouts: tuple[BattleLayoutSpec, ...],
    thresholds: BalanceThresholds = BalanceThresholds(),
) -> BalanceAnalysis:
    total = len(report.matches)
    side_a_wins = 0
    side_b_wins = 0

    for match in report.matches:
        if match.timed_out or match.is_draw:
            continue
        if match.winner_layout_id == match.layout_a_id:
            side_a_wins += 1
        elif match.winner_layout_id == match.layout_b_id:
            side_b_wins += 1

    resolved = side_a_wins + side_b_wins
    side_advantage = (
        abs(side_a_wins - side_b_wins) / resolved
        if resolved else 0.0
    )
    timeout_rate = report.timeouts / total if total else 0.0
    draw_rate = report.draws / total if total else 0.0

    total_layout_wins = sum(report.wins_by_layout.values())
    win_share_by_layout = {
        layout_id: (
            wins / total_layout_wins
            if total_layout_wins else 0.0
        )
        for layout_id, wins in report.wins_by_layout.items()
    }

    module_count_by_layout = {
        layout.id: len(layout.modules)
        for layout in layouts
    }

    issues: list[str] = []

    if side_advantage > thresholds.max_side_advantage:
        issues.append(
            f"Taraf avantajı yüksek: {side_advantage:.3f}"
        )

    if timeout_rate > thresholds.max_timeout_rate:
        issues.append(
            f"Timeout oranı yüksek: {timeout_rate:.3f}"
        )

    if draw_rate > thresholds.max_draw_rate:
        issues.append(
            f"Beraberlik oranı yüksek: {draw_rate:.3f}"
        )

    for layout_id, share in win_share_by_layout.items():
        if share > thresholds.max_layout_win_share:
            issues.append(
                f"Aşırı baskın dizilim: {layout_id} ({share:.3f})"
            )

    if thresholds.require_equal_module_count:
        counts = set(module_count_by_layout.values())
        if len(counts) > 1:
            issues.append(
                "Simülasyon dizilimlerinin aktif modül sayıları eşit değil."
            )

    for layout_id, wins in report.wins_by_layout.items():
        if total >= 6 and wins == 0:
            issues.append(
                f"Hiç kazanamayan dizilim: {layout_id}"
            )

    return BalanceAnalysis(
        total_matches=total,
        resolved_matches=resolved,
        side_a_wins=side_a_wins,
        side_b_wins=side_b_wins,
        side_advantage=side_advantage,
        timeout_rate=timeout_rate,
        draw_rate=draw_rate,
        win_share_by_layout=win_share_by_layout,
        module_count_by_layout=module_count_by_layout,
        issues=tuple(issues),
        is_acceptable=not issues,
    )
