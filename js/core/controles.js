// Gera um slider para cada parâmetro declarado pelo experimento.
// Devolve o objeto "valores" e chama aoMudar(valores) quando algum slider se move.
export function criarSliders(container, parametros, aoMudar) {
  container.innerHTML = "";
  const valores = {};
  for (const p of parametros) {
    valores[p.nome] = p.valor;
    const rotulo = document.createElement("label");
    const saida = document.createElement("span");
    const campo = Object.assign(document.createElement("input"), {
      type: "range", min: p.min, max: p.max, step: p.passo ?? (p.max - p.min) / 100, value: p.valor,
    });
    const mostrar = () => { saida.textContent = Number(campo.value).toLocaleString("pt-BR"); };
    campo.oninput = () => { valores[p.nome] = +campo.value; mostrar(); aoMudar(valores); };
    mostrar();
    rotulo.append(`${p.rotulo}: `, saida, campo);
    container.append(rotulo);
  }
  return valores;
}
