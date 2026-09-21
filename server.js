require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");

const { getStores, getAllReceipts } = require("./src/loyverseClient");
const { calcularKpis } = require("./src/kpis");
const { obtenerCatalogo } = require("./src/loyverseCatalog");
const { autocompletarIngresos } = require("./src/cuadreCaja");
const { FILAS_INGRESOS } = require("./src/filasReporte");
const { OFFSET_PERU } = require("./src/zonaHoraria");
const { requireAuth, requireAdmin, empresaActualId, requireEmpresaSeleccionada } = require("./src/auth");
const empresasRepo = require("./src/empresasRepo");
const usuariosRepo = require("./src/usuariosRepo");
const cuadresRepo = require("./src/cuadresRepo");
const { asegurarAdminInicial } = require("./src/bootstrapAdmin");

asegurarAdminInicial();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "cuadrefacil-dev-secret-cambiar-en-produccion",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 12 },
  })
);
app.use(express.static(path.join(__dirname, "public")));

// --- Autenticacion ---

app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};
  const fila = usuariosRepo.buscarPorEmail(email);
  if (!fila || !usuariosRepo.verificarPassword(password || "", fila.password_hash)) {
    return res.status(401).json({ error: "Correo o contrasena incorrectos" });
  }

  req.session.usuarioId = fila.id;
  req.session.usuarioEmail = fila.email;
  req.session.rol = fila.rol;
  req.session.empresaId = fila.empresa_id || null;
  req.session.viendoEmpresaId = fila.rol === "admin" ? null : fila.empresa_id;

  res.json(datosSesion(req));
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/me", (req, res) => {
  if (!req.session.usuarioId) return res.status(401).json({ error: "No autenticado" });
  res.json(datosSesion(req));
});

function datosSesion(req) {
  const empresaId = empresaActualId(req);
  const empresa = empresaId ? empresasRepo.obtenerEmpresa(empresaId) : null;
  return {
    email: req.session.usuarioEmail,
    rol: req.session.rol,
    empresaId,
    empresaNombre: empresa?.nombre || null,
  };
}

// --- Panel de administracion (Emay): gestiona empresas, tokens de Loyverse y usuarios ---

app.get("/api/admin/empresas", requireAuth, requireAdmin, (req, res) => {
  res.json(empresasRepo.listarEmpresas());
});

app.post("/api/admin/empresas", requireAuth, requireAdmin, (req, res) => {
  const { nombre, loyverseToken } = req.body || {};
  if (!nombre) return res.status(400).json({ error: "El nombre de la empresa es obligatorio" });
  res.status(201).json(empresasRepo.crearEmpresa({ nombre, loyverseToken }));
});

app.put("/api/admin/empresas/:id", requireAuth, requireAdmin, (req, res) => {
  const { nombre, loyverseToken } = req.body || {};
  res.json(empresasRepo.actualizarEmpresa(Number(req.params.id), { nombre, loyverseToken }));
});

app.get("/api/admin/empresas/:id/usuarios", requireAuth, requireAdmin, (req, res) => {
  res.json(usuariosRepo.listarPorEmpresa(Number(req.params.id)));
});

app.post("/api/admin/empresas/:id/usuarios", requireAuth, requireAdmin, (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Correo y contrasena son obligatorios" });
  try {
    const usuario = usuariosRepo.crearUsuario({ empresaId: Number(req.params.id), email, password, rol: "cliente" });
    res.status(201).json(usuario);
  } catch (err) {
    res.status(400).json({ error: "No se pudo crear el usuario (el correo ya existe?)" });
  }
});

app.post("/api/admin/ver-empresa/:id", requireAuth, requireAdmin, (req, res) => {
  const empresa = empresasRepo.obtenerEmpresa(Number(req.params.id));
  if (!empresa) return res.status(404).json({ error: "Empresa no encontrada" });
  req.session.viendoEmpresaId = empresa.id;
  res.json({ ok: true, empresa });
});

// --- Rutas operativas (KPIs, Cuadre de Caja, Configuracion), scoped por empresa ---

app.get("/api/stores", requireAuth, requireEmpresaSeleccionada, async (req, res) => {
  try {
    const empresa = empresasRepo.obtenerEmpresa(req.empresaId);
    const stores = await getStores(empresa.loyverseToken);
    res.json(stores);
  } catch (err) {
    handleError(res, err);
  }
});

