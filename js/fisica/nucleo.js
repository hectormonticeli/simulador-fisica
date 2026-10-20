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

// Avança vários corpos juntos (Verlet em duas fases, para as forças entre corpos serem simétricas).
export function passoMundo(corpos, forcas, dt) {
  const a0 = corpos.map(c => aceleracao(c, forcas));
  corpos.forEach((c, i) => {
    c.x += c.vx * dt + 0.5 * a0[i][0] * dt * dt;
    c.y += c.vy * dt + 0.5 * a0[i][1] * dt * dt;
  });
  corpos.forEach((c, i) => {
    const [bx, by] = aceleracao(c, forcas);
    c.vx += 0.5 * (a0[i][0] + bx) * dt;
    c.vy += 0.5 * (a0[i][1] + by) * dt;
  });
}

// Colisão entre dois discos sem atrito. e = coeficiente de restituição (1 = elástica, 0 = perfeitamente inelástica).
// O impulso age só na direção da reta que liga os centros; devolve true se houve choque neste passo.
export function colidir(a, b, e) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), soma = a.r + b.r;
  if (d >= soma || d === 0) return false;
  const nx = dx / d, ny = dy / d, ia = 1 / a.m, ib = 1 / b.m;
  const sobra = soma - d;                       // separa os corpos que se sobrepuseram
  a.x -= nx * sobra * ia / (ia + ib); a.y -= ny * sobra * ia / (ia + ib);
  b.x += nx * sobra * ib / (ia + ib); b.y += ny * sobra * ib / (ia + ib);
  const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;   // velocidade relativa ao longo da normal
  if (vn >= 0) return false;                    // já estão se afastando
  const J = -(1 + e) * vn / (ia + ib);
  a.vx -= J * nx * ia; a.vy -= J * ny * ia;
  b.vx += J * nx * ib; b.vy += J * ny * ib;
  return true;
}
