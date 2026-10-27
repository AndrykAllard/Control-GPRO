/* ---------- línea base por etapa, forecast semanal y cumplimiento ----------
   Iniciativa: lb{etapa:fecha término LB} · fc{etapa:fecha forecast} · real{etapa:fecha real}
   Proyecto:   lbRev{n,fecha,motivo,estado:"congelada"|"revision"} · lbHist[{n,fecha,motivo,lb:{iniId:{...}}}]
               semanas[{corte,plan,real,spi,venc,at,atraso,rev}]  (foto de cada cierre semanal) */
const isoLocal=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const hoy=()=>isoLocal(new Date());
const ddiff=(a,b)=>Math.round((new Date(a+"T12:00")-new Date(b+"T12:00"))/864e5);   // a − b en días
const dm=d=>d?d.slice(8,10)+"-"+d.slice(5,7):"";
const stagesOf=i=>(KINDS[i.kind]||KINDS.ing).stages;
const lbState=p=>p.lbRev?(p.lbRev.estado||"congelada"):"borrador";
const lbLocked=p=>lbState(p)==="congelada";
const pctTxt=v=>v==null?"—":Math.round(v*100)+"%";

function iniCum(i,d){
  const st=stagesOf(i),e=i.etapas||{},lb=i.lb||{},fc=i.fc||{},re=i.real||{};
  const withLb=st.filter(s=>lb[s.k]);if(!withLb.length)return null;
  const venc=withLb.filter(s=>lb[s.k]<=d);
  const at=venc.filter(s=>e[s.k]==="ok"&&(!re[s.k]||re[s.k]<=lb[s.k])).length;
  const endLb=withLb.map(s=>lb[s.k]).sort().pop();
  /* forecast en cascada: el atraso de una etapa empuja a las siguientes que no tienen forecast propio */
  const add=(x,n)=>{const t=new Date(x+"T12:00");t.setDate(t.getDate()+n);return isoLocal(t);};
  let slip=0,endFc=null;
  st.forEach(s=>{const L=lb[s.k];let p;
    if(e[s.k]==="ok")p=re[s.k]||L||null;
    else{p=fc[s.k]||(L?add(L,slip):null);if(p&&p<d)p=d;}
    if(p&&L)slip=Math.max(slip,ddiff(p,L));if(p&&(!endFc||p>endFc))endFc=p;});
  endFc=endFc||endLb;
  return {plan:venc.length/st.length,real:iniProg(i).pct,venc:venc.length,at,endLb,endFc,lbN:withLb.length,total:st.length};
}
function cumOf(p,d=hoy()){
  const k=kidsOf(p).map(i=>({i,c:iniCum(i,d),w:Math.max(0,num(i.ppto))})).filter(x=>x.c);
  if(!k.length)return null;
  const tw=k.reduce((s,x)=>s+x.w,0),wt=x=>tw>0?x.w/tw:1/k.length;
  const plan=k.reduce((s,x)=>s+x.c.plan*wt(x),0),real=k.reduce((s,x)=>s+x.c.real*wt(x),0);
  const venc=k.reduce((s,x)=>s+x.c.venc,0),at=k.reduce((s,x)=>s+x.c.at,0);
  const endLb=k.map(x=>x.c.endLb).sort().pop(),endFc=k.map(x=>x.c.endFc).sort().pop();
  const lbN=k.reduce((s,x)=>s+x.c.lbN,0),total=kidsOf(p).reduce((s,i)=>s+stagesOf(i).length,0);
  return {plan,real,spi:plan>0?real/plan:null,venc,at,endLb,endFc,atraso:ddiff(endFc,endLb),lbN,total};
}
function semOf(c){
  if(!c)return "na";const h=c.venc?c.at/c.venc:1;
  if((c.spi!=null&&c.spi<0.85)||h<0.7||c.atraso>30)return "bad";
  if((c.spi==null||c.spi>=0.95)&&h>=0.9&&c.atraso<=0)return "ok";
  return "warn";
}
const SEMTXT={ok:"En plazo",warn:"Con desvío",bad:"Atrasado",na:"Sin LB"};
const revTxt=p=>{const s=lbState(p);return s==="borrador"?"LB borrador":s==="revision"?`LB Rev.${p.lbRev.n} en revisión`:`LB Rev.${p.lbRev.n}`;};
const atrTxt=a=>a>0?`+${a} d`:a<0?`${a} d`:"al día";

