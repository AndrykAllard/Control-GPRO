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
  const COLS={proyectos:()=>projects,iniciativas:()=>inis,ajustes:()=>ajustes,costos:()=>costos};
  const setCol=(c,arr)=>{arr.sort((a,b)=>(a.orden||0)-(b.orden||0));
    if(c==="proyectos")projects=arr;else if(c==="iniciativas")inis=arr;else if(c==="ajustes")ajustes=arr;else if(c==="costos")costos=arr;};
  /* si alguien está escribiendo en una celda, se espera a que termine antes de redibujar */
  let pending=false;
  const editing=()=>{const a=document.activeElement;return a&&a.matches&&a.matches("input,select")&&a.closest("#rows,#finTable,#cosTable");};
  const rerender=()=>{if(editing()){pending=true;renderSummary();return;}pending=false;render();};
  document.addEventListener("focusout",()=>setTimeout(()=>{if(pending&&!editing())rerender();},0));
  const stamp=()=>{sync.classList.remove("warn");sync.textContent="En línea · guardado "+new Date().toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"});};

  sync.textContent="Conectando…";
  const {data,error}=await sb.from("gpro_docs").select("coleccion,id,data");
  if(error){warn("No se pudieron leer los datos · recarga la página");return;}
  const by={proyectos:[],iniciativas:[],ajustes:[],costos:[]};
  data.forEach(r=>{if(by[r.coleccion])by[r.coleccion].push({...r.data,id:r.id});});
  Object.entries(by).forEach(([c,a])=>setCol(c,a));

  const q={};
  const fail=err=>{toast("No se pudo guardar el cambio. Revisa tu conexión.");warn("Error al guardar"+(err&&err.message?" · "+err.message:""));};
  const chain=(key,fn)=>{q[key]=(q[key]||Promise.resolve()).then(fn).then(r=>{if(r&&r.error)throw r.error;stamp();}).catch(fail);};
  const full=(c,id)=>{const o=(COLS[c]()||[]).find(x=>x.id===id);if(!o)return null;const {id:_,...d}=o;return d;};
  const put=(c,id,d)=>sb.from("gpro_docs").upsert({coleccion:c,id,data:d,actualizado:new Date().toISOString()});
  store={
    newId:()=>"d"+Date.now().toString(36)+Math.random().toString(36).slice(2,8),
    add:(c,id,data)=>chain(c+"/"+id,()=>put(c,id,data)),
    upd:(c,id)=>chain(c+"/"+id,()=>{const d=full(c,id);return d?put(c,id,d):null;}),
    del:(c,id)=>chain(c+"/"+id,()=>sb.from("gpro_docs").delete().eq("coleccion",c).eq("id",id))
  };
  stamp();render();

  /* cambios de otras personas, en vivo */
  sb.channel("gpro").on("postgres_changes",{event:"*",schema:"public",table:"gpro_docs"},p=>{
    const r=p.eventType==="DELETE"?p.old:p.new,c=r&&r.coleccion;if(!c||!COLS[c])return;
    const arr=[...COLS[c]()].filter(x=>x.id!==r.id);
    if(p.eventType!=="DELETE")arr.push({...r.data,id:r.id});
    setCol(c,arr);stamp();rerender();
  }).subscribe(st=>{if(st==="CHANNEL_ERROR"||st==="TIMED_OUT")warn("Sin conexión en vivo · recarga la página");});
})();
