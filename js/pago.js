/* Pago con Webpay Plus (Transbank). Pide al servidor crear la transacción y redirige al formulario de pago. */
async function iniciarPagoWebpay(envio){
const items=obtenerCarrito().map(l=>({id:l.id,cantidad:l.cantidad}));
const r=await fetch(API_BASE+"/api/pago/crear",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items,envio})});
const d=await r.json().catch(()=>({}));
if(!r.ok||!d.url||!d.token)throw new Error(d.error||"No pudimos iniciar el pago. Intenta de nuevo.");
const f=document.createElement("form");f.method="POST";f.action=d.url;
const i=document.createElement("input");i.type="hidden";i.name="token_ws";i.value=d.token;
f.append(i);document.body.append(f);f.submit()}

/* Página de resultado: muestra el estado REAL de la orden consultándolo al servidor */
async function mostrarResultadoPago(){
const caja=document.getElementById("resultado-pago");if(!caja)return;
const q=new URLSearchParams(location.search),orden=q.get("orden");
const poner=(cls,titulo,html)=>{caja.className="resultado "+cls;caja.innerHTML=`<h1 style="font-size:clamp(2rem,6vw,3.5rem);margin-bottom:1rem">${titulo}</h1>${html}`};
const volver='<p style="margin-top:1.5rem"><a class="btn" href="carrito.html">Volver al carrito</a></p>';
if(!orden)return poner("mal","No pudimos verificar el pago","<p>Si te cobraron, escríbenos a <a href=\"mailto:hola@cerveceriabruma.cl\">hola@cerveceriabruma.cl</a>.</p>"+volver);
try{const r=await fetch(`${API_BASE}/api/pago/orden/${encodeURIComponent(orden)}`);if(!r.ok)throw 0;const o=await r.json();
if(o.estado==="PAGADA"){localStorage.removeItem("brumaCarrito");actualizarContador();
const tipo={VD:"Débito",VN:"Crédito",VC:"Crédito en cuotas",SI:"Crédito 3 cuotas sin interés",S2:"Crédito 2 cuotas sin interés",NC:"Crédito cuotas sin interés",VP:"Prepago"}[o.tipoPago]||"Tarjeta";
poner("ok","¡Pago aprobado!",`<p>Gracias por tu compra. Coordinaremos el despacho al correo que ingresaste.</p>
<div class="datos" style="margin-top:1.2rem;display:grid;gap:.3rem;max-width:420px"><span>N° de orden: <b>${o.orden}</b></span><span>Monto pagado: <b>${CLP(o.monto)}</b></span><span>Medio: <b>${tipo}${o.tarjeta?" ····"+o.tarjeta:""}</b></span><span>Código de autorización: <b>${o.autorizacion||"-"}</b></span></div>
<p style="margin-top:1.5rem"><a class="btn" href="catalogo.html">Seguir comprando</a></p>`)}
else if(o.estado==="ANULADA")poner("mal","Pago anulado","<p>Cancelaste el pago o se agotó el tiempo. No se realizó ningún cargo y tu carrito sigue guardado.</p>"+volver);
else poner("mal","Pago rechazado","<p>Tu banco o Webpay rechazó la transacción. No se realizó ningún cargo. Puedes intentar con otra tarjeta.</p>"+volver)}
catch{poner("mal","No pudimos verificar el pago","<p>Si te cobraron, escríbenos a <a href=\"mailto:hola@cerveceriabruma.cl\">hola@cerveceriabruma.cl</a> indicando tu N° de orden: "+orden+".</p>"+volver)}}
document.addEventListener("DOMContentLoaded",mostrarResultadoPago);
