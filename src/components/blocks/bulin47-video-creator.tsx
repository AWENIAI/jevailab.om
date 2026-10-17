'use client';

import { authClient } from '@/auth/client';
import {
  getVideoCreatorJob,
  quoteVideoCreatorDraft,
  startVideoCreatorGeneration,
  uploadVideoCreatorReference,
} from '@/api/video-creator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  canGenerateBulinVideo,
  type BulinVideoModel,
  type BulinVideoResolution,
} from '@/lib/video-creator/ui-state';
import { videoTemplateExamples } from '@/lib/video-creator/templates';
import { getLocale } from '@/lib/locale';
import { cn } from '@/lib/utils';
import { Link } from '@tanstack/react-router';
import {
  IconArrowRight,
  IconPhotoPlus,
  IconPlayerPause,
  IconPlayerPlay,
  IconVolume,
  IconVolumeOff,
} from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';

type CreatorLocale = 'zh' | 'en';

function copy(locale: CreatorLocale, zh: string, en: string) {
  return locale === 'zh' ? zh : en;
}

function getExampleLabel(index: number, locale: CreatorLocale) {
  return locale === 'zh' ? `示例${index}` : `Example ${index}`;
}

const models: Array<{ id: BulinVideoModel; label: string; note: string }> = [
  {
    id: 'bytedance/seedance-2-mini',
    label: 'Seedance 2.0 Mini',
    note: 'Reference-video creation',
  },
  {
    id: 'wan/2-2-animate-replace',
    label: 'Wan Animate',
    note: 'Authorized-template creation',
  },
];

const ButtonChoice = ({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'rounded-xl border px-3 py-2 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
      active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted/50'
    )}
  >
    {children}
  </button>
);

