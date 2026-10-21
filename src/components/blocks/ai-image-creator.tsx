import { getKieImageGenerationStatus } from '@/api/ai';
import {
  getImageCreatorPolicy,
  getImageCreatorTemplates,
  quoteImageCreatorDraft,
  startImageCreatorGeneration,
} from '@/api/image-creator';
import { authClient } from '@/auth/client';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  buildImageCreatorAuthHref,
  buildImageCreatorCallbackUrl,
  canSubmitImageCreatorDraft,
  getLocalizedImageTemplate,
  JEVAILAB_TEMPLATE_SELECTION_EVENT,
  resolveExternalTemplateSelection,
} from '@/lib/image-creator/ui-state';
import {
  loadImageCreatorDraft,
  saveImageCreatorDraft,
} from '@/lib/image-creator/draft-storage';
import { getLocale, type Locale } from '@/lib/locale';
import type {
  ImageCreatorMode,
  ImageCreatorRatio,
  PublicImageTemplate,
} from '@/lib/image-creator/types';
import { getPathWithLocale } from '@/lib/urls';
import { cn } from '@/lib/utils';
import {
  IconArrowRight,
  IconCheck,
  IconDownload,
  IconLoader2,
  IconPlus,
  IconSearch,
  IconSparkles,
  IconWand,
} from '@tabler/icons-react';
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';

type GenerationTask = {
  taskId: string;
  state: 'waiting' | 'queuing' | 'generating' | 'success' | 'fail';
  progress?: number;
  resultUrls: string[];
  error?: string;
};

type Quote = { unitCredits: number; totalCredits: number };
type CreatorLocale = Locale;

