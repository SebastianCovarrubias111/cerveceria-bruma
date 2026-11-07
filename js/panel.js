/* Panel de gestión. Muestra solo lo que cada rol puede usar:
 *   ADMIN    → Productos (crear/editar/eliminar), Categorías, Órdenes (cambiar estado/eliminar), Usuarios.
 *   VENDEDOR → Productos (lista y detalle) y Órdenes (lista y detalle). Nada más.
 * Ocultar botones es solo comodidad: el backend rechaza (403) cualquier acción que el rol no tenga permitida. */
(function () {
  if (!document.getElementById("panel-contenido")) return;
  if (!exigirRol(["ADMIN", "VENDEDOR"], "catalogo.html")) return;

  const rol = Sesion.rol();
  const esAdmin = rol === "ADMIN";
  const $ = (id) => document.getElementById(id);
  const esc = escHtml; // definido en productos.js
  const dlg = $("dlg");
  const fecha = (f) => new Date(f).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
  let categorias = [];

  function estado(texto, error) {
    const e = $("panel-estado");
    e.className = error ? "mensaje-error" : "mensaje-ok";
    e.textContent = texto || "";
    if (texto && !error) setTimeout(() => { if (e.textContent === texto) e.textContent = ""; }, 3500);
  }
  /* Ejecuta una acción; si falla muestra el error (dentro del diálogo si está abierto) y devuelve false. */
  async function conErrores(fn) {
    try { await fn(); return true; }
    catch (e) {
      if (e.estado === 401) { irA("login.html", true); return false; }
      const msg = e.campos ? Object.values(e.campos)[0] : e.message;
      if (dlg.open) $("dlg-error").textContent = msg; else estado(msg, true);
      return false;
    }
  }

  /* ---------- Diálogo genérico ---------- */
  let alGuardar = null;
  $("dlg-cancelar").addEventListener("click", () => dlg.close());
  $("dlg-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!alGuardar) return dlg.close();
    const ok = await alGuardar(new FormData($("dlg-form")));
    if (ok !== false) dlg.close();
  });
  function abrir(titulo, html, guardar, textoOk) {
    $("dlg-titulo").textContent = titulo;
    $("dlg-error").textContent = "";
    $("dlg-cuerpo").innerHTML = html;
    alGuardar = guardar || null;
    $("dlg-ok").hidden = !guardar;
    $("dlg-ok").textContent = textoOk || "Guardar";
    dlg.showModal();
  }
  const campo = (n, etiqueta, valor = "", tipo = "text", extra = "") =>
    `<div><label for="f-${n}">${etiqueta}</label><input id="f-${n}" name="${n}" type="${tipo}" value="${esc(valor)}" ${extra}></div>`;
  const selector = (n, etiqueta, opciones, actual) =>
    `<div><label for="f-${n}">${etiqueta}</label><select id="f-${n}" name="${n}">${opciones
      .map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(actual) ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></div>`;

  /* ---------- Pestañas ---------- */
  const secciones = [
    { id: "productos", titulo: "Productos", pintar: pintarProductos },
    ...(esAdmin ? [{ id: "categorias", titulo: "Categorías", pintar: pintarCategorias }] : []),
    { id: "ordenes", titulo: "Órdenes", pintar: pintarOrdenes },
    ...(esAdmin ? [{ id: "usuarios", titulo: "Usuarios", pintar: pintarUsuarios }] : []),
  ];
  $("panel-rol").textContent = "Sesión: " + Sesion.leer().nombre + " · Rol: " + rol +
    (esAdmin ? " (acceso total)" : " (solo consulta de productos y órdenes)");
  $("panel-pestanas").innerHTML = secciones.map((s, i) =>
    `<button class="${i ? "" : "activo"}" data-sec="${s.id}">${s.titulo}</button>`).join("");
  $("panel-pestanas").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-sec]"); if (!b) return;
    document.querySelectorAll("[data-sec]").forEach((x) => x.classList.toggle("activo", x === b));
    mostrar(b.dataset.sec);
  });
  function mostrar(id) { estado(""); conErrores(() => secciones.find((s) => s.id === id).pintar()); }

  async function cargarCategorias() { categorias = await api("/categorias"); }

  /* ---------- Productos ---------- */
  async function pintarProductos() {
    await cargarCategorias();
    const lista = await api("/productos/todos", { auth: true });
    $("panel-contenido").innerHTML =
      `<div class="barra-panel"><span class="datos">${lista.length} productos</span>${esAdmin ? '<button class="btn" data-nuevo-prod>Nuevo producto</button>' : ""}</div>
      <div class="tabla-scroll"><table><thead><tr><th>Código</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Estado</th><th></th></tr></thead><tbody>` +
      lista.map((p) => `<tr><td>${esc(p.codigo)}</td><td>${esc(p.nombre)}</td><td>${esc(p.categoria)}</td><td>${CLP(p.precio)}</td><td>${p.stock}</td>
        <td><span class="chip ${p.activo ? "ok" : "mal"}">${p.activo ? "Activo" : "De baja"}</span></td>
        <td><button data-ver-prod="${p.id}">Ver</button>${esAdmin ? ` <button data-edit-prod="${p.id}">Editar</button> <button data-del-prod="${p.id}">Eliminar</button>` : ""}</td></tr>`).join("") +
      "</tbody></table></div>";
    $("panel-contenido").onclick = async (ev) => {
      const t = ev.target;
      if (t.dataset.nuevoProd !== undefined) formProducto(null);
      if (t.dataset.verProd) verProducto(lista.find((p) => p.id == t.dataset.verProd));
      if (t.dataset.editProd) formProducto(lista.find((p) => p.id == t.dataset.editProd));
      if (t.dataset.delProd && confirm("¿Eliminar este producto? Si ya fue vendido, se dará de baja en lugar de borrarse."))
        conErrores(async () => { await api("/productos/" + t.dataset.delProd, { metodo: "DELETE", auth: true }); estado("Producto eliminado."); await pintarProductos(); });
    };
  }
  function verProducto(p) {
    abrir(p.nombre, `<div class="detalle-lista"><span><b>Código:</b> ${esc(p.codigo)}</span><span><b>Estilo:</b> ${esc(p.estilo)}</span>
      <span><b>Categoría:</b> ${esc(p.categoria)}</span><span><b>ABV / IBU:</b> ${p.abv}% / ${p.ibu}</span><span><b>Presentación:</b> ${esc(p.presentacion)}</span>
      <span><b>Precio:</b> ${CLP(p.precio)}</span><span><b>Stock:</b> ${p.stock}</span><span><b>Estado:</b> ${p.activo ? "Activo" : "De baja"}</span>
      <span><b>Descripción:</b> ${esc(p.descripcion || "—")}</span></div>`);
  }
  function formProducto(p) {
    const v = p || { codigo: "", nombre: "", estilo: "", categoriaId: categorias[0] && categorias[0].id, abv: "", ibu: "", presentacion: "Botella 330 ml", precio: "", descripcion: "", stock: 50, activo: true };
    abrir(p ? "Editar producto" : "Nuevo producto",
      campo("codigo", "Código", v.codigo) + campo("nombre", "Nombre", v.nombre) + campo("estilo", "Estilo", v.estilo) +
      selector("categoriaId", "Categoría", categorias.map((c) => [c.id, c.nombre]), v.categoriaId) +
      campo("abv", "ABV (%)", v.abv, "number", 'step="0.1" min="0"') + campo("ibu", "IBU", v.ibu, "number", 'min="0"') +
      campo("presentacion", "Presentación", v.presentacion) + campo("precio", "Precio (CLP)", v.precio, "number", 'min="1"') +
      campo("stock", "Stock", v.stock, "number", 'min="0"') +
      `<div><label for="f-descripcion">Descripción</label><textarea id="f-descripcion" name="descripcion" rows="3">${esc(v.descripcion)}</textarea></div>` +
      selector("activo", "Estado", [["true", "Activo"], ["false", "De baja"]], String(v.activo)),
      async (fd) => {
        const cuerpo = {
          codigo: fd.get("codigo").trim(), nombre: fd.get("nombre").trim(), estilo: fd.get("estilo").trim(),
          categoriaId: Number(fd.get("categoriaId")), abv: Number(fd.get("abv")), ibu: Number(fd.get("ibu")),
          presentacion: fd.get("presentacion").trim(), precio: Number(fd.get("precio")), stock: Number(fd.get("stock")),
          descripcion: fd.get("descripcion"), activo: fd.get("activo") === "true",
        };
        return conErrores(async () => {
          await api(p ? "/productos/" + p.id : "/productos", { metodo: p ? "PUT" : "POST", auth: true, cuerpo });
          estado(p ? "Producto actualizado." : "Producto creado."); await pintarProductos();
        });
      });
  }

  /* ---------- Categorías (solo ADMIN) ---------- */
  async function pintarCategorias() {
    await cargarCategorias();
    $("panel-contenido").innerHTML =
      `<div class="barra-panel"><span class="datos">${categorias.length} categorías</span><button class="btn" data-nueva-cat>Nueva categoría</button></div>
      <div class="tabla-scroll"><table><thead><tr><th>Nombre</th><th>Descripción</th><th></th></tr></thead><tbody>` +
      categorias.map((c) => `<tr><td>${esc(c.nombre)}</td><td>${esc(c.descripcion || "")}</td>
        <td><button data-edit-cat="${c.id}">Editar</button> <button data-del-cat="${c.id}">Eliminar</button></td></tr>`).join("") + "</tbody></table></div>";
    $("panel-contenido").onclick = (ev) => {
      const t = ev.target;
      if (t.dataset.nuevaCat !== undefined) formCategoria(null);
      if (t.dataset.editCat) formCategoria(categorias.find((c) => c.id == t.dataset.editCat));
      if (t.dataset.delCat && confirm("¿Eliminar esta categoría?"))
        conErrores(async () => { await api("/categorias/" + t.dataset.delCat, { metodo: "DELETE", auth: true }); estado("Categoría eliminada."); await pintarCategorias(); });
    };
  }
  function formCategoria(c) {
    abrir(c ? "Editar categoría" : "Nueva categoría",
      campo("nombre", "Nombre", c ? c.nombre : "") + campo("descripcion", "Descripción", c ? c.descripcion || "" : ""),
      async (fd) => {
        return conErrores(async () => {
          await api(c ? "/categorias/" + c.id : "/categorias", { metodo: c ? "PUT" : "POST", auth: true, cuerpo: { nombre: fd.get("nombre").trim(), descripcion: fd.get("descripcion") } });
          estado("Categoría guardada."); await pintarCategorias();
        });
      });
  }

  /* ---------- Órdenes ---------- */
  const ESTADOS = ["PENDIENTE", "PAGADA", "ANULADA"];
  async function pintarOrdenes() {
    const lista = await api("/boletas", { auth: true });
    $("panel-contenido").innerHTML =
      `<div class="barra-panel"><span class="datos">${lista.length} órdenes</span></div>
      <div class="tabla-scroll"><table><thead><tr><th>N°</th><th>Fecha</th><th>Cliente</th><th>Total</th><th>Estado</th><th></th></tr></thead><tbody>` +
      lista.map((b) => `<tr><td>${esc(b.numero)}</td><td>${fecha(b.fecha)}</td><td>${esc(b.usuarioNombre)}</td><td>${CLP(b.total)}</td>
        <td>${esAdmin ? `<select data-estado="${b.id}">${ESTADOS.map((e) => `<option ${e === b.estado ? "selected" : ""}>${e}</option>`).join("")}</select>` : `<span class="chip ${b.estado === "PAGADA" ? "ok" : b.estado === "ANULADA" ? "mal" : ""}">${b.estado}</span>`}</td>
        <td><button data-ver-ord="${b.id}">Ver detalle</button>${esAdmin ? ` <button data-del-ord="${b.id}">Eliminar</button>` : ""}</td></tr>`).join("") +
      "</tbody></table></div>";
    const c = $("panel-contenido");
    c.onclick = (ev) => {
      const t = ev.target;
      if (t.dataset.verOrd) verOrden(lista.find((b) => b.id == t.dataset.verOrd));
      if (t.dataset.delOrd && confirm("¿Eliminar esta orden?"))
        conErrores(async () => { await api("/boletas/" + t.dataset.delOrd, { metodo: "DELETE", auth: true }); estado("Orden eliminada."); await pintarOrdenes(); });
    };
    c.onchange = (ev) => {
      const t = ev.target; if (!t.dataset.estado) return;
      conErrores(async () => { await api(`/boletas/${t.dataset.estado}/estado`, { metodo: "PATCH", auth: true, cuerpo: { estado: t.value } }); estado("Estado actualizado."); await pintarOrdenes(); })
        .then((ok) => { if (!ok) pintarOrdenes(); }); // si falló, vuelve a mostrar el estado real
    };
  }
  function verOrden(b) {
    const e = b.envio;
    abrir("Orden " + b.numero,
      `<div class="detalle-lista"><span><b>Fecha:</b> ${fecha(b.fecha)}</span><span><b>Estado:</b> ${b.estado}</span>
      <span><b>Cliente:</b> ${esc(b.usuarioNombre)} (${esc(b.usuarioCorreo)})</span>
      <span><b>Despacho a:</b> ${esc(e.nombre)}, ${esc(e.direccion)}, ${esc(e.comuna)}, ${esc(e.region)}</span>
      <span><b>Teléfono:</b> ${esc(e.telefono || "—")}</span>${e.referencia ? `<span><b>Referencias:</b> ${esc(e.referencia)}</span>` : ""}
      ${b.ordenWebpay ? `<span><b>Orden Webpay:</b> ${esc(b.ordenWebpay)}</span>` : ""}</div>
      <div class="tabla-scroll"><table style="min-width:0"><thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>` +
      b.detalles.map((d) => `<tr><td>${esc(d.nombre)}</td><td>${d.cantidad}</td><td>${CLP(d.precioUnitario)}</td><td>${CLP(d.subtotal)}</td></tr>`).join("") +
      `</tbody></table></div><div class="resumen"><span>Subtotal: <b>${CLP(b.subtotal)}</b></span><span>Despacho: <b>${b.despacho ? CLP(b.despacho) : "Gratis"}</b></span><span class="total">Total: <b>${CLP(b.total)}</b></span></div>`);
  }

  /* ---------- Usuarios (solo ADMIN) ---------- */
  const ROLES = [["CLIENTE", "CLIENTE"], ["VENDEDOR", "VENDEDOR"], ["ADMIN", "ADMIN"]];
  async function pintarUsuarios() {
    const lista = await api("/usuarios", { auth: true });
    $("panel-contenido").innerHTML =
      `<div class="barra-panel"><span class="datos">${lista.length} usuarios</span><button class="btn" data-nuevo-usr>Nuevo usuario</button></div>
      <div class="tabla-scroll"><table><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th></th></tr></thead><tbody>` +
      lista.map((u) => `<tr><td>${esc(u.nombre)}</td><td>${esc(u.correo)}</td><td>${u.rol}</td>
        <td><span class="chip ${u.activo ? "ok" : "mal"}">${u.activo ? "Activo" : "Inactivo"}</span></td>
        <td><button data-edit-usr="${u.id}">Editar</button> <button data-del-usr="${u.id}">Eliminar</button></td></tr>`).join("") + "</tbody></table></div>";
    $("panel-contenido").onclick = (ev) => {
      const t = ev.target;
      if (t.dataset.nuevoUsr !== undefined) formUsuario(null);
      if (t.dataset.editUsr) formUsuario(lista.find((u) => u.id == t.dataset.editUsr));
      if (t.dataset.delUsr && confirm("¿Eliminar este usuario? Si tiene órdenes, se desactivará."))
        conErrores(async () => { await api("/usuarios/" + t.dataset.delUsr, { metodo: "DELETE", auth: true }); estado("Usuario eliminado."); await pintarUsuarios(); });
    };
  }
  function formUsuario(u) {
    abrir(u ? "Editar usuario" : "Nuevo usuario",
      campo("nombre", "Nombre", u ? u.nombre : "") + campo("correo", "Correo", u ? u.correo : "", "email") +
      campo("clave", u ? "Nueva contraseña (opcional)" : "Contraseña", "", "password", 'autocomplete="new-password"') +
      campo("fechaNacimiento", "Fecha de nacimiento", u && u.fechaNacimiento ? u.fechaNacimiento : "", "date") +
      selector("rol", "Rol", ROLES, u ? u.rol : "CLIENTE") +
      selector("activo", "Estado", [["true", "Activo"], ["false", "Inactivo"]], u ? String(u.activo) : "true"),
      async (fd) => {
        return conErrores(async () => {
          await api(u ? "/usuarios/" + u.id : "/usuarios", { metodo: u ? "PUT" : "POST", auth: true, cuerpo: {
            nombre: fd.get("nombre").trim(), correo: fd.get("correo").trim(), clave: fd.get("clave") || null,
            fechaNacimiento: fd.get("fechaNacimiento") || null, rol: fd.get("rol"), activo: fd.get("activo") === "true" } });
          estado("Usuario guardado."); await pintarUsuarios();
        });
      });
  }

  mostrar("productos");
})();
