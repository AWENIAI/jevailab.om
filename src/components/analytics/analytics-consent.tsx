import {
  type AnalyticsConsent,
  setAnalyticsConsent,
} from '@/lib/analytics/consent';
import { getLocale } from '@/lib/locale';

export function AnalyticsConsentPrompt({
  onChange,
}: {
  onChange: (value: AnalyticsConsent) => void;
}) {
  const locale = getLocale();
  const choose = (value: AnalyticsConsent) => {
    setAnalyticsConsent(value);
    onChange(value);
  };
  const isChinese = locale === 'zh';

  return (
    <aside
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-xl border bg-background p-4 shadow-xl"
      aria-label={isChinese ? '分析 Cookie 偏好' : 'Analytics preferences'}
    >
      <p className="font-semibold">
        {isChinese ? '帮助我们改进 Jevailab' : 'Help improve Jevailab'}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {isChinese
          ? '我们会在您同意后使用 Google Analytics 了解匿名访问和页面使用情况。'
          : 'With your permission, we use Google Analytics to understand anonymous visits and page usage.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          onClick={() => choose('granted')}
        >
          {isChinese ? '同意分析' : 'Accept analytics'}
        </button>
        <button
          type="button"
          className="rounded-md border px-3 py-2 text-sm font-medium"
          onClick={() => choose('denied')}
        >
          {isChinese ? '拒绝' : 'Decline'}
        </button>
        <a
          className="px-2 py-2 text-sm underline"
          href={isChinese ? '/zh/cookie' : '/cookie'}
        >
          {isChinese ? 'Cookie 政策' : 'Cookie Policy'}
        </a>
      </div>
    </aside>
  );
}
