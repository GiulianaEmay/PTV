(function () {
  async function init() {
    const cont = document.getElementById("sesionInfo");
    if (!cont) return;

    const res = await fetch("/api/me");
    if (!res.ok) return; // session.js ya redirige a login.html
    const me = await res.json();

    cont.innerHTML = `
      ${me.rol === "admin" ? '<select id="selectorEmpresaAdmin"><option value="">Selecciona empresa...</option></select>' : ""}
      <span class="sesion-empresa">${me.empresaNombre || ""}</span>
      <span class="sesion-email">${me.email}</span>
      ${me.rol === "admin" ? '<a href="admin.html" class="btn-secundario">Panel admin</a>' : ""}
      <button id="btnSalir" class="btn-secundario">Salir</button>
    `;

    document.getElementById("btnSalir").addEventListener("click", async () => {
      await fetch("/api/logout", { method: "POST" });
      window.location.href = "login.html";
    });

    if (me.rol === "admin") {
      const empresas = await fetch("/api/admin/empresas").then((r) => r.json());
      const sel = document.getElementById("selectorEmpresaAdmin");
      sel.innerHTML =
        '<option value="">Selecciona empresa...</option>' +
        empresas.map((e) => `<option value="${e.id}" ${e.id === me.empresaId ? "selected" : ""}>${e.nombre}</option>`).join("");
      sel.addEventListener("change", async () => {
        if (!sel.value) return;
        await fetch(`/api/admin/ver-empresa/${sel.value}`, { method: "POST" });
        window.location.reload();
      });
    }
  }

  init();
})();
