import { getCollectionCards } from '@/constants/collections';
import { constructMetadata } from '@/lib/metadata';
import { createPageCanonicalUrl } from '@/lib/canonical-url';
import type { SupportedLanguage } from '@/types';
import { getLocale, getTranslations } from 'next-intl/server';
import NewCollectionClient from './new-collection';

export async function generateMetadata() {
  const t = await getTranslations('metadatas.new-collection');
  const locale = (await getLocale()) as SupportedLanguage;
  return constructMetadata({
    title: t('title'),
    description: t('description'),
    locale,
    canonicalUrl: createPageCanonicalUrl({ locale, path: 'new-collection' }),
  });
}

export default async function NewCollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; tag?: string; search?: string }>;
}) {
  const t = await getTranslations();
  const { category, tag, search } = await searchParams;

  const COLLECTION_CARDS = getCollectionCards(t);

  let filteredCollections = COLLECTION_CARDS;

  if (category) {
    filteredCollections = filteredCollections.filter((card) => card.category === category);
  }

  if (tag) {
    filteredCollections = filteredCollections.filter((card) => card.tags.includes(tag));
  }

  if (search) {
    const searchLower = search.toLowerCase();
    filteredCollections = filteredCollections.filter(
      (card) =>
        card.title.toLowerCase().includes(searchLower) ||
        card.shortDescription.toLowerCase().includes(searchLower) ||
        card.tags.some((t) => t.toLowerCase().includes(searchLower))
    );
  }

  const featuredCollection = COLLECTION_CARDS.find((card) => card.featured);

  const translations = {
    eyebrow: t('new-collection-page.eyebrow'),
    heroTitle: t('new-collection-page.heroTitle'),
    heroDescription: t('new-collection-page.heroDescription'),
    featuredButton: t('new-collection-page.featuredButton'),
    filteredResults: t('new-collection-page.filteredResults'),
    allProjects: t('new-collection-page.allProjects'),
    showing: t('new-collection-page.showing'),
    of: t('new-collection-page.of'),
    projects: t('new-collection-page.projects'),
    clearFilters: t('new-collection-page.clearFilters'),
    noProjects: t('new-collection-page.noProjects'),
    viewAll: t('new-collection-page.viewAll'),
    ctaTitle: t('new-collection-page.ctaTitle'),
    ctaDescription: t('new-collection-page.ctaDescription'),
    ctaButton: t('new-collection-page.ctaButton'),
  };

  return (
    <NewCollectionClient
      filteredCollections={filteredCollections}
      allCollectionsCount={COLLECTION_CARDS.length}
      featuredCollection={featuredCollection}
      category={category}
      tag={tag}
      search={search}
      translations={translations}
    />
  );
}