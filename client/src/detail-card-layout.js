/* Shared static card presentation. No combat simulation, preview animation,
 * pagination, measurements, observer, animation frame or timer. */
(function(root){
  "use strict";
  const summaries={
    laser:"Hedefe kilitlenir ve kırmızı ışınla hasar verir.",
    shield:"Belirli aralıklarla gelen tek saldırının bir kısmını engeller.",
    cooler:"Bir müttefik modüle soğuk hava üfleyerek ısısını azaltır.",
    battery:"Devreye ek enerji üretir.",
    amplifier:"Uygun müttefik modüllere enerji desteği verir.",
    emp:"Rakip modülün çalışmasını kısa süreli kesintiye uğratır.",
    repair:"Hasarlı bir müttefik modülün canını onarır.",
    armor:"Gelen hasarın bir kısmını sönümler.",
    pulse_cannon:"Hedefe fiziksel mermi gönderir.",
    missile_launcher:"Hedefe füze fırlatır; füze isabette patlar.",
  };
  function description(item,{core=false,english=false}={}){
    const full=english?(item.description_en||item.role_en||item.description_tr||item.role_tr||item.strategic_role||""):(item.description_tr||item.role_tr||item.strategic_role||"");
    if(!core&&!english&&summaries[item.definition_id])return summaries[item.definition_id];
    const text=String(full||item.name_tr||"");
    const end=/[.!?]\s+(?=[A-ZÇĞİÖŞÜ])/u.exec(text);
    return end?text.slice(0,end.index+1):text;
  }
  function mount(host){
    const doc=host.ownerDocument,dialog=host.closest("dialog");if(!dialog)return;
    const english=doc.documentElement?.lang==="en",tab=host.dataset.tab||"overview";
    dialog.dataset.detailTab=tab;
    const header=dialog.querySelector(".module-detail-hero");
    if(header&&!header.querySelector(".detail-card-close")){
      const close=doc.createElement("button");close.type="button";close.className="detail-card-close";
      close.textContent="×";close.setAttribute("aria-label",english?"Close":"Kapat");
      close.addEventListener("click",()=>dialog.close());header.append(close);
    }
    const subtitle=dialog.querySelector(".detail-section-label");
    if(subtitle){subtitle.hidden=tab==="overview";subtitle.textContent=tab==="stats"?(english?"Statistics":"İstatistikler"):(english?"Talents":"Yetenekler");}
    for(const button of dialog.querySelectorAll("[data-module-detail-tab],[data-core-detail-tab]")){
      const active=(button.dataset.moduleDetailTab||button.dataset.coreDetailTab)===tab;
      button.setAttribute("aria-selected",String(active));
    }
  }
  const api={mount,description};root.GridshardDetailPages=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
