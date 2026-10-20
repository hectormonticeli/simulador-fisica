// Gera, para cada parâmetro do experimento, um campo numérico (digitável) e um slider sincronizados.
//   min/max/passo -> faixa do slider (a faixa "prática")
//   limite: [a, b] -> faixa aceita ao digitar (opcional; por padrão, a mesma do slider)
// Devolve o objeto "valores" e chama aoMudar(valores) quando algum valor muda.
export function criarSliders(container, parametros, aoMudar) {
  container.innerHTML = "";
  const valores = {};
  for (const p of parametros) {
    valores[p.nome] = p.valor;
    const [lo, hi] = p.limite ?? [p.min, p.max];

    const bloco = document.createElement("div"); bloco.className = "param";
    const linha = document.createElement("div"); linha.className = "linha";
    const rotulo = Object.assign(document.createElement("label"), { htmlFor: `p-${p.nome}`, textContent: p.rotulo });
    const numero = Object.assign(document.createElement("input"), { id: `p-${p.nome}`, type: "number", min: lo, max: hi, step: "any", value: p.valor });
    const slider = Object.assign(document.createElement("input"), {
      type: "range", min: p.min, max: p.max, step: p.passo ?? (p.max - p.min) / 100, value: p.valor,
    });

    const aplicar = v => { valores[p.nome] = v; aoMudar(valores); };
    slider.oninput = () => { numero.value = slider.value; aplicar(+slider.value); };
    numero.onchange = () => {   // vale ao confirmar (Enter ou ao sair do campo)
      let v = numero.valueAsNumber;
      if (Number.isNaN(v)) v = valores[p.nome];
      v = Math.min(hi, Math.max(lo, v));   // respeita os limites
      numero.value = v; slider.value = v;  // o slider apenas encosta na ponta se v estiver fora da sua faixa
      aplicar(v);
    };

    linha.append(rotulo, numero);
    bloco.append(linha, slider);
    container.append(bloco);
  }
  return valores;
}