/* insignia de cumplimiento en la fila del proyecto */
function lbBadge(p){
  const c=cumOf(p);
  if(!c&&lbState(p)==="borrador")return `<button class="lbb none" data-lb="${p.id}" title="Definir la línea base de las etapas">＋ Línea base</button>`;
  const s=semOf(c);
  return `<button class="lbb ${s}" data-lb="${p.id}" title="${SEMTXT[s]} · ver línea base y cumplimiento"><span class="sdot"></span><span><b>${revTxt(p)}</b>${c?` · ${atrTxt(c.atraso)}<small>plan ${pctTxt(c.plan)} · real ${pctTxt(c.real)}</small>`:""}</span></button>`;
}
$("#rows").addEventListener("click",e=>{const b=e.target.closest("[data-lb]");if(b){e.stopPropagation();openLb(b.dataset.lb);}},true);

/* ---------- modal de línea base ---------- */
let lbId=null,lbWarn=false,lbAsk=false;
function openLb(id){lbId=id;lbWarn=false;lbAsk=false;renderLb();$("#lbModal").hidden=false;}
const closeLb=()=>{$("#lbModal").hidden=true;lbId=null;};
function renderLb(){
  const p=projects.find(x=>x.id===lbId);if(!p){closeLb();return;}
  const st=lbState(p),locked=lbLocked(p),c=cumOf(p),k=kidsOf(p),d=hoy();
  $("#lbTitle").textContent="Línea base · "+p.nombre;
  const miss=k.reduce((s,i)=>s+stagesOf(i).filter(x=>!(i.lb||{})[x.k]).length,0);
  let act="";
  if(st==="borrador"||st==="revision"){
    const lab=st==="borrador"?"Congelar línea base":`Congelar Rev.${p.lbRev.n}`;
    act=`${lbWarn&&miss?`<span class="lbwarn">Faltan ${miss} etapa${miss===1?"":"s"} sin fecha LB.</span>`:""}
      ${st==="revision"?`<button class="btn-ghost sm" id="lbCancelRev">Descartar revisión</button>`:""}
      <button class="btn-add" id="lbFreeze">${lbWarn&&miss?"Congelar igual":lab}</button>`;
  }else if(lbAsk){
    act=`<input id="lbMotivo" type="text" placeholder="Motivo de la revisión (obligatorio)" aria-label="Motivo de la revisión"><button class="btn-ghost sm" id="lbAskNo">Cancelar</button><button class="btn-add" id="lbOpenRev">Abrir Rev.${p.lbRev.n+1}</button>`;
  }else act=`<button class="btn-ghost sm" id="lbAsk">Nueva revisión de LB</button>`;
  const stTxt=st==="borrador"?`<b>Borrador</b> · define la fecha de término comprometida de cada etapa y congélala. Luego no se podrá mover.`
    :st==="revision"?`<b>Rev.${p.lbRev.n} en revisión</b> · ${esc(p.lbRev.motivo)} · ajusta las fechas LB y vuelve a congelar.`
    :`<b>Congelada Rev.${p.lbRev.n}</b> · ${fdate(p.lbRev.fecha)}${p.lbRev.n?` · ${esc(p.lbRev.motivo)}`:""} · las fechas LB no se pueden modificar.`;
  $("#lbHead").innerHTML=`<div class="lbst ${st}">${stTxt}</div>
    ${c?`<div class="lbk"><span>Avance plan <b>${pctTxt(c.plan)}</b></span><span>Real <b>${pctTxt(c.real)}</b></span><span>SPI <b>${c.spi==null?"—":c.spi.toFixed(2)}</b></span><span>Hitos a tiempo <b>${c.at}/${c.venc}</b></span><span>Término LB <b>${fdate(c.endLb)}</b></span><span>Forecast <b class="${c.atraso>0?"neg":""}">${fdate(c.endFc)} (${atrTxt(c.atraso)})</b></span><span class="lbsem ${semOf(c)}"><i></i>${SEMTXT[semOf(c)]}</span></div>`:""}
    <div class="lbact">${act}</div>`;
  const ST={pend:"Pendiente",run:"En curso",pin:"Foco",ok:"Completada"};
  let rows=`<thead><tr><th>Etapa</th><th>Estado</th><th>Término LB</th><th>Forecast</th><th>Real</th><th class="num">Desv.</th></tr></thead><tbody>`;
  k.forEach(i=>{const K=KINDS[i.kind]||KINDS.ing,e=i.etapas||{},lb=i.lb||{},fc=i.fc||{},re=i.real||{};
    rows+=`<tr class="lbi"><td colspan="6"><span class="kind ${i.kind}">${K.s}</span> <b>${esc(i.nombre)}</b>${i.inicio||i.termino?` <small>${fdate(i.inicio)||"…"} → ${fdate(i.termino)||"…"}</small>`:""}
      ${!locked&&i.inicio&&i.termino?`<button class="btn-ghost sm" data-spread="${i.id}" title="Reparte las fechas LB en partes iguales entre inicio y término">Repartir LB entre inicio y término</button>`:""}</td></tr>`;
    K.stages.forEach(s=>{const v=e[s.k]||"pend",L=lb[s.k]||"",F=fc[s.k]||"",R=re[s.k]||"";
      const ref=v==="ok"?R:(F||(L&&L<d?d:""));const dv=L&&ref?ddiff(ref,L):null;
      rows+=`<tr><td>${esc(s.t)}</td><td><span class="lbstate ${v}">${ST[v]}</span></td>
        <td><input type="date" value="${L}" data-lbf="lb" data-ini="${i.id}" data-k="${s.k}" ${locked?"disabled":""} aria-label="Término LB ${esc(s.t)}"></td>
        <td><input type="date" value="${F}" data-lbf="fc" data-ini="${i.id}" data-k="${s.k}" ${v==="ok"?"disabled":""} aria-label="Forecast ${esc(s.t)}"></td>
        <td><input type="date" value="${R}" data-lbf="real" data-ini="${i.id}" data-k="${s.k}" ${v!=="ok"?"disabled title=\"Se completa al marcar la etapa como Completada\"":""} aria-label="Real ${esc(s.t)}"></td>
        <td class="num ${dv>0?"neg":dv<0?"pos":""}">${dv==null?"—":dv>0?"+"+dv:dv}</td></tr>`;});
  });
  $("#lbTable").innerHTML=rows+"</tbody>";
  const h=(p.lbHist||[]).slice().reverse();
  $("#lbHist").innerHTML=(h.length?`<h4>Revisiones anteriores</h4><ul class="lbh">${h.map(x=>{const ends=Object.values(x.lb||{}).flatMap(o=>Object.values(o||{})).filter(Boolean).sort();return `<li><b>Rev.${x.n}</b> · ${fdate(x.fecha)} · ${esc(x.motivo||"")} · término ${fdate(ends.pop())||"—"}</li>`}).join("")}</ul>`:"")+
    ((p.semanas||[]).length?`<h4>Cortes semanales</h4><table class="adjt lbw"><thead><tr><th>Corte</th><th>LB</th><th class="num">Plan</th><th class="num">Real</th><th class="num">SPI</th><th class="num">Hitos</th><th class="num">Atraso</th></tr></thead><tbody>${p.semanas.slice().reverse().map(w=>`<tr><td>${fdate(w.corte)}</td><td>Rev.${w.rev??0}</td><td class="num">${pctTxt(w.plan)}</td><td class="num">${pctTxt(w.real)}</td><td class="num">${w.spi==null?"—":w.spi.toFixed(2)}</td><td class="num">${w.at}/${w.venc}</td><td class="num ${w.atraso>0?"neg":""}">${atrTxt(w.atraso)}</td></tr>`).join("")}</tbody></table>`:"");
}
$("#lbClose").addEventListener("click",closeLb);
$("#lbModal").addEventListener("mousedown",e=>{if(e.target===$("#lbModal"))closeLb();});
$("#lbModal").addEventListener("keydown",e=>{if(e.key==="Escape"){e.stopPropagation();closeLb();}});
$("#lbModal").addEventListener("change",e=>{const t=e.target.closest("[data-lbf]");if(!t)return;
  const p=projects.find(x=>x.id===lbId);if(t.dataset.lbf==="lb"&&p&&lbLocked(p)){renderLb();return;}
  saveIni(t.dataset.ini,{[t.dataset.lbf]:{[t.dataset.k]:t.value||""}});renderLb();});