app.get("/api/kpis", requireAuth, requireEmpresaSeleccionada, async (req, res) => {
  try {
    const { from, to, storeId, excluirPan } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: "Los parametros 'from' y 'to' son obligatorios (YYYY-MM-DD)" });
    }

    const empresa = empresasRepo.obtenerEmpresa(req.empresaId);
    const createdAtMin = new Date(`${from}T00:00:00${OFFSET_PERU}`).toISOString();
    const createdAtMax = new Date(`${to}T23:59:59${OFFSET_PERU}`).toISOString();

    const receipts = await getAllReceipts(empresa.loyverseToken, { createdAtMin, createdAtMax, storeId });
    const { itemCategoria, nombreEmpleado } = await obtenerCatalogo(empresa.id, empresa.loyverseToken);
    const kpis = calcularKpis(receipts, {
      itemCategoria,
      nombreEmpleado,
      categoriasExcluidas: empresa.categoriasExcluidasKpi,
      excluirPan: excluirPan === "true",
    });
    const diferenciaCaja = cuadresRepo.resumenDiferencia({ empresaId: req.empresaId, from, to, storeId });
    res.json({ from, to, storeId: storeId || null, ...kpis, diferenciaCaja });
  } catch (err) {
    handleError(res, err);
  }
});

// --- Cuadre de caja (digitalizacion del reporte de caja en papel) ---

app.get("/api/filas-ingresos", requireAuth, (req, res) => {
  res.json(FILAS_INGRESOS);
});

app.get("/api/categorias-loyverse", requireAuth, requireEmpresaSeleccionada, async (req, res) => {
  try {
    const empresa = empresasRepo.obtenerEmpresa(req.empresaId);
    const { categorias } = await obtenerCatalogo(empresa.id, empresa.loyverseToken);
    res.json(categorias);
  } catch (err) {
    handleError(res, err);
  }
});

app.get("/api/config/mapeo-categorias", requireAuth, requireEmpresaSeleccionada, (req, res) => {
  res.json(empresasRepo.obtenerEmpresa(req.empresaId).mapeoCategorias);
});

app.post("/api/config/mapeo-categorias", requireAuth, requireEmpresaSeleccionada, (req, res) => {
  empresasRepo.actualizarMapeoCategorias(req.empresaId, req.body || {});
  res.json({ ok: true });
});

app.get("/api/config/categorias-excluidas-kpi", requireAuth, requireEmpresaSeleccionada, (req, res) => {
  res.json(empresasRepo.obtenerEmpresa(req.empresaId).categoriasExcluidasKpi);
});

app.post("/api/config/categorias-excluidas-kpi", requireAuth, requireEmpresaSeleccionada, (req, res) => {
  empresasRepo.actualizarCategoriasExcluidas(req.empresaId, Array.isArray(req.body) ? req.body : []);
  res.json({ ok: true });
});

app.get("/api/config/turnos", requireAuth, requireEmpresaSeleccionada, (req, res) => {
  res.json(empresasRepo.obtenerEmpresa(req.empresaId).turnos);
});

app.post("/api/config/turnos", requireAuth, requireEmpresaSeleccionada, (req, res) => {
  empresasRepo.actualizarTurnos(req.empresaId, req.body || {});
  res.json({ ok: true });
});

app.get("/api/cuadre-caja/autocompletar", requireAuth, requireEmpresaSeleccionada, async (req, res) => {
  try {
    const { fecha, storeId, turno } = req.query;
    if (!fecha || !storeId || !turno) {
      return res.status(400).json({ error: "fecha, storeId y turno son obligatorios" });
    }
    const empresa = empresasRepo.obtenerEmpresa(req.empresaId);
    const ventanaTurno = empresa.turnos[turno];
    if (!ventanaTurno) {
      return res.status(400).json({ error: `El turno '${turno}' no esta configurado` });
    }
    const resultado = await autocompletarIngresos({
      empresaId: empresa.id,
      token: empresa.loyverseToken,
      fecha,
      storeId,
      ventanaTurno,
      mapeoCategorias: empresa.mapeoCategorias,
    });
    res.json(resultado);
  } catch (err) {
    handleError(res, err);
  }
});

app.get("/api/cuadre-caja", requireAuth, requireEmpresaSeleccionada, (req, res) => {
  const { from, to, storeId } = req.query;
  res.json(cuadresRepo.listarCuadres({ empresaId: req.empresaId, from, to, storeId }));
});

app.post("/api/cuadre-caja", requireAuth, requireEmpresaSeleccionada, (req, res) => {
  const registro = cuadresRepo.guardarCuadre(req.empresaId, req.body || {});
  res.status(201).json(registro);
});

function handleError(res, err) {
  let status = err.response?.status || 500;
  let message = err.response?.data?.errors?.[0]?.message || err.message || "Error inesperado";

  // Un 401 de la API de Loyverse (token invalido/vencido) no debe confundirse
  // con un 401 de nuestra propia sesion, o el navegador redirige al login.
  if (status === 401 && err.response) {
    status = 502;
    message = "El token de Loyverse de esta empresa es invalido o vencio. Pide a Emay Tech que lo actualice desde el panel de administracion.";
  }

  console.error("Error:", message);
  res.status(status).json({ error: message });
}

app.listen(PORT, () => {
  console.log(`Emay Tech corriendo en http://localhost:${PORT}`);
});
