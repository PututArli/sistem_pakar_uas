import assert from 'node:assert/strict';
import {
  RULES,
  evaluateMamdani,
  validateInputs,
  buildErgonomicRecommendations,
  DENSE_CENTROID_SAMPLES
} from '../src/fuzzyEngine.js';

assert.equal(RULES.length, 27, 'Harus terdapat tepat 27 aturan pada basis aturan.');

const combos = new Set(RULES.map((r) => `${r.temp}|${r.noise}|${r.light}`));
assert.equal(combos.size, 27, 'Seluruh 27 kombinasi himpunan input harus unik dan lengkap.');

// Verifikasi Studi Kasus Ruang Kerja / Spot WFC A pada Bab 4 Laporan Revisi (x = 25, y = 60, z = 300)
const spotA = evaluateMamdani(25, 60, 300);

assert.equal(spotA.fuzzification.temp.Dingin, 0);
assert.equal(spotA.fuzzification.temp.Nyaman, 0.75);
assert.equal(spotA.fuzzification.temp.Panas, 0.25);

assert.equal(spotA.fuzzification.noise.Tenang, 0.25);
assert.equal(spotA.fuzzification.noise.Sedang, 0.75);
assert.equal(spotA.fuzzification.noise.Bising, 0);

assert.equal(spotA.fuzzification.light.Redup, 0);
assert.equal(spotA.fuzzification.light.Cukup, 1);
assert.equal(spotA.fuzzification.light.Terang, 0);

assert.deepEqual(
  spotA.activeRules.map((r) => ({ id: r.id, alpha: r.alpha })),
  [
    { id: 'R11', alpha: 0.25 },
    { id: 'R14', alpha: 0.75 },
    { id: 'R20', alpha: 0.25 },
    { id: 'R23', alpha: 0.25 }
  ]
);

assert.equal(spotA.aggregation['Tidak Nyaman'], 0);
assert.equal(spotA.aggregation['Cukup Nyaman'], 0.25);
assert.equal(spotA.aggregation['Sangat Ideal'], 0.75);

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

for (const s of spotA.centroid.samples) {
  assert.ok(
    Math.abs(s.mu - expectedSampleMu[s.w]) < 1e-9,
    `Sampel w=${s.w} seharusnya memiliki mu=${expectedSampleMu[s.w]}, didapat ${s.mu}`
  );
}

assert.ok(Math.abs(spotA.centroid.numerator - 307.5) < 1e-9, 'Pembilang Spot WFC A harus 307,5');
assert.ok(Math.abs(spotA.centroid.denominator - 4.1) < 1e-9, 'Penyebut Spot WFC A harus 4,10');
assert.ok(Math.abs(spotA.centroid.zStar - 75.0) < 1e-9, 'Skor Z* Spot WFC A harus 75,00');
assert.equal(spotA.classification.label, 'Sangat Ideal untuk Fokus');

// Verifikasi rekomendasi ergonomi K3 untuk Spot WFC A
assert.equal(spotA.recommendations.length, 3);
assert.equal(spotA.recommendations[0].statusKey, 'ideal');
assert.equal(spotA.recommendations[1].statusKey, 'cukup');
assert.equal(spotA.recommendations[2].statusKey, 'ideal');

// Uji rekomendasi kondisi di luar standar K3
const badRecs = buildErgonomicRecommendations(30, 80, 100);
assert.deepEqual(
  badRecs.map((r) => r.statusKey),
  ['tidak', 'tidak', 'tidak']
);

// Uji batas ekstrem semesta pembicaraan
const corners = [
  [16, 30, 0],
  [16, 100, 600],
  [36, 30, 0],
  [36, 100, 600],
  [24, 65, 300]
];

for (const [x, y, z] of corners) {
  const res10 = evaluateMamdani(x, y, z);
  const resDense = evaluateMamdani(x, y, z, DENSE_CENTROID_SAMPLES);
  assert.ok(res10.centroid.denominator > 0, `Penyebut tidak boleh nol pada (${x}, ${y}, ${z})`);
  assert.ok(res10.centroid.zStar >= 0 && res10.centroid.zStar <= 100);
  assert.ok(resDense.centroid.zStar >= 0 && resDense.centroid.zStar <= 100);
}

// Uji validasi input di luar semesta pembicaraan
assert.equal(validateInputs(15, 60, 300).valid, false);
assert.equal(validateInputs(37, 60, 300).valid, false);
assert.equal(validateInputs(25, 29, 300).valid, false);
assert.equal(validateInputs(25, 101, 300).valid, false);
assert.equal(validateInputs(25, 60, -1).valid, false);
assert.equal(validateInputs(25, 60, 601).valid, false);
assert.equal(validateInputs('abc', 60, 300).valid, false);

console.log('PASS: Seluruh pengujian mesin Fuzzy Mamdani K3 (27 aturan, Spot WFC A = 75.00, rekomendasi ergonomi, batas ekstrem, dan validasi) berhasil.');
