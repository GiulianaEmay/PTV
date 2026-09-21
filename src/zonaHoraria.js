// Offset fijo de Peru (UTC-5, sin horario de verano). Todas las empresas de este
// sistema operan en Peru por ahora; si en el futuro hay clientes en otro pais,
// esto deberia ser un campo configurable por empresa en vez de una constante.
const OFFSET_PERU = "-05:00";

/**
 * Los servidores en la nube (ej. Railway) corren en UTC, no en hora de Peru.
 * Date.getHours()/getDay() usan el reloj del servidor, asi que en produccion
 * darian la hora/dia equivocados. Esta funcion desplaza el instante UTC por el
 * offset de Peru para poder leer hora/dia "de pared" con los metodos getUTC*.
 */
function aInstantePeru(fechaUtc) {
  return new Date(fechaUtc.getTime() - 5 * 60 * 60 * 1000);
}

module.exports = { OFFSET_PERU, aInstantePeru };
