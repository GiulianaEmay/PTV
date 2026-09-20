const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const fs = require("fs");

const DB_PATH = path.join(__dirname, "..", "data", "cuadrefacil.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS empresas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    loyverse_token TEXT,
    turnos TEXT NOT NULL DEFAULT '{"AM":{"inicio":"05:00","fin":"14:30"},"PM":{"inicio":"14:31","fin":"23:59"}}',
    mapeo_categorias TEXT NOT NULL DEFAULT '{}',
    categorias_excluidas_kpi TEXT NOT NULL DEFAULT '[]',
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER REFERENCES empresas(id),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('admin','cliente')),
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cuadres (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id),
    fecha TEXT NOT NULL,
    store_id TEXT,
    sucursal TEXT,
    turno TEXT NOT NULL,
    ingresos TEXT NOT NULL,
    egresos TEXT NOT NULL,
    sobrante_pan TEXT NOT NULL,
    cajera TEXT,
    vendedoras TEXT,
    vb_adm TEXT,
    bolsas_quedan TEXT,
    total_ingreso REAL NOT NULL,
    total_egreso REAL NOT NULL,
    efectivo REAL NOT NULL,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = db;
