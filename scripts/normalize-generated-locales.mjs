import { readFile, writeFile } from 'node:fs/promises';

const LOCALES = ['hi', 'es', 'ar', 'fr', 'de', 'ja', 'ko'];
const JSON_MESSAGE_KEYS = [
  'auth_error_codes',
  'pricing_plans_free_features',
  'pricing_plans_free_limits',
  'pricing_plans_lifetime_features',
  'pricing_plans_lifetime_limits',
  'pricing_plans_pro_features',
  'pricing_plans_pro_limits',
];

const BRAND_VALUES = {
  site_name: 'jevailab',
  built_with_brand: 'jevailab',
};

const NATURAL_COPY = {
  hi: {
    auth_common_login: 'लॉग इन',
    auth_common_signup: 'साइन अप',
    auth_login_sign_in: 'लॉग इन करें',
    auth_login_welcome_back: 'वापसी पर स्वागत है',
    auth_register_sign_up: 'साइन अप करें',
    auth_register_sign_in_hint: 'पहले से खाता है? लॉग इन करें',
    auth_login_sign_up_hint: 'खाता नहीं है? साइन अप करें',
    auth_social_or: 'या सोशल अकाउंट से जारी रखें',
    auth_social_sign_in_with_google: 'Google से लॉग इन करें',
    common_mode_light: 'लाइट',
    common_mode_dark: 'डार्क',
    common_mode_system: 'सिस्टम',
    home_hero_primary: 'छवि बनाएं',
    home_hero_secondary: 'टेम्पलेट देखें',
    site_name: 'jevailab',
    site_title: 'jevailab | AI छवियां बनाएं',
    site_description: 'jevailab में प्रकाशित टेम्पलेट और अपने विवरण से AI छवियां बनाएं।',
  },
  es: {
    auth_common_login: 'Iniciar sesión',
    auth_common_signup: 'Registrarse',
    auth_login_welcome_back: 'Te damos la bienvenida',
    auth_register_sign_up: 'Registrarse',
    auth_register_sign_in_hint: '¿Ya tienes una cuenta? Inicia sesión',
    auth_login_sign_up_hint: '¿No tienes una cuenta? Regístrate',
    auth_social_or: 'O continúa con una cuenta social',
    home_hero_primary: 'Crear una imagen',
    common_mode_light: 'Claro',
    common_mode_dark: 'Oscuro',
    common_mode_system: 'Sistema',
  },
  ar: {
    auth_common_login: 'تسجيل الدخول',
    auth_common_signup: 'إنشاء حساب',
    auth_login_sign_in: 'تسجيل الدخول',
    auth_login_welcome_back: 'مرحبًا بعودتك',
    auth_register_sign_up: 'إنشاء حساب',
    auth_register_sign_in_hint: 'لديك حساب بالفعل؟ سجّل الدخول',
    auth_login_sign_up_hint: 'ليس لديك حساب؟ أنشئ حسابًا',
    auth_social_or: 'أو تابع باستخدام حساب اجتماعي',
    auth_social_sign_in_with_google: 'تسجيل الدخول باستخدام Google',
    common_mode_light: 'فاتح',
    common_mode_dark: 'داكن',
    common_mode_system: 'النظام',
    home_hero_title: 'أنشئ صورًا بالذكاء الاصطناعي من قالب وكلماتك',
    home_hero_primary: 'إنشاء صورة',
    site_name: 'jevailab',
    site_title: 'jevailab | إنشاء صور بالذكاء الاصطناعي',
    site_description:
      'أنشئ صورًا بالذكاء الاصطناعي في jevailab باستخدام القوالب المنشورة وأوصافك النصية.',
  },
  fr: {
    auth_common_login: 'Se connecter',
    auth_common_signup: "S'inscrire",
    auth_login_welcome_back: 'Bon retour parmi nous',
    auth_register_sign_in_hint: 'Vous avez déjà un compte ? Connectez-vous',
    auth_login_sign_up_hint: "Vous n'avez pas de compte ? Inscrivez-vous",
    auth_social_or: 'Ou continuer avec un compte social',
    common_mode_light: 'Clair',
    common_mode_dark: 'Sombre',
    common_mode_system: 'Système',
  },
  de: {
    auth_common_login: 'Anmelden',
    auth_common_signup: 'Registrieren',
    auth_login_welcome_back: 'Willkommen zurück',
    auth_register_sign_up: 'Registrieren',
    auth_register_sign_in_hint: 'Sie haben bereits ein Konto? Anmelden',
    auth_login_sign_up_hint: 'Noch kein Konto? Registrieren',
    auth_social_or: 'Oder mit einem sozialen Konto fortfahren',
    auth_social_sign_in_with_google: 'Mit Google anmelden',
    common_mode_light: 'Hell',
    common_mode_dark: 'Dunkel',
    common_mode_system: 'System',
    home_hero_primary: 'Bild erstellen',
    home_hero_secondary: 'Vorlagen entdecken',
  },
  ja: {
    auth_common_login: 'ログイン',
    auth_common_signup: '新規登録',
    auth_login_welcome_back: 'おかえりなさい',
    auth_register_sign_up: '登録',
    auth_register_sign_in_hint: 'すでにアカウントをお持ちですか？ログイン',
    auth_login_sign_up_hint: 'アカウントをお持ちでないですか？新規登録',
    auth_social_or: 'またはソーシャルアカウントで続行',
    auth_social_sign_in_with_google: 'Google でログイン',
    common_mode_light: 'ライト',
    common_mode_dark: 'ダーク',
    common_mode_system: 'システム',
    home_hero_title: 'テンプレートと言葉から AI 画像を作成',
    home_hero_primary: '画像を作成',
    home_hero_secondary: 'テンプレートを見る',
    site_name: 'jevailab',
    site_title: 'jevailab | AI 画像を作成',
  },
  ko: {
    auth_common_login: '로그인',
    auth_common_signup: '회원가입',
    auth_login_welcome_back: '다시 오신 것을 환영합니다',
    auth_register_sign_up: '회원가입',
    auth_register_sign_in_hint: '이미 계정이 있나요? 로그인',
    auth_login_sign_up_hint: '계정이 없나요? 회원가입',
    auth_social_or: '또는 소셜 계정으로 계속하기',
    auth_social_sign_in_with_google: 'Google로 로그인',
    common_mode_light: '라이트',
    common_mode_dark: '다크',
    common_mode_system: '시스템',
    home_hero_title: '템플릿과 문구로 AI 이미지 만들기',
    home_hero_primary: '이미지 만들기',
    home_hero_secondary: '템플릿 살펴보기',
    site_name: 'jevailab',
    site_title: 'jevailab | AI 이미지 만들기',
  },
};

const source = JSON.parse(
  await readFile('project.inlang/messages/en.json', 'utf8')
);

for (const locale of LOCALES) {
  const path = `project.inlang/messages/${locale}.json`;
  const messages = JSON.parse(await readFile(path, 'utf8'));

  for (const key of JSON_MESSAGE_KEYS) {
    if (locale === 'ja') {
      messages[key] = source[key];
      continue;
    }
    const sourceValue = JSON.parse(source[key]);
    const translatedValue = JSON.parse(messages[key]);
    if (Array.isArray(sourceValue[0])) {
      messages[key] = JSON.stringify(
        sourceValue.map(([code], index) => [code, translatedValue[index]?.[1]])
      );
    }
  }

  Object.assign(messages, BRAND_VALUES, NATURAL_COPY[locale]);

  for (const [key, value] of Object.entries(messages)) {
    messages[key] = value.replaceAll('jevalab', 'jevailab');
  }

  const sorted = Object.fromEntries(
    Object.entries(messages).sort(([a], [b]) => a.localeCompare(b, 'en'))
  );
  await writeFile(path, `${JSON.stringify(sorted, null, 2)}\n`);
}
