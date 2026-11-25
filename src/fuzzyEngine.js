export const VARIABLE_BOUNDS = {
  temp: { min: 16, max: 36, unit: '°C', label: 'Suhu Ruangan (x)' },
  noise: { min: 30, max: 100, unit: 'dB', label: 'Tingkat Kebisingan (y)' },
  light: { min: 0, max: 600, unit: 'Lux', label: 'Intensitas Pencahayaan (z)' },
  output: { min: 0, max: 100, unit: 'Skor', label: 'Skor Kenyamanan Ruang Kerja (w)' }
};

export const RULES = [
  { id: 'R1', temp: 'Dingin', noise: 'Tenang', light: 'Redup', output: 'Cukup Nyaman' },
  { id: 'R2', temp: 'Dingin', noise: 'Tenang', light: 'Cukup', output: 'Sangat Ideal' },
  { id: 'R3', temp: 'Dingin', noise: 'Tenang', light: 'Terang', output: 'Sangat Ideal' },
  { id: 'R4', temp: 'Dingin', noise: 'Sedang', light: 'Redup', output: 'Tidak Nyaman' },
  { id: 'R5', temp: 'Dingin', noise: 'Sedang', light: 'Cukup', output: 'Cukup Nyaman' },
  { id: 'R6', temp: 'Dingin', noise: 'Sedang', light: 'Terang', output: 'Cukup Nyaman' },
  { id: 'R7', temp: 'Dingin', noise: 'Bising', light: 'Redup', output: 'Tidak Nyaman' },
  { id: 'R8', temp: 'Dingin', noise: 'Bising', light: 'Cukup', output: 'Tidak Nyaman' },
  { id: 'R9', temp: 'Dingin', noise: 'Bising', light: 'Terang', output: 'Tidak Nyaman' },
  { id: 'R10', temp: 'Nyaman', noise: 'Tenang', light: 'Redup', output: 'Cukup Nyaman' },
  { id: 'R11', temp: 'Nyaman', noise: 'Tenang', light: 'Cukup', output: 'Sangat Ideal' },
  { id: 'R12', temp: 'Nyaman', noise: 'Tenang', light: 'Terang', output: 'Sangat Ideal' },
  { id: 'R13', temp: 'Nyaman', noise: 'Sedang', light: 'Redup', output: 'Cukup Nyaman' },
  { id: 'R14', temp: 'Nyaman', noise: 'Sedang', light: 'Cukup', output: 'Sangat Ideal' },
  { id: 'R15', temp: 'Nyaman', noise: 'Sedang', light: 'Terang', output: 'Cukup Nyaman' },
  { id: 'R16', temp: 'Nyaman', noise: 'Bising', light: 'Redup', output: 'Tidak Nyaman' },
  { id: 'R17', temp: 'Nyaman', noise: 'Bising', light: 'Cukup', output: 'Cukup Nyaman' },
  { id: 'R18', temp: 'Nyaman', noise: 'Bising', light: 'Terang', output: 'Tidak Nyaman' },
  { id: 'R19', temp: 'Panas', noise: 'Tenang', light: 'Redup', output: 'Tidak Nyaman' },
  { id: 'R20', temp: 'Panas', noise: 'Tenang', light: 'Cukup', output: 'Cukup Nyaman' },
  { id: 'R21', temp: 'Panas', noise: 'Tenang', light: 'Terang', output: 'Cukup Nyaman' },
  { id: 'R22', temp: 'Panas', noise: 'Sedang', light: 'Redup', output: 'Tidak Nyaman' },
  { id: 'R23', temp: 'Panas', noise: 'Sedang', light: 'Cukup', output: 'Cukup Nyaman' },
  { id: 'R24', temp: 'Panas', noise: 'Sedang', light: 'Terang', output: 'Tidak Nyaman' },
  { id: 'R25', temp: 'Panas', noise: 'Bising', light: 'Redup', output: 'Tidak Nyaman' },
  { id: 'R26', temp: 'Panas', noise: 'Bising', light: 'Cukup', output: 'Tidak Nyaman' },
  { id: 'R27', temp: 'Panas', noise: 'Bising', light: 'Terang', output: 'Tidak Nyaman' }
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

export function fuzzifyTemp(x) {
  return {
    Dingin: leftShoulder(x, 20, 24),
    Nyaman: triangle(x, 20, 24, 28),
    Panas: rightShoulder(x, 24, 28)
  };
}

export function fuzzifyNoise(y) {
  return {
    Tenang: leftShoulder(y, 45, 65),
    Sedang: triangle(y, 45, 65, 85),
    Bising: rightShoulder(y, 65, 85)
  };
}

export function fuzzifyLight(z) {
  return {
    Redup: leftShoulder(z, 150, 300),
    Cukup: triangle(z, 150, 300, 450),
    Terang: rightShoulder(z, 300, 450)
  };
}

export function membershipOutput(w) {
  return {
    'Tidak Nyaman': leftShoulder(w, 25, 50),
    'Cukup Nyaman': triangle(w, 25, 50, 75),
    'Sangat Ideal': rightShoulder(w, 50, 75)
  };
}

export function aggregatedMembershipAt(w, aggregation) {
  const base = membershipOutput(w);
  const clippedTidak = Math.min(aggregation['Tidak Nyaman'], base['Tidak Nyaman']);
  const clippedCukup = Math.min(aggregation['Cukup Nyaman'], base['Cukup Nyaman']);
  const clippedIdeal = Math.min(aggregation['Sangat Ideal'], base['Sangat Ideal']);
  return {
    mu: Math.max(clippedTidak, clippedCukup, clippedIdeal),
    clipped: {
      'Tidak Nyaman': clippedTidak,
      'Cukup Nyaman': clippedCukup,
      'Sangat Ideal': clippedIdeal
    }
  };
}

export function classifyScore(score) {
  // Thresholds use 40 and 70 as exact lower bounds so boundary decimals stay unambiguous.
  if (score < 40) {
    return {
      key: 'tidak',
      shortLabel: 'Tidak Nyaman',
      label: 'Tidak Nyaman / Tidak Disarankan untuk Bekerja',
      rangeText: '0 - 39,99',
      summary: 'Lingkungan fisik jauh dari standar K3 dan berisiko menurunkan fokus serta kenyamanan kerja.'
    };
  }
  if (score < 70) {
    return {
      key: 'cukup',
      shortLabel: 'Cukup Nyaman',
      label: 'Cukup Nyaman (Perlu Penyesuaian Ergonomi)',
      rangeText: '40 - 69,99',
      summary: 'Layak untuk kerja ringan, namun salah satu parameter suhu, kebisingan, atau cahaya masih perlu disesuaikan.'
    };
  }
  return {
    key: 'ideal',
    shortLabel: 'Sangat Ideal',
    label: 'Sangat Ideal untuk Fokus',
    rangeText: '70 - 100',
    summary: 'Kondisi ruang selaras dengan standar K3 Perkantoran (Permenkes RI No. 48 Tahun 2016) untuk kerja fokus.'
  };
}

export function buildErgonomicRecommendations(temp, noise, light) {
  let tempRec;
  if (temp >= 23 && temp <= 26) {
    tempRec = {
      param: 'Suhu Ruangan',
      valueText: `${String(temp).replace('.', ',')} °C`,
      standardText: '23 - 26 °C',
      statusKey: 'ideal',
      statusLabel: 'Sesuai K3',
      advice: 'Suhu berada dalam rentang ideal Permenkes (23 sampai 26 °C).'
    };
  } else if ((temp >= 20 && temp < 23) || (temp > 26 && temp < 28)) {
    tempRec = {
      param: 'Suhu Ruangan',
      valueText: `${String(temp).replace('.', ',')} °C`,
      standardText: '23 - 26 °C',
      statusKey: 'cukup',
      statusLabel: 'Batas Transisi',
      advice: temp < 23
        ? 'Sedikit di bawah ideal 23 °C; gunakan pakaian hangat tipis atau hindari hembusan AC langsung.'
        : 'Sedikit di atas 26 °C; tingkatkan sirkulasi udara atau pilih posisi dekat pendingin ruang.'
    };
  } else {
    tempRec = {
      param: 'Suhu Ruangan',
      valueText: `${String(temp).replace('.', ',')} °C`,
      standardText: '23 - 26 °C',
      statusKey: 'tidak',
      statusLabel: 'Di Luar Standar',
      advice: temp < 20
        ? 'Suhu terlalu dingin (< 20 °C); naikkan setelan AC atau gunakan jaket agar otot tidak kaku.'
        : 'Suhu panas (>= 28 °C) mempercepat kelelahan; pindah ke ruang ber-AC dengan suhu 23 sampai 26 °C.'
    };
  }

  let noiseRec;
  if (noise <= 55) {
    noiseRec = {
      param: 'Tingkat Kebisingan',
      valueText: `${String(noise).replace('.', ',')} dB`,
      standardText: '<= 55 - 65 dB',
      statusKey: 'ideal',
      statusLabel: 'Sesuai K3',
      advice: 'Kebisingan rendah (<= 55 dB), optimal untuk konsentrasi tinggi.'
    };
  } else if (noise <= 65) {
    noiseRec = {
      param: 'Tingkat Kebisingan',
      valueText: `${String(noise).replace('.', ',')} dB`,
      standardText: '<= 55 - 65 dB',
      statusKey: 'cukup',
      statusLabel: 'Ambang Maksimal K3',
      advice: 'Masih dalam batas toleransi K3 (55 sampai 65 dB); gunakan earphone bila butuh fokus penuh.'
    };
  } else {
    noiseRec = {
      param: 'Tingkat Kebisingan',
      valueText: `${String(noise).replace('.', ',')} dB`,
      standardText: '<= 55 - 65 dB',
      statusKey: 'tidak',
      statusLabel: 'Melebihi Batas K3',
      advice: 'Melewati batas 65 dB; gunakan peredam bising aktif (ANC) atau pindah ke area kerja yang lebih tenang.'
    };
  }

  let lightRec;
  if (light >= 300 && light <= 500) {
    lightRec = {
      param: 'Intensitas Pencahayaan',
      valueText: `${String(light).replace('.', ',')} Lux`,
      standardText: '>= 300 Lux',
      statusKey: 'ideal',
      statusLabel: 'Sesuai K3',
      advice: 'Pencahayaan memenuhi minimal 300 Lux tanpa risiko silau berlebih.'
    };
  } else if ((light > 150 && light < 300) || light > 500) {
    lightRec = {
      param: 'Intensitas Pencahayaan',
      valueText: `${String(light).replace('.', ',')} Lux`,
      standardText: '>= 300 Lux',
      statusKey: 'cukup',
      statusLabel: 'Perlu Penyesuaian',
      advice: light < 300
        ? 'Belum mencapai 300 Lux; tambahkan lampu meja atau dekati jendela agar mata tidak cepat lelah.'
        : 'Cahaya sangat terang (> 500 Lux, standar >= 300 Lux terpenuhi); atur posisi layar agar bebas pantulan silau.'
    };
  } else {
    lightRec = {
      param: 'Intensitas Pencahayaan',
      valueText: `${String(light).replace('.', ',')} Lux`,
      standardText: '>= 300 Lux',
      statusKey: 'tidak',
      statusLabel: 'Terlalu Redup',
      advice: 'Jauh di bawah standar 300 Lux; nyalakan pencahayaan utama sebelum bekerja di depan layar.'
    };
  }

  return [tempRec, noiseRec, lightRec];
}

export function validateInputs(rawTemp, rawNoise, rawLight) {
  const errors = {};
  const temp = Number(rawTemp);
  const noise = Number(rawNoise);
  const light = Number(rawLight);

  if (!Number.isFinite(temp) || temp < 16 || temp > 36) {
    errors.temp = 'Suhu ruangan harus berupa angka pada rentang 16 sampai 36 °C.';
  }
  if (!Number.isFinite(noise) || noise < 30 || noise > 100) {
    errors.noise = 'Tingkat kebisingan harus berupa angka pada rentang 30 sampai 100 dB.';
  }
  if (!Number.isFinite(light) || light < 0 || light > 600) {
    errors.light = 'Intensitas pencahayaan harus berupa angka pada rentang 0 sampai 600 Lux.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    values: { temp, noise, light }
  };
}

// Default 10-point sample set [10, 20, ..., 100] matches Section 4 of the specification report.
export const DEFAULT_CENTROID_SAMPLES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
export const DENSE_CENTROID_SAMPLES = Array.from({ length: 101 }, (_, i) => i);

export function evaluateMamdani(rawTemp, rawNoise, rawLight, samplePoints = DEFAULT_CENTROID_SAMPLES) {
  const check = validateInputs(rawTemp, rawNoise, rawLight);
  if (!check.valid) {
    throw new Error(Object.values(check.errors).join(' '));
  }

  const { temp, noise, light } = check.values;
  const muTemp = fuzzifyTemp(temp);
  const muNoise = fuzzifyNoise(noise);
  const muLight = fuzzifyLight(light);

  const evaluatedRules = RULES.map((rule) => {
    const mT = muTemp[rule.temp];
    const mN = muNoise[rule.noise];
    const mL = muLight[rule.light];
    const alpha = Math.min(mT, mN, mL);
    return {
      ...rule,
      muTemp: mT,
      muNoise: mN,
      muLight: mL,
      alpha,
      active: alpha > 0
    };
  });

  const activeRules = evaluatedRules.filter((r) => r.active);

  const aggregation = {
    'Tidak Nyaman': 0,
    'Cukup Nyaman': 0,
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
  const recommendations = buildErgonomicRecommendations(temp, noise, light);

  return {
    inputs: { temp, noise, light },
    fuzzification: {
      temp: muTemp,
      noise: muNoise,
      light: muLight
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
    classification,
    recommendations
  };
}
