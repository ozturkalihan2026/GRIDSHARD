from dataclasses import dataclass


@dataclass(slots=True, frozen=True)
class CircuitCreditConfig:
    """
    GRIDSHARD 2.0 için ilk Devre Kredisi denge değerleri.

    Bunlar alpha denge değerleridir; simülasyon ve gerçek oyuncu testleriyle
    değiştirilebilir. Kullanıcıya ayrı satın alma/satma işlemi gösterilmez.
    """

    # Internal credit fields now carry match-only Akım, never the account wallet.
    starting_credits: int = 6
    passive_credits_per_second: float = 0.4
    maximum_current: int = 12
    current_regen_interval_ms: int = 2500
    move_cost: int = 10
    remove_cost: int = 0


DEFAULT_CIRCUIT_CREDIT_CONFIG = CircuitCreditConfig()
