/**
 * قاموس عربي→إنجليزي لكلمات البحث الشائعة في الصور
 * يُستخدم في أمر !صورة لتحسين نتائج البحث
 */
const DICT = {
  // رياضة
  "ميسي": "messi soccer football",
  "رونالدو": "Cristiano Ronaldo Real Madrid",
  "كرة": "football soccer",
  "كرة قدم": "football soccer",
  "كرة السلة": "basketball",
  "تنس": "tennis",
  "سباحة": "swimming",
  "ملاكمة": "boxing",

  // طبيعة
  "بحر": "sea ocean beach",
  "جبل": "mountain",
  "غابة": "forest trees",
  "صحراء": "desert sand",
  "شلال": "waterfall",
  "نهر": "river",
  "سماء": "sky clouds",
  "غروب": "sunset",
  "شروق": "sunrise",
  "ثلج": "snow winter",

  // حيوانات
  "قطة": "cat",
  "قط": "cat",
  "كلب": "dog",
  "أسد": "lion",
  "نمر": "tiger",
  "حصان": "horse",
  "طائر": "bird",
  "دلفين": "dolphin",
  "فيل": "elephant",
  "ذئب": "wolf",
  "دب": "bear",
  "قرد": "monkey",
  "ثعلب": "fox",

  // مدن وأماكن
  "باريس": "paris france",
  "دبي": "dubai skyline",
  "مكة": "mecca islam",
  "القاهرة": "cairo egypt",
  "اسطنبول": "istanbul turkey",
  "لندن": "london",
  "نيويورك": "new york city",
  "طوكيو": "tokyo japan",

  // طعام
  "بيتزا": "pizza",
  "برغر": "burger",
  "سوشي": "sushi",
  "حلويات": "sweets cake dessert",
  "قهوة": "coffee",
  "شاي": "tea",
  "آيس كريم": "ice cream",

  // تقنية
  "جوال": "smartphone phone",
  "سيارة": "car sports",
  "طائرة": "airplane",
  "دراجة": "motorcycle bike",
  "كمبيوتر": "computer laptop",

  // شخصيات وترفيه
  "انمي": "anime",
  "ايتاتشي": "Itachi Uchiha Naruto",
  "ديزني": "disney cartoon",
  "سوبر هيرو": "superhero",

  // مشاعر وضد ذلك
  "سعادة": "happy joy smile",
  "حزن": "sad crying",
  "حب": "love romantic couple",
  "ورد": "roses flowers",
  "زهرة": "flower",

  // أخرى
  "مطر": "rain",
  "نار": "fire flames",
  "نجوم": "stars night sky",
  "قمر": "moon night",
  "شمس": "sun sunshine",
  "قوس قزح": "rainbow",
};

/**
 * يُحوّل كلمة عربية لمصطلح إنجليزي مناسب لـ loremflickr
 * @param {string} query
 * @returns {string}
 */
function toEnglishQuery(query) {
  const trimmed = query.trim();
  if (DICT[trimmed]) return DICT[trimmed];

  // بحث جزئي
  for (const [ar, en] of Object.entries(DICT)) {
    if (trimmed.includes(ar)) return en;
  }

  // إذا بدت الكلمة إنجليزية أصلاً، ارجعها كما هي
  if (/^[a-zA-Z\s]+$/.test(trimmed)) return trimmed;

  // آخر حل: ارجع الكلمة العربية مباشرة (loremflickr قد يتعامل معها)
  return trimmed;
}

module.exports = { toEnglishQuery };
