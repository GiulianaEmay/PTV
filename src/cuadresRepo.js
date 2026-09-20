const db = require("./db");

function filaACuadre(fila) {
  if (!fila) return null;
  return {
    id: fila.id,
    empresaId: fila.empresa_id,
    fecha: fila.fecha,
    storeId: fila.store_id,
    sucursal: fila.sucursal,
    turno: fila.turno,
    ingresos: JSON.parse(fila.ingresos),
    egresos: JSON.parse(fila.egresos),
    sobrantePan: JSON.parse(fila.sobrante_pan),
    cajera: fila.cajera,
    vendedoras: fila.vendedoras,
    vbAdm: fila.vb_adm,
    bolsasQuedan: fila.bolsas_quedan,
    totalIngreso: fila.total_ingreso,
    totalEgreso: fila.total_egreso,
    efectivo: fila.efectivo,
    creadoEn: fila.creado_en,
  };
}

function guardarCuadre(empresaId, datos) {
  const totalIngreso = Object.values(datos.ingresos || {}).reduce((a, b) => a + (Number(b) || 0), 0);
  const totalEgreso = (datos.egresos || []).reduce((a, e) => a + (Number(e.monto) || 0), 0);

  const resultado = db
    .prepare(
      `INSERT INTO cuadres
        (empresa_id, fecha, store_id, sucursal, turno, ingresos, egresos, sobrante_pan, cajera, vendedoras, vb_adm, bolsas_quedan, total_ingreso, total_egreso, efectivo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      empresaId,
      datos.fecha,
      datos.storeId || null,
      datos.sucursal || "",
      datos.turno,
      JSON.stringify(datos.ingresos || {}),
      JSON.stringify(datos.egresos || []),
      JSON.stringify(datos.sobrantePan || {}),
      datos.cajera || "",
      datos.vendedoras || "",
      datos.vbAdm || "",
      String(datos.bolsasQuedan ?? ""),
      totalIngreso,
      totalEgreso,
      totalIngreso - totalEgreso
    );

  const fila = db.prepare("SELECT * FROM cuadres WHERE id = ?").get(Number(resultado.lastInsertRowid));
  return filaACuadre(fila);
}

function listarCuadres({ empresaId, from, to, storeId }) {
  let sql = "SELECT * FROM cuadres WHERE empresa_id = ?";
  const params = [empresaId];
  if (from) {
    sql += " AND fecha >= ?";
    params.push(from);
  }
  if (to) {
    sql += " AND fecha <= ?";
    params.push(to);
  }
  if (storeId) {
    sql += " AND store_id = ?";
    params.push(storeId);
  }
  sql += " ORDER BY creado_en DESC";
  return db.prepare(sql).all(...params).map(filaACuadre);
}

module.exports = { guardarCuadre, listarCuadres };
