// Núcleo de física compartilhado. Tudo em unidades do SI; o eixo y aponta para CIMA.
export class Corpo {
  constructor({ x = 0, y = 0, vx = 0, vy = 0, m = 1, q = 0, r = 0.1 } = {}) {
    Object.assign(this, { x, y, vx, vy, m, q, r });
  }
}

// Cada força é uma função (corpo) => [Fx, Fy]. Para ligar/desligar, é só pôr/tirar da lista.
export const gravidade = (g = 9.8) => c => [0, -c.m * g];
export const arrasto = k => c => [-k * c.vx, -k * c.vy];

export const K_COULOMB = 8.99e9;
export const coulomb = outros => c => {   // ainda sem uso: pronta para a eletrostática
  let fx = 0, fy = 0;
  for (const o of outros) {
    if (o === c) continue;
    const dx = c.x - o.x, dy = c.y - o.y, d = Math.hypot(dx, dy) || 1e-9;
    const f = K_COULOMB * c.q * o.q / (d * d);
    fx += f * dx / d; fy += f * dy / d;
  }
  return [fx, fy];
};

export function aceleracao(c, forcas) {
  let fx = 0, fy = 0;
  for (const f of forcas) { const [a, b] = f(c); fx += a; fy += b; }
  return [fx / c.m, fy / c.m];
}

// Integrador velocity Verlet (para o arrasto, que depende da velocidade, é uma boa aproximação).
export function passoVerlet(c, forcas, dt) {
  const [ax, ay] = aceleracao(c, forcas);
  c.x += c.vx * dt + 0.5 * ax * dt * dt;
  c.y += c.vy * dt + 0.5 * ay * dt * dt;
  const [bx, by] = aceleracao(c, forcas);
  c.vx += 0.5 * (ax + bx) * dt;
  c.vy += 0.5 * (ay + by) * dt;
}
