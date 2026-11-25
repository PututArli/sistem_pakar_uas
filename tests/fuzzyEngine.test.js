import assert from 'node:assert/strict';
import {
  RULES,
  evaluateMamdani,
  validateInputs,
  DENSE_CENTROID_SAMPLES
} from '../src/fuzzyEngine.js';

assert.equal(RULES.length, 27, 'Harus terdapat tepat 27 aturan pada basis aturan.');

const combos = new Set(RULES.map((r) => `${r.wifi}|${r.noise}|${r.price}`));
assert.equal(combos.size, 27, 'Seluruh 27 kombinasi himpunan input harus unik dan lengkap.');

// Verifikasi Studi Kasus Kafe A pada Bab 4 Laporan Progress 1 (x = 45, y = 60, z = 25)
const kafeA = evaluateMamdani(45, 60, 25);

assert.equal(kafeA.fuzzification.wifi.Lambat, 0);
assert.equal(kafeA.fuzzification.wifi.Sedang, 0.25);
assert.equal(kafeA.fuzzification.wifi.Cepat, 0.75);

assert.equal(kafeA.fuzzification.noise.Tenang, 0.25);
assert.equal(kafeA.fuzzification.noise.Sedang, 0.75);
assert.equal(kafeA.fuzzification.noise.Bising, 0);

assert.equal(kafeA.fuzzification.price.Murah, 1);
assert.equal(kafeA.fuzzification.price.Sedang, 0);
assert.equal(kafeA.fuzzification.price.Mahal, 0);

assert.deepEqual(
  kafeA.activeRules.map((r) => ({ id: r.id, alpha: r.alpha })),
  [
    { id: 'R10', alpha: 0.25 },
    { id: 'R13', alpha: 0.25 },
    { id: 'R19', alpha: 0.25 },
    { id: 'R22', alpha: 0.75 }
  ]
);

assert.equal(kafeA.aggregation['Tidak Disarankan'], 0);
assert.equal(kafeA.aggregation['Cocok untuk Santai'], 0.25);
assert.equal(kafeA.aggregation['Sangat Ideal'], 0.75);

const expectedSampleMu = {
  10: 0,
  20: 0,
  30: 0.2,
  40: 0.25,
  50: 0.25,
  60: 0.4,
  70: 0.75,
  80: 0.75,
  90: 0.75,
  100: 0.75
};

for (const s of kafeA.centroid.samples) {
  assert.ok(
    Math.abs(s.mu - expectedSampleMu[s.w]) < 1e-9,
    `Sampel w=${s.w} seharusnya memiliki mu=${expectedSampleMu[s.w]}, didapat ${s.mu}`
  );
}

assert.ok(Math.abs(kafeA.centroid.numerator - 307.5) < 1e-9, 'Pembilang Kafe A harus 307,5');
assert.ok(Math.abs(kafeA.centroid.denominator - 4.1) < 1e-9, 'Penyebut Kafe A harus 4,10');
assert.ok(Math.abs(kafeA.centroid.zStar - 75.0) < 1e-9, 'Skor Z* Kafe A harus 75,00');
assert.equal(kafeA.classification.label, 'Sangat Ideal untuk Fokus');

// Uji batas ekstrem semesta pembicaraan di seluruh kombinasi pojok
const corners = [
  [0, 30, 10],
  [0, 100, 100],
  [100, 30, 10],
  [100, 100, 100],
  [30, 65, 45]
];

for (const [x, y, z] of corners) {
  const res10 = evaluateMamdani(x, y, z);
  const resDense = evaluateMamdani(x, y, z, DENSE_CENTROID_SAMPLES);
  assert.ok(res10.centroid.denominator > 0, `Penyebut tidak boleh nol pada (${x}, ${y}, ${z})`);
  assert.ok(res10.centroid.zStar >= 0 && res10.centroid.zStar <= 100);
  assert.ok(resDense.centroid.zStar >= 0 && resDense.centroid.zStar <= 100);
}

// Uji validasi input di luar semesta pembicaraan
assert.equal(validateInputs(-1, 60, 25).valid, false);
assert.equal(validateInputs(45, 20, 25).valid, false);
assert.equal(validateInputs(45, 60, 5).valid, false);
assert.equal(validateInputs(45, 60, 120).valid, false);
assert.equal(validateInputs('abc', 60, 25).valid, false);

console.log('PASS: Seluruh pengujian mesin Fuzzy Mamdani (27 aturan, Studi Kasus Kafe A = 75.00, batas ekstrem, dan validasi) berhasil.');
