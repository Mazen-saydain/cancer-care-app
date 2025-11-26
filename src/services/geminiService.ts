
// --- TYPES ---
type Language = 'en' | 'ar';

// --- LOCAL MEDICAL LOGIC ENGINE ---
// This engine performs clinical calculations and validation without external APIs.

// 1. LAB RANGES DATABASE (Standard Clinical Ranges)
const LOCAL_LAB_RANGES: any = {
  // Blood
  hemoglobin: { min: 12.0, max: 15.5, unit: 'g/dL', nameAr: 'الهيموجلوبين', nameEn: 'Hemoglobin' },
  wbc: { min: 4500, max: 11000, unit: 'cells/mcL', nameAr: 'خلايا الدم البيضاء', nameEn: 'WBC' },
  rbc: { min: 4.0, max: 5.5, unit: 'million/mcL', nameAr: 'خلايا الدم الحمراء', nameEn: 'RBC' },
  platelets: { min: 150000, max: 450000, unit: 'cells/mcL', nameAr: 'الصافائح الدموية', nameEn: 'Platelets' },
  
  // Kidney
  creatinine: { min: 0.6, max: 1.2, unit: 'mg/dL', nameAr: 'الكرياتينين', nameEn: 'Creatinine' },
  egfr: { min: 90, max: 200, unit: 'mL/min', nameAr: 'معدل الترشيح الكبيبي', nameEn: 'eGFR' },
  bun: { min: 7, max: 20, unit: 'mg/dL', nameAr: 'نيتروجين اليوريا', nameEn: 'BUN' },
  
  // Liver
  alt: { min: 7, max: 56, unit: 'U/L', nameAr: 'إنزيم ALT', nameEn: 'ALT' },
  ast: { min: 10, max: 40, unit: 'U/L', nameAr: 'إنزيم AST', nameEn: 'AST' },
  bilirubin: { min: 0.1, max: 1.2, unit: 'mg/dL', nameAr: 'البيليروبين', nameEn: 'Bilirubin' },
  
  // Diabetes
  fasting_glucose: { min: 70, max: 99, unit: 'mg/dL', nameAr: 'سكر الصائم', nameEn: 'Fasting Glucose' },
  hba1c: { min: 0, max: 5.7, unit: '%', nameAr: 'السكر التراكمي', nameEn: 'HbA1c' },
  post_prandial: { min: 0, max: 140, unit: 'mg/dL', nameAr: 'سكر بعد الأكل', nameEn: 'Post-Prandial' }
};

// --- ANALYSIS FUNCTIONS ---

export const analyzeMedicalValues = async (
  type: string,
  values: Record<string, string>,
  language: Language
): Promise<string> => {
  // Simulate processing delay for "Real Feel"
  await new Promise(resolve => setTimeout(resolve, 1500));

  const isAr = language === 'ar';
  let report = isAr 
    ? `### تقرير التحليل الطبي\n**نوع الفحص:** ${getTestName(type, 'ar')}\n**التاريخ:** ${new Date().toLocaleDateString('ar-EG')}\n\n---\n\n` 
    : `### CLINICAL LAB REPORT\n**TEST TYPE:** ${getTestName(type, 'en').toUpperCase()}\n**DATE:** ${new Date().toLocaleDateString('en-US')}\n\n---\n\n`;

  let alerts: string[] = [];
  let allNormal = true;

  for (const [key, valStr] of Object.entries(values)) {
    const val = parseFloat(valStr);
    const ref = LOCAL_LAB_RANGES[key];
    
    if (!isNaN(val) && ref) {
      const itemName = isAr ? ref.nameAr : ref.nameEn;
      let status = isAr ? "[طبيعي]" : "[NORMAL]";

      if (val < ref.min) {
        status = isAr ? "[منخفض]" : "[LOW]";
        alerts.push(isAr ? `${itemName}: قيمة منخفضة (${val}) - الحد الأدنى (${ref.min})` : `${itemName}: Value Low (${val}) - Min Ref (${ref.min})`);
        allNormal = false;
      } else if (val > ref.max) {
        status = isAr ? "[مرتفع]" : "[HIGH]";
        alerts.push(isAr ? `${itemName}: قيمة مرتفعة (${val}) - الحد الأقصى (${ref.max})` : `${itemName}: Value High (${val}) - Max Ref (${ref.max})`);
        allNormal = false;
      }

      report += `**${itemName}**\nResult: ${val} ${ref.unit} | Status: **${status}**\n`;
      report += `Reference Range: ${ref.min} - ${ref.max}\n\n`;
    }
  }

  report += "---\n\n";
  
  if (allNormal) {
    report += isAr 
      ? `### النتيجة النهائية: مستقرة\nجميع المؤشرات الحيوية تقع ضمن النطاق الطبيعي المعتمد.` 
      : `### OVERALL STATUS: STABLE\nAll vital indicators fall within the standard clinical reference ranges.`;
  } else {
    report += isAr 
      ? `### تنبيهات طبية:\n` 
      : `### CLINICAL ALERTS:\n`;
    alerts.forEach(alert => report += `- ${alert}\n`);
    report += isAr
      ? `\n**التوصية:** يرجى طباعة هذا التقرير ومراجعته مع الطبيب المعالج.`
      : `\n**RECOMMENDATION:** Please print this report and review these findings with your attending physician.`;
  }

  return report;
};

