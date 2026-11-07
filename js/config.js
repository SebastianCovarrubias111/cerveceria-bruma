/* Direcciones de los servidores.
 *
 * API_URL  → backend Spring Boot (catálogo, login, órdenes, panel). Termina en /api/v1.
 * API_BASE → servidor de pagos Webpay (carpeta /servidor, Node). Déjalo "" si el sitio lo sirve ese mismo servidor.
 *
 * En tu computador se detectan solos. Al publicar, reemplaza las URL de PRODUCCION. */
const ENTORNO_LOCAL = ["localhost", "127.0.0.1"].includes(location.hostname);
const PRODUCCION_API_URL = "https://TU-BACKEND.example.com/api/v1";   // ← URL pública de tu backend Spring
const PRODUCCION_API_BASE = "https://TU-SERVIDOR-DE-PAGOS.example.com"; // ← URL pública del servidor Webpay

const API_URL = ENTORNO_LOCAL ? "http://localhost:8080/api/v1" : PRODUCCION_API_URL;
const API_BASE = ENTORNO_LOCAL ? (location.port === "3000" ? "" : "http://localhost:3000") : PRODUCCION_API_BASE;
