const { aInstantePeru } = require("./zonaHoraria");

const DIAS = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const REGEX_PAN = /\bpan\b/i;

function isVentaValida(receipt) {
  // Se excluyen recibos cancelados; los reembolsos se contabilizan aparte
  return !receipt.cancelled_at;
}

function calcularKpis(receipts, opciones = {}) {
  const { itemCategoria = new Map(), nombreEmpleado = new Map(), categoriasExcluidas = [], excluirPan = false } = opciones;
  const ventas = receipts.filter((r) => isVentaValida(r) && r.receipt_type !== "REFUND");
  const reembolsos = receipts.filter((r) => isVentaValida(r) && r.receipt_type === "REFUND");

  const totalVentas = sum(ventas, (r) => r.total_money);
  const totalReembolsos = sum(reembolsos, (r) => Math.abs(r.total_money));
  const totalDescuentos = sum(ventas, (r) => r.total_discount);
  const totalPropinas = sum(ventas, (r) => r.tip);
  const totalImpuestos = sum(ventas, (r) => r.total_tax);
  const numeroTickets = ventas.length;
  const ticketPromedio = numeroTickets > 0 ? totalVentas / numeroTickets : 0;
  const ventasNetas = totalVentas - totalReembolsos;

  const ventasPorMetodoPago = agrupar(
    ventas.flatMap((r) => r.payments || []),
    (p) => p.name || "Desconocido",
    (p) => p.money_amount
  );

  const empleadosMap = new Map();
  for (const r of ventas) {
    const nombre = nombreEmpleado.get(r.employee_id) || "Sin asignar";
    const actual = empleadosMap.get(nombre) || { nombre, total: 0, tickets: 0 };
    actual.total += r.total_money || 0;
    actual.tickets += 1;
    empleadosMap.set(nombre, actual);
  }
  const ventasPorEmpleado = [...empleadosMap.values()].sort((a, b) => b.total - a.total);

  const ventasPorHora = new Array(24).fill(0);
  const ventasPorDiaSemana = new Array(7).fill(0);
  for (const r of ventas) {
    const fecha = new Date(r.receipt_date);
    if (!isNaN(fecha)) {
      const fechaPeru = aInstantePeru(fecha);
      ventasPorHora[fechaPeru.getUTCHours()] += r.total_money || 0;
      ventasPorDiaSemana[fechaPeru.getUTCDay()] += r.total_money || 0;
    }
  }

  const productosMap = new Map();
  for (const r of ventas) {
    for (const li of r.line_items || []) {
      const key = li.item_name || "Sin nombre";
      const actual = productosMap.get(key) || { nombre: key, cantidad: 0, total: 0 };
      actual.cantidad += li.quantity || 0;
      actual.total += li.total_money ?? li.gross_total_money ?? 0;
      productosMap.set(key, actual);
    }
  }
  let productos = [...productosMap.values()];
  if (excluirPan) productos = productos.filter((p) => !REGEX_PAN.test(p.nombre));

  const totalUnidadesVendidas = sum(productos, (p) => p.cantidad);
  const productosMasVendidos = [...productos].sort((a, b) => b.cantidad - a.cantidad).slice(0, 10);
  const productosPorIngreso = [...productos].sort((a, b) => b.total - a.total).slice(0, 10);

  const excluidas = new Set(categoriasExcluidas.map((c) => c.toLowerCase()));
  const categoriasMap = new Map();
  for (const r of ventas) {
    for (const li of r.line_items || []) {
      const categoria = itemCategoria.get(li.item_id) || "Sin categoria";
      if (excluidas.has(categoria.toLowerCase())) continue;
      if (excluirPan && REGEX_PAN.test(categoria)) continue;
      const actual = categoriasMap.get(categoria) || { nombre: categoria, cantidad: 0, total: 0 };
      actual.cantidad += li.quantity || 0;
      actual.total += li.total_money ?? li.gross_total_money ?? 0;
      categoriasMap.set(categoria, actual);
    }
  }
  const ventasPorCategoria = [...categoriasMap.values()].sort((a, b) => b.total - a.total);
  const categoriaMasVendida = ventasPorCategoria[0] || null;

  return {
    totalVentas,
    ventasNetas,
    totalReembolsos,
    totalDescuentos,
    totalPropinas,
    totalImpuestos,
    numeroTickets,
    ticketPromedio,
    ventasPorMetodoPago,
    ventasPorEmpleado,
    ventasPorHora,
    ventasPorDiaSemana: ventasPorDiaSemana.map((total, i) => ({ dia: DIAS[i], total })),
    totalUnidadesVendidas,
    productosMasVendidos,
    productosPorIngreso,
    ventasPorCategoria,
    categoriaMasVendida,
  };
}

function sum(arr, fn) {
  return arr.reduce((acc, item) => acc + (fn(item) || 0), 0);
}

function agrupar(arr, keyFn, valueFn) {
  const map = new Map();
  for (const item of arr) {
    const key = keyFn(item);
    map.set(key, (map.get(key) || 0) + (valueFn(item) || 0));
  }
  return [...map.entries()].map(([nombre, total]) => ({ nombre, total }));
}

module.exports = { calcularKpis };