export const generateNutritionPlan = async (
  stats: any, 
  foods: string[],
  conditions: string[],
  language: Language
): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Mifflin-St Jeor Equation
  const bmr = (10 * stats.weight) + (6.25 * stats.height) - (5 * stats.age) - 161;
  // Activity Factor 1.2 (Sedentary/Recovery)
  const tdee = Math.round(bmr * 1.2); 
  const protein = Math.round(stats.weight * 1.2); // 1.2g per kg for recovery
  
  const isAr = language === 'ar';

  if (isAr) {
    return `### خطة التغذية العلاجية
**تحليل المؤشرات الحيوية:**
- مؤشر الأيض الأساسي: ${Math.round(bmr)} سعرة/يوم
- الاحتياج اليومي: ${tdee} سعرة حرارية
- حصة البروتين اليومية: ${protein} جرام

---\n
**الاعتبارات الطبية (${conditions.length > 0 ? conditions.join('، ') : 'عامة'}):**
${conditions.includes('Diabetes') ? '- تقليل الكربوهيدرات البسيطة لضبط مستوى الجلوكوز.\n' : ''}
${conditions.includes('Hypertension') ? '- تحديد استهلاك الصوديوم للحفاظ على ضغط الدم.\n' : ''}
- التركيز على الأغذية القلوية ومضادات الأكسدة لدعم المناعة.

---\n
**الجدول الغذائي المقترح:**

**وجبة الإفطار:**
- ${foods[0] || 'شوفان'} (مصدر ألياف).
- حصة فواكه (توت/فراولة).
- بيضة مسلوقة.

**وجبة الغداء:**
- بروتين: صدر دجاج أو سمك مشوي.
- خضروات: ${foods[1] || 'سبانخ'} و ${foods[2] || 'بروكلي'}.
- نشويات: 4 ملاعق كينوا أو أرز بني.

**وجبة العشاء:**
- زبادي يوناني أو جبن قريش.
- خضروات مطهوة على البخار.

**توصيات السوائل:** شرب 2-3 لتر ماء يومياً.`;
  } else {
    return `### CLINICAL NUTRITION PLAN
**METABOLIC PROFILE:**
- BMR (Basal Metabolic Rate): ${Math.round(bmr)} kcal/day
- Recommended Daily Intake: ${tdee} kcal
- Protein Requirement: ${protein}g

---\n
**CLINICAL CONSIDERATIONS (${conditions.length > 0 ? conditions.join(', ') : 'General'}):**
${conditions.includes('Diabetes') ? '- Strict control of simple carbohydrates for glycemic index management.\n' : ''}
${conditions.includes('Hypertension') ? '- Low sodium protocol initiated.\n' : ''}
- Emphasis on antioxidant-rich foods for immune support.

---\n
**DIETARY SCHEDULE:**

**BREAKFAST:**
- ${foods[0] || 'Oats'} (Complex Carbohydrates).
- Antioxidant Source: Berries/Strawberries.
- Protein: 1 Boiled egg.

**LUNCH:**
- Lean Protein: Grilled Chicken or White Fish.
- Fiber/Micronutrients: ${foods[1] || 'Spinach'} and ${foods[2] || 'Broccoli'}.
- Complex Carb: Quinoa or Brown Rice (1 cup).

**DINNER:**
- Light Protein: Greek Yogurt or Cottage Cheese.
- Steamed vegetables.

**HYDRATION PROTOCOL:** Maintain 2-3 Liters of water intake daily.`;
  }
};

