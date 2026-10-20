/* ---------- arranque: nube Supabase (una sola base para todo el equipo, cambios en vivo) ---------- */
const download=(blob,name)=>{const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();};
$("#xlsBtn").addEventListener("click",()=>{download(new Blob([buildWorkbook()],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),xlsName());toast("Excel descargado");});
renderHead();
{let t="ent";try{t=localStorage.getItem("gpro-tab")||"ent"}catch(e){}if(location.hash==="#flujos")t="fin";setTab(t);}
render();
(async()=>{
  const sync=$("#sync");
  const warn=m=>{sync.textContent=m;sync.classList.add("warn");};
  if(!window.supabase||!SUPA.url||!SUPA.key){warn("Falta configurar la nube");return;}
  const sb=window.supabase.createClient(SUPA.url,SUPA.key);
  let started=false;

  /* ---- login con link al correo ---- */
  const bg=document.createElement("div");bg.className="modal-bg";bg.hidden=true;
  bg.innerHTML=`<form class="modal" id="lgForm" novalidate style="width:min(420px,100%)" aria-labelledby="lgT">
    <h3 id="lgT">Ingresar al control</h3>
    <p class="adjnote" style="margin:0 0 12px">Escribe tu correo y te llegará un link para entrar. Solo pueden ingresar los correos autorizados del equipo GPRO.</p>
    <div class="fld"><label for="lgMail">Correo</label><input id="lgMail" type="email" autocomplete="email" placeholder="nombre@empresa.cl"></div>
    <p class="ferr" id="lgErr" hidden></p><p class="adjnote" id="lgOk" hidden style="margin:10px 0 0;color:var(--green)"></p>
    <div class="factions"><button type="submit" class="btn-add" id="lgBtn">Enviar link de acceso</button></div></form>`;
  document.body.appendChild(bg);
  const showLogin=msg=>{bg.hidden=false;if(msg){$("#lgErr").textContent=msg;$("#lgErr").hidden=false;}setTimeout(()=>$("#lgMail").focus(),0);warn("Ingresa para ver y editar");};
  $("#lgForm").addEventListener("submit",async e=>{e.preventDefault();
    const email=$("#lgMail").value.trim();$("#lgErr").hidden=true;$("#lgOk").hidden=true;
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){$("#lgErr").textContent="Escribe un correo válido.";$("#lgErr").hidden=false;return;}
    $("#lgBtn").disabled=true;
    const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});
    $("#lgBtn").disabled=false;
    if(error){$("#lgErr").textContent="No se pudo enviar el link: "+error.message;$("#lgErr").hidden=false;return;}
    $("#lgOk").textContent="Listo. Revisa tu correo ("+email+") y abre el link desde este mismo navegador.";$("#lgOk").hidden=false;});

  /* ---- sincronización ---- */
  const COLS={proyectos:()=>projects,iniciativas:()=>inis,ajustes:()=>ajustes,costos:()=>costos};
  const setCol=(c,arr)=>{arr.sort((a,b)=>(a.orden||0)-(b.orden||0));
    if(c==="proyectos")projects=arr;else if(c==="iniciativas")inis=arr;else if(c==="ajustes")ajustes=arr;else if(c==="costos")costos=arr;};
  let pending=false;
  const editing=()=>{const a=document.activeElement;return a&&a.matches&&a.matches("input,select")&&a.closest("#rows,#finTable,#cosTable");};
  const rerender=()=>{if(editing()){pending=true;renderSummary();return;}pending=false;render();};
  document.addEventListener("focusout",()=>setTimeout(()=>{if(pending&&!editing())rerender();},0));

  async function start(session){
    if(started)return;started=true;bg.hidden=true;
    const email=session.user.email;
    sync.textContent="Conectando…";sync.classList.remove("warn");
    const mem=await sb.from("gpro_miembros").select("email").limit(1);
    if(mem.error||!mem.data.length){warn("Correo sin acceso: "+email);started=false;
      showLogin("El correo "+email+" no está autorizado. Pide que lo agreguen a la lista del equipo.");await sb.auth.signOut();return;}
    const {data,error}=await sb.from("gpro_docs").select("coleccion,id,data");
    if(error){warn("No se pudieron leer los datos. Recarga la página.");return;}
    const by={proyectos:[],iniciativas:[],ajustes:[],costos:[]};
    data.forEach(r=>{if(by[r.coleccion])by[r.coleccion].push({...r.data,id:r.id});});
    Object.entries(by).forEach(([c,a])=>setCol(c,a));
    const q={};
    const fail=err=>{toast("No se pudo guardar el cambio. Revisa tu conexión.");warn("Error al guardar · "+(err&&err.message||""));};
    const chain=(key,fn)=>{q[key]=(q[key]||Promise.resolve()).then(fn).then(r=>{if(r&&r.error)throw r.error;stamp();}).catch(fail);};
    const full=(c,id)=>{const o=(COLS[c]()||[]).find(x=>x.id===id);if(!o)return null;const {id:_,...d}=o;return d;};
    const put=(c,id,d)=>sb.from("gpro_docs").upsert({coleccion:c,id,data:d,actualizado:new Date().toISOString(),actualizado_por:email});
    store={
      newId:()=>"d"+Date.now().toString(36)+Math.random().toString(36).slice(2,8),
      add:(c,id,data)=>chain(c+"/"+id,()=>put(c,id,data)),
      upd:(c,id)=>chain(c+"/"+id,()=>{const d=full(c,id);return d?put(c,id,d):null;}),
      del:(c,id)=>chain(c+"/"+id,()=>sb.from("gpro_docs").delete().eq("coleccion",c).eq("id",id))
    };
    const stamp=()=>{sync.classList.remove("warn");sync.innerHTML=`En línea · ${esc(email)} · ${new Date().toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"})} <a href="#" id="lgOut" style="color:var(--teal);margin-left:6px">Salir</a>`;
      $("#lgOut").onclick=async ev=>{ev.preventDefault();await sb.auth.signOut();location.reload();};};
    stamp();render();
    sb.channel("gpro").on("postgres_changes",{event:"*",schema:"public",table:"gpro_docs"},p=>{
      const r=p.eventType==="DELETE"?p.old:p.new,c=r&&r.coleccion;if(!c||!COLS[c])return;
      const arr=[...COLS[c]()].filter(x=>x.id!==r.id);
      if(p.eventType!=="DELETE")arr.push({...r.data,id:r.id});
      setCol(c,arr);stamp();rerender();
    }).subscribe(st=>{if(st==="CHANNEL_ERROR"||st==="TIMED_OUT")warn("Sin conexión en vivo. Recarga la página.");});
  }

  sb.auth.onAuthStateChange((ev,s)=>{if(s&&(ev==="SIGNED_IN"||ev==="INITIAL_SESSION"))start(s);});
  const {data:{session}}=await sb.auth.getSession();
  if(session)start(session);else showLogin();
})();
