# Dal sadeleştirmesi — 16 Kasım 2026

Kullanıcı kararı: fazla dal açmadan, main ve hazırlanan 2.5.0 ile devam edilir.
12 yerel / 13 uzak dal iki çalışma dalına indirilir. Açık GitHub PR bulunmadı.

## Bundan sonra

| Dal | Kullanım |
| --- | --- |
| `main` | Kabul edilmiş kod, güncel planlar ve operasyon kayıtları. |
| `codex/develop-2.5.0` | 2.5.0'ın bütün günlük geliştirmeleri. Bu işlem sonunda güncel main ile aynı uçta başlar. |

Küçük işler için ayrı kalıcı dal açılmaz. Kabul edilen 2.5.0 main'e alınır;
yayın kaynağı değişmez etiket ve manifestle sabitlenir. Sonraki sürüme
geçerken eski geliştirme dalı kapatılır; tamamlanmış sürüm dalları birikmez.

Başka bilgisayarda devam:

```powershell
git fetch origin --prune
git switch codex/develop-2.5.0
git pull --ff-only
```

## Geçmişin korunması

- Eski dalların bütün uçları main geçmişinde korunur. `4249aa14` erken yamasının
  karşılığı zaten `b7625d69` ve `c8b8220b` ile main'dedir. Özgün geçmişi
  `3cf8a76e` birleştirmesiyle kaydedildi.
- Uzak `codex/release-2.4.0` ucu `7e8eb415`, aynı adlı yerel uçtan farklıydı.
  E2E dosyası güncel main ile aynıdır; tarihçe `bb47036a` ile kaydedildi.
- Bu iki birleştirmede main'in kaynak ağacı birebir aynı kaldı. Eski takvim,
  uygulama sürümü veya kapatılmış özellikler geri getirilmedi.
- `v2.4.0`, rc.1–rc.5 etiketleri ve tam kaynak commitleri değiştirilmez.
  Aktif AAB kaynağı `v2.4.0-rc.5 / 825cbe27...` olarak kalır. Manifestteki
  `release_branch` tarihsel addır; `release_branch_archived=true` ve `source_ref`
  etiketi gerçek kaynak seçim yolunu belirtir.
- Canlı S1 operasyonu `3b3cdb51...` ve yayımlanmış katalog pini korunur.
  Canlı sunucuya veya AAB'ye bu işlemle yeni dağıtım yapılmaz.
- Sabit kaynak worktree'leri silinmez/resetlenmez. Önceki denetimde görülen
  farkları yalnız CRLF/LF idi; üretim kopyaları aynı şekilde tutulur.

## Kapatılan dal uçları

Aşağıdaki tam commitlerden gerekirse dal yeniden oluşturulabilir. Uzak silme,
uçların değişmediğini doğrulayan lease ve iki ana dalın gönderimiyle birlikte
atomik uygulanır; sonradan gelen bir commit sessizce silinmez.

| Dal | Yerel uç | Uzak uç |
| --- | --- | --- |
| `codex/early-240-patch-20261113` | `4249aa142060b16b30a1e55029a18fe40f50317c` | `4249aa142060b16b30a1e55029a18fe40f50317c` |
| `codex/legacy-230-system-mail` | `49b2eca2c2c79711db12ddf9325a65f402018f19` | `49b2eca2c2c79711db12ddf9325a65f402018f19` |
| `codex/liveops-foundations` | `be8f31fea62a8aeb686281792c5537d4a52d3af8` | `be8f31fea62a8aeb686281792c5537d4a52d3af8` |
| `codex/prerelease-announcements` | `c720f22108b3b8e79ae74faed4ab1cc64d1f465c` | `ef9918ff9f7ef3616a848eda1b43eee85cd9c585` |
| `codex/release-2-3-0` | `e0baaf43975307da8963cac15f3473a346cdca61` | `e0baaf43975307da8963cac15f3473a346cdca61` |
| `codex/release-2-4-0` | `c6f8b3aab686302942d5cb5df4ca929ce3895c10` | `c6f8b3aab686302942d5cb5df4ca929ce3895c10` |
| `codex/release-2.4.0` | `d465dffda1cb5c13d0faf2eca4e33924c83729a4` | `7e8eb4155c2d2a102317e514c0413735f982428a` |
| `codex/release-2.4.0-rc4` | `8572749e86a3d1ddbc3fabe22bea65f4a43060e2` | `8572749e86a3d1ddbc3fabe22bea65f4a43060e2` |
| `codex/release-2.4.0-rc5` | `22780583e61f03844cb0064b635bb2f1b6a95776` | `22780583e61f03844cb0064b635bb2f1b6a95776` |
| `codex/s1-bots-tournament-rewards` | `d5ba0e9629e3ef76b0f292b2c82ee6b67d7f7c5d` | `d5ba0e9629e3ef76b0f292b2c82ee6b67d7f7c5d` |
| `codex/s1-release-acceptance` | `—` | `8c706d44af73d2dfdb05d998e931e7b303e841d9` |
