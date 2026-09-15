(function () {
  const fechaInput = document.getElementById("cuadreFecha");
  const storeSelect = document.getElementById("cuadreStoreId");
  const turnoSelect = document.getElementById("cuadreTurno");
  const filasIngresosBody = document.getElementById("filasIngresos");
  const filasEgresosBody = document.getElementById("filasEgresos");
  const cuadreError = document.getElementById("cuadreError");
  const cuadreCargando = document.getElementById("cuadreCargando");
  const cuadreSinMapear = document.getElementById("cuadreSinMapear");

  function moneda(v) {
    return (Number(v) || 0).toFixed(2);
  }

  function mostrarError(msg) {
    cuadreError.textContent = msg;
    cuadreError.classList.remove("oculto");
  }

  async function cargarFilasIngresos() {
    const res = await fetch("/api/filas-ingresos");
    const filas = await res.json();
    filasIngresosBody.innerHTML = filas
      .map(
        (fila) => `
        <tr data-fila="${fila}">
          <td>${fila}</td>
          <td><input type="number" step="0.01" min="0" class="input-ingreso" value="0.00" /></td>
        </tr>`
      )
      .join("");
    filasIngresosBody.querySelectorAll(".input-ingreso").forEach((inp) => {
      inp.addEventListener("input", actualizarTotales);
    });
  }

  async function cargarTiendasYTurnos() {
    try {
      const [storesRes, turnosRes] = await Promise.all([fetch("/api/stores"), fetch("/api/config/turnos")]);
      const stores = await storesRes.json();
      const turnos = await turnosRes.json();
      if (!storesRes.ok) throw new Error(stores.error || "No se pudieron cargar las tiendas");

      storeSelect.innerHTML = stores.map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
      turnoSelect.innerHTML = Object.keys(turnos)
        .map((t) => `<option value="${t}">${t} (${turnos[t].inicio} - ${turnos[t].fin})</option>`)
        .join("");
    } catch (err) {
      mostrarError(err.message);
    }
  }

  function filaEgresoHtml() {
    return `
      <tr>
        <td><input type="text" class="input-egreso-detalle" placeholder="Detalle del egreso" /></td>
        <td><input type="number" step="0.01" min="0" class="input-egreso-monto" value="0.00" /></td>
        <td><button type="button" class="btn-quitar">x</button></td>
      </tr>`;
  }

  function agregarFilaEgreso() {
    filasEgresosBody.insertAdjacentHTML("beforeend", filaEgresoHtml());
    const nuevaFila = filasEgresosBody.lastElementChild;
    nuevaFila.querySelector(".input-egreso-monto").addEventListener("input", actualizarTotales);
    nuevaFila.querySelector(".btn-quitar").addEventListener("click", () => {
      nuevaFila.remove();
      actualizarTotales();
    });
  }

  function actualizarTotales() {
    const totalIngreso = [...filasIngresosBody.querySelectorAll(".input-ingreso")].reduce(
      (acc, inp) => acc + (Number(inp.value) || 0),
      0
    );
    const totalEgreso = [...filasEgresosBody.querySelectorAll(".input-egreso-monto")].reduce(
      (acc, inp) => acc + (Number(inp.value) || 0),
      0
    );
    const totalSobrante =
      Number(document.getElementById("sobrantePiso").value || 0) +
      Number(document.getElementById("sobranteVariedad").value || 0) +
      Number(document.getElementById("sobranteRacion").value || 0) +
      Number(document.getElementById("sobranteDefectuosos").value || 0);

    document.getElementById("totalIngresoCelda").textContent = moneda(totalIngreso);
    document.getElementById("totalEgresoCelda").textContent = moneda(totalEgreso);
    document.getElementById("totalSobranteCelda").textContent = totalSobrante;
    document.getElementById("resumenIngreso").textContent = moneda(totalIngreso);
    document.getElementById("resumenEgreso").textContent = moneda(totalEgreso);
    document.getElementById("resumenEfectivo").innerHTML = `<strong>${moneda(totalIngreso - totalEgreso)}</strong>`;
  }

  async function autocompletar() {
    cuadreError.classList.add("oculto");
    cuadreSinMapear.classList.add("oculto");
    cuadreCargando.classList.remove("oculto");
    try {
      const params = new URLSearchParams({
        fecha: fechaInput.value,
        storeId: storeSelect.value,
        turno: turnoSelect.value,
      });
      const res = await fetch(`/api/cuadre-caja/autocompletar?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo autocompletar");

      filasIngresosBody.querySelectorAll("tr").forEach((tr) => {
        const fila = tr.dataset.fila;
        tr.querySelector(".input-ingreso").value = (data.totalPorFila[fila] || 0).toFixed(2);
      });

      if (data.sinMapear > 0.009) {
        cuadreSinMapear.textContent = `Aviso: ${moneda(data.sinMapear)} en ventas de efectivo no tienen una categoria de Loyverse mapeada a ninguna fila. Revisa la pestaña Configuracion.`;
        cuadreSinMapear.classList.remove("oculto");
      }

      actualizarTotales();
    } catch (err) {
      mostrarError(err.message);
    } finally {
      cuadreCargando.classList.add("oculto");
    }
  }

  async function guardarCuadre() {
    const ingresos = {};
    filasIngresosBody.querySelectorAll("tr").forEach((tr) => {
      ingresos[tr.dataset.fila] = Number(tr.querySelector(".input-ingreso").value) || 0;
    });

    const egresos = [...filasEgresosBody.querySelectorAll("tr")].map((tr) => ({
      detalle: tr.querySelector(".input-egreso-detalle").value,
      monto: Number(tr.querySelector(".input-egreso-monto").value) || 0,
    }));

    const cuerpo = {
      fecha: fechaInput.value,
      storeId: storeSelect.value,
      sucursal: storeSelect.options[storeSelect.selectedIndex]?.textContent || "",
      turno: turnoSelect.value,
      ingresos,
      egresos,
      sobrantePan: {
        piso: Number(document.getElementById("sobrantePiso").value) || 0,
        variedad: Number(document.getElementById("sobranteVariedad").value) || 0,
        racion: Number(document.getElementById("sobranteRacion").value) || 0,
        defectuosos: Number(document.getElementById("sobranteDefectuosos").value) || 0,
      },
      cajera: document.getElementById("cajera").value,
      vendedoras: document.getElementById("vendedoras").value,
      vbAdm: document.getElementById("vbAdm").value,
      bolsasQuedan: document.getElementById("bolsasQuedan").value,
    };

    try {
      const res = await fetch("/api/cuadre-caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar el cuadre");

      document.getElementById("cuadreGuardadoOk").classList.remove("oculto");
      setTimeout(() => document.getElementById("cuadreGuardadoOk").classList.add("oculto"), 3000);
      cargarHistorial();
    } catch (err) {
      mostrarError(err.message);
    }
  }

  async function cargarHistorial() {
    const res = await fetch("/api/cuadre-caja");
    const cuadres = await res.json();
    document.getElementById("historialCuadres").innerHTML = cuadres
      .slice(0, 30)
      .map(
        (c) => `
        <tr>
          <td>${c.fecha}</td><td>${c.turno}</td><td>${c.sucursal}</td>
          <td>${moneda(c.totalIngreso)}</td><td>${moneda(c.totalEgreso)}</td><td>${moneda(c.efectivo)}</td>
          <td>${c.cajera || ""}</td>
        </tr>`
      )
      .join("");
  }

  document.getElementById("btnAutocompletar").addEventListener("click", autocompletar);
  document.getElementById("btnAgregarEgreso").addEventListener("click", agregarFilaEgreso);
  document.getElementById("btnGuardarCuadre").addEventListener("click", guardarCuadre);
  ["sobrantePiso", "sobranteVariedad", "sobranteRacion", "sobranteDefectuosos"].forEach((id) =>
    document.getElementById(id).addEventListener("input", actualizarTotales)
  );

  fechaInput.value = new Date().toISOString().slice(0, 10);
  cargarFilasIngresos().then(actualizarTotales);
  cargarTiendasYTurnos();
  cargarHistorial();
})();
