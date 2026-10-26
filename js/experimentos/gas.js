import { COR, MARGEM } from "../core/desenho.js";

const R = 8.314, ATM = 101325, NP = 60;   // R em J/(mol·K); 1 atm em Pa; NP: partículas da ilustração
const NOMES = ["", "Isotérmica", "Isobárica", "Isocórica", "Adiabática", "Ciclo de Carnot"];
const GASES = [null, { nome: "monoatômico", k: 1.5 }, { nome: "diatômico", k: 2.5 }, { nome: "poliatômico", k: 3 }];   // k: Cv = k·R
const COR_PROC = ["", COR.azul, COR.coral, "#9fd3a8", "#c3a6e8", "#f4e3a1"];
const J = x => (x > 0 ? "+" : "") + Math.round(x);

function passoBom(x) { const e = 10 ** Math.floor(Math.log10(x)), m = x / e; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * e; }
function mulberry32(a) {   // gerador pseudoaleatório com semente: a ilustração é sempre a mesma
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export default {
  id: "gas",
  titulo: "Transformações do gás ideal",
  categoria: "Termodinâmica",
  series: ["Calor Q (J)", "Trabalho W (J)", "Variação de energia interna ΔU (J)"],
  parametros: [
    { nome: "proc", rotulo: "Processo (1 isotérmica, 2 isobárica, 3 isocórica, 4 adiabática, 5 ciclo de Carnot)", min: 1, max: 5, valor: 1, passo: 1 },
    { nome: "gas", rotulo: "Gás (1 monoatômico, 2 diatômico, 3 poliatômico)", min: 1, max: 3, valor: 1, passo: 1 },
    { nome: "n", rotulo: "Quantidade de gás n (mol)", min: 0.1, max: 5, valor: 1, passo: 0.1, limite: [0.001, 100] },
    { nome: "T1", rotulo: "Temperatura inicial T₁ (K) (Carnot: fonte quente)", min: 100, max: 1000, valor: 300, passo: 10, limite: [1, 5000] },
    { nome: "V1", rotulo: "Volume inicial V₁ (L)", min: 1, max: 50, valor: 10, passo: 0.5, limite: [0.01, 1000] },
    { nome: "V2", rotulo: "Volume final V₂ (L) (Carnot: fim da expansão isotérmica)", min: 1, max: 100, valor: 30, passo: 0.5, limite: [0.01, 1000] },
    { nome: "T2", rotulo: "Temperatura final T₂ (K), só isocórica (Carnot: fonte fria)", min: 100, max: 1000, valor: 600, passo: 10, limite: [1, 5000] },
    { nome: "dur", rotulo: "Duração do processo (s)", min: 2, max: 60, valor: 10, passo: 1, limite: [0.5, 3600] },
  ],

  // Estados do gás em função do progresso s (0 a 1). V em L, T em K, Pa em pascal.
  estado(s) {
    const { proc, V1, V2, T1, T2, g } = this, lin = (a, b, f) => a + (b - a) * f;
    let V, T;
    if (proc === 1) { V = lin(V1, V2, s); T = T1; }
    else if (proc === 2) { V = lin(V1, V2, s); T = T1 * V / V1; }
    else if (proc === 3) { V = V1; T = lin(T1, T2, s); }
    else if (proc === 4) { V = lin(V1, V2, s); T = T1 * (V1 / V) ** (g - 1); }
    else {   // Carnot: isoterma quente, adiabática, isoterma fria, adiabática (cada uma ocupa 1/4 do progresso)
      const q = Math.min(3, Math.floor(s * 4)), f = s * 4 - q;
      if (q === 0) { V = lin(V1, V2, f); T = T1; }
      else if (q === 1) { V = lin(V2, this.Vc, f); T = T1 * (V2 / V) ** (g - 1); }
      else if (q === 2) { V = lin(this.Vc, this.Vd, f); T = T2; }
      else { V = lin(this.Vd, V1, f); T = T2 * (this.Vd / V) ** (g - 1); }
    }
    return { V, T, Pa: this.n * R * T / (V * 1e-3), U: this.n * this.k * R * T };
  },

  reset(p) {
    const proc = Math.round(p.proc), gs = GASES[Math.round(p.gas)], k = gs.k, g = (k + 1) / k;   // γ = Cp/Cv
    let V2 = p.V2, T2 = p.T2, avisos = [];
    if (proc === 5) {
      if (T2 >= p.T1) { T2 = p.T1 / 2; avisos.push("T₂ ajustada para T₁/2 (precisa ser menor que T₁)"); }
      if (V2 <= p.V1) { V2 = p.V1 * 2; avisos.push("V₂ ajustado para 2V₁ (precisa ser maior que V₁)"); }
    }
    const razao = (p.T1 / T2) ** (1 / (g - 1));   // V_C/V_B = V_D/V_A nas adiabáticas do ciclo
    Object.assign(this, { proc, k, g, gas: gs.nome, n: p.n, V1: p.V1, V2, T1: p.T1, T2, avisos, dur: p.dur, duracao: p.dur,
      Vc: V2 * razao, Vd: p.V1 * razao, prog: 0, t: 0, fim: false, W: 0 });
    this.U0 = this.estado(0).U;

    // trajeto completo (para o diagrama P × V) e faixas dos eixos
    const N = proc === 5 ? 400 : 200;
    this.cam = Array.from({ length: N + 1 }, (_, i) => { const e = this.estado(i / N); return { V: e.V, P: e.Pa / ATM, T: e.T }; });
    const mx = f => Math.max(...this.cam.map(f)), mn = f => Math.min(...this.cam.map(f));
    Object.assign(this, { Vm0: mx(c => c.V), Vm: 1.15 * mx(c => c.V), Pm: 1.15 * mx(c => c.P), Tmax: mx(c => c.T), Tmin: mn(c => c.T) });

    // ilustração microscópica: partículas numa caixa de comprimento V (em "litros") e altura fixa Hu
    const rnd = mulberry32(7); this.Hu = this.Vm0 * 0.5;
    this.part = Array.from({ length: NP }, () => { const a = rnd() * 2 * Math.PI;
      return { x: rnd() * p.V1, y: rnd() * this.Hu, ux: Math.cos(a), uy: Math.sin(a), w: 0.6 + 0.8 * rnd() }; });
  },

  moverParticulas(dt, V, T) {
    const v0 = 0.5 * this.Vm0 * Math.sqrt(T / this.T1), H = this.Hu;   // a velocidade cresce com √T
    for (const q of this.part) {
      q.x += q.ux * q.w * v0 * dt; q.y += q.uy * q.w * v0 * dt;
      if (q.x < 0) { q.x = -q.x; q.ux = Math.abs(q.ux); }
      if (q.x > V) { q.x = 2 * V - q.x; q.ux = -Math.abs(q.ux); }
      if (q.y < 0) { q.y = -q.y; q.uy = Math.abs(q.uy); }
      if (q.y > H) { q.y = 2 * H - q.y; q.uy = -Math.abs(q.uy); }
      q.x = Math.min(Math.max(q.x, 0), V); q.y = Math.min(Math.max(q.y, 0), H);
    }
  },

  step(dt) {
    if (!this.fim) {
      const s0 = this.prog, s1 = Math.min(1, s0 + dt / this.dur);
      const a = this.estado(s0), b = this.estado(s1), m = this.estado((s0 + s1) / 2);
      this.W += m.Pa * (b.V - a.V) * 1e-3;   // trabalho realizado pelo gás: ∫ P dV (J)
      this.prog = s1; if (s1 >= 1) this.fim = true;
    }
    this.t += dt;
    const e = this.estado(this.prog); this.moverParticulas(dt, e.V, e.T);
  },

  // valores teóricos do processo completo
  teorico() {
    const { proc, n, k, g, T1, T2, V1, V2 } = this, cv = n * k * R;
    if (proc === 1) { const W = n * R * T1 * Math.log(V2 / V1); return { Q: W, W, dU: 0 }; }
    if (proc === 2) { const dT = T1 * V2 / V1 - T1, W = n * R * dT; return { Q: cv * dT + W, W, dU: cv * dT }; }
    if (proc === 3) { const dU = cv * (T2 - T1); return { Q: dU, W: 0, dU }; }
    if (proc === 4) { const dU = cv * (T1 * (V1 / V2) ** (g - 1) - T1); return { Q: 0, W: -dU, dU }; }
    const Qh = n * R * T1 * Math.log(V2 / V1), Qc = n * R * T2 * Math.log(V2 / V1);
    return { Q: Qh - Qc, W: Qh - Qc, dU: 0, Qh, Qc, eta: 1 - T2 / T1 };
  },

  draw(ctx, w, h) {
    const M = MARGEM, x0 = M.e, x1 = w - M.d, y0 = M.t, y1 = h - M.b, aw = x1 - x0, e = this.estado(this.prog), cor = COR_PROC[this.proc];
    ctx.clearRect(0, 0, w, h); ctx.font = "12px system-ui";

    // ---- cilindro com pistão e partículas (esquerda) ----
    const cw = Math.min(0.36 * aw, 380), cx0 = x0 + 10, pxL = cw / this.Vm0, Hpx = this.Hu * pxL, cyc = (y0 + y1) / 2;
    const top = cyc - Hpx / 2, bot = cyc + Hpx / 2, xp = cx0 + e.V * pxL;
    ctx.strokeStyle = COR.eixo; ctx.lineWidth = 3; ctx.beginPath();
    ctx.moveTo(cx0 + cw + 14, top); ctx.lineTo(cx0, top); ctx.lineTo(cx0, bot); ctx.lineTo(cx0 + cw + 14, bot); ctx.stroke();
    ctx.fillStyle = COR.texto; ctx.fillRect(xp - 3, top, 6, Hpx); ctx.fillRect(xp, cyc - 3, cx0 + cw + 40 - xp, 6);
    const f = (e.T - this.Tmin) / ((this.Tmax - this.Tmin) || 1), mix = (a, b) => Math.round(a + (b - a) * f);
    ctx.fillStyle = `rgb(${mix(127, 232)},${mix(178, 168)},${mix(229, 124)})`;   // frio: azul, quente: coral
    for (const q of this.part) { ctx.beginPath(); ctx.arc(cx0 + q.x * pxL, top + q.y * pxL, 3.2, 0, 2 * Math.PI); ctx.fill(); }
    ctx.fillStyle = COR.texto; ctx.textAlign = "left";
    ctx.fillText(`V = ${e.V.toFixed(1)} L    T = ${e.T.toFixed(0)} K`, cx0, bot + 22);
    ctx.fillText("ilustração: 60 partículas representam o gás", cx0, top - 12);

    // ---- diagrama P × V (direita) ----
    const gx0 = x0 + 0.46 * aw + 50, gx1 = x1 - 16, gy0 = y0 + 16, gy1 = y1 - 40;
    const Xv = v => gx0 + v / this.Vm * (gx1 - gx0), Yp = p => gy1 - p / this.Pm * (gy1 - gy0);
    ctx.lineWidth = 1; ctx.textAlign = "center";
    const pv = passoBom(this.Vm / 5), pp = passoBom(this.Pm / 4);
    for (let v = 0; v <= this.Vm; v += pv) { ctx.strokeStyle = COR.grade; ctx.beginPath(); ctx.moveTo(Xv(v), gy0); ctx.lineTo(Xv(v), gy1); ctx.stroke(); ctx.fillStyle = COR.texto; ctx.fillText(`${+v.toPrecision(3)}`, Xv(v), gy1 + 16); }
    ctx.textAlign = "right";
    for (let p = 0; p <= this.Pm; p += pp) { ctx.strokeStyle = COR.grade; ctx.beginPath(); ctx.moveTo(gx0, Yp(p)); ctx.lineTo(gx1, Yp(p)); ctx.stroke(); ctx.fillStyle = COR.texto; ctx.fillText(`${+p.toPrecision(3)}`, gx0 - 6, Yp(p) + 4); }
    ctx.strokeStyle = COR.eixo; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(gx0, gy0); ctx.lineTo(gx0, gy1); ctx.lineTo(gx1, gy1); ctx.stroke();
    ctx.textAlign = "center"; ctx.fillStyle = COR.texto; ctx.fillText("V (L)", (gx0 + gx1) / 2, gy1 + 32);
    ctx.textAlign = "left"; ctx.fillText("P (atm)", gx0 - 40, gy0 - 4);

    const rota = pts => { ctx.beginPath(); pts.forEach((c, i) => (i ? ctx.lineTo(Xv(c.V), Yp(c.P)) : ctx.moveTo(Xv(c.V), Yp(c.P)))); };
    const iso = T => Array.from({ length: 80 }, (_, i) => { const V = this.Vm * (0.04 + 0.96 * i / 79); return { V, P: this.n * R * T / (V * 1e-3) / ATM }; });
    ctx.save(); ctx.beginPath(); ctx.rect(gx0, gy0, gx1 - gx0, gy1 - gy0); ctx.clip();
    ctx.setLineDash([3, 5]); ctx.strokeStyle = COR.texto; ctx.globalAlpha = 0.35; ctx.lineWidth = 1;   // isotermas de referência
    for (const T of this.proc === 5 ? [this.T1, this.T2] : [this.T1, this.cam[this.cam.length - 1].T]) { rota(iso(T)); ctx.stroke(); }
    ctx.setLineDash([7, 5]); ctx.globalAlpha = 0.8; ctx.strokeStyle = COR.ideal; ctx.lineWidth = 1.6; rota(this.cam); ctx.stroke();   // trajeto previsto
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    const j = Math.floor(this.prog * (this.cam.length - 1)), feito = [...this.cam.slice(0, j + 1), { V: e.V, P: e.Pa / ATM }];
    ctx.fillStyle = cor; ctx.globalAlpha = 0.16;   // área = trabalho (sob a curva; no ciclo, a área interna)
    rota(this.proc === 5 ? feito : [{ V: feito[0].V, P: 0 }, ...feito, { V: e.V, P: 0 }]); ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = cor; ctx.lineWidth = 2.6; rota(feito); ctx.stroke();
    ctx.restore();

    // pontos notáveis (A, B, C, D no ciclo; 1 e 2 nos demais) e estado atual
    const marcas = this.proc === 5 ? [["A", 0], ["B", 0.25], ["C", 0.5], ["D", 0.75]] : [["1", 0], ["2", 1]];
    ctx.textAlign = "left"; ctx.fillStyle = COR.texto;
    for (const [nome, s] of marcas) { const m = this.estado(s); ctx.beginPath(); ctx.arc(Xv(m.V), Yp(m.Pa / ATM), 3.5, 0, 2 * Math.PI); ctx.fill(); ctx.fillText(nome, Xv(m.V) + 7, Yp(m.Pa / ATM) - 7); }
    ctx.fillStyle = "#e8ebf1"; ctx.beginPath(); ctx.arc(Xv(e.V), Yp(e.Pa / ATM), 5.5, 0, 2 * Math.PI); ctx.fill();
    ctx.textAlign = "start";
  },

  grandezas() { const e = this.estado(this.prog), dU = e.U - this.U0; return { t: this.t, valores: [dU + this.W, this.W, dU] }; },

  info() {
    const e = this.estado(this.prog), dU = e.U - this.U0, Q = dU + this.W, T = this.teorico();
    const l1 = `${NOMES[this.proc]}   gás ${this.gas} (γ = ${this.g.toFixed(2)}, n = ${this.n} mol)   progresso ${(this.prog * 100).toFixed(0)}%${this.fim ? " (fim)" : ""}${this.avisos.length ? "   ⚠ " + this.avisos.join("; ") : ""}`;
    const l2 = `estado: P = ${(e.Pa / ATM).toFixed(2)} atm   V = ${e.V.toFixed(1)} L   T = ${e.T.toFixed(0)} K   U = ${Math.round(e.U)} J`;
    const l3 = `acumulado: Q = ${J(Q)} J   W = ${J(this.W)} J   ΔU = ${J(dU)} J      (1ª lei: Q = ΔU + W)`;
    const l4 = this.proc === 5
      ? `ciclo completo: Q_quente = ${J(T.Qh)} J   Q_frio = −${Math.round(T.Qc)} J   W líquido = ${J(T.W)} J   rendimento η = 1 − T₂/T₁ = ${(T.eta * 100).toFixed(1)}%`
      : `processo completo: Q = ${J(T.Q)} J   W = ${J(T.W)} J   ΔU = ${J(T.dU)} J`;
    return [l1, l2, l3, l4].join("\n");
  },
};
