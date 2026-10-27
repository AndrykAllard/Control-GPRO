/* ---------- arranque: base de datos compartida del artifact ---------- */
$("#xlsBtn").hidden=true;
(async()=>{
  let dl=null;try{dl=await window.claude?.use?.("downloads");}catch(e){}
  if(!dl)return;
  const b=$("#xlsBtn");b.hidden=false;
  b.addEventListener("click",async()=>{
    try{await dl.save({filename:xlsName(),data:new Blob([buildWorkbook()])});toast("Excel descargado");}
    catch(err){ if(err&&err.code==="declined")return;
      if(err&&err.code==="rate_limited"){toast("Espera un momento e inténtalo de nuevo.");return;}
      toast("No se pudo descargar el Excel en esta vista.");}
  });
})();
renderHead();
{let t="ent";try{t=localStorage.getItem("gpro-tab")||"ent"}catch(e){}if(location.hash==="#flujos")t="fin";setTab(t);}
render();
(async()=>{
  let db=null;
  try{ db=await (window.claude?.use?.("db")); }catch(e){ db=null; }
  const sync=$("#sync");
  if(!db){sync.textContent="Sin conexión al registro · los cambios no se guardan";sync.classList.add("warn");return;}
  /* aviso: este artifact es el ambiente de prueba (base propia, separada de Supabase) */
  {const t=document.createElement("div");t.className="testtag";t.textContent="Ambiente de prueba · datos separados del equipo";sync.before(t);}
  const q={};let pend=0,saveErr=false;
  const fail=err=>{saveErr=true;toast(err&&err.code==="permission_denied"?"No tienes permiso para editar este control.":"No se pudo guardar el cambio. Revisa tu conexión.");};
  const chain=(key,fn)=>{pend++;bar();q[key]=(q[key]||Promise.resolve()).then(fn).then(()=>{saveErr=false;}).catch(fail).finally(()=>{pend--;bar();});};
  store={
    newId:()=>db.collection("proyectos").doc().id,
    add:(c,id,data)=>chain(c+"/"+id,()=>db.collection(c).doc(id).set(data)),
    upd:(c,id,patch)=>chain(c+"/"+id,()=>db.collection(c).doc(id).update(patch)),
    del:(c,id)=>chain(c+"/"+id,()=>db.collection(c).doc(id).delete())
  };
  const stamp=()=>{sync.classList.remove("warn");sync.textContent="Guardado en línea · "+new Date().toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"});};
  let pendingR=false;
  const editing=()=>{const a=document.activeElement;return a&&a.matches&&a.matches("input,select,textarea")&&a.closest("#rows,#finTable,#cosTable");};
  const rerender=()=>{if(editing()){pendingR=true;renderSummary();return;}pendingR=false;render();};
  document.addEventListener("focusout",()=>setTimeout(()=>{if(pendingR&&!editing())rerender();},0));
  const lost=()=>{sync.textContent="Se perdió la conexión al registro. Recarga la página.";sync.classList.add("warn");live=false;bar();};
  const COLS={proyectos:()=>DB.proyectos,iniciativas:()=>DB.iniciativas,ajustes:()=>DB.ajustes,costos:()=>DB.costos};
  const setCol=(c,arr)=>{arr.sort((a,b)=>(a.orden||0)-(b.orden||0));
    if(DB[c])DB[c]=arr;};
  const sub=c=>db.collection(c).orderBy("orden").onSnapshot(s=>{setCol(c,s.docs.map(d=>({id:d.id,...structuredClone(d.data())})));live=true;stamp();rerender();bar();},lost);

  /* ---- verificador de sincronización (misma barra que la versión en la nube) ---- */
  const vb=document.createElement("div");vb.className="syncbar";vb.setAttribute("role","status");vb.setAttribute("aria-live","polite");
  vb.innerHTML=`<span class="sdot"></span><span class="stxt"></span><span class="spacer"></span><button type="button" class="btn-ghost sm" id="sbFix" hidden>Traer versión de la nube</button><button type="button" class="btn-ghost sm" id="sbChk">Verificar ahora</button>`;
  document.body.appendChild(vb);document.body.classList.add("has-syncbar");
  let checking=false,lastChk=null,diffs=[],cloud=null,live=null;
  const hhmm=d=>d.toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"});
  const stable=v=>Array.isArray(v)?"["+v.map(stable).join(",")+"]":v&&typeof v==="object"?"{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+stable(v[k])).join(",")+"}":JSON.stringify(v===undefined?null:v);
  function bar(){
    let st,txt;
    if(!navigator.onLine||saveErr){st="bad";txt=pend?`Sin conexión · ${pend} cambio${pend===1?"":"s"} sin guardar`:"Sin conexión con la nube";}
    else if(pend){st="busy";txt="Guardando…";}
    else if(checking){st="busy";txt="Revisando la nube…";}
    else if(diffs.length){st="bad";txt=`${diffs.length} diferencia${diffs.length===1?"":"s"} con la nube (${diffs.slice(0,3).map(esc).join(", ")}${diffs.length>3?"…":""})`;}
    else if(lastChk){st="ok";txt=`Sincronizado con la nube · verificado ${hhmm(lastChk)}`;}
    else {st="busy";txt="Conectado · verificando…";}
    vb.dataset.st=st;vb.querySelector(".stxt").innerHTML=txt+(live!==false||st!=="ok"?"":" · <em>sin cambios en vivo, recarga la página</em>");
    $("#sbFix").hidden=!(diffs.length&&!pend);$("#sbChk").disabled=checking;
  }
  const label=(c,id,o)=>o&&o.nombre?o.nombre:c+"/"+id;
  async function verify(){
    if(checking)return;
    if(pend){setTimeout(verify,1500);return;}
    checking=true;bar();
    let rows=[];
    try{for(const c of Object.keys(COLS)){const s=await db.collection(c).get();s.docs.forEach(d=>rows.push({coleccion:c,id:d.id,data:d.data()}));}}
    catch(e){checking=false;saveErr=true;bar();return;}
    checking=false;saveErr=false;cloud=rows;diffs=[];
    const seen=new Set();
    rows.forEach(r=>{seen.add(r.coleccion+"/"+r.id);const loc=COLS[r.coleccion]().find(x=>x.id===r.id);
      if(!loc){diffs.push(label(r.coleccion,r.id,r.data));return;}
      const {id:_,...d}=loc;if(stable(d)!==stable(r.data))diffs.push(label(r.coleccion,r.id,loc));});
    Object.keys(COLS).forEach(c=>COLS[c]().forEach(o=>{if(!seen.has(c+"/"+o.id))diffs.push(label(c,o.id,o));}));
    if(pend){diffs=[];setTimeout(verify,1500);}else lastChk=new Date();
    bar();
  }
  $("#sbChk").onclick=verify;
  $("#sbFix").onclick=()=>{if(!cloud)return;const by={proyectos:[],iniciativas:[],ajustes:[],costos:[]};
    cloud.forEach(r=>{if(by[r.coleccion])by[r.coleccion].push({...structuredClone(r.data),id:r.id});});
    Object.entries(by).forEach(([c,a])=>setCol(c,a));diffs=[];lastChk=new Date();render();bar();toast("Pantalla actualizada con la versión de la nube");};
  addEventListener("online",()=>{bar();verify();});addEventListener("offline",bar);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)verify();});
  setInterval(()=>{if(!document.hidden)verify();},60000);
  ["ajustes","costos","iniciativas","proyectos"].forEach(sub);
  bar();setTimeout(verify,1500);
})();
