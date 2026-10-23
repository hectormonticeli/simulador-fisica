import { Corpo, coulomb, passoVerlet, aceleracao, K_COULOMB as K } from "../fisica/nucleo.js";
import { COR, MARGEM, desenharGrade, acrescentarTrilha } from "../core/desenho.js";

const MICRO = 1e-6, RAIO_CARGA = 0.2;   // cargas em µC; distância de "choque" com uma carga
const VERDE = "#9fd3a8";
const f2 = x => x.toFixed(2);
const fmt = x => (x !== 0 && (Math.abs(x) >= 1e4 || Math.abs(x) < 1e-2) ? x.toExponential(2) : x.toFixed(2));

export default {
  id: "eletrostatica",
  titulo: "Eletrostática: cargas pontuais",
  categoria: "Eletricidade",
  series: ["Energia cinética (J)", "Energia potencial (J)", "Energia mecânica (J)"],
  parametros: [
    { nome: "q1", rotulo: "Carga fixa A (µC)", min: -50, max: 50, valor: 10, passo: 1, limite: [-500, 500] },
    { nome: "q2", rotulo: "Carga fixa B (µC)", min: -50, max: 50, valor: -10, passo: 1, limite: [-500, 500] },
    { nome: "d", rotulo: "Distância entre A e B (m)", min: 0.5, max: 20, valor: 6, passo: 0.1, limite: [0.5, 50] },
    { nome: "q0", rotulo: "Carga de prova (µC)", min: -20, max: 20, valor: 1, passo: 0.1, limite: [-100, 100] },
    { nome: "m0", rotulo: "Massa da carga de prova (kg)", min: 0.005, max: 1, valor: 0.05, passo: 0.005, limite: [0.0001, 100] },
    { nome: "x0", rotulo: "Posição inicial x (m)", min: -15, max: 15, valor: -1.5, passo: 0.1, limite: [-40, 40] },
    { nome: "y0", rotulo: "Posição inicial y (m)", min: -10, max: 10, valor: 1, passo: 0.1, limite: [-40, 40] },
    { nome: "vx0", rotulo: "Velocidade inicial vx (m/s)", min: -20, max: 20, valor: 0, passo: 0.5, limite: [-200, 200] },
    { nome: "vy0", rotulo: "Velocidade inicial vy (m/s)", min: -20, max: 20, valor: 0, passo: 0.5, limite: [-200, 200] },
    { nome: "duracao", rotulo: "Duração da simulação (s)", min: 5, max: 300, valor: 30, passo: 5, limite: [1, 3600] },
  ],

  reset(p) {
    // A à esquerda e B à direita, sobre o eixo x, simétricas em relação à origem
    this.fixas = [new Corpo({ x: -p.d / 2, q: p.q1 * MICRO }), new Corpo({ x: p.d / 2, q: p.q2 * MICRO })];
    this.c = new Corpo({ x: p.x0, y: p.y0, vx: p.vx0, vy: p.vy0, m: p.m0, q: p.q0 * MICRO });
    this.forcas = [coulomb(this.fixas)];
    this.duracao = p.duracao; this.t = 0; this.fim = false; this.motivo = ""; this.trilha = [[p.x0, p.y0]];
    this.chaveCampo = `${p.q1},${p.q2},${p.d}`;
    this.vista = { meiaL: Math.max(10, p.d / 2 + 4, Math.abs(p.x0) + 2), meiaA: Math.max(6, Math.abs(p.y0) + 2) };
    this.minDist = this.vista.meiaL / 1000;   // espaçamento mínimo entre pontos da trilha
  },

  campo(x, y) {   // campo elétrico (N/C) criado pelas cargas fixas
    let ex = 0, ey = 0;
    for (const f of this.fixas) {
      const dx = x - f.x, dy = y - f.y, r = Math.max(Math.hypot(dx, dy), 0.05), k = K * f.q / (r * r * r);
      ex += k * dx; ey += k * dy;
    }
    return [ex, ey];
  },
  potencial(x, y) {   // potencial elétrico (V)
    let V = 0;
    for (const f of this.fixas) V += K * f.q / Math.max(Math.hypot(x - f.x, y - f.y), 0.05);
    return V;
  },

  // Perto de uma carga as forças crescem muito: o passo é dividido conforme a distância e a velocidade.
  subpassos(dt) {
    const c = this.c;
    const dmin = Math.min(...this.fixas.filter(f => f.q).map(f => Math.hypot(f.x - c.x, f.y - c.y)));   // só cargas não nulas
    const v = Math.hypot(c.vx, c.vy), a = Math.hypot(...aceleracao(c, this.forcas));
    const n = Math.ceil(Math.max(v * dt / (0.05 * dmin), dt * Math.sqrt(a / (0.02 * dmin))));
    return Math.min(2000, Math.max(1, n));
  },

  step(dt) {
    if (this.fim) return;
    const n = this.subpassos(dt);
    for (let i = 0; i < n; i++) {
      passoVerlet(this.c, this.forcas, dt / n);
      if (this.fixas.some(f => f.q && Math.hypot(f.x - this.c.x, f.y - this.c.y) < RAIO_CARGA)) { this.fim = true; this.motivo = "atingiu uma carga"; break; }
    }
    this.t += dt;
    acrescentarTrilha(this.trilha, this.c.x, this.c.y, this.minDist);
    if (Math.hypot(this.c.x, this.c.y) > 500) { this.fim = true; this.motivo = "saiu da região"; }
    if (this.t >= this.duracao - dt / 2) { this.fim = true; this.motivo = "tempo esgotado"; }
  },

  // ---- camada estática (grade, equipotenciais, linhas de campo): desenhada uma vez e reaproveitada ----
  montarCamada(w, h, d, v) {
    const cv = document.createElement("canvas");
    cv.width = w * d; cv.height = h * d;
    const g = cv.getContext("2d"); g.scale(d, d);
    desenharGrade(g, w, h, v.cx, v.cy, v.s);
    this.equipotenciais(g, w, h, v);
    this.linhasDeCampo(g, w, h, v);
    return cv;
  },

  // Equipotenciais por "marching squares": em cada célula, liga os pontos onde V cruza o nível.
  equipotenciais(g, w, h, v) {
    const qref = Math.max(...this.fixas.map(f => Math.abs(f.q)));
    if (!qref) return;
    const cel = 6, nx = Math.ceil(w / cel) + 1, ny = Math.ceil(h / cel) + 1, V = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) V[j * nx + i] = this.potencial((i * cel - v.cx) / v.s, (v.cy - j * cel) / v.s);
    const niveis = [0];   // níveis: V = ±kQ/r para raios r crescentes
    for (const r of [0.4, 0.6, 0.9, 1.3, 2, 3, 4.5, 7]) niveis.push(K * qref / r, -K * qref / r);
    g.lineWidth = 1;
    for (const L of niveis) {
      g.strokeStyle = L > 0 ? "rgba(232,168,124,.45)" : L < 0 ? "rgba(127,178,229,.45)" : "rgba(170,178,192,.5)";
      g.beginPath();
      for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const a = V[j * nx + i] - L, b = V[j * nx + i + 1] - L, c = V[(j + 1) * nx + i + 1] - L, e = V[(j + 1) * nx + i] - L;
        const x = i * cel, y = j * cel, p = [];
        if (a * b < 0) p.push([x + cel * a / (a - b), y]);            // aresta de cima
        if (b * c < 0) p.push([x + cel, y + cel * b / (b - c)]);      // direita
        if (e * c < 0) p.push([x + cel * e / (e - c), y + cel]);      // de baixo
        if (a * e < 0) p.push([x, y + cel * a / (a - e)]);            // esquerda
        if (p.length >= 2) { g.moveTo(...p[0]); g.lineTo(...p[1]); }
        if (p.length === 4) { g.moveTo(...p[2]); g.lineTo(...p[3]); }
      }
      g.stroke();
    }
  },

  // Linhas de campo: partem das cargas positivas (ou chegam às negativas, se não houver positivas),
  // seguindo a direção de E em passos de 5 cm. Quanto maior a carga, mais linhas.
  linhasDeCampo(g, w, h, v) {
    const X = x => v.cx + x * v.s, Y = y => v.cy - y * v.s;
    const sinal = this.fixas.some(f => f.q > 0) ? 1 : -1;
    const fontes = this.fixas.filter(f => f.q * sinal > 0);
    if (!fontes.length) return;
    const qmax = Math.max(...fontes.map(f => Math.abs(f.q)));
    const xmin = -v.cx / v.s, xmax = (w - v.cx) / v.s, ymin = (v.cy - h) / v.s, ymax = v.cy / v.s;
    g.strokeStyle = "rgba(213,218,227,.55)"; g.fillStyle = "rgba(213,218,227,.85)"; g.lineWidth = 1.2;
    for (const f of fontes) {
      const n = Math.max(6, Math.round(24 * Math.abs(f.q) / qmax));
      for (let k = 0; k < n; k++) {
        const ang = 2 * Math.PI * (k + 0.5) / n;
        let x = f.x + 0.2 * Math.cos(ang), y = f.y + 0.2 * Math.sin(ang);
        const pts = [[x, y]];
        for (let i = 0; i < 4000; i++) {
          const [ex, ey] = this.campo(x, y), m = Math.hypot(ex, ey) || 1;
          x += sinal * 0.05 * ex / m; y += sinal * 0.05 * ey / m;
          pts.push([x, y]);
          if (this.fixas.some(c => c !== f && c.q && Math.hypot(c.x - x, c.y - y) < RAIO_CARGA) || x < xmin || x > xmax || y < ymin || y > ymax) break;
        }
        g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(X(a), Y(b)) : g.moveTo(X(a), Y(b)))); g.stroke();
        if (pts.length > 24) {   // seta no meio da linha, no sentido do campo
          const m = pts.length >> 1, ax = X(pts[m][0]), ay = Y(pts[m][1]);
          const ang2 = Math.atan2(sinal * (Y(pts[m + 1][1]) - ay), sinal * (X(pts[m + 1][0]) - ax));
          g.save(); g.translate(ax, ay); g.rotate(ang2);
          g.beginPath(); g.moveTo(5, 0); g.lineTo(-4, 3.5); g.lineTo(-4, -3.5); g.fill(); g.restore();
        }
      }
    }
  },

  draw(ctx, w, h) {
    const V = this.vista, M = MARGEM, aw = w - M.e - M.d, ah = h - M.t - M.b;
    const s = Math.min(aw / (2 * V.meiaL), ah / (2 * V.meiaA));
    const v = { s, cx: M.e + aw / 2, cy: M.t + ah / 2 };
    const dpr = ctx.getTransform().a;
    const chave = [this.chaveCampo, w, h, s, dpr].join();
    if (chave !== this.chave) { this.chave = chave; this.camada = this.montarCamada(w, h, dpr, v); }
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(this.camada, 0, 0, w, h);

    const X = x => v.cx + x * s, Y = y => v.cy - y * s;
    ctx.strokeStyle = VERDE; ctx.globalAlpha = 0.7; ctx.lineWidth = 1.5; ctx.beginPath();
    this.trilha.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
    ctx.stroke(); ctx.globalAlpha = 1;

    ctx.textAlign = "center";
    const carga = (c, raio, anel) => {
      ctx.fillStyle = c.q > 0 ? COR.coral : c.q < 0 ? COR.azul : COR.eixo;
      ctx.beginPath(); ctx.arc(X(c.x), Y(c.y), raio, 0, 2 * Math.PI); ctx.fill();
      if (anel) { ctx.strokeStyle = "#e8ebf1"; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.fillStyle = "#1b1f27"; ctx.font = `bold ${raio + 3}px system-ui`;
      ctx.fillText(c.q > 0 ? "+" : c.q < 0 ? "−" : "", X(c.x), Y(c.y) + raio / 3 + 1);
    };
    this.fixas.forEach(f => carga(f, 11, false));
    carga(this.c, 7, true);   // carga de prova (com anel branco)
    ctx.textAlign = "start";
  },

  energias() {
    const c = this.c, Ec = 0.5 * c.m * (c.vx ** 2 + c.vy ** 2), U = c.q * this.potencial(c.x, c.y);
    return { Ec, U, E: Ec + U };
  },
  grandezas() { const e = this.energias(); return { t: this.t, valores: [e.Ec, e.U, e.E] }; },

  info() {
    const c = this.c, [ex, ey] = this.campo(c.x, c.y), E = Math.hypot(ex, ey), e = this.energias();
    return `t = ${f2(this.t)} / ${this.duracao} s   (x, y) = (${f2(c.x)}; ${f2(c.y)}) m   |v| = ${f2(Math.hypot(c.vx, c.vy))} m/s${this.fim ? `   [${this.motivo}]` : ""}\n`
      + `no ponto: |E| = ${fmt(E)} N/C   V = ${fmt(this.potencial(c.x, c.y))} V   |F| = ${fmt(Math.abs(c.q) * E)} N\n`
      + `Ec = ${fmt(e.Ec)} J   U = ${fmt(e.U)} J   Emec = ${fmt(e.E)} J`;
  },
};