const creatorCopy = {
  en: {
    workspaceTitle: 'AI image workspace',
    workspaceDescription:
      'Choose a template, add a description, and create an image.',
    chooseTemplate: 'Choose an image template',
    chooseTemplateDescription:
      'Template covers are 3:4; choose the output ratio separately.',
    searchPlaceholder: 'Search styles or themes',
    searchLabel: 'Search image templates',
    all: 'All',
    freeCreation: 'Free creation',
    createTitle: 'Create your image',
    freeCreationDescription:
      'Start with an idea and describe the image you want to create.',
    selectedTemplate: 'Selected template: ',
    selectedTemplateDescription:
      'Use this visual style with your text description.',
    promptLabel: 'Additional creative direction',
    promptTemplatePlaceholder:
      'For example: warm light, film texture, preserve the expression…',
    promptFreePlaceholder:
      'Describe the subject, style, and mood you want to create…',
    basicSettings: 'Basic settings',
    quotedAgain: 'Changes are quoted again by the server.',
    imageRatio: 'Image ratio',
    imageCreditCost: 'Image credit cost',
    credits: (count: number) => `${count} credits`,
    perImage: 'Per image',
    imageCount: (count: number) => `× ${count} image${count === 1 ? '' : 's'}`,
    consent:
      'I confirm I have the right to use the content I submit and agree to submit my text description and generated results to the content-safety review interface.',
    generating: 'Generating',
    generateImage: (credits?: number) =>
      `Generate image${credits ? ` (${credits} credits)` : ''}`,
    generationPreview: 'Generation preview',
    reviewNote: 'Only private results that pass review are shown here.',
    generatedImage: 'Generated image',
    download: 'Download',
    waitingForResult: 'Waiting for the image service to return your result…',
    emptyPreview:
      'Choose a template and submit your idea to see your work here.',
    currentTask: 'Current task',
    activeTask:
      'This generation is being tracked here. Results appear in the preview above.',
    idleTask: 'After you submit a generation, its progress will appear here.',
    categories: {
      Photography: 'Photography',
      Illustration: 'Illustration',
      Poster: 'Poster',
      Art: 'Art',
      'Image creation': 'Image creation',
      Editorial: 'Editorial',
    },
    errors: {
      progress: 'Unable to check generation progress.',
      start: 'Unable to start your creation.',
    },
  },
  zh: {
    workspaceTitle: 'AI 图片工作台',
    workspaceDescription: '选择模板、补充描述，生成属于你的图片。',
    chooseTemplate: '选择图片模板',
    chooseTemplateDescription: '封面固定 3:4，生成比例可单独设置',
    searchPlaceholder: '搜索风格或主题',
    searchLabel: '搜索图片模板',
    all: '全部',
    freeCreation: '自由创作',
    createTitle: '创作你的图片',
    freeCreationDescription: '从一个想法开始，自由描述你想生成的画面。',
    selectedTemplate: '已选模板：',
    selectedTemplateDescription: '使用模板风格，并结合你的文字描述生成图片。',
    promptLabel: '补充创意要求',
    promptTemplatePlaceholder: '例如：暖黄灯光、胶片质感、保留人物表情…',
    promptFreePlaceholder: '描述你希望生成的画面、主体、风格和氛围…',
    basicSettings: '基础配置',
    quotedAgain: '改动后由服务端重新报价。',
    imageRatio: '图片比例',
    imageCreditCost: '图片积分消耗',
    credits: (count: number) => `${count} 积分`,
    perImage: '每张',
    imageCount: (count: number) => `× ${count} 张`,
    consent:
      '我确认拥有所提交内容的使用权，并同意将文字描述与生成结果交由内容安全审核接口处理。',
    generating: '正在生成',
    generateImage: (credits?: number) =>
      `生成图片${credits ? `（${credits} 积分）` : ''}`,
    generationPreview: '生成预览',
    reviewNote: '审核接入后，仅展示审核通过的私有结果',
    generatedImage: '已生成的图片',
    download: '下载',
    waitingForResult: '正在等待图像服务返回结果…',
    emptyPreview: '选择模板并提交创意后，你的作品会显示在这里。',
    currentTask: '当前任务',
    activeTask: '本次生成任务正在此处跟踪。结果会显示在上方预览区。',
    idleTask: '提交生成后，可在此查看当前任务的进度。',
    categories: {
      Photography: '摄影',
      Illustration: '插画',
      Poster: '海报',
      Art: '艺术',
      'Image creation': '图片创作',
      Editorial: '编辑海报',
    },
    errors: {
      progress: '无法查询生成进度，请稍后重试。',
      start: '无法开始创作，请稍后重试。',
    },
  },
  hi: {
    workspaceTitle: 'AI छवि कार्यक्षेत्र',
    workspaceDescription: 'टेम्पलेट चुनें, विवरण जोड़ें और अपनी छवि बनाएं।',
    chooseTemplate: 'छवि टेम्पलेट चुनें',
    chooseTemplateDescription: 'टेम्पलेट कवर 3:4 हैं; आउटपुट अनुपात अलग से चुनें।',
    searchPlaceholder: 'शैली या विषय खोजें',
    searchLabel: 'छवि टेम्पलेट खोजें',
    all: 'सभी',
    freeCreation: 'मुक्त रचना',
    createTitle: 'अपनी छवि बनाएं',
    freeCreationDescription: 'एक विचार से शुरू करें और अपनी इच्छित छवि का वर्णन करें।',
    selectedTemplate: 'चुना गया टेम्पलेट: ',
    selectedTemplateDescription: 'इस दृश्य शैली और अपने टेक्स्ट विवरण का उपयोग करें।',
    promptLabel: 'अतिरिक्त रचनात्मक दिशा',
    promptTemplatePlaceholder: 'उदाहरण: गर्म रोशनी, फिल्म बनावट, भाव बनाए रखें…',
    promptFreePlaceholder: 'विषय, शैली, रोशनी और मनोदशा का वर्णन करें…',
    basicSettings: 'बुनियादी सेटिंग्स',
    quotedAgain: 'बदलावों के बाद सर्वर फिर से कीमत की गणना करता है।',
    imageRatio: 'छवि अनुपात',
    imageCreditCost: 'छवि क्रेडिट लागत',
    credits: (count: number) => `${count} क्रेडिट`,
    perImage: 'प्रति छवि',
    imageCount: (count: number) => `× ${count} छवियां`,
    consent:
      'मैं पुष्टि करता हूं कि मुझे सबमिट की गई सामग्री का उपयोग करने का अधिकार है और मैं अपने टेक्स्ट विवरण और परिणामों को सामग्री सुरक्षा समीक्षा के लिए भेजने पर सहमत हूं।',
    generating: 'बनाया जा रहा है',
    generateImage: (credits?: number) =>
      `छवि बनाएं${credits ? ` (${credits} क्रेडिट)` : ''}`,
    generationPreview: 'जनरेशन पूर्वावलोकन',
    reviewNote: 'यहां केवल समीक्षा पास करने वाले निजी परिणाम दिखाए जाते हैं।',
    generatedImage: 'बनाई गई छवि',
    download: 'डाउनलोड करें',
    waitingForResult: 'छवि सेवा के परिणाम की प्रतीक्षा की जा रही है…',
    emptyPreview: 'टेम्पलेट चुनें और अपना विचार सबमिट करें; आपका काम यहां दिखाई देगा।',
    currentTask: 'वर्तमान कार्य',
    activeTask:
      'यह जनरेशन यहां ट्रैक की जा रही है। परिणाम ऊपर पूर्वावलोकन में दिखाई देते हैं।',
    idleTask: 'जनरेशन सबमिट करने के बाद उसकी प्रगति यहां दिखाई देगी।',
    categories: {
      Photography: 'फ़ोटोग्राफ़ी',
      Illustration: 'चित्रण',
      Poster: 'पोस्टर',
      Art: 'कला',
      'Image creation': 'छवि रचना',
      Editorial: 'संपादकीय',
    },
    errors: {
      progress: 'जनरेशन प्रगति की जांच नहीं हो सकी।',
      start: 'आपकी रचना शुरू नहीं हो सकी।',
    },
  },
  es: {
    workspaceTitle: 'Espacio de imágenes con IA',
    workspaceDescription:
      'Elige una plantilla, añade una descripción y crea una imagen.',
    chooseTemplate: 'Elige una plantilla de imagen',
    chooseTemplateDescription:
      'Las portadas son 3:4; elige la proporción de salida por separado.',
    searchPlaceholder: 'Buscar estilos o temas',
    searchLabel: 'Buscar plantillas de imagen',
    all: 'Todo',
    freeCreation: 'Creación libre',
    createTitle: 'Crea tu imagen',
    freeCreationDescription:
      'Empieza con una idea y describe la imagen que quieres crear.',
    selectedTemplate: 'Plantilla seleccionada: ',
    selectedTemplateDescription:
      'Usa este estilo visual con tu descripción de texto.',
    promptLabel: 'Indicación creativa adicional',
    promptTemplatePlaceholder:
      'Por ejemplo: luz cálida, textura de película, conserva la expresión…',
    promptFreePlaceholder:
      'Describe el sujeto, el estilo y el ambiente que quieres crear…',
    basicSettings: 'Ajustes básicos',
    quotedAgain: 'El servidor vuelve a calcular el precio tras los cambios.',
    imageRatio: 'Proporción de imagen',
    imageCreditCost: 'Coste en créditos de imagen',
    credits: (count: number) => `${count} créditos`,
    perImage: 'Por imagen',
    imageCount: (count: number) => `× ${count} imágenes`,
    consent:
      'Confirmo que tengo derecho a usar el contenido que envío y acepto enviar mi descripción y los resultados generados a la revisión de seguridad de contenido.',
    generating: 'Generando',
    generateImage: (credits?: number) =>
      `Generar imagen${credits ? ` (${credits} créditos)` : ''}`,
    generationPreview: 'Vista previa de la generación',
    reviewNote:
      'Aquí solo se muestran resultados privados que superan la revisión.',
    generatedImage: 'Imagen generada',
    download: 'Descargar',
    waitingForResult: 'Esperando el resultado del servicio de imágenes…',
    emptyPreview:
      'Elige una plantilla y envía tu idea para ver tu trabajo aquí.',
    currentTask: 'Tarea actual',
    activeTask:
      'Esta generación se sigue aquí. Los resultados aparecen en la vista previa.',
    idleTask: 'Cuando envíes una generación, su progreso aparecerá aquí.',
    categories: {
      Photography: 'Fotografía',
      Illustration: 'Ilustración',
      Poster: 'Póster',
      Art: 'Arte',
      'Image creation': 'Creación de imágenes',
      Editorial: 'Editorial',
    },
    errors: {
      progress: 'No se pudo consultar el progreso de la generación.',
      start: 'No se pudo iniciar tu creación.',
    },
  },
  ar: {
    workspaceTitle: 'مساحة صور بالذكاء الاصطناعي',
    workspaceDescription: 'اختر قالبًا وأضف وصفًا وأنشئ صورة خاصة بك.',
    chooseTemplate: 'اختر قالب صورة',
    chooseTemplateDescription:
      'أغلفة القوالب بنسبة 3:4؛ اختر نسبة الإخراج بشكل منفصل.',
    searchPlaceholder: 'ابحث عن الأنماط أو الموضوعات',
    searchLabel: 'ابحث في قوالب الصور',
    all: 'الكل',
    freeCreation: 'إنشاء حر',
    createTitle: 'أنشئ صورتك',
    freeCreationDescription: 'ابدأ بفكرة وصف الصورة التي تريد إنشاءها.',
    selectedTemplate: 'القالب المحدد: ',
    selectedTemplateDescription: 'استخدم هذا النمط البصري مع وصفك النصي.',
    promptLabel: 'توجيه إبداعي إضافي',
    promptTemplatePlaceholder:
      'مثال: إضاءة دافئة، ملمس فيلم، مع الحفاظ على التعبير…',
    promptFreePlaceholder: 'صف الموضوع والنمط والإضاءة والمزاج الذي تريده…',
    basicSettings: 'الإعدادات الأساسية',
    quotedAgain: 'يعيد الخادم احتساب السعر بعد التغييرات.',
    imageRatio: 'نسبة الصورة',
    imageCreditCost: 'تكلفة أرصدة الصورة',
    credits: (count: number) => `${count} رصيد`,
    perImage: 'لكل صورة',
    imageCount: (count: number) => `× ${count} صور`,
    consent:
      'أؤكد أن لدي الحق في استخدام المحتوى الذي أرسله، وأوافق على إرسال وصف النص والنتائج المنشأة إلى مراجعة سلامة المحتوى.',
    generating: 'جارٍ الإنشاء',
    generateImage: (credits?: number) =>
      `إنشاء صورة${credits ? ` (${credits} رصيد)` : ''}`,
    generationPreview: 'معاينة الإنشاء',
    reviewNote: 'تُعرض هنا فقط النتائج الخاصة التي تجتاز المراجعة.',
    generatedImage: 'الصورة المنشأة',
    download: 'تنزيل',
    waitingForResult: 'في انتظار نتيجة خدمة الصور…',
    emptyPreview: 'اختر قالبًا وأرسل فكرتك لعرض عملك هنا.',
    currentTask: 'المهمة الحالية',
    activeTask: 'تتم متابعة هذا الإنشاء هنا. تظهر النتائج في المعاينة أعلاه.',
    idleTask: 'بعد إرسال الإنشاء، ستظهر تقدمه هنا.',
    categories: {
      Photography: 'التصوير',
      Illustration: 'الرسم التوضيحي',
      Poster: 'ملصق',
      Art: 'فن',
      'Image creation': 'إنشاء الصور',
      Editorial: 'تحريري',
    },
    errors: {
      progress: 'تعذر التحقق من تقدم الإنشاء.',
      start: 'تعذر بدء إنشاء صورتك.',
    },
  },
  fr: {
    workspaceTitle: 'Atelier d’images IA',
    workspaceDescription:
      'Choisissez un modèle, ajoutez une description et créez une image.',
    chooseTemplate: 'Choisir un modèle d’image',
    chooseTemplateDescription:
      'Les couvertures sont en 3:4 ; choisissez le ratio de sortie séparément.',
    searchPlaceholder: 'Rechercher des styles ou des thèmes',
    searchLabel: 'Rechercher des modèles d’image',
    all: 'Tout',
    freeCreation: 'Création libre',
    createTitle: 'Créez votre image',
    freeCreationDescription:
      'Partez d’une idée et décrivez l’image que vous souhaitez créer.',
    selectedTemplate: 'Modèle sélectionné : ',
    selectedTemplateDescription:
      'Utilisez ce style visuel avec votre description textuelle.',
    promptLabel: 'Direction créative complémentaire',
    promptTemplatePlaceholder:
      'Par exemple : lumière chaude, texture argentique, préservez l’expression…',
    promptFreePlaceholder:
      'Décrivez le sujet, le style et l’ambiance souhaités…',
    basicSettings: 'Réglages de base',
    quotedAgain: 'Le serveur recalcule le prix après chaque modification.',
    imageRatio: 'Ratio de l’image',
    imageCreditCost: 'Coût en crédits d’image',
    credits: (count: number) => `${count} crédits`,
    perImage: 'Par image',
    imageCount: (count: number) => `× ${count} images`,
    consent:
      'Je confirme avoir le droit d’utiliser le contenu soumis et j’accepte de transmettre ma description et les résultats générés à la vérification de sécurité du contenu.',
    generating: 'Génération en cours',
    generateImage: (credits?: number) =>
      `Générer l’image${credits ? ` (${credits} crédits)` : ''}`,
    generationPreview: 'Aperçu de la génération',
    reviewNote:
      'Seuls les résultats privés validés par la vérification sont affichés ici.',
    generatedImage: 'Image générée',
    download: 'Télécharger',
    waitingForResult: 'En attente du résultat du service d’images…',
    emptyPreview:
      'Choisissez un modèle et soumettez votre idée pour voir votre travail ici.',
    currentTask: 'Tâche en cours',
    activeTask:
      'Cette génération est suivie ici. Les résultats apparaissent dans l’aperçu ci-dessus.',
    idleTask:
      'Après avoir soumis une génération, sa progression apparaîtra ici.',
    categories: {
      Photography: 'Photographie',
      Illustration: 'Illustration',
      Poster: 'Affiche',
      Art: 'Art',
      'Image creation': 'Création d’images',
      Editorial: 'Éditorial',
    },
    errors: {
      progress: 'Impossible de vérifier la progression de la génération.',
      start: 'Impossible de démarrer votre création.',
    },
  },
  de: {
    workspaceTitle: 'KI-Bildwerkstatt',
    workspaceDescription:
      'Vorlage wählen, Beschreibung ergänzen und ein Bild erstellen.',
    chooseTemplate: 'Bildvorlage wählen',
    chooseTemplateDescription:
      'Vorlagencover sind 3:4; das Ausgabeformat wählen Sie separat.',
    searchPlaceholder: 'Stile oder Themen suchen',
    searchLabel: 'Bildvorlagen suchen',
    all: 'Alle',
    freeCreation: 'Freie Gestaltung',
    createTitle: 'Erstellen Sie Ihr Bild',
    freeCreationDescription:
      'Beginnen Sie mit einer Idee und beschreiben Sie Ihr Wunschbild.',
    selectedTemplate: 'Ausgewählte Vorlage: ',
    selectedTemplateDescription:
      'Verwenden Sie diesen visuellen Stil mit Ihrer Textbeschreibung.',
    promptLabel: 'Zusätzliche kreative Anweisung',
    promptTemplatePlaceholder:
      'Zum Beispiel: warmes Licht, Filmtextur, Ausdruck beibehalten…',
    promptFreePlaceholder: 'Beschreiben Sie Motiv, Stil, Licht und Stimmung…',
    basicSettings: 'Grundeinstellungen',
    quotedAgain: 'Nach Änderungen berechnet der Server den Preis neu.',
    imageRatio: 'Bildformat',
    imageCreditCost: 'Bild-Credit-Kosten',
    credits: (count: number) => `${count} Credits`,
    perImage: 'Pro Bild',
    imageCount: (count: number) => `× ${count} Bilder`,
    consent:
      'Ich bestätige, dass ich die Rechte am eingereichten Inhalt habe, und stimme der Prüfung meiner Textbeschreibung und der erzeugten Ergebnisse durch die Inhaltsprüfung zu.',
    generating: 'Wird erstellt',
    generateImage: (credits?: number) =>
      `Bild erstellen${credits ? ` (${credits} Credits)` : ''}`,
    generationPreview: 'Vorschau der Erstellung',
    reviewNote:
      'Hier werden nur private Ergebnisse angezeigt, die die Prüfung bestanden haben.',
    generatedImage: 'Erstelltes Bild',
    download: 'Herunterladen',
    waitingForResult: 'Warten auf das Ergebnis des Bilddienstes…',
    emptyPreview:
      'Wählen Sie eine Vorlage und senden Sie Ihre Idee, um Ihr Werk hier zu sehen.',
    currentTask: 'Aktuelle Aufgabe',
    activeTask:
      'Diese Erstellung wird hier verfolgt. Ergebnisse erscheinen in der Vorschau oben.',
    idleTask:
      'Nach dem Absenden einer Erstellung wird ihr Fortschritt hier angezeigt.',
    categories: {
      Photography: 'Fotografie',
      Illustration: 'Illustration',
      Poster: 'Poster',
      Art: 'Kunst',
      'Image creation': 'Bilderstellung',
      Editorial: 'Redaktionell',
    },
    errors: {
      progress: 'Der Fortschritt der Erstellung konnte nicht abgerufen werden.',
      start: 'Ihre Erstellung konnte nicht gestartet werden.',
    },
  },
  ja: {
    workspaceTitle: 'AI画像ワークスペース',
    workspaceDescription: 'テンプレートを選び、説明を加えて画像を作成します。',
    chooseTemplate: '画像テンプレートを選択',
    chooseTemplateDescription:
      'テンプレートの表紙は3:4です。出力比率は別に選択できます。',
    searchPlaceholder: 'スタイルやテーマを検索',
    searchLabel: '画像テンプレートを検索',
    all: 'すべて',
    freeCreation: '自由制作',
    createTitle: '画像を作成',
    freeCreationDescription:
      'アイデアから始め、作成したい画像を説明してください。',
    selectedTemplate: '選択中のテンプレート：',
    selectedTemplateDescription:
      'このビジュアルスタイルとテキスト説明を組み合わせます。',
    promptLabel: '追加のクリエイティブ指示',
    promptTemplatePlaceholder: '例：暖かな光、フィルムの質感、表情を保つ…',
    promptFreePlaceholder: '被写体、スタイル、光、雰囲気を説明してください…',
    basicSettings: '基本設定',
    quotedAgain: '変更後はサーバーが価格を再計算します。',
    imageRatio: '画像比率',
    imageCreditCost: '画像クレジット消費',
    credits: (count: number) => `${count}クレジット`,
    perImage: '1枚あたり',
    imageCount: (count: number) => `× ${count}枚`,
    consent:
      '提出内容を使用する権利があることを確認し、テキスト説明と生成結果をコンテンツ安全性レビューに送信することに同意します。',
    generating: '生成中',
    generateImage: (credits?: number) =>
      `画像を生成${credits ? `（${credits}クレジット）` : ''}`,
    generationPreview: '生成プレビュー',
    reviewNote: 'レビューを通過した非公開の結果のみここに表示されます。',
    generatedImage: '生成された画像',
    download: 'ダウンロード',
    waitingForResult: '画像サービスの結果を待っています…',
    emptyPreview:
      'テンプレートを選び、アイデアを送信すると作品がここに表示されます。',
    currentTask: '現在のタスク',
    activeTask:
      'この生成はここで追跡されます。結果は上のプレビューに表示されます。',
    idleTask: '生成を送信すると、ここに進捗が表示されます。',
    categories: {
      Photography: '写真',
      Illustration: 'イラスト',
      Poster: 'ポスター',
      Art: 'アート',
      'Image creation': '画像制作',
      Editorial: 'エディトリアル',
    },
    errors: {
      progress: '生成の進捗を確認できませんでした。',
      start: '制作を開始できませんでした。',
    },
  },
  ko: {
    workspaceTitle: 'AI 이미지 작업실',
    workspaceDescription: '템플릿을 선택하고 설명을 더해 이미지를 만드세요.',
    chooseTemplate: '이미지 템플릿 선택',
    chooseTemplateDescription:
      '템플릿 표지는 3:4이며 출력 비율은 따로 선택할 수 있습니다.',
    searchPlaceholder: '스타일 또는 테마 검색',
    searchLabel: '이미지 템플릿 검색',
    all: '전체',
    freeCreation: '자유 제작',
    createTitle: '이미지 만들기',
    freeCreationDescription:
      '아이디어에서 시작해 만들고 싶은 이미지를 설명하세요.',
    selectedTemplate: '선택한 템플릿: ',
    selectedTemplateDescription:
      '이 시각 스타일과 텍스트 설명을 함께 사용합니다.',
    promptLabel: '추가 창작 지시',
    promptTemplatePlaceholder: '예: 따뜻한 조명, 필름 질감, 표정 유지…',
    promptFreePlaceholder: '주제, 스타일, 조명, 분위기를 설명하세요…',
    basicSettings: '기본 설정',
    quotedAgain: '변경 후 서버가 가격을 다시 계산합니다.',
    imageRatio: '이미지 비율',
    imageCreditCost: '이미지 크레딧 비용',
    credits: (count: number) => `${count} 크레딧`,
    perImage: '이미지당',
    imageCount: (count: number) => `× ${count}장`,
    consent:
      '제출한 콘텐츠를 사용할 권리가 있음을 확인하며, 텍스트 설명과 생성 결과를 콘텐츠 안전 검토에 제출하는 데 동의합니다.',
    generating: '생성 중',
    generateImage: (credits?: number) =>
      `이미지 생성${credits ? ` (${credits} 크레딧)` : ''}`,
    generationPreview: '생성 미리보기',
    reviewNote: '검토를 통과한 비공개 결과만 여기에 표시됩니다.',
    generatedImage: '생성된 이미지',
    download: '다운로드',
    waitingForResult: '이미지 서비스의 결과를 기다리는 중…',
    emptyPreview:
      '템플릿을 선택하고 아이디어를 제출하면 작품이 여기에 표시됩니다.',
    currentTask: '현재 작업',
    activeTask:
      '이 생성 작업은 여기에서 추적됩니다. 결과는 위 미리보기에 표시됩니다.',
    idleTask: '생성을 제출하면 진행 상황이 여기에 표시됩니다.',
    categories: {
      Photography: '사진',
      Illustration: '일러스트',
      Poster: '포스터',
      Art: '아트',
      'Image creation': '이미지 제작',
      Editorial: '에디토리얼',
    },
    errors: {
      progress: '생성 진행 상황을 확인할 수 없습니다.',
      start: '제작을 시작할 수 없습니다.',
    },
  },
} as const;

