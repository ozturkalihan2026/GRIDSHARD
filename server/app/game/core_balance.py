"""The seven current core roles; former compound signatures are retired."""

CORE_POWER_FULL_CHARGE = 100.0


CORE_ROLES_V5={
    'core_resonance':{'kind':'shockwave','damage':90,'secondary_ratio':.5},
    'core_guardian':{'kind':'fortress','damage':20,'interval_ms':1000,'duration_ms':6000,'reduction':.6},
    'core_overdrive':{'kind':'flame','damage':18,'interval_ms':500,'duration_ms':6000},
    'core_disruptor':{'kind':'execution','delay_ms':1500},
    'core_capacitor':{'kind':'reinforcement'},
    'core_phoenix':{'kind':'drain','damage':150,'heal_ratio':1.0},
    'core_quantum':{'kind':'fracture','hp_ratio':.5},
}


def core_signature(core_type: str) -> dict[str, str]:
    return dict(CORE_SIGNATURES.get(str(core_type), CORE_SIGNATURES["core_resonance"]))


def core_power_threshold(core_type: str) -> float:
    return CORE_POWER_FULL_CHARGE


CORE_POWER_ROLES={
 'core_resonance':('Rezonans Dalgası','Öncelik sırasındaki üç hedefe 90 / 45 / 45 temel hasar verir. Hasar çekirdek seviyesiyle gelişir.'),
 'core_guardian':('Savaş Kalesi','Çekirdek 6 sn boyunca saniyede bir 20 temel hasarla ateş eder; kendi aldığı hasarı %60 azaltır.'),
 'core_overdrive':('Alev Fırtınası','Çekirdek 6 sn boyunca yarım saniyede bir 18 temel hasarla ateş eder; başka silah gerektirmez.'),
 'core_disruptor':('İmha İşareti','Akım bedeli en yüksek rakip modülü 1,5 sn sonra imha eder. Arındırıcı işareti siler; faz imhayı engeller. Çekirdek hedeflenmez.'),
 'core_capacitor':('Takviye Çağrısı','Destendeki altı karttan rastgele birini kendi seviye ve yetenekleriyle ücretsiz kurar. Boş hücre yoksa dolum korunur.'),
 'core_phoenix':('Anka Alevi','Hedefe 150 temel hasar verir; verdiği gerçek CAN hasarı kadar yalnız kendi çekirdeğini onarır.'),
 'core_quantum':('Kuantum Yarığı','CAN’ı en yüksek rakip modülün mevcut CAN’ının yarısını götürür; zırh ve kalkanı aşar. Faz engeller; çekirdek hedeflenmez.'),
}


CORE_SIGNATURES={key:{'signature_id':'v2_'+key,'name_tr':name,'signature_tr':description,
    'telegraph_tr':'Çekirdek gücü kendisi uygular; saldırı, imha işareti veya çağrılan takviye doğrudan görünür.',
    'counterplay_tr':'Güç kullanımından sonra oluşan 35 saniyelik dolum penceresinde karşılık ver.'}
    for key,(name,description) in CORE_POWER_ROLES.items()}
