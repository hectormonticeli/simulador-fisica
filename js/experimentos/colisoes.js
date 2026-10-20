import { Corpo, coulomb, passoMundo, colidir, K_COULOMB } from "../fisica/nucleo.js";
import { COR, MARGEM, desenharGrade } from "../core/desenho.js";

const MICRO = 1e-6, DURACAO = 20;   // cargas em µC; a simulação termina após 20 s

export default {
  id: "colisoes",
  titulo: "Colisões entre dois corpos",
  categoria: "Mecânica",
  series: ["Energia cinética (J)", "Energia total Ec + U (J)"],
  parametros: [
    { nome: "m1", rotulo: "Massa de A (kg)", min: 0.5, max: 10, valor: 2, passo: 0.5 },
    { nome: "m2", rotulo: "Massa de B (kg)", min: 0.5, max: 10, valor: 1, passo: 0.5 },
    { nome: "v1", rotulo: "Velocidade de A (m/s)", min: 0, max: 10, valor: 5, passo: 0.5 },
    { nome: "v2", rotulo: "Velocidade de B (m/s, + para a direita)", min: -10, max: 10, valor: 0, passo: 0.5 },
    { nome: "b", rotulo: "Parâmetro de impacto (m)", min: -2, max: 2, valor: 0.3, passo: 0.1 },
    { nome: "e", rotulo: "Coeficiente de restituição", min: 0, max: 1, valor: 1, passo: 0.05 },
    { nome: "q1", rotulo: "Carga de A (µC)", min: -50, max: 50, valor: 0, passo: 1 },
    { nome: "q2", rotulo: "Carga de B (µC)", min: -50, max: 50, valor: 0, passo: 1 },
  ],

  reset(p) {
    const raio = m => 0.25 * Math.sqrt(m);
    this.corpos = [
      new Corpo({ x: -8, y: 0, vx: p.v1, m: p.m1, q: p.q1 * MICRO, r: raio(p.m1) }),
      new Corpo({ x: 8, y: p.b, vx: p.v2, m: p.m2, q: p.q2 * MICRO, r: raio(p.m2) }),
    ];
    this.forcas = [coulomb(this.corpos)];
    this.e = p.e; this.t = 0; this.fim = false; this.escala = null; this.trilhas = [[], []];
    this.p0 = this.momento(); this.E0 = this.energias().E;
  },

  momento() {
    const px = this.corpos.reduce((s, c) => s + c.m * c.vx, 0);
    const py = this.corpos.reduce((s, c) => s + c.m * c.vy, 0);
    return Math.hypot(px, py);
  },

  // Ec = energia cinética total; E = Ec + energia potencial elétrica (conserva-se, exceto na perda do choque)
  energias() {
    const [a, b] = this.corpos;
    const Ec = this.corpos.reduce((s, c) => s + 0.5 * c.m * (c.vx ** 2 + c.vy ** 2), 0);
    return { Ec, E: Ec + K_COULOMB * a.q * b.q / Math.hypot(b.x - a.x, b.y - a.y) };
  },

  step(dt) {
    if (this.fim) return;
    passoMundo(this.corpos, this.forcas, dt);
    colidir(this.corpos[0], this.corpos[1], this.e);
    this.t += dt;
    this.trilhas.forEach((tr, i) => tr.push([this.corpos[i].x, this.corpos[i].y]));
    if (this.t >= DURACAO) this.fim = true;
  },

  draw(ctx, w, h) {
    const M = MARGEM, aw = w - M.e - M.d, ah = h - M.t - M.b;
    this.escala ??= Math.min(aw / 20, ah / 12);   // mostra uma região de 20 m x 12 m
    const s = this.escala, cx = M.e + aw / 2, cy = M.t + ah / 2;
    const X = x => cx + x * s, Y = y => cy - y * s;
    ctx.clearRect(0, 0, w, h);
    desenharGrade(ctx, w, h, X(0), Y(0), s);
    ctx.fillStyle = COR.texto; ctx.font = "12px system-ui"; ctx.fillText("grade: 1 m", X(0) + 6, Y(0) + 16);

    const cores = [COR.azul, COR.coral];
    this.corpos.forEach((c, i) => {
      ctx.strokeStyle = cores[i]; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.5; ctx.beginPath();
      this.trilhas[i].forEach(([x, y], k) => (k ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
      ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = cores[i]; ctx.beginPath(); ctx.arc(X(c.x), Y(c.y), c.r * s, 0, 2 * Math.PI); ctx.fill();
      if (c.q) {   // sinal da carga dentro do corpo
        ctx.fillStyle = "#1b1f27"; ctx.font = "bold 14px system-ui"; ctx.textAlign = "center";
        ctx.fillText(c.q > 0 ? "+" : "−", X(c.x), Y(c.y) + 5); ctx.textAlign = "start";
      }
    });
  },

  grandezas() { const e = this.energias(); return { t: this.t, valores: [e.Ec, e.E] }; },

  info() {
    const e = this.energias();
    return `t = ${this.t.toFixed(2)} s   |p| = ${this.momento().toFixed(3)} kg·m/s (inicial ${this.p0.toFixed(3)})\n`
      + `Ec = ${e.Ec.toFixed(3)} J   E total = ${e.E.toFixed(3)} J (inicial ${this.E0.toFixed(3)})\n`
      + (this.fim ? "Fim da simulação." : this.t > 0 ? "Em andamento..." : "Ajuste os parâmetros e clique em Iniciar. A: azul, B: coral.");
  },
};
