require("dotenv").config();
const express = require("express");
const path = require("path");
const { getStores, getAllReceipts } = require("./src/loyverseClient");
const { calcularKpis } = require("./src/kpis");

const app = express();
const PORT = process.env.PORT || 3000;

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
    const kpis = calcularKpis(receipts);
    res.json({ from, to, storeId: storeId || null, ...kpis });
  } catch (err) {
    handleError(res, err);
  }
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