export function Bulin47VideoCreator() {
  const locale: CreatorLocale = getLocale() === 'zh' ? 'zh' : 'en';
  const { data: session } = authClient.useSession();
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [selectedExample, setSelectedExample] = useState('example-1');
  const [pausedExampleIds, setPausedExampleIds] = useState<Set<string>>(
    new Set()
  );
  const [unmutedExampleId, setUnmutedExampleId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File>();
  const [photoPreview, setPhotoPreview] = useState<string>();
  const [model, setModel] = useState<BulinVideoModel>(
    'bytedance/seedance-2-mini'
  );
  const [resolution, setResolution] = useState<BulinVideoResolution>('720p');
  const [submitMessage, setSubmitMessage] = useState<string>();
  const [uploadedAssetId, setUploadedAssetId] = useState<string>();
  const [authorizationAccepted, setAuthorizationAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quoteMessage, setQuoteMessage] = useState<string>();
  const [quote, setQuote] = useState<{
    quoteId: string;
    creditUnits: number;
    credits: number;
    paidAvailableUnits: number;
    templateSeconds: number;
    outputSeconds: number;
    aspectRatio: string;
  }>();
  const [job, setJob] = useState<{
    id: string;
    status: string;
    errorCode: string | null;
    output: { id: string; mediaType: string | null; mediaUrl: string } | null;
  }>();

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(undefined);
      return;
    }
    const preview = URL.createObjectURL(photo);
    setPhotoPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [photo]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      Object.entries(videoRefs.current).forEach(([exampleId, video]) => {
        if (!video) return;
        video.muted = true;
        void video.play().catch(() => {
          setPausedExampleIds((current) => new Set(current).add(exampleId));
        });
      });
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let current = true;
    setQuote(undefined);
    setQuoteMessage(undefined);
    if (!session?.user) {
      return () => {
        current = false;
      };
    }
    void quoteVideoCreatorDraft({
      data: { templateId: selectedExample, model, resolution },
    })
      .then((nextQuote) => {
        if (current) {
          setQuote(nextQuote);
          setQuoteMessage(undefined);
        }
      })
      .catch(() => {
        if (current) {
          setQuote(undefined);
          setQuoteMessage(
            copy(
              locale,
              '当前没有可用的已授权视频示例，请在完成模板授权与启用后再创建。',
              'There is no enabled authorized video example yet. Complete template authorization and enable it before creating.'
            )
          );
        }
      });
    return () => {
      current = false;
    };
  }, [locale, model, resolution, selectedExample, session?.user?.id]);

  useEffect(() => {
    const jobId = job?.id;
    const jobStatus = job?.status;
    if (
      !jobId ||
      !jobStatus ||
      ['SUCCEEDED', 'FAILED', 'REVIEW_REQUIRED', 'CANCELLED'].includes(
        jobStatus
      )
    ) {
      return;
    }
    let current = true;
    const refresh = async () => {
      try {
        const latest = await getVideoCreatorJob({ data: { jobId } });
        if (current) setJob(latest);
      } catch {
        // The visible job status remains the last server-confirmed state. A
        // transient read failure must never trigger a new provider request.
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 8_000);
    return () => {
      current = false;
      window.clearInterval(timer);
    };
  }, [job?.id, job?.status]);

  const credits = quote?.credits;
  const creditsLabel = credits === undefined ? '—' : String(credits);
  const canGenerate = canGenerateBulinVideo({
    isSignedIn: Boolean(session?.user),
    hasPhoto: Boolean(photo),
    authorizationAccepted,
    hasCurrentQuote: Boolean(quote),
    isSubmitting,
  });
  const activeModel = models.find((item) => item.id === model) ?? models[0];

  async function handleGenerate() {
    if (!canGenerate || !quote) return;
    if (!photo) return;
    setIsSubmitting(true);
    setSubmitMessage(undefined);
    try {
      let assetId = uploadedAssetId;
      if (!assetId) {
        const form = new FormData();
        form.set('file', photo);
        form.set('authorizationAccepted', 'true');
        const uploaded = await uploadVideoCreatorReference({ data: form });
        assetId = uploaded.assetId;
        setUploadedAssetId(assetId);
      }
      const nextQuote = await quoteVideoCreatorDraft({
        data: { templateId: selectedExample, model, resolution },
      });
      setQuote(nextQuote);
      if (nextQuote.paidAvailableUnits < nextQuote.creditUnits) {
        setSubmitMessage(
          copy(
            locale,
            '付费视频积分不足，无法创建任务。',
            'There are not enough paid video credits to create this job.'
          )
        );
        return;
      }
      const started = await startVideoCreatorGeneration({
        data: {
          quoteId: nextQuote.quoteId,
          assetId,
          authorizationAccepted: true,
          idempotencyKey: crypto.randomUUID(),
        },
      });
      setSubmitMessage(
        copy(
          locale,
          `任务已创建：${started.jobId}`,
          `Job created: ${started.jobId}`
        )
      );
      setJob({
        id: started.jobId,
        status: started.status,
        errorCode: null,
        output: null,
      });
    } catch (error) {
      setSubmitMessage(
        error instanceof Error
          ? error.message
          : copy(
              locale,
              '无法创建视频任务。',
              'Unable to create the video job.'
            )
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function playPreview(exampleId: string) {
    const video = videoRefs.current[exampleId];
    if (!video) return;
    try {
      await video.play();
      setPausedExampleIds((current) => {
        const next = new Set(current);
        next.delete(exampleId);
        return next;
      });
    } catch {
      setPausedExampleIds((current) => new Set(current).add(exampleId));
    }
  }

  function pausePreview(exampleId: string) {
    const video = videoRefs.current[exampleId];
    if (video && !video.paused) video.pause();
    setPausedExampleIds((current) => new Set(current).add(exampleId));
  }

  function toggleSound(exampleId: string) {
    const nextUnmutedId = unmutedExampleId === exampleId ? null : exampleId;
    setUnmutedExampleId(nextUnmutedId);
    Object.entries(videoRefs.current).forEach(([id, video]) => {
      if (video) video.muted = id !== nextUnmutedId;
    });
  }

  return (
    <div className="bg-background text-foreground">
      <section id="video" className="scroll-mt-16 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              {copy(
                locale,
                'AI 视频创作 · 免费开始',
                'AI Video Creator · Start Free'
              )}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
              {copy(
                locale,
                '上传一张你有权使用的图片，选择视频示例与生成设置后开始创作。',
                'Upload an image you have permission to use, choose a video example and generation settings, then start creating.'
              )}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {videoTemplateExamples.map((example, index) => (
              <div key={example.id} className="group relative">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSelectedExample(example.id)}
                    aria-pressed={selectedExample === example.id}
                    className={cn(
                      'block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      selectedExample === example.id && 'scale-[1.02]'
                    )}
                  >
                    <div
                      className={cn(
                        'relative overflow-hidden rounded-2xl border-2 bg-card p-1 transition',
                        selectedExample === example.id
                          ? 'border-primary shadow-[0_0_0_1px_hsl(var(--primary)/.35)]'
                          : 'border-border group-hover:border-primary/70'
                      )}
                    >
                      <video
                        ref={(element) => {
                          videoRefs.current[example.id] = element;
                        }}
                        src={example.videoUrl}
                        poster={example.posterUrl}
                        autoPlay
                        muted={unmutedExampleId !== example.id}
                        loop
                        playsInline
                        preload="metadata"
                        className="aspect-[9/16] w-full rounded-xl object-cover"
                        onEnded={() =>
                          setPausedExampleIds((current) =>
                            new Set(current).add(example.id)
                          )
                        }
                      />
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const video = videoRefs.current[example.id];
                      if (
                        !video ||
                        video.paused ||
                        pausedExampleIds.has(example.id)
                      ) {
                        void playPreview(example.id);
                        return;
                      }
                      pausePreview(example.id);
                    }}
                    aria-label={copy(
                      locale,
                      `${getExampleLabel(index + 1, locale)}${pausedExampleIds.has(example.id) ? '播放' : '暂停'}`,
                      `${pausedExampleIds.has(example.id) ? 'Play' : 'Pause'} ${getExampleLabel(index + 1, locale)}`
                    )}
                    className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-full bg-background/90 text-foreground shadow-sm opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    {pausedExampleIds.has(example.id) ? (
                      <IconPlayerPlay className="size-4" />
                    ) : (
                      <IconPlayerPause className="size-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toggleSound(example.id);
                    }}
                    aria-label={copy(
                      locale,
                      `${getExampleLabel(index + 1, locale)}${unmutedExampleId === example.id ? '静音' : '打开声音'}`,
                      `${unmutedExampleId === example.id ? 'Mute' : 'Unmute'} ${getExampleLabel(index + 1, locale)}`
                    )}
                    className="absolute top-3 right-3 grid h-9 rounded-full bg-background/90 px-3 text-xs font-semibold text-foreground shadow-sm transition hover:bg-background focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {unmutedExampleId === example.id ? (
                        <IconVolume className="size-4" />
                      ) : (
                        <IconVolumeOff className="size-4" />
                      )}
                      {unmutedExampleId === example.id
                        ? copy(locale, '静音', 'Mute')
                        : copy(locale, '开声', 'Sound')}
                    </span>
                  </button>
                </div>
                <span className="mt-2 block text-center text-xs font-medium text-muted-foreground">
                  {getExampleLabel(index + 1, locale)}
                </span>
              </div>
            ))}
          </div>

          <div className="relative mt-12 rounded-3xl border border-primary/20 bg-card/95 p-5 shadow-2xl shadow-black/10 sm:p-6">
            <div className="grid gap-8 lg:grid-cols-[0.76fr_1.24fr] lg:p-2">
              <div>
                <StepLabel
                  index="1"
                  label={copy(locale, '上传你的照片', 'Add your photo')}
                />
                <label
                  htmlFor="bulin-photo"
                  className="mt-4 flex min-h-[26rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-muted/15 p-5 text-center transition hover:border-primary/70"
                >
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt={copy(locale, '已选择的图片', 'Selected image')}
                      className="max-h-[25rem] w-full rounded-xl object-cover"
                    />
                  ) : (
                    <>
                      <IconPhotoPlus className="size-9 text-primary" />
                      <span className="mt-4 text-base font-semibold">
                        {copy(
                          locale,
                          '点击上传一张照片',
                          'Tap to upload a photo'
                        )}
                      </span>
                      <span className="mt-2 text-sm text-muted-foreground">
                        JPG, PNG or WebP · Up to 10 MB
                      </span>
                    </>
                  )}
                </label>
                <Input
                  id="bulin-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      setPhoto(file);
                      setUploadedAssetId(undefined);
                      setQuote(undefined);
                      setQuoteMessage(undefined);
                      setSubmitMessage(undefined);
                    }
                  }}
                />
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {copy(
                    locale,
                    '请上传你有权使用的清晰图片。图片仅用于本次私密视频创作请求。',
                    'Upload a clear image you have permission to use. It is used only for this private video creation request.'
                  )}
                </p>
              </div>

              <div>
                <div>
                  <StepLabel
                    index="2"
                    label={copy(
                      locale,
                      '查看质量与积分消耗',
                      'Check quality & credit cost'
                    )}
                  />
                  <div className="mt-4 overflow-hidden rounded-2xl border bg-muted/10">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4">
                      <div>
                        <p className="font-semibold">
                          {activeModel.label} · {resolution}
                          {quote
                            ? ` · ${quote.templateSeconds}s · ${quote.aspectRatio}`
                            : ''}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {copy(
                            locale,
                            '时长和画面比例由已授权的视频示例固定，积分由服务端报价。',
                            'The authorized example fixes duration and format; the server provides the quote.'
                          )}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-primary">
                        {creditsLabel} {copy(locale, '积分', 'credits')}
                      </span>
                    </div>
                    <div className="space-y-5 p-5">
                      <fieldset>
                        <legend className="text-sm font-medium text-muted-foreground">
                          {copy(locale, '模型', 'Model')}
                        </legend>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {models.map((item) => (
                            <ButtonChoice
                              key={item.id}
                              active={model === item.id}
                              onClick={() => setModel(item.id)}
                            >
                              <span className="block text-left">
                                {item.label}
                              </span>
                              <span className="mt-1 block text-left text-xs font-normal opacity-70">
                                {item.note}
                              </span>
                            </ButtonChoice>
                          ))}
                        </div>
                      </fieldset>
                      <fieldset>
                        <legend className="text-sm font-medium text-muted-foreground">
                          {copy(locale, '清晰度', 'Resolution')}
                        </legend>
                        <div className="mt-3 flex gap-2">
                          {(['480p', '720p'] as const).map((value) => (
                            <ButtonChoice
                              key={value}
                              active={resolution === value}
                              onClick={() => setResolution(value)}
                            >
                              {value}
                            </ButtonChoice>
                          ))}
                        </div>
                      </fieldset>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {copy(
                          locale,
                          '更高的清晰度会消耗更多积分；模板时长与比例不会由浏览器修改。',
                          'Higher quality uses more credits; the browser cannot change the template duration or format.'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-7 border-t pt-6">
                  <StepLabel
                    index="3"
                    label={copy(locale, '生成你的视频', 'Generate your video')}
                  />
                  {session?.user ? (
                    <Button
                      type="button"
                      onClick={handleGenerate}
                      disabled={!canGenerate}
                      className="mt-4 h-13 w-full rounded-xl text-base font-semibold"
                    >
                      <IconPlayerPlay className="size-5" />
                      {photo && quote
                        ? copy(locale, '生成 AI 视频', 'Generate AI video')
                        : copy(
                            locale,
                            photo
                              ? quoteMessage
                                ? '暂无可用授权示例'
                                : '正在获取服务端报价'
                              : '请先上传照片',
                            photo
                              ? quoteMessage
                                ? 'No authorized example available'
                                : 'Getting the server quote'
                              : 'Add a photo to continue'
                          )}
                    </Button>
                  ) : (
                    <Link
                      to="/auth/login"
                      className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground transition hover:bg-primary/85"
                    >
                      <IconArrowRight className="size-5" />{' '}
                      {copy(locale, '登录后上传照片', 'Sign in to add a photo')}
                    </Link>
                  )}
                  <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={authorizationAccepted}
                      onChange={(event) =>
                        setAuthorizationAccepted(event.target.checked)
                      }
                      className="mt-1 size-4 rounded border-input accent-primary"
                    />
                    <span>
                      {copy(
                        locale,
                        '我确认拥有所上传图片的使用授权，并同意按服务条款进行内容审核。',
                        'I confirm I have permission to use the uploaded image and agree to content review under the Terms.'
                      )}
                    </span>
                  </label>
                  <p className="mt-4 text-center text-sm text-muted-foreground">
                    {creditsLabel} {copy(locale, '积分', 'credits')}
                  </p>
                  {quoteMessage ? (
                    <output className="mt-3 block rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-foreground">
                      {quoteMessage}
                    </output>
                  ) : null}
                  <div className="mt-4 flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
                    <a
                      href="#pricing"
                      className="text-primary underline underline-offset-4"
                    >
                      {copy(
                        locale,
                        credits
                          ? `按当前设置，约可每月生成 ${Math.max(1, Math.floor(100 / credits))} 个视频 · 查看套餐`
                          : '请登录后查看服务端积分报价 · 查看套餐',
                        credits
                          ? `About ${Math.max(1, Math.floor(100 / credits))} videos / month at these settings · See plans`
                          : 'Sign in to view the server-side credit quote · See plans'
                      )}
                    </a>
                    <a href="#pricing" className="underline underline-offset-4">
                      {copy(
                        locale,
                        '想按次付费？购买积分',
                        'Prefer to pay once? Buy credits'
                      )}
                    </a>
                  </div>
                  <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
                    {copy(
                      locale,
                      '继续即表示你确认拥有使用该照片的授权；生成失败将返还积分。',
                      'By creating, you confirm you have permission to use this photo. Failed generations return credits.'
                    )}
                  </p>
                  {submitMessage ? (
                    <output className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-center text-sm text-primary">
                      {submitMessage}
                    </output>
                  ) : null}
                  {job ? (
                    <div className="mt-4 rounded-xl border bg-card p-4 text-sm">
                      <p className="font-semibold">
                        {copy(locale, '任务状态：', 'Job status: ')}
                        {job.status}
                      </p>
                      {job.errorCode ? (
                        <p className="mt-1 text-muted-foreground">
                          {copy(locale, '需要人工复核：', 'Needs review: ')}
                          {job.errorCode}
                        </p>
                      ) : null}
                      {job.output ? (
                        <video
                          controls
                          playsInline
                          className="mt-4 aspect-video w-full rounded-lg bg-black object-contain"
                          src={job.output.mediaUrl}
                        >
                          <track
                            kind="captions"
                            srcLang={locale === 'zh' ? 'zh-CN' : 'en'}
                            label={copy(
                              locale,
                              '字幕（如有）',
                              'Captions when available'
                            )}
                          />
                          {copy(
                            locale,
                            '你的浏览器不支持视频预览。',
                            'Your browser does not support video preview.'
                          )}
                        </video>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <VideoSeoSections locale={locale} />
    </div>
  );
}

function StepLabel({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-center gap-3 text-base font-semibold">
      <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-sm text-primary">
        {index}
      </span>
      {label}
    </div>
  );
}

function VideoSeoSectionsEn() {
  const facts = [
    ['Start with an image', 'Upload an image you have permission to use.'],
    [
      'Choose a video example',
      'Pick an example and settings that suit your creative direction.',
    ],
    [
      'Review, then download',
      'Preview your finished video before sharing or downloading it.',
    ],
    [
      'Know the credits first',
      'Settings display a credit estimate before you commit.',
    ],
  ];
  const guideLinks = [
    'AI Video Settings: Choose a Model, Length, Resolution, and Credit Cost',
    'AI Video Creator: Upload an Image and Start Creating',
    'How to Choose an AI Video Example',
    'Free AI Video Creator: Check Credits Before You Generate',
    'AI Video Audio: Copyright and Silent-Video Tips',
    'How to Keep Your AI Video Consistent',
    'Ideas for Your Next AI Video',
    'What Image Should You Upload for AI Video? A Quick Checklist',
  ];

  return (
    <div className="border-t bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <section className="grid gap-8 lg:grid-cols-[.85fr_1.15fr]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">
              What is AI video creation?
            </h2>
            <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
              AI video creation lets you upload media you are authorized to use,
              choose a video example and settings, then create a private video
              in your browser.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {facts.map(([title, description]) => (
              <article key={title} className="rounded-2xl border bg-card p-5">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">
              Upload. Generate. Download.
            </h2>
            <ol className="mt-7 space-y-5">
              {[
                [
                  'Sign in and add your image',
                  'Choose a clear image you have permission to use.',
                ],
                [
                  'Choose your video settings',
                  'Choose an authorized example and quality setting that fit your idea.',
                ],
                [
                  'Review and download',
                  'Review your result before you download or share it.',
                ],
              ].map(([title, description], index) => (
                <li key={title} className="flex gap-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold tracking-tight">
              Designed for clear, informed creation
            </h2>
            <div className="mt-6 space-y-5">
              {[
                [
                  'Your media, your choice',
                  'Use only images and other source media you are authorized to use.',
                ],
                [
                  'Credits before you commit',
                  'Your selected settings keep the expected credit cost visible.',
                ],
                [
                  'Your choice of quality',
                  'Choose a model and resolution; the authorized template controls its duration and format.',
                ],
                [
                  'Credits returned on failure',
                  'Unsuccessful requests are eligible for a credit return.',
                ],
                [
                  'Saved in My Creations',
                  'Finished work can be reviewed from your private creation history.',
                ],
                [
                  'Works in your browser',
                  'Start with a supported photo directly from your browser.',
                ],
              ].map(([title, description]) => (
                <div key={title}>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-3xl font-semibold tracking-tight">
            A better photo, a clearer starting point
          </h2>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              'Use media you have permission to use',
              'Choose clear, even lighting',
              'Keep important elements visible',
              'Use a supported file format',
              'Review settings before generating',
              'Review before sharing',
            ].map((tip) => (
              <article key={tip} className="rounded-2xl border bg-card p-5">
                <h3 className="font-semibold">{tip}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  This helps you prepare media for a smoother creation process.
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20 grid gap-8 lg:grid-cols-[1fr_.8fr]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">
              Pick what you want to know
            </h2>
            <div className="mt-7 divide-y rounded-2xl border bg-card px-5">
              {guideLinks.map((item) => (
                <a
                  key={item}
                  href="#video"
                  className="flex items-center justify-between gap-3 py-4 text-sm font-medium transition hover:text-primary"
                >
                  <h3>{item}</h3>
                  <IconArrowRight className="size-4 shrink-0" />
                </a>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <article className="rounded-3xl border bg-card p-6">
              <h2 className="text-2xl font-semibold">
                Another scene for your next video
              </h2>
              <h3 className="mt-5 text-lg font-semibold text-primary">
                AI video creator
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Start a private AI video creation from your own authorized
                media.
              </p>
              <h3 className="mt-5 text-lg font-semibold text-primary">
                More video ideas
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Explore more creative directions when they are available in your
                workspace.
              </p>
            </article>
            <article
              id="pricing"
              className="rounded-3xl border border-primary/20 bg-primary/5 p-6"
            >
              <h2 className="text-2xl font-semibold">
                Try a credit pack. Save with a plan.
              </h2>
              <h3 className="mt-5 font-semibold">Subscription plans</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Plans are designed for repeat video creation.
              </p>
              <h3 className="mt-5 font-semibold">One-time credit packs</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Buy credits when you prefer not to subscribe.
              </p>
              <h3 className="mt-5 font-semibold">What a video costs</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Your model, resolution, and authorized template determine the
                credit cost.
              </p>
            </article>
          </div>
        </section>

        <section className="mt-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Before you start
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            Use only media you have permission to use and review your result
            before sharing.
          </p>
          <a
            href="#video"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/85"
          >
            Make your AI video <IconArrowRight className="size-4" />
          </a>
        </section>
      </div>
    </div>
  );
}

function VideoSeoSections({ locale }: { locale: CreatorLocale }) {
  if (locale === 'en') return <VideoSeoSectionsEn />;

  const facts = [
    ['从一张图片开始', '上传一张你有权使用的清晰图片。'],
    ['选择视频示例', '选择适合当前创作方向的示例与生成设置。'],
    ['确认后再下载', '生成完成后可以预览，确认满意再下载或分享。'],
    ['生成前可见积分', '模型、清晰度和时长会在提交前显示对应的积分消耗。'],
  ];

  return (
    <div className="border-t bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <section className="grid gap-8 lg:grid-cols-[.85fr_1.15fr]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">
              什么是 AI 视频创作？
            </h2>
            <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
              AI 视频创作支持你上传有权使用的素材，选择视频示例与生成设置，
              在浏览器中完成私密的视频创作。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {facts.map(([title, description]) => (
              <article key={title} className="rounded-2xl border bg-card p-5">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">
              上传照片，生成并下载
            </h2>
            <ol className="mt-7 space-y-5">
              {[
                ['登录并添加图片', '选择一张清晰且你拥有使用授权的图片。'],
                [
                  '选择视频设置',
                  '选择已授权示例、模型与清晰度。时长和画面比例由示例确定。',
                ],
                ['预览并下载', '确认生成结果后再下载或分享。'],
              ].map(([title, description], index) => (
                <li key={title} className="flex gap-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold tracking-tight">
              清晰、可控地创作
            </h2>
            <div className="mt-6 space-y-5">
              {[
                ['由你选择素材', '仅使用你拥有授权的图片及其他来源素材。'],
                ['提交前确认积分', '你选择的设置会即时显示预计需要的积分。'],
                [
                  '由你决定质量',
                  '可以在生成前选择模型与清晰度；时长和画面比例由已授权示例确定。',
                ],
                ['失败返还积分', '未成功完成的生成请求将按规则返还积分。'],
              ].map(([title, description]) => (
                <div key={title}>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">开始之前</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            请仅使用你拥有授权的素材，并在分享前检查生成结果。
          </p>
          <a
            href="#video"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/85"
          >
            创作 AI 视频 <IconArrowRight className="size-4" />
          </a>
        </section>
      </div>
    </div>
  );
}
