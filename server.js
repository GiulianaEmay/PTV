require("dotenv").config();
const express = require("express");
const path = require("path");
const { getStores, getAllReceipts } = require("./src/loyverseClient");
const { calcularKpis } = require("./src/kpis");
const { obtenerCatalogo } = require("./src/loyverseCatalog");
const { autocompletarIngresos } = require("./src/cuadreCaja");
const { FILAS_INGRESOS } = require("./src/filasReporte");
const store = require("./src/store");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/stores", async (req, res) => {
  try {
    const stores = await getStores();
    res.json(stores);
  } catch (err) {
    handleError(res, err);
  }
});

app.get("/api/kpis", async (req, res) => {
  try {
    const { from, to, storeId } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: "Los parametros 'from' y 'to' son obligatorios (YYYY-MM-DD)" });
    }

    const createdAtMin = new Date(`${from}T00:00:00Z`).toISOString();
    const createdAtMax = new Date(`${to}T23:59:59Z`).toISOString();

    const receipts = await getAllReceipts({ createdAtMin, createdAtMax, storeId });
    const { itemCategoria } = await obtenerCatalogo();
    const categoriasExcluidas = store.leerDB().categoriasExcluidasKpi;
    const kpis = calcularKpis(receipts, { itemCategoria, categoriasExcluidas });
    res.json({ from, to, storeId: storeId || null, ...kpis });
  } catch (err) {
    handleError(res, err);
  }
});

// --- Cuadre de caja (digitalizacion del reporte de caja en papel) ---

app.get("/api/filas-ingresos", (req, res) => {
  res.json(FILAS_INGRESOS);
});

app.get("/api/categorias-loyverse", async (req, res) => {
  try {
    const { categorias } = await obtenerCatalogo();
    res.json(categorias);
  } catch (err) {
    handleError(res, err);
  }
});

app.get("/api/config/mapeo-categorias", (req, res) => {
  res.json(store.leerDB().mapeoCategorias);
});

app.post("/api/config/mapeo-categorias", (req, res) => {
  const db = store.leerDB();
  db.mapeoCategorias = req.body || {};
  store.guardarDB(db);
  res.json({ ok: true });
});

app.get("/api/config/categorias-excluidas-kpi", (req, res) => {
  res.json(store.leerDB().categoriasExcluidasKpi);
});

app.post("/api/config/categorias-excluidas-kpi", (req, res) => {
  const db = store.leerDB();
  db.categoriasExcluidasKpi = Array.isArray(req.body) ? req.body : [];
  store.guardarDB(db);
  res.json({ ok: true });
});

app.get("/api/config/turnos", (req, res) => {
  res.json(store.leerDB().turnos);
});

app.post("/api/config/turnos", (req, res) => {
  const db = store.leerDB();
  db.turnos = req.body || {};
  store.guardarDB(db);
  res.json({ ok: true });
});

app.get("/api/cuadre-caja/autocompletar", async (req, res) => {
  try {
    const { fecha, storeId, turno } = req.query;
    if (!fecha || !storeId || !turno) {
      return res.status(400).json({ error: "fecha, storeId y turno son obligatorios" });
    }
    const db = store.leerDB();
    const ventanaTurno = db.turnos[turno];
    if (!ventanaTurno) {
      return res.status(400).json({ error: `El turno '${turno}' no esta configurado` });
    }
    const resultado = await autocompletarIngresos({
      fecha,
      storeId,
      ventanaTurno,
      mapeoCategorias: db.mapeoCategorias,
    });
    res.json(resultado);
  } catch (err) {
    handleError(res, err);
  }
});

app.get("/api/cuadre-caja", (req, res) => {
  const { from, to, storeId } = req.query;
  let cuadres = store.leerDB().cuadres;
  if (from) cuadres = cuadres.filter((c) => c.fecha >= from);
  if (to) cuadres = cuadres.filter((c) => c.fecha <= to);
  if (storeId) cuadres = cuadres.filter((c) => c.storeId === storeId);
  res.json(cuadres.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)));
});

app.post("/api/cuadre-caja", (req, res) => {
  const body = req.body || {};
  const totalIngreso = Object.values(body.ingresos || {}).reduce((a, b) => a + (Number(b) || 0), 0);
  const totalEgreso = (body.egresos || []).reduce((a, e) => a + (Number(e.monto) || 0), 0);

  const registro = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    creadoEn: new Date().toISOString(),
    fecha: body.fecha,
    storeId: body.storeId,
    sucursal: body.sucursal || "",
    turno: body.turno,
    ingresos: body.ingresos || {},
    egresos: body.egresos || [],
    sobrantePan: body.sobrantePan || {},
    cajera: body.cajera || "",
    vendedoras: body.vendedoras || "",
    vbAdm: body.vbAdm || "",
    bolsasQuedan: body.bolsasQuedan || "",
    totalIngreso,
    totalEgreso,
    efectivo: totalIngreso - totalEgreso,
  };

  const db = store.leerDB();
  db.cuadres.push(registro);
  store.guardarDB(db);
  res.status(201).json(registro);
});

function handleError(res, err) {
  const status = err.response?.status || 500;
  const message = err.response?.data?.errors?.[0]?.message || err.message || "Error inesperado";
  console.error("Error:", message);
  res.status(status).json({ error: message });
}

app.listen(PORT, () => {
  console.log(`Dashboard de KPIs corriendo en http://localhost:${PORT}`);
});
