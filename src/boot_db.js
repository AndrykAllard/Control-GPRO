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
  const q={};const fail=err=>toast(err&&err.code==="permission_denied"?"No tienes permiso para editar este control.":"No se pudo guardar el cambio. Revisa tu conexión.");
  const chain=(key,fn)=>{q[key]=(q[key]||Promise.resolve()).then(fn).catch(fail);};
  store={
    newId:()=>db.collection("proyectos").doc().id,
    add:(c,id,data)=>chain(c+"/"+id,()=>db.collection(c).doc(id).set(data)),
    upd:(c,id,patch)=>chain(c+"/"+id,()=>db.collection(c).doc(id).update(patch)),
    del:(c,id)=>chain(c+"/"+id,()=>db.collection(c).doc(id).delete())
  };
  const stamp=()=>{sync.classList.remove("warn");sync.textContent="Guardado en línea · "+new Date().toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"});};
  const rerender=()=>{const a=document.activeElement;if(a&&a.closest&&a.closest("#rows")&&a.matches("input"))return renderSummary();render();};
  const lost=()=>{sync.textContent="Se perdió la conexión al registro. Recarga la página.";sync.classList.add("warn");};
  db.collection("ajustes").orderBy("orden").onSnapshot(s=>{ajustes=s.docs.map(d=>({id:d.id,...d.data()}));renderSummary();renderAdj();},()=>{});
  db.collection("costos").orderBy("orden").onSnapshot(s=>{costos=s.docs.map(d=>({id:d.id,...structuredClone(d.data())}));stamp();if(!(document.activeElement&&document.activeElement.dataset&&document.activeElement.dataset.cl))renderCos();},lost);
  db.collection("iniciativas").orderBy("orden").onSnapshot(s=>{inis=s.docs.map(d=>({id:d.id,...structuredClone(d.data())}));stamp();rerender();},lost);
  db.collection("proyectos").orderBy("orden").onSnapshot(s=>{projects=s.docs.map(d=>({id:d.id,...structuredClone(d.data())}));stamp();rerender();},lost);
})();
