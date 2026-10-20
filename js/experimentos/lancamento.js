import { Corpo, gravidade, arrasto, passoVerlet } from "../fisica/nucleo.js";
import { COR, MARGEM, desenharGrade } from "../core/desenho.js";

export default {
  id: "lancamento",
  titulo: "Lançamento oblíquo",
  categoria: "Mecânica",
  series: ["Altura y (m)"],
  parametros: [
    { nome: "v0", rotulo: "Velocidade inicial (m/s)", min: 1, max: 50, valor: 25, passo: 1 },
    { nome: "angulo", rotulo: "Ângulo (°)", min: 5, max: 85, valor: 45, passo: 1 },
    { nome: "h0", rotulo: "Altura inicial (m)", min: 0, max: 30, valor: 0, passo: 1 },
    { nome: "g", rotulo: "Gravidade (m/s²)", min: 1, max: 25, valor: 9.8, passo: 0.1 },
    { nome: "k", rotulo: "Arrasto (kg/s)", min: 0, max: 1, valor: 0, passo: 0.01 },
  ],

  reset(p) {
    const a = p.angulo * Math.PI / 180;
    const vx = p.v0 * Math.cos(a), vy = p.v0 * Math.sin(a);
    this.c = new Corpo({ y: p.h0, vx, vy, m: 1 });
    this.forcas = [gravidade(p.g), arrasto(p.k)];
    // referência teórica (sem arrasto): tempo de voo, alcance e altura máxima
    const T0 = (vy + Math.sqrt(vy * vy + 2 * p.g * p.h0)) / p.g;
    Object.assign(this, { vx0: vx, vy0: vy, h0: p.h0, g: p.g, T0, R0: vx * T0, H0: p.h0 + vy * vy / (2 * p.g) });
    this.t = 0; this.trilha = []; this.fim = false; this.alcance = 0; this.hmax = p.h0; this.escala = null;
  },

  step(dt) {
    if (this.fim) return;
    passoVerlet(this.c, this.forcas, dt);
    this.t += dt;
    this.hmax = Math.max(this.hmax, this.c.y);
    if (this.c.y <= 0) { this.c.y = 0; this.fim = true; this.alcance = this.c.x; }
    this.trilha.push([this.c.x, this.c.y]);
  },

  draw(ctx, w, h) {
    const M = MARGEM;
    this.escala ??= Math.min((w - M.e - M.d) / Math.max(this.R0, 1), (h - M.t - M.b) / Math.max(this.H0, 1));
    const s = this.escala, X = x => M.e + x * s, Y = y => h - M.b - y * s;
    ctx.clearRect(0, 0, w, h);

    const dg = 10 ** Math.floor(Math.log10(Math.max(this.R0, 1) / 4));
    desenharGrade(ctx, w, h, X(0), Y(0), dg * s);
    ctx.fillStyle = COR.texto; ctx.font = "12px system-ui";
    ctx.fillText(`grade: ${dg} m`, X(0) + 6, Y(0) + 16);

    // trajetória ideal (sem arrasto): serve de prévia enquanto os parâmetros são ajustados
    ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5; ctx.strokeStyle = COR.ideal; ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const t = this.T0 * i / 60;
      const x = X(this.vx0 * t), y = Y(this.h0 + this.vy0 * t - 0.5 * this.g * t * t);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke(); ctx.setLineDash([]);

    // trajetória simulada e corpo
    ctx.lineWidth = 2; ctx.strokeStyle = COR.azul; ctx.beginPath();
    this.trilha.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
    ctx.stroke();
    ctx.fillStyle = COR.coral; ctx.beginPath(); ctx.arc(X(this.c.x), Y(this.c.y), 6, 0, 2 * Math.PI); ctx.fill();
  },

  grandezas() { return { t: this.t, valores: [this.c.y] }; },

  info() {
    let s = `t = ${this.t.toFixed(2)} s   x = ${this.c.x.toFixed(2)} m   y = ${this.c.y.toFixed(2)} m\n`;
    s += `altura máx. = ${this.hmax.toFixed(2)} m  (teórica sem arrasto: ${this.H0.toFixed(2)})\n`;
    s += this.fim ? `alcance = ${this.alcance.toFixed(2)} m  (teórico sem arrasto: ${this.R0.toFixed(2)})`
      : this.t > 0 ? "em voo..." : "Ajuste os parâmetros e clique em Iniciar. A linha tracejada é a trajetória sem arrasto.";
    return s;
  },
};
