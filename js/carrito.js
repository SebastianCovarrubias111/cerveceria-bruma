const LLAVE="brumaCarrito";
function obtenerCarrito(){try{const c=JSON.parse(localStorage.getItem(LLAVE));return Array.isArray(c)?c:[]}catch{return[]}}
function guardarCarrito(c){localStorage.setItem(LLAVE,JSON.stringify(c));actualizarContador();renderizarCarrito()}
function actualizarContador(){const n=obtenerCarrito().reduce((s,l)=>s+l.cantidad,0);document.querySelectorAll("[data-contador]").forEach(e=>e.textContent=n)}
function aviso(t){let a=document.getElementById("aviso");if(!a){a=document.createElement("div");a.id="aviso";a.setAttribute("role","status");document.body.append(a)}
a.textContent=t;a.classList.add("visible");clearTimeout(a.t);a.t=setTimeout(()=>a.classList.remove("visible"),2000)}
const maxUnidades=p=>Math.min(20,typeof p.stock==="number"?p.stock:20);
function agregarAlCarrito(id){const p=CATALOGO_CERVEZAS.find(c=>c.id===id);if(!p)return;
if(Sesion.rol()==="VENDEDOR")return aviso("Tu rol no puede realizar compras");
const c=obtenerCarrito();const l=c.find(x=>x.id===id);
if(maxUnidades(p)<1)return aviso(p.nombre+" está agotada");
if(l&&l.cantidad>=maxUnidades(p))return aviso("No hay más unidades disponibles de "+p.nombre);
if(l)l.cantidad+=1;else c.push({id,cantidad:1});guardarCarrito(c);aviso(p.nombre+" agregada al carrito")}
function cambiarCantidad(id,d){const p=CATALOGO_CERVEZAS.find(c=>c.id===id);const c=obtenerCarrito();const l=c.find(x=>x.id===id);if(l&&p){l.cantidad=Math.max(1,Math.min(maxUnidades(p)||1,l.cantidad+d));guardarCarrito(c)}}
function quitarDelCarrito(id){guardarCarrito(obtenerCarrito().filter(l=>l.id!==id))}
function calcularDespacho(sub){return sub>=30000||sub===0?0:3500}
function renderizarCarrito(){const t=document.getElementById("lineas-carrito");if(!t)return;let c=obtenerCarrito();
/* Productos que ya no existen en el catálogo: solo se limpian cuando el catálogo viene de la API (para no borrar por error) */
const existen=c.filter(l=>CATALOGO_CERVEZAS.some(x=>x.id===l.id));
if(existen.length!==c.length){if(CATALOGO_REMOTO){localStorage.setItem(LLAVE,JSON.stringify(existen));actualizarContador()}c=existen}
document.getElementById("carrito-vacio").hidden=c.length>0;document.getElementById("zona-carrito").hidden=c.length===0;
let sub=0;t.innerHTML=c.map(l=>{const p=CATALOGO_CERVEZAS.find(x=>x.id===l.id);const s=p.precio*l.cantidad;sub+=s;
return `<tr><td>${escHtml(p.nombre)}</td><td>${CLP(p.precio)}</td><td><button data-menos="${l.id}" aria-label="Quitar una unidad de ${p.nombre}">−</button> ${l.cantidad} <button data-mas="${l.id}" aria-label="Agregar una unidad de ${p.nombre}">+</button></td><td>${CLP(s)}</td><td><button data-quitar="${l.id}" aria-label="Eliminar ${p.nombre}">✕</button></td></tr>`}).join("");
const desp=calcularDespacho(sub);
document.getElementById("c-sub").textContent=CLP(sub);document.getElementById("c-desp").textContent=desp?CLP(desp):"Gratis";document.getElementById("c-total").textContent=CLP(sub+desp)}
document.addEventListener("DOMContentLoaded",()=>{actualizarContador();renderizarCarrito();
document.addEventListener("click",e=>{const t=e.target;
if(t.dataset.agregarCarrito)agregarAlCarrito(t.dataset.agregarCarrito);
if(t.dataset.mas)cambiarCantidad(t.dataset.mas,1);if(t.dataset.menos)cambiarCantidad(t.dataset.menos,-1);if(t.dataset.quitar)quitarDelCarrito(t.dataset.quitar)});
const f=document.getElementById("finalizar");if(f)f.addEventListener("click",()=>{const m=document.getElementById("msg-checkout");
if(!Sesion.leer()){m.className="mensaje-error";m.innerHTML='Para comprar debes <a href="login.html">iniciar sesión o registrarte</a>.'}
else if(Sesion.rol()==="VENDEDOR"){m.className="mensaje-error";m.textContent="Tu rol (vendedor) no puede realizar compras."}
else location.href="envios.html"})});
