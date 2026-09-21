(function () {
  const filasTurnosBody = document.getElementById("filasTurnos");
  const mapeoDiv = document.getElementById("mapeoCategorias");
  const excluidasDiv = document.getElementById("categoriasExcluidas");

  async function cargarTurnos() {
    const turnos = await fetch("/api/config/turnos").then((r) => r.json());
    filasTurnosBody.innerHTML = Object.entries(turnos)
      .map(
        ([turno, rango]) => `
        <tr data-turno="${turno}">
          <td>${turno}</td>
          <td><input type="time" class="input-inicio" value="${rango.inicio}" /></td>
          <td><input type="time" class="input-fin" value="${rango.fin}" /></td>
        </tr>`
      )
      .join("");
  }

  async function guardarTurnos() {
    const turnos = {};
    filasTurnosBody.querySelectorAll("tr").forEach((tr) => {
      turnos[tr.dataset.turno] = {
        inicio: tr.querySelector(".input-inicio").value,
        fin: tr.querySelector(".input-fin").value,
      };
    });
    await fetch("/api/config/turnos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(turnos),
    });
    document.getElementById("turnosGuardadoOk").classList.remove("oculto");
    setTimeout(() => document.getElementById("turnosGuardadoOk").classList.add("oculto"), 3000);
  }

  async function cargarMapeo() {
    const [filasRes, categoriasRes, mapeoRes] = await Promise.all([
      fetch("/api/filas-ingresos"),
      fetch("/api/categorias-loyverse"),
      fetch("/api/config/mapeo-categorias"),
    ]);
    const filas = await filasRes.json();
    const categorias = await categoriasRes.json();
    const mapeo = await mapeoRes.json();

    if (!categoriasRes.ok) {
      mapeoDiv.innerHTML = `<p class="error">${categorias.error || "No se pudieron cargar las categorias de Loyverse"}</p>`;
      return;
    }

    mapeoDiv.innerHTML = filas
      .map((fila) => {
        const seleccionadas = new Set(mapeo[fila] || []);
        const checks = categorias
          .map(
            (cat) => `
            <label class="check-categoria">
              <input type="checkbox" value="${cat}" ${seleccionadas.has(cat) ? "checked" : ""} />
              ${cat}
            </label>`
          )
          .join("");
        return `
          <div class="mapeo-fila" data-fila="${fila}">
            <strong>${fila}</strong>
            <div class="mapeo-checks">${checks || "<em>No hay categorias en Loyverse</em>"}</div>
          </div>`;
      })
      .join("");
  }

  async function guardarMapeo() {
    const mapeo = {};
    mapeoDiv.querySelectorAll(".mapeo-fila").forEach((div) => {
      const fila = div.dataset.fila;
      mapeo[fila] = [...div.querySelectorAll("input[type=checkbox]:checked")].map((c) => c.value);
    });
    await fetch("/api/config/mapeo-categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mapeo),
    });
    document.getElementById("mapeoGuardadoOk").classList.remove("oculto");
    setTimeout(() => document.getElementById("mapeoGuardadoOk").classList.add("oculto"), 3000);
  }

  async function cargarExcluidas() {
    const [categoriasRes, excluidasRes] = await Promise.all([
      fetch("/api/categorias-loyverse"),
      fetch("/api/config/categorias-excluidas-kpi"),
    ]);
    const categorias = await categoriasRes.json();
    const excluidas = await excluidasRes.json();

    if (!categoriasRes.ok) {
      excluidasDiv.innerHTML = `<p class="error">${categorias.error || "No se pudieron cargar las categorias de Loyverse"}</p>`;
      return;
    }

    const seleccionadas = new Set(excluidas || []);
    excluidasDiv.innerHTML = `
      <div class="mapeo-checks">
        ${categorias
          .map(
            (cat) => `
            <label class="check-categoria">
              <input type="checkbox" value="${cat}" ${seleccionadas.has(cat) ? "checked" : ""} />
              ${cat}
            </label>`
          )
          .join("")}
      </div>`;
  }

  async function guardarExcluidas() {
    const excluidas = [...excluidasDiv.querySelectorAll("input[type=checkbox]:checked")].map((c) => c.value);
    await fetch("/api/config/categorias-excluidas-kpi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(excluidas),
    });
    document.getElementById("excluidasGuardadoOk").classList.remove("oculto");
    setTimeout(() => document.getElementById("excluidasGuardadoOk").classList.add("oculto"), 3000);
  }

  async function cargarSucursales() {
    const lista = document.getElementById("listaSucursales");
    try {
      const res = await fetch("/api/stores");
      const tiendas = await res.json();
      if (!res.ok) throw new Error(tiendas.error || "No se pudieron cargar las sucursales");
      lista.innerHTML = tiendas.length
        ? tiendas.map((t) => `<li>${t.name}</li>`).join("")
        : "<li><em>No hay sucursales registradas en Loyverse todavia.</em></li>";
    } catch (err) {
      lista.innerHTML = `<li class="error">${err.message}</li>`;
    }
  }

  document.getElementById("btnGuardarTurnos").addEventListener("click", guardarTurnos);
  document.getElementById("btnGuardarMapeo").addEventListener("click", guardarMapeo);
  document.getElementById("btnGuardarExcluidas").addEventListener("click", guardarExcluidas);

  cargarTurnos();
  cargarMapeo();
  cargarExcluidas();
  cargarSucursales();
})();