$("#lbModal").addEventListener("click",e=>{
  const p=projects.find(x=>x.id===lbId);if(!p)return;const b=e.target.closest("button");if(!b)return;
  if(b.dataset.spread){const i=inis.find(x=>x.id===b.dataset.spread);if(!i||lbLocked(p))return;
    const st=stagesOf(i),a=new Date(i.inicio+"T12:00"),z=new Date(i.termino+"T12:00"),span=(z-a)/st.length,lb={};
    st.forEach((s,n)=>{lb[s.k]=isoLocal(new Date(a.getTime()+span*(n+1)));});saveIni(i.id,{lb});renderLb();toast("Fechas LB repartidas");return;}
  if(b.id==="lbFreeze"){const miss=kidsOf(p).reduce((s,i)=>s+stagesOf(i).filter(x=>!(i.lb||{})[x.k]).length,0);
    if(miss&&!lbWarn){lbWarn=true;renderLb();return;}
    const n=p.lbRev?p.lbRev.n:0;save(p.id,{lbRev:{n,fecha:hoy(),motivo:p.lbRev?p.lbRev.motivo:"Línea base original",estado:"congelada"}});
    lbWarn=false;renderLb();toast(`Línea base Rev.${n} congelada`);return;}
  if(b.id==="lbAsk"){lbAsk=true;renderLb();setTimeout(()=>$("#lbMotivo")&&$("#lbMotivo").focus(),0);return;}
  if(b.id==="lbAskNo"){lbAsk=false;renderLb();return;}
  if(b.id==="lbOpenRev"){const m=$("#lbMotivo").value.trim();if(!m){$("#lbMotivo").classList.add("bad");$("#lbMotivo").focus();return;}
    const snap={};kidsOf(p).forEach(i=>snap[i.id]={...(i.lb||{})});
    save(p.id,{lbHist:[...(p.lbHist||[]),{n:p.lbRev.n,fecha:p.lbRev.fecha,motivo:p.lbRev.motivo,lb:snap}],lbRev:{n:p.lbRev.n+1,fecha:hoy(),motivo:m,estado:"revision"}});
    lbAsk=false;renderLb();toast("Revisión abierta: ajusta las fechas LB");return;}
  if(b.id==="lbCancelRev"){const h=(p.lbHist||[]).slice(),last=h.pop();if(!last)return;
    kidsOf(p).forEach(i=>{const o=last.lb[i.id]||{},lb={};stagesOf(i).forEach(s=>lb[s.k]=o[s.k]||"");saveIni(i.id,{lb});});
    save(p.id,{lbHist:h,lbRev:{n:last.n,fecha:last.fecha,motivo:last.motivo,estado:"congelada"}});renderLb();toast("Revisión descartada");}
});

