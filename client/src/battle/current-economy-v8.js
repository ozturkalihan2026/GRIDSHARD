(() => {
  "use strict";
  const copy = {
    tr:{title:"İki koşul, +1 Akım",
      passive:"7 Akımla başlarsın. Depon 12; her 3 saniyede +1 Akım gelir.",
      bonus:"Saldırı modüllerin 100 hasar verdiğinde VE Savunma modüllerin 50 CAN kaybettiğinde ek +1 Akım kazanırsın.",
      detail:"İki koşul birlikte tamamlanır; artan ilerleme sonraki bonusa taşınır. Engellenen hasar ve onarılan aynı CAN tekrar sayılmaz. Depo dolunca bonus ilerlemesi sıfırlanır.",
      core:"Çekirdeğin aldığı veya verdiği hasar bu iki sayacı doldurmaz. Akım veren çekirdek yetenekleri kendi açıklamalarındaki gibi çalışır."},
    en:{title:"Two conditions, +1 Current",
      passive:"Start with 7 Current. Capacity is 12; gain +1 every 3 seconds.",
      bonus:"Deal 100 damage with Attack modules AND lose 50 HP on Defense modules to earn +1 extra Current.",
      detail:"Complete both conditions together; surplus progress carries into the next bonus. Prevented damage and re-damaging repaired HP do not count. Filling the capacity resets bonus progress.",
      core:"Your Core's own damage dealt or HP lost does not fill these counters. Core talents that grant Current still work as described."},
  };
  const positive=(n,fallback)=>Number.isFinite(Number(n))&&Number(n)>0?Number(n):fallback;
  function progress(player={},english=false){
    const bonus=player.current_bonus||{},damageLimit=positive(bonus.damage_threshold,100),defenseLimit=positive(bonus.defense_threshold,50);
    const value=(n,cap)=>Math.max(0,Math.min(cap,Number(n)||0));
    const damage=value(bonus.damage,damageLimit),defense=value(bonus.defense,defenseLimit);
    const percent=Math.floor(100*Math.min(damage/damageLimit,defense/defenseLimit));
    const format=n=>Math.floor(n).toString();
    return {percent,damagePercent:Math.round(100*damage/damageLimit),defensePercent:Math.round(100*defense/defenseLimit),
      text:english
        ? `Attack ${format(damage)}/${damageLimit} + Defense HP lost ${format(defense)}/${defenseLimit} → +1 Current`
        : `Saldırı ${format(damage)}/${damageLimit} + Savunma CAN kaybı ${format(defense)}/${defenseLimit} → +1 Akım`};
  }
  globalThis.GridshardCurrentRules={copy,progress};
  if(typeof module!=="undefined"&&module.exports)module.exports=globalThis.GridshardCurrentRules;
})();
