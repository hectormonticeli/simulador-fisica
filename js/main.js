import { experimentos } from "./registro.js";
import { Loop } from "./core/loop.js";
import { criarSliders } from "./core/controles.js";

// cores suaves das séries do gráfico
const PALETA = ["#7fb2e5", "#e8a87c", "#9fd3a8", "#c3a6e8"];
const $ = id => document.getElementById(id);
const tela = $("tela"), ctx = tela.getContext("2d");
let exp = null, loop = null, valores = null, grafico = null, n = 0, W = 0, H = 0;

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

// O canvas ocupa a área toda: ajusta o tamanho (com nitidez em telas de alta densidade)
function ajustar() {
  const d = devicePixelRatio || 1;
  W = tela.clientWidth; H = tela.clientHeight;
  tela.width = W * d; tela.height = H * d;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  if (exp) exp.escala = null;   // força recalcular a escala do experimento
}
new ResizeObserver(ajustar).observe(tela);

function abrir(e) {
  exp = e;
  $("menu").hidden = true; $("sim").hidden = false; $("voltar").hidden = false;
  $("titulo").textContent = e.titulo;
  ajustar();

  // mexer em um slider volta o experimento ao estado inicial, parado
  valores = criarSliders($("params"), e.parametros, v => { valores = v; preparar(); });

  Chart.defaults.color = "#aab2c0"; Chart.defaults.borderColor = "#2c3340";
  grafico?.destroy();
  grafico = new Chart($("grafico"), {
    type: "line",
    data: { datasets: e.series.map((nome, i) => ({ label: nome, data: [], pointRadius: 0, borderWidth: 1.5, borderColor: PALETA[i % PALETA.length] })) },
    options: { animation: false, parsing: false, responsive: true, maintainAspectRatio: false,
               scales: { x: { type: "linear", title: { display: true, text: "t (s)" } } } },
  });

  loop?.parar();
  loop = new Loop(dt => { exp.step(dt); registrar(); }, () => {
    exp.draw(ctx, W, H);
    $("info").textContent = exp.info();
  });
  loop.vel = +$("vel").value;
  preparar();
  loop.iniciar();
}

// Estado inicial: experimento posicionado, loop parado, esperando o botão "Iniciar"
function preparar() {
  exp.reset(valores);
  grafico.data.datasets.forEach(d => { d.data = []; });
  grafico.update("none");
  n = 0;
  loop.rodando = false;
  $("play").textContent = "Iniciar";
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
$("reset").onclick = preparar;
$("vel").oninput = e => { loop.vel = +e.target.value; };
$("voltar").onclick = () => {
  loop.parar();
  $("sim").hidden = true; $("menu").hidden = false; $("voltar").hidden = true;
  $("titulo").textContent = "Simulador de Física";
};
