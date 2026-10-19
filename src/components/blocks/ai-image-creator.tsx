import { getKieImageGenerationStatus } from '@/api/ai';
import {
  deleteImageCreatorReference,
  getImageCreatorPolicy,
  getImageCreatorTemplates,
  quoteImageCreatorDraft,
  startImageCreatorGeneration,
  uploadImageCreatorReference,
} from '@/api/image-creator';
import { authClient } from '@/auth/client';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  buildImageCreatorAuthHref,
  buildImageCreatorCallbackUrl,
  canSubmitImageCreatorDraft,
  getLocalizedImageTemplate,
  JEVAILAB_TEMPLATE_SELECTION_EVENT,
  resolveExternalTemplateSelection,
  validateImageCreatorReferenceFile,
} from '@/lib/image-creator/ui-state';
import {
  clearImageCreatorReference,
  loadImageCreatorDraft,
  loadImageCreatorReference,
  saveImageCreatorDraft,
  saveImageCreatorReference,
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
  IconAlertCircle,
  IconCheck,
  IconDownload,
  IconLoader2,
  IconPhoto,
  IconPlus,
  IconSearch,
  IconSparkles,
  IconWand,
  IconX,
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
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referenceName, setReferenceName] = useState<string>();
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string>();
  const [referenceAssetId, setReferenceAssetId] = useState<string | null>(null);
  const referenceObjectUrlsRef = useRef<Set<string>>(new Set());
  const [isUploadingReference, setIsUploadingReference] = useState(false);
  const [isRemovingReference, setIsRemovingReference] = useState(false);
  const [referenceUploadProgress, setReferenceUploadProgress] = useState(0);
  const [referenceUploadError, setReferenceUploadError] = useState<string>();
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [quote, setQuote] = useState<Quote>();
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticket, setTicket] = useState<string>();
  const [pendingGenerate, setPendingGenerate] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [referenceHydrated, setReferenceHydrated] = useState(false);
  const uploadReferencePromiseRef = useRef<Promise<string | null> | null>(null);
  const uploadedReferenceRef = useRef<{
    file: File;
    assetId: string;
  } | null>(null);
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

  function createReferencePreviewUrl(file: File) {
    const previewUrl = URL.createObjectURL(file);
    referenceObjectUrlsRef.current.add(previewUrl);
    return previewUrl;
  }

  function releaseReferencePreviewUrl(previewUrl?: string) {
    if (!previewUrl || !referenceObjectUrlsRef.current.has(previewUrl)) return;
    URL.revokeObjectURL(previewUrl);
    referenceObjectUrlsRef.current.delete(previewUrl);
  }

  useEffect(
    () => () => {
      for (const previewUrl of referenceObjectUrlsRef.current) {
        URL.revokeObjectURL(previewUrl);
      }
      referenceObjectUrlsRef.current.clear();
    },
    []
  );

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
    let cancelled = false;
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

    void loadImageCreatorReference()
      .then((file) => {
        if (cancelled || !file) return;
        setReferenceFile(file);
        setReferenceName(file.name);
        setReferencePreviewUrl(createReferencePreviewUrl(file));
      })
      .catch(() => {
        // A missing or blocked local image must not prevent editing.
      })
      .finally(() => {
        if (!cancelled) {
          setDraftHydrated(true);
          setReferenceHydrated(true);
        }
      });

    return () => {
      cancelled = true;
    };
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
      referenceAssetId,
      mode,
      ratio,
      count,
      extraPrompt: prompt,
    }),
    [count, mode, prompt, ratio, referenceAssetId, templateId]
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
            pollError instanceof Error
              ? pollError.message
              : copy(
                  locale,
                  '无法查询生成进度。',
                  'Unable to check generation progress.'
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

  function chooseTemplate(
    template: PublicImageTemplate | null,
    { preserveReference = false }: { preserveReference?: boolean } = {}
  ) {
    setTemplateId(template?.id ?? null);
    if (template) {
      setMode(template.defaultMode);
      setRatio(
        ratios.includes(template.defaultRatio as (typeof ratios)[number])
          ? template.defaultRatio
          : '3:4'
      );
      setCount(template.defaultCount);
      if (template.inputPolicy === 'forbidden' && !preserveReference) {
        setReferenceFile(null);
        setReferenceName(undefined);
        setReferenceAssetId(null);
        releaseReferencePreviewUrl(referencePreviewUrl);
        setReferencePreviewUrl(undefined);
        setReferenceUploadProgress(0);
        setReferenceUploadError(undefined);
        void clearImageCreatorReference();
      }
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
      if (template) chooseTemplate(template, { preserveReference: true });
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

  async function uploadReference(
    file: File,
    previousAssetId: string | null = null
  ): Promise<string | null> {
    if (!signedIn) return null;
    if (uploadReferencePromiseRef.current) {
      return uploadReferencePromiseRef.current;
    }

    setReferenceUploadError(undefined);
    uploadedReferenceRef.current = null;
    setIsUploadingReference(true);
    setReferenceUploadProgress(8);
    const progressTimer = window.setInterval(() => {
      setReferenceUploadProgress((current) =>
        Math.min(92, current + Math.max(1, Math.round((92 - current) / 5)))
      );
    }, 180);

    const uploadTask = (async () => {
      try {
        const form = new FormData();
        form.set('file', file);
        const result = await uploadImageCreatorReference({ data: form });
        setReferenceName(result.fileName);
        setReferenceAssetId(result.assetId);
        uploadedReferenceRef.current = { file, assetId: result.assetId };
        setReferenceUploadProgress(100);
        setReferenceUploadError(undefined);
        if (previousAssetId && previousAssetId !== result.assetId) {
          await deleteImageCreatorReference({
            data: { assetId: previousAssetId },
          }).catch(() => undefined);
        }
        return result.assetId;
      } catch (uploadError) {
        setReferenceUploadProgress(0);
        const uploadMessage =
          uploadError instanceof Error ? uploadError.message : '';
        setReferenceUploadError(
          /unauthorized|email not verified/i.test(uploadMessage)
            ? copy(
                locale,
                '登录状态已失效，请重新登录后再生成。',
                'Your session expired. Sign in again before generating.'
              )
            : uploadMessage ||
                copy(
                  locale,
                  '参考图上传失败，请稍后重试。',
                  'Reference image upload failed. Please try again later.'
                )
        );
        return null;
      } finally {
        window.clearInterval(progressTimer);
        setIsUploadingReference(false);
      }
    })();
    uploadReferencePromiseRef.current = uploadTask;
    try {
      return await uploadTask;
    } finally {
      uploadReferencePromiseRef.current = null;
    }
  }

  async function startGeneration(
    referenceAssetIdOverride: string | null = referenceAssetId,
    resume = false
  ) {
    setError(undefined);
    setTasks([]);
    setTicket(undefined);
    setIsSubmitting(true);
    try {
      let generationReferenceAssetId = referenceAssetIdOverride;
      if (
        referenceFile &&
        uploadedReferenceRef.current?.file === referenceFile &&
        (!generationReferenceAssetId ||
          generationReferenceAssetId === referenceAssetId)
      ) {
        generationReferenceAssetId = uploadedReferenceRef.current.assetId;
      }
      if (referenceFile && !generationReferenceAssetId) {
        generationReferenceAssetId = await uploadReference(referenceFile);
        if (!generationReferenceAssetId) {
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
          return;
        }
      }
      const result = await startImageCreatorGeneration({
        data: {
          ...draft,
          referenceAssetId: generationReferenceAssetId,
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
        startError instanceof Error
          ? startError.message
          : copy(locale, '无法开始创作。', 'Unable to start your creation.')
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
      if (referenceFile) {
        await saveImageCreatorReference(referenceFile).catch(() => undefined);
      }
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

    let assetId = referenceAssetId;
    if (referenceFile && !assetId) {
      assetId = await uploadReference(referenceFile);
      if (!assetId) return;
    }
    await startGeneration(assetId);
  }

  useEffect(() => {
    if (
      !signedIn ||
      !draftHydrated ||
      !referenceHydrated ||
      !pendingGenerate ||
      resumeStartedRef.current
    ) {
      return;
    }
    resumeStartedRef.current = true;
    void (async () => {
      let assetId = referenceAssetId;
      if (referenceFile && !assetId) {
        assetId = await uploadReference(referenceFile);
        if (!assetId) {
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
          return;
        }
      }
      await startGeneration(assetId, true);
    })();
  }, [draftHydrated, pendingGenerate, referenceHydrated, signedIn]);

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
                {copy(locale, 'AI 创作工作台', 'AI creation workspace')}
              </p>
              <p className="text-sm text-muted-foreground">
                {copy(
                  locale,
                  '挑选灵感、补充想法，生成属于你的视觉作品。',
                  'Choose a direction, add your idea, and create a visual that is yours.'
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
            referenceName={referenceName}
            referencePreviewUrl={referencePreviewUrl}
            referenceUploadProgress={referenceUploadProgress}
            referenceUploadError={referenceUploadError}
            quote={quote}
            isQuoteLoading={isQuoteLoading}
            consentAccepted={consentAccepted}
            error={error}
            canSubmit={canSubmit}
            isSubmitting={isSubmitting || isGenerating}
            isUploadingReference={isUploadingReference}
            isRemovingReference={isRemovingReference}
            onPromptChange={setPrompt}
            onRatioChange={setRatio}
            onReferenceChange={(file) => {
              setError(undefined);
              setReferenceUploadError(undefined);
              const validation = validateImageCreatorReferenceFile(file);
              if (validation) {
                setReferenceUploadError(
                  validation === 'type'
                    ? copy(
                        locale,
                        '请选择 JPG、PNG 或 WEBP 图片。',
                        'Choose a JPG, PNG, or WEBP image.'
                      )
                    : copy(
                        locale,
                        '图片不能超过 10MB。',
                        'The image must be 10MB or smaller.'
                      )
                );
                return;
              }
              const previousAssetId = referenceAssetId;
              const previousPreviewUrl = referencePreviewUrl;
              const localPreviewUrl = createReferencePreviewUrl(file);
              setReferenceFile(file);
              setReferenceName(file.name);
              setReferencePreviewUrl(localPreviewUrl);
              setReferenceAssetId(null);
              setReferenceUploadProgress(0);
              if (previousPreviewUrl !== localPreviewUrl) {
                releaseReferencePreviewUrl(previousPreviewUrl);
              }
              uploadedReferenceRef.current = null;
              void saveImageCreatorReference(file).catch(() => {
                setReferenceUploadError(
                  copy(
                    locale,
                    '图片无法保存在浏览器中，登录后需要重新选择。',
                    'This image could not be saved locally. Please select it again after signing in.'
                  )
                );
              });
              if (signedIn) {
                void uploadReference(file, previousAssetId);
              }
            }}
            onRemoveReference={async () => {
              setReferenceFile(null);
              uploadedReferenceRef.current = null;
              void clearImageCreatorReference();
              if (!referenceAssetId) {
                releaseReferencePreviewUrl(referencePreviewUrl);
                setReferenceName(undefined);
                setReferencePreviewUrl(undefined);
                setReferenceUploadProgress(0);
                setReferenceUploadError(undefined);
                setError(undefined);
                return;
              }
              setError(undefined);
              setIsRemovingReference(true);
              try {
                await deleteImageCreatorReference({
                  data: { assetId: referenceAssetId },
                });
                setReferenceName(undefined);
                setReferenceAssetId(null);
                setReferencePreviewUrl(undefined);
                setReferenceUploadProgress(0);
                setReferenceUploadError(undefined);
              } catch (removeError) {
                setError(
                  removeError instanceof Error
                    ? removeError.message
                    : copy(
                        locale,
                        '参考图删除失败，请稍后重试。',
                        'Reference image could not be deleted. Please try again.'
                      )
                );
              } finally {
                setIsRemovingReference(false);
              }
            }}
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
  referenceName,
  referencePreviewUrl,
  referenceUploadProgress,
  referenceUploadError,
  quote,
  isQuoteLoading,
  consentAccepted,
  error,
  canSubmit,
  isSubmitting,
  isUploadingReference,
  isRemovingReference,
  onPromptChange,
  onRatioChange,
  onReferenceChange,
  onRemoveReference,
  onConsentChange,
  onGenerate,
  locale,
}: {
  formRef: RefObject<HTMLElement | null>;
  selectedTemplate?: PublicImageTemplate;
  prompt: string;
  ratio: ImageCreatorRatio;
  count: number;
  referenceName?: string;
  referencePreviewUrl?: string;
  referenceUploadProgress: number;
  referenceUploadError?: string;
  quote?: Quote;
  isQuoteLoading: boolean;
  consentAccepted: boolean;
  error?: string;
  canSubmit: boolean;
  isSubmitting: boolean;
  isUploadingReference: boolean;
  isRemovingReference: boolean;
  onPromptChange: (value: string) => void;
  onRatioChange: (value: ImageCreatorRatio) => void;
  onReferenceChange: (file: File) => void;
  onRemoveReference: () => void;
  onConsentChange: (value: boolean) => void;
  onGenerate: () => void;
  locale: CreatorLocale;
}) {
  const displayTemplate = selectedTemplate
    ? getLocalizedImageTemplate(selectedTemplate, locale)
    : undefined;
  const referenceForbidden = selectedTemplate?.inputPolicy === 'forbidden';
  const referenceHint = copy(
    locale,
    '该模板不使用参考图。',
    'This template does not use a reference image.'
  );
  const referenceBusy = isUploadingReference || isRemovingReference;

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
              {selectedTemplate.inputPolicy === 'required'
                ? copy(
                    locale,
                    '此模板需要一张参考图。',
                    'This template requires a reference image.'
                  )
                : selectedTemplate.inputPolicy === 'forbidden'
                  ? copy(
                      locale,
                      '此模板不接收参考图。',
                      'This template does not accept reference images.'
                    )
                  : copy(
                      locale,
                      '可选上传一张参考图。',
                      'You may upload one reference image.'
                    )}
            </p>
          </div>
        </div>
      )}
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between">
            <Label htmlFor="creator-reference">
              {copy(locale, '上传参考图片', 'Upload a reference image')}{' '}
              <span className="font-normal text-muted-foreground">
                {copy(
                  locale,
                  '（可选，最多 1 张）',
                  '(Optional, up to 1 image)'
                )}
              </span>
            </Label>
            <span className="text-xs text-muted-foreground">
              JPG / PNG / WEBP · ≤10MB
            </span>
          </div>
          <label
            htmlFor="creator-reference"
            className={cn(
              'flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/15 px-4 text-center transition-colors',
              referenceForbidden || referenceBusy
                ? 'cursor-not-allowed opacity-50'
                : 'cursor-pointer hover:border-primary/60',
              referencePreviewUrl && 'items-stretch p-2'
            )}
            aria-busy={isUploadingReference}
          >
            {referencePreviewUrl ? (
              <div className="relative overflow-hidden rounded-lg border bg-background">
                <img
                  src={referencePreviewUrl}
                  alt={
                    referenceName ??
                    copy(locale, '参考图片预览', 'Reference image preview')
                  }
                  className="mx-auto max-h-56 w-full object-contain"
                />
                <div className="absolute inset-x-2 bottom-2 rounded-md bg-background/90 px-3 py-2 text-left text-xs shadow-sm backdrop-blur-sm">
                  <p className="truncate font-medium">{referenceName}</p>
                  <p className="mt-0.5 text-muted-foreground">
                    {copy(
                      locale,
                      '点击图片替换参考图',
                      'Click the image to replace it'
                    )}
                  </p>
                </div>
                {isUploadingReference && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/75 px-4 text-center backdrop-blur-[1px]">
                    <IconLoader2 className="size-7 animate-spin text-primary" />
                    <p className="text-sm font-semibold">
                      {copy(
                        locale,
                        '图片正在上传中…',
                        'Your image is uploading…'
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {referenceUploadProgress}%
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <IconPhoto className="mb-2 size-5 text-primary" />
                <span className="text-sm font-medium">
                  {isUploadingReference
                    ? copy(
                        locale,
                        '正在上传参考图…',
                        'Uploading your reference…'
                      )
                    : copy(
                        locale,
                        '选择一张图片作为参考',
                        'Choose an image as reference'
                      )}
                </span>
                {referenceForbidden && (
                  <span className="mt-1 text-xs text-muted-foreground">
                    {referenceHint}
                  </span>
                )}
              </>
            )}
            {isUploadingReference && (
              <div className="mt-3 w-full max-w-sm text-left">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{copy(locale, '上传进度', 'Upload progress')}</span>
                  <span>{referenceUploadProgress}%</span>
                </div>
                <Progress
                  value={referenceUploadProgress}
                  aria-label={copy(locale, '上传进度', 'Upload progress')}
                />
              </div>
            )}
          </label>
          {referenceUploadError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <IconAlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{referenceUploadError}</span>
            </div>
          )}
          {referencePreviewUrl && (
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-xs text-muted-foreground">
                {referenceName}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 text-destructive hover:text-destructive"
                disabled={referenceBusy}
                onClick={onRemoveReference}
              >
                <IconX className="size-4" />
                {isRemovingReference
                  ? copy(locale, '删除中…', 'Deleting…')
                  : copy(locale, '删除图片', 'Delete image')}
              </Button>
            </div>
          )}
          <Input
            id="creator-reference"
            data-testid="image-creator-reference"
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={referenceBusy || referenceForbidden}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onReferenceChange(file);
                event.target.value = '';
              }
            }}
          />
        </div>
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
              '我确认拥有所上传内容的使用权，并同意将文字、参考图与生成结果交由内容安全审核接口处理。',
              'I confirm I have the right to use all uploaded content and agree to submit text, reference images, and generated results to the content-safety review interface.'
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
          {copy(locale, '创作记录', 'Creation history')}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          {ticket
            ? copy(
                locale,
                '当前任务正在此处跟踪。私有历史会在审核与数据迁移完成后启用。',
                'Your current task is tracked here. Private history will be enabled after review and data migration are complete.'
              )
            : copy(
                locale,
                '还没有创作记录。完成第一张图片后会显示在这里。',
                'There is no creation history yet. Your first completed image will appear here.'
              )}
        </p>
      </div>
    </aside>
  );
}