/* ---------- pestaña Cumplimiento ---------- */
function renderCum(){
  if($("#tabCum").hidden)return;
  const ps=projects.filter(fOk),d=hoy(),rows=ps.map(p=>({p,c:cumOf(p,d)}));
  const withC=rows.filter(x=>x.c),frz=ps.filter(p=>lbState(p)!=="borrador").length;
  const tw=withC.reduce((s,x)=>s+pMonto(x.p),0),w=x=>tw>0?pMonto(x.p)/tw:1/withC.length;
  const plan=withC.length?withC.reduce((s,x)=>s+x.c.plan*w(x),0):null,real=withC.length?withC.reduce((s,x)=>s+x.c.real*w(x),0):null;
  const venc=withC.reduce((s,x)=>s+x.c.venc,0),at=withC.reduce((s,x)=>s+x.c.at,0);
  const late=withC.filter(x=>x.c.atraso>0).length,red=withC.filter(x=>semOf(x.c)==="bad").length;
  const spi=plan>0?real/plan:null;
  $("#cumKpi").innerHTML=`
    <div class="chip total"><div class="lab">Línea base congelada</div><div class="num">${frz}<small>de ${ps.length}</small></div><div class="sub">${withC.length} proyectos con fechas LB</div></div>
    <div class="chip"><div class="lab">Avance plan vs real</div><div class="num">${pctTxt(real)}<small>real</small></div><div class="sub">plan a hoy ${pctTxt(plan)} · ponderado por monto</div></div>
    <div class="chip"><div class="lab">SPI cartera</div><div class="num ${spi!=null&&spi<0.85?"n-red":""}" style="${spi!=null&&spi>=0.95?"color:var(--green)":""}">${spi==null?"—":spi.toFixed(2)}</div><div class="sub">real ÷ planificado (LB)</div></div>
    <div class="chip"><div class="lab">Hitos a tiempo</div><div class="num">${venc?Math.round(at/venc*100)+"%":"—"}</div><div class="sub">${at} de ${venc} hitos vencidos según LB</div></div>
    <div class="chip"><div class="lab">Proyectos atrasados</div><div class="num n-red">${late}</div><div class="sub">${red} en rojo · término forecast &gt; LB</div></div>`;
  const cortes=[...new Set(ps.flatMap(p=>(p.semanas||[]).map(s=>s.corte)))].sort().slice(-5);
  $("#cumLast").textContent=cortes.length?"Último corte: "+fdate(cortes[cortes.length-1]):"Aún sin cortes semanales";
  const head=`<thead><tr><th class="nm">Proyecto</th><th>Línea base</th><th class="num">Plan</th><th class="num">Real</th><th class="num">SPI</th><th class="num">Hitos a tiempo</th><th>Término LB</th><th>Forecast</th><th class="num">Atraso</th>${cortes.map(c=>`<th class="num wk" title="SPI al corte ${fdate(c)}">${dm(c)}</th>`).join("")}<th>Estado</th></tr></thead>`;
  const body=rows.map(({p,c})=>{const s=semOf(c),sw=p.semanas||[];
    return `<tr data-lbrow="${p.id}"><td class="nm"><b>${esc(p.nombre)}</b><small>${esc(p.tipo||"")}${catOf(p)?" · "+esc(catOf(p)):""}</small></td>
      <td><button class="lbb ${c?s:"none"}" data-lb="${p.id}">${c?`<span class="sdot"></span>`:""}${lbState(p)==="borrador"&&!c?"＋ Definir":revTxt(p)}</button></td>
      <td class="num">${c?pctTxt(c.plan):"—"}</td><td class="num">${c?pctTxt(c.real):"—"}</td>
      <td class="num">${c&&c.spi!=null?c.spi.toFixed(2):"—"}</td><td class="num">${c?`${c.at}/${c.venc}`:"—"}</td>
      <td>${c?fdate(c.endLb):"—"}</td><td>${c?fdate(c.endFc):"—"}</td>
      <td class="num ${c&&c.atraso>0?"neg":""}">${c?atrTxt(c.atraso):"—"}</td>
      ${cortes.map(k=>{const w=sw.find(x=>x.corte===k);return `<td class="num wk">${w&&w.spi!=null?w.spi.toFixed(2):"·"}</td>`}).join("")}
      <td><span class="lbsem ${s}"><i></i>${SEMTXT[s]}</span></td></tr>`;}).join("");
  $("#cumTable").innerHTML=head+`<tbody>${body}</tbody>`;
  $("#cumEmpty").hidden=ps.length>0;
}
$("#cumTable").addEventListener("click",e=>{const b=e.target.closest("[data-lb]")||e.target.closest("[data-lbrow]");if(b)openLb(b.dataset.lb||b.dataset.lbrow);});

