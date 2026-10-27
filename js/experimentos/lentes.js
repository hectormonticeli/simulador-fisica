import { criarSistema } from "../core/sistemaOptico.js";

// Lentes delgadas: sistemas de até 3 lentes e até 3 objetos (ver core/sistemaOptico.js)
export default criarSistema({ id: "lentes", titulo: "Lentes e sistemas de lentes", espelho: false });
