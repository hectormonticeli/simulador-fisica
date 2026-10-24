import { COR, MARGEM, desenharGrade } from "../core/desenho.js";
import { LUZ, linha, seta, desenharPulsos } from "../core/optica.js";

const V0 = 4, L = 7, RAD = Math.PI / 180;   // V0: "velocidade da luz no vácuo" na animação; L: comprimento dos trechos semi-infinitos
const f2 = x => x.toFixed(2);
const sub = i => "₀₁₂₃₄₅₆₇₈₉"[i];
const graus = x => (x / RAD).toFixed(1);
const alfa = n => Math.min(0.4, 0.03 + 0.1 * (n - 1));   // meios mais refringentes ficam mais "carregados"

export default {
  id: "refracao",
  titulo: "Refração em vários meios",
  categoria: "Óptica",
  // Meio 1 (topo) e meio K (fundo) são semi-infinitos; os meios 2 a K−1 são camadas com espessura.
  parametros: [
    { nome: "meios", rotulo: "Número de meios (2 a 5)", min: 2, max: 5, valor: 2, passo: 1 },
    { nome: "th1", rotulo: "Ângulo de incidência θ₁ (°)", min: 0, max: 89, valor: 40, passo: 0.5, limite: [0, 89.9] },
    { nome: "n1", rotulo: "Meio 1 (topo): índice n₁", min: 1, max: 3, valor: 1, passo: 0.01, limite: [1, 10] },
    { nome: "n2", rotulo: "Meio 2: índice n₂", min: 1, max: 3, valor: 1.5, passo: 0.01, limite: [1, 10] },
    { nome: "e2", rotulo: "Meio 2: espessura (m; se houver ≥ 3 meios)", min: 0.1, max: 4, valor: 1.5, passo: 0.1, limite: [0.05, 10] },
    { nome: "n3", rotulo: "Meio 3: índice n₃ (se houver ≥ 3 meios)", min: 1, max: 3, valor: 1.33, passo: 0.01, limite: [1, 10] },
    { nome: "e3", rotulo: "Meio 3: espessura (m; se houver ≥ 4 meios)", min: 0.1, max: 4, valor: 1.5, passo: 0.1, limite: [0.05, 10] },
    { nome: "n4", rotulo: "Meio 4: índice n₄ (se houver ≥ 4 meios)", min: 1, max: 3, valor: 1.7, passo: 0.01, limite: [1, 10] },
    { nome: "e4", rotulo: "Meio 4: espessura (m; se houver 5 meios)", min: 0.1, max: 4, valor: 1.5, passo: 0.1, limite: [0.05, 10] },
    { nome: "n5", rotulo: "Meio 5: índice n₅ (se houver 5 meios)", min: 1, max: 3, valor: 2, passo: 0.01, limite: [1, 10] },
  ],

  // Geometria: interfaces horizontais; yi[i] é a profundidade da interface entre os meios i e i+1 (yi[1] = 0).
  // Lei de Snell em todo o percurso: n·sen θ é constante (s). Se s/n(j) > 1, não há como entrar no meio j.
  reset(p) {
    const K = Math.round(p.meios), n = [0], e = [0, 0];
    for (let j = 1; j <= K; j++) n[j] = p["n" + j];
    for (let j = 2; j < K; j++) e[j] = p["e" + j];
    const th1 = p.th1 * RAD, s = n[1] * Math.sin(th1), sj = j => s / n[j];
    const yi = [0, 0];
    for (let i = 2; i < K; i++) yi[i] = yi[i - 1] - e[i];

    const A = [-L * Math.sin(th1), L * Math.cos(th1)], O = [0, 0];
    const pts = [A, O], meio = [1];   // meio[k]: meio em que está o trecho pts[k] → pts[k+1]
    let x = 0, tir = 0;
    for (let i = 1; i < K; i++) {     // desce, interface por interface
      if (sj(i + 1) > 1) { tir = i; break; }
      const th = Math.asin(sj(i + 1));
      if (i + 1 === K) { pts.push([x + L * Math.sin(th), yi[i] - L * Math.cos(th)]); meio.push(K); break; }
      x += e[i + 1] * Math.tan(th); pts.push([x, yi[i + 1]]); meio.push(i + 1);
    }
    const nDesc = meio.length;
    if (tir) {                        // reflexão total na interface "tir": sobe pelas mesmas camadas até o meio 1
      for (let j = tir; j >= 2; j--) { x += e[j] * Math.tan(Math.asin(sj(j))); pts.push([x, yi[j - 1]]); meio.push(j); }
      pts.push([x + L * Math.sin(th1), L * Math.cos(th1)]); meio.push(1);
    }
    const thetas = [0, th1];
    for (let j = 2; j <= K && sj(j) <= 1; j++) thetas[j] = Math.asin(sj(j));

    // desvio lateral: só tem sentido se o raio emerge no mesmo índice em que incidiu (n_K = n₁)
    let desvio = 0;
    if (!tir && K >= 3 && Math.abs(n[K] - n[1]) < 1e-9) { const P = pts[pts.length - 2]; desvio = Math.abs(-P[0] * Math.cos(th1) - P[1] * Math.sin(th1)); }

    const D = -yi[K - 1], xm = Math.max(...pts.map(q => Math.abs(q[0])));
    Object.assign(this, { K, n, yi, th1, s, tir, nDesc, pts, meio, thetas, desvio, t: 0, fim: false });
    this.vista = { cy: -D / 2, meiaL: Math.min(40, Math.max(9, xm + 1)), meiaA: Math.max(5, D / 2 + 4) };
  },

  step(dt) { this.t += dt; },   // só a animação do pulso de luz depende do tempo

  draw(ctx, w, h) {
    const V = this.vista, M = MARGEM, aw = w - M.e - M.d, ah = h - M.t - M.b, { K, n, yi, pts, meio } = this;
    const s = Math.min(aw / (2 * V.meiaL), ah / (2 * V.meiaA)), cx = M.e + aw / 2, cy = M.t + ah / 2;
    const X = x => cx + x * s, Y = y => cy - (y - V.cy) * s;
    ctx.clearRect(0, 0, w, h);

    // meios: o tom indica o índice de refração
    const topo = j => (j === 1 ? 0 : Y(yi[j - 1])), fundo = j => (j === K ? h : Y(yi[j]));
    for (let j = 1; j <= K; j++) { ctx.fillStyle = `rgba(127,178,229,${alfa(n[j])})`; ctx.fillRect(0, topo(j), w, fundo(j) - topo(j)); }
    desenharGrade(ctx, w, h, X(0), Y(0), s);   // os eixos desenhados são a primeira interface (y = 0) e a normal (x = 0)
    ctx.strokeStyle = COR.eixo; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 2; i < K; i++) { ctx.moveTo(0, Y(yi[i])); ctx.lineTo(w, Y(yi[i])); }
    ctx.stroke();
    ctx.setLineDash([5, 5]); ctx.beginPath();   // normais nos pontos de cruzamento
    for (let k = 2; k < this.nDesc; k++) { ctx.moveTo(X(pts[k][0]), Y(pts[k][1]) - 60); ctx.lineTo(X(pts[k][0]), Y(pts[k][1]) + 60); }
    ctx.stroke(); ctx.setLineDash([]);
    if (K >= 3 && !this.tir) {   // prolongamento do raio incidente (como seguiria sem os outros meios)
      const Lp = Math.min(80, (-yi[K - 1] + L) / Math.cos(this.th1));
      linha(ctx, X, Y, [[0, 0], [Lp * Math.sin(this.th1), -Lp * Math.cos(this.th1)]], COR.texto, 1.5, [6, 6], 0.6);
    }

    // raios: o caminho completo (com seta em cada trecho) e a reflexão parcial na primeira interface
    const refl1 = [[0, 0], [L * Math.sin(this.th1), L * Math.cos(this.th1)]];
    if (this.tir !== 1) { linha(ctx, X, Y, refl1, LUZ, 1.5, [], 0.35); seta(ctx, X, Y, ...refl1, LUZ, 0.35); }
    linha(ctx, X, Y, pts, LUZ, 2.5);
    for (let k = 0; k < pts.length - 1; k++) seta(ctx, X, Y, pts[k], pts[k + 1], LUZ);

    // arcos e rótulos dos ângulos
    ctx.font = "13px system-ui"; ctx.fillStyle = COR.texto; ctx.strokeStyle = COR.texto; ctx.lineWidth = 1.2; ctx.textAlign = "center";
    const r = 1.4 * s, a1 = Math.atan2(-Math.cos(this.th1), -Math.sin(this.th1)), m1 = (a1 - Math.PI / 2) / 2;
    ctx.beginPath(); ctx.arc(X(0), Y(0), r, a1, -Math.PI / 2); ctx.stroke();
    ctx.fillText(`θ₁ = ${graus(this.th1)}°`, X(0) + (r + 30) * Math.cos(m1), Y(0) + (r + 14) * Math.sin(m1));
    if (this.tir !== 1) {
      const a2 = Math.atan2(Math.cos(this.thetas[2]), Math.sin(this.thetas[2])), m2 = (a2 + Math.PI / 2) / 2;
      ctx.beginPath(); ctx.arc(X(0), Y(0), r, a2, Math.PI / 2); ctx.stroke();
      ctx.fillText(`θ₂ = ${graus(this.thetas[2])}°`, X(0) + (r + 30) * Math.cos(m2), Y(0) + (r + 14) * Math.sin(m2));
    }
    for (let k = 2; k < this.nDesc; k++) {   // ângulo em cada trecho seguinte
      const mx = (X(pts[k][0]) + X(pts[k + 1][0])) / 2, my = (Y(pts[k][1]) + Y(pts[k + 1][1])) / 2;
      ctx.fillText(`θ${sub(meio[k])} = ${graus(this.thetas[meio[k]])}°`, mx + 42, my - 4);
    }
    ctx.textAlign = "start";
    for (let j = 1; j <= K; j++) ctx.fillText(`n${sub(j)} = ${f2(n[j])}`, 12, j === 1 ? topo(2) - 10 : j === K ? topo(K) + 20 : (topo(j) + fundo(j)) / 2 + 5);

    // pulso de luz: mais lento nos meios de maior índice (v = c/n)
    const cam = [{ pts, vs: meio.map(m => V0 / n[m]) }];
    if (this.tir !== 1) cam.push({ pts: [pts[0], ...refl1], vs: [V0 / n[1], V0 / n[1]], alfa: 0.5 });
    desenharPulsos(ctx, X, Y, cam, this.t);
  },

  info() {
    const { K, n, thetas, tir } = this;
    const l1 = thetas.slice(1).map((t, j) => `θ${sub(j + 1)} = ${graus(t)}°`).join("   ") + `   (n·sen θ = ${this.s.toFixed(3)} em todos os meios)`;
    const l2 = "v = c/n (×10⁸ m/s):  " + n.slice(1).map((x, j) => `v${sub(j + 1)} = ${(3 / x).toFixed(2)}`).join("   ");
    let l3;
    if (tir) l3 = `reflexão total na interface ${tir} (meio ${tir} → ${tir + 1}), ângulo crítico = ${graus(Math.asin(n[tir + 1] / n[tir]))}°`;
    else {
      const partes = [];
      if (K === 2 && n[1] > n[2]) partes.push(`ângulo crítico = ${graus(Math.asin(n[2] / n[1]))}°`);
      if (this.desvio) partes.push(`desvio lateral = ${f2(this.desvio)} m`);
      if (!partes.length) partes.push(`o raio emerge em n${sub(K)} com θ${sub(K)} = ${graus(thetas[K])}°`);
      l3 = partes.join("   ");
    }
    return `${l1}\n${l2}\n${l3}${this.t === 0 ? "   (Iniciar: pulso de luz)" : ""}`;
  },
};
