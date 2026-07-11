/* Каталог датчиков вибрации (v0/v1/v2) + тахометр как источник оборотов/фазы.
   Единый источник возможностей: доступные каналы, опции ODR/FS, полосы, дефолты.
   Датчик выбирается при создании программы измерений; глобальное умолчание — из
   nova_sensors.variant (задаётся в connect). Программа хранит свой sensor/phaseRef
   (оверрайд глобального). */
(function (root) {
  var CATALOG = {
    v0: {
      id: 'v0', name: 'ADXL355', title: 'Акселерометр ADXL355',
      short: 'v0 · ADXL355', desc: '3 канала · только ускорение · до ~1 кГц',
      chans: ['aX', 'aY', 'aZ'], hasGyro: false, hasHf: false, balancing: true,
      odrs: [{ v: 2000, band: '~800 Гц' }, { v: 4000, band: '~1 кГц' }],
      accFs: ['±2g', '±4g', '±8g'], gyroFs: [],
      bandOpt: [[2, 500], [2, 1000]],
      def: { odr: 4000, df: 0.3, avg: 2, accFs: '±8g', gyroFs: null }
    },
    v1: {
      id: 'v1', name: 'IMU ICM-42688', title: 'IMU без ВЧ',
      short: 'v1 · IMU', desc: '6 осей: виброскорость + гироскоп · до ~3 кГц',
      chans: ['aX', 'aY', 'aZ', 'gX', 'gY', 'gZ'], hasGyro: true, hasHf: false,
      odrs: [{ v: 4000, band: '~1,5 кГц' }, { v: 8000, band: '~3 кГц' }],
      accFs: ['±2g', '±4g', '±8g', '±16g'], gyroFs: ['±250 °/с', '±500 °/с', '±1000 °/с', '±2000 °/с'],
      bandOpt: [[2, 1000], [2, 2000], [2, 3000]],
      def: { odr: 8000, df: 0.3, avg: 2, accFs: '±16g', gyroFs: '±250 °/с' }
    },
    v2: {
      id: 'v2', name: 'IMU + ВЧ', title: 'IMU с ВЧ-каналом',
      short: 'v2 · IMU+ВЧ', desc: '6 осей + ВЧ ±100g · до 10 кГц',
      chans: ['aX', 'aY', 'aZ', 'gX', 'gY', 'gZ', 'hf'], hasGyro: true, hasHf: true,
      odrs: [{ v: 4000, band: '~1,5 кГц' }, { v: 8000, band: '~3 кГц' }],
      accFs: ['±2g', '±4g', '±8g', '±16g'], gyroFs: ['±250 °/с', '±500 °/с', '±1000 °/с', '±2000 °/с'],
      bandOpt: [[2, 1000], [2, 2000], [10, 5000], [10, 10000]],
      def: { odr: 4000, df: 0.3, avg: 2, accFs: '±16g', gyroFs: '±250 °/с' }
    }
  };
  var ORDER = ['v0', 'v1', 'v2'];
  function readSensors() { try { return JSON.parse(localStorage.getItem('nova_sensors')); } catch (e) { return null; } }
  function get(id) { return CATALOG[id] || CATALOG.v2; }
  function list() { return ORDER.map(function (k) { return CATALOG[k]; }); }
  // глобальное умолчание оператора (для новых программ)
  function current() {
    var s = readSensors();
    if (s && s.variant && CATALOG[s.variant]) return s.variant;
    if (s && typeof s.hf === 'boolean') return s.hf ? 'v2' : 'v1'; // обратная совместимость
    return 'v2';
  }
  function tacho() { var s = readSensors(); return !!(s && s.tacho); }
  root.NovaSensors = { CATALOG: CATALOG, ORDER: ORDER, get: get, list: list, current: current, tacho: tacho };
})(window);