function copy(locale: CreatorLocale) {
  return creatorCopy[locale];
}

function localizeCreatorError(
  locale: CreatorLocale,
  message: string | undefined,
  fallback: 'progress' | 'start'
) {
  if (!message) return copy(locale).errors[fallback];
  if (locale !== 'zh') return message;

  const knownMessages: ReadonlyArray<readonly [RegExp, string]> = [
    [/unauthorized|email not verified/i, '登录状态已失效，请重新登录后再试。'],
    [/describe what you want to create/i, '请描述你希望生成的图片。'],
    [
      /selected template is no longer available/i,
      '所选模板已不可用，请重新选择。',
    ],
    [
      /selected aspect ratio is not available at this resolution/i,
      '当前清晰度不支持所选比例，请更换比例。',
    ],
    [
      /kie_api_key is not configured|kie did not return a task id|kie image request failed|could not start image generation/i,
      '图片生成服务暂时不可用，请稍后重试。',
    ],
    [
      /invalid generation ticket|generation ticket has expired/i,
      '生成任务已失效，请重新提交。',
    ],
    [
      /generated output is withheld pending content review/i,
      '生成结果正在接受内容审核，请稍后查看。',
    ],
    [/generation failed/i, '图片生成失败，请稍后重试。'],
    [
      /prompt.*(rejected|not approved)|content.*(rejected|not approved)|审核/i,
      '文字描述未通过内容审核，请修改后重试。',
    ],
  ];
  return (
    knownMessages.find(([pattern]) => pattern.test(message))?.[1] ??
    copy(locale).errors[fallback]
  );
}

