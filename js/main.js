import { experimentos } from "./registro.js";
import { Loop } from "./core/loop.js";
import { criarSliders } from "./core/controles.js";

const $ = id => document.getElementById(id);
const tela = $("tela"), ctx = tela.getContext("2d");
let exp = null, loop = null, valores = null, grafico = null, n = 0;

// Tela inicial: um botão por experimento, agrupado por categoria
for (const cat of new Set(experimentos.map(e => e.categoria))) {
  const secao = document.createElement("section");
  secao.innerHTML = `<h2>${cat}</h2>`;
  for (const e of experimentos.filter(e => e.categoria === cat)) {
    const b = document.createElement("button");
    b.className = "cartao"; b.textContent = e.titulo; b.onclick = () => abrir(e);
    secao.append(b);
  }
  $("menu").append(secao);
}

function abrir(e) {
  exp = e;
  $("menu").hidden = true; $("sim").hidden = false; $("voltar").hidden = false;
  $("titulo").textContent = e.titulo;
  valores = criarSliders($("params"), e.parametros, v => { valores = v; reiniciar(); });

  grafico?.destroy();
  grafico = new Chart($("grafico"), {
    type: "line",
    data: { datasets: e.series.map(nome => ({ label: nome, data: [], pointRadius: 0, borderWidth: 1.5 })) },
    options: { animation: false, parsing: false, responsive: true, maintainAspectRatio: false,
               scales: { x: { type: "linear", title: { display: true, text: "t (s)" } } } },
  });
  reiniciar();

  loop?.parar();
  loop = new Loop(dt => { exp.step(dt); registrar(); }, () => {
    exp.draw(ctx, tela.width, tela.height);
    $("info").textContent = exp.info();
  });
  loop.vel = +$("vel").value;
  loop.iniciar();
}

function reiniciar() {
  exp.reset(valores);
  grafico.data.datasets.forEach(d => { d.data = []; });
  grafico.update("none");
  n = 0;
}

// o gráfico é atualizado ~15 vezes por segundo (a cada 8 passos de 1/120 s)
function registrar() {
  if (++n % 8) return;
  const { t, valores: v } = exp.grandezas();
  grafico.data.datasets.forEach((d, i) => d.data.push({ x: t, y: v[i] }));
  grafico.update("none");
}

$("play").onclick = () => {
  loop.rodando = !loop.rodando;
  $("play").textContent = loop.rodando ? "Pausar" : "Continuar";
};
$("reset").onclick = reiniciar;
$("vel").oninput = e => { loop.vel = +e.target.value; };
$("voltar").onclick = () => {
  loop.parar();
  $("sim").hidden = true; $("menu").hidden = false; $("voltar").hidden = true;
  $("titulo").textContent = "Simulador de Física";
};
