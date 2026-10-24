// Peças compartilhadas pelos experimentos de óptica. X(x) e Y(y) convertem metros em pixels.
export const LUZ = "#f4e3a1";

// Linha poligonal por uma lista de pontos do mundo [[x, y], ...]
export function linha(ctx, X, Y, pts, cor, largura = 2, tracejado = [], alfa = 1) {
  ctx.save(); ctx.strokeStyle = cor; ctx.lineWidth = largura; ctx.globalAlpha = alfa; ctx.setLineDash(tracejado);
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)))); ctx.stroke();
  ctx.restore();
}

// Ponta de seta em (px, py), apontando para o ângulo "ang" (em pixels)
function ponta(ctx, px, py, ang, tam) {
  ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(tam, 0); ctx.lineTo(-tam * 0.6, tam * 0.5); ctx.lineTo(-tam * 0.6, -tam * 0.5); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Seta no meio de um trecho p0 -> p1 (indica o sentido do raio)
export function seta(ctx, X, Y, p0, p1, cor, alfa = 1) {
  const ax = X(p0[0]), ay = Y(p0[1]), bx = X(p1[0]), by = Y(p1[1]);
  ctx.save(); ctx.fillStyle = cor; ctx.globalAlpha = alfa;
  ponta(ctx, (ax + bx) / 2, (ay + by) / 2, Math.atan2(by - ay, bx - ax), 6); ctx.restore();
}

// Flecha de (x0, y0) até (x1, y1), em pixels (objeto e imagem)
export function flecha(ctx, x0, y0, x1, y1, cor, tracejado = []) {
  ctx.save(); ctx.strokeStyle = cor; ctx.fillStyle = cor; ctx.lineWidth = 3; ctx.setLineDash(tracejado);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
  ponta(ctx, x1, y1, Math.atan2(y1 - y0, x1 - x0), 9); ctx.restore();
}

// Pulso de luz: cada trecho i do caminho é percorrido com velocidade vs[i] (m/s do mundo).
const duracao = (pts, vs) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]) / vs[i], 0);
function posicaoNoCaminho(pts, vs, t) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], dur = Math.hypot(x1 - x0, y1 - y0) / vs[i];
    if (t <= dur) { const f = dur ? t / dur : 1; return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f]; }
    t -= dur;
  }
  return null;   // já terminou o caminho
}
// Desenha os pulsos no instante t; o ciclo recomeça depois que o mais lento chega ao fim.
export function desenharPulsos(ctx, X, Y, caminhos, t) {
  if (t <= 0) return;
  const tt = t % (Math.max(...caminhos.map(c => duracao(c.pts, c.vs))) + 0.6);
  for (const c of caminhos) {
    const p = posicaoNoCaminho(c.pts, c.vs, tt);
    if (!p) continue;
    ctx.save(); ctx.fillStyle = LUZ; ctx.globalAlpha = c.alfa ?? 1;
    ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), 5, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
  }
}
