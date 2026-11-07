document.addEventListener("DOMContentLoaded",()=>{
const b=document.getElementById("btn-menu"),u=document.querySelector("nav ul");
if(b)b.addEventListener("click",()=>{const a=u.classList.toggle("abierto");b.setAttribute("aria-expanded",a)});
const o=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("en-vista");o.unobserve(e.target)}}),{threshold:.15});
document.querySelectorAll(".reveal").forEach(e=>o.observe(e));
document.querySelectorAll("[data-anio]").forEach(e=>e.textContent=new Date().getFullYear());

/* Usuario con sesión iniciada: muestra su nombre, el acceso al panel según su rol y el botón de cerrar sesión */
const sesionActual=Sesion.leer();
const enlace=document.querySelector('nav a[href="login.html"]');
if(sesionActual){
document.body.classList.add("rol-"+sesionActual.rol);
if(enlace){const nombre=sesionActual.nombre.split(" ")[0];
const caja=document.createElement("span");caja.className="usuario";
const av=document.createElement("span");av.className="avatar";av.setAttribute("aria-hidden","true");av.textContent=nombre[0].toUpperCase();
caja.append(av,"Hola, "+nombre);
const salir=document.createElement("button");salir.className="btn sec";salir.textContent="Cerrar sesión";
salir.addEventListener("click",()=>{cerrarSesion();location.href="index.html"});
const piezas=[];
if(sesionActual.rol==="ADMIN"||sesionActual.rol==="VENDEDOR"){const p=document.createElement("a");p.href="panel.html";p.className="btn";p.textContent="Panel";p.style.marginRight=".6rem";piezas.push(p)}
enlace.parentElement.replaceChildren(...piezas,caja,salir)}
/* El vendedor solo consulta: no ve el carrito ni los envíos */
if(sesionActual.rol==="VENDEDOR")document.querySelectorAll('nav a[href="carrito.html"],nav a[href="envios.html"]').forEach(a=>a.parentElement.hidden=true);
/* Al recargar, confirma con el servidor que la sesión sigue vigente; si venció, se cierra */
verificarSesion().then(u=>{if(!u)location.reload()})}
});
