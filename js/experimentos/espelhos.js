import { criarSistema } from "../core/sistemaOptico.js";

// Espelhos esféricos: sistemas de até 3 espelhos e até 3 objetos (ver core/sistemaOptico.js)
export default criarSistema({ id: "espelhos", titulo: "Espelhos esféricos e sistemas de espelhos", espelho: true });