function localizedCategory(category: string, locale: CreatorLocale) {
  return (
    copy(locale).categories[
      category as keyof (typeof creatorCopy)['en']['categories']
    ] ?? category
  );
}

const ratios: Array<
  Extract<ImageCreatorRatio, '3:4' | '9:16' | '1:1' | '4:3' | '16:9'>
> = ['3:4', '9:16', '1:1', '4:3', '16:9'];

export default function AiImageCreatorSection() {
  const locale: CreatorLocale = getLocale();
  const { data: session } = authClient.useSession();
  const signedIn = Boolean(session?.user);
  const [templates, setTemplates] = useState<PublicImageTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [policyVersion, setPolicyVersion] = useState('2026-10-16');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [templateId, setTemplateId] = useState<string | null>(
    'image-template-1015'
  );
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<ImageCreatorMode>('1K_SD');
  const [ratio, setRatio] = useState<ImageCreatorRatio>('3:4');
  const [count, setCount] = useState(1);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [quote, setQuote] = useState<Quote>();
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticket, setTicket] = useState<string>();
  const [pendingGenerate, setPendingGenerate] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const pendingGenerateRef = useRef(false);
  const resumeStartedRef = useRef(false);
  const creatorFormRef = useRef<HTMLElement>(null);
  const [creatorFormHeight, setCreatorFormHeight] = useState<number>();

  useEffect(() => {
    const element = creatorFormRef.current;
    if (!element) return;

    const syncHeight = () => {
      if (window.matchMedia('(min-width: 1024px)').matches) {
        const submitControl = element.querySelector(
          '[data-image-creator-submit]'
        );
        const formTop = element.getBoundingClientRect().top;
        const submitBottom = submitControl?.getBoundingClientRect().bottom;
        setCreatorFormHeight(
          Math.ceil(
            submitBottom
              ? submitBottom - formTop
              : element.getBoundingClientRect().height
          )
        );
      } else {
        setCreatorFormHeight(undefined);
      }
    };

    const observer = new ResizeObserver(syncHeight);
    observer.observe(element);
    window.addEventListener('resize', syncHeight);
    syncHeight();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncHeight);
    };
  }, []);
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void getImageCreatorTemplates().then((result) => {
      setTemplates(result.items);
      setCategories(result.categories);
    });
    void getImageCreatorPolicy().then((result) => {
      setPolicyVersion(result.version);
    });
  }, []);

  useEffect(() => {
    const storedDraft = loadImageCreatorDraft();
    if (storedDraft) {
      setTemplateId(storedDraft.templateId);
      setPrompt(storedDraft.prompt);
      setMode(storedDraft.mode);
      setRatio(storedDraft.ratio);
      setCount(storedDraft.count);
      setConsentAccepted(storedDraft.consentAccepted);
      setQuery(storedDraft.query);
      setCategory(storedDraft.category);
      setPendingGenerate(storedDraft.pendingGenerate);
      pendingGenerateRef.current = storedDraft.pendingGenerate;
    }
    setDraftHydrated(true);
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    saveImageCreatorDraft({
      templateId,
      prompt,
      mode,
      ratio,
      count,
      consentAccepted,
      query,
      category,
      pendingGenerate: pendingGenerateRef.current,
    });
  }, [
    category,
    consentAccepted,
    count,
    draftHydrated,
    mode,
    prompt,
    query,
    ratio,
    templateId,
  ]);

  const selectedTemplate = templates.find(
    (template) => template.id === templateId
  );
  const filteredTemplates = useMemo(
    () =>
      templates.filter(
        (template) =>
          (category === 'All' || template.category === category) &&
          `${template.name} ${template.description} ${template.tags.join(' ')}`
            .toLowerCase()
            .includes(query.trim().toLowerCase())
      ),
    [category, query, templates]
  );
  const draft = useMemo(
    () => ({
      templateId,
      referenceAssetId: null,
      mode,
      ratio,
      count,
      extraPrompt: prompt,
    }),
    [count, mode, prompt, ratio, templateId]
  );

  useEffect(() => {
    setQuote(undefined);
    if (
      !session?.user ||
      !canSubmitImageCreatorDraft({
        isSubmitting: false,
        consentAccepted: true,
        templateId,
        prompt,
      })
    )
      return;
    const timeout = setTimeout(() => {
      setIsQuoteLoading(true);
      void quoteImageCreatorDraft({ data: draft })
        .then((nextQuote) => setQuote(nextQuote))
        .catch(() => setQuote(undefined))
        .finally(() => setIsQuoteLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [draft, prompt, session?.user, templateId]);

  useEffect(() => {
    if (!ticket) return;
    let stopped = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const result = await getKieImageGenerationStatus({ data: { ticket } });
        if (stopped) return;
        setTasks(result.tasks);
        if (!result.complete) timeout = setTimeout(poll, 3_000);
      } catch (pollError) {
        if (!stopped) {
          setError(
            localizeCreatorError(
              locale,
              pollError instanceof Error ? pollError.message : undefined,
              'progress'
            )
          );
        }
      }
    };
    void poll();
    return () => {
      stopped = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [ticket]);

  const imageUrls = tasks.flatMap((task) => task.resultUrls);
  const isGenerating =
    Boolean(ticket) &&
    (tasks.length === 0 ||
      tasks.some((task) => task.state !== 'success' && task.state !== 'fail'));
  const canSubmit = canSubmitImageCreatorDraft({
    isSubmitting: isSubmitting || isGenerating,
    consentAccepted,
    templateId,
    prompt,
  });

  function chooseTemplate(template: PublicImageTemplate | null) {
    setTemplateId(template?.id ?? null);
    if (template) {
      setMode(template.defaultMode);
      setRatio(
        ratios.includes(template.defaultRatio as (typeof ratios)[number])
          ? template.defaultRatio
          : '3:4'
      );
      setCount(template.defaultCount);
    }
    setQuote(undefined);
  }

  useEffect(() => {
    function selectExternalTemplate(event: Event) {
      const requestedTemplateId =
        event instanceof CustomEvent &&
        typeof event.detail?.templateId === 'string'
          ? event.detail.templateId
          : undefined;
      if (!requestedTemplateId) return;

      const nextTemplateId = resolveExternalTemplateSelection({
        currentTemplateId: templateId,
        requestedTemplateId,
        availableTemplateIds: templates.map((template) => template.id),
      });
      if (nextTemplateId !== requestedTemplateId) return;

      const template = templates.find(
        (candidate) => candidate.id === nextTemplateId
      );
      if (template) chooseTemplate(template);
    }

    window.addEventListener(
      JEVAILAB_TEMPLATE_SELECTION_EVENT,
      selectExternalTemplate
    );
    return () =>
      window.removeEventListener(
        JEVAILAB_TEMPLATE_SELECTION_EVENT,
        selectExternalTemplate
      );
  }, [templateId, templates]);

  async function startGeneration(resume = false) {
    setError(undefined);
    setTasks([]);
    setTicket(undefined);
    setIsSubmitting(true);
    try {
      const result = await startImageCreatorGeneration({
        data: {
          ...draft,
          referenceAssetId: null,
          consentAccepted: true,
          policyVersion,
        },
      });
      pendingGenerateRef.current = false;
      setPendingGenerate(false);
      saveImageCreatorDraft({
        templateId,
        prompt,
        mode,
        ratio,
        count,
        consentAccepted,
        query,
        category,
        pendingGenerate: false,
      });
      setTicket(result.ticket);
    } catch (startError) {
      if (resume) {
        pendingGenerateRef.current = false;
        setPendingGenerate(false);
        saveImageCreatorDraft({
          templateId,
          prompt,
          mode,
          ratio,
          count,
          consentAccepted,
          query,
          category,
          pendingGenerate: false,
        });
      }
      setError(
        localizeCreatorError(
          locale,
          startError instanceof Error ? startError.message : undefined,
          'start'
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGenerate() {
    if (!canSubmit) return;
    if (!signedIn) {
      pendingGenerateRef.current = true;
      setPendingGenerate(true);
      saveImageCreatorDraft({
        templateId,
        prompt,
        mode,
        ratio,
        count,
        consentAccepted,
        query,
        category,
        pendingGenerate: true,
      });
      const callbackUrl = buildImageCreatorCallbackUrl({
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      });
      window.location.assign(
        buildImageCreatorAuthHref({
          loginPath: getPathWithLocale('/auth/login'),
          callbackUrl,
        })
      );
      return;
    }

    await startGeneration();
  }

  useEffect(() => {
    if (
      !signedIn ||
      !draftHydrated ||
      !pendingGenerate ||
      resumeStartedRef.current
    ) {
      return;
    }
    resumeStartedRef.current = true;
    void startGeneration(true);
  }, [draftHydrated, pendingGenerate, signedIn]);

  return (
    <section id="create" className="scroll-mt-16 py-10 sm:py-14">
      <Card className="mx-auto max-w-7xl overflow-hidden border-primary/20 bg-card/95 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="flex flex-col gap-4 border-b bg-muted/20 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <IconSparkles className="size-5" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">
                {copy(locale).workspaceTitle}
              </p>
              <p className="text-sm text-muted-foreground">
                {copy(locale).workspaceDescription}
              </p>
            </div>
          </div>
        </div>

        <CardContent className="grid gap-0 p-0 lg:items-stretch lg:grid-cols-[minmax(13.5rem,.72fr)_minmax(0,1.35fr)_minmax(18rem,.82fr)]">
          <TemplateBrowser
            templates={filteredTemplates}
            categories={categories}
            category={category}
            query={query}
            selectedId={templateId}
            onCategoryChange={setCategory}
            onQueryChange={setQuery}
            onChoose={chooseTemplate}
            locale={locale}
            contentHeight={creatorFormHeight}
          />
          <CreatorForm
            formRef={creatorFormRef}
            selectedTemplate={selectedTemplate}
            prompt={prompt}
            ratio={ratio}
            count={count}
            quote={quote}
            isQuoteLoading={isQuoteLoading}
            consentAccepted={consentAccepted}
            error={error}
            canSubmit={canSubmit}
            isSubmitting={isSubmitting || isGenerating}
            onPromptChange={setPrompt}
            onRatioChange={setRatio}
            onConsentChange={setConsentAccepted}
            onGenerate={handleGenerate}
            locale={locale}
          />
          <GenerationPreview
            imageUrls={imageUrls}
            isGenerating={isSubmitting || isGenerating}
            ticket={ticket}
            locale={locale}
          />
        </CardContent>
      </Card>
    </section>
  );
}

function TemplateBrowser({
  templates,
  categories,
  category,
  query,
  selectedId,
  locale,
  onCategoryChange,
  onQueryChange,
  onChoose,
  contentHeight,
}: {
  templates: PublicImageTemplate[];
  categories: string[];
  category: string;
  query: string;
  selectedId: string | null;
  onCategoryChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onChoose: (template: PublicImageTemplate | null) => void;
  locale: CreatorLocale;
  contentHeight?: number;
}) {
  return (
    <aside
      style={contentHeight ? { height: `${contentHeight}px` } : undefined}
      className="flex min-h-0 flex-col self-start border-b p-5 lg:border-e lg:border-b-0 sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">{copy(locale).chooseTemplate}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {copy(locale).chooseTemplateDescription}
          </p>
        </div>
        <Badge variant="outline">{templates.length}</Badge>
      </div>
      <div className="relative mb-3">
        <IconSearch className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="ps-9"
          placeholder={copy(locale).searchPlaceholder}
          aria-label={copy(locale).searchLabel}
        />
      </div>
      <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
        {['All', ...categories].map((item) => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={category === item ? 'default' : 'ghost'}
            className="shrink-0"
            onClick={() => onCategoryChange(item)}
          >
            {item === 'All'
              ? copy(locale).all
              : localizedCategory(item, locale)}
          </Button>
        ))}
      </div>
      <div className="grid min-h-[31rem] flex-1 grid-cols-2 content-start gap-2 overflow-y-auto pe-1 sm:grid-cols-3 lg:grid-cols-2">
        <button
          type="button"
          onClick={() => onChoose(null)}
          className={cn(
            'group rounded-xl border p-2 text-start transition-colors hover:border-primary/60',
            !selectedId && 'border-primary bg-primary/10 ring-1 ring-primary'
          )}
        >
          <div className="grid aspect-[3/4] place-items-center rounded-lg border border-dashed bg-muted/30 text-center text-muted-foreground">
            <div>
              <IconPlus className="mx-auto mb-1 size-5" />
              <span className="text-xs font-medium">
                {copy(locale).freeCreation}
              </span>
            </div>
          </div>
          <p className="mt-2 truncate text-xs font-medium">
            {copy(locale).freeCreation}
          </p>
        </button>
        {templates.map((template) => {
          const displayedTemplate = getLocalizedImageTemplate(template, locale);
          return (
            <button
              type="button"
              key={template.id}
              onClick={() => onChoose(template)}
              className={cn(
                'group relative rounded-xl border p-1.5 text-start transition-colors hover:border-primary/60',
                selectedId === template.id &&
                  'border-primary bg-primary/10 ring-1 ring-primary'
              )}
            >
              <img
                src={template.coverUrl}
                alt=""
                className="aspect-[3/4] w-full rounded-lg object-cover"
              />
              <span
                className={cn(
                  'absolute top-3 end-3 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity',
                  selectedId === template.id ? 'opacity-100' : 'opacity-0'
                )}
              >
                <IconCheck className="size-3.5" />
              </span>
              <p className="mt-2 truncate px-1 text-xs font-medium">
                {displayedTemplate.name}
              </p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function CreatorForm({
  formRef,
  selectedTemplate,
  prompt,
  ratio,
  count,
  quote,
  isQuoteLoading,
  consentAccepted,
  error,
  canSubmit,
  isSubmitting,
  onPromptChange,
  onRatioChange,
  onConsentChange,
  onGenerate,
  locale,
}: {
  formRef: RefObject<HTMLElement | null>;
  selectedTemplate?: PublicImageTemplate;
  prompt: string;
  ratio: ImageCreatorRatio;
  count: number;
  quote?: Quote;
  isQuoteLoading: boolean;
  consentAccepted: boolean;
  error?: string;
  canSubmit: boolean;
  isSubmitting: boolean;
  onPromptChange: (value: string) => void;
  onRatioChange: (value: ImageCreatorRatio) => void;
  onConsentChange: (value: boolean) => void;
  onGenerate: () => void;
  locale: CreatorLocale;
}) {
  const displayTemplate = selectedTemplate
    ? getLocalizedImageTemplate(selectedTemplate, locale)
    : undefined;
  return (
    <main
      ref={formRef}
      data-testid="image-creator-form"
      className="border-b p-5 lg:border-e lg:border-b-0 sm:p-7"
    >
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{copy(locale).createTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {displayTemplate
              ? displayTemplate.description
              : copy(locale).freeCreationDescription}
          </p>
        </div>
        {selectedTemplate && (
          <Badge variant="outline">
            {localizedCategory(selectedTemplate.category, locale)}
          </Badge>
        )}
      </div>
      {selectedTemplate && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border bg-muted/20 p-3">
          <img
            src={selectedTemplate.coverUrl}
            alt=""
            className="size-12 rounded-lg object-cover"
          />
          <div className="min-w-0">
            <p className="font-medium">
              {copy(locale).selectedTemplate}
              {displayTemplate?.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {copy(locale).selectedTemplateDescription}
            </p>
          </div>
        </div>
      )}
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="creator-prompt">{copy(locale).promptLabel}</Label>
          <Textarea
            id="creator-prompt"
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            className="min-h-24"
            maxLength={1000}
            placeholder={
              selectedTemplate
                ? copy(locale).promptTemplatePlaceholder
                : copy(locale).promptFreePlaceholder
            }
          />
          <p className="text-end text-xs text-muted-foreground">
            {prompt.length} / 1000
          </p>
        </div>
        <div className="rounded-xl border">
          <div className="border-b px-4 py-3">
            <p className="font-semibold">{copy(locale).basicSettings}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {copy(locale).quotedAgain}
            </p>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              <Label>{copy(locale).imageRatio}</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {ratios.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={ratio === value}
                    onClick={() => onRatioChange(value)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                      ratio === value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background hover:border-primary/60 hover:bg-muted/50'
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{copy(locale).imageCreditCost}</p>
            </div>
            {isQuoteLoading ? (
              <IconLoader2 className="size-4 animate-spin text-primary" />
            ) : quote ? (
              <Badge variant="secondary">
                {copy(locale).credits(quote.totalCredits)}
              </Badge>
            ) : null}
          </div>
          <div className="mt-4 flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {copy(locale).perImage}
            </span>
            <strong>{quote?.unitCredits ?? '—'}</strong>
            <span className="text-muted-foreground">
              {copy(locale).imageCount(count)}
            </span>
            <IconArrowRight className="size-4 text-muted-foreground rtl:rotate-180" />
            <strong className="text-primary">
              {quote ? copy(locale).credits(quote.totalCredits) : '—'}
            </strong>
          </div>
        </div>
        <label
          htmlFor="creator-safety-consent"
          className="flex cursor-pointer items-start gap-3 rounded-lg p-1 text-sm"
        >
          <Checkbox
            id="creator-safety-consent"
            checked={consentAccepted}
            onCheckedChange={(checked) => onConsentChange(checked === true)}
          />
          <span className="leading-5 text-muted-foreground">
            {copy(locale).consent}
          </span>
        </label>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <Button
          type="button"
          size="lg"
          data-image-creator-submit
          data-testid="image-creator-submit"
          className="w-full"
          onClick={onGenerate}
          disabled={!canSubmit}
        >
          {isSubmitting ? (
            <>
              <IconLoader2 className="size-4 animate-spin" />
              {copy(locale).generating}
            </>
          ) : (
            <>
              <IconWand className="size-4" />
              {copy(locale).generateImage(quote?.totalCredits)}
            </>
          )}
        </Button>
      </div>
    </main>
  );
}

function GenerationPreview({
  imageUrls,
  isGenerating,
  ticket,
  locale,
}: {
  imageUrls: string[];
  isGenerating: boolean;
  ticket?: string;
  locale: CreatorLocale;
}) {
  return (
    <aside className="p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">{copy(locale).generationPreview}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {copy(locale).reviewNote}
          </p>
        </div>
        {isGenerating && (
          <Badge className="gap-1.5">
            <IconLoader2 className="size-3 animate-spin" />
            {copy(locale).generating}
          </Badge>
        )}
      </div>
      <div className="grid min-h-72 place-items-center overflow-hidden rounded-xl border bg-muted/20 p-3">
        {imageUrls.length > 0 ? (
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {imageUrls.map((url) => (
              <div
                key={url}
                className="group relative overflow-hidden rounded-lg border"
              >
                <img
                  src={url}
                  alt={copy(locale).generatedImage}
                  className="aspect-[3/4] w-full object-cover"
                />
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    buttonVariants({ size: 'sm', variant: 'secondary' }),
                    'absolute end-2 bottom-2'
                  )}
                >
                  <IconDownload className="size-4" />
                  {copy(locale).download}
                </a>
              </div>
            ))}
          </div>
        ) : isGenerating ? (
          <div className="text-center text-sm text-muted-foreground">
            <IconLoader2 className="mx-auto mb-3 size-8 animate-spin text-primary" />
            {copy(locale).waitingForResult}
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground">
            <IconSparkles className="mx-auto mb-3 size-7 text-primary" />
            {copy(locale).emptyPreview}
          </div>
        )}
      </div>
      <div className="mt-4 rounded-xl border p-4">
        <p className="font-semibold">{copy(locale).currentTask}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          {ticket ? copy(locale).activeTask : copy(locale).idleTask}
        </p>
      </div>
    </aside>
  );
}
