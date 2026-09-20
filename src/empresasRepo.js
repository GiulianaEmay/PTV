const db = require("./db");

function filaAEmpresa(fila) {
  if (!fila) return null;
  return {
    id: fila.id,
    nombre: fila.nombre,
    loyverseToken: fila.loyverse_token,
    turnos: JSON.parse(fila.turnos),
    mapeoCategorias: JSON.parse(fila.mapeo_categorias),
    categoriasExcluidasKpi: JSON.parse(fila.categorias_excluidas_kpi),
    creadoEn: fila.creado_en,
  };
}

function listarEmpresas() {
  const filas = db.prepare("SELECT * FROM empresas ORDER BY nombre").all();
  return filas.map(filaAEmpresa);
}

function obtenerEmpresa(id) {
  const fila = db.prepare("SELECT * FROM empresas WHERE id = ?").get(id);
  return filaAEmpresa(fila);
}

function crearEmpresa({ nombre, loyverseToken }) {
  const resultado = db
    .prepare("INSERT INTO empresas (nombre, loyverse_token) VALUES (?, ?)")
    .run(nombre, loyverseToken || null);
  return obtenerEmpresa(Number(resultado.lastInsertRowid));
}

function actualizarLoyverseToken(id, loyverseToken) {
  db.prepare("UPDATE empresas SET loyverse_token = ? WHERE id = ?").run(loyverseToken || null, id);
}

function actualizarEmpresa(id, { nombre, loyverseToken }) {
  if (nombre !== undefined) {
    db.prepare("UPDATE empresas SET nombre = ? WHERE id = ?").run(nombre, id);
  }
  if (loyverseToken !== undefined) {
    actualizarLoyverseToken(id, loyverseToken);
  }
  return obtenerEmpresa(id);
}

function actualizarTurnos(id, turnos) {
  db.prepare("UPDATE empresas SET turnos = ? WHERE id = ?").run(JSON.stringify(turnos || {}), id);
}

function actualizarMapeoCategorias(id, mapeo) {
  db.prepare("UPDATE empresas SET mapeo_categorias = ? WHERE id = ?").run(JSON.stringify(mapeo || {}), id);
}

function actualizarCategoriasExcluidas(id, categorias) {
  db.prepare("UPDATE empresas SET categorias_excluidas_kpi = ? WHERE id = ?").run(
    JSON.stringify(Array.isArray(categorias) ? categorias : []),
    id
  );
}

module.exports = {
  listarEmpresas,
  obtenerEmpresa,
  crearEmpresa,
  actualizarLoyverseToken,
  actualizarEmpresa,
  actualizarTurnos,
  actualizarMapeoCategorias,
  actualizarCategoriasExcluidas,
};
