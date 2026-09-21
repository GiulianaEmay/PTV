const fromInput = document.getElementById("from");
const toInput = document.getElementById("to");
const storeSelect = document.getElementById("storeId");
const excluirPanInput = document.getElementById("excluirPan");
const mensajeError = document.getElementById("mensajeError");
const cargando = document.getElementById("cargando");

const charts = {};

const PALETA = ["#533afd", "#ea2261", "#665efd", "#f96bee", "#a3620a", "#273951"];

Chart.defaults.color = "#64748d";
Chart.defaults.borderColor = "#e3e8ee";
Chart.defaults.font.family = "'Inter', 'Segoe UI', Arial, sans-serif";
Chart.defaults.font.size = 12;

function formatoMoneda(valor) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(valor || 0);
}

function fechaISO(date) {
  const anio = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function setRango(rango) {
  const hoy = new Date();
  let from = new Date(hoy);
  let to = new Date(hoy);

  if (rango === "ayer") {
    from.setDate(from.getDate() - 1);
    to.setDate(to.getDate() - 1);
  } else if (rango === "semana") {
    from.setDate(from.getDate() - 6);
  } else if (rango === "mes") {
    from = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  }

  fromInput.value = fechaISO(from);
  toInput.value = fechaISO(to);
  cargarKpis();
}

async function cargarTiendas() {
  try {
    const res = await fetch("/api/stores");
    const stores = await res.json();
    if (!res.ok) throw new Error(stores.error || "No se pudieron cargar las tiendas");
    for (const store of stores) {
      const opt = document.createElement("option");
      opt.value = store.id;
      opt.textContent = store.name;
      storeSelect.appendChild(opt);
    }
  } catch (err) {
    console.error("No se pudieron cargar las tiendas", err);
  }
}

function numeroDias(from, to) {
  const msPorDia = 24 * 60 * 60 * 1000;
  const dias = Math.round((new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / msPorDia) + 1;
  return Math.max(dias, 1);
}

function porcentajeEfectivo(kpis) {
  if (!kpis.totalVentas) return 0;
  const efectivo = kpis.ventasPorMetodoPago.find((p) => /efectivo|cash/i.test(p.nombre));
  return efectivo ? (efectivo.total / kpis.totalVentas) * 100 : 0;
}

function renderTarjetas(kpis) {
  const dias = numeroDias(kpis.from, kpis.to);
  const pctEfectivo = porcentajeEfectivo(kpis);
  const productoTop = kpis.productosMasVendidos[0];

  const bloques = [
    {
      titulo: "Ventas",
      items: [
        { etiqueta: "Ventas totales", valor: formatoMoneda(kpis.totalVentas) },
        { etiqueta: "Ventas netas (- reembolsos)", valor: formatoMoneda(kpis.ventasNetas) },
        { etiqueta: "N° de tickets", valor: kpis.numeroTickets },
        { etiqueta: "Ticket promedio", valor: formatoMoneda(kpis.ticketPromedio) },
        { etiqueta: "Venta promedio diaria", valor: formatoMoneda(kpis.totalVentas / dias) },
      ],
    },
    {
      titulo: "Caja y descuentos",
      items: [
        { etiqueta: "Ventas en efectivo", valor: `${pctEfectivo.toFixed(0)}%` },
        { etiqueta: "Descuentos otorgados", valor: formatoMoneda(kpis.totalDescuentos) },
        { etiqueta: "Propinas", valor: formatoMoneda(kpis.totalPropinas) },
        { etiqueta: "Reembolsos", valor: formatoMoneda(kpis.totalReembolsos) },
      ],
    },
    {
      titulo: "Productos",
      items: [
        {
          etiqueta: "Categoria mas vendida (sin excluidas)",
          valor: kpis.categoriaMasVendida
            ? `${kpis.categoriaMasVendida.nombre} (${formatoMoneda(kpis.categoriaMasVendida.total)})`
            : "Sin datos",
        },
        {
          etiqueta: "Producto mas vendido",
          valor: productoTop ? `${productoTop.nombre} (${productoTop.cantidad} uds.)` : "Sin datos",
        },
      ],
    },
  ];

  document.getElementById("tarjetas").innerHTML = bloques
    .map(
      (b) => `
      <div class="bloque-kpis">
        <h2>${b.titulo}</h2>
        <div class="tarjetas">
          ${b.items
            .map((i) => `<div class="tarjeta"><div class="etiqueta">${i.etiqueta}</div><p class="valor">${i.valor}</p></div>`)
            .join("")}
        </div>
      </div>`
    )
    .join("");
}

function actualizarGrafico(id, tipo, config) {
  if (charts[id]) charts[id].destroy();
  const ctx = document.getElementById(id).getContext("2d");
  charts[id] = new Chart(ctx, { type: tipo, ...config });
}

function renderGraficos(kpis) {
  const ejes = { grid: { color: "#e3e8ee" }, ticks: { color: "#64748d" } };
  const sufijo = excluirPanInput.checked ? " (sin pan)" : "";
  document.getElementById("tituloTopProductos").textContent = `Top 10 productos (por unidades vendidas)${sufijo}`;
  document.getElementById("tituloVentasCategoria").textContent = `Ventas por categoria${sufijo}`;

  actualizarGrafico("chartDiaSemana", "bar", {
    data: {
      labels: kpis.ventasPorDiaSemana.map((d) => d.dia),
      datasets: [{ label: "Ventas", data: kpis.ventasPorDiaSemana.map((d) => d.total), backgroundColor: "#533afd", borderRadius: 2 }],
    },
    options: { plugins: { legend: { display: false } }, scales: { x: ejes, y: ejes } },
  });

  actualizarGrafico("chartHora", "line", {
    data: {
      labels: kpis.ventasPorHora.map((_, h) => `${h}:00`),
      datasets: [{ label: "Ventas", data: kpis.ventasPorHora, borderColor: "#533afd", backgroundColor: "rgba(83,58,253,0.08)", fill: true, tension: 0.3, pointRadius: 0 }],
    },
    options: { plugins: { legend: { display: false } }, scales: { x: ejes, y: ejes } },
  });

  actualizarGrafico("chartPago", "doughnut", {
    data: {
      labels: kpis.ventasPorMetodoPago.map((p) => p.nombre),
      datasets: [{ data: kpis.ventasPorMetodoPago.map((p) => p.total), backgroundColor: PALETA, borderColor: "#ffffff", borderWidth: 2 }],
    },
    options: { plugins: { legend: { labels: { color: "#64748d" } } } },
  });

  actualizarGrafico("chartProductos", "bar", {
    data: {
      labels: kpis.productosMasVendidos.map((p) => p.nombre),
      datasets: [{ label: "Unidades", data: kpis.productosMasVendidos.map((p) => p.cantidad), backgroundColor: "#665efd", borderRadius: 2 }],
    },
    options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: ejes, y: ejes } },
  });

  const categorias = kpis.ventasPorCategoria.slice(0, 10);
  actualizarGrafico("chartCategorias", "bar", {
    data: {
      labels: categorias.map((c) => c.nombre),
      datasets: [{ label: "Ventas", data: categorias.map((c) => c.total), backgroundColor: "#533afd", borderRadius: 2 }],
    },
    options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: ejes, y: ejes } },
  });

  actualizarGrafico("chartEmpleados", "bar", {
    data: {
      labels: kpis.ventasPorEmpleado.map((e) => e.nombre),
      datasets: [{ label: "Ventas", data: kpis.ventasPorEmpleado.map((e) => e.total), backgroundColor: "#ea2261", borderRadius: 2 }],
    },
    options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: ejes, y: ejes } },
  });
}

async function cargarKpis() {
  mensajeError.classList.add("oculto");
  cargando.classList.remove("oculto");
  try {
    const params = new URLSearchParams({ from: fromInput.value, to: toInput.value });
    if (storeSelect.value) params.set("storeId", storeSelect.value);
    if (excluirPanInput.checked) params.set("excluirPan", "true");

    const res = await fetch(`/api/kpis?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al obtener los KPIs");

    renderTarjetas(data);
    renderGraficos(data);
  } catch (err) {
    mensajeError.textContent = err.message;
    mensajeError.classList.remove("oculto");
  } finally {
    cargando.classList.add("oculto");
  }
}

document.getElementById("btnBuscar").addEventListener("click", cargarKpis);
document.querySelectorAll(".accesos-rapidos button").forEach((btn) => {
  btn.addEventListener("click", () => setRango(btn.dataset.rango));
});
excluirPanInput.addEventListener("change", cargarKpis);

cargarTiendas();
setRango("semana");
