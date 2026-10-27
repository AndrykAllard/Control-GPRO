/* ---------- arranque: nube Supabase (una sola base para todos; cambios en vivo; sin login) ---------- */
const download=(blob,name)=>{const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();};
$("#xlsBtn").addEventListener("click",()=>{download(new Blob([buildWorkbook()],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),xlsName());toast("Excel descargado");});
renderHead();
{let t="ent";try{t=localStorage.getItem("gpro-tab")||"ent"}catch(e){}if(location.hash==="#flujos")t="fin";setTab(t);}
render();
(async()=>{
  const sync=$("#sync");
  const warn=m=>{sync.textContent=m;sync.classList.add("warn");};
  if(!window.supabase||!SUPA.url||!SUPA.key){warn("Sin conexión a la nube · recarga la página");return;}
  const sb=window.supabase.createClient(SUPA.url,SUPA.key,{auth:{persistSession:false,autoRefreshToken:false}});
  const COLS={proyectos:()=>DB.proyectos,iniciativas:()=>DB.iniciativas,ajustes:()=>DB.ajustes,costos:()=>DB.costos};
  const setCol=(c,arr)=>{arr.sort((a,b)=>(a.orden||0)-(b.orden||0));
    if(DB[c])DB[c]=arr;};
  /* si alguien está escribiendo en una celda, se espera a que termine antes de redibujar */
  let pending=false;
  const editing=()=>{const a=document.activeElement;return a&&a.matches&&a.matches("input,select,textarea")&&a.closest("#rows,#finTable,#cosTable");};
  const rerender=()=>{if(editing()){pending=true;renderSummary();return;}pending=false;render();};
  document.addEventListener("focusout",()=>setTimeout(()=>{if(pending&&!editing())rerender();},0));
  const stamp=()=>{sync.classList.remove("warn");sync.textContent="En línea · guardado "+new Date().toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"});};

  sync.textContent="Conectando…";
  const {data,error}=await sb.from("gpro_docs").select("coleccion,id,data");
  if(error){warn("No se pudieron leer los datos · recarga la página");return;}
  const by={proyectos:[],iniciativas:[],ajustes:[],costos:[]};
  data.forEach(r=>{if(by[r.coleccion])by[r.coleccion].push({...r.data,id:r.id});});
  Object.entries(by).forEach(([c,a])=>setCol(c,a));

  const q={};let pend=0,saveErr=false;
  const fail=err=>{saveErr=true;toast("No se pudo guardar el cambio. Revisa tu conexión.");warn("Error al guardar"+(err&&err.message?" · "+err.message:""));};
  const chain=(key,fn)=>{pend++;bar();q[key]=(q[key]||Promise.resolve()).then(fn).then(r=>{if(r&&r.error)throw r.error;saveErr=false;stamp();}).catch(fail).finally(()=>{pend--;bar();});};
  const full=(c,id)=>{const o=(COLS[c]()||[]).find(x=>x.id===id);if(!o)return null;const {id:_,...d}=o;return d;};
  const put=(c,id,d)=>sb.from("gpro_docs").upsert({coleccion:c,id,data:d,actualizado:new Date().toISOString()});
  store={
    newId:()=>"d"+Date.now().toString(36)+Math.random().toString(36).slice(2,8),
    add:(c,id,data)=>chain(c+"/"+id,()=>put(c,id,data)),
    upd:(c,id)=>chain(c+"/"+id,()=>{const d=full(c,id);return d?put(c,id,d):null;}),
    del:(c,id)=>chain(c+"/"+id,()=>sb.from("gpro_docs").delete().eq("coleccion",c).eq("id",id))
  };
  stamp();render();

  /* ---- verificador de sincronización (barra fija abajo) ---- */
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
    const {data,error}=await sb.from("gpro_docs").select("coleccion,id,data");
    checking=false;
    if(error){saveErr=true;bar();return;}
    saveErr=false;cloud=data;diffs=[];
    const seen=new Set();
    data.forEach(r=>{if(!COLS[r.coleccion])return;seen.add(r.coleccion+"/"+r.id);
      const loc=COLS[r.coleccion]().find(x=>x.id===r.id);
      if(!loc){diffs.push(label(r.coleccion,r.id,r.data));return;}
      const {id:_,...d}=loc;if(stable(d)!==stable(r.data))diffs.push(label(r.coleccion,r.id,loc));});
    Object.keys(COLS).forEach(c=>COLS[c]().forEach(o=>{if(!seen.has(c+"/"+o.id))diffs.push(label(c,o.id,o));}));
    if(pend){diffs=[];setTimeout(verify,1500);}else lastChk=new Date();
    bar();
  }
  $("#sbChk").onclick=verify;
  $("#sbFix").onclick=()=>{if(!cloud)return;const by={proyectos:[],iniciativas:[],ajustes:[],costos:[]};
    cloud.forEach(r=>{if(by[r.coleccion])by[r.coleccion].push({...r.data,id:r.id});});
    Object.entries(by).forEach(([c,a])=>setCol(c,a));diffs=[];lastChk=new Date();render();bar();toast("Pantalla actualizada con la versión de la nube");};
  addEventListener("online",()=>{bar();verify();});addEventListener("offline",bar);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)verify();});
  setInterval(()=>{if(!document.hidden)verify();},60000);
  bar();verify();

  /* cambios de otras personas, en vivo */
  sb.channel("gpro").on("postgres_changes",{event:"*",schema:"public",table:"gpro_docs"},p=>{
    const r=p.eventType==="DELETE"?p.old:p.new,c=r&&r.coleccion;if(!c||!COLS[c])return;
    const arr=[...COLS[c]()].filter(x=>x.id!==r.id);
    if(p.eventType!=="DELETE")arr.push({...r.data,id:r.id});
    setCol(c,arr);stamp();rerender();if(diffs.length)verify();
  }).subscribe(st=>{live=st==="SUBSCRIBED";bar();if(st==="CHANNEL_ERROR"||st==="TIMED_OUT")warn("Sin conexión en vivo · recarga la página");});
})();
