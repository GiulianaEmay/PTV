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
server.js              Servidor Express y endpoints /api/kpis y /api/stores
src/loyverseClient.js   Cliente que consulta la API de Loyverse (recibos, tiendas)
src/kpis.js             Calculo de los KPIs a partir de los recibos
public/                 Dashboard (HTML/CSS/JS con Chart.js)
```

## Notas

- El token de Loyverse nunca se sube al repositorio (esta en `.env`, ignorado por git).
- La API de Loyverse pagina los recibos de a 250; el cliente sigue el cursor automaticamente hasta un limite de seguridad de 40 paginas por consulta (10,000 recibos).
