(function () {
  const listaDiv = document.getElementById("listaEmpresas");

  async function cargarEmpresas() {
    const empresas = await fetch("/api/admin/empresas").then((r) => r.json());
    const usuariosPorEmpresa = await Promise.all(
      empresas.map((e) => fetch(`/api/admin/empresas/${e.id}/usuarios`).then((r) => r.json()))
    );

    listaDiv.innerHTML = empresas
      .map((empresa, i) => {
        const usuarios = usuariosPorEmpresa[i];
        return `
        <div class="mapeo-fila" data-id="${empresa.id}">
          <div class="empresa-fila-top">
            <strong>${empresa.nombre}</strong>
            <div class="empresa-acciones">
              <button class="btn-secundario btn-ver-dashboard">Ver dashboard</button>
            </div>
          </div>

          <label class="empresa-campo">
            Token de Loyverse
            <input type="text" class="input-token" value="${empresa.loyverseToken || ""}" placeholder="Sin token todavia" />
          </label>
          <button class="btn-secundario btn-guardar-token">Guardar token</button>

          <div class="empresa-usuarios">
            <p class="empresa-usuarios-titulo">Usuarios con acceso</p>
            <ul class="lista-usuarios">
              ${usuarios.map((u) => `<li>${u.email}</li>`).join("") || "<li><em>Ningun usuario todavia</em></li>"}
            </ul>
            <div class="nuevo-usuario">
              <input type="email" class="input-nuevo-email" placeholder="correo@negocio.com" />
              <input type="password" class="input-nuevo-password" placeholder="Contrasena temporal" />
              <button class="btn-secundario btn-crear-usuario">+ Dar acceso</button>
            </div>
            <p class="usuario-error error oculto"></p>
          </div>
        </div>`;
      })
      .join("");

    listaDiv.querySelectorAll(".mapeo-fila").forEach((fila) => {
      const empresaId = fila.dataset.id;

      fila.querySelector(".btn-ver-dashboard").addEventListener("click", async () => {
        await fetch(`/api/admin/ver-empresa/${empresaId}`, { method: "POST" });
        window.location.href = "index.html";
      });

      fila.querySelector(".btn-guardar-token").addEventListener("click", async () => {
        const token = fila.querySelector(".input-token").value;
        await fetch(`/api/admin/empresas/${empresaId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ loyverseToken: token }),
        });
      });

      fila.querySelector(".btn-crear-usuario").addEventListener("click", async () => {
        const email = fila.querySelector(".input-nuevo-email").value;
        const password = fila.querySelector(".input-nuevo-password").value;
        const errorEl = fila.querySelector(".usuario-error");
        errorEl.classList.add("oculto");
        try {
          const res = await fetch(`/api/admin/empresas/${empresaId}/usuarios`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "No se pudo crear el usuario");
          cargarEmpresas();
        } catch (err) {
          errorEl.textContent = err.message;
          errorEl.classList.remove("oculto");
        }
      });
    });
  }

  document.getElementById("btnCrearEmpresa").addEventListener("click", async () => {
    const nombre = document.getElementById("nuevaEmpresaNombre").value;
    const loyverseToken = document.getElementById("nuevaEmpresaToken").value;
    const errorEl = document.getElementById("crearEmpresaError");
    errorEl.classList.add("oculto");
    try {
      const res = await fetch("/api/admin/empresas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, loyverseToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear la empresa");
      document.getElementById("nuevaEmpresaNombre").value = "";
      document.getElementById("nuevaEmpresaToken").value = "";
      cargarEmpresas();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove("oculto");
    }
  });

  cargarEmpresas();
})();
