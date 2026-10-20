/* ---------- arranque: archivo local (datos incluidos + guardado en este navegador) ---------- */
const KEY="gpro-control-entregables-v4";
const EMB=JSON.parse(document.getElementById("datos").textContent);
let stamp=EMB.exportado;
(function load(){
  let saved=null;
  try{saved=JSON.parse(localStorage.getItem(KEY)||"null");}catch(e){}
  const src=saved&&saved.proyectos&&saved.guardado>EMB.exportado?saved:EMB;
  if(src===saved)stamp=saved.guardado;
  projects=structuredClone(src.proyectos||[]);inis=structuredClone(src.iniciativas||[]);costos=structuredClone(src.costos||EMB.costos||[]);
  ajustes=structuredClone(EMB.ajustes||[]);
  projects.sort((a,b)=>(a.orden||0)-(b.orden||0));
})();
function persist(){
  stamp=now();
  try{localStorage.setItem(KEY,JSON.stringify({guardado:stamp,proyectos:projects,iniciativas:inis,costos}));
    $("#sync").textContent="Guardado en este navegador · "+new Date().toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"});$("#sync").classList.remove("warn");}
  catch(e){$("#sync").textContent="Usa “Guardar copia” para no perder cambios";$("#sync").classList.add("warn");}
}
store={...store,add:persist,upd:persist,del:persist};
const download=(blob,name)=>{const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();};
$("#dlBtn").addEventListener("click",()=>{
  const clone=document.documentElement.cloneNode(true);
  clone.querySelector("#datos").textContent=JSON.stringify({exportado:now(),proyectos:projects,iniciativas:inis,costos,ajustes});
  clone.querySelector("#rows").innerHTML="";clone.querySelector("#summary").innerHTML="";
  clone.querySelectorAll(".pop,.toast").forEach(n=>n.remove());
  clone.querySelectorAll(".modal-bg").forEach(n=>n.setAttribute("hidden",""));
  download(new Blob(["<!doctype html>\n"+clone.outerHTML],{type:"text/html"}),"Control_Entregables_GPRO_"+new Date().toISOString().slice(0,10)+".html");
  toast("Copia descargada con los datos actuales");
});
$("#xlsBtn").addEventListener("click",()=>{download(new Blob([buildWorkbook()],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),xlsName());toast("Excel descargado");});
renderHead();
{let t="ent";try{t=localStorage.getItem("gpro-tab")||"ent"}catch(e){}if(location.hash==="#flujos")t="fin";setTab(t);}
render();
$("#sync").textContent="Datos al "+new Date(stamp).toLocaleDateString("es-CL");
