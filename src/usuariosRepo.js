const bcrypt = require("bcryptjs");
const db = require("./db");

function filaAUsuario(fila) {
  if (!fila) return null;
  return {
    id: fila.id,
    empresaId: fila.empresa_id,
    email: fila.email,
    rol: fila.rol,
    creadoEn: fila.creado_en,
  };
}

function buscarPorEmail(email) {
  return db.prepare("SELECT * FROM usuarios WHERE email = ?").get((email || "").toLowerCase());
}

function crearUsuario({ empresaId, email, password, rol }) {
  const passwordHash = bcrypt.hashSync(password, 10);
  const resultado = db
    .prepare("INSERT INTO usuarios (empresa_id, email, password_hash, rol) VALUES (?, ?, ?, ?)")
    .run(empresaId ?? null, (email || "").toLowerCase(), passwordHash, rol);
  const fila = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(Number(resultado.lastInsertRowid));
  return filaAUsuario(fila);
}

function verificarPassword(password, passwordHash) {
  return bcrypt.compareSync(password, passwordHash);
}

function listarPorEmpresa(empresaId) {
  const filas = db.prepare("SELECT * FROM usuarios WHERE empresa_id = ? ORDER BY email").all(empresaId);
  return filas.map(filaAUsuario);
}

module.exports = { buscarPorEmail, crearUsuario, verificarPassword, listarPorEmpresa, filaAUsuario };
