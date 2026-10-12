const RX={correo:/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,tel:/^\+?[0-9\s]{8,13}$/,nombre:/^[A-Za-zÁÉÍÓÚáéíóúÑñ' ]{3,60}$/};
const FORMSPREE_URL="https://formspree.io/f/mvkzqlel";

function calcularEdad(fechaISO){const n=new Date(fechaISO),h=new Date();let e=h.getFullYear()-n.getFullYear();const m=h.getMonth()-n.getMonth();if(m<0||(m===0&&h.getDate()<n.getDate()))e--;return e}
function marcar(campo,msg){campo.classList.toggle("con-error",!!msg);campo.setAttribute("aria-invalid",!!msg);
let e=campo.parentElement.querySelector(".mensaje-error");if(!e){e=document.createElement("div");e.className="mensaje-error";campo.parentElement.append(e)}e.textContent=msg||"";return!msg}
function validar(form,reglas){let ok=true;for(const[n,fn]of Object.entries(reglas)){const c=form.elements[n];if(c&&!marcar(c,fn(c.value.trim())))ok=false}return ok}
const req=(t,fn)=>v=>!v?`Completa el campo ${t}.`:(fn?fn(v):"");
const rCorreo=req("correo",v=>RX.correo.test(v)?"":"Escribe un correo válido, por ejemplo nombre@dominio.cl.");
const rNombre=req("nombre",v=>RX.nombre.test(v)?"":"Usa solo letras (mínimo 3 caracteres).");
const rClave=req("contraseña",v=>v.length>=8&&/[A-Za-z]/.test(v)&&/\d/.test(v)?"":"Usa al menos 8 caracteres, con letras y números.");

/* ---------- Cuentas y sesión ---------- */
async function hash(t){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
const usuarios=()=>{try{return JSON.parse(localStorage.getItem("brumaUsuarios"))||[]}catch{return[]}};
const sesion=()=>{try{return JSON.parse(localStorage.getItem("brumaSesion"))}catch{return null}};
function msg(f,texto,ok){const m=f.querySelector(".estado");m.className="estado "+(ok?"mensaje-ok":"mensaje-error");m.textContent=texto}
function iniciarSesion(u){localStorage.setItem("brumaSesion",JSON.stringify({nombre:u.nombre,correo:u.correo}));localStorage.setItem("brumaEdadVerificada","true");location.href="catalogo.html"}

function conectar(id,reglas,alOk){const f=document.getElementById(id);if(!f)return;f.addEventListener("submit",e=>{e.preventDefault();
if(validar(f,reglas)){alOk(f);msg(f,f.dataset.ok,true)}})}

document.addEventListener("DOMContentLoaded",()=>{
conectar("form-contacto",{nombre:rNombre,correo:rCorreo,telefono:v=>v&&!RX.tel.test(v)?"Teléfono inválido (8 a 12 dígitos).":"",asunto:req("asunto"),mensaje:req("mensaje",v=>v.length>=10?"":"El mensaje debe tener al menos 10 caracteres.")},f=>f.reset());
conectar("form-newsletter",{correo:rCorreo},f=>f.reset());

/* Si ya hay sesión, no tiene sentido ver el login */
if(sesion()&&document.getElementById("form-login"))location.replace("catalogo.html");

/* Registro */
const reg=document.getElementById("form-registro");
if(reg)reg.addEventListener("submit",async e=>{e.preventDefault();
if(!validar(reg,{nombre:rNombre,correo:rCorreo,clave:rClave,nacimiento:req("fecha de nacimiento",v=>calcularEdad(v)>=18?"":"Debes tener 18 años o más para registrarte.")}))return;
const correo=reg.elements.correo.value.trim().toLowerCase();
if(usuarios().some(u=>u.correo===correo))return msg(reg,"Ese correo ya tiene una cuenta. Inicia sesión.");
const u={nombre:reg.elements.nombre.value.trim(),correo,clave:await hash(reg.elements.clave.value)};
localStorage.setItem("brumaUsuarios",JSON.stringify([...usuarios(),u]));iniciarSesion(u)});

/* Login */
const log=document.getElementById("form-login");
if(log)log.addEventListener("submit",async e=>{e.preventDefault();
if(!validar(log,{correo:rCorreo,clave:req("contraseña")}))return;
const correo=log.elements.correo.value.trim().toLowerCase();
const u=usuarios().find(x=>x.correo===correo);
if(!u||u.clave!==await hash(log.elements.clave.value))return msg(log,"Correo o contraseña incorrectos.");
iniciarSesion(u)});

/* Pestañas login/registro */
document.querySelectorAll("[data-pestana]").forEach(b=>b.addEventListener("click",()=>{
document.querySelectorAll("[data-pestana]").forEach(x=>x.classList.toggle("activo",x===b));
document.querySelectorAll("[data-panel]").forEach(p=>p.hidden=p.dataset.panel!==b.dataset.pestana)}));

/* Envíos */
const fe=document.getElementById("form-envio");
if(fe){const s=sesion();
if(!s)document.getElementById("envio-bloqueo").hidden=false;
else{fe.hidden=false;fe.elements.nombre.value=s.nombre;fe.elements.correo.value=s.correo;
let tot=0;const lineas=obtenerCarrito().map(l=>{const p=CATALOGO_CERVEZAS.find(x=>x.id===l.id);tot+=p.precio*l.cantidad;return`${l.cantidad} x ${p.nombre} (${CLP(p.precio)})`});
const pedido=lineas.length?lineas.join("\n")+"\nSubtotal: "+CLP(tot):"(sin productos en el carrito)";
document.getElementById("e-pedido").textContent="Tu pedido:\n"+pedido;
fe.addEventListener("submit",async e=>{e.preventDefault();
if(!validar(fe,{nombre:rNombre,telefono:req("teléfono",v=>RX.tel.test(v)?"":"Teléfono inválido (8 a 12 dígitos)."),region:req("región"),comuna:req("comuna"),direccion:req("dirección",v=>v.length>=5?"":"Escribe calle y número.")}))return;
const btn=fe.querySelector("button");btn.disabled=true;const v=n=>fe.elements[n].value.trim();
try{const r=await fetch(FORMSPREE_URL,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},
body:JSON.stringify({_subject:"Nueva solicitud de envío - Bruma",nombre:v("nombre"),email:v("correo"),telefono:v("telefono"),direccion:`${v("direccion")}, ${v("comuna")}, ${v("region")}`,referencia:v("referencia"),pedido})});
if(!r.ok)throw new Error();
msg(fe,"¡Solicitud enviada! Te contactaremos al correo para coordinar el despacho.",true);
localStorage.removeItem("brumaCarrito");actualizarContador()}
catch{msg(fe,"No pudimos enviar la solicitud. Revisa tu conexión e intenta de nuevo.");btn.disabled=false}})}}
});
