document.addEventListener("DOMContentLoaded",()=>{
const b=document.getElementById("btn-menu"),u=document.querySelector("nav ul");
if(b)b.addEventListener("click",()=>{const a=u.classList.toggle("abierto");b.setAttribute("aria-expanded",a)});
const o=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("en-vista");o.unobserve(e.target)}}),{threshold:.15});
document.querySelectorAll(".reveal").forEach(e=>o.observe(e));
document.querySelectorAll("[data-anio]").forEach(e=>e.textContent=new Date().getFullYear());

/* Usuario con sesión iniciada */
let s=null;try{s=JSON.parse(localStorage.getItem("brumaSesion"))}catch{}
const enlace=document.querySelector('nav a[href="login.html"]');
if(s&&enlace){const nombre=s.nombre.split(" ")[0];
const caja=document.createElement("span");caja.className="usuario";
const av=document.createElement("span");av.className="avatar";av.setAttribute("aria-hidden","true");av.textContent=nombre[0].toUpperCase();
caja.append(av,"Hola, "+nombre);
const salir=document.createElement("button");salir.className="btn sec";salir.textContent="Cerrar sesión";
salir.addEventListener("click",()=>{localStorage.removeItem("brumaSesion");localStorage.removeItem("brumaEdadVerificada");location.href="index.html"});
enlace.parentElement.replaceChildren(caja,salir)}
});
