import { getKieImageGenerationStatus } from '@/api/ai';
import {
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { canSubmitImageCreatorDraft } from '@/lib/image-creator/ui-state';
import type {
  ImageCreatorMode,
  ImageCreatorRatio,
  PublicImageTemplate,
} from '@/lib/image-creator/types';
import { Routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { Link } from '@tanstack/react-router';
import {
  IconArrowRight,
  IconCheck,
  IconDownload,
  IconLoader2,
  IconLock,
  IconPhoto,
  IconPlus,
  IconSearch,
  IconSparkles,
  IconWand,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';

type GenerationTask = {
  taskId: string;
  state: 'waiting' | 'queuing' | 'generating' | 'success' | 'fail';
  progress?: number;
  resultUrls: string[];
  error?: string;
};

type Quote = { unitCredits: number; totalCredits: number };

const ratios: ImageCreatorRatio[] = [
  'AUTO',
  '9:16',
  '2:3',
  '3:4',
  '1:1',
  '4:3',
  '3:2',
  '16:9',
  '21:9',
];

export default function AiImageCreatorSection() {
  const { data: session } = authClient.useSession();
  const [templates, setTemplates] = useState<PublicImageTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [policyVersion, setPolicyVersion] = useState('2026-10-16');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [templateId, setTemplateId] = useState<string | null>(
    'cinematic-portrait'
  );
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<ImageCreatorMode>('1K_SD');
  const [ratio, setRatio] = useState<ImageCreatorRatio>('3:4');
  const [count, setCount] = useState(1);
  const [referenceName, setReferenceName] = useState<string>();
  const [referenceAssetId, setReferenceAssetId] = useState<string | null>(null);
  const [isUploadingReference, setIsUploadingReference] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [quote, setQuote] = useState<Quote>();
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticket, setTicket] = useState<string>();
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
        isSignedIn: true,
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
              : 'Unable to check generation progress.'
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
    isSignedIn: Boolean(session?.user),
    isSubmitting: isSubmitting || isGenerating || isUploadingReference,
    consentAccepted,
    templateId,
    prompt,
  });

  function chooseTemplate(template: PublicImageTemplate | null) {
    setTemplateId(template?.id ?? null);
    if (template) {
      setMode(template.defaultMode);
      setRatio(template.defaultRatio);
      setCount(template.defaultCount);
      if (template.inputPolicy === 'forbidden') {
        setReferenceName(undefined);
        setReferenceAssetId(null);
      }
    }
    setQuote(undefined);
  }

  async function startGeneration() {
    setError(undefined);
    setTasks([]);
    setTicket(undefined);
    setIsSubmitting(true);
    try {
      const result = await startImageCreatorGeneration({
        data: { ...draft, consentAccepted: true, policyVersion },
      });
      setTicket(result.ticket);
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : 'Unable to start your creation.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

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
                AI 创作工作台
              </p>
              <p className="text-sm text-muted-foreground">
                挑选灵感、补充想法，生成属于你的视觉作品。
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="w-fit gap-1.5 px-3 py-1.5">
            <IconLock className="size-3.5" />
            私有创作空间
          </Badge>
        </div>

        <CardContent className="grid gap-0 p-0 xl:grid-cols-[minmax(13.5rem,.72fr)_minmax(0,1.35fr)_minmax(18rem,.82fr)]">
          <TemplateBrowser
            templates={filteredTemplates}
            categories={categories}
            category={category}
            query={query}
            selectedId={templateId}
            onCategoryChange={setCategory}
            onQueryChange={setQuery}
            onChoose={chooseTemplate}
          />
          <CreatorForm
            selectedTemplate={selectedTemplate}
            prompt={prompt}
            mode={mode}
            ratio={ratio}
            count={count}
            referenceName={referenceName}
            quote={quote}
            isQuoteLoading={isQuoteLoading}
            consentAccepted={consentAccepted}
            error={error}
            canSubmit={canSubmit}
            isSubmitting={isSubmitting || isGenerating}
            isUploadingReference={isUploadingReference}
            signedIn={Boolean(session?.user)}
            onPromptChange={setPrompt}
            onModeChange={setMode}
            onRatioChange={setRatio}
            onCountChange={setCount}
            onReferenceChange={async (file) => {
              setError(undefined);
              setIsUploadingReference(true);
              try {
                const form = new FormData();
                form.set('file', file);
                const result = await uploadImageCreatorReference({
                  data: form,
                });
                setReferenceName(result.fileName);
                setReferenceAssetId(result.assetId);
              } catch (uploadError) {
                setReferenceName(undefined);
                setReferenceAssetId(null);
                setError(
                  uploadError instanceof Error
                    ? uploadError.message
                    : '参考图上传失败，请稍后重试。'
                );
              } finally {
                setIsUploadingReference(false);
              }
            }}
            onConsentChange={setConsentAccepted}
            onGenerate={startGeneration}
          />
          <GenerationPreview
            imageUrls={imageUrls}
            isGenerating={isSubmitting || isGenerating}
            ticket={ticket}
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
  onCategoryChange,
  onQueryChange,
  onChoose,
}: {
  templates: PublicImageTemplate[];
  categories: string[];
  category: string;
  query: string;
  selectedId: string | null;
  onCategoryChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onChoose: (template: PublicImageTemplate | null) => void;
}) {
  return (
    <aside className="border-b p-5 xl:border-r xl:border-b-0 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">选择图片模板</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            封面固定 3:4，生成比例可单独设置
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
          placeholder="搜索风格或主题"
          aria-label="搜索图片模板"
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
            {item === 'All' ? '全部' : item}
          </Button>
        ))}
      </div>
      <div className="grid max-h-[31rem] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 xl:grid-cols-2">
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
              <span className="text-xs font-medium">自由创作</span>
            </div>
          </div>
          <p className="mt-2 truncate text-xs font-medium">自由创作</p>
        </button>
        {templates.map((template) => (
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
              {template.name}
            </p>
          </button>
        ))}
      </div>
    </aside>
  );
}

