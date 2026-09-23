(function () {
  const fechaInput = document.getElementById("cuadreFecha");
  const storeSelect = document.getElementById("cuadreStoreId");
  const turnoSelect = document.getElementById("cuadreTurno");
  const filasIngresosBody = document.getElementById("filasIngresos");
  const filasEgresosBody = document.getElementById("filasEgresos");
  const efectivoContadoInput = document.getElementById("efectivoContado");
  const cuadreError = document.getElementById("cuadreError");
  const cuadreCargando = document.getElementById("cuadreCargando");
  const cuadreSinMapear = document.getElementById("cuadreSinMapear");
  const modalEgreso = document.getElementById("modalEgreso");

  let egresos = [];

  function moneda(v) {
    return (Number(v) || 0).toFixed(2);
  }

  function fechaISO(date) {
    const anio = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, "0");
    const dia = String(date.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
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

  // --- Egresos: se agregan desde un modal en vez de expandir la pagina ---

  function abrirModalEgreso() {
    document.getElementById("modalEgresoDetalle").value = "";
    document.getElementById("modalEgresoMonto").value = "";
    document.getElementById("modalEgresoError").classList.add("oculto");
    modalEgreso.classList.remove("oculto");
    document.getElementById("modalEgresoDetalle").focus();
  }

  function cerrarModalEgreso() {
    modalEgreso.classList.add("oculto");
  }

  function confirmarEgreso() {
    const detalle = document.getElementById("modalEgresoDetalle").value.trim();
    const monto = Number(document.getElementById("modalEgresoMonto").value) || 0;
    const errorEl = document.getElementById("modalEgresoError");
    if (!detalle || monto <= 0) {
      errorEl.textContent = "El egreso necesita un detalle y un monto mayor a 0.";
      errorEl.classList.remove("oculto");
      return;
    }
    errorEl.classList.add("oculto");
    egresos.push({ detalle, monto });
    cerrarModalEgreso();
    renderEgresos();
  }

  function quitarEgreso(indice) {
    egresos.splice(indice, 1);
    renderEgresos();
  }

  function renderEgresos() {
    filasEgresosBody.innerHTML = egresos
      .map(
        (e, i) => `
        <tr>
          <td>${e.detalle}</td>
          <td>${moneda(e.monto)}</td>
          <td><button type="button" class="btn-quitar" data-indice="${i}">x</button></td>
        </tr>`
      )
      .join("");
    filasEgresosBody.querySelectorAll(".btn-quitar").forEach((btn) => {
      btn.addEventListener("click", () => quitarEgreso(Number(btn.dataset.indice)));
    });
    actualizarTotales();
  }

  // --- Totales y diferencia de caja ---

  function actualizarTotales() {
    const totalIngreso = [...filasIngresosBody.querySelectorAll(".input-ingreso")].reduce(
      (acc, inp) => acc + (Number(inp.value) || 0),
      0
    );
    const totalEgreso = egresos.reduce((acc, e) => acc + e.monto, 0);
    const efectivoEsperado = totalIngreso - totalEgreso;
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
    document.getElementById("resumenEfectivo").textContent = moneda(efectivoEsperado);

    actualizarDiferencia(efectivoEsperado);
  }

  function actualizarDiferencia(efectivoEsperado) {
    const wrap = document.getElementById("resumenDiferenciaWrap");
    const celda = document.getElementById("resumenDiferencia");
    const valorContado = efectivoContadoInput.value;

    wrap.classList.remove("resumen-positiva", "resumen-negativa");

    if (valorContado === "") {
      celda.textContent = "Sin contar";
      return;
    }

    const diferencia = Number(valorContado) - efectivoEsperado;
    const signo = diferencia > 0 ? "+" : "";
    celda.textContent = `${signo}${moneda(diferencia)}`;

    if (diferencia > 0.009) wrap.classList.add("resumen-positiva");
    else if (diferencia < -0.009) wrap.classList.add("resumen-negativa");
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

    const cuerpo = {
      fecha: fechaInput.value,
      storeId: storeSelect.value,
      sucursal: storeSelect.options[storeSelect.selectedIndex]?.textContent || "",
      turno: turnoSelect.value,
      ingresos,
      egresos,
      efectivoContado: efectivoContadoInput.value === "" ? null : Number(efectivoContadoInput.value),
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
      egresos = [];
      renderEgresos();
      efectivoContadoInput.value = "";
      cargarHistorial();
    } catch (err) {
      mostrarError(err.message);
    }
  }

  function celdaDiferencia(diferencia) {
    if (diferencia === null || diferencia === undefined) return '<span class="dato-vacio">Sin contar</span>';
    const clase = diferencia > 0.009 ? "texto-positivo" : diferencia < -0.009 ? "texto-negativo" : "";
    const signo = diferencia > 0 ? "+" : "";
    return `<span class="${clase}">${signo}${moneda(diferencia)}</span>`;
  }

  async function cargarHistorial() {
    const res = await fetch("/api/cuadre-caja");
    const cuadres = await res.json();

    if (!cuadres.length) {
      document.getElementById("historialCuadres").innerHTML = `
        <tr><td colspan="8" class="tabla-vacia">Todavia no hay cuadres guardados. Completa el formulario de arriba y guarda el primero.</td></tr>`;
      return;
    }

    document.getElementById("historialCuadres").innerHTML = cuadres
      .slice(0, 30)
      .map(
        (c) => `
        <tr>
          <td>${c.fecha}</td><td>${c.turno}</td><td>${c.sucursal}</td>
          <td>${moneda(c.totalIngreso)}</td><td>${moneda(c.totalEgreso)}</td><td>${moneda(c.efectivoEsperado)}</td>
          <td>${celdaDiferencia(c.diferencia)}</td>
          <td>${c.cajera || ""}</td>
        </tr>`
      )
      .join("");
  }

  document.getElementById("btnAutocompletar").addEventListener("click", autocompletar);
  document.getElementById("btnAgregarEgreso").addEventListener("click", abrirModalEgreso);
  document.getElementById("btnCancelarEgreso").addEventListener("click", cerrarModalEgreso);
  document.getElementById("btnConfirmarEgreso").addEventListener("click", confirmarEgreso);
  modalEgreso.addEventListener("click", (e) => {
    if (e.target === modalEgreso) cerrarModalEgreso();
  });
  document.getElementById("btnGuardarCuadre").addEventListener("click", guardarCuadre);
  efectivoContadoInput.addEventListener("input", actualizarTotales);
  ["sobrantePiso", "sobranteVariedad", "sobranteRacion", "sobranteDefectuosos"].forEach((id) =>
    document.getElementById(id).addEventListener("input", actualizarTotales)
  );

  fechaInput.value = fechaISO(new Date());
  cargarFilasIngresos().then(actualizarTotales);
  cargarTiendasYTurnos();
  cargarHistorial();
})();
