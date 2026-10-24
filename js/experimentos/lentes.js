import { COR, MARGEM, desenharGrade } from "../core/desenho.js";
import { LUZ, linha, seta, flecha, desenharPulsos } from "../core/optica.js";

const V0 = 8;   // velocidade do pulso de luz na animação (m/s do mundo)
const f2 = x => x.toFixed(2);
const sg = x => (x > 0 ? "+" : "") + f2(x);

export default {
  id: "lentes",
  titulo: "Lentes delgadas",
  categoria: "Óptica",
  parametros: [
    { nome: "f", rotulo: "Distância focal f (m; + convergente, − divergente)", min: -10, max: 10, valor: 3, passo: 0.1, limite: [-100, 100] },
    { nome: "p", rotulo: "Distância do objeto p (m)", min: 0.5, max: 20, valor: 6, passo: 0.1, limite: [0.05, 200] },
    { nome: "h", rotulo: "Altura do objeto h (m)", min: 0.1, max: 5, valor: 1, passo: 0.1, limite: [0.01, 20] },
  ],

  // Referencial de Gauss: lente em x = 0, eixo óptico em y = 0, objeto real à esquerda (x = −p).
  reset(p) {
    const f = Math.abs(p.f) < 0.1 ? (p.f < 0 ? -0.1 : 0.1) : p.f;   // evita f = 0
    const d = p.p - f, h = p.h;
    Object.assign(this, { f, p: p.p, h, t: 0, fim: false, inf: Math.abs(d) < 1e-3 });
    this.pl = this.inf ? Infinity : f * p.p / d;   // equação de Gauss: 1/f = 1/p + 1/p'
    this.A = this.inf ? Infinity : -this.pl / p.p;
    this.hl = this.A * h;
    const pl = this.inf ? 0 : Math.min(Math.abs(this.pl), 60), hl = this.inf ? 0 : Math.min(Math.abs(this.hl), 30);
    this.vista = { meiaL: Math.max(8, p.p + 2, 2 * Math.abs(f) + 1, pl + 2), meiaA: Math.max(4, h * 1.7, hl * 1.4) };

    // os três raios principais: [ponta do objeto, ponto na lente, ponto final à direita]
    const xm = this.vista.meiaL, T = [-p.p, h], sgn = Math.sign(f);
    const r1 = [T, [0, h], [xm, h - sgn * h * xm / (sgn * f)]];   // paralelo ao eixo: sai na direção de F' (ou parece vir dele)
    const r2 = [T, [0, 0], [xm, -h * xm / p.p]];                  // pelo centro óptico: não desvia
    this.raios = [r1, r2];
    if (!this.inf) { const y3 = -h * f / d; this.raios.push([T, [0, y3], [xm, y3]]); }   // pelo foco do objeto: sai paralelo
  },

  step(dt) { this.t += dt; },

  draw(ctx, w, h) {
    const V = this.vista, M = MARGEM, aw = w - M.e - M.d, ah = h - M.t - M.b;
    const s = Math.min(aw / (2 * V.meiaL), ah / (2 * V.meiaA)), cx = M.e + aw / 2, cy = M.t + ah / 2;
    const X = x => cx + x * s, Y = y => cy - y * s;
    ctx.clearRect(0, 0, w, h);
    desenharGrade(ctx, w, h, X(0), Y(0), s);   // o eixo horizontal desenhado é o eixo óptico

    // lente: linha vertical com pontas para fora (convergente) ou para dentro (divergente)
    const H = V.meiaA * 0.92, yt = Y(H), yb = Y(-H), xl = X(0), conv = this.f > 0;
    ctx.strokeStyle = COR.azul; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(xl, yt); ctx.lineTo(xl, yb);
    ctx.moveTo(xl - 7, conv ? yt + 11 : yt); ctx.lineTo(xl, conv ? yt : yt + 11); ctx.lineTo(xl + 7, conv ? yt + 11 : yt);
    ctx.moveTo(xl - 7, conv ? yb - 11 : yb); ctx.lineTo(xl, conv ? yb : yb - 11); ctx.lineTo(xl + 7, conv ? yb - 11 : yb);
    ctx.stroke();

    // focos: F (lado do objeto) e F' (lado da imagem)
    ctx.fillStyle = COR.texto; ctx.font = "13px system-ui"; ctx.textAlign = "center";
    for (const [x, nome] of [[-this.f, "F"], [this.f, "F′"]]) {
      ctx.beginPath(); ctx.arc(X(x), Y(0), 3.5, 0, 2 * Math.PI); ctx.fill(); ctx.fillText(nome, X(x), Y(0) + 18);
    }
    ctx.textAlign = "start";

    // raios; para imagem virtual, os prolongamentos tracejados (para trás) encontram a ponta da imagem
    const virtual = !this.inf && this.pl < 0;
    for (const r of this.raios) {
      linha(ctx, X, Y, r, LUZ, 1.8, [], 0.85);
      seta(ctx, X, Y, r[0], r[1], LUZ); seta(ctx, X, Y, r[1], r[2], LUZ);
      if (virtual) linha(ctx, X, Y, [r[1], [this.pl, this.hl]], LUZ, 1.2, [6, 5], 0.55);
    }

    // objeto (coral) e imagem (azul; tracejada se virtual)
    flecha(ctx, X(-this.p), Y(0), X(-this.p), Y(this.h), COR.coral);
    if (!this.inf) flecha(ctx, X(this.pl), Y(0), X(this.pl), Y(this.hl), COR.azul, virtual ? [6, 5] : []);

    desenharPulsos(ctx, X, Y, this.raios.map(r => ({ pts: r, vs: [V0, V0] })), this.t);
  },

  info() {
    const f = this.f, A = this.A;
    if (this.inf) return `f = ${sg(f)} m   p = ${f2(this.p)} m = f   p′ = ∞\nobjeto no foco: os raios emergem paralelos\n1/f = 1/p + 1/p′`;
    const tipo = this.pl > 0 ? "real" : "virtual", ori = A < 0 ? "invertida" : "direita";
    const tam = Math.abs(Math.abs(A) - 1) < 0.005 ? "do mesmo tamanho" : Math.abs(A) > 1 ? "ampliada" : "reduzida";
    return `f = ${sg(f)} m (${f > 0 ? "convergente" : "divergente"})   p = ${f2(this.p)} m   p′ = ${sg(this.pl)} m\n`
      + `h = ${f2(this.h)} m   h′ = ${sg(this.hl)} m   A = −p′/p = ${sg(A)}\n`
      + `imagem ${tipo}, ${ori}, ${tam}${this.t === 0 ? "   (Iniciar: pulso de luz)" : ""}`;
  },
};
