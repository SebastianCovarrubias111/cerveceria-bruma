const CATALOGO_CERVEZAS=[
{id:"BRU001",nombre:"Bruma Costera",estilo:"Pale Ale",categoria:"Ale",abv:5.2,ibu:32,presentacion:"Botella 330 ml",precio:5990,descripcion:"Pale Ale ligera con notas cítricas de lúpulo Cascade y final seco, pensada para el atardecer frente al mar."},
{id:"BRU002",nombre:"Niebla Negra",estilo:"Stout",categoria:"Stout",abv:6.8,ibu:40,presentacion:"Botella 330 ml",precio:6490,descripcion:"Stout cremosa con café tostado y cacao amargo, madurada en barrica. La favorita de las noches de lluvia."},
{id:"BRU003",nombre:"Volcánica IPA",estilo:"IPA",categoria:"IPA",abv:7.1,ibu:61,presentacion:"Botella 330 ml",precio:6990,descripcion:"India Pale Ale intensa en lúpulo, con aromas a pino y fruta tropical. Amargor firme y memorable."},
{id:"BRU004",nombre:"Rubia del Lago",estilo:"Lager",categoria:"Lager",abv:4.6,ibu:18,presentacion:"Botella 330 ml",precio:5490,descripcion:"Lager dorada, liviana y refrescante, fermentada en frío durante seis semanas para máxima limpieza."},
{id:"BRU005",nombre:"Ámbar de Turbera",estilo:"Amber Ale",categoria:"Ale",abv:5.6,ibu:28,presentacion:"Botella 330 ml",precio:6190,descripcion:"Ale ámbar con maltas caramelo y un leve toque ahumado que recuerda a las turberas del sur."},
{id:"BRU006",nombre:"Doble Lúpulo",estilo:"Double IPA",categoria:"IPA",abv:8.4,ibu:74,presentacion:"Botella 330 ml",precio:7490,descripcion:"Double IPA robusta con dry-hopping triple de variedades del hemisferio sur, para paladares que buscan intensidad."},
{id:"BRU007",nombre:"Trigo del Estuario",estilo:"Witbier",categoria:"Trigo",abv:4.9,ibu:14,presentacion:"Botella 330 ml",precio:5790,descripcion:"Cerveza de trigo turbia con cáscara de naranja y cilantro. Suave, especiada y muy fácil de beber."},
{id:"BRU008",nombre:"Imperial de Roble",estilo:"Imperial Stout",categoria:"Stout",abv:9.5,ibu:55,presentacion:"Botella 500 ml",precio:8990,descripcion:"Imperial Stout envejecida en barricas de roble ex-whisky. Edición limitada de temporada fría."}];
const CLP=n=>"$"+n.toLocaleString("es-CL");
function plantillaTarjetaCerveza(c){return `<article class="tarjeta-cerveza"><img src="https://picsum.photos/seed/${c.id}/480/360" alt="Botella de ${c.nombre}, estilo ${c.estilo}" loading="lazy"><div><h3>${c.nombre}</h3><span class="datos">${c.estilo} · ${c.abv}% ABV · ${c.ibu} IBU · ${c.presentacion}</span><p>${c.descripcion}</p><span class="precio">${CLP(c.precio)}</span><button class="btn" data-agregar-carrito="${c.id}">Agregar al carrito</button></div></article>`}
function renderizarCervezas(id,lista){const el=document.getElementById(id);if(el)el.innerHTML=lista.map(plantillaTarjetaCerveza).join("")}
document.addEventListener("DOMContentLoaded",()=>{
renderizarCervezas("destacados",CATALOGO_CERVEZAS.filter(c=>["BRU003","BRU002","BRU004","BRU007"].includes(c.id)));
renderizarCervezas("grilla-catalogo",CATALOGO_CERVEZAS);
document.querySelectorAll("[data-filtro]").forEach(b=>b.addEventListener("click",()=>{
document.querySelectorAll("[data-filtro]").forEach(x=>x.classList.toggle("activo",x===b));
const f=b.dataset.filtro;renderizarCervezas("grilla-catalogo",f==="todas"?CATALOGO_CERVEZAS:CATALOGO_CERVEZAS.filter(c=>c.categoria.toLowerCase()===f))}))});
