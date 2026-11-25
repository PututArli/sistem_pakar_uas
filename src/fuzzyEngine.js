export const VARIABLE_BOUNDS = {
  wifi: { min: 0, max: 100, unit: 'Mbps', label: 'Kecepatan Wi-Fi (x)' },
  noise: { min: 30, max: 100, unit: 'dB', label: 'Tingkat Kebisingan (y)' },
  price: { min: 10, max: 100, unit: 'Ribu Rp', label: 'Harga Rata-rata Menu (z)' },
  output: { min: 0, max: 100, unit: 'Skor', label: 'Skor Kecocokan WFC (w)' }
};

export const RULES = [
  { id: 'R1', wifi: 'Lambat', noise: 'Tenang', price: 'Murah', output: 'Cocok untuk Santai' },
  { id: 'R2', wifi: 'Lambat', noise: 'Tenang', price: 'Sedang', output: 'Cocok untuk Santai' },
  { id: 'R3', wifi: 'Lambat', noise: 'Tenang', price: 'Mahal', output: 'Tidak Disarankan' },
  { id: 'R4', wifi: 'Lambat', noise: 'Sedang', price: 'Murah', output: 'Tidak Disarankan' },
  { id: 'R5', wifi: 'Lambat', noise: 'Sedang', price: 'Sedang', output: 'Tidak Disarankan' },
  { id: 'R6', wifi: 'Lambat', noise: 'Sedang', price: 'Mahal', output: 'Tidak Disarankan' },
  { id: 'R7', wifi: 'Lambat', noise: 'Bising', price: 'Murah', output: 'Tidak Disarankan' },
  { id: 'R8', wifi: 'Lambat', noise: 'Bising', price: 'Sedang', output: 'Tidak Disarankan' },
  { id: 'R9', wifi: 'Lambat', noise: 'Bising', price: 'Mahal', output: 'Tidak Disarankan' },
  { id: 'R10', wifi: 'Sedang', noise: 'Tenang', price: 'Murah', output: 'Sangat Ideal' },
  { id: 'R11', wifi: 'Sedang', noise: 'Tenang', price: 'Sedang', output: 'Sangat Ideal' },
  { id: 'R12', wifi: 'Sedang', noise: 'Tenang', price: 'Mahal', output: 'Cocok untuk Santai' },
  { id: 'R13', wifi: 'Sedang', noise: 'Sedang', price: 'Murah', output: 'Cocok untuk Santai' },
  { id: 'R14', wifi: 'Sedang', noise: 'Sedang', price: 'Sedang', output: 'Cocok untuk Santai' },
  { id: 'R15', wifi: 'Sedang', noise: 'Sedang', price: 'Mahal', output: 'Cocok untuk Santai' },
  { id: 'R16', wifi: 'Sedang', noise: 'Bising', price: 'Murah', output: 'Tidak Disarankan' },
  { id: 'R17', wifi: 'Sedang', noise: 'Bising', price: 'Sedang', output: 'Tidak Disarankan' },
  { id: 'R18', wifi: 'Sedang', noise: 'Bising', price: 'Mahal', output: 'Tidak Disarankan' },
  { id: 'R19', wifi: 'Cepat', noise: 'Tenang', price: 'Murah', output: 'Sangat Ideal' },
  { id: 'R20', wifi: 'Cepat', noise: 'Tenang', price: 'Sedang', output: 'Sangat Ideal' },
  { id: 'R21', wifi: 'Cepat', noise: 'Tenang', price: 'Mahal', output: 'Sangat Ideal' },
  { id: 'R22', wifi: 'Cepat', noise: 'Sedang', price: 'Murah', output: 'Sangat Ideal' },
  { id: 'R23', wifi: 'Cepat', noise: 'Sedang', price: 'Sedang', output: 'Cocok untuk Santai' },
  { id: 'R24', wifi: 'Cepat', noise: 'Sedang', price: 'Mahal', output: 'Cocok untuk Santai' },
  { id: 'R25', wifi: 'Cepat', noise: 'Bising', price: 'Murah', output: 'Cocok untuk Santai' },
  { id: 'R26', wifi: 'Cepat', noise: 'Bising', price: 'Sedang', output: 'Tidak Disarankan' },
  { id: 'R27', wifi: 'Cepat', noise: 'Bising', price: 'Mahal', output: 'Tidak Disarankan' }
];

function leftShoulder(val, peakEnd, zeroStart) {
  if (val <= peakEnd) return 1;
  if (val >= zeroStart) return 0;
  return (zeroStart - val) / (zeroStart - peakEnd);
}

function triangle(val, leftZero, peak, rightZero) {
  if (val <= leftZero || val >= rightZero) return 0;
  if (val <= peak) return (val - leftZero) / (peak - leftZero);
  return (rightZero - val) / (rightZero - peak);
}

function rightShoulder(val, zeroEnd, peakStart) {
  if (val <= zeroEnd) return 0;
  if (val >= peakStart) return 1;
  return (val - zeroEnd) / (peakStart - zeroEnd);
}

export function fuzzifyWifi(x) {
  return {
    Lambat: leftShoulder(x, 10, 30),
    Sedang: triangle(x, 10, 30, 50),
    Cepat: rightShoulder(x, 30, 50)
  };
}

export function fuzzifyNoise(y) {
  return {
    Tenang: leftShoulder(y, 45, 65),
    Sedang: triangle(y, 45, 65, 85),
    Bising: rightShoulder(y, 65, 85)
  };
}

