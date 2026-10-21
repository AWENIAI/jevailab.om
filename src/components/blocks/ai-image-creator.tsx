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
import { getLocale } from '@/lib/locale';
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
type CreatorLocale = 'zh' | 'en';

function copy(locale: CreatorLocale, zh: string, en: string) {
  return locale === 'zh' ? zh : en;
}

function localizeCreatorError(
  locale: CreatorLocale,
  message: string | undefined,
  fallback: { zh: string; en: string }
) {
  if (locale !== 'zh') return message || fallback.en;
  if (!message) return fallback.zh;

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
    knownMessages.find(([pattern]) => pattern.test(message))?.[1] ?? fallback.zh
  );
}

function localizedCategory(category: string, locale: CreatorLocale) {
  if (locale !== 'zh') return category;
  return (
    {
      Photography: '摄影',
      Illustration: '插画',
      Poster: '海报',
      Art: '艺术',
      'Image creation': '图片创作',
      Editorial: '编辑海报',
    }[category] ?? category
  );
}

const ratios: Array<
  Extract<ImageCreatorRatio, '3:4' | '9:16' | '1:1' | '4:3' | '16:9'>
> = ['3:4', '9:16', '1:1', '4:3', '16:9'];

export default function AiImageCreatorSection() {
  const locale: CreatorLocale = getLocale() === 'zh' ? 'zh' : 'en';
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
              {
                zh: '无法查询生成进度，请稍后重试。',
                en: 'Unable to check generation progress.',
              }
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
          {
            zh: '无法开始创作，请稍后重试。',
            en: 'Unable to start your creation.',
          }
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
                {copy(locale, 'AI 图片工作台', 'AI image workspace')}
              </p>
              <p className="text-sm text-muted-foreground">
                {copy(
                  locale,
                  '选择模板、补充描述，生成属于你的图片。',
                  'Choose a template, add a description, and create an image.'
                )}
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
      className="flex min-h-0 flex-col self-start border-b p-5 lg:border-r lg:border-b-0 sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">
            {copy(locale, '选择图片模板', 'Choose an image template')}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {copy(
              locale,
              '封面固定 3:4，生成比例可单独设置',
              'Template covers are 3:4; choose the output ratio separately.'
            )}
          </p>
        </div>
        <Badge variant="outline">{templates.length}</Badge>
      </div>
      <div className="relative mb-3">
        <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="pl-9"
          placeholder={copy(
            locale,
            '搜索风格或主题',
            'Search styles or themes'
          )}
          aria-label={copy(locale, '搜索图片模板', 'Search image templates')}
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
              ? copy(locale, '全部', 'All')
              : localizedCategory(item, locale)}
          </Button>
        ))}
      </div>
      <div className="grid min-h-[31rem] flex-1 grid-cols-2 content-start gap-2 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-2">
        <button
          type="button"
          onClick={() => onChoose(null)}
          className={cn(
            'group rounded-xl border p-2 text-left transition-colors hover:border-primary/60',
            !selectedId && 'border-primary bg-primary/10 ring-1 ring-primary'
          )}
        >
          <div className="grid aspect-[3/4] place-items-center rounded-lg border border-dashed bg-muted/30 text-center text-muted-foreground">
            <div>
              <IconPlus className="mx-auto mb-1 size-5" />
              <span className="text-xs font-medium">
                {copy(locale, '自由创作', 'Free creation')}
              </span>
            </div>
          </div>
          <p className="mt-2 truncate text-xs font-medium">
            {copy(locale, '自由创作', 'Free creation')}
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
                'group relative rounded-xl border p-1.5 text-left transition-colors hover:border-primary/60',
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
                  'absolute top-3 right-3 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity',
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
      className="border-b p-5 lg:border-r lg:border-b-0 sm:p-7"
    >
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">
            {copy(locale, '创作你的图片', 'Create your image')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {displayTemplate
              ? displayTemplate.description
              : copy(
                  locale,
                  '从一个想法开始，自由描述你想生成的画面。',
                  'Start with an idea and describe the image you want to create.'
                )}
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
              {copy(locale, '已选模板：', 'Selected template: ')}
              {displayTemplate?.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {copy(
                locale,
                '使用模板风格，并结合你的文字描述生成图片。',
                'Use this visual style with your text description.'
              )}
            </p>
          </div>
        </div>
      )}
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="creator-prompt">
            {copy(locale, '补充创意要求', 'Additional creative direction')}
          </Label>
          <Textarea
            id="creator-prompt"
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            className="min-h-24"
            maxLength={1000}
            placeholder={
              selectedTemplate
                ? copy(
                    locale,
                    '例如：暖黄灯光、胶片质感、保留人物表情…',
                    'For example: warm light, film texture, preserve the expression…'
                  )
                : copy(
                    locale,
                    '描述你希望生成的画面、主体、风格和氛围…',
                    'Describe the subject, style, and mood you want to create…'
                  )
            }
          />
          <p className="text-right text-xs text-muted-foreground">
            {prompt.length} / 1000
          </p>
        </div>
        <div className="rounded-xl border">
          <div className="border-b px-4 py-3">
            <p className="font-semibold">
              {copy(locale, '基础配置', 'Basic settings')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {copy(
                locale,
                '改动后由服务端重新报价。',
                'Changes are quoted again by the server.'
              )}
            </p>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              <Label>{copy(locale, '图片比例', 'Image ratio')}</Label>
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
              <p className="font-semibold">
                {copy(locale, '图片积分消耗', 'Image credit cost')}
              </p>
            </div>
            {isQuoteLoading ? (
              <IconLoader2 className="size-4 animate-spin text-primary" />
            ) : quote ? (
              <Badge variant="secondary">
                {copy(
                  locale,
                  `${quote.totalCredits} 积分`,
                  `${quote.totalCredits} credits`
                )}
              </Badge>
            ) : null}
          </div>
          <div className="mt-4 flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {copy(locale, '每张', 'Per image')}
            </span>
            <strong>{quote?.unitCredits ?? '—'}</strong>
            <span className="text-muted-foreground">
              {copy(
                locale,
                `× ${count} 张`,
                `× ${count} image${count === 1 ? '' : 's'}`
              )}
            </span>
            <IconArrowRight className="size-4 text-muted-foreground" />
            <strong className="text-primary">
              {quote
                ? copy(
                    locale,
                    `${quote.totalCredits} 积分`,
                    `${quote.totalCredits} credits`
                  )
                : '—'}
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
            {copy(
              locale,
              '我确认拥有所提交内容的使用权，并同意将文字描述与生成结果交由内容安全审核接口处理。',
              'I confirm I have the right to use the content I submit and agree to submit my text description and generated results to the content-safety review interface.'
            )}
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
              {copy(locale, '正在生成', 'Generating')}
            </>
          ) : (
            <>
              <IconWand className="size-4" />
              {copy(
                locale,
                `生成图片${quote ? `（${quote.totalCredits} 积分）` : ''}`,
                `Generate image${quote ? ` (${quote.totalCredits} credits)` : ''}`
              )}
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
          <h2 className="font-semibold">
            {copy(locale, '生成预览', 'Generation preview')}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {copy(
              locale,
              '审核接入后，仅展示审核通过的私有结果',
              'Only private results that pass review are shown here.'
            )}
          </p>
        </div>
        {isGenerating && (
          <Badge className="gap-1.5">
            <IconLoader2 className="size-3 animate-spin" />
            {copy(locale, '生成中', 'Generating')}
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
                  alt={copy(locale, '已生成的图片', 'Generated image')}
                  className="aspect-[3/4] w-full object-cover"
                />
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    buttonVariants({ size: 'sm', variant: 'secondary' }),
                    'absolute right-2 bottom-2'
                  )}
                >
                  <IconDownload className="size-4" />
                  {copy(locale, '下载', 'Download')}
                </a>
              </div>
            ))}
          </div>
        ) : isGenerating ? (
          <div className="text-center text-sm text-muted-foreground">
            <IconLoader2 className="mx-auto mb-3 size-8 animate-spin text-primary" />
            {copy(
              locale,
              '正在等待图像服务返回结果…',
              'Waiting for the image service to return your result…'
            )}
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground">
            <IconSparkles className="mx-auto mb-3 size-7 text-primary" />
            {copy(
              locale,
              '选择模板并提交创意后，你的作品会显示在这里。',
              'Choose a template and submit your idea to see your work here.'
            )}
          </div>
        )}
      </div>
      <div className="mt-4 rounded-xl border p-4">
        <p className="font-semibold">
          {copy(locale, '当前任务', 'Current task')}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          {ticket
            ? copy(
                locale,
                '本次生成任务正在此处跟踪。结果会显示在上方预览区。',
                'This generation is being tracked here. Results appear in the preview above.'
              )
            : copy(
                locale,
                '提交生成后，可在此查看当前任务的进度。',
                'After you submit a generation, its progress will appear here.'
              )}
        </p>
      </div>
    </aside>
  );
}
