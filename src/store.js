const fs = require("fs");
const path = require("path");
const { FILAS_INGRESOS } = require("./filasReporte");

const DB_PATH = path.join(__dirname, "..", "data", "db.json");

function dbPorDefecto() {
  return {
    mapeoCategorias: Object.fromEntries(FILAS_INGRESOS.map((f) => [f, []])),
    turnos: {
      AM: { inicio: "06:00", fin: "12:00" },
      MT: { inicio: "12:00", fin: "18:00" },
      PM: { inicio: "18:00", fin: "22:00" },
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
