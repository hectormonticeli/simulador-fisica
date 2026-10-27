// Sistema óptico paraxial com até 3 elementos (lentes OU espelhos) e até 3 objetos.
// Cada elemento é tratado pela equação de Gauss, 1/f = 1/p + 1/p′; a imagem de um elemento é o objeto do seguinte.
// Nos espelhos, a luz inverte o sentido a cada reflexão (por isso os espelhos seguintes ficam do outro lado).
import { COR, MARGEM, desenharGrade } from "./desenho.js";
import { LUZ, linha, seta, flecha, desenharPulsos } from "./optica.js";

const V0 = 8;   // velocidade do pulso de luz na animação (m/s do mundo)
const COR_OBJ = ["#e8a87c", "#9fd3a8", "#c3a6e8"], COR_RAIO = [LUZ, "#bfe8c9", "#d9c9f2"];
const f2 = x => x.toFixed(2);
const sg = x => (x > 0 ? "+" : "") + f2(x);
const sub = i => "₀₁₂₃₄₅₆₇₈₉"[i];
const longe = x => Math.abs(x) > 1e5;   // "no infinito"
const tamanho = A => (Math.abs(Math.abs(A) - 1) < 0.005 ? "do mesmo tamanho" : Math.abs(A) > 1 ? "ampliada" : "reduzida");
const natureza = (pl, A) => (longe(pl) ? "imagem no infinito" : `imagem ${pl > 0 ? "real" : "virtual"}, ${A < 0 ? "invertida" : "direita"}, ${tamanho(A)}`);
const lim = (x, m) => Math.max(-m, Math.min(m, x));

// Cadeia de imagens de um objeto {x, h}: el = [{x, f, espelho}] na ordem em que a luz os encontra.
export function propagar(el, obj) {
  const st = []; let x = obj.x, hh = obj.h, dir = 1;
  for (const e of el) {
    let po = (e.x - x) * dir; if (Math.abs(po) < 1e-9) po = 1e-9;          // distância do objeto (negativa: objeto virtual)
    let d = po - e.f; if (Math.abs(d) < 1e-6) d = d < 0 ? -1e-6 : 1e-6;    // evita dividir por zero (objeto no foco)
    const pl = e.f * po / d, A = -pl / po, dirOut = e.espelho ? -dir : dir;
    st.push({ e, dirIn: dir, dirOut, p: po, pl, A, xi: e.espelho ? e.x - dir * pl : e.x + dir * pl, hi: A * hh });
    hh = A * hh; x = st[st.length - 1].xi; dir = dirOut;
  }
  return st;
}

// Um raio paraxial saindo da ponta do objeto com inclinação inicial u0 (dy/dx): em cada elemento a altura y
// não muda e a inclinação (em relação ao sentido da luz) passa a u − y/f.
export function raio(el, obj, u0, xmin, xmax) {
  let x = obj.x, y = obj.h, dir = 1, u = u0; const pts = [[x, y]];
  for (const e of el) { y += u * (e.x - x) * dir; x = e.x; pts.push([x, y]); u -= y / e.f; if (e.espelho) dir = -dir; }
  const xf = dir > 0 ? xmax : xmin;
  pts.push([xf, y + u * (xf - x) * dir]);
  return pts;
}

