"use strict";

const axios = require("axios");
const fs = require("fs");
const os = require("os");
const path = require("path");

const SURAHS = [
  "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف",
  "الأنفال", "التوبة", "يونس", "هود", "يوسف", "الرعد", "إبراهيم", "الحجر",
  "النحل", "الإسراء", "الكهف", "مريم", "طه", "الأنبياء", "الحج", "المؤمنون",
  "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم", "لقمان",
  "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر",
  "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح",
  "الحجرات", "ق", "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة",
  "الحديد", "المجادلة", "الحشر", "الممتحنة", "الصف", "الجمعة", "المنافقون",
  "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج", "نوح",
  "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ",
  "النازعات", "عبس", "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج",
  "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد", "الشمس", "الليل", "الضحى",
  "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات",
  "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون",
  "الكوثر", "الكافرون", "النصر", "المسد", "الإخلاص", "الفلق", "الناس",
];

function normalizeName(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/^سور(?:ة|ه)\s*/u, "")
    .replace(/[\u064B-\u065F\u0670\u0640]/gu, "")
    .replace(/[إأآٱ]/gu, "ا")
    .replace(/ى/gu, "ي")
    .replace(/ة/gu, "ه")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase();
}

function normalizeDigits(value) {
  return String(value || "").replace(/[٠-٩]/gu, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function resolveSurah(value) {
  const query = normalizeDigits(value).trim();
  const number = Number(query);
  if (/^\d{1,3}$/.test(query) && number >= 1 && number <= 114) {
    return { number, name: SURAHS[number - 1], audioURL: surahAudioURL(number) };
  }

  const normalized = normalizeName(query);
  const index = SURAHS.findIndex((name) => normalizeName(name) === normalized);
  if (index < 0) return null;
  const surahNumber = index + 1;
  return {
    number: surahNumber,
    name: SURAHS[index],
    audioURL: surahAudioURL(surahNumber),
  };
}

function surahAudioURL(number) {
  return `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${number}.mp3`;
}

async function downloadSurah(number) {
  const url = surahAudioURL(number);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "quran-surah-"));
  const filePath = path.join(directory, `surah-${number}.mp3`);
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 120000,
      maxContentLength: 120 * 1024 * 1024,
      maxBodyLength: 120 * 1024 * 1024,
      headers: { "User-Agent": "zaboza-bot/1.0 (Quran audio)" },
    });
    const buffer = Buffer.from(response.data || []);
    if (buffer.length < 5000) throw new Error("ملف التلاوة فارغ أو غير صالح.");
    fs.writeFileSync(filePath, buffer);
    return { directory, filePath, number, audioURL: url };
  } catch (err) {
    cleanupSurah({ directory });
    throw err;
  }
}

function mp3FrameLength(buffer, offset) {
  if (offset + 4 > buffer.length) return 0;
  const header = buffer.readUInt32BE(offset);
  if (((header & 0xffe00000) >>> 0) !== 0xffe00000) return 0;

  const version = (header >>> 19) & 0x03;
  const layer = (header >>> 17) & 0x03;
  const bitrateIndex = (header >>> 12) & 0x0f;
  const sampleRateIndex = (header >>> 10) & 0x03;
  if (version === 0x01 || layer !== 0x01 || bitrateIndex === 0 || bitrateIndex === 0x0f || sampleRateIndex === 0x03) {
    return 0;
  }

  const mpeg1Bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
  const mpeg2Bitrates = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
  const sampleRates = version === 0x03
    ? [44100, 48000, 32000]
    : version === 0x02
      ? [22050, 24000, 16000]
      : [11025, 12000, 8000];
  const bitrate = (version === 0x03 ? mpeg1Bitrates : mpeg2Bitrates)[bitrateIndex] * 1000;
  const padding = (header >>> 9) & 0x01;
  const coefficient = version === 0x03 ? 144 : 72;
  return Math.floor((coefficient * bitrate) / sampleRates[sampleRateIndex]) + padding;
}

function findNextMp3Frame(buffer, startOffset) {
  for (let offset = Math.max(0, startOffset); offset + 8 < buffer.length; offset++) {
    const frameLength = mp3FrameLength(buffer, offset);
    if (frameLength > 0 && mp3FrameLength(buffer, offset + frameLength) > 0) return offset;
  }
  return -1;
}

function splitSurahForMessenger(audio) {
  const maxPartBytes = 16 * 1024 * 1024;
  if (fs.statSync(audio.filePath).size <= maxPartBytes) {
    return Promise.resolve([audio.filePath]);
  }

  const buffer = fs.readFileSync(audio.filePath);
  if (findNextMp3Frame(buffer, 0) < 0) {
    throw new Error("تعذر تحديد إطارات MP3 اللازمة لتقسيم التسجيل.");
  }

  const parts = [];
  let partStart = 0;
  while (buffer.length - partStart > maxPartBytes) {
    const boundary = findNextMp3Frame(buffer, partStart + maxPartBytes);
    if (boundary <= partStart) throw new Error("تعذر العثور على حدّ صالح بين إطارات MP3.");
    const partPath = path.join(audio.directory, `part-${String(parts.length + 1).padStart(3, "0")}.mp3`);
    fs.writeFileSync(partPath, buffer.subarray(partStart, boundary));
    parts.push(partPath);
    partStart = boundary;
  }

  const lastPart = path.join(audio.directory, `part-${String(parts.length + 1).padStart(3, "0")}.mp3`);
  fs.writeFileSync(lastPart, buffer.subarray(partStart));
  parts.push(lastPart);
  return Promise.resolve(parts);
}

function cleanupSurah(audio) {
  if (audio?.directory) {
    try {
      fs.rmSync(audio.directory, { recursive: true, force: true });
    } catch {}
  }
}

module.exports = {
  SURAHS,
  normalizeName,
  resolveSurah,
  surahAudioURL,
  downloadSurah,
  splitSurahForMessenger,
  cleanupSurah,
  mp3FrameLength,
  findNextMp3Frame,
};