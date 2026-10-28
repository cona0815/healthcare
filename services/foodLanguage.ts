// Presentation only: retain original reports, conditions and stored analysis.
export function foodAdviceLanguage(text:string|undefined){return (text||'').replace(/糖尿病/g,'血糖管理需求').replace(/高血壓(病)?/g,'血壓偏高').replace(/高血脂(症)?/g,'血脂偏高').replace(/脂肪肝/g,'肝臟脂肪偏高').replace(/痛風/g,'尿酸管理需求').replace(/慢性腎臟病|腎臟病|腎病/g,'腎功能管理需求');}
