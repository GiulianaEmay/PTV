function requireAuth(req, res, next) {
  if (!req.session.usuarioId) return res.status(401).json({ error: "No autenticado" });
  next();
}

function requireAdmin(req, res, next) {
  if (req.session.rol !== "admin") return res.status(403).json({ error: "Solo administradores" });
  next();
}

/**
 * ID de la empresa cuyos datos deben verse en este request.
 * Para un usuario 'cliente' es siempre la suya. Para un 'admin' es la que
 * haya seleccionado en el panel de administracion (sesion viendoEmpresaId).
 */
function empresaActualId(req) {
  if (req.session.rol === "admin") return req.session.viendoEmpresaId || null;
  return req.session.empresaId || null;
}

function requireEmpresaSeleccionada(req, res, next) {
  const empresaId = empresaActualId(req);
  if (!empresaId) {
    return res.status(400).json({ error: "Selecciona una empresa desde el panel de administracion" });
  }
  req.empresaId = empresaId;
  next();
}

module.exports = { requireAuth, requireAdmin, empresaActualId, requireEmpresaSeleccionada };
