# Kullanımdan kaldırılmış denge araçları

14 Ekim 2026 teknik denetimi. Web-test taslak/simülasyon API'leri daha önce
kaldırılmıştı; testleri `../server-test-contracts-20261001/` içinde korunuyor.
Bu dosyalar ana API veya aktif testler tarafından kullanılmıyordu. Eski port,
Direction ve interaction-unlock kurallarını yeniden oyuna sokmadan kaynakları
buraya taşıdık. Tarihsel referanstır; güncel sunucu araçları değildir.

| Eski yol | Arşiv dosyası | Güncel karşılık |
| --- | --- | --- |
| server/app/balance_change_drafts.py | balance_change_drafts.py | Emekli API: server/tests/test_retired_contracts.py |
| server/app/balance_regression.py | balance_regression.py | server/tests/game/test_beta72_heat_energy_rework.py |
| server/app/balance_simulation.py | balance_simulation.py | server/tests/game/test_beta72_heat_energy_rework.py |
| tools/beta23_balance_report.py | beta23_balance_report.py | Güncel savaş motoru/katalog testleri |
| tools/beta24_energy_port_report.py | beta24_energy_port_report.py | Güncel çekirdek enerji testleri |
| tools/beta32_fix_acceptance_report.py | beta32_fix_acceptance_report.py | Güncel savaş/kompozisyon testleri |
| tools/beta37_ai_archetype_report.py | beta37_ai_archetype_report.py | Güncel AI arşetip testleri |

Kaynak içerikleri korunmuştur; arşivde eski imports bulunması bilinçlidir.
`tools/check_imports.py` aktif server/tools kapsamını tarar, arşivleri değil.
