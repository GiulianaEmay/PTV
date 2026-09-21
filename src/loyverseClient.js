const axios = require("axios");

const BASE_URL = "https://api.loyverse.com/v1.0";

function client(token) {
  if (!token) {
    throw new Error("Esta empresa no tiene un token de Loyverse configurado todavia.");
  }
  return axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${token}` },
    timeout: 20000,
  });
}

async function requestWithRetry(fn, retries = 3) {
  try {
    return await fn();
  } catch (err) {
    const status = err.response?.status;
    if (status === 429 && retries > 0) {
      const waitMs = 1500;
      await new Promise((r) => setTimeout(r, waitMs));
      return requestWithRetry(fn, retries - 1);
    }
    throw err;
  }
}

async function getStores(token) {
  const http = client(token);
  const res = await requestWithRetry(() => http.get("/stores"));
  return res.data.stores || [];
}

async function getPaymentTypes(token) {
  const http = client(token);
  const res = await requestWithRetry(() => http.get("/payment_types"));
  return res.data.payment_types || [];
}

async function getCategories(token) {
  const http = client(token);
  let cursor;
  const categorias = [];
  do {
    const params = { limit: 250 };
    if (cursor) params.cursor = cursor;
    const res = await requestWithRetry(() => http.get("/categories", { params }));
    categorias.push(...(res.data.categories || []));
    cursor = res.data.cursor;
  } while (cursor);
  return categorias;
}

async function getEmployees(token) {
  const http = client(token);
  let cursor;
  const empleados = [];
  do {
    const params = { limit: 250 };
    if (cursor) params.cursor = cursor;
    const res = await requestWithRetry(() => http.get("/employees", { params }));
    empleados.push(...(res.data.employees || []));
    cursor = res.data.cursor;
  } while (cursor);
  return empleados;
}

async function getAllItems(token) {
  const http = client(token);
  let cursor;
  const items = [];
  do {
    const params = { limit: 250 };
    if (cursor) params.cursor = cursor;
    const res = await requestWithRetry(() => http.get("/items", { params }));
    items.push(...(res.data.items || []));
    cursor = res.data.cursor;
  } while (cursor);
  return items;
}

/**
 * Trae todos los recibos del rango de fechas, siguiendo el cursor de paginacion.
 * Loyverse limita a 250 recibos por pagina.
 */
async function getAllReceipts(token, { createdAtMin, createdAtMax, storeId, maxPages = 40 }) {
  const http = client(token);
  let cursor = undefined;
  let page = 0;
  const receipts = [];

  do {
    const params = {
      created_at_min: createdAtMin,
      created_at_max: createdAtMax,
      limit: 250,
    };
    if (storeId) params.store_id = storeId;
    if (cursor) params.cursor = cursor;

    const res = await requestWithRetry(() => http.get("/receipts", { params }));
    const data = res.data;
    receipts.push(...(data.receipts || []));
    cursor = data.cursor;
    page += 1;
  } while (cursor && page < maxPages);

  return receipts;
}

module.exports = { getStores, getPaymentTypes, getCategories, getAllItems, getEmployees, getAllReceipts };
