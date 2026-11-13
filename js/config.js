const ENTORNO_LOCAL = ["localhost", "127.0.0.1"].includes(location.hostname);
// En un servidor (EC2): el sitio sale por el puerto 3000 y la API Spring está en el 8080 del mismo equipo.
const PRODUCCION_API_URL = location.protocol + "//" + location.hostname + ":8080/api/v1";
const PRODUCCION_API_BASE = "";

const API_URL = ENTORNO_LOCAL ? "http://localhost:8080/api/v1" : PRODUCCION_API_URL;
const API_BASE = ENTORNO_LOCAL ? (location.port === "3000" ? "" : "http://localhost:3000") : PRODUCCION_API_BASE;