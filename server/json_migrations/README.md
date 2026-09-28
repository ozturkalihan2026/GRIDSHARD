# JSON dosya deposu göçleri

PostgreSQL şeması `server/migrations/NNN_*.sql` ile, JSON dosya depoları bu klasörle sürümlenir.

## Dosya düzeni

```
server/json_migrations/<depo>/NNN_kisa_ad.py
```

Geçerli depo adları: `platform_state`, `telemetry`, `battle_pool_presets`, `teams`, `identities`, `players`. `identities` ve `players` yalnız `DATABASE_URL` yokken JSON dosyasıdır; PostgreSQL modunda bu klasördeki göçleri atlanır.

Her göç modülü:

```python
def up(payload):
    # payload: dosyadaki JSON (boş dosyada None). Dönüşmüş yükü döndür.
    return payload


def down(payload):  # isteğe bağlı, önerilir
    return payload
```

## Kurallar

- Uygulanmış göç dosyası değiştirilmez; düzeltme yeni numarayla yazılır (sıradaki `002`). Checksum değişirse sunucu açılmaz.
- Geliştirmede göçler sunucu açılışında otomatik uygulanır. Geçmişi olmayan mevcut dosya çerçeve öncesi biçimde sayılır; dosya yoksa göçler dönüşümsüz uygulanmış sayılır, çünkü kod yeni dosyayı güncel biçimde üretir.
- Üretimde (`GRIDSHARD_RUNTIME_MODE=production`) mevcut veriyi dönüştürecek göç açılışta uygulanmaz; sunucu "JSON şema göçü bekliyor" hatasıyla durur. Operatör sunucu dururken `up` çalıştırır. Henüz oluşmamış deponun göçü dönüşümsüz olduğu için yine açılışta kaydedilir.
- Her dönüşümden önce `<dosya>.pre-NNN.bak` anlık yedeği aynı baytlardan alınır ve özeti doğrulanır. Yedek alındıktan sonra depo değişirse göç durur.
- Geçmiş `<dosya>.schema.json` içinde tutulur. Yeni kayıtlar hash zinciriyle bağlanır: her kayıt `previous_hash` ile önceki kaydın, `entry_hash` ile kendi kanonik özetini taşır. Zincirden önce yazılmış ilk kayıtlar (Beta.72 `001` göçleri) zincirin başında geçerlidir. Elle değiştirilmiş kayıt veya kayıtlarla uyuşmayan `version` alanı açılışı durdurur.
- Geri alma uygulanmış zincirden son kaydı çıkarır; iz `rollbacks` listesinde saklanır (yöntem: `down`, `snapshot` veya `record_only`).
- `down` yoksa geri alma yalnız dosya göçten sonra hiç yazılmadıysa ve yedeğin özeti göç öncesi özetle eşleşiyorsa yedekten yapılır.
- İki depo aynı dosya yoluna ayarlanırsa açılış ve araç durur.

## Operatör aracı

```
python tools/json_schema_migrate.py status
python tools/json_schema_migrate.py check      # bekleyen göç veya değişmiş yedek varsa çıkış kodu 2
python tools/json_schema_migrate.py up [--store teams]
python tools/json_schema_migrate.py down --store teams --allow-destructive
```

`status` her uygulanmış göçün yedeğini `ok`, `missing` (silinmiş) veya `changed` (değişmiş) olarak gösterir. Silinmiş yedek yalnız o göçün yedekten geri alınmasını engeller; değişmiş yedek `check` sonucunu başarısız yapar ve açılışta uyarı loglanır.

Araç ilk yazımdan önce seçili bütün depoların geçmişini doğrular. Geri alma sunucu durdurulmuşken yapılmalıdır; geliştirmede açılış göçü yeniden uygular.
