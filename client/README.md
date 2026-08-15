# Project Relay 2.0 — Alpha.3 İstemci

Bu klasör `2.0.0-alpha.3 — Modül Rafı ve Sürükle-Bırak Temeli` için bağımsız bir web istemci prototipi içerir.

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

Bu paket **Devre Kredisi**, **4→10 zaman bazlı kapasite**, **nihai savaş alanı geometrisi** ve **online sunucu bağlantısını** henüz içermez.

İstemci savaş kararını vermez; yalnızca sunucuya gönderilecek komutları üretir. `app.js` içindeki yerel durum güncellemesi sadece alpha.3 arayüz demosu için sahte sunucu cevabıdır.
