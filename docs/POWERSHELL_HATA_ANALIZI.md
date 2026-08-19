# GRIDSHARD — PowerShell Hata Analizi

**İncelenen paket sonrası hedef sürüm:** `2.0.0-beta.17`

## Gözlenen hata

Kullanıcı PowerShell çıktılarında sunucu başarıyla açılıyor ve ana kaynak/API çağrılarının büyük bölümü `200 OK` dönüyor.

Tekrarlanan kritik hata:

```text
GET /telemetry/manual-battle-report?... 500 Internal Server Error
AttributeError: 'dict' object has no attribute 'player_id'
```

Hata eski biçimdeki şu erişimden kaynaklanıyor:

```python
event.player_id
```

`TelemetryService.events()` JSON/API katmanında olayları `dict` biçiminde döndürebildiği için rapor katmanı hem nesne hem dict olaylarını desteklemelidir.

## Beta.16 ZIP inceleme sonucu

Teslim edilmiş `gridshard-2.0.0-beta.16.zip` içindeki `server/app/manual_battle_report.py` dosyası incelendiğinde dict/nesne uyumluluk katmanının (`_event_value`, `_event_metadata`) mevcut olduğu ve ham `event.player_id` erişiminin bulunmadığı doğrulandı.

Bu nedenle PowerShell traceback'inde görünen:

```text
manual_battle_report.py ... or event.player_id
```

satırı, çalıştırılan `D:\Projects\GRIDSHARD` klasöründe eski veya karışık bir kaynak dosyasının kaldığını gösterir. Bu durum genellikle yeni ZIP içeriğinin eski proje klasörünün üzerine kopyalanması veya farklı klasördeki eski sunucunun çalıştırılmasıyla oluşabilir.

## Beta.17 kalıcı önlem

Beta.17 ile `tools/release_guard.py` eklendi.

`BASLAT_WEB_TEST.bat` sunucu açılmadan önce otomatik olarak:

1. çalışan sürümün `2.0.0-beta.17` olduğunu,
2. `manual_battle_report.py` içinde eski `event.player_id` erişiminin bulunmadığını,
3. dict biçimindeki gerçek telemetri probe'unun `build_manual_battle_report()` tarafından başarıyla işlendiğini

doğrular.

Kontrol başarısızsa Uvicorn hiç başlatılmaz ve kullanıcıya ZIP'i boş bir klasöre çıkarması gerektiği açıkça bildirilir.

## QA koruması

`tools/qa.py` canlı Uvicorn smoke zincirine doğrudan:

```text
/telemetry/manual-battle-report?player_id=qa-smoke
```

çağrısı eklenmiştir.

Ayrıca sunucu testlerinde `TelemetryService.events()` tarafından döndürülen gerçek dict event listesiyle endpoint'in `200 OK` dönmesi regresyon testiyle kilitlenmiştir.
