document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("activa"));
    document.querySelectorAll(".tab").forEach((t) => t.classList.add("oculto"));
    btn.classList.add("activa");
    document.getElementById(btn.dataset.tab).classList.remove("oculto");
  });
});
