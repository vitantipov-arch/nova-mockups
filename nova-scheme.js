/* NovaScheme2 — улучшенный рендерер схемы агрегата для Nova (hi-fi).
   Палитро-зависимый (light/dark), мягкие линии, машины-корпуса с буквой-типом,
   аккуратные опоры с номерами, пилюли частоты и передаточных отношений.
   Хит-зоны помечены data-act/data-i/data-k для делегирования кликов.
   Модель: вал = линия; на валу машины (позиция left/center/right), опоры (1-4)
   с подшипниками; передачи между валами: rigid/elastic (соосно), belt/gear (перпенд.). */
window.NovaScheme2 = (function () {
  'use strict';
  var MT = {
    motor: { name: 'Двигатель', color: '#4d8dff', gl: 'Д' },
    pump:  { name: 'Насос',      color: '#22b8ac', gl: 'Н' },
    fan:   { name: 'Вентилятор', color: '#e0559f', gl: 'В' },
    comp:  { name: 'Компрессор', color: '#e0912b', gl: 'К' },
    gen:   { name: 'Генератор',  color: '#8a63e6', gl: 'Г' }
  };
  var LINKS = { rigid: { off: false }, elastic: { off: false }, belt: { off: true }, gear: { off: true } };
  var GAP = 42, RH = 150, KW = 66, O = 'h', PAL = {};

  function PT(a, c) { return O === 'h' ? [a, c] : [c, a]; }
  function ln(a0, c0, a1, c1, st, w, extra) { var p = PT(a0, c0), q = PT(a1, c1);
    return '<line x1="' + p[0] + '" y1="' + p[1] + '" x2="' + q[0] + '" y2="' + q[1] + '" stroke="' + st + '" stroke-width="' + w + '" stroke-linecap="round"' + (extra || '') + '/>'; }
  function rc(a0, a1, c0, c1, at) { var p = PT(a0, c0), q = PT(a1, c1); var x = Math.min(p[0], q[0]), y = Math.min(p[1], q[1]);
    return '<rect x="' + x + '" y="' + y + '" width="' + Math.abs(q[0] - p[0]) + '" height="' + Math.abs(q[1] - p[1]) + '" ' + at + '/>'; }
  function tx(a, c, s, fill, sz, w, anch) { var p = PT(a, c);
    return '<text x="' + p[0] + '" y="' + p[1] + '" font-size="' + (sz || 10.5) + '" font-weight="' + (w || 400) + '" fill="' + fill + '" text-anchor="' + (anch || 'middle') + '" dominant-baseline="middle" font-family="IBM Plex Sans,system-ui,sans-serif">' + s + '</text>'; }
  function cir(a, c, r, at) { var p = PT(a, c); return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + r + '" ' + at + '/>'; }
  // пилюля с текстом, центр в (a,c)
  function pill(a, c, s, fg, bg, bd) {
    var w = Math.max(22, s.length * 6.0 + 14), h = 15, p = PT(a, c);
    return rc(a - w / 2 / (O === 'h' ? 1 : 1), a + w / 2, c - h / 2, c + h / 2, 'rx="7.5" fill="' + bg + '" stroke="' + bd + '" stroke-width="1"') + tx(a, c + 0.5, s, fg, 9.5, 600);
  }

  function locLayout(u) {
    var ms = u.machines || [];
    // Одна машина на валу: корпус ВСЕГДА охватывает опоры + рабочий орган
    // (в т.ч. консольное/навесное исполнение — орган со сдвигом к краю, но внутри корпуса)
    if (ms.length === 1) {
      var m0 = ms[0], pos = m0.pos || 'center', pad = 20, over = 44;
      var lE = pos === 'left' ? over : 0, rE = pos === 'right' ? over : 0;
      var s0s = 6 + pad + lE, span0 = 118, s1s = s0s + span0;
      var a0s = s0s - pad - lE, a1s = s1s + pad + rE;
      var oW = pos === 'center' ? Math.min(96, Math.round(span0 * 0.5)) : 34;
      var oA = pos === 'center' ? (s0s + s1s) / 2 : (pos === 'left' ? a0s + oW / 2 + 8 : a1s - oW / 2 - 8);
      return { W: a1s + 6, s0: s0s, s1: s1s, mach: [{ m: m0, a0: a0s, a1: a1s, organA: oA, organW: oW, wrap: true }] };
    }
    var L = [], C = [], R = [];
    ms.forEach(function (m) { var p = m.pos || 'center'; (p === 'left' ? L : (p === 'right' ? R : C)).push(m); });
    var x = 6, mach = [];
    L.forEach(function (m) { mach.push({ m: m, a0: x, a1: x + KW, organA: x + KW - 27, organW: 30, wrap: false }); x += KW + 14; });
    var s0 = x + 18;
    var span = C.length === 0 ? 84 : (C.length === 1 ? 124 : C.length * 64 + 30);
    var s1 = s0 + span;
    if (C.length === 1) { mach.push({ m: C[0], a0: s0 - 20, a1: s1 + 20, organA: (s0 + s1) / 2, organW: Math.min(96, Math.round(span * 0.56)), wrap: true }); }
    else if (C.length > 1) { var cx = s0 + 20; C.forEach(function (m) { mach.push({ m: m, a0: cx, a1: cx + 56, organA: cx + 28, organW: 28, wrap: false }); cx += 64; }); }
    x = s1 + 18;
    R.forEach(function (m) { mach.push({ m: m, a0: x + 12, a1: x + 12 + KW, organA: x + 12 + 27, organW: 30, wrap: false }); x += KW + 24; });
    return { W: x + 8, s0: s0, s1: s1, mach: mach };
  }

  function layout(units, trans) {
    var P = [];
    units.forEach(function (u, i) {
      var LL = locLayout(u), W = LL.W, p = { W: W, LL: LL };
      if (i === 0) { p.aMin = 0; p.aMax = W; p.c = 0; p.dir = 1; p.outA = W; }
      else {
        var T = trans[i - 1] || { type: 'elastic' }, pr = P[i - 1];
        if (!LINKS[T.type].off) {
          p.dir = pr.dir; p.c = pr.c;
          if (p.dir > 0) { p.aMin = pr.outA + GAP; p.aMax = p.aMin + W; } else { p.aMax = pr.outA - GAP; p.aMin = p.aMax - W; }
          p.outA = (p.dir > 0 ? p.aMax : p.aMin); p.coup = true; p.ca = (pr.outA + (p.dir > 0 ? p.aMin : p.aMax)) / 2; p.ct = T.type;
        } else {
          var bs = (T.beltDir === 'up') ? -1 : 1; p.c = pr.c + bs * RH; p.beltA = pr.outA; p.c1 = pr.c; p.c2 = p.c;
          p.dir = (T.nextDir === 'left') ? -1 : 1;
          if (p.dir > 0) { p.aMin = pr.outA; p.aMax = pr.outA + W; } else { p.aMax = pr.outA; p.aMin = p.aMax - W; }
          p.outA = (p.dir > 0 ? p.aMax : p.aMin); p.belt = true; p.ct = T.type;
        }
      }
      P.push(p);
    });
    return P;
  }

  function supNum(units, i, k) { var n = 0; for (var x = 0; x < i; x++) n += (units[x].supports || []).length; return n + k + 1; }

  function drawUnit(units, u, p, i, opts) {
    var LL = p.LL, a0 = p.aMin, c = p.c, hit = '', vis = '', maxH = 40;
    // вал (рисуем ПОД машинами, чтобы буква и корпус были поверх)
    vis += ln(a0 + 2, c, p.aMax - 2, c, PAL.shaft, 3);
    // корпуса машин + подпись НАД корпусом
    LL.mach.forEach(function (mm) {
      var t = MT[mm.m.type] || MT.motor, col = t.color, h = mm.wrap ? 50 : 40, am0 = a0 + mm.a0, am1 = a0 + mm.a1, oa = a0 + mm.organA;
      if (h > maxH) maxH = h;
      vis += rc(am0, am1, c - h, c + h, 'rx="11" fill="' + col + '" fill-opacity="0.09" stroke="' + col + '" stroke-width="1.6"');
      var oh = Math.min(22, Math.max(14, mm.organW / 2));
      vis += rc(oa - mm.organW / 2, oa + mm.organW / 2, c - oh, c + oh, 'rx="4" fill="' + col + '" fill-opacity="0.22" stroke="' + col + '" stroke-width="1.3"');
      var lm = (am0 + am1) / 2;
      if (O === 'h') vis += tx(lm, c - h - 13, t.name, PAL.label, 10.5, 500);
      else vis += tx(lm, c - h - 12, t.name, PAL.label, 10.5, 500, 'end');
    });
    // опоры: засечки на валу + номер ПОД корпусом (не касаясь обводки)
    var ns = (u.supports || []).length, s0 = a0 + LL.s0, s1 = a0 + LL.s1, cy = c + maxH + 18;
    for (var k = 0; k < ns; k++) {
      var ab = (ns === 1) ? (s0 + s1) / 2 : s0 + (s1 - s0) * k / (ns - 1);
      var num = supNum(units, i, k);
      var warn = opts.brgWarn && !((u.supports[k].brgs || []).some(function (b) { return b; }));
      var tickCol = warn ? PAL.warn : PAL.tick;
      vis += ln(ab, c - 24, ab, c - 11, tickCol, 3) + ln(ab, c + 11, ab, c + 24, tickCol, 3);
      var ring = warn ? PAL.warn : PAL.supRing;
      if (opts.activeSup === num) vis += cir(ab, cy, 15, 'fill="none" stroke="' + PAL.sel + '" stroke-width="1.6"');
      vis += cir(ab, cy, 11, 'fill="' + PAL.supFill + '" stroke="' + ring + '" stroke-width="1.2"');
      vis += tx(ab, cy + 0.5, String(num), warn ? PAL.warn : PAL.supText, 10.5, 600);
      if (opts.hit) hit += rc(ab - 17, ab + 17, cy - 14, cy + 14, 'fill="transparent" style="cursor:pointer" data-act="openSup" data-i="' + i + '" data-k="' + k + '"');
    }
    var top = c - maxH - 24, bot = cy + 16;
    var selBg = (opts.sel === i) ? rc(a0 - 6, p.aMax + 6, top - 4, bot + 4, 'rx="14" fill="' + PAL.sel + '" fill-opacity="0.10"') : '';
    if (opts.hit) hit += rc(a0 - 4, p.aMax + 4, top, bot, 'rx="12" fill="transparent" style="cursor:pointer" data-act="selUnit" data-i="' + i + '"');
    return '<g pointer-events="none">' + selBg + vis + '</g>' + hit;
  }

  function drawConn(p, i, trans, opts, ratioTxt) {
    var T = trans[i - 1] || { type: 'elastic' }, c = p.c, vis = '', hit = '';
    if (p.coup) {
      var ca = p.ca;
      vis += ln(ca - 18, c, ca + 18, c, PAL.shaft, 3);
      vis += rc(ca - 15, ca - 9, c - 9, c + 9, 'rx="1.5" fill="' + PAL.metal1 + '"') + rc(ca + 9, ca + 15, c - 9, c + 9, 'rx="1.5" fill="' + PAL.metal1 + '"');
      vis += rc(ca - 9, ca - 3, c - 14, c + 14, 'rx="2" fill="' + PAL.metal2 + '"') + rc(ca + 3, ca + 9, c - 14, c + 14, 'rx="2" fill="' + PAL.metal2 + '"');
      if (T.type === 'elastic') vis += rc(ca - 1.6, ca + 1.6, c - 11, c + 11, 'rx="1.4" fill="' + PAL.warn + '" opacity="0.9"');
      if (opts.hit) hit = rc(ca - 20, ca + 20, c - 20, c + 20, 'fill="transparent" style="cursor:pointer" data-act="openLink" data-i="' + (i - 1) + '"');
    } else if (p.belt) {
      var ba = p.beltA, c1 = p.c1, c2 = p.c2, r1 = 14, r2 = 10;
      if (T.type === 'gear') {
        vis += ln(ba, c1, ba, c2, PAL.metal2, 1.8);
        vis += cir(ba, c1, 15, 'fill="' + PAL.pulleyFill + '" stroke="' + PAL.pulleyStroke + '" stroke-width="2" stroke-dasharray="3.5 2.6"') + cir(ba, c1, 3.2, 'fill="' + PAL.metal1 + '"');
        vis += cir(ba, c2, 11, 'fill="' + PAL.pulleyFill + '" stroke="' + PAL.pulleyStroke + '" stroke-width="2" stroke-dasharray="3.5 2.6"') + cir(ba, c2, 3.2, 'fill="' + PAL.metal1 + '"');
      } else {
        vis += ln(ba - r1 + 2, c1, ba - r2 + 1, c2, PAL.belt, 2.2) + ln(ba + r1 - 2, c1, ba + r2 - 1, c2, PAL.belt, 2.2);
        vis += cir(ba, c1, r1, 'fill="' + PAL.pulleyFill + '" stroke="' + PAL.pulleyStroke + '" stroke-width="2.4"') + cir(ba, c1, 3.2, 'fill="' + PAL.metal1 + '"');
        vis += cir(ba, c2, r2, 'fill="' + PAL.pulleyFill + '" stroke="' + PAL.pulleyStroke + '" stroke-width="2.4"') + cir(ba, c2, 3.2, 'fill="' + PAL.metal1 + '"');
      }
      if (ratioTxt) vis += pill(ba + 22, (c1 + c2) / 2, ratioTxt, PAL.rpmFg, PAL.rpmBg, PAL.rpmBd);
      if (opts.hit) hit = rc(ba - 20, ba + 20, Math.min(c1, c2) - 18, Math.max(c1, c2) + 18, 'fill="transparent" style="cursor:pointer" data-act="openLink" data-i="' + (i - 1) + '"');
    }
    return '<g pointer-events="none">' + vis + '</g>' + hit;
  }

  function render(el, agg, opts) {
    opts = opts || {};
    PAL = opts.pal || {};
    O = (agg && agg.orient === 'v') ? 'v' : 'h';
    var units = (agg && agg.units) || [], trans = (agg && agg.trans) || [];
    if (!units.length) { el.innerHTML = '<svg width="100%" height="80"></svg>'; return; }
    var P = layout(units, trans), s = '';
    P.forEach(function (p, i) {
      if (i > 0) { var rt = opts.ratios && opts.ratios[i - 1]; s += drawConn(p, i, trans, opts, rt); }
      s += drawUnit(units, units[i], p, i, opts);
    });
    var aLo = 1e9, aHi = -1e9, cLo = 1e9, cHi = -1e9;
    P.forEach(function (p) { aLo = Math.min(aLo, p.aMin); aHi = Math.max(aHi, p.aMax); cLo = Math.min(cLo, p.c); cHi = Math.max(cHi, p.c); });
    var pad = 10, minX, minY, W, H;
    if (O === 'h') { minX = aLo - pad; minY = cLo - 74 - pad; W = (aHi + pad) - minX; H = (cHi + 90 + pad) - minY; }
    else { minX = cLo - 116 - pad; minY = aLo - pad; W = (cHi + 96 + pad) - minX; H = (aHi + pad) - minY; }
    el.innerHTML = '<svg width="100%" viewBox="' + minX + ' ' + minY + ' ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" style="max-height:' + (opts.maxH || 240) + 'px" xmlns="http://www.w3.org/2000/svg">' + s + '</svg>';
  }

  return { render: render, MT: MT, LINKS: LINKS, supNum: supNum };
})();