export function fuzzifyPrice(z) {
  return {
    Murah: leftShoulder(z, 25, 45),
    Sedang: triangle(z, 25, 45, 65),
    Mahal: rightShoulder(z, 45, 65)
  };
}

export function membershipOutput(w) {
  return {
    'Tidak Disarankan': leftShoulder(w, 25, 50),
    'Cocok untuk Santai': triangle(w, 25, 50, 75),
    'Sangat Ideal': rightShoulder(w, 50, 75)
  };
}

export function aggregatedMembershipAt(w, aggregation) {
  const base = membershipOutput(w);
  const clippedTidak = Math.min(aggregation['Tidak Disarankan'], base['Tidak Disarankan']);
  const clippedSantai = Math.min(aggregation['Cocok untuk Santai'], base['Cocok untuk Santai']);
  const clippedIdeal = Math.min(aggregation['Sangat Ideal'], base['Sangat Ideal']);
  return {
    mu: Math.max(clippedTidak, clippedSantai, clippedIdeal),
    clipped: {
      'Tidak Disarankan': clippedTidak,
      'Cocok untuk Santai': clippedSantai,
      'Sangat Ideal': clippedIdeal
    }
  };
}

export function classifyScore(score) {
  // Thresholds use 40 and 70 as exact lower bounds so scores like 39.995 do not fall into a gap.
  if (score < 40) {
    return {
      key: 'tidak',
      shortLabel: 'Tidak Disarankan',
      label: 'Tidak Disarankan untuk Nugas',
      rangeText: '0 - 39,99',
      summary: 'Kondisi ruang kerja kurang mendukung pekerjaan yang menuntut konsentrasi atau koneksi stabil.'
    };
  }
  if (score < 70) {
    return {
      key: 'santai',
      shortLabel: 'Cocok untuk Santai',
      label: 'Cocok untuk Santai',
      rangeText: '40 - 69,99',
      summary: 'Layak untuk diskusi ringan, membaca, atau tugas kasual dengan kompromi pada salah satu faktor.'
    };
  }
  return {
    key: 'ideal',
    shortLabel: 'Sangat Ideal',
    label: 'Sangat Ideal untuk Fokus',
    rangeText: '70 - 100',
    summary: 'Kombinasi koneksi, ketenangan ruang, dan harga menu mendukung sesi kerja fokus berdurasi panjang.'
  };
}

export function validateInputs(rawWifi, rawNoise, rawPrice) {
  const errors = {};
  const wifi = Number(rawWifi);
  const noise = Number(rawNoise);
  const price = Number(rawPrice);

  if (!Number.isFinite(wifi) || wifi < 0 || wifi > 100) {
    errors.wifi = 'Kecepatan Wi-Fi harus berupa angka pada rentang 0 sampai 100 Mbps.';
  }
  if (!Number.isFinite(noise) || noise < 30 || noise > 100) {
    errors.noise = 'Tingkat kebisingan harus berupa angka pada rentang 30 sampai 100 dB.';
  }
  if (!Number.isFinite(price) || price < 10 || price > 100) {
    errors.price = 'Harga rata-rata menu harus berupa angka pada rentang 10 sampai 100 ribu rupiah.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    values: { wifi, noise, price }
  };
}

// Default 10-point sample set [10, 20, ..., 100] matches Section 4 of the specification report.
export const DEFAULT_CENTROID_SAMPLES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
export const DENSE_CENTROID_SAMPLES = Array.from({ length: 101 }, (_, i) => i);

export function evaluateMamdani(rawWifi, rawNoise, rawPrice, samplePoints = DEFAULT_CENTROID_SAMPLES) {
  const check = validateInputs(rawWifi, rawNoise, rawPrice);
  if (!check.valid) {
    throw new Error(Object.values(check.errors).join(' '));
  }

  const { wifi, noise, price } = check.values;
  const muWifi = fuzzifyWifi(wifi);
  const muNoise = fuzzifyNoise(noise);
  const muPrice = fuzzifyPrice(price);

  const evaluatedRules = RULES.map((rule) => {
    const mW = muWifi[rule.wifi];
    const mN = muNoise[rule.noise];
    const mP = muPrice[rule.price];
    const alpha = Math.min(mW, mN, mP);
    return {
      ...rule,
      muWifi: mW,
      muNoise: mN,
      muPrice: mP,
      alpha,
      active: alpha > 0
    };
  });

  const activeRules = evaluatedRules.filter((r) => r.active);

  const aggregation = {
    'Tidak Disarankan': 0,
    'Cocok untuk Santai': 0,
    'Sangat Ideal': 0
  };

  for (const rule of activeRules) {
    if (rule.alpha > aggregation[rule.output]) {
      aggregation[rule.output] = rule.alpha;
    }
  }

  const samples = samplePoints.map((w) => {
    const { mu, clipped } = aggregatedMembershipAt(w, aggregation);
    const product = w * mu;
    return { w, mu, product, clipped };
  });

  const numerator = samples.reduce((acc, s) => acc + s.product, 0);
  const denominator = samples.reduce((acc, s) => acc + s.mu, 0);
  const zStar = denominator > 0 ? numerator / denominator : 0;
  const classification = classifyScore(zStar);

  return {
    inputs: { wifi, noise, price },
    fuzzification: {
      wifi: muWifi,
      noise: muNoise,
      price: muPrice
    },
    evaluatedRules,
    activeRules,
    aggregation,
    centroid: {
      samples,
      numerator,
      denominator,
      zStar
    },
    classification
  };
}
