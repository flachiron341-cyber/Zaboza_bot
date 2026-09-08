"use strict";

const axios = require("axios");

const LANGUAGE_CODES = {
  عربي: "ar",
  العربية: "ar",
  انجليزي: "en",
  إنجليزي: "en",
  الإنجليزية: "en",
  فرنسي: "fr",
  فرنسية: "fr",
  الفرنسية: "fr",
  اسباني: "es",
  إسباني: "es",
  الإسبانية: "es",
  ألماني: "de",
  المانية: "de",
  ألمانية: "de",
  إيطالي: "it",
  ايطالي: "it",
  الإيطالية: "it",
  تركي: "tr",
  التركية: "tr",
  روسي: "ru",
  الروسية: "ru",
  صيني: "zh-CN",
  الصينية: "zh-CN",
  ياباني: "ja",
  اليابانية: "ja",
};

const CITY_TIMEZONES = {
  الجزائر: "Africa/Algiers",
  "الجزائر العاصمة": "Africa/Algiers",
  تونس: "Africa/Tunis",
  طرابلس: "Africa/Tripoli",
  القاهرة: "Africa/Cairo",
  الرباط: "Africa/Casablanca",
  دبي: "Asia/Dubai",
  الرياض: "Asia/Riyadh",
  مكة: "Asia/Riyadh",
  الدوحة: "Asia/Qatar",
  لندن: "Europe/London",
  باريس: "Europe/Paris",
  برلين: "Europe/Berlin",
  إسطنبول: "Europe/Istanbul",
  اسطنبول: "Europe/Istanbul",
  نيويورك: "America/New_York",
  "لوس أنجلوس": "America/Los_Angeles",
  طوكيو: "Asia/Tokyo",
  بكين: "Asia/Shanghai",
  موسكو: "Europe/Moscow",
};

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function searchWeb(query) {
  const headers = {
    "User-Agent": "zaboza-bot/1.0 (Messenger bot search)",
    Accept: "application/json",
  };

  try {
    const response = await axios.get("https://ar.wikipedia.org/w/api.php", {
      params: {
        action: "query",
        list: "search",
        srsearch: query,
        srlimit: 5,
        srprop: "snippet",
        format: "json",
        utf8: 1,
        origin: "*",
      },
      headers,
      timeout: 20000,
    });

    return (response.data?.query?.search || []).map((item) => ({
      title: decodeHtml(item.title),
      snippet: decodeHtml(item.snippet),
      url: `https://ar.wikipedia.org/wiki/${encodeURIComponent(
        String(item.title || "").replace(/ /g, "_")
      )}`,
    }));
  } catch {
    const fallback = await axios.get("https://api.duckduckgo.com/", {
      params: { q: query, format: "json", no_html: 1, skip_disambig: 0 },
      headers,
      timeout: 20000,
    });
    const results = [];
    if (fallback.data?.AbstractText) {
      results.push({
        title: fallback.data.Heading || query,
        snippet: fallback.data.AbstractText,
        url: fallback.data.AbstractURL || "",
      });
    }
    for (const item of fallback.data?.RelatedTopics || []) {
      if (item?.Text) {
        results.push({ title: item.Text.split(" - ")[0], snippet: item.Text, url: item.FirstURL || "" });
      }
      if (results.length >= 5) break;
    }
    return results;
  }
}

function resolveLanguage(value) {
  const raw = normalize(value);
  return LANGUAGE_CODES[raw] || raw.match(/^[a-z]{2}(?:-[a-z]{2})?$/i)?.[0] || null;
}

async function translateText(text, targetLanguage) {
  const target = resolveLanguage(targetLanguage);
  if (!target) throw new Error("اللغة غير معروفة. استخدم اسماً معروفاً أو رمزاً مثل en أو fr.");

  const response = await axios.get("https://api.mymemory.translated.net/get", {
    params: { q: text, langpair: `autodetect|${target}` },
    timeout: 25000,
  });
  const translated = response.data?.responseData?.translatedText;
  if (!translated) throw new Error("لم تُرجع خدمة الترجمة نتيجة.");
  return { target, text: decodeHtml(translated) };
}

async function getWeather(city) {
  const response = await axios.get(
    `https://wttr.in/${encodeURIComponent(city)}?format=j1&lang=ar`,
    { timeout: 25000, headers: { "User-Agent": "zaboza-bot/1.0" } }
  );
  const current = response.data?.current_condition?.[0];
  if (!current) throw new Error("لم أجد بيانات طقس لهذه المدينة.");
  return {
    city: response.data?.nearest_area?.[0]?.areaName?.[0]?.value || city,
    country: response.data?.nearest_area?.[0]?.country?.[0]?.value || "",
    description: current.weatherDesc?.[0]?.value || "غير متوفر",
    temp: current.temp_C,
    feelsLike: current.FeelsLikeC,
    humidity: current.humidity,
    wind: current.windspeedKmph,
  };
}

async function findTimezone(city) {
  const key = normalize(city);
  if (CITY_TIMEZONES[key]) return CITY_TIMEZONES[key];

  const response = await axios.get("https://geocoding-api.open-meteo.com/v1/search", {
    params: { name: city, count: 1, language: "ar", format: "json" },
    timeout: 20000,
  });
  return response.data?.results?.[0]?.timezone || null;
}

async function getCityTime(city) {
  const timezone = await findTimezone(city);
  if (!timezone) throw new Error("لم أجد المنطقة الزمنية لهذه المدينة.");

  const formatted = new Intl.DateTimeFormat("ar", {
    timeZone: timezone,
    dateStyle: "full",
    timeStyle: "medium",
  }).format(new Date());
  return { timezone, formatted };
}

module.exports = {
  searchWeb,
  translateText,
  getWeather,
  getCityTime,
};