/* cierre semanal: guarda una foto del cumplimiento de cada proyecto con LB */
$("#cutBtn").addEventListener("click",()=>{$("#cutDate").value=hoy();
  const n=projects.filter(p=>cumOf(p)).length;$("#cutInfo").textContent=`Se guardará la foto de ${n} proyecto${n===1?"":"s"} con línea base de la cartera ${YR}. Si ya existe un corte con esa fecha, se reemplaza.`;
  $("#cutModal").hidden=false;});
const closeCut=()=>{$("#cutModal").hidden=true;};
$("#cutCancel").addEventListener("click",closeCut);
$("#cutModal").addEventListener("mousedown",e=>{if(e.target===$("#cutModal"))closeCut();});
$("#cutOk").addEventListener("click",()=>{const corte=$("#cutDate").value||hoy();let n=0;
  projects.forEach(p=>{const c=cumOf(p,corte);if(!c)return;n++;
    const w={corte,plan:+c.plan.toFixed(4),real:+c.real.toFixed(4),spi:c.spi==null?null:+c.spi.toFixed(3),venc:c.venc,at:c.at,atraso:c.atraso,rev:p.lbRev?p.lbRev.n:0};
    save(p.id,{semanas:[...(p.semanas||[]).filter(s=>s.corte!==corte),w].sort((a,b)=>a.corte<b.corte?-1:1)});});
  closeCut();toast(n?`Corte ${fdate(corte)} guardado · ${n} proyectos`:"No hay proyectos con línea base");});

