from dataclasses import dataclass


@dataclass(slots=True, frozen=True)
class CircuitCreditConfig:
    """Maç içi Akım ekonomisi: başlangıç, tavan ve yenilenme aralığı."""

    # Internal credit fields now carry match-only Akım, never the account wallet.
    starting_credits: int = 6
    maximum_current: int = 12
    current_regen_interval_ms: int = 2500


DEFAULT_CIRCUIT_CREDIT_CONFIG = CircuitCreditConfig()
