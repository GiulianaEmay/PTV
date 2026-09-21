const { getAllReceipts } = require("./loyverseClient");
const { obtenerCatalogo } = require("./loyverseCatalog");
const { FILAS_INGRESOS } = require("./filasReporte");
const { OFFSET_PERU } = require("./zonaHoraria");

function esPagoEfectivo(payment) {
  const tipo = (payment.type || "").toUpperCase();
  const nombre = (payment.name || "").toLowerCase();
  return tipo === "CASH" || nombre.includes("efectivo") || nombre.includes("cash");
}

function construirIndiceCategoriaFila(mapeoCategorias) {
  const indice = new Map();
  for (const fila of FILAS_INGRESOS) {
    for (const categoria of mapeoCategorias[fila] || []) {
      indice.set(categoria, fila);
    }
  }
  return indice;
}

/**
 * Calcula, para un turno/tienda/fecha, cuanto se vendio en efectivo por cada fila
 * del reporte de caja, usando la categoria de producto asignada en Loyverse.
 * Los pagos con metodo distinto a efectivo (tarjeta, etc.) no se cuentan.
 * Si un recibo tuvo pago mixto, se prorratea el efectivo entre sus lineas.
 */
async function autocompletarIngresos({ empresaId, token, fecha, storeId, ventanaTurno, mapeoCategorias }) {
  const inicio = new Date(`${fecha}T${ventanaTurno.inicio}:00${OFFSET_PERU}`);
  const fin = new Date(`${fecha}T${ventanaTurno.fin}:00${OFFSET_PERU}`);

  const [receipts, catalogo] = await Promise.all([
    getAllReceipts(token, { createdAtMin: inicio.toISOString(), createdAtMax: fin.toISOString(), storeId }),
    obtenerCatalogo(empresaId, token),
  ]);

  const indiceCategoriaFila = construirIndiceCategoriaFila(mapeoCategorias);
  const totalPorFila = Object.fromEntries(FILAS_INGRESOS.map((f) => [f, 0]));
  let sinMapear = 0;

  for (const receipt of receipts) {
    if (receipt.cancelled_at || receipt.receipt_type === "REFUND") continue;

    const totalEfectivo = (receipt.payments || [])
      .filter(esPagoEfectivo)
      .reduce((acc, p) => acc + (p.money_amount || 0), 0);
    if (totalEfectivo <= 0) continue;

    const proporcion = Math.min(1, totalEfectivo / (receipt.total_money || totalEfectivo));

    for (const li of receipt.line_items || []) {
      const categoria = catalogo.itemCategoria.get(li.item_id) || null;
      const fila = categoria ? indiceCategoriaFila.get(categoria) : null;
      const montoLinea = (li.total_money ?? li.gross_total_money ?? 0) * proporcion;

      if (fila) {
        totalPorFila[fila] += montoLinea;
      } else {
        sinMapear += montoLinea;
      }
    }
  }

  return { totalPorFila, sinMapear };
}

module.exports = { autocompletarIngresos };