/* hojas Excel */
function cumSheets(){
  const d=hoy(),H=["Proyecto","Tipo","Categoría","Línea base","Avance plan (%)","Avance real (%)","SPI","Hitos vencidos","Hitos a tiempo","Término LB","Término forecast","Atraso (días)","Estado"];
  const r=[H.map(h=>({v:h,s:1}))];
  projects.forEach(p=>{const c=cumOf(p,d);
    r.push([{v:p.nombre,s:7},p.tipo||"",catOf(p)||"",revTxt(p),c?Math.round(c.plan*100):"",c?Math.round(c.real*100):"",c&&c.spi!=null?+c.spi.toFixed(2):"",c?c.venc:"",c?c.at:"",c?fdate(c.endLb):"",c?fdate(c.endFc):"",c?c.atraso:"",SEMTXT[semOf(c)]]);});
  const H2=["Proyecto","Iniciativa","Etapa","Estado","Término LB","Forecast","Real","Desviación (días)"];
  const r2=[H2.map(h=>({v:h,s:1}))],ST={pend:"Pendiente",run:"En curso",pin:"Foco",ok:"Completada"};
  projects.forEach(p=>kidsOf(p).forEach(i=>{const e=i.etapas||{},lb=i.lb||{},fc=i.fc||{},re=i.real||{};
    stagesOf(i).forEach(s=>{const v=e[s.k]||"pend",L=lb[s.k],ref=v==="ok"?re[s.k]:(fc[s.k]||(L&&L<d?d:""));
      if(!L&&!fc[s.k]&&!re[s.k])return;
      r2.push([p.nombre,i.nombre,s.t,ST[v],fdate(L),fdate(fc[s.k]),fdate(re[s.k]),L&&ref?ddiff(ref,L):""]);});}));
  return [{name:"Cumplimiento",rows:r,cols:[40,8,14,18,12,12,8,10,10,12,14,10,12],filter:true,freeze:[1,1],headerHeight:30},
          {name:"Línea base etapas",rows:r2,cols:[30,36,24,12,12,12,12,12],filter:true,freeze:[1,1],headerHeight:20}];
}