export function criarSistema({ id, titulo, espelho }) {
  const nome = espelho ? "espelho" : "lente", Nome = espelho ? "Espelho" : "Lente", rot = espelho ? "E" : "L";
  const sinais = espelho ? "+ côncavo, − convexo" : "+ convergente, − divergente";
  const pad = espelho ? { f1: 3, f2: 2, f3: -2, d12: 12, d23: 6, p1: 8, p2: 11, p3: 15 } : { f1: 3, f2: 4, f3: -3, d12: 5, d23: 5, p1: 6, p2: 10, p3: 14 };
  const par = (n, rotulo, min, max, valor, passo, limite) => ({ nome: n, rotulo, min, max, valor, passo, limite });
  const dist = [0.05, 1000], alt = [-100, 100], foc = [-1000, 1000];

  return {
    id, titulo, categoria: "Óptica",
    parametros: [
      par("N", `Número de ${espelho ? "espelhos" : "lentes"} (1 a 3)`, 1, 3, 1, 1),
      par("f1", `${Nome} 1: distância focal f₁ (m; ${sinais})`, -30, 30, pad.f1, 0.1, foc),
      par("d12", `Distância do ${nome} 1 ao ${nome} 2 (m)`, 0.5, 50, pad.d12, 0.1, dist),
      par("f2", `${Nome} 2: distância focal f₂ (m)`, -30, 30, pad.f2, 0.1, foc),
      par("d23", `Distância do ${nome} 2 ao ${nome} 3 (m)`, 0.5, 50, pad.d23, 0.1, dist),
      par("f3", `${Nome} 3: distância focal f₃ (m)`, -30, 30, pad.f3, 0.1, foc),
      par("nObj", "Número de objetos (1 a 3)", 1, 3, 1, 1),
      par("p1", `Objeto 1: distância ao ${nome} 1 (m)`, 0.5, 50, pad.p1, 0.1, dist),
      par("h1", "Objeto 1: altura (m; negativa = abaixo do eixo)", -10, 10, 1, 0.1, alt),
      par("p2", `Objeto 2: distância ao ${nome} 1 (m)`, 0.5, 50, pad.p2, 0.1, dist),
      par("h2", "Objeto 2: altura (m)", -10, 10, -0.8, 0.1, alt),
      par("p3", `Objeto 3: distância ao ${nome} 1 (m)`, 0.5, 50, pad.p3, 0.1, dist),
      par("h3", "Objeto 3: altura (m)", -10, 10, 0.6, 0.1, alt),
      par("raios", "Raios mostrados (0 = de todos os objetos; 1 a 3 = só do objeto escolhido)", 0, 3, 1, 1),
    ],

    reset(p) {
      const N = Math.round(p.N), M = Math.round(p.nObj), sel = Math.round(p.raios);
      const fs = [p.f1, p.f2, p.f3].slice(0, N).map(f => (Math.abs(f) < 0.1 ? (f < 0 ? -0.1 : 0.1) : f));
      const ds = [p.d12, p.d23], el = []; let x = 0, dir = 1;
      for (let i = 0; i < N; i++) {   // lentes: tudo para a direita; espelhos: o sentido da luz se inverte a cada reflexão
        if (i > 0) x += dir * ds[i - 1];
        el.push({ x, f: fs[i], espelho, dirIn: dir }); if (espelho) dir = -dir;
      }
      const obj = [[p.p1, p.h1], [p.p2, p.h2], [p.p3, p.h3]].slice(0, M).map(([pp, h]) => ({ x: -pp, h: Math.abs(h) < 0.01 ? (h < 0 ? -0.01 : 0.01) : h }));
      const etapas = obj.map(o => propagar(el, o));

      // região mostrada
      const foco = el.flatMap(e => (espelho ? [e.x - e.dirIn * e.f, e.x - e.dirIn * 2 * e.f] : [e.x - e.f, e.x + e.f]));
      const imgs = etapas.flat().filter(s => !longe(s.xi)).map(s => lim(s.xi, 120));
      const xs = [...obj.map(o => lim(o.x, 400)), ...el.map(e => e.x), ...foco.map(v => lim(v, 120)), ...imgs];
      const xmin = Math.min(...xs) - 2.5, xmax = Math.max(...xs) + 3;

      // três raios de cada objeto mostrado: paralelo ao eixo, pelo centro do 1º elemento e na direção do foco do 1º elemento
      const mostrar = sel === 0 ? obj.map((_, i) => i) : [Math.min(sel, M) - 1];
      const raios = mostrar.map(g => {
        const o = obj[g], p1 = el[0].x - o.x, incl = [0, -o.h / p1];
        if (Math.abs(p1 - el[0].f) > 1e-3) incl.push(-o.h / (p1 - el[0].f));
        return { obj: g, linhas: incl.map(u => raio(el, o, u, xmin, xmax)) };
      });
      const alturas = [...obj.map(o => Math.abs(o.h)), ...etapas.flat().map(s => Math.min(Math.abs(s.hi), 40)),
        ...raios.flatMap(g => g.linhas.flatMap(r => r.slice(0, -1).map(q => Math.abs(q[1]))))];
      Object.assign(this, { N, M, el, obj, etapas, raios, sel: mostrar[0], t: 0, fim: false,
        Atot: etapas.map(st => st.reduce((a, s) => a * s.A, 1)) });
      this.vista = { cx: (xmin + xmax) / 2, meiaL: Math.max(8, (xmax - xmin) / 2), meiaA: Math.min(60, Math.max(4, 1.4 * Math.max(...alturas))) };
    },

    step(dt) { this.t += dt; },

    draw(ctx, w, h) {
      const V = this.vista, Mg = MARGEM, aw = w - Mg.e - Mg.d, ah = h - Mg.t - Mg.b, N = this.N, M = this.M;
      const s = Math.min(aw / (2 * V.meiaL), ah / (2 * V.meiaA)), cx = Mg.e + aw / 2, cy = Mg.t + ah / 2;
      const X = x => cx + (x - V.cx) * s, Y = y => cy - y * s;
      ctx.clearRect(0, 0, w, h); ctx.font = "13px system-ui";
      desenharGrade(ctx, w, h, X(0), Y(0), s);   // o eixo horizontal desenhado é o eixo principal (a grade é de 1 m)

      // elementos e pontos notáveis
      const H = V.meiaA * 0.92, yt = Y(H), yb = Y(-H);
      this.el.forEach((e, i) => {
        const xl = X(e.x), ind = N > 1 ? sub(i + 1) : "", conv = e.f > 0;
        ctx.strokeStyle = COR.azul; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(xl, yt); ctx.lineTo(xl, yb);
        if (!espelho) {   // lente: pontas para fora (convergente) ou para dentro (divergente)
          ctx.moveTo(xl - 7, conv ? yt + 11 : yt); ctx.lineTo(xl, conv ? yt : yt + 11); ctx.lineTo(xl + 7, conv ? yt + 11 : yt);
          ctx.moveTo(xl - 7, conv ? yb - 11 : yb); ctx.lineTo(xl, conv ? yb : yb - 11); ctx.lineTo(xl + 7, conv ? yb - 11 : yb);
        } else {          // espelho: pontas voltadas para a luz (côncavo) ou para o lado contrário (convexo)
          const q = (conv ? -e.dirIn : e.dirIn) * 10;
          ctx.moveTo(xl, yt + 14); ctx.lineTo(xl + q, yt); ctx.moveTo(xl, yb - 14); ctx.lineTo(xl + q, yb);
        }
        ctx.stroke();
        if (espelho) {    // hachuras do lado de trás (não refletor)
          ctx.lineWidth = 1.2; ctx.globalAlpha = 0.6; ctx.beginPath();
          for (let k = 0; k <= 30; k++) { const py = yt + (yb - yt) * k / 30; ctx.moveTo(xl + 2 * e.dirIn, py); ctx.lineTo(xl + 10 * e.dirIn, py + 8); }
          ctx.stroke(); ctx.globalAlpha = 1;
        }
        ctx.fillStyle = COR.azul; if (N > 1) ctx.fillText(`${rot}${ind}`, xl + 9, yt + 16);
        ctx.fillStyle = COR.texto; ctx.textAlign = "center";
        const pts = espelho ? [[e.x - e.dirIn * e.f, `F${ind}`], [e.x - e.dirIn * 2 * e.f, `C${ind}`]] : [[e.x - e.f, `F${ind}`], [e.x + e.f, `F${ind}′`]];
        for (const [x, n] of pts) { ctx.beginPath(); ctx.arc(X(x), Y(0), 3.5, 0, 2 * Math.PI); ctx.fill(); ctx.fillText(n, X(x), Y(0) + 18); }
        ctx.textAlign = "start";
      });

      // raios (cor do objeto); tracejados: prolongamentos que formam imagens virtuais e objetos virtuais
      for (const g of this.raios) for (const r of g.linhas) {
        const c = COR_RAIO[g.obj];
        linha(ctx, X, Y, r, c, 1.8, [], 0.85);
        for (let k = 0; k < r.length - 1; k++) seta(ctx, X, Y, r[k], r[k + 1], c);
        this.etapas[g.obj].forEach((e, i) => {
          if (longe(e.xi)) return;
          if (e.pl < 0) linha(ctx, X, Y, [r[i + 1], [e.xi, e.hi]], c, 1.2, [6, 5], 0.5);
          else if (i < N - 1 && (e.xi - this.el[i + 1].x) * e.dirOut > 0) linha(ctx, X, Y, [r[i + 2], [e.xi, e.hi]], c, 1.2, [6, 5], 0.5);
        });
      }

      // objetos e todas as imagens (na cor do objeto de origem; tracejadas se virtuais)
      this.obj.forEach((o, g) => {
        flecha(ctx, X(o.x), Y(0), X(o.x), Y(o.h), COR_OBJ[g]);
        ctx.fillStyle = COR_OBJ[g]; ctx.fillText(`O${M > 1 ? sub(g + 1) : ""}`, X(o.x) + 8, Y(o.h) + (o.h >= 0 ? -8 : 16));
      });
      this.etapas.forEach((st, g) => st.forEach((e, i) => {
        if (longe(e.xi)) return;
        flecha(ctx, X(e.xi), Y(0), X(e.xi), Y(e.hi), COR_OBJ[g], e.pl < 0 ? [6, 5] : []);
        const idx = M > 1 && N > 1 ? `${sub(g + 1)}.${sub(i + 1)}` : M > 1 ? sub(g + 1) : N > 1 ? sub(i + 1) : "";
        ctx.fillStyle = COR_OBJ[g]; ctx.fillText(`I${idx}`, X(e.xi) + 8, Y(e.hi) + (e.hi >= 0 ? -8 : 16));
      }));
      desenharPulsos(ctx, X, Y, this.raios.flatMap(g => g.linhas.map(r => ({ pts: r, vs: r.slice(1).map(() => V0) }))), this.t);
    },

    info() {
      const { N, M, sel } = this, st = this.etapas[sel], pref = M > 1 ? `O${sub(sel + 1)}: ` : "";
      const linhas = st.map((e, i) => {
        let ctxt = "";
        if (espelho && N === 1) {   // onde está o objeto em relação a F e C
          const p = e.p, f = e.e.f;
          ctxt = f < 0 ? "   (convexo: imagem sempre virtual, direita e reduzida)" : Math.abs(p - 2 * f) < 1e-3 ? "   (objeto em C)" : Math.abs(p - f) < 1e-3 ? "   (objeto em F)" : p > 2 * f ? "   (objeto além de C)" : p > f ? "   (objeto entre F e C)" : "   (objeto entre F e V)";
        }
        return `${pref}${rot}${N > 1 ? sub(i + 1) : ""} (f = ${sg(e.e.f)} m): p = ${longe(e.p) ? "∞" : f2(e.p)}${e.p < 0 ? " (obj. virtual)" : ""}   p′ = ${longe(e.pl) ? "∞" : sg(e.pl)}   A = ${longe(e.A) ? "∞" : sg(e.A)}   → ${natureza(e.pl, e.A)}${ctxt}`;
      });
      const fim = a => (longe(a) ? "∞" : sg(a));
      if (N > 1) linhas.push(`${pref}sistema: A total = ${fim(this.Atot[sel])}   h′ = ${fim(this.Atot[sel] * this.obj[sel].h)} m   → ${natureza(st[N - 1].pl, this.Atot[sel])}`);
      for (let g = 0; g < M; g++) {   // resumo dos demais objetos
        if (g === sel) continue;
        const u = this.etapas[g][N - 1];
        linhas.push(`O${sub(g + 1)} (p = ${f2(-this.obj[g].x)} m, h = ${sg(this.obj[g].h)} m): imagem final em x = ${longe(u.xi) ? "∞" : sg(u.xi)} m, A total = ${fim(this.Atot[g])}   → ${natureza(u.pl, this.Atot[g])}`);
      }
      return linhas.join("\n") + (this.t === 0 ? "   (Iniciar: pulso de luz)" : "");
    },
  };
}
