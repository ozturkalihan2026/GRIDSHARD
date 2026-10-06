"""Herkese görünen adlar için süzgeç (oyuncu adı, takım adı).

Çocuk hedef kitle kararı (docs/CHILD_AUDIENCE_AUDIT.md): adlar serbest kalır
ama iletişim bilgisi ya da kaba söz içeren ad kabul edilmez. Bu bir ilk
savunma hattıdır; her kötüye kullanımı yakalamaz, şikâyet yolu yerinde durur.
Eski adlar geriye dönük taranmaz.

Liste bilerek dardır: masum kelimeyi reddetmek, kaçan bir kaba sözden daha
sık yaşanır. Türkçede "sık", "sıkıştır", "oynayarak", "Nazım" gibi kelimeler
kaba köklerle aynı harfleri taşır; bu yüzden noktasız "ı" ayrı bir harf
sayılır ve kısa kökler yalnız ayrı kelime olduklarında reddedilir.
"""

from __future__ import annotations

import re
import unicodedata


MAX_DIGITS = 4

# Harf yerine yazılan rakam ve işaretler (ör. "s1k", "$ex").
_LEET = str.maketrans({
    "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t",
    "$": "s", "!": "i",
})
_TURKISH = str.maketrans("çğöşüâîû", "cgosuaiu")
_NOT_LETTER = re.compile(r"[^a-zı]+")

_CONTACT_PATTERN = re.compile(r"@|\.(com|net|org|io|gg|tr|me|co)\b")
# Adın herhangi bir yerinde geçmesi yeter.
_CONTACT_FRAGMENTS = (
    "http", "www", "instagram", "tiktok", "whatsapp", "telegram", "discord",
    "snapchat", "facebook", "twitter", "youtube", "gmail", "hotmail",
)
_CONTACT_WORDS = frozenset({"insta"})

# Uzun ve ayırt edici kökler: adın herhangi bir yerinde aranır.
_BLOCKED_FRAGMENTS = (
    "orospu", "orosbu", "yarrak", "amcik", "amcık", "aminak", "amınak",
    "siktir", "sikerim", "sikeyim", "sikicem", "sokayim", "sokayım",
    "pezevenk", "kahpe", "kaltak", "gotveren", "serefsiz", "gerizekali",
    "gerizekalı", "ibne", "fuck", "shit", "bitch", "cunt", "nigger", "nigga",
    "faggot", "whore", "slut", "pussy", "asshole", "bastard", "porn", "hitler",
)
# Kısa kökler masum kelimelerin içinde de geçer ("klasik", "epic", "grape",
# "Nazım"); yalnız ayrı bir kelime olduklarında reddedilir.
_BLOCKED_WORDS = frozenset({
    "sik", "sikik", "yarak", "amk", "aq", "pic", "sex", "sexy", "dick", "cock",
    "rape", "nazi",
})


def _fold(value: str) -> str:
    text = unicodedata.normalize("NFKC", str(value or "")).casefold()
    # casefold "İ" harfini "i" + birleşen nokta yapar.
    return text.replace("i̇", "i").translate(_TURKISH)


def _limit_runs(text: str, limit: int) -> str:
    """Uzatılmış harfleri kısaltır ("siiiktir" → "siktir")."""
    return re.sub(r"(.)\1{" + str(limit) + r",}", lambda match: match.group(1) * limit, text)


def _contains_any(texts: tuple[str, ...], fragments: tuple[str, ...]) -> bool:
    return any(fragment in text for text in texts for fragment in fragments)


def public_name_rejection(value: str, *, label: str = "Ad") -> str | None:
    """Ad kabul edilemezse oyuncuya gösterilecek nedeni, edilebilirse None döndürür."""
    raw = str(value or "")
    if sum(char.isdigit() for char in raw) > MAX_DIGITS:
        return f"{label} en fazla {MAX_DIGITS} rakam içerebilir; telefon ya da numara yazma."
    folded = _fold(raw)
    if _CONTACT_PATTERN.search(folded):
        return f"{label} e-posta, internet adresi ya da kullanıcı adı içeremez."

    leet = folded.translate(_LEET)
    joined = _NOT_LETTER.sub("", leet)
    # Çift harfli kökler ("yarrak") için en çok iki, diğerleri için tek tekrar.
    forms = (_limit_runs(joined, 2), _limit_runs(joined, 1))
    words = {
        _limit_runs(word, limit)
        for word in _NOT_LETTER.split(leet) if word
        for limit in (2, 1)
    }
    # Harfleri ayırarak yazılmış kısa kökler de ("s i k") tek kelime sayılır.
    if len(forms[1]) <= 5:
        words.update(forms)

    if _contains_any(forms, _CONTACT_FRAGMENTS) or words & _CONTACT_WORDS:
        return f"{label} sosyal ağ ya da iletişim bilgisi içeremez."
    if _contains_any(forms, _BLOCKED_FRAGMENTS) or words & _BLOCKED_WORDS:
        return f"{label} uygun değil; başka bir ad seç."
    return None
