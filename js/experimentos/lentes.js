import { COR, MARGEM, desenharGrade } from "../core/desenho.js";
import { LUZ, linha, seta, flecha, desenharPulsos } from "../core/optica.js";

const V0 = 8;   // velocidade do pulso de luz na animação (m/s do mundo)
const f2 = x => x.toFixed(2);
const sg = x => (x > 0 ? "+" : "") + f2(x);
const sub = i => "₀₁₂₃₄₅₆₇₈₉"[i];
const longe = x => Math.abs(x) > 1e5;   // "no infinito"
const tamanho = A => (Math.abs(Math.abs(A) - 1) < 0.005 ? "do mesmo tamanho" : Math.abs(A) > 1 ? "ampliada" : "reduzida");

export default {
  id: "lentes",
  titulo: "Lentes e sistemas de lentes",
  categoria: "Óptica",
  // f > 0: convergente; f < 0: divergente. As lentes ficam em x = 0, d₁₂ e d₁₂ + d₂₃; o objeto fica à esquerda da lente 1.
  parametros: [
    { nome: "N", rotulo: "Número de lentes (1 a 3)", min: 1, max: 3, valor: 1, passo: 1 },
    { nome: "p", rotulo: "Distância do objeto à lente 1 (m)", min: 0.5, max: 20, valor: 6, passo: 0.1, limite: [0.05, 200] },
    { nome: "h", rotulo: "Altura do objeto (m)", min: 0.1, max: 5, valor: 1, passo: 0.1, limite: [0.01, 20] },
    { nome: "f1", rotulo: "Lente 1: distância focal f₁ (m)", min: -10, max: 10, valor: 3, passo: 0.1, limite: [-100, 100] },
    { nome: "d12", rotulo: "Distância da lente 1 à lente 2 (m)", min: 0.5, max: 20, valor: 5, passo: 0.1, limite: [0.05, 100] },
    { nome: "f2", rotulo: "Lente 2: distância focal f₂ (m)", min: -10, max: 10, valor: 4, passo: 0.1, limite: [-100, 100] },
    { nome: "d23", rotulo: "Distância da lente 2 à lente 3 (m)", min: 0.5, max: 20, valor: 5, passo: 0.1, limite: [0.05, 100] },
    { nome: "f3", rotulo: "Lente 3: distância focal f₃ (m)", min: -10, max: 10, valor: -3, passo: 0.1, limite: [-100, 100] },
  ],

  reset(p) {
    const N = Math.round(p.N), h = p.h;
    const fs = [p.f1, p.f2, p.f3].slice(0, N).map(f => (Math.abs(f) < 0.1 ? (f < 0 ? -0.1 : 0.1) : f));
    const X = [0, p.d12, p.d12 + p.d23].slice(0, N);

    // Cadeia de imagens: a imagem de cada lente é o objeto da seguinte (se ficar depois dela, é um objeto virtual).
    let xo = -p.p, ho = h;
    const et = [];
    for (let i = 0; i < N; i++) {
      let po = X[i] - xo; if (Math.abs(po) < 1e-9) po = 1e-9;       // distância do objeto à lente i
      let d = po - fs[i]; if (Math.abs(d) < 1e-6) d = d < 0 ? -1e-6 : 1e-6;
      const pl = fs[i] * po / d, A = -pl / po;                       // equação de Gauss e aumento
      et.push({ f: fs[i], x: X[i], p: po, pl, A, xi: X[i] + pl, hi: A * ho });
      xo = X[i] + pl; ho = A * ho;
    }

    // região mostrada
    const lim = x => Math.max(-70, Math.min(70 + X[N - 1], x));
    const xs = [-p.p, ...X, ...et.map(e => lim(e.xi))];
    const xmin = Math.min(...xs) - 2, xmax = Math.max(...xs, X[N - 1] + 4) + 2;

    // três raios saindo da ponta do objeto: paralelo ao eixo, pelo centro da lente 1 e na direção do foco F₁.
    // Em cada lente fina: o raio não muda de altura y e a inclinação u passa a u − y/f.
    const incl = [0, -h / p.p];
    if (Math.abs(p.p - fs[0]) > 1e-3) incl.push(-h / (p.p - fs[0]));
    const raios = incl.map(u0 => {
      let x = -p.p, y = h, u = u0; const pts = [[x, y]];
      for (let i = 0; i < N; i++) { y += u * (X[i] - x); x = X[i]; pts.push([x, y]); u -= y / fs[i]; }
      pts.push([xmax, y + u * (xmax - x)]);
      return pts;
    });
    const ymax = Math.max(h, ...et.map(e => Math.min(Math.abs(e.hi), 30)), ...raios.flatMap(r => r.slice(0, -1).map(q => Math.abs(q[1]))));
    Object.assign(this, { N, X, p: p.p, h, et, raios, t: 0, fim: false, Atot: et.reduce((a, e) => a * e.A, 1) });
    this.vista = { cx: (xmin + xmax) / 2, meiaL: Math.max(8, (xmax - xmin) / 2), meiaA: Math.min(60, Math.max(4, 1.4 * ymax)) };
  },

  step(dt) { this.t += dt; },

  draw(ctx, w, h) {
    const V = this.vista, M = MARGEM, aw = w - M.e - M.d, ah = h - M.t - M.b, N = this.N;
    const s = Math.min(aw / (2 * V.meiaL), ah / (2 * V.meiaA)), cx = M.e + aw / 2, cy = M.t + ah / 2;
    const X = x => cx + (x - V.cx) * s, Y = y => cy - y * s;
    ctx.clearRect(0, 0, w, h);
    desenharGrade(ctx, w, h, X(0), Y(0), s);   // o eixo horizontal desenhado é o eixo óptico (a grade é de 1 m)

    // lentes (pontas para fora: convergente; para dentro: divergente) e focos
    const H = V.meiaA * 0.92, yt = Y(H), yb = Y(-H);
    ctx.font = "13px system-ui";
    this.et.forEach((e, i) => {
      const xl = X(e.x), conv = e.f > 0, ind = N > 1 ? sub(i + 1) : "";
      ctx.strokeStyle = COR.azul; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(xl, yt); ctx.lineTo(xl, yb);
      ctx.moveTo(xl - 7, conv ? yt + 11 : yt); ctx.lineTo(xl, conv ? yt : yt + 11); ctx.lineTo(xl + 7, conv ? yt + 11 : yt);
      ctx.moveTo(xl - 7, conv ? yb - 11 : yb); ctx.lineTo(xl, conv ? yb : yb - 11); ctx.lineTo(xl + 7, conv ? yb - 11 : yb);
      ctx.stroke();
      ctx.fillStyle = COR.azul; if (N > 1) ctx.fillText(`L${ind}`, xl + 9, yt + 16);
      ctx.fillStyle = COR.texto; ctx.textAlign = "center";
      for (const [x, nome] of [[e.x - e.f, `F${ind}`], [e.x + e.f, `F${ind}′`]]) {
        ctx.beginPath(); ctx.arc(X(x), Y(0), 3.5, 0, 2 * Math.PI); ctx.fill(); ctx.fillText(nome, X(x), Y(0) + 18);
      }
      ctx.textAlign = "start";
    });

    // raios; tracejados: prolongamentos que "formam" imagens virtuais e objetos virtuais
    for (const r of this.raios) {
      linha(ctx, X, Y, r, LUZ, 1.8, [], 0.85);
      for (let k = 0; k < r.length - 1; k++) seta(ctx, X, Y, r[k], r[k + 1], LUZ);
      this.et.forEach((e, i) => {
        if (longe(e.xi)) return;
        if (e.pl < 0) linha(ctx, X, Y, [r[i + 1], [e.xi, e.hi]], LUZ, 1.2, [6, 5], 0.5);
        else if (i < N - 1 && e.xi > this.X[i + 1]) linha(ctx, X, Y, [r[i + 2], [e.xi, e.hi]], LUZ, 1.2, [6, 5], 0.5);
      });
    }

    // objeto (coral) e todas as imagens (azul; tracejadas se virtuais)
    flecha(ctx, X(-this.p), Y(0), X(-this.p), Y(this.h), COR.coral);
    ctx.fillStyle = COR.coral; ctx.fillText("O", X(-this.p) + 8, Y(this.h) - 8);
    this.et.forEach((e, i) => {
      if (longe(e.xi)) return;
      flecha(ctx, X(e.xi), Y(0), X(e.xi), Y(e.hi), COR.azul, e.pl < 0 ? [6, 5] : []);
      ctx.fillStyle = COR.azul; ctx.fillText(N > 1 ? `I${sub(i + 1)}` : "I", X(e.xi) + 8, Y(e.hi) + (e.hi >= 0 ? -8 : 16));
    });
    desenharPulsos(ctx, X, Y, this.raios.map(r => ({ pts: r, vs: r.slice(1).map(() => V0) })), this.t);
  },

  info() {
    const N = this.N;
    const natureza = (pl, A) => (longe(pl) ? "imagem no infinito" : `imagem ${pl > 0 ? "real" : "virtual"}, ${A < 0 ? "invertida" : "direita"}, ${tamanho(A)}`);
    const linhas = this.et.map((e, i) =>
      `L${N > 1 ? sub(i + 1) : ""} (f = ${sg(e.f)} m): p = ${longe(e.p) ? "∞" : f2(e.p)}${e.p < 0 ? " (obj. virtual)" : ""}   p′ = ${longe(e.pl) ? "∞" : sg(e.pl)}   A = ${longe(e.A) ? "∞" : sg(e.A)}   → ${natureza(e.pl, e.A)}`);
    if (N > 1) {
      const u = this.et[N - 1];
      linhas.push(`sistema: A total = ${longe(this.Atot) ? "∞" : sg(this.Atot)}   h′ = ${longe(this.Atot) ? "∞" : sg(this.Atot * this.h)} m   → ${natureza(u.pl, this.Atot)}`);
    }
    return linhas.join("\n") + (this.t === 0 ? "   (Iniciar: pulso de luz)" : "");
  },
};
