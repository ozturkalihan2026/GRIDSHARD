# GRIDSHARD — Audio Direction

## 1. Ses kimliği

Ana müzik dili:

**Electro-industrial + tactical ambient + modern synth**

Kaçınılacak:
- jenerik 80'ler synthwave klişesi,
- stock EDM drop,
- orkestral savaş müziği taklidi,
- sürekli yüksek yoğunluk.

Amaç: oyuncunun zihinsel strateji kurmasına izin veren, savaş ilerledikçe katman ekleyen dinamik müzik.

---

## 2. Tempo haritası

| Durum | BPM | Karakter |
|---|---:|---|
| Ana Menü | `92–100` | karanlık, güçlü, elektrikli |
| Savaş Havuzu | `105–112` | analitik pulse |
| Eşleştirme | `115–120` | yükselen gerilim |
| Savaş Başlangıcı | `120–126` | aktivasyon |
| Savaş | `126–132` | ritmik, agresif fakat dikkat dağıtmayan |
| Kritik Çekirdek | mevcut BPM + yoğun katman | heartbeat / distortion |
| Zafer | `5–7 sn` sting | yükselen motif |
| Mağlubiyet | `5–7 sn` sting | çözülen motif |

---

## 3. Leitmotif

GRIDSHARD tüm müziklerinde aynı kısa motif ailesini kullanır.

Foundation motif tasarım kuralı:
- 4–6 nota,
- minör / modal karakter,
- tek başına hummable olacak kadar kısa,
- menüde pad,
- havuz ekranında pluck/pulse,
- savaşta bass/arpej,
- zaferde açık harmonik,
- mağlubiyette düşük oktav / kırılmış versiyon.

**Not:** Bu dosya bestelenmiş ses dosyası içermez. Nihai motif özgün olarak üretilecek ve lisans zinciri proje içinde tutulacaktır.

---

## 4. Dinamik katmanlar

`menu_base`
- düşük frekans drone
- yavaş pulse
- motif pad

`pool_focus`
- daha net tick/pulse
- düşük yoğunluk
- karar verme alanı

`matchmaking_rise`
- tempo hissi artar
- filtre yavaş açılır

`battle_base`
- kick/bass pulse
- kısa synth motif

`battle_pressure`
- düşman çekirdek / oyuncu çekirdek hasarına göre ek katman

`critical_core`
- heartbeat
- distortion
- kısa alarm harmonikleri

`victory_sting`
- motifin yukarı çözülen versiyonu

`defeat_sting`
- motifin aşağı çözülen / detune versiyonu

---

## 5. Ses efekt dili

### Port bağlantısı
`mekanik klik → elektrik kilidi → kısa enerji pulse`

### Enerji transferi
kısa dijital akım; sürekli uğultu yapılmaz.

### Jeneratör kapı değişimi
manyetik kilit açılması + yön değiştiren elektrik sesi.

### Lazer
kapasitör dolumu + sert elektrik boşalması.

### Kalkan
camsı/plazma darbesi.

### EMP
yüksek frekans kırılması + çok kısa sessizlik.

### Virüs
dijital glitch / bozulan paket sesi.

### Çekirdek hasarı
derin bass transient + elektrik çatlağı. GRIDSHARD'ın en tanınabilir seslerinden biri olmalıdır.

---

## 6. Teknik audio state mapping

UI / istemci şu state adlarını kullanabilir:

- `menu`
- `pool`
- `matchmaking`
- `battle_intro`
- `battle`
- `battle_pressure`
- `critical_core`
- `victory`
- `defeat`

Gerçek müzik dosyaları daha sonra `assets/audio/` altında özgün besteler olarak eklenir.
