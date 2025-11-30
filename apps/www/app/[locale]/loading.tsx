import { useTranslations } from 'next-intl';

export default function Loading() {
  const t = useTranslations('loading');

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center mt-14 space-y-4">
        <div className="relative h-12 w-12 animate-pulse">
          <div className="absolute inset-0 rounded-full bg-linear-to-r from-primary to-primary-foreground opacity-50 blur-xl" />
          <div className="absolute inset-0 rounded-full bg-primary animate-ping" />
          <div className="absolute inset-0 rounded-full bg-primary" />
        </div>
        <p className="text-lg font-medium text-foreground">
          {t('title')}
        </p>
      </div>
    </div>
  );
}
