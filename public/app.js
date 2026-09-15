const fromInput = document.getElementById("from");
const toInput = document.getElementById("to");
const storeSelect = document.getElementById("storeId");
const mensajeError = document.getElementById("mensajeError");
const cargando = document.getElementById("cargando");

const charts = {};

function formatoMoneda(valor) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(valor || 0);
}

function fechaISO(date) {
  return date.toISOString().slice(0, 10);
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

function renderTarjetas(kpis) {
  const tarjetas = document.getElementById("tarjetas");
  const items = [
    { etiqueta: "Ventas totales", valor: formatoMoneda(kpis.totalVentas) },
    { etiqueta: "Ventas netas (- reembolsos)", valor: formatoMoneda(kpis.ventasNetas) },
    { etiqueta: "N° de tickets", valor: kpis.numeroTickets },
    { etiqueta: "Ticket promedio", valor: formatoMoneda(kpis.ticketPromedio) },
    { etiqueta: "Descuentos otorgados", valor: formatoMoneda(kpis.totalDescuentos) },
    { etiqueta: "Propinas", valor: formatoMoneda(kpis.totalPropinas) },
    { etiqueta: "Reembolsos", valor: formatoMoneda(kpis.totalReembolsos) },
  ];

  tarjetas.innerHTML = items
    .map(
      (i) => `<div class="tarjeta"><div class="etiqueta">${i.etiqueta}</div><p class="valor">${i.valor}</p></div>`
    )
    .join("");
}

function actualizarGrafico(id, tipo, config) {
  if (charts[id]) charts[id].destroy();
  const ctx = document.getElementById(id).getContext("2d");
  charts[id] = new Chart(ctx, { type: tipo, ...config });
}

function renderGraficos(kpis) {
  actualizarGrafico("chartDiaSemana", "bar", {
    data: {
      labels: kpis.ventasPorDiaSemana.map((d) => d.dia),
      datasets: [{ label: "Ventas", data: kpis.ventasPorDiaSemana.map((d) => d.total), backgroundColor: "#2563eb" }],
    },
    options: { plugins: { legend: { display: false } } },
  });

  actualizarGrafico("chartHora", "line", {
    data: {
      labels: kpis.ventasPorHora.map((_, h) => `${h}:00`),
      datasets: [{ label: "Ventas", data: kpis.ventasPorHora, borderColor: "#2563eb", tension: 0.3 }],
    },
    options: { plugins: { legend: { display: false } } },
  });

  actualizarGrafico("chartPago", "doughnut", {
    data: {
      labels: kpis.ventasPorMetodoPago.map((p) => p.nombre),
      datasets: [{ data: kpis.ventasPorMetodoPago.map((p) => p.total) }],
    },
  });

  actualizarGrafico("chartProductos", "bar", {
    data: {
      labels: kpis.productosMasVendidos.map((p) => p.nombre),
      datasets: [{ label: "Unidades", data: kpis.productosMasVendidos.map((p) => p.cantidad), backgroundColor: "#16a34a" }],
    },
    options: { indexAxis: "y", plugins: { legend: { display: false } } },
  });
}

async function cargarKpis() {
  mensajeError.classList.add("oculto");
  cargando.classList.remove("oculto");
  try {
    const params = new URLSearchParams({ from: fromInput.value, to: toInput.value });
    if (storeSelect.value) params.set("storeId", storeSelect.value);

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

cargarTiendas();
setRango("semana");
