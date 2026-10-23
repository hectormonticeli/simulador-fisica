// Loop com passo fixo: a física avança sempre em blocos de "dt" segundos,
// independente da taxa de quadros do computador.
export class Loop {
  constructor(passo, desenhar, dt = 1 / 120) {
    Object.assign(this, { passo, desenhar, dt, acc: 0, vel: 1, rodando: true, ultimo: null });
  }
  iniciar() { this.id = requestAnimationFrame(t => this.quadro(t)); }
  parar() { cancelAnimationFrame(this.id); }
  quadro(t) {
    if (this.ultimo !== null && this.rodando) {
      // limita o tempo acumulado para não "congelar" ao trocar de aba
      this.acc += Math.min((t - this.ultimo) / 1000, 0.1) * this.vel;
      let n = 0;
      while (this.acc >= this.dt && n++ < 600) { this.passo(this.dt); this.acc -= this.dt; }
      if (this.acc >= this.dt) this.acc = 0;   // não deu tempo de acompanhar: descarta o atraso para a tela não travar
    }
    this.ultimo = t;
    this.desenhar();
    this.id = requestAnimationFrame(t2 => this.quadro(t2));
  }
}
