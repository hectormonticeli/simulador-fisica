import { Corpo, gravidade, arrasto, passoVerlet } from "../fisica/nucleo.js";

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
    // valores teóricos sem arrasto, para comparar com a simulação
    this.R0 = vx * (vy + Math.sqrt(vy * vy + 2 * p.g * p.h0)) / p.g;
    this.H0 = p.h0 + vy * vy / (2 * p.g);
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
    const m = 30;
    this.escala ??= Math.min((w - 2 * m) / Math.max(this.R0, 1), (h - 2 * m) / Math.max(this.H0, 1));
    const s = this.escala, X = x => m + x * s, Y = y => h - m - y * s;
    ctx.clearRect(0, 0, w, h);

    // grade em metros
    const dg = 10 ** Math.floor(Math.log10(Math.max(this.R0, 1) / 4));
    ctx.strokeStyle = "#dde4ea"; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 0; X(x) < w; x += dg) { ctx.moveTo(X(x), 0); ctx.lineTo(X(x), h); }
    for (let y = 0; Y(y) > 0; y += dg) { ctx.moveTo(0, Y(y)); ctx.lineTo(w, Y(y)); }
    ctx.stroke();
    ctx.fillStyle = "#14213d"; ctx.fillText(`grade: ${dg} m`, 8, 16);

    // solo, trajetória e corpo
    ctx.strokeStyle = "#14213d"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(w, Y(0)); ctx.stroke();
    ctx.strokeStyle = "#1f5fbf"; ctx.beginPath();
    this.trilha.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
    ctx.stroke();
    ctx.fillStyle = "#c8372d"; ctx.beginPath(); ctx.arc(X(this.c.x), Y(this.c.y), 6, 0, 2 * Math.PI); ctx.fill();
  },

  grandezas() { return { t: this.t, valores: [this.c.y] }; },

  info() {
    let s = `t = ${this.t.toFixed(2)} s\nx = ${this.c.x.toFixed(2)} m\ny = ${this.c.y.toFixed(2)} m\n`;
    s += `altura máx. = ${this.hmax.toFixed(2)} m  (teórica sem arrasto: ${this.H0.toFixed(2)})\n`;
    s += this.fim ? `alcance = ${this.alcance.toFixed(2)} m  (teórico sem arrasto: ${this.R0.toFixed(2)})` : "em voo...";
    return s;
  },
};
