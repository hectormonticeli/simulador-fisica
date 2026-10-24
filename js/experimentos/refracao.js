import { COR, MARGEM, desenharGrade } from "../core/desenho.js";
import { LUZ, linha, seta, desenharPulsos } from "../core/optica.js";

const V0 = 4, L = 7, RAD = Math.PI / 180;   // V0: velocidade "da luz no vácuo" na animação (m/s do mundo); L: comprimento dos raios
const f2 = x => x.toFixed(2);
const alfa = n => Math.min(0.4, 0.03 + 0.1 * (n - 1));   // meios mais refringentes ficam mais "carregados"

export default {
  id: "refracao",
  titulo: "Refração da luz (lei de Snell)",
  categoria: "Óptica",
  parametros: [
    { nome: "n1", rotulo: "Índice de refração n₁ (meio de cima)", min: 1, max: 3, valor: 1, passo: 0.01, limite: [1, 10] },
    { nome: "n2", rotulo: "Índice de refração n₂ (meio de baixo)", min: 1, max: 3, valor: 1.5, passo: 0.01, limite: [1, 10] },
    { nome: "th1", rotulo: "Ângulo de incidência θ₁ (°)", min: 0, max: 89, valor: 40, passo: 0.5, limite: [0, 89.9] },
    { nome: "esp", rotulo: "Espessura da lâmina (m; 0 = uma só interface)", min: 0, max: 5, valor: 0, passo: 0.1, limite: [0, 10] },
  ],

  // Geometria: a interface é y = 0 e a normal é o eixo y. O raio incidente chega da esquerda, por cima.
  reset(p) {
    const th1 = p.th1 * RAD, sin2 = p.n1 * Math.sin(th1) / p.n2;
    Object.assign(this, { n1: p.n1, n2: p.n2, th1, esp: p.esp, t: 0, fim: false, tir: sin2 > 1 });
    this.th2 = this.tir ? 0 : Math.asin(sin2);
    this.crit = p.n1 > p.n2 ? Math.asin(p.n2 / p.n1) : null;   // ângulo crítico (só existe se n1 > n2)
    const s1 = Math.sin(th1), c1 = Math.cos(th1), s2 = Math.sin(this.th2), c2 = Math.cos(this.th2);
    const A = [-L * s1, L * c1], O = [0, 0];
    this.inc = [A, O];
    this.refl = [O, [L * s1, L * c1]];
    if (this.tir) this.refr = null;
    else if (!p.esp) this.refr = [O, [L * s2, -L * c2]];
    else {   // lâmina de faces paralelas, com n1 dos dois lados: o raio sai paralelo ao incidente
      const P1 = [p.esp * Math.tan(this.th2), -p.esp];
      this.refr = [O, P1, [P1[0] + L * s1, P1[1] - L * c1]];
    }
    this.desvio = p.esp && !this.tir ? p.esp * Math.sin(th1 - this.th2) / c2 : 0;   // desvio lateral
    const xmax = this.refr ? Math.abs(this.refr[this.refr.length - 1][0]) + 1 : 0;
    this.vista = { cy: -p.esp / 2, meiaL: Math.max(9, xmax), meiaA: Math.max(5, p.esp / 2 + 4) };
  },

  step(dt) { this.t += dt; },   // só a animação do pulso de luz depende do tempo

  draw(ctx, w, h) {
    const V = this.vista, M = MARGEM, aw = w - M.e - M.d, ah = h - M.t - M.b;
    const s = Math.min(aw / (2 * V.meiaL), ah / (2 * V.meiaA)), cx = M.e + aw / 2, cy = M.t + ah / 2;
    const X = x => cx + x * s, Y = y => cy - (y - V.cy) * s, e = this.esp;
    ctx.clearRect(0, 0, w, h);

    // meios: o tom indica o índice de refração
    ctx.fillStyle = `rgba(127,178,229,${alfa(this.n1)})`; ctx.fillRect(0, 0, w, Y(0));
    ctx.fillStyle = `rgba(127,178,229,${alfa(this.n2)})`; ctx.fillRect(0, Y(0), w, e ? Y(-e) - Y(0) : h);
    if (e) { ctx.fillStyle = `rgba(127,178,229,${alfa(this.n1)})`; ctx.fillRect(0, Y(-e), w, h - Y(-e)); }
    desenharGrade(ctx, w, h, X(0), Y(0), s);   // os eixos desenhados são a interface (y = 0) e a normal (x = 0)
    if (e) {
      ctx.strokeStyle = COR.eixo; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, Y(-e)); ctx.lineTo(w, Y(-e)); ctx.stroke();
      if (this.refr) { const x1 = X(this.refr[1][0]); ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(x1, Y(-e) - 60); ctx.lineTo(x1, Y(-e) + 60); ctx.stroke(); ctx.setLineDash([]); }
      linha(ctx, X, Y, [[0, 0], [L * Math.sin(this.th1), -L * Math.cos(this.th1)]], COR.texto, 1.5, [6, 6], 0.6);   // prolongamento do incidente (sem lâmina)
    }

    // raios
    linha(ctx, X, Y, this.inc, LUZ, 2.5); seta(ctx, X, Y, ...this.inc, LUZ);
    const aRefl = this.tir ? 1 : 0.35;
    linha(ctx, X, Y, this.refl, LUZ, this.tir ? 2.5 : 1.5, [], aRefl); seta(ctx, X, Y, ...this.refl, LUZ, aRefl);
    if (this.refr) {
      linha(ctx, X, Y, this.refr, LUZ, 2.5);
      this.refr.slice(1).forEach((p, i) => seta(ctx, X, Y, this.refr[i], p, LUZ));
    }

    // arcos e rótulos dos ângulos
    ctx.font = "13px system-ui"; ctx.fillStyle = COR.texto; ctx.strokeStyle = COR.texto; ctx.lineWidth = 1.2; ctx.textAlign = "center";
    const r = 1.4 * s, a1 = Math.atan2(-Math.cos(this.th1), -Math.sin(this.th1));
    ctx.beginPath(); ctx.arc(X(0), Y(0), r, a1, -Math.PI / 2); ctx.stroke();
    const m1 = (a1 - Math.PI / 2) / 2; ctx.fillText(`θ₁ = ${(this.th1 / RAD).toFixed(1)}°`, X(0) + (r + 30) * Math.cos(m1), Y(0) + (r + 14) * Math.sin(m1));
    if (!this.tir) {
      const a2 = Math.atan2(Math.cos(this.th2), Math.sin(this.th2));
      ctx.beginPath(); ctx.arc(X(0), Y(0), r, a2, Math.PI / 2); ctx.stroke();
      const m2 = (a2 + Math.PI / 2) / 2; ctx.fillText(`θ₂ = ${(this.th2 / RAD).toFixed(1)}°`, X(0) + (r + 30) * Math.cos(m2), Y(0) + (r + 14) * Math.sin(m2));
    }
    ctx.textAlign = "start";
    ctx.fillText(`n₁ = ${f2(this.n1)}`, X(-V.meiaL) + 10, Y(0) - 10);
    ctx.fillText(`n₂ = ${f2(this.n2)}`, X(-V.meiaL) + 10, Y(0) + 20);

    // pulso de luz: mais lento no meio de maior índice (v = c/n)
    const v1 = V0 / this.n1, v2 = V0 / this.n2, A = this.inc[0], O = this.inc[1];
    const cam = [{ pts: [A, O, this.refl[1]], vs: [v1, v1], alfa: aRefl }];
    if (this.refr) cam.push({ pts: [A, O, ...this.refr.slice(1)], vs: [v1, v2, v1] });
    desenharPulsos(ctx, X, Y, cam, this.t);
  },

  info() {
    const n1 = this.n1, n2 = this.n2, g = x => (x / RAD).toFixed(1);
    const l1 = this.tir
      ? `θ₁ = ${g(this.th1)}°   reflexão total: θ₁ > ângulo crítico (${g(this.crit)}°)`
      : `θ₁ = ${g(this.th1)}°   θ₂ = ${g(this.th2)}°   n₁·sen θ₁ = ${(n1 * Math.sin(this.th1)).toFixed(3)}   n₂·sen θ₂ = ${(n2 * Math.sin(this.th2)).toFixed(3)}`;
    const l2 = `v₁ = c/n₁ = ${(3 / n1).toFixed(2)}×10⁸ m/s   v₂ = c/n₂ = ${(3 / n2).toFixed(2)}×10⁸ m/s`;
    const l3 = (this.crit ? `ângulo crítico = ${g(this.crit)}°` : "n₂ ≥ n₁: não há reflexão total")
      + (this.esp && !this.tir ? `   desvio lateral = ${f2(this.desvio)} m` : "")
      + (this.t === 0 ? "   (Iniciar: pulso de luz)" : "");
    return `${l1}\n${l2}\n${l3}`;
  },
};
