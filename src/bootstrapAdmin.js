const db = require("./db");
const { crearUsuario } = require("./usuariosRepo");

/**
 * Crea el primer usuario admin (Emay) a partir de ADMIN_EMAIL/ADMIN_PASSWORD
 * en .env, si todavia no existe ningun admin. Permite el primer login sin
 * tener que tocar la base de datos a mano.
 */
function asegurarAdminInicial() {
  const hayAdmin = db.prepare("SELECT id FROM usuarios WHERE rol = 'admin' LIMIT 1").get();
  if (hayAdmin) return;

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn(
      "No hay ningun usuario admin todavia. Define ADMIN_EMAIL y ADMIN_PASSWORD en .env y reinicia el servidor para crear el primero."
    );
    return;
  }

  crearUsuario({ empresaId: null, email, password, rol: "admin" });
  console.log(`Usuario admin creado: ${email}`);
}

module.exports = { asegurarAdminInicial };
