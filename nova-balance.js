/* Движок балансировки — метод коэффициентов влияния + регуляризация Тихонова (L-кривая).
   Порт классики из BPpro (заморожено). Единый решатель на 1/2/N плоскостей.
   Комплексные амплитуда+фаза; угол — против вращения (градусы). См. Контракт_Балансировка.md §5. */
(function (root) {
  // --- комплексная арифметика ---
  function cadd(a, b) { return { re: a.re + b.re, im: a.im + b.im }; }
  function csub(a, b) { return { re: a.re - b.re, im: a.im - b.im }; }
  function cmul(a, b) { return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }; }
  function cdiv(a, b) { var d = b.re * b.re + b.im * b.im; return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }; }
  function cconj(a) { return { re: a.re, im: -a.im }; }
  function cabs(a) { return Math.hypot(a.re, a.im); }
  function cscale(a, s) { return { re: a.re * s, im: a.im * s }; }
  function polar(amp, phaseDeg) { var r = phaseDeg * Math.PI / 180; return { re: amp * Math.cos(r), im: amp * Math.sin(r) }; }
  function toPolar(c) { var amp = cabs(c), ph = Math.atan2(c.im, c.re) * 180 / Math.PI; if (ph < 0) ph += 360; return { amp: amp, phase: ph }; }

  // --- решение комплексной СЛАУ M·x = rhs (Гаусс-Жордан, частичный выбор ведущего) ---
  function csolve(M, rhs) {
    var n = M.length, i, j, k;
    var A = M.map(function (row, r) { return row.map(function (c) { return { re: c.re, im: c.im }; }).concat([{ re: rhs[r].re, im: rhs[r].im }]); });
    for (i = 0; i < n; i++) {
      // выбор ведущего по максимуму модуля
      var p = i, best = cabs(A[i][i]);
      for (k = i + 1; k < n; k++) { var v = cabs(A[k][i]); if (v > best) { best = v; p = k; } }
      if (best < 1e-15) return null; // вырожденная матрица
      if (p !== i) { var t = A[p]; A[p] = A[i]; A[i] = t; }
      var piv = A[i][i];
      for (j = i; j <= n; j++) A[i][j] = cdiv(A[i][j], piv);
      for (k = 0; k < n; k++) {
        if (k === i) continue;
        var f = A[k][i];
        if (f.re === 0 && f.im === 0) continue;
        for (j = i; j <= n; j++) A[k][j] = csub(A[k][j], cmul(f, A[i][j]));
      }
    }
    return A.map(function (row) { return row[n]; });
  }

  // --- норма вектора комплексов ---
  function vnorm(v) { var s = 0; for (var i = 0; i < v.length; i++) s += v[i].re * v[i].re + v[i].im * v[i].im; return Math.sqrt(s); }

  /* Решение на грузы.
     V0: [P] комплекс — базовый вектор по точкам.
     A:  [P][M] комплекс — матрица влияния (V на единичный груз·фазор).
     Возврат: { weights:[M] комплекс (масса·фазор), residual:[P] комплекс, alpha, rms, cond } */
  function solve(V0, A) {
    var P = V0.length, M = A[0].length, i, j, k;
    // AhA (M×M) и AhV0 (M)
    var AhA = [], AhV0 = [];
    for (j = 0; j < M; j++) {
      AhA[j] = []; var acc = { re: 0, im: 0 };
      for (k = 0; k < M; k++) {
        var s = { re: 0, im: 0 };
        for (i = 0; i < P; i++) s = cadd(s, cmul(cconj(A[i][j]), A[i][k]));
        AhA[j][k] = s;
      }
      for (i = 0; i < P; i++) acc = cadd(acc, cmul(cconj(A[i][j]), V0[i]));
      AhV0[j] = acc;
    }
    var maxDiag = 1e-12;
    for (j = 0; j < M; j++) maxDiag = Math.max(maxDiag, AhA[j][j].re);

    function solveAt(alpha) {
      var Mm = AhA.map(function (row, r) { return row.map(function (c, cc) { return cc === r ? { re: c.re + alpha, im: c.im } : { re: c.re, im: c.im }; }); });
      var x = csolve(Mm, AhV0);
      if (!x) return null;
      var w = x.map(function (c) { return { re: -c.re, im: -c.im }; }); // w = −(AhA+αI)⁻¹ Ah V0
      // остаток F = A·w + V0
      var F = [];
      for (i = 0; i < P; i++) { var f = { re: V0[i].re, im: V0[i].im }; for (j = 0; j < M; j++) f = cadd(f, cmul(A[i][j], w[j])); F[i] = f; }
      return { w: w, F: F, rn: vnorm(F), sn: vnorm(w) };
    }

    // Минимальная регуляризация Тихонова (числовая устойчивость): точное решение на
    // согласованных данных, LSQ на переопределённых. При вырожденности — эскалация α.
    // (L-кривая для подавления шума на реальных данных — refinement на этап 4.)
    var alpha = maxDiag * 1e-8, pick = solveAt(alpha);
    if (!pick) { for (var e = -6; e <= 1.0001; e += 0.5) { pick = solveAt(maxDiag * Math.pow(10, e)); if (pick) { alpha = maxDiag * Math.pow(10, e); break; } } }
    if (!pick) return { weights: [], residual: [], alpha: 0, rms: 0, singular: true };
    var rms = pick.F.length ? Math.sqrt(pick.F.reduce(function (a, c) { return a + cabs(c) * cabs(c); }, 0) / pick.F.length) : 0;
    return { weights: pick.w, residual: pick.F, alpha: alpha, rms: rms };
  }

  /* Высокоуровневый расчёт по пускам.
     points: число точек P (опора×направление, только включённые).
     base:   [P] {amp, phase} — базовый пуск.
     trials: [M] {mass, angle, vib:[P]{amp,phase}} — по одному пробному пуску на плоскость.
     Возврат: { weights:[M]{mass,angle}, sens:[M][P]{amp,phase}, residual:[P]{amp,phase}, rms } */
  function compute(points, base, trials) {
    var P = points, M = trials.length, i, j;
    var V0 = base.map(function (b) { return polar(b.amp, b.phase); });
    // матрица влияния A[i][j] = (V_trial(i,j) − V0[i]) / (m_j · e^{iθ_j})   (θ против вращения)
    var A = [], sens = [];
    for (j = 0; j < M; j++) sens[j] = [];
    for (i = 0; i < P; i++) {
      A[i] = [];
      for (j = 0; j < M; j++) {
        var Vt = polar(trials[j].vib[i].amp, trials[j].vib[i].phase);
        var wj = polar(trials[j].mass, trials[j].angle);      // масса·фазор пробного груза
        var a = cdiv(csub(Vt, V0[i]), wj);
        A[i][j] = a; sens[j][i] = toPolar(a);
      }
    }
    var r = solve(V0, A);
    return {
      weights: r.weights.map(function (w) { var p = toPolar(w); return { mass: p.amp, angle: p.phase }; }),
      sens: sens,
      residual: r.residual.map(function (f) { return toPolar(f); }),
      rms: r.rms, alpha: r.alpha
    };
  }

  /* Прогноз остатка для произвольных (нерасчётных) грузов w (полярные), по матрице влияния из compute-контекста.
     A нужно передать; для UI удобнее пересобрать: predictResidual(points, base, trials, customWeights). */
  function predictResidual(points, base, trials, customWeights) {
    var P = points, M = trials.length, i, j;
    var V0 = base.map(function (b) { return polar(b.amp, b.phase); });
    var A = [];
    for (i = 0; i < P; i++) { A[i] = []; for (j = 0; j < M; j++) { var Vt = polar(trials[j].vib[i].amp, trials[j].vib[i].phase); var wj = polar(trials[j].mass, trials[j].angle); A[i][j] = cdiv(csub(Vt, V0[i]), wj); } }
    var w = customWeights.map(function (c) { return polar(c.mass, c.angle); });
    var F = [];
    for (i = 0; i < P; i++) { var f = { re: V0[i].re, im: V0[i].im }; for (j = 0; j < M; j++) f = cadd(f, cmul(A[i][j], w[j])); F[i] = f; }
    var rms = Math.sqrt(F.reduce(function (a, c) { return a + cabs(c) * cabs(c); }, 0) / (F.length || 1));
    return { residual: F.map(toPolar), rms: rms };
  }

  // матрица влияния из сохранённых коэффициентов чувствительности (sens[plane][point] полярные)
  function sensToA(points, sens) { var A = [], i, j; for (i = 0; i < points; i++) { A[i] = []; for (j = 0; j < sens.length; j++) A[i][j] = polar(sens[j][i].amp, sens[j][i].phase); } return A; }
  /* Расчёт по СОХРАНЁННЫМ коэффициентам (без пробных пусков): только базовый пуск + матрица влияния. */
  function computeFromSens(points, base, sens) {
    var V0 = base.map(function (b) { return polar(b.amp, b.phase); }), A = sensToA(points, sens), r = solve(V0, A);
    return { weights: r.weights.map(function (w) { var p = toPolar(w); return { mass: p.amp, angle: p.phase }; }), sens: sens, residual: r.residual.map(toPolar), rms: r.rms, alpha: r.alpha };
  }
  function predictFromSens(points, base, sens, cw) {
    var V0 = base.map(function (b) { return polar(b.amp, b.phase); }), A = sensToA(points, sens), i, j;
    var w = cw.map(function (c) { return polar(c.mass, c.angle); }), F = [];
    for (i = 0; i < points; i++) { var f = { re: V0[i].re, im: V0[i].im }; for (j = 0; j < sens.length; j++) f = cadd(f, cmul(A[i][j], w[j])); F[i] = f; }
    var rms = Math.sqrt(F.reduce(function (a, c) { return a + cabs(c) * cabs(c); }, 0) / (F.length || 1));
    return { residual: F.map(toPolar), rms: rms };
  }

  root.NovaBalance = { compute: compute, predictResidual: predictResidual, computeFromSens: computeFromSens, predictFromSens: predictFromSens, solve: solve, _c: { polar: polar, toPolar: toPolar, csolve: csolve } };
})(typeof window !== 'undefined' ? window : globalThis);
