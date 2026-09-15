# Loyverse KPI Dashboard

Dashboard simple para interpretar las ventas de una cafeteria que usa **Loyverse POS**, mostrando los KPIs mas importantes sin tener que revisar los reportes complejos de Loyverse.

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

Antes de usarlo la primera vez, entra a la pestaña **Configuracion** y define:

1. **Horario de turnos**: el rango horario real de AM, MT y PM en tu tienda.
2. **Mapeo de categorias**: que categoria(s) de Loyverse corresponde a cada fila del reporte (ej. "Pasteles" en el reporte puede mapear a la categoria "Pasteleria" de Loyverse). Las categorias se crean y administran en Loyverse; aqui solo se asignan a las filas del reporte.

Los cuadres guardados se almacenan localmente en `data/db.json` (no se sube al repositorio).

## Requisitos

- Node.js 18 o superior
- Un access token de la API de Loyverse (ver abajo)

## Como obtener el token de acceso de Loyverse

1. Entra al **Back Office de Loyverse** (https://r.loyverse.com).
2. Ve a **Configuracion (Settings) > Integraciones > API access token** (disponible en planes que incluyen acceso a la API).
3. Genera un nuevo token y copialo.

## Instalacion

```bash
npm install
cp .env.example .env
```

Edita `.env` y pega tu token:

```
LOYVERSE_ACCESS_TOKEN=tu_token_aqui
PORT=3000
```

## Uso

```bash
npm start
```

Abre `http://localhost:3000` en el navegador. Selecciona el rango de fechas (o usa los accesos rapidos: Hoy, Ayer, Ultimos 7 dias, Este mes) y la tienda si tienes mas de una.

## Estructura del proyecto

```
server.js               Servidor Express y endpoints de la API
src/loyverseClient.js    Cliente que consulta la API de Loyverse (recibos, tiendas, categorias, items)
src/kpis.js              Calculo de los KPIs de ventas a partir de los recibos
src/loyverseCatalog.js   Cache de categorias/items de Loyverse (para saber la categoria de cada producto)
src/cuadreCaja.js        Calculo de ventas en efectivo por categoria para el Cuadre de Caja
src/filasReporte.js      Filas del reporte de caja en papel
src/store.js             Persistencia simple en data/db.json (config y cuadres guardados)
public/                  Dashboard (HTML/CSS/JS con Chart.js): pestanas KPIs, Cuadre de Caja y Configuracion
```

## Notas

- El token de Loyverse nunca se sube al repositorio (esta en `.env`, ignorado por git).
- La API de Loyverse pagina los recibos de a 250; el cliente sigue el cursor automaticamente hasta un limite de seguridad de 40 paginas por consulta (10,000 recibos).
