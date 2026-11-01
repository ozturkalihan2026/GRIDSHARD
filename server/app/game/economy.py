"""The approved match economy: passive Current plus paired Attack/Defense HP."""
from dataclasses import dataclass

@dataclass(slots=True, frozen=True)
class CircuitCreditConfig:
    # Match-only Current, independent of the account's Circuit Credit wallet.
    starting_credits: int = 7
    maximum_current: int = 12
    current_regen_interval_ms: int = 3000
    damage_current_threshold: float = 100.0
    defense_current_threshold: float = 50.0
    # Paid execution talent is an explicit exception to generic combat income.
    allow_core_current_rewards: bool = True

DEFAULT_CIRCUIT_CREDIT_CONFIG = CircuitCreditConfig()
