import { COR, MARGEM } from "../core/desenho.js";

const RAD = Math.PI / 180, ESP = 22, VEL = 45;   // ESP, VEL: espaçamento (px) e velocidade (px/s) das frentes de onda do esquema
const f2 = x => x.toFixed(2);

// cor aproximada de um comprimento de onda visível (nm); fora do visível, um cinza neutro
function corLuz(nm) {
  let r = 0, g = 0, b = 0;
  if (nm < 380 || nm > 750) return [190, 190, 190];
  if (nm < 440) { r = (440 - nm) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = (510 - nm) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = (645 - nm) / 65; }
  else r = 1;
  const f = nm < 420 ? 0.3 + 0.7 * (nm - 380) / 40 : nm > 700 ? 0.3 + 0.7 * (750 - nm) / 50 : 1;
  return [r, g, b].map(c => Math.round(255 * (c * f) ** 0.8));
}
// passo "redondo" (1, 2 ou 5 × 10^k) para as marcas do eixo
function passoBom(x) { const e = 10 ** Math.floor(Math.log10(x)), m = x / e; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * e; }

export default {
  id: "young",
  titulo: "Young e fenda simples (interferência e difração)",
  categoria: "Óptica",
  parametros: [
    { nome: "N", rotulo: "Número de fendas (1 = fenda simples, 2 = Young)", min: 1, max: 5, valor: 2, passo: 1 },
    { nome: "lam", rotulo: "Comprimento de onda λ (nm)", min: 380, max: 750, valor: 600, passo: 1, limite: [100, 3000] },
    { nome: "d", rotulo: "Distância entre fendas d (mm)", min: 0.02, max: 1, valor: 0.2, passo: 0.01, limite: [0.005, 5] },
    { nome: "a", rotulo: "Largura de cada fenda a (mm)", min: 0.005, max: 0.3, valor: 0.05, passo: 0.005, limite: [0.001, 2] },
    { nome: "D", rotulo: "Distância fendas–anteparo D (m)", min: 0.5, max: 5, valor: 1.5, passo: 0.1, limite: [0.05, 100] },
    { nome: "yv", rotulo: "Região observada na tela (± mm)", min: 5, max: 100, valor: 30, passo: 1, limite: [0.1, 2000] },
    { nome: "yP", rotulo: "Posição do ponto P na tela (mm)", min: -100, max: 100, valor: 4.5, passo: 0.1, limite: [-2000, 2000] },
  ],

  // Modelo de Fraunhofer (campo distante): I(θ)/I₀ = [sen β / β]² · [sen(Nγ) / (N sen γ)]²,
  // com β = π a sen θ / λ (difração em cada fenda) e γ = π d sen θ / λ (interferência entre as fendas).
  reset(p) {
    const a = p.N > 1 ? Math.min(p.a, p.d) : p.a;   // com várias fendas, a não pode passar de d
    Object.assign(this, { N: Math.round(p.N), lamnm: p.lam, lam: p.lam * 1e-9, d: p.d * 1e-3, a: a * 1e-3,
      D: p.D, yv: p.yv, yP: p.yP, aAjustado: a < p.a, cor: corLuz(p.lam), t: 0, fim: false, chave: null });
  },

  intensidade(ymm) {   // ymm: posição na tela, em mm
    const y = ymm * 1e-3, s = y / Math.hypot(y, this.D);   // sen θ
    const b = Math.PI * this.a * s / this.lam, g = Math.PI * this.d * s / this.lam;
    const env = Math.abs(b) < 1e-9 ? 1 : (Math.sin(b) / b) ** 2;
    if (this.N === 1) return { total: env, env, red: 1 };
    const sg = Math.sin(g), red = Math.abs(sg) < 1e-9 ? 1 : (Math.sin(this.N * g) / (this.N * sg)) ** 2;
    return { total: env * red, env, red };
  },

  step(dt) { this.t += dt; },   // só a animação das frentes de onda depende do tempo

  // perfil de intensidade (uma amostra por linha de pixel, com 3 subamostras) e cores da faixa iluminada
  construir(chave, ah, y0, cy, pxmm) {
    const n = Math.ceil(ah) + 1, I = new Float32Array(n), E = new Float32Array(n), [r, g, b] = this.cor;
    this.estilos = [];
    for (let i = 0; i < n; i++) {
      let s = 0, e = 0;
      for (let k = -1; k <= 1; k++) { const q = this.intensidade((cy - (y0 + i + k / 3)) / pxmm); s += q.total / 3; e += q.env / 3; }
      I[i] = s; E[i] = e;
      const v = s ** 0.6;   // correção de gama: deixa os máximos secundários visíveis
      this.estilos.push(`rgb(${Math.round(r * v)},${Math.round(g * v)},${Math.round(b * v)})`);
    }
    Object.assign(this, { perfil: I, env: E, chave });
  },

  draw(ctx, w, h) {
    const M = MARGEM, x0 = M.e, x1 = w - M.d, y0 = M.t, y1 = h - M.b, aw = x1 - x0, ah = y1 - y0, N = this.N;
    const cy = (y0 + y1) / 2, xb = x0 + 0.14 * aw, xs = x0 + 0.58 * aw, xc = xs + 46, pxmm = (ah / 2) / this.yv;
    const cor = `rgb(${this.cor.join(",")})`, Py = y => cy - y * pxmm;
    const chave = [N, this.lamnm, this.d, this.a, this.D, this.yv, w, h].join();
    if (chave !== this.chave) this.construir(chave, ah, y0, cy, pxmm);
    ctx.clearRect(0, 0, w, h);
    ctx.font = "12px system-ui";

    // fendas: posições e aberturas no esquema são simbólicas (fora de escala)
    const dv = Math.min(38, ah / (N + 1) / 1.8), sy = i => cy + (i - (N - 1) / 2) * dv;
    const gv = N === 1 ? 14 : Math.max(3, dv * 0.7 * this.a / this.d);

    // régua do eixo y da tela, em mm (esta sim em escala)
    const passo = passoBom(this.yv / 3), K = Math.floor(this.yv / passo);
    ctx.textAlign = "right"; ctx.lineWidth = 1;
    for (let k = -K; k <= K; k++) {
      const py = Py(k * passo);
      ctx.strokeStyle = "rgba(170,178,192,.10)"; ctx.beginPath(); ctx.moveTo(xs, py); ctx.lineTo(x1, py); ctx.stroke();
      ctx.strokeStyle = COR.eixo; ctx.beginPath(); ctx.moveTo(xs - 14, py); ctx.lineTo(xs - 8, py); ctx.stroke();
      ctx.fillStyle = COR.texto; ctx.fillText(`${+(k * passo).toPrecision(3)}`, xs - 18, py + 4);
    }
    ctx.textAlign = "start"; ctx.fillStyle = COR.texto; ctx.fillText("y na tela (mm)", xs - 52, y0 - 12);
    ctx.setLineDash([2, 5]); ctx.strokeStyle = COR.eixo; ctx.beginPath(); ctx.moveTo(xb, cy); ctx.lineTo(xs - 8, cy); ctx.stroke(); ctx.setLineDash([]);

    // frentes de onda (esquema): ondas planas chegando e ondas circulares saindo de cada fenda
    if (this.t > 0) {
      const off = (this.t * VEL) % ESP;
      ctx.save(); ctx.strokeStyle = cor; ctx.globalAlpha = 0.28; ctx.lineWidth = 1.5;
      ctx.beginPath(); for (let x = x0 + off; x < xb - 3; x += ESP) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); } ctx.stroke();
      ctx.beginPath(); ctx.rect(xb + 3, y0, xs - xb - 11, ah); ctx.clip();
      for (let i = 0; i < N; i++) for (let r = off; r < xs - xb; r += ESP) { ctx.beginPath(); ctx.arc(xb, sy(i), r, -Math.PI / 2, Math.PI / 2); ctx.stroke(); }
      ctx.restore();
    }

    // barreira com as fendas
    ctx.fillStyle = COR.eixo; let ytop = y0;
    for (let i = 0; i < N; i++) { ctx.fillRect(xb - 2, ytop, 4, sy(i) - gv / 2 - ytop); ytop = sy(i) + gv / 2; }
    ctx.fillRect(xb - 2, ytop, 4, y1 - ytop);
    ctx.fillStyle = COR.texto; ctx.fillText(N === 1 ? "fenda" : `${N} fendas`, xb - 22, y0 - 12);
    ctx.fillText("(fora de escala)", xb - 22, y0 + 4);

    // ponto P e os caminhos de cada fenda até ele
    const pP = Py(this.yP), dentro = pP >= y0 && pP <= y1;
    if (dentro) {
      ctx.save(); ctx.strokeStyle = cor; ctx.globalAlpha = 0.6; ctx.lineWidth = 1;
      ctx.beginPath(); for (let i = 0; i < N; i++) { ctx.moveTo(xb, sy(i)); ctx.lineTo(xs, pP); } ctx.stroke(); ctx.restore();
      ctx.fillStyle = "#e8ebf1"; ctx.beginPath(); ctx.arc(xs, pP, 4, 0, 2 * Math.PI); ctx.fill(); ctx.fillText("P", xs + 9, pP - 7);
    }

    // anteparo iluminado (cor pela intensidade) e curva de intensidade ao lado
    for (let i = 0; i < this.estilos.length; i++) { ctx.fillStyle = this.estilos[i]; ctx.fillRect(xs - 7, y0 + i, 14, 1.3); }
    const larg = Math.max(40, x1 - xc - 10), curva = (arr, fechar) => {
      ctx.beginPath(); ctx.moveTo(xc, y0);
      for (let i = 0; i < arr.length; i++) ctx.lineTo(xc + larg * arr[i], y0 + i);
      if (fechar) { ctx.lineTo(xc, y0 + arr.length - 1); ctx.closePath(); }
    };
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, ah); ctx.clip();
    if (N > 1) { ctx.setLineDash([5, 5]); ctx.strokeStyle = COR.texto; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.2; curva(this.env, false); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
    ctx.fillStyle = cor; ctx.globalAlpha = 0.14; curva(this.perfil, true); ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = cor; ctx.lineWidth = 1.8; curva(this.perfil, false); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = COR.eixo; ctx.beginPath(); ctx.moveTo(xc, y0); ctx.lineTo(xc, y1); ctx.stroke();
    ctx.fillStyle = COR.texto; ctx.fillText("I / I₀", xc - 4, y0 - 12);
    if (N > 1) ctx.fillText("tracejado: envoltória de difração", xc + 50, y0 - 12);

    // ordens dos máximos principais (sen θ = mλ/d)
    if (N > 1) {
      ctx.fillStyle = cor; ctx.strokeStyle = cor; ctx.textAlign = "left";
      for (let m = -40; m <= 40; m++) {
        const s = m * this.lam / this.d; if (Math.abs(s) >= 1) continue;
        const py = Py(this.D * s / Math.sqrt(1 - s * s) * 1e3);
        if (py < y0 || py > y1) continue;
        ctx.beginPath(); ctx.moveTo(xs + 8, py); ctx.lineTo(xs + 14, py); ctx.stroke();
        if (this.lam * this.D / this.d * 1e3 * pxmm >= 16) ctx.fillText(`m=${m}`, xs + 16, py + 4);   // só rotula se couber
      }
    }

    // distância D (fora de escala)
    ctx.strokeStyle = COR.texto; ctx.fillStyle = COR.texto; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xb, y1 - 12); ctx.lineTo(xs, y1 - 12); ctx.moveTo(xb, y1 - 17); ctx.lineTo(xb, y1 - 7); ctx.moveTo(xs, y1 - 17); ctx.lineTo(xs, y1 - 7); ctx.stroke();
    ctx.textAlign = "center"; ctx.fillText(`D = ${this.D} m`, (xb + xs) / 2, y1 - 18); ctx.textAlign = "start";
  },

  info() {
    const { N, lam, d, a, D } = this, y = this.yP * 1e-3, s = y / Math.hypot(y, D), th = Math.asin(s) / RAD;
    const dif = (N === 1 ? a : d) * s / lam, q = this.intensidade(this.yP), I = q.total;
    const franja = lam * D / d * 1e3, larg = 2 * lam * D / a * 1e3, F = a * a / (lam * D);
    const l1 = `λ = ${this.lamnm} nm   ${N === 1 ? "fenda simples" : `${N} fendas, d = ${f2(d * 1e3)} mm`}   a = ${f2(a * 1e3)} mm${this.aAjustado ? " (limitada a d)" : ""}   D = ${D} m`;
    let l2;
    if (N === 1) l2 = `máximo central: de mínimo a mínimo = 2λD/a = ${larg.toFixed(1)} mm   (mínimos: a·sen θ = kλ)`;
    else {
      const r = d / a, falta = r >= 1 && Math.abs(r - Math.round(r)) < 1e-3 ? `   ordens m = ±${Math.round(r)}k ausentes (d/a = ${Math.round(r)})` : "";
      l2 = `franjas: Δy = λD/d = ${franja.toFixed(2)} mm   máximo central de difração: ±${(larg / 2).toFixed(1)} mm (≈ ${(2 * r).toFixed(1)} franjas)${falta}`;
    }
    const tipo = q.env < 0.01 ? "mínimo de difração" : N === 1 ? (I > 0.98 ? "máximo central" : "intermediário")
      : q.red > 0.98 ? (q.env > 0.98 ? "máximo de interferência" : "máximo de interferência, atenuado pela difração") : q.red < 0.01 ? "mínimo de interferência" : "intermediário";
    let l3 = `P: y = ${f2(this.yP)} mm   θ = ${th.toFixed(3)}°   ${N === 1 ? "a" : "d"}·sen θ = ${dif.toFixed(2)} λ   I/I₀ = ${I.toFixed(3)} (${tipo})`;
    if (F > 0.1) l3 += `   ⚠ a²/(λD) = ${F.toFixed(2)}: fora do regime de Fraunhofer`;
    return `${l1}\n${l2}\n${l3}`;
  },
};
