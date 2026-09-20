const { getCategories, getAllItems } = require("./loyverseClient");

const TTL_MS = 5 * 60 * 1000;
const cachePorEmpresa = new Map();

/**
 * Catalogo de Loyverse de una empresa: nombres de categorias e indice
 * item_id -> nombre de categoria. Se cachea unos minutos por empresa.
 */
async function obtenerCatalogo(empresaId, token) {
  const entrada = cachePorEmpresa.get(empresaId);
  if (entrada && Date.now() < entrada.expiraEn) return entrada.datos;

  const [categorias, items] = await Promise.all([getCategories(token), getAllItems(token)]);
  const nombrePorCategoriaId = new Map(categorias.map((c) => [c.id, c.name]));

  const itemCategoria = new Map();
  for (const item of items) {
    const nombreCategoria = nombrePorCategoriaId.get(item.category_id) || null;
    if (nombreCategoria) itemCategoria.set(item.id, nombreCategoria);
  }

  const datos = { categorias: categorias.map((c) => c.name), itemCategoria };
  cachePorEmpresa.set(empresaId, { datos, expiraEn: Date.now() + TTL_MS });
  return datos;
}

module.exports = { obtenerCatalogo };
