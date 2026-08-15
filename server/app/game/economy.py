from dataclasses import dataclass


@dataclass(slots=True, frozen=True)
class CircuitCreditConfig:
    """
    Project Relay 2.0 için ilk Devre Kredisi denge değerleri.

    Bunlar alpha denge değerleridir; simülasyon ve gerçek oyuncu testleriyle
    değiştirilebilir. Kullanıcıya ayrı satın alma/satma işlemi gösterilmez.
    """

    starting_credits: int = 200
    passive_credits_per_second: int = 10
    move_cost: int = 10
    rotate_cost: int = 0
    remove_cost: int = 0


DEFAULT_CIRCUIT_CREDIT_CONFIG = CircuitCreditConfig()
