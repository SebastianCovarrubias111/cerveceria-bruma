/* Servidor de pagos Webpay Plus — Cervecería Bruma
 * Flujo: front → POST /api/pago/crear → Webpay → /api/pago/retorno (commit) → pago-resultado.html
 */
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const vm = require("vm");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const {
  WebpayPlus, Options, Environment,
  IntegrationCommerceCodes, IntegrationApiKeys,
} = require("transbank-sdk");

const PORT = process.env.PORT || 3000;
const BASE_URL = (process.env.BASE_URL || "").replace(/\/$/, "");
// Dónde está el sitio (para redirigir al terminar el pago). Si el sitio lo sirve este mismo servidor, queda igual a BASE_URL.
const FRONTEND_URL = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
const FORMSPREE_URL = process.env.FORMSPREE_URL || "https://formspree.io/f/mvkzqlel";
const PRODUCCION = process.env.TBK_AMBIENTE === "produccion";

/* ---------- Transbank ---------- */
function crearTransaccion() {
  if (PRODUCCION) {
    if (!process.env.TBK_COMMERCE_CODE || !process.env.TBK_API_KEY)
      throw new Error("Faltan TBK_COMMERCE_CODE y TBK_API_KEY para producción.");
    return new WebpayPlus.Transaction(
      new Options(process.env.TBK_COMMERCE_CODE, process.env.TBK_API_KEY, Environment.Production));
  }
  // Ambiente de integración: credenciales públicas de pruebas de Transbank
  return new WebpayPlus.Transaction(
    new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration));
}

/* ---------- Catálogo: se lee de js/productos.js para que los precios sean los del sitio ---------- */
function cargarCatalogo() {
  const ruta = path.join(__dirname, "..", "js", "productos.js");
  const ctx = { document: { addEventListener() {} } };
  return vm.runInNewContext(fs.readFileSync(ruta, "utf8") + "\n;CATALOGO_CERVEZAS", ctx);
}
const CATALOGO = cargarCatalogo();
const despacho = (sub) => (sub >= 30000 || sub === 0 ? 0 : 3500); // misma regla que carrito.js

/* ---------- Órdenes (en memoria) ----------
 * Para producción reemplaza este Map por una base de datos (Postgres, SQLite, etc.). */
const ordenes = new Map();
const ordenId = () => "BR" + Date.now().toString(36).toUpperCase() + crypto.randomBytes(3).toString("hex").toUpperCase(); // máx. 26 caracteres

/* ---------- App ---------- */
const app = express();
app.set("trust proxy", true);
// Si BASE_URL/FRONTEND_URL no están en el .env, se usa la dirección con que el cliente abrió el sitio (así no depende de la IP).
const baseDe = (req) => BASE_URL || `${req.protocol}://${req.get("host")}`;
const frontDe = (req) => FRONTEND_URL || baseDe(req);
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: false }));
const origenes = (process.env.FRONTEND_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
if (origenes.length) app.use("/api", cors({ origin: origenes }));

const texto = (v, max = 120) => String(v ?? "").trim().slice(0, max);

app.post("/api/pago/crear", async (req, res) => {
  try {
    const { items, envio } = req.body || {};
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: "El carrito está vacío." });

    // El monto SIEMPRE se calcula acá, nunca se confía en el total que manda el navegador.
    let subtotal = 0;
    const lineas = [];
    for (const it of items) {
      const p = CATALOGO.find((c) => c.id === it?.id);
      const cant = Number(it?.cantidad);
      if (!p || !Number.isInteger(cant) || cant < 1 || cant > 20)
        return res.status(400).json({ error: "Hay productos inválidos en el carrito." });
      subtotal += p.precio * cant;
      lineas.push({ id: p.id, nombre: p.nombre, precio: p.precio, cantidad: cant });
    }
    const envioCosto = despacho(subtotal);
    const monto = subtotal + envioCosto;

    const e = envio || {};
    const datosEnvio = {
      nombre: texto(e.nombre, 60), correo: texto(e.correo), telefono: texto(e.telefono, 20),
      region: texto(e.region), comuna: texto(e.comuna), direccion: texto(e.direccion, 160), referencia: texto(e.referencia, 300),
    };
    if (!datosEnvio.nombre || !datosEnvio.direccion || !datosEnvio.comuna || !datosEnvio.region)
      return res.status(400).json({ error: "Faltan datos de despacho." });

    const orden = ordenId();
    const sesion = crypto.randomBytes(12).toString("hex");
    const r = await crearTransaccion().create(orden, sesion, monto, `${baseDe(req)}/api/pago/retorno`);

    ordenes.set(orden, {
      orden, token: r.token, monto, subtotal, despacho: envioCosto, lineas, envio: datosEnvio,
      estado: "PENDIENTE", creada: new Date().toISOString(),
    });
    res.json({ url: r.url, token: r.token, orden });
  } catch (err) {
    console.error("Error creando transacción:", err.message);
    res.status(502).json({ error: "No pudimos iniciar el pago. Intenta nuevamente en unos minutos." });
  }
});