function CreatorForm({
  selectedTemplate,
  prompt,
  mode,
  ratio,
  count,
  referenceName,
  quote,
  isQuoteLoading,
  consentAccepted,
  error,
  canSubmit,
  isSubmitting,
  isUploadingReference,
  signedIn,
  onPromptChange,
  onModeChange,
  onRatioChange,
  onCountChange,
  onReferenceChange,
  onConsentChange,
  onGenerate,
}: {
  selectedTemplate?: PublicImageTemplate;
  prompt: string;
  mode: ImageCreatorMode;
  ratio: ImageCreatorRatio;
  count: number;
  referenceName?: string;
  quote?: Quote;
  isQuoteLoading: boolean;
  consentAccepted: boolean;
  error?: string;
  canSubmit: boolean;
  isSubmitting: boolean;
  isUploadingReference: boolean;
  signedIn: boolean;
  onPromptChange: (value: string) => void;
  onModeChange: (value: ImageCreatorMode) => void;
  onRatioChange: (value: ImageCreatorRatio) => void;
  onCountChange: (value: number) => void;
  onReferenceChange: (file: File) => void;
  onConsentChange: (value: boolean) => void;
  onGenerate: () => void;
}) {
  const referenceForbidden = selectedTemplate?.inputPolicy === 'forbidden';
  const referenceHint = referenceForbidden
    ? '该模板不使用参考图。'
    : '参考图会先进入私有审核流程；图生图生成适配器接入前不会把它伪装为已生效。';

  return (
    <main className="border-b p-5 xl:border-r xl:border-b-0 sm:p-7">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">创作你的图片</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedTemplate
              ? selectedTemplate.description
              : '从一个想法开始，自由描述你想生成的画面。'}
          </p>
        </div>
        {selectedTemplate && (
          <Badge variant="outline">{selectedTemplate.category}</Badge>
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
            <p className="font-medium">已选模板：{selectedTemplate.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {selectedTemplate.inputPolicy === 'required'
                ? '此模板需要一张参考图。'
                : selectedTemplate.inputPolicy === 'forbidden'
                  ? '此模板不接收参考图。'
                  : '可选上传一张参考图。'}
            </p>
          </div>
        </div>
      )}
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between">
            <Label htmlFor="creator-reference">
              上传参考图片{' '}
              <span className="font-normal text-muted-foreground">
                （可选，最多 1 张）
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
              referenceForbidden
                ? 'cursor-not-allowed opacity-50'
                : 'cursor-pointer hover:border-primary/60'
            )}
          >
            <IconPhoto className="mb-2 size-5 text-primary" />
            <span className="text-sm font-medium">
              {isUploadingReference
                ? '正在上传并审核参考图…'
                : (referenceName ?? '选择一张图片作为参考')}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              {referenceHint}
            </span>
          </label>
          <Input
            id="creator-reference"
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={isUploadingReference || referenceForbidden}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onReferenceChange(file);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="creator-prompt">补充创意要求</Label>
          <Textarea
            id="creator-prompt"
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            className="min-h-24"
            maxLength={1000}
            placeholder={
              selectedTemplate
                ? '例如：暖黄灯光、胶片质感、保留人物表情…'
                : '描述你希望生成的画面、主体、风格和氛围…'
            }
          />
          <p className="text-right text-xs text-muted-foreground">
            {prompt.length} / 1000
          </p>
        </div>
        <div className="rounded-xl border">
          <div className="border-b px-4 py-3">
            <p className="font-semibold">基础配置</p>
            <p className="mt-1 text-xs text-muted-foreground">
              改动后由服务端重新报价。
            </p>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <CreatorSelect
              label="清晰度"
              value={mode}
              onValueChange={(value) => onModeChange(value as ImageCreatorMode)}
              items={[
                { value: '1K_SD', label: '1K SD' },
                { value: '2K_HD', label: '2K HD' },
              ]}
            />
            <CreatorSelect
              label="图片比例"
              value={ratio}
              onValueChange={(value) =>
                onRatioChange(value as ImageCreatorRatio)
              }
              items={ratios.map((value) => ({
                value,
                label: value === 'AUTO' ? 'Auto' : value,
              }))}
            />
            <CreatorSelect
              label="生成数量"
              value={String(count)}
              onValueChange={(value) => onCountChange(Number(value))}
              items={Array.from({ length: 9 }, (_, index) => ({
                value: String(index + 1),
                label: `${index + 1} 张`,
              }))}
            />
          </div>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">图片积分消耗</p>
              <p className="mt-1 text-xs text-muted-foreground">
                服务器报价有效期 5 分钟，提交时会再次校验。
              </p>
            </div>
            {isQuoteLoading ? (
              <IconLoader2 className="size-4 animate-spin text-primary" />
            ) : (
              <Badge variant="secondary">
                {quote ? `${quote.totalCredits} 积分` : '登录后报价'}
              </Badge>
            )}
          </div>
          <div className="mt-4 flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">每张</span>
            <strong>{quote?.unitCredits ?? '—'}</strong>
            <span className="text-muted-foreground">× {count} 张</span>
            <IconArrowRight className="size-4 text-muted-foreground" />
            <strong className="text-primary">
              {quote?.totalCredits ?? '—'} 积分
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
            我确认拥有所上传内容的使用权，并同意将文字、参考图与生成结果交由内容安全审核接口处理。
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
        {signedIn ? (
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={onGenerate}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <>
                <IconLoader2 className="size-4 animate-spin" />
                正在生成
              </>
            ) : (
              <>
                <IconWand className="size-4" />
                生成图片{quote ? `（${quote.totalCredits} 积分）` : ''}
              </>
            )}
          </Button>
        ) : (
          <Link
            to={Routes.Login}
            className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
          >
            <IconSparkles className="size-4" />
            登录后开始创作
          </Link>
        )}
      </div>
    </main>
  );
}

