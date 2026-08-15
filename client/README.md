# Project Relay 2.0 — Alpha.3 İstemci

Bu klasör `2.0.0-alpha.4 — Zaman Bazlı Aktif Modül Kapasitesi` için bağımsız bir web istemci prototipi içerir.

## Çalıştırma

Basit bir yerel HTTP sunucusu yeterlidir:

```bash
cd client
python -m http.server 8080
```

Ardından tarayıcıda `http://localhost:8080` açılabilir.

## Kapsam

- Savaş alanı
- Sürekli görünür Modül Rafı
- İlk 15 saniyede kilitli raf
- Raftan sahaya sürükle-bırak
- Sahadan rafa geri çekme
- Hücreler arası taşıma
- Modül üzerine bırakma ile değiştirme
- Savaş saatinin sürükleme sırasında devam etmesi

Bu paket **4→10 zaman bazlı aktif modül kapasitesini** içerir. **Devre Kredisi**, **nihai savaş alanı geometrisi** ve **online sunucu bağlantısı** henüz bu pakette yoktur.

İstemci savaş kararını vermez; yalnızca sunucuya gönderilecek komutları üretir. `app.js` içindeki yerel durum güncellemesi sadece alpha.3 arayüz demosu için sahte sunucu cevabıdır.