/* Webpay vuelve acá: POST con token_ws (pago procesado) o TBK_TOKEN (usuario anuló / tiempo agotado). */
app.all("/api/pago/retorno", async (req, res) => {
  const p = { ...req.query, ...req.body };
  const volver = (orden, estado) => res.redirect(303, `${frontDe(req)}/pago-resultado.html?orden=${encodeURIComponent(orden || "")}&estado=${estado}`);

  try {
    // Caso 1: el usuario anuló el pago o se agotó el tiempo en el formulario de Webpay
    if (p.TBK_TOKEN && !p.token_ws) {
      const o = ordenes.get(p.TBK_ORDEN_COMPRA);
      if (o && o.estado === "PENDIENTE") o.estado = "ANULADA";
      return volver(p.TBK_ORDEN_COMPRA, o && o.estado === "ANULADA" ? "anulado" : "error");
    }
    // Caso 2: flujo normal → confirmar (commit) con Transbank
    if (!p.token_ws) return volver("", "error");

    const o = [...ordenes.values()].find((x) => x.token === p.token_ws);
    if (!o) return volver("", "error");
    if (o.estado !== "PENDIENTE") return volver(o.orden, o.estado === "PAGADA" ? "ok" : "rechazado"); // evita doble commit

    const r = await crearTransaccion().commit(p.token_ws);
    const aprobado = r.status === "AUTHORIZED" && r.response_code === 0 && r.amount === o.monto && r.buy_order === o.orden;
    Object.assign(o, {
      estado: aprobado ? "PAGADA" : "RECHAZADA",
      tarjeta: r.card_detail?.card_number, autorizacion: r.authorization_code,
      tipoPago: r.payment_type_code, cuotas: r.installments_number, fechaPago: r.transaction_date,
    });
    if (aprobado) { notificar(o); enviarComprobante(o); }
    return volver(o.orden, aprobado ? "ok" : "rechazado");
  } catch (err) {
    console.error("Error confirmando transacción:", err.message);
    return volver(p.TBK_ORDEN_COMPRA, "error");
  }
});

/* El front consulta el resultado real (no se confía en el query string) */
app.get("/api/pago/orden/:orden", (req, res) => {
  const o = ordenes.get(req.params.orden);
  if (!o) return res.status(404).json({ error: "Orden no encontrada." });
  const { orden, estado, monto, subtotal, despacho, lineas, tarjeta, autorizacion, tipoPago, cuotas, fechaPago } = o;
  res.json({ orden, estado, monto, subtotal, despacho, lineas, tarjeta, autorizacion, tipoPago, cuotas, fechaPago });
});

/* Aviso a la cervecería cuando el pago queda aprobado (mismo Formspree que ya usaba el sitio) */
async function notificar(o) {
  try {
    await fetch(FORMSPREE_URL, {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: `Nuevo pedido PAGADO ${o.orden} - Bruma`,
        nombre: o.envio.nombre, email: o.envio.correo, telefono: o.envio.telefono,
        direccion: `${o.envio.direccion}, ${o.envio.comuna}, ${o.envio.region}`, referencia: o.envio.referencia,
        pedido: o.lineas.map((l) => `${l.cantidad} x ${l.nombre}`).join("\n") +
          `\nSubtotal: $${o.subtotal}\nDespacho: $${o.despacho}\nTotal pagado: $${o.monto}\nCódigo autorización: ${o.autorizacion}`,
      }),
    });
  } catch (err) { console.error("No se pudo enviar la notificación:", err.message); }
}

