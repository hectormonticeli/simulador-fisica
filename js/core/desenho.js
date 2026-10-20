// Peças de desenho compartilhadas pelos experimentos (tema escuro, cores suaves).
export const COR = { grade: "#262c37", eixo: "#4a5366", texto: "#aab2c0", azul: "#7fb2e5", coral: "#e8a87c", ideal: "#66748f" };

// Margens da área útil: espaço para o painel da direita, a barra do topo e o bloco de leitura (embaixo).
export const MARGEM = { e: 70, d: 340, t: 80, b: 130 };

// Grade e eixos cobrindo a tela toda, alinhados à origem (X0, Y0 em pixels). "px" = tamanho da célula.
export function desenharGrade(ctx, w, h, X0, Y0, px) {
  ctx.lineWidth = 1; ctx.strokeStyle = COR.grade; ctx.beginPath();
  for (let x = X0 % px; x < w; x += px) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for (let y = Y0 % px; y < h; y += px) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();
  ctx.lineWidth = 1.5; ctx.strokeStyle = COR.eixo; ctx.beginPath();
  ctx.moveTo(X0, 0); ctx.lineTo(X0, h); ctx.moveTo(0, Y0); ctx.lineTo(w, Y0);
  ctx.stroke();
}
