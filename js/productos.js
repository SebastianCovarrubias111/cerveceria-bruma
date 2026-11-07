/* Respaldo local: se usa solo si la API no responde. La fuente de verdad es el backend (GET /productos). */
let CATALOGO_CERVEZAS=[
{id:"BRU001",nombre:"Bruma Costera",estilo:"Pale Ale",categoria:"Ale",abv:5.2,ibu:32,presentacion:"Botella 330 ml",precio:5990,descripcion:"Pale Ale ligera con notas cítricas de lúpulo Cascade y final seco, pensada para el atardecer frente al mar."},
{id:"BRU002",nombre:"Niebla Negra",estilo:"Stout",categoria:"Stout",abv:6.8,ibu:40,presentacion:"Botella 330 ml",precio:6490,descripcion:"Stout cremosa con café tostado y cacao amargo, madurada en barrica. La favorita de las noches de lluvia."},
{id:"BRU003",nombre:"Volcánica IPA",estilo:"IPA",categoria:"IPA",abv:7.1,ibu:61,presentacion:"Botella 330 ml",precio:6990,descripcion:"India Pale Ale intensa en lúpulo, con aromas a pino y fruta tropical. Amargor firme y memorable."},
{id:"BRU004",nombre:"Rubia del Lago",estilo:"Lager",categoria:"Lager",abv:4.6,ibu:18,presentacion:"Botella 330 ml",precio:5490,descripcion:"Lager dorada, liviana y refrescante, fermentada en frío durante seis semanas para máxima limpieza."},
{id:"BRU005",nombre:"Ámbar de Turbera",estilo:"Amber Ale",categoria:"Ale",abv:5.6,ibu:28,presentacion:"Botella 330 ml",precio:6190,descripcion:"Ale ámbar con maltas caramelo y un leve toque ahumado que recuerda a las turberas del sur."},
{id:"BRU006",nombre:"Doble Lúpulo",estilo:"Double IPA",categoria:"IPA",abv:8.4,ibu:74,presentacion:"Botella 330 ml",precio:7490,descripcion:"Double IPA robusta con dry-hopping triple de variedades del hemisferio sur, para paladares que buscan intensidad."},
{id:"BRU007",nombre:"Trigo del Estuario",estilo:"Witbier",categoria:"Trigo",abv:4.9,ibu:14,presentacion:"Botella 330 ml",precio:5790,descripcion:"Cerveza de trigo turbia con cáscara de naranja y cilantro. Suave, especiada y muy fácil de beber."},
{id:"BRU008",nombre:"Imperial de Roble",estilo:"Imperial Stout",categoria:"Stout",abv:9.5,ibu:55,presentacion:"Botella 500 ml",precio:8990,descripcion:"Imperial Stout envejecida en barricas de roble ex-whisky. Edición limitada de temporada fría."}];
let CATALOGO_REMOTO=false; /* pasa a true cuando el catálogo ya viene de la API */
const CLP=n=>"$"+n.toLocaleString("es-CL");
const escHtml=t=>String(t??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function plantillaTarjetaCerveza(c){const agotada=c.stock===0;
return `<article class="tarjeta-cerveza"><img src="https://picsum.photos/seed/${escHtml(c.id)}/480/360" alt="Botella de ${escHtml(c.nombre)}, estilo ${escHtml(c.estilo)}" loading="lazy"><div><h3>${escHtml(c.nombre)}</h3><span class="datos">${escHtml(c.estilo)} · ${c.abv}% ABV · ${c.ibu} IBU · ${escHtml(c.presentacion)}</span><p>${escHtml(c.descripcion)}</p><span class="precio">${CLP(c.precio)}</span>${agotada?'<button class="btn sec" disabled>Agotada</button>':`<button class="btn" data-agregar-carrito="${escHtml(c.id)}">Agregar al carrito</button>`}</div></article>`}
function renderizarCervezas(id,lista){const el=document.getElementById(id);if(el)el.innerHTML=lista.map(plantillaTarjetaCerveza).join("")}

/* Trae el catálogo desde la API Spring (GET /productos) y lo adapta al formato que usa el sitio. */
async function cargarCatalogoDesdeApi(){
try{const r=await fetch(API_URL+"/productos");if(!r.ok)throw new Error("HTTP "+r.status);const lista=await r.json();
if(Array.isArray(lista)&&lista.length){CATALOGO_CERVEZAS=lista.map(p=>({id:p.codigo,nombre:p.nombre,estilo:p.estilo,categoria:p.categoria,abv:p.abv,ibu:p.ibu,presentacion:p.presentacion,precio:p.precio,descripcion:p.descripcion||"",stock:p.stock}));CATALOGO_REMOTO=true;return true}}
catch(e){console.warn("No se pudo leer el catálogo de la API; se muestra el respaldo local.",e.message)}
return false}

function pintarCatalogo(){
renderizarCervezas("destacados",CATALOGO_CERVEZAS.filter(c=>["BRU003","BRU002","BRU004","BRU007"].includes(c.id)));
const activo=document.querySelector("[data-filtro].activo"),f=activo?activo.dataset.filtro:"todas";
renderizarCervezas("grilla-catalogo",f==="todas"?CATALOGO_CERVEZAS:CATALOGO_CERVEZAS.filter(c=>c.categoria.toLowerCase()===f))}

document.addEventListener("DOMContentLoaded",async()=>{
pintarCatalogo(); /* primero el respaldo, para que la página no quede vacía */
document.querySelectorAll("[data-filtro]").forEach(b=>b.addEventListener("click",()=>{
document.querySelectorAll("[data-filtro]").forEach(x=>x.classList.toggle("activo",x===b));pintarCatalogo()}));
if(typeof API_URL!=="undefined"&&await cargarCatalogoDesdeApi()){pintarCatalogo();if(typeof renderizarCarrito==="function")renderizarCarrito()}});
