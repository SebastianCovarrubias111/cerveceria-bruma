# Servidor de pagos Webpay Plus — Cervecería Bruma

Sirve el sitio y procesa los pagos con Webpay Plus (Transbank). Al aprobarse un pago, envía el
comprobante por correo al cliente y un aviso de pedido a la cervecería.

## Probar en tu computador
```bash
cd servidor
npm install
copy .env.example .env      # en Mac/Linux: cp .env.example .env
npm start                   # abre http://localhost:3000
```
Entra SIEMPRE por http://localhost:3000 (no con Live Server). Agrega cervezas al carrito →
Iniciar sesión → Finalizar compra → completa el despacho → **Pagar con Webpay**.

## Datos de prueba (ambiente de integración de Transbank; no se cobra dinero real)
- Crédito VISA aprobada: `4051 8856 0044 6623`, CVV `123`, cualquier fecha futura
- Débito Redcompra: `4051 8842 3993 7763`
- En la pantalla del banco: RUT `11.111.111-1`, clave `123`
- OJO: la Mastercard `5186 0595 5959 0568` es la tarjeta de prueba RECHAZADA.
Confírmalos en https://www.transbankdevelopers.cl/documentacion/como_empezar#ambientes por si cambian.

## Comprobante por correo
Rellena `SMTP_USER` y `SMTP_PASS` en `.env`. Con Gmail necesitas verificación en 2 pasos y una
"contraseña de aplicación" (https://myaccount.google.com/apppasswords). Sin esos datos el pago
funciona igual, pero no se envía el correo (queda un aviso en la consola).

## Publicar en AWS (EC2)
1. Instalar Node.js 18 o superior (recomendado 22) y pm2: `npm install -g pm2`.
2. Clonar el repo, `cd servidor`, `npm install`, crear el `.env`.
3. `pm2 start server.js --name bruma-pagos && pm2 save && pm2 startup`.
4. Abrir el puerto 3000 (o 80/443 con nginx) en el grupo de seguridad.
5. Usar una IP elástica. Para HTTPS (obligatorio al cobrar de verdad) hace falta un dominio.
Tras cambiar `server.js`, `.env` o `js/productos.js`: `pm2 restart bruma-pagos`
(el servidor lee el catálogo solo al iniciar).

## Pasar a producción
Transbank debe aprobar tu comercio. Luego: `TBK_AMBIENTE=produccion`, `TBK_COMMERCE_CODE=...`,
`TBK_API_KEY=...`. Nunca pongas la llave en archivos del sitio ni en git.

## Pendiente recomendado
Las órdenes se guardan en memoria (se pierden al reiniciar): usa una base de datos en producción.
