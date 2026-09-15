const { getCategories, getAllItems } = require("./loyverseClient");

const TTL_MS = 5 * 60 * 1000;
let cache = null;
let expiraEn = 0;

/**
 * Catalogo de Loyverse: nombres de categorias e indice item_id -> nombre de categoria.
 * Se cachea unos minutos para no golpear la API en cada autocompletado.
 */
async function obtenerCatalogo() {
  if (cache && Date.now() < expiraEn) return cache;

  const [categorias, items] = await Promise.all([getCategories(), getAllItems()]);
  const nombrePorCategoriaId = new Map(categorias.map((c) => [c.id, c.name]));

  const itemCategoria = new Map();
  for (const item of items) {
    const nombreCategoria = nombrePorCategoriaId.get(item.category_id) || null;
    if (nombreCategoria) itemCategoria.set(item.id, nombreCategoria);
  }

  cache = { categorias: categorias.map((c) => c.name), itemCategoria };
  expiraEn = Date.now() + TTL_MS;
  return cache;
}

module.exports = { obtenerCatalogo };
