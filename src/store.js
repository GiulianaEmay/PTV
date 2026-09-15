const fs = require("fs");
const path = require("path");
const { FILAS_INGRESOS } = require("./filasReporte");

const DB_PATH = path.join(__dirname, "..", "data", "db.json");

function dbPorDefecto() {
  return {
    mapeoCategorias: Object.fromEntries(FILAS_INGRESOS.map((f) => [f, []])),
    turnos: {
      AM: { inicio: "05:00", fin: "14:30" },
      PM: { inicio: "14:31", fin: "23:59" },
    },
    cuadres: [],
  };
}

function leerDB() {
  if (!fs.existsSync(DB_PATH)) return dbPorDefecto();
  try {
    const contenido = fs.readFileSync(DB_PATH, "utf-8");
    const data = JSON.parse(contenido);
    return { ...dbPorDefecto(), ...data };
  } catch {
    return dbPorDefecto();
  }
}

function guardarDB(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

module.exports = { leerDB, guardarDB };