// Sirve el sitio estático (para desarrollo local con un solo comando)
/* Comprobante de pago por correo al cliente (SMTP configurado en .env) */
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clp = (n) => "$" + Number(n).toLocaleString("es-CL");
const TIPOS = { VD: "Débito", VN: "Crédito", VC: "Crédito en cuotas", SI: "Crédito en 3 cuotas sin interés", S2: "Crédito en 2 cuotas sin interés", NC: "Crédito en cuotas sin interés", VP: "Prepago" };
let correo = null;
function transportador() {
  if (correo) return correo;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const puerto = Number(SMTP_PORT || 465);
  correo = nodemailer.createTransport({ host: SMTP_HOST, port: puerto, secure: puerto === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
  return correo;
}
async function enviarComprobante(o) {
  const t = transportador();
  if (!t) return console.warn("Comprobante NO enviado: faltan SMTP_HOST, SMTP_USER y SMTP_PASS en el .env");
  try {
    const d = new Date(o.fechaPago);
    const fecha = (isNaN(d) ? new Date() : d).toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "long", timeStyle: "short" });
    const medio = (TIPOS[o.tipoPago] || "Tarjeta") + (o.tarjeta ? " ····" + o.tarjeta : "");
    const cuotas = o.cuotas ? `${o.cuotas} cuotas` : "Sin cuotas";
    const e = o.envio;
    const celda = "padding:8px 10px;border-bottom:1px solid #e6dcc3;";
    const filas = o.lineas.map((l) => `<tr><td style="${celda}">${esc(l.nombre)}</td><td style="${celda}text-align:center">${l.cantidad}</td><td style="${celda}text-align:right">${clp(l.precio)}</td><td style="${celda}text-align:right">${clp(l.precio * l.cantidad)}</td></tr>`).join("");
    const dato = (k, v) => `<tr><td style="padding:4px 0;color:#6b5f4b;width:190px">${k}</td><td style="padding:4px 0"><b>${esc(v)}</b></td></tr>`;
    const aviso = PRODUCCION ? "" : `<p style="background:#fff3cd;border:1px solid #e0c36a;padding:10px;border-radius:6px;font-size:13px">Este es un pago de <b>prueba</b>: no se realizó ningún cargo real.</p>`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#17130f">
<div style="background:#17130f;color:#f3ead4;padding:20px 24px;border-radius:8px 8px 0 0"><div style="color:#e8ac4e;font-size:12px;letter-spacing:2px">CERVECERÍA BRUMA</div><h1 style="margin:6px 0 0;font-size:22px">Comprobante de pago</h1></div>
<div style="border:1px solid #e6dcc3;border-top:0;padding:22px 24px;border-radius:0 0 8px 8px">
<p>Hola ${esc(e.nombre)}, ¡gracias por tu compra! Tu pago fue aprobado.</p>${aviso}
<table style="width:100%;border-collapse:collapse;font-size:14px;margin:14px 0">${dato("N° de orden", o.orden)}${dato("Fecha", fecha)}${dato("Medio de pago", medio)}${dato("Cuotas", cuotas)}${dato("Código de autorización", o.autorizacion || "-")}</table>
<table style="width:100%;border-collapse:collapse;font-size:14px"><tr style="background:#f7f1e3"><th style="${celda}text-align:left">Producto</th><th style="${celda}">Cant.</th><th style="${celda}text-align:right">Precio</th><th style="${celda}text-align:right">Total</th></tr>${filas}
<tr><td colspan="3" style="${celda}text-align:right">Subtotal</td><td style="${celda}text-align:right">${clp(o.subtotal)}</td></tr>
<tr><td colspan="3" style="${celda}text-align:right">Despacho</td><td style="${celda}text-align:right">${o.despacho ? clp(o.despacho) : "Gratis"}</td></tr>
<tr><td colspan="3" style="padding:10px;text-align:right"><b>Total pagado</b></td><td style="padding:10px;text-align:right;font-size:16px"><b>${clp(o.monto)}</b></td></tr></table>
<h3 style="margin:22px 0 6px;font-size:15px">Datos de despacho</h3>
<p style="margin:0;font-size:14px;line-height:1.5">${esc(e.nombre)}<br>${esc(e.direccion)}, ${esc(e.comuna)}, ${esc(e.region)}${e.referencia ? "<br>Referencias: " + esc(e.referencia) : ""}<br>Teléfono: ${esc(e.telefono)}</p>
<p style="font-size:12px;color:#6b5f4b;margin-top:22px">Guarda este correo como respaldo de tu compra. Venta exclusiva para mayores de 18 años.</p>
</div></div>`;
    const texto = [`Comprobante de pago - Cervecería Bruma`, `N° de orden: ${o.orden}`, `Fecha: ${fecha}`, `Medio de pago: ${medio} (${cuotas})`, `Código de autorización: ${o.autorizacion || "-"}`, "",
      ...o.lineas.map((l) => `${l.cantidad} x ${l.nombre}  ${clp(l.precio * l.cantidad)}`), `Subtotal: ${clp(o.subtotal)}`, `Despacho: ${o.despacho ? clp(o.despacho) : "Gratis"}`, `Total pagado: ${clp(o.monto)}`, "",
      `Despacho a: ${e.nombre}, ${e.direccion}, ${e.comuna}, ${e.region}`].join("\n");
    await t.sendMail({
      from: process.env.MAIL_FROM || `"Cervecería Bruma" <${process.env.SMTP_USER}>`,
      to: e.correo,
      subject: `Comprobante de pago ${o.orden} - Cervecería Bruma${PRODUCCION ? "" : " (modo pruebas)"}`,
      text: texto, html,
    });
    console.log("Comprobante enviado a", e.correo, "orden", o.orden);
  } catch (err) { console.error("No se pudo enviar el comprobante:", err.message); }
}

const RAIZ = path.join(__dirname, "..");
app.use((req, res, next) => (/^\/(servidor|node_modules|\.)/i.test(req.path) ? res.status(404).end() : next()));
app.use(express.static(RAIZ, { dotfiles: "ignore" }));

if (require.main === module)
  app.listen(PORT, () => console.log(`Bruma → ${BASE_URL || "http://localhost:" + PORT}  (Webpay: ${PRODUCCION ? "PRODUCCIÓN" : "integración"})`));
module.exports = app;
