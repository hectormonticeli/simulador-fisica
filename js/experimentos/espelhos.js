import { COR, MARGEM, desenharGrade } from "../core/desenho.js";
import { LUZ, linha, seta, flecha, desenharPulsos } from "../core/optica.js";

const V0 = 8;   // velocidade do pulso de luz na animação (m/s do mundo)
const f2 = x => x.toFixed(2);
const sg = x => (x > 0 ? "+" : "") + f2(x);
const longe = x => Math.abs(x) > 1e5;   // "no infinito"
const tamanho = A => (Math.abs(Math.abs(A) - 1) < 0.005 ? "do mesmo tamanho" : Math.abs(A) > 1 ? "ampliada" : "reduzida");

export default {
  id: "espelhos",
  titulo: "Espelhos esféricos",
  categoria: "Óptica",
  // Referencial de Gauss: vértice V em x = 0, eixo principal em y = 0; a face refletora olha para a esquerda,
  // onde ficam o objeto (x = −p) e as imagens reais. f > 0: côncavo; f < 0: convexo.
  parametros: [
    { nome: "f", rotulo: "Distância focal f (m; + côncavo, − convexo)", min: -10, max: 10, valor: 3, passo: 0.1, limite: [-100, 100] },
    { nome: "p", rotulo: "Distância do objeto ao espelho p (m)", min: 0.5, max: 20, valor: 8, passo: 0.1, limite: [0.05, 200] },
    { nome: "h", rotulo: "Altura do objeto h (m)", min: 0.1, max: 5, valor: 1, passo: 0.1, limite: [0.01, 20] },
  ],

  reset(p) {
    const f = Math.abs(p.f) < 0.1 ? (p.f < 0 ? -0.1 : 0.1) : p.f, h = p.h, pp = p.p;
    const d = pp - f, inf = Math.abs(d) < 1e-3, pl = inf ? Infinity : f * pp / d, A = inf ? Infinity : -pl / pp;   // 1/f = 1/p + 1/p'
    Object.assign(this, { f, p: pp, h, inf, pl, A, R: 2 * Math.abs(f), Cx: -2 * f, sgn: Math.sign(f), t: 0, fim: false });

    // região mostrada
    const lim = x => Math.max(-70, Math.min(70, x));
    const xs = [-pp, 0, lim(-f), lim(-2 * f), ...(inf ? [] : [lim(-pl)])];
    const xmin = Math.min(...xs) - 2.5, xmax = Math.max(...xs) + 3;

    // raios principais, pelas alturas em que atingem o espelho: paralelo ao eixo, na direção de F,
    // na direção de C e o que bate no vértice. Todos os raios refletidos passam pela ponta da imagem I (ou parecem vir dela).
    const T = [-pp, h], I = inf ? null : [-pl, A * h], alturas = [h, 0];
    if (!inf) alturas.push(-h * f / d);
    if (Math.abs(pp - 2 * f) > 1e-3) alturas.push(-2 * h * f / (pp - 2 * f));
    this.raios = alturas.filter(y => Math.abs(y) <= 0.95 * this.R).map(y => {
      const Hp = [0, y];   // construção paraxial: a reflexão acontece no plano do vértice
      let dir = inf ? [-pp, -h] : pl > 0 ? [I[0] - Hp[0], I[1] - Hp[1]] : [Hp[0] - I[0], Hp[1] - I[1]];
      const n = Math.hypot(...dir); dir = [dir[0] / n, dir[1] / n];
      const L = dir[0] < -1e-6 ? Math.min(200, (xmin - Hp[0]) / dir[0]) : 30;
      return { pts: [T, Hp, [Hp[0] + dir[0] * L, Hp[1] + dir[1] * L]], dir, ext: !inf && pl < 0 ? [Hp, I] : null };
    });
    const ymax = Math.max(h, inf ? 0 : Math.min(Math.abs(A * h), 30), ...alturas.map(Math.abs).filter(v => v <= 0.95 * this.R));
    this.vista = { cx: (xmin + xmax) / 2, meiaL: Math.max(8, (xmax - xmin) / 2), meiaA: Math.min(60, Math.max(4, 1.4 * ymax)) };
  },

  step(dt) { this.t += dt; },

  draw(ctx, w, h) {
    const V = this.vista, M = MARGEM, aw = w - M.e - M.d, ah = h - M.t - M.b;
    const s = Math.min(aw / (2 * V.meiaL), ah / (2 * V.meiaA)), cx = M.e + aw / 2, cy = M.t + ah / 2;
    const X = x => cx + (x - V.cx) * s, Y = y => cy - y * s;
    ctx.clearRect(0, 0, w, h); ctx.font = "13px system-ui";
    desenharGrade(ctx, w, h, X(0), Y(0), s);   // o eixo horizontal desenhado é o eixo principal (a grade é de 1 m)

    // espelho (construção paraxial: linha no plano do vértice), com hachuras do lado de trás e pontas que indicam a curvatura:
    // ")" côncavo (as pontas voltam-se para o lado do objeto), "(" convexo
    const Ha = V.meiaA * 0.92, yt = Y(Ha), yb = Y(-Ha), xv = X(0), q = -this.sgn * 10;
    ctx.strokeStyle = COR.azul; ctx.lineWidth = 3; ctx.beginPath();
    ctx.moveTo(xv, yt); ctx.lineTo(xv, yb);
    ctx.moveTo(xv, yt + 14); ctx.lineTo(xv + q, yt); ctx.moveTo(xv, yb - 14); ctx.lineTo(xv + q, yb);
    ctx.stroke(); ctx.lineWidth = 1.2; ctx.globalAlpha = 0.6; ctx.beginPath();
    for (let k = 0; k <= 30; k++) { const py = yt + (yb - yt) * k / 30; ctx.moveTo(xv + 2, py); ctx.lineTo(xv + 10, py + 8); }
    ctx.stroke(); ctx.globalAlpha = 1;

    // pontos notáveis: vértice V, foco F e centro de curvatura C (atrás do espelho, se convexo)
    ctx.fillStyle = COR.texto; ctx.textAlign = "center";
    for (const [x, nome] of [[0, "V"], [-this.f, "F"], [-2 * this.f, "C"]]) { ctx.beginPath(); ctx.arc(X(x), Y(0), 3.5, 0, 2 * Math.PI); ctx.fill(); ctx.fillText(nome, X(x), Y(0) + 18); }
    ctx.textAlign = "start";

    // raios; tracejado: prolongamento (para trás do espelho) que forma a imagem virtual
    for (const r of this.raios) {
      linha(ctx, X, Y, r.pts, LUZ, 1.8, [], 0.85);
      seta(ctx, X, Y, r.pts[0], r.pts[1], LUZ); seta(ctx, X, Y, r.pts[1], r.pts[2], LUZ);
      if (r.ext) linha(ctx, X, Y, r.ext, LUZ, 1.2, [6, 5], 0.5);
    }

    // objeto (coral) e imagem (azul; tracejada se virtual)
    flecha(ctx, X(-this.p), Y(0), X(-this.p), Y(this.h), COR.coral);
    ctx.fillStyle = COR.coral; ctx.fillText("O", X(-this.p) + 8, Y(this.h) - 8);
    if (!this.inf && !longe(this.pl)) {
      flecha(ctx, X(-this.pl), Y(0), X(-this.pl), Y(this.A * this.h), COR.azul, this.pl < 0 ? [6, 5] : []);
      ctx.fillStyle = COR.azul; ctx.fillText("I", X(-this.pl) + 8, Y(this.A * this.h) + (this.A * this.h >= 0 ? -8 : 16));
    }
    desenharPulsos(ctx, X, Y, this.raios.map(r => ({ pts: r.pts, vs: [V0, V0] })), this.t);
  },

  info() {
    const { f, p, h, pl, A, inf } = this, tipo = f > 0 ? "côncavo" : "convexo";
    let contexto;
    if (f < 0) contexto = "espelho convexo: a imagem é sempre virtual, direita e reduzida";
    else if (Math.abs(p - 2 * f) < 1e-3) contexto = "objeto sobre o centro de curvatura C: imagem também em C";
    else if (inf) contexto = "objeto no foco F: os raios refletidos saem paralelos";
    else contexto = p > 2 * f ? "objeto além de C" : p > f ? "objeto entre F e C" : "objeto entre F e V: espelho de aumento";
    const natureza = inf ? "imagem no infinito" : `imagem ${pl > 0 ? "real" : "virtual"}, ${A < 0 ? "invertida" : "direita"}, ${tamanho(A)}`;
    const aviso = h > 0.25 * this.R ? "   ⚠ h grande em relação a R: a aproximação de Gauss perde precisão" : "";
    return `espelho ${tipo} (f = ${sg(f)} m, R = 2f = ${sg(2 * f)} m)   p = ${f2(p)} m   p′ = ${inf ? "∞" : sg(pl)} m\n`
      + `h = ${f2(h)} m   h′ = ${inf ? "∞" : sg(A * h)} m   A = −p′/p = ${inf ? "∞" : sg(A)}${aviso}\n`
      + `${natureza}   (${contexto})${this.t === 0 ? "   (Iniciar: pulso de luz)" : ""}`;
  },
};
