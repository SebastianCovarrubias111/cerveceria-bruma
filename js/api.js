/* Cliente de la API Spring Boot + gestión de sesión (JWT).
 *
 * Sesión: se guarda en localStorage ("brumaSesion") con el access token, el refresh token y los datos del usuario.
 * Así sigue activa aunque se recargue la página o se cierre y abra el navegador.
 * - El access token (corto, 30 min) se envía en cada petición: Authorization: Bearer <token>.
 * - Si vence (o el servidor responde 401), se canjea el refresh token por uno nuevo de forma automática.
 * - Si el refresh token tampoco sirve, la sesión se borra y el usuario vuelve a iniciar sesión.
 * La verdadera seguridad la aplica el backend; lo que se oculta en pantalla es solo comodidad. */

const Sesion = {
  llave: "brumaSesion",
  leer() { try { return JSON.parse(localStorage.getItem(this.llave)); } catch { return null; } },
  guardar(auth) {
    const s = {
      id: auth.usuario.id, nombre: auth.usuario.nombre, correo: auth.usuario.correo, rol: auth.usuario.rol,
      accessToken: auth.accessToken, refreshToken: auth.refreshToken,
      expira: Date.now() + auth.expiraEnSegundos * 1000,
    };
    localStorage.setItem(this.llave, JSON.stringify(s));
    return s;
  },
  limpiar() { localStorage.removeItem(this.llave); localStorage.removeItem("brumaEdadVerificada"); },
  rol() { const s = this.leer(); return s ? s.rol : null; },
};

class ApiError extends Error {
  constructor(estado, mensaje, campos) { super(mensaje); this.estado = estado; this.campos = campos || null; }
}

let _renovando = null; // evita pedir varios refresh a la vez
function renovarSesion() {
  const s = Sesion.leer();
  if (!s || !s.refreshToken) return Promise.resolve(false);
  if (!_renovando) {
    _renovando = fetch(API_URL + "/auth/refresh", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: s.refreshToken }),
    })
      .then(async (r) => { if (!r.ok) return false; Sesion.guardar(await r.json()); return true; })
      .catch(() => false)
      .finally(() => { _renovando = null; });
  }
  return _renovando;
}

/** Llamada a la API. auth:true agrega el token y renueva la sesión si hace falta. Lanza ApiError si falla. */
async function api(ruta, { metodo = "GET", cuerpo, auth = false } = {}) {
  const enviar = () => {
    const h = { Accept: "application/json" };
    if (cuerpo !== undefined) h["Content-Type"] = "application/json";
    const s = Sesion.leer();
    if (auth && s) h.Authorization = "Bearer " + s.accessToken;
    return fetch(API_URL + ruta, { method: metodo, headers: h, body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined });
  };
  const sinConexion = () => new ApiError(0, "No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.");

  const s0 = Sesion.leer();
  if (auth && s0 && s0.expira - Date.now() < 30000) await renovarSesion(); // renueva antes de que venza

  let r;
  try { r = await enviar(); } catch { throw sinConexion(); }

  if (r.status === 401 && auth) {            // token vencido o inválido → un intento de renovación
    if (await renovarSesion()) { try { r = await enviar(); } catch { throw sinConexion(); } }
  }
  const datos = r.status === 204 ? null : await r.json().catch(() => null);
  if (!r.ok) {
    if (r.status === 401 && auth) Sesion.limpiar(); // la sesión ya no sirve
    throw new ApiError(r.status, (datos && datos.mensaje) || "Ocurrió un error inesperado.", datos && datos.campos);
  }
  return datos;
}

/** Cierra sesión: revoca el refresh token en el servidor y borra los datos locales. */
function cerrarSesion() {
  const s = Sesion.leer();
  if (s && s.refreshToken) {
    fetch(API_URL + "/auth/logout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: s.refreshToken }),
    }).catch(() => {});
  }
  Sesion.limpiar();
}

/** Al cargar una página con sesión guardada, confirma con el servidor que sigue vigente (GET /auth/me). */
async function verificarSesion() {
  if (!Sesion.leer()) return null;
  try {
    const u = await api("/auth/me", { auth: true });
    const s = Sesion.leer();
    if (s) { s.nombre = u.nombre; s.rol = u.rol; s.correo = u.correo; localStorage.setItem(Sesion.llave, JSON.stringify(s)); }
    return u;
  } catch (e) {
    if (e.estado === 401 || e.estado === 403) { Sesion.limpiar(); return null; }
    return Sesion.leer(); // servidor caído: no se cierra la sesión por un problema de red
  }
}

/** Redirección centralizada (reemplazar=true no deja la página actual en el historial). */
function irA(url, reemplazar) { if (reemplazar) location.replace(url); else location.href = url; }

/** Protege una página: sin sesión → login; con otro rol → destino. Devuelve true si puede quedarse. */
function exigirRol(roles, destino) {
  const s = Sesion.leer();
  if (!s) { irA("login.html", true); return false; }
  if (!roles.includes(s.rol)) { irA(destino || "index.html", true); return false; }
  return true;
}

/** Página de inicio según el rol. */
function paginaInicioPorRol(rol) { return rol === "ADMIN" || rol === "VENDEDOR" ? "panel.html" : "catalogo.html"; }
