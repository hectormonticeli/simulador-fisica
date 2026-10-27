import { COR, MARGEM } from "../core/desenho.js";
import { LUZ } from "../core/optica.js";

const NOMES = ["", "Carga do capacitor", "Descarga do capacitor", "Fonte de onda quadrada (0 e +ε)", "Fonte de onda quadrada (+ε e −ε)"];
function passoBom(x) { const e = 10 ** Math.floor(Math.log10(x)), m = x / e; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * e; }
function eng(v, u) {   // valor com prefixo do SI (n, µ, m, k, M)
  const a = Math.abs(v);
  const [f, p] = a >= 1e6 ? [1e-6, "M"] : a >= 1e3 ? [1e-3, "k"] : a >= 1 || a === 0 ? [1, ""] : a >= 1e-3 ? [1e3, "m"] : a >= 1e-6 ? [1e6, "µ"] : [1e9, "n"];
  return `${(v * f).toPrecision(3)} ${p}${u}`;
}

export default {
  id: "rc",
  titulo: "Circuito RC",
  categoria: "Eletricidade",
  // O tempo é medido em constantes de tempo τ = RC; "escala" diz quantos segundos de tela dura cada τ.
  parametros: [
    { nome: "modo", rotulo: "Modo (1 carga, 2 descarga, 3 onda quadrada 0 e +ε, 4 onda quadrada +ε e −ε)", min: 1, max: 4, valor: 1, passo: 1 },
    { nome: "eps", rotulo: "Fonte ε (V)", min: 1, max: 50, valor: 10, passo: 0.5, limite: [0.1, 1000] },
    { nome: "R", rotulo: "Resistência R (Ω)", min: 10, max: 10000, valor: 1000, passo: 10, limite: [0.1, 1e7] },
    { nome: "C", rotulo: "Capacitância C (µF)", min: 1, max: 1000, valor: 100, passo: 1, limite: [0.001, 1e6] },
    { nome: "V0", rotulo: "Tensão inicial do capacitor V₀ (V) (na descarga, 0 = totalmente carregado)", min: -50, max: 50, valor: 0, passo: 0.5, limite: [-1000, 1000] },
    { nome: "Tper", rotulo: "Período da onda quadrada (em τ; modos 3 e 4)", min: 0.5, max: 20, valor: 4, passo: 0.1, limite: [0.01, 1000] },
    { nome: "nt", rotulo: "Duração da simulação (em constantes de tempo τ)", min: 1, max: 20, valor: 5, passo: 0.5, limite: [0.1, 1000] },
    { nome: "escala", rotulo: "Duração de 1 τ na tela (s)", min: 0.5, max: 10, valor: 2, passo: 0.1, limite: [0.05, 60] },
  ],

  // Tensão da fonte (V) no instante x (em τ)
  fonte(x) {
    if (this.modo === 1) return this.eps;
    if (this.modo === 2) return 0;
    const par = Math.floor(x / this.meio) % 2 === 0;
    return this.modo === 3 ? (par ? this.eps : 0) : (par ? this.eps : -this.eps);
  },

  // Avança V_C de x0 a x1 de forma EXATA: com a fonte constante (E), V(x) = E − (E − V₀)·e^(−x). A fonte pode mudar no meio do caminho.
  // Se "acc" for dado, acumula a energia fornecida pela fonte e a dissipada em R.
  avancar(x0, V, x1, acc) {
    const h = this.meio;
    while (x1 - x0 > 1e-12) {
      const prox = h === Infinity ? Infinity : (Math.floor(x0 / h + 1e-9) + 1) * h;
      const fim = Math.min(x1, prox), E = this.fonte((x0 + fim) / 2), dx = fim - x0, u = E - V, Vn = E - u * Math.exp(-dx);
      if (acc) { acc.fonte += E * this.C * (Vn - V); acc.res += 0.5 * this.C * u * u * (1 - Math.exp(-2 * dx)); }
      V = Vn; x0 = fim;
    }
    return V;
  },

  reset(p) {
    const modo = Math.round(p.modo), C = p.C * 1e-6, V0 = modo === 2 && p.V0 === 0 ? p.eps : p.V0;
    Object.assign(this, { modo, eps: p.eps, R: p.R, C, tau: p.R * C, nt: p.nt, escala: p.escala, meio: modo >= 3 ? p.Tper / 2 : Infinity,
      V0, x: 0, V: V0, ac: { fonte: 0, res: 0 }, fase: 0, t: 0, fim: false, duracao: p.nt * p.escala });
    this.iref = (modo === 4 ? 2 : 1) * Math.max(Math.abs(p.eps - V0), Math.abs(V0), Math.abs(p.eps)) / p.R;

    // curva de referência (trajetória completa), para o gráfico
    const N = Math.min(20000, Math.max(400, Math.ceil(p.nt / (modo >= 3 ? this.meio / 10 : 1 / 8)))), dx = p.nt / N;
    const xs = [], vc = [], vr = [], e = []; let V = V0;
    for (let k = 0; k <= N; k++) { const x = k * dx, E = this.fonte(x + 1e-9); xs.push(x); vc.push(V); e.push(E); vr.push(E - V); V = this.avancar(x, V, x + dx, null); }
    this.ref = { N, xs, vc, vr, e };
    const all = [...vc, ...vr, ...e];
    Object.assign(this, { Vbar: Math.max(1e-9, ...all.map(Math.abs)), Vcmax: Math.max(1e-9, ...vc.map(Math.abs)), ymax: Math.max(0, ...all), ymin: Math.min(0, ...all) });
  },

  step(dt) {
    if (this.fim) return;
    const x1 = Math.min(this.nt, this.x + dt / this.escala);
    this.V = this.avancar(this.x, this.V, x1, this.ac);
    this.x = x1; this.t += dt;
    this.fase += (this.fonte(x1 - 1e-9) - this.V) / this.R / this.iref * 160 * dt;   // os "elétrons" andam conforme a corrente
    if (x1 >= this.nt) this.fim = true;
  },

  draw(ctx, w, h) {
    const M = MARGEM, x0 = M.e, x1 = w - M.d, y0 = M.t, y1 = h - M.b, aw = x1 - x0, ah = y1 - y0;
    ctx.clearRect(0, 0, w, h); ctx.font = "12px system-ui"; ctx.lineCap = "round"; ctx.lineJoin = "round";
    const E = this.fonte(this.x + 1e-9), V = this.V, iN = (E - V) / this.R / this.iref;

    // ---- circuito (esquerda): fonte, resistor e capacitor em série ----
    const Wc = Math.min(0.34 * aw, 340), Hc = Math.min(0.38 * ah, 200), cxm = x0 + 0.24 * aw, cyc = y0 + 0.40 * ah, ym = cyc;
    const xl = cxm - Wc / 2, xr = cxm + Wc / 2, yt = cyc - Hc / 2, yb = cyc + Hc / 2, xa = cxm - 0.17 * Wc, xb = cxm + 0.17 * Wc;
    ctx.fillStyle = `rgba(232,168,124,${0.5 * Math.min(1, iN * iN)})`; ctx.fillRect(xa - 6, yt - 14, xb - xa + 12, 28);   // o resistor "esquenta" com i²
    ctx.strokeStyle = COR.texto; ctx.lineWidth = 2.5; ctx.beginPath();
    if (E === 0) { ctx.moveTo(xl, yt); ctx.lineTo(xl, yb); } else { ctx.moveTo(xl, yt); ctx.lineTo(xl, ym - 7); ctx.moveTo(xl, ym + 7); ctx.lineTo(xl, yb); }
    ctx.moveTo(xl, yt); ctx.lineTo(xa, yt);
    for (let k = 0; k < 6; k++) ctx.lineTo(xa + (xb - xa) * (k + 0.5) / 6, yt + (k % 2 ? 9 : -9));
    ctx.lineTo(xb, yt); ctx.lineTo(xr, yt);
    ctx.moveTo(xr, yt); ctx.lineTo(xr, ym - 7); ctx.moveTo(xr, ym + 7); ctx.lineTo(xr, yb); ctx.moveTo(xr, yb); ctx.lineTo(xl, yb);
    ctx.stroke();
    ctx.lineWidth = 3.5; ctx.beginPath();   // placas do capacitor
    ctx.moveTo(xr - 19, ym - 7); ctx.lineTo(xr + 19, ym - 7); ctx.moveTo(xr - 19, ym + 7); ctx.lineTo(xr + 19, ym + 7);
    if (E !== 0) {   // placas da fonte: a maior é o polo positivo
      const cima = E > 0;
      ctx.moveTo(xl - (cima ? 17 : 9), ym - 7); ctx.lineTo(xl + (cima ? 17 : 9), ym - 7);
      ctx.moveTo(xl - (cima ? 9 : 17), ym + 7); ctx.lineTo(xl + (cima ? 9 : 17), ym + 7);
    }
    ctx.stroke();
    ctx.textAlign = "center"; ctx.font = "bold 12px system-ui";   // cargas nas placas do capacitor
    const nc = Math.round(Math.abs(V) / this.Vcmax * 7);
    for (let k = 0; k < nc; k++) {
      ctx.fillStyle = V > 0 ? COR.coral : COR.azul; ctx.fillText(V > 0 ? "+" : "−", xr - 15 + k * 5, ym - 12);
      ctx.fillStyle = V > 0 ? COR.azul : COR.coral; ctx.fillText(V > 0 ? "−" : "+", xr - 15 + k * 5, ym + 22);
    }
    ctx.font = "12px system-ui";
    if (Math.abs(iN) > 1e-3) {   // cargas em movimento ao longo do circuito (sentido horário = corrente positiva)
      const camL = 2 * Wc + 2 * Hc;
      const ponto = s => { s = ((s % camL) + camL) % camL; if (s < Wc) return [xl + s, yt]; s -= Wc; if (s < Hc) return [xr, yt + s]; s -= Hc; if (s < Wc) return [xr - s, yb]; s -= Wc; return [xl, yb - s]; };
      ctx.fillStyle = LUZ;
      for (let s = 0; s < camL; s += 26) {
        const [px, py] = ponto(s + this.fase);
        if ((px === xr || (px === xl && E !== 0)) && Math.abs(py - ym) < 12) continue;   // não passam pela "abertura" do capacitor nem da fonte
        ctx.beginPath(); ctx.arc(px, py, 3.2, 0, 2 * Math.PI); ctx.fill();
      }
    }
    ctx.fillStyle = COR.texto;
    ctx.fillText(`R = ${eng(this.R, "Ω")}`, cxm, yt - 24);
    ctx.textAlign = "left"; ctx.fillText(`C = ${eng(this.C, "F")}`, xr + 26, ym + 4);
    ctx.textAlign = "right"; ctx.fillText(E === 0 ? "ε = 0 (em curto)" : `ε = ${eng(E, "V")}`, xl - 26, ym + 4);

    // lei das malhas: barra empilhada V_C + V_R = ε
    const yk = yb + 62, Xk = v => cxm + v * (Wc / 2) / this.Vbar;
    ctx.fillStyle = COR.azul; ctx.fillRect(Math.min(Xk(0), Xk(V)), yk, Math.abs(Xk(V) - Xk(0)), 14);
    ctx.fillStyle = COR.coral; ctx.fillRect(Math.min(Xk(V), Xk(E)), yk, Math.abs(Xk(E) - Xk(V)), 14);
    ctx.strokeStyle = COR.eixo; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(Xk(0), yk - 5); ctx.lineTo(Xk(0), yk + 19); ctx.stroke();
    ctx.fillStyle = COR.texto; ctx.textAlign = "center";
    ctx.fillText(`lei das malhas:  ε = V_R + V_C  →  ${E.toFixed(2)} = ${(E - V).toFixed(2)} + ${V.toFixed(2)} V`, cxm, yk - 12);
    ctx.fillText("azul: V_C (capacitor)    coral: V_R (resistor)", cxm, yk + 36);

    // ---- gráfico das tensões em função de t/τ (direita) ----
    const gx0 = x0 + 0.50 * aw + 40, gx1 = x1 - 12, gy0 = y0 + 28, gy1 = y1 - 40, rg = this.ref;
    const sp = (this.ymax - this.ymin) || 1, ylo = this.ymin - 0.06 * sp, yhi = this.ymax + 0.08 * sp;
    const Xg = x => gx0 + x / this.nt * (gx1 - gx0), Yg = v => gy1 - (v - ylo) / (yhi - ylo) * (gy1 - gy0);
    ctx.lineWidth = 1; ctx.strokeStyle = COR.grade;
    const px = passoBom(this.nt / 6), pv = passoBom((yhi - ylo) / 5);
    for (let x = 0; x <= this.nt + 1e-9; x += px) { ctx.beginPath(); ctx.moveTo(Xg(x), gy0); ctx.lineTo(Xg(x), gy1); ctx.stroke(); ctx.fillStyle = COR.texto; ctx.fillText(`${+x.toPrecision(3)}τ`, Xg(x), gy1 + 16); }
    ctx.textAlign = "right";
    for (let v = Math.ceil(ylo / pv) * pv; v <= yhi; v += pv) { ctx.strokeStyle = COR.grade; ctx.beginPath(); ctx.moveTo(gx0, Yg(v)); ctx.lineTo(gx1, Yg(v)); ctx.stroke(); ctx.fillStyle = COR.texto; ctx.fillText(`${+v.toPrecision(3)}`, gx0 - 6, Yg(v) + 4); }
    ctx.strokeStyle = COR.eixo; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(gx0, gy0); ctx.lineTo(gx0, gy1); ctx.moveTo(gx0, Yg(0)); ctx.lineTo(gx1, Yg(0)); ctx.stroke();
    ctx.textAlign = "center"; ctx.fillStyle = COR.texto; ctx.fillText("t / τ", (gx0 + gx1) / 2, gy1 + 32);
    ctx.textAlign = "left"; ctx.fillText("tensão (V)", gx0 - 40, gy0 - 10);
    ctx.fillStyle = COR.azul; ctx.fillText("V_C", gx0 + 10, gy0 + 14); ctx.fillStyle = COR.coral; ctx.fillText("V_R", gx0 + 44, gy0 + 14); ctx.fillStyle = COR.texto; ctx.fillText("ε (fonte)", gx0 + 80, gy0 + 14);

    const rota = (arr, ate, extra) => { ctx.beginPath(); for (let k = 0; k <= ate; k++) (k ? ctx.lineTo : ctx.moveTo).call(ctx, Xg(rg.xs[k]), Yg(arr[k])); if (extra) ctx.lineTo(Xg(extra[0]), Yg(extra[1])); };
    ctx.save(); ctx.beginPath(); ctx.rect(gx0, gy0, gx1 - gx0, gy1 - gy0); ctx.clip();
    ctx.setLineDash([4, 4]); ctx.strokeStyle = COR.texto; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.5; ctx.beginPath();   // fonte (degraus)
    if (this.modo < 3) { ctx.moveTo(Xg(0), Yg(E === 0 && this.modo === 1 ? 0 : this.fonte(0))); ctx.lineTo(Xg(this.nt), Yg(this.fonte(0))); }
    else for (let k = 0, xk = 0; xk < this.nt && k < 4000; k++, xk += this.meio) { const v = this.fonte(xk + 1e-9); ctx.moveTo(Xg(xk), Yg(v)); ctx.lineTo(Xg(Math.min(this.nt, xk + this.meio)), Yg(v)); }
    ctx.stroke();
    ctx.globalAlpha = 0.35; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5;   // previsão (tracejada)
    ctx.strokeStyle = COR.azul; rota(rg.vc, rg.N); ctx.stroke(); ctx.strokeStyle = COR.coral; rota(rg.vr, rg.N); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.lineWidth = 2.6;           // já percorrido (cheio)
    const j = Math.min(rg.N, Math.floor(this.x / this.nt * rg.N));
    ctx.strokeStyle = COR.azul; rota(rg.vc, j, [this.x, V]); ctx.stroke(); ctx.strokeStyle = COR.coral; rota(rg.vr, j, [this.x, E - V]); ctx.stroke();
    ctx.restore();
    if (this.modo <= 2 && this.nt >= 1) {   // a "regra do τ": após 1 τ o capacitor percorreu 63,2% do caminho
      const V1 = this.avancar(0, this.V0, 1, null), frac = this.modo === 1 ? (V1 - this.V0) / (this.eps - this.V0) : V1 / this.V0;
      if (Number.isFinite(frac)) { ctx.strokeStyle = COR.azul; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(Xg(1), Yg(V1), 5, 0, 2 * Math.PI); ctx.stroke(); ctx.fillStyle = COR.azul; ctx.textAlign = "left"; ctx.fillText(`1τ: ${(100 * frac).toFixed(1)}%`, Xg(1) + 9, Yg(V1) + 16); }
    }
    ctx.fillStyle = "#e8ebf1"; ctx.beginPath(); ctx.arc(Xg(this.x), Yg(V), 4.5, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = COR.coral; ctx.beginPath(); ctx.arc(Xg(this.x), Yg(E - V), 4.5, 0, 2 * Math.PI); ctx.fill();
    ctx.textAlign = "start";
  },

  info() {
    const E = this.fonte(this.x + 1e-9), V = this.V, i = (E - V) / this.R, ac = this.ac;
    const l1 = `${NOMES[this.modo]}   R = ${eng(this.R, "Ω")}   C = ${eng(this.C, "F")}   τ = RC = ${eng(this.tau, "s")}   t = ${eng(this.x * this.tau, "s")} = ${this.x.toFixed(2)} τ${this.fim ? " (fim)" : ""}`;
    const l2 = `V_C = ${V.toFixed(2)} V   V_R = ${(E - V).toFixed(2)} V   i = ${eng(i, "A")}   carga Q = C·V_C = ${eng(this.C * V, "C")}`;
    const l3 = `energia: fornecida pela fonte = ${eng(ac.fonte, "J")}   dissipada em R = ${eng(ac.res, "J")}   armazenada em C = ${eng(0.5 * this.C * V * V, "J")}`;
    let l4;
    if (this.modo <= 2) l4 = `regra do τ: após 1τ, 2τ, 3τ e 5τ o capacitor percorreu 63%, 86%, 95% e 99% do caminho até ${this.modo === 1 ? `ε = ${this.eps} V` : "zero"}`;
    else {
      const e = Math.exp(-this.meio), vmax = this.modo === 3 ? this.eps / (1 + e) : this.eps * (1 - e) / (1 + e), vmin = this.modo === 3 ? this.eps * e / (1 + e) : -vmax;
      l4 = `regime permanente (meio período = ${this.meio.toFixed(2)} τ): V_C oscila entre ${vmin.toFixed(2)} V e ${vmax.toFixed(2)} V`;
    }
    return [l1, l2, l3, l4].join("\n");
  },
};