export const generateChatResponse = async (
  message: string, 
  history: string,
  language: Language
): Promise<string> => {
  // Simulate AI thinking time
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  const msg = message.toLowerCase().trim();
  const isAr = language === 'ar';

  // --- ARABIC KNOWLEDGE BASE ---
  if (isAr) {
    // Greetings
    if (msg.match(/^(مرحبا|اهلا|هلا|السلام|صباح|مساء|ازيك|عامل ايه|اخبارك)/)) {
      return "أهلاً بك. أنا المساعد الطبي الخاص بك في 'Cancer Care'. أتمنى أن تكوني بصحة جيدة اليوم. كيف يمكنني مساعدتك في الإجابة على استفساراتك الطبية بخصوص سرطان الثدي أو خطة العلاج؟";
    }
    
    // Breast Cancer Specifics
    if (msg.includes('أعراض') || msg.includes('علامات')) {
      return "الأعراض الشائعة التي تتطلب استشارة طبية تشمل: 1. وجود كتلة غير مؤلمة في الثدي أو تحت الإبط. 2. تغير في حجم أو شكل الثدي. 3. تغيرات في الجلد (مثل التنقير أو الاحمرار). 4. إفرازات غير طبيعية. في حال ملاحظة أي من هذه العلامات، يرجى التوجه للفحص الطبي فوراً.";
    }
    
    if (msg.includes('كيماوي') || msg.includes('كيمياوي')) {
      return "العلاج الكيميائي يعمل على استهداف الخلايا سريعة الانقسام. نصائح هامة أثناء العلاج: 1. شرب كميات كبيرة من الماء لطرد السموم. 2. تجنب الأطعمة النيئة لتفادي العدوى. 3. الراحة التامة بعد الجلسات. الآثار الجانبية قد تشمل الغثيان والإرهاق، ويمكن السيطرة عليها بالأدوية المساعدة.";
    }

    if (msg.includes('وراثي') || msg.includes('اسباب')) {
      return "سرطان الثدي قد يكون له عوامل وراثية (مثل طفرات BRCA1/BRCA2)، ولكن معظم الحالات تحدث نتيجة طفرات مكتسبة. العوامل الأخرى تشمل: التقدم في العمر، التاريخ الهرموني، ونمط الحياة. الفحص الجيني قد يكون موصى به في بعض الحالات.";
    }

    // Co-morbidities (Diseases affecting cancer)
    if (msg.includes('سكر') || msg.includes('سكري')) {
      return "لمرضى السكري المصابين بالسرطان: ارتفاع السكر في الدم قد يضعف المناعة ويزيد من خطر العدوى أثناء العلاج الكيماوي. بعض أدوية السرطان (مثل الكورتيزون) قد ترفع السكر. يجب قياس السكر يومياً وضبط جرعات الأنسولين بالتنسيق مع طبيب الغدد والأورام.";
    }

    if (msg.includes('ضغط') || msg.includes('قلب')) {
      return "بعض علاجات الأورام قد تؤثر على عضلة القلب أو ترفع ضغط الدم. من الضروري مراقبة ضغط الدم بانتظام وتقليل الملح في الطعام، والالتزام بأدوية الضغط لحماية القلب والكلى أثناء فترة العلاج.";
    }

    if (msg.includes('كبد') || msg.includes('فيروس')) {
      return "الكبد هو المسؤول عن تكسير معظم أدوية الأورام. إذا كان هناك قصور في وظائف الكبد، قد يحتاج الطبيب لتعديل جرعة الكيماوي لتجنب التسمم الدوائي. يرجى استخدام قسم 'وظائف الكبد' في التطبيق لمتابعة الإنزيمات بانتظام.";
    }

    if (msg.includes('اكل') || msg.includes('تغذية') || msg.includes('دايت')) {
      return "التغذية السليمة جزء من العلاج. يفضل: 1. زيادة البروتين (لإصلاح الأنسجة). 2. الخضروات والفواكه (مضادات أكسدة). 3. تجنب السكريات واللحوم المصنعة. يمكنك استخدام قسم 'التغذية' في التطبيق للحصول على جدول مخصص.";
    }

    // Fallback Arabic
    return "شكراً لاستفسارك. بصفتي مساعداً طبياً آلياً، أنصحك بتدوين هذا السؤال ومناقشته تفصيلياً مع طبيبك المعالج في الزيارة القادمة لضمان دقة التشخيص والعلاج.";
  } 
  
  // --- ENGLISH KNOWLEDGE BASE ---
  else {
    // Greetings
    if (msg.match(/^(hi|hello|hey|good morning|good evening|how are you)/)) {
      return "Hello. I am your AI Medical Assistant at 'Cancer Care'. I hope you are feeling stable today. How may I assist you with clinical information regarding breast cancer or your treatment plan?";
    }

    // Breast Cancer Specifics
    if (msg.includes('symptom') || msg.includes('sign')) {
      return "Clinical signs requiring evaluation include: 1. A painless lump in the breast or axilla. 2. Changes in breast contour or size. 3. Skin changes (dimpling, redness, 'orange peel' texture). 4. Nipple discharge. Please consult your oncologist if any of these are present.";
    }

    if (msg.includes('chemo') || msg.includes('therapy')) {
      return "Chemotherapy targets rapidly dividing cells. Clinical advice: 1. Maintain high hydration to protect kidneys. 2. Avoid raw foods to prevent neutropenic infection. 3. Prioritize rest. Side effects like nausea can be managed with prescribed antiemetics.";
    }

    if (msg.includes('genetic') || msg.includes('cause')) {
      return "While genetics (e.g., BRCA1/BRCA2 mutations) play a role, many cases are sporadic. Risk factors include age, hormonal history, and lifestyle. Genetic counseling may be recommended based on family history.";
    }

    // Co-morbidities
    if (msg.includes('diabet') || msg.includes('sugar')) {
      return "For diabetic oncology patients: Hyperglycemia can impair immune function and wound healing. Certain steroids used in cancer care may spike blood glucose. Strict monitoring of HbA1c and daily glucose is required to adjust insulin regimens.";
    }

    if (msg.includes('pressure') || msg.includes('hypertension') || msg.includes('heart')) {
      return "Hypertension management is critical, as some antineoplastic agents can be cardiotoxic or elevate BP. Regular monitoring and adherence to antihypertensive medication protect cardiovascular health during treatment.";
    }

    if (msg.includes('liver') || msg.includes('hepatic')) {
      return "The liver metabolizes chemotherapy agents. Impaired liver function (elevated enzymes) may require dosage adjustments to prevent toxicity. Use the 'Liver Function' tool in this app to track your ALT/AST levels.";
    }

    if (msg.includes('food') || msg.includes('diet') || msg.includes('nutrition')) {
      return "Medical nutrition therapy supports recovery. Guidelines: 1. High protein intake (tissue repair). 2. Antioxidant-rich vegetables. 3. Eliminate processed sugars/meats. Please visit the 'Nutrition' section for a personalized plan.";
    }

    // Fallback English
    return "Thank you for your query. As an AI support system, I recommend discussing this specific symptom or concern with your attending oncologist to ensure appropriate clinical management.";
  }
};

export const analyzeLabImage = async (
  base64Image: string, 
  type: string,
  language: Language
): Promise<string> => {
  // Since we cannot use Cloud Vision without API Key, we prompt manual entry which is safer/accurate locally.
  const isAr = language === 'ar';
  return isAr 
    ? "تنبيه النظام: لضمان الدقة الطبية، يرجى إدخال القيم الرقمية يدوياً في الحقول المخصصة. خاصية تحليل الصور غير نشطة حالياً."
    : "SYSTEM ALERT: To ensure clinical accuracy, please manually enter the numeric values in the fields provided. Image analysis is currently inactive.";
};

// Helper
function getTestName(type: string, lang: Language): string {
  const map: any = {
    'blood-analysis': { en: 'Complete Blood Count (CBC)', ar: 'صورة دم كاملة' },
    'kidney-analysis': { en: 'Kidney Function Test', ar: 'وظائف الكلى' },
    'liver-analysis': { en: 'Liver Function Test', ar: 'وظائف الكبد' },
    'diabetes': { en: 'Diabetes Markers', ar: 'مؤشرات السكري' }
  };
  return lang === 'ar' ? (map[type]?.ar || type) : (map[type]?.en || type);
}