function GenerationPreview({
  imageUrls,
  isGenerating,
  ticket,
}: {
  imageUrls: string[];
  isGenerating: boolean;
  ticket?: string;
}) {
  return (
    <aside className="p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">生成预览</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            审核接入后，仅展示审核通过的私有结果
          </p>
        </div>
        {isGenerating && (
          <Badge className="gap-1.5">
            <IconLoader2 className="size-3 animate-spin" />
            生成中
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
                  alt="已生成的图片"
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
                  下载
                </a>
              </div>
            ))}
          </div>
        ) : isGenerating ? (
          <div className="text-center text-sm text-muted-foreground">
            <IconLoader2 className="mx-auto mb-3 size-8 animate-spin text-primary" />
            正在等待图像服务返回结果…
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground">
            <IconSparkles className="mx-auto mb-3 size-7 text-primary" />
            选择模板并提交创意后，你的作品会显示在这里。
          </div>
        )}
      </div>
      <div className="mt-4 rounded-xl border p-4">
        <p className="font-semibold">创作记录</p>
        <p className="mt-3 text-sm text-muted-foreground">
          {ticket
            ? '当前任务正在此处跟踪。私有历史会在审核与数据迁移完成后启用。'
            : '还没有创作记录。完成第一张图片后会显示在这里。'}
        </p>
      </div>
    </aside>
  );
}

function CreatorSelect({
  label,
  value,
  onValueChange,
  items,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  items: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        items={items}
        value={value}
        onValueChange={(next) => {
          if (next) onValueChange(next);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value} label={item.label}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
