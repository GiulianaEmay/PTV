# Emay Tech (PTV)

Plataforma multi-cliente de **Emay Tech** para interpretar las ventas de negocios que usan **Loyverse POS**, mostrando los KPIs mas importantes y digitalizando el cuadre de caja, sin tener que revisar los reportes complejos de Loyverse.

Emay Tech administra la cuenta de Loyverse de cada cliente y les entrega un usuario propio para entrar a ver solo sus datos (multi-tenant): cada empresa (ej. Panaderia La Flor) tiene su token de Loyverse, su configuracion y su historial de cuadres de caja completamente separados de los demas clientes.

> **Licencia:** este proyecto usa Business Source License 1.1 (ver [LICENSE](LICENSE)): puedes verlo, auto-hospedarlo y usarlo para tu propio negocio, pero no revenderlo como servicio SaaS competidor. **Antes de publicar el repo, reemplaza el marcador `[NOMBRE COMPLETO / RAZON SOCIAL DEL TITULAR]` en `LICENSE` con la razon social real de Emay Tech.**

## KPIs incluidos

- Ventas totales y ventas netas (descontando reembolsos)
- Numero de tickets y ticket promedio
- Descuentos y propinas otorgadas
- Ventas por dia de la semana
- Ventas por hora del dia (para identificar horas pico)
- Ventas por metodo de pago
- Top 10 productos mas vendidos (por unidades e ingreso)

## Cuadre de Caja

Digitaliza el "Reporte de Caja" que se llena a mano en tienda por turno (AM/MT/PM):

- **Ingresos** (efectivo por categoria de producto): se autocompletan trayendo de Loyverse las ventas pagadas en efectivo de ese turno, agrupadas por la categoria de cada producto. Se pueden corregir a mano si hace falta.
- **Egresos** (pagos hechos con la caja chica) y **Sobrante de pan**: se ingresan manualmente porque Loyverse no los registra.
- **Resumen** (Ingreso, Egreso, Efectivo esperado): se calcula solo.
- Cada cuadre guardado queda en el historial, filtrable por fecha y sucursal.

Antes de usarlo la primera vez (esto lo hace Emay Tech, no el cliente), entra al **Panel de Administracion** y define para la empresa:

1. **Token de Loyverse** (se pega en `admin.html`, nunca lo ve el cliente final).
2. **Horario de turnos**: el rango horario real de AM y PM en esa tienda (pestaña Configuracion, dentro del dashboard de esa empresa).
3. **Mapeo de categorias**: que categoria(s) de Loyverse corresponde a cada fila del reporte (ej. "Pasteles" en el reporte puede mapear a la categoria "Pasteleria" de Loyverse).

## Modelo multi-cliente (quien hace que)

- **Emay Tech (admin)**: crea cada empresa cliente, le pega su token de Loyverse, y le crea un usuario (correo + contrasena) para que entre a ver solo su propio dashboard. Todo esto desde `admin.html`.
- **Cliente (ej. Panaderia La Flor)**: recibe su correo y contrasena de Emay Tech, entra a `login.html`, y ve unicamente sus propios KPIs y Cuadre de Caja. Nunca ve el token de Loyverse ni los datos de otros clientes.

Los datos de cada empresa (token, configuracion, cuadres de caja) quedan completamente aislados entre si en la base de datos.

## Requisitos

- Node.js 22.5 o superior (usa el modulo nativo `node:sqlite`)

## Instalacion

```bash
npm install
cp .env.example .env
```

Edita `.env`: define `SESSION_SECRET` (cualquier texto largo y aleatorio) y `ADMIN_EMAIL`/`ADMIN_PASSWORD` para el primer usuario administrador (Emay Tech). Esas dos ultimas solo se usan una vez, al primer arranque, para crear la cuenta admin.

## Uso

```bash
npm start
```

1. Entra a `http://localhost:3000/login.html` con el `ADMIN_EMAIL`/`ADMIN_PASSWORD` que pusiste en `.env`.
2. En el Panel de Administracion, crea la primera empresa cliente con su token de Loyverse, y crea su usuario.
3. Comparte ese correo/contrasena con el cliente para que entre a ver su dashboard.

## Estructura del proyecto

```
server.js                Servidor Express: auth, rutas de admin y rutas operativas (KPIs, Cuadre de Caja, Configuracion)
src/db.js                 Base de datos SQLite (node:sqlite) en data/cuadrefacil.db
src/empresasRepo.js       CRUD de empresas clientes (token de Loyverse, turnos, mapeo de categorias)
src/usuariosRepo.js       CRUD de usuarios y verificacion de contrasena (bcrypt)
src/cuadresRepo.js        Guardado e historial de Cuadre de Caja, por empresa
src/auth.js               Middlewares de sesion (requireAuth, requireAdmin, empresa activa)
src/bootstrapAdmin.js      Crea el primer usuario admin desde ADMIN_EMAIL/ADMIN_PASSWORD
src/loyverseClient.js      Cliente que consulta la API de Loyverse (recibos, tiendas, categorias, items) con el token de cada empresa
src/kpis.js                Calculo de los KPIs de ventas a partir de los recibos
src/loyverseCatalog.js     Cache de categorias/items de Loyverse por empresa
src/cuadreCaja.js          Calculo de ventas en efectivo por categoria para el Cuadre de Caja
src/filasReporte.js        Filas del reporte de caja en papel
public/                    Dashboard (HTML/CSS/JS con Chart.js): login, admin, y pestanas KPIs / Cuadre de Caja / Configuracion
```

## Notas

- Ningun token de Loyverse ni contrasena se sube al repositorio: viven en la base de datos local `data/cuadrefacil.db` (ignorada por git).
- Las contrasenas se guardan con hash (bcrypt), nunca en texto plano.
- La API de Loyverse pagina los recibos de a 250; el cliente sigue el cursor automaticamente hasta un limite de seguridad de 40 paginas por consulta (10,000 recibos).
- Las sesiones de login se guardan en memoria (`express-session` MemoryStore): si el servidor se reinicia, todos deben volver a iniciar sesion. Para producción con varios usuarios simultáneos conviene migrar a un store persistente (ej. `connect-sqlite3`).
