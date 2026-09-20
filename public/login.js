document.getElementById("formLogin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorEl = document.getElementById("loginError");
  errorEl.classList.add("oculto");

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo iniciar sesion");
    window.location.href = data.rol === "admin" ? "admin.html" : "index.html";
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("oculto");
  }
});
