/* Datos de ejemplo compartidos por todas las pantallas (ficticios). Temporada 2026 de Fórmula 1, comunidad «Amigos del paddock». */
(function () {
  var seed = 2026;
  function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }

  var users = [
    { id: 'alex', name: 'Álex Ruiz', ini: 'ÁR', skill: 37.6, me: true, since: 2023 },
    { id: 'marta', name: 'Marta Solís', ini: 'MS', skill: 41, since: 2022 },
    { id: 'lucia', name: 'Lucía Ferrer', ini: 'LF', skill: 38, since: 2022 },
    { id: 'sofia', name: 'Sofía Navas', ini: 'SN', skill: 36, since: 2024 },
    { id: 'dani', name: 'Dani Moreno', ini: 'DM', skill: 34, since: 2022 },
    { id: 'irene', name: 'Irene Campos', ini: 'IC', skill: 33, since: 2023 },
    { id: 'nuria', name: 'Nuria Vidal', ini: 'NV', skill: 32, since: 2025 },
    { id: 'pablo', name: 'Pablo Ortega', ini: 'PO', skill: 31, since: 2023 },
    { id: 'carmen', name: 'Carmen Ibáñez', ini: 'CI', skill: 30, since: 2024 },
    { id: 'hugo', name: 'Hugo Prieto', ini: 'HP', skill: 29, since: 2022 },
    { id: 'javi', name: 'Javi Lozano', ini: 'JL', skill: 26, since: 2025 },
    { id: 'ruben', name: 'Rubén Gil', ini: 'RG', skill: 24, since: 2025 }
  ];

  var gps = [
    ['Australia', 'Melbourne', 'Albert Park', '8 mar', 0], ['China', 'Shanghái', 'Shanghai International', '15 mar', 1],
    ['Japón', 'Suzuka', 'Suzuka', '29 mar', 0], ['Baréin', 'Sakhir', 'Bahrain International', '12 abr', 0],
    ['Arabia Saudí', 'Yeda', 'Jeddah Corniche', '19 abr', 0], ['Miami', 'Miami Gardens', 'Miami International Autodrome', '3 may', 1],
    ['Canadá', 'Montreal', 'Gilles Villeneuve', '24 may', 1], ['Mónaco', 'Montecarlo', 'Circuit de Monaco', '7 jun', 0],
    ['Barcelona-Cataluña', 'Montmeló', 'Barcelona-Catalunya', '14 jun', 0], ['Austria', 'Spielberg', 'Red Bull Ring', '28 jun', 0],
    ['Gran Bretaña', 'Silverstone', 'Silverstone', '5 jul', 1], ['Bélgica', 'Spa', 'Spa-Francorchamps', '19 jul', 0],
    ['Hungría', 'Mogyoród', 'Hungaroring', '26 jul', 0], ['Países Bajos', 'Zandvoort', 'Zandvoort', '23 ago', 1],
    ['Italia', 'Monza', 'Autodromo Nazionale Monza', '6 sep', 0], ['España', 'Madrid', 'Madring', '13 sep', 0],
    ['Azerbaiyán', 'Bakú', 'Baku City Circuit', '26 sep', 0], ['Singapur', 'Singapur', 'Marina Bay', '11 oct', 1],
    ['Estados Unidos', 'Austin', 'Circuit of the Americas', '25 oct', 0], ['México', 'Ciudad de México', 'Hermanos Rodríguez', '1 nov', 0],
    ['Brasil', 'São Paulo', 'Interlagos', '8 nov', 0], ['Las Vegas', 'Las Vegas', 'Las Vegas Strip', '21 nov', 0],
    ['Catar', 'Lusail', 'Lusail International', '29 nov', 0], ['Abu Dabi', 'Yas Marina', 'Yas Marina', '6 dic', 0]
  ].map(function (g, i) {
    return { r: i + 1, name: g[0], city: g[1], circuit: g[2], date: g[3], sprint: !!g[4], done: i < 17, next: i === 17,
      code: ['AUS', 'CHN', 'JPN', 'BHR', 'SAU', 'MIA', 'CAN', 'MON', 'BCN', 'AUT', 'GBR', 'BEL', 'HUN', 'NED', 'ITA', 'ESP', 'AZE', 'SIN', 'USA', 'MEX', 'BRA', 'LVG', 'QAT', 'ABU'][i] };
  });

  var teams = [
    ['Mercedes', '#27c4b0'], ['Ferrari', '#d92b2b'], ['McLaren', '#ff8000'], ['Red Bull', '#3a64d8'], ['Alpine', '#2293d1'],
    ['Aston Martin', '#229971'], ['Williams', '#4a8fd6'], ['Racing Bulls', '#6b8cf0'], ['Audi', '#b4b4b4'], ['Haas', '#9ca3af'], ['Cadillac', '#7c8794']
  ].map(function (t) { return { name: t[0], color: t[1] }; });
  var T = {}; teams.forEach(function (t) { T[t.name] = t; });
  var drivers = [
    ['RUS', 'George Russell', 63, 'Mercedes'], ['ANT', 'Kimi Antonelli', 12, 'Mercedes'], ['LEC', 'Charles Leclerc', 16, 'Ferrari'], ['HAM', 'Lewis Hamilton', 44, 'Ferrari'],
    ['NOR', 'Lando Norris', 1, 'McLaren'], ['PIA', 'Oscar Piastri', 81, 'McLaren'], ['VER', 'Max Verstappen', 3, 'Red Bull'], ['HAD', 'Isack Hadjar', 6, 'Red Bull'],
    ['GAS', 'Pierre Gasly', 10, 'Alpine'], ['COL', 'Franco Colapinto', 43, 'Alpine'], ['ALO', 'Fernando Alonso', 14, 'Aston Martin'], ['STR', 'Lance Stroll', 18, 'Aston Martin'],
    ['ALB', 'Alexander Albon', 23, 'Williams'], ['SAI', 'Carlos Sainz', 55, 'Williams'], ['LAW', 'Liam Lawson', 30, 'Racing Bulls'], ['LIN', 'Arvid Lindblad', 41, 'Racing Bulls'],
    ['HUL', 'Nico Hülkenberg', 27, 'Audi'], ['BOR', 'Gabriel Bortoleto', 5, 'Audi'], ['OCO', 'Esteban Ocon', 31, 'Haas'], ['BEA', 'Oliver Bearman', 87, 'Haas'],
    ['PER', 'Sergio Pérez', 11, 'Cadillac'], ['BOT', 'Valtteri Bottas', 77, 'Cadillac']
  ].map(function (d) { return { code: d[0], name: d[1], last: d[1].split(' ').slice(-1)[0], no: d[2], team: d[3], color: T[d[3]].color }; });

  // puntos por GP y usuario (17 GP disputados)
  var N = 17, pts = {}, hits = {};
  users.forEach(function (u) {
    pts[u.id] = []; hits[u.id] = [];
    for (var g = 0; g < N; g++) {
      var v = Math.round(u.skill + (rnd() - 0.5) * 26 + (gps[g].sprint ? 8 : 0));
      v = Math.max(6, Math.min(62, v));
      pts[u.id].push(v);
      hits[u.id].push(Math.max(0, Math.min(14, Math.round(v / 5 + (rnd() - 0.5) * 3))));
    }
  });
  // acumulado y posiciones
  var acc = {}, pos = {};
  users.forEach(function (u) { var s = 0; acc[u.id] = pts[u.id].map(function (v) { s += v; return s; }); });
  users.forEach(function (u) { pos[u.id] = []; });
  for (var g = 0; g < N; g++) {
    users.slice().sort(function (a, b) { return acc[b.id][g] - acc[a.id][g]; }).forEach(function (u, i) { pos[u.id][g] = i + 1; });
  }
  var final = users.slice().sort(function (a, b) { return acc[b.id][N - 1] - acc[a.id][N - 1]; });
  var total = {}; users.forEach(function (u) { total[u.id] = acc[u.id][N - 1]; });
  var order = final.map(function (u) { return u.id; });
  var byId = {}; users.forEach(function (u) { byId[u.id] = u; });

  // puesto en cada GP (1 = más puntos del GP)
  var gpRank = {}; users.forEach(function (u) { gpRank[u.id] = []; });
  for (var g2 = 0; g2 < N; g2++) {
    users.slice().sort(function (a, b) { return pts[b.id][g2] - pts[a.id][g2]; }).forEach(function (u, i) { gpRank[u.id][g2] = i + 1; });
  }
  // sesiones de cada fin de semana y pilotos que se pronostican en cada una
  var SESS = { cs: ['Clasificación sprint', 'Clasif. sprint', 3], sp: ['Sprint', 'Sprint', 5], q: ['Clasificación', 'Clasificación', 5], r: ['Carrera', 'Carrera', 8] };
  function sessionsOf(g) { return gps[g].sprint ? ['cs', 'sp', 'q', 'r'] : ['q', 'r']; }
  // reparto de puntos y aciertos por sesión (pointsBySession / hitsBySession) + bonus (pointsByTopScorer) a quien más aciertos consigue en el GP
  function mk(s0) { var s = s0; return function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
  var bySess = {}, hitsSess = {};
  users.forEach(function (u, ui) {
    bySess[u.id] = []; hitsSess[u.id] = [];
    for (var g = 0; g < N; g++) {
      var r = mk(ui * 977 + g * 31 + 11), ks = sessionsOf(g), bonus = hits[u.id][g] === Math.max.apply(null, users.map(function (x) { return hits[x.id][g]; })) ? 5 : 0, rest = pts[u.id][g] - bonus;
      var w = ks.map(function (k) { return SESS[k][2] * (0.7 + r() * 0.6); }), sw = w.reduce(function (a, b) { return a + b; }, 0);
      var o = {}, h = {}, acc2 = 0, hacc = 0;
      ks.forEach(function (k, i) {
        var v = i === ks.length - 1 ? rest - acc2 : Math.round(rest * w[i] / sw); acc2 += v; o[k] = Math.max(0, v);
        var hv = i === ks.length - 1 ? hits[u.id][g] - hacc : Math.round(hits[u.id][g] * w[i] / sw); hacc += hv; h[k] = Math.max(0, hv);
      });
      o.bonus = bonus; bySess[u.id].push(o); hitsSess[u.id].push(h);
    }
  });
  // temporadas anteriores (posición final) para Palmarés y percentiles
  var past = {
    2023: ['lucia', 'alex', 'marta', 'dani', 'hugo', 'irene', 'pablo'],
    2024: ['alex', 'marta', 'lucia', 'dani', 'irene', 'sofia', 'pablo', 'carmen', 'hugo'],
    2025: ['marta', 'lucia', 'sofia', 'dani', 'alex', 'irene', 'nuria', 'pablo', 'carmen', 'hugo', 'javi', 'ruben']
  };
  var pastPts = { 2023: [1138, 1102, 1077, 990, 931, 902, 870], 2024: [1171, 1150, 1098, 1040, 1012, 990, 954, 921, 880], 2025: [1204, 1188, 1131, 1090, 1066, 1001, 978, 950, 912, 890, 801, 760] };
  // parrillas y resultados de ejemplo (Singapur 2026, sprint)
  var GRID = ['NOR', 'RUS', 'LEC', 'PIA', 'ANT', 'VER', 'HAM', 'ALO', 'SAI', 'HAD', 'GAS', 'ALB', 'LAW', 'BEA', 'HUL', 'COL', 'OCO', 'BOR', 'LIN', 'STR', 'PER', 'BOT'];
  var REAL = { cs: ['NOR', 'LEC', 'RUS'], sp: ['NOR', 'RUS', 'PIA', 'LEC', 'ANT'], q: ['RUS', 'NOR', 'PIA', 'LEC', 'VER'], r: ['NOR', 'RUS', 'LEC', 'PIA', 'ANT', 'VER', 'HAM', 'ALO'] };
  // pronóstico simulado de un jugador: el resultado real con ruido
  function pred(uid, k, base) {
    var b = (base || REAL[k]).slice(), ui = users.map(function (u) { return u.id; }).indexOf(uid), r = mk(ui * 53 + k.length * 7 + 9);
    var pool = GRID.slice(0, 12), n = SESS[k][2], nz = 2.6 + ((ui * 7) % 6) * 0.5;
    var arr = pool.slice().sort(function (a, c) { var ia = b.indexOf(a), ic = b.indexOf(c); return ((ia < 0 ? 9 : ia) + r() * nz) - ((ic < 0 ? 9 : ic) + r() * nz); });
    return arr.slice(0, n);
  }
  // puntos de un pronóstico frente a un resultado (reglas de la comunidad)
  function score(p, real) {
    var tot = 0, ex = 0, cells = p.map(function (c, i) {
      var j = real.indexOf(c);
      if (j === i) { tot += 5; ex++; return { k: 'ex', p: 5, d: 0 }; }
      if (j < 0) return { k: 'x', p: 0, d: null };
      var d = Math.abs(j - i);
      if (d === 1) { tot += 3; return { k: '1', p: 3, d: j - i }; }
      if (d === 2) { tot += 1; return { k: '2', p: 1, d: j - i }; }
      return { k: 'x', p: 0, d: j - i };
    });
    return { pts: tot, ex: ex, cells: cells };
  }
  function median(a) { a = a.slice().sort(function (x, y) { return x - y; }); return a[Math.floor(a.length / 2)]; }
  function quant(a, q) { a = a.slice().sort(function (x, y) { return x - y; }); var i = (a.length - 1) * q, l = Math.floor(i), h = Math.ceil(i); return a[l] + (a[h] - a[l]) * (i - l); }

  var PG = {
    me: 'alex', users: users, byId: byId, gps: gps, teams: teams, drivers: drivers, N: N,
    pts: pts, hits: hits, acc: acc, pos: pos, total: total, order: order,
    gpRank: gpRank, SESS: SESS, sessionsOf: sessionsOf, bySess: bySess, hitsSess: hitsSess,
    past: past, pastPts: pastPts, GRID: GRID, REAL: REAL, pred: pred, score: score, median: median, quant: quant, rng: mk,
    drv: function (code) { for (var i = 0; i < drivers.length; i++) if (drivers[i].code === code) return drivers[i]; return null; },
    // color de serie: tú siempre --c-you; resaltados con color fijo; resto gris
    hue: function (id, hl) { if (id === 'alex') return 'var(--c-you)'; var k = (hl || []).indexOf(id); return k >= 0 ? 'var(--c-' + (2 + k % 5) + ')' : 'var(--c-rest)'; },
    sessColor: { cs: 'var(--c-6)', sp: 'var(--c-3)', q: 'var(--c-2)', r: 'var(--c-4)', bonus: 'var(--c-5)' },
    community: { name: 'Amigos del paddock', members: 12, privacy: 'Cerrada', rule: 'Clásica 2026', since: '2022' },
    rules: [['Posición exacta', 5], ['Posición siguiente (acaba 1 más abajo)', 3], ['Posición anterior (acaba 1 más arriba)', 3], ['Siguiente de la siguiente (2 más abajo)', 1], ['Anterior de la anterior (2 más arriba)', 1], ['Piloto del podio que acaba fuera del podio', 0], ['Piloto que no está en los resultados', 0], ['Bonus al que más aciertos consigue en el GP', 5]],
    // utilidades de gráfico (puro cálculo, sin DOM)
    sx: function (i, n, x0, x1) { return x0 + (n <= 1 ? 0 : (x1 - x0) * i / (n - 1)); },
    sy: function (v, a, b, y0, y1) { return y0 + (y1 - y0) * (1 - (v - a) / ((b - a) || 1)); },
    line: function (arr, x0, x1, y0, y1, a, b) {
      var n = arr.length, d = '';
      for (var i = 0; i < n; i++) d += (i ? 'L' : 'M') + PG.sx(i, n, x0, x1).toFixed(1) + ' ' + PG.sy(arr[i], a, b, y0, y1).toFixed(1);
      return d;
    }
  };
  window.PG = PG;
})();
