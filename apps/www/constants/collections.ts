export interface CollectionCard {
    id: string;
    slug: string;
    imageUrl: string;
    imageAlt: string;
    title: string;
    shortDescription: string;
    fullDescription: string;
    actionLabel: string;
    aspectRatio?: "square" | "4/3" | "16/9";
    category: string;
    tags: string[];
    featured: boolean;
    publishedDate: string;
    relatedIds?: string[];
    gallery?: {
        url: string;
        alt: string;
    }[];
    specifications?: {
        label: string;
        value: string;
    }[];
}

type TranslationFunction = (key: string, params?: any) => string;
type TranslationObject = {
    (key: string, params?: any): string;
    raw: (key: string) => any;
};

export const getCollectionCards = (t: TranslationFunction | TranslationObject): CollectionCard[] => {
    const getRaw = (key: string) => {
        if (typeof t === 'function' && 'raw' in t) {
            return (t as TranslationObject).raw(key);
        }
        const value = t(key);
        try {
            return JSON.parse(value as string);
        } catch {
            return value;
        }
    };

    return [
        {
            id: "1",
            slug: "natural-woven-collection",
            imageUrl: "/new-collection/new-collection-1/new-collection-1.png",
            imageAlt: t('collections.natural-woven-collection.imageAlt') as string,
            title: t('collections.natural-woven-collection.title') as string,
            shortDescription: t('collections.natural-woven-collection.shortDescription') as string,
            fullDescription: t('collections.natural-woven-collection.fullDescription') as string,
            actionLabel: t('collections.natural-woven-collection.actionLabel') as string,
            aspectRatio: "4/3",
            category: t('categories.Natural Woven') as string,
            tags: getRaw('collections.natural-woven-collection.tags'),
            featured: true,
            publishedDate: "2024-12-25",
            relatedIds: ["2", "3"],
            gallery: [
                {
                    url: "/new-collection/new-collection-1/new-collection-1.png",
                    alt: t('collections.natural-woven-collection.gallery.image1') as string
                },
                {
                    url: "/new-collection/new-collection-1/new-collection-2.png",
                    alt: t('collections.natural-woven-collection.gallery.image2') as string
                },
                {
                    url: "/new-collection/new-collection-1/new-collection-3.png",
                    alt: t('collections.natural-woven-collection.gallery.image3') as string
                },
                {
                    url: "/new-collection/new-collection-1/new-collection-4.png",
                    alt: t('collections.natural-woven-collection.gallery.image4') as string
                }
            ],
            specifications: [
                {
                    label: t('collections.natural-woven-collection.specifications.material') as string,
                    value: t('collections.natural-woven-collection.specifications.materialValue') as string
                },
                {
                    label: t('collections.natural-woven-collection.specifications.style') as string,
                    value: t('collections.natural-woven-collection.specifications.styleValue') as string
                },
                {
                    label: t('collections.natural-woven-collection.specifications.installation') as string,
                    value: t('collections.natural-woven-collection.specifications.installationValue') as string
                },
                {
                    label: t('collections.natural-woven-collection.specifications.care') as string,
                    value: t('collections.natural-woven-collection.specifications.careValue') as string
                }
            ]
        },
        {
            id: "2",
            slug: "rattan-pendant-collection",
            imageUrl: "/new-collection/new-collection-2/new-collection-1.png",
            imageAlt: t('collections.rattan-pendant-collection.imageAlt') as string,
            title: t('collections.rattan-pendant-collection.title') as string,
            shortDescription: t('collections.rattan-pendant-collection.shortDescription') as string,
            fullDescription: t('collections.rattan-pendant-collection.fullDescription') as string,
            actionLabel: t('collections.rattan-pendant-collection.actionLabel') as string,
            aspectRatio: "4/3",
            category: t('categories.Rattan Collection') as string,
            tags: getRaw('collections.rattan-pendant-collection.tags'),
            featured: true,
            publishedDate: "2024-12-24",
            relatedIds: ["1", "4"],
            gallery: [
                {
                    url: "/new-collection/new-collection-2/new-collection-1.png",
                    alt: t('collections.rattan-pendant-collection.gallery.image1') as string
                },
                {
                    url: "/new-collection/new-collection-2/new-collection-2.png",
                    alt: t('collections.rattan-pendant-collection.gallery.image2') as string
                },
                {
                    url: "/new-collection/new-collection-2/new-collection-3.png",
                    alt: t('collections.rattan-pendant-collection.gallery.image3') as string
                },
                {
                    url: "/new-collection/new-collection-2/new-collection-4.png",
                    alt: t('collections.rattan-pendant-collection.gallery.image4') as string
                }
            ],
            specifications: [
                {
                    label: t('collections.rattan-pendant-collection.specifications.variety') as string,
                    value: t('collections.rattan-pendant-collection.specifications.varietyValue') as string
                },
                {
                    label: t('collections.rattan-pendant-collection.specifications.sizes') as string,
                    value: t('collections.rattan-pendant-collection.specifications.sizesValue') as string
                },
                {
                    label: t('collections.rattan-pendant-collection.specifications.finish') as string,
                    value: t('collections.rattan-pendant-collection.specifications.finishValue') as string
                },
                {
                    label: t('collections.rattan-pendant-collection.specifications.lightOutput') as string,
                    value: t('collections.rattan-pendant-collection.specifications.lightOutputValue') as string
                }
            ]
        },
        {
            id: "3",
            slug: "new-light-collection",
            imageUrl: "/new-collection/new-collection-3/new-collection-1.png",
            imageAlt: t('collections.new-light-collection.imageAlt') as string,
            title: t('collections.new-light-collection.title') as string,
            shortDescription: t('collections.new-light-collection.shortDescription') as string,
            fullDescription: t('collections.new-light-collection.fullDescription') as string,
            actionLabel: t('collections.new-light-collection.actionLabel') as string,
            aspectRatio: "4/3",
            category: t('categories.Organic Lighting') as string,
            tags: getRaw('collections.new-light-collection.tags'),
            featured: true,
            publishedDate: "2024-12-23",
            relatedIds: ["1", "2"],
            gallery: [
                {
                    url: "/new-collection/new-collection-3/new-collection-1.png",
                    alt: t('collections.new-light-collection.gallery.image1') as string
                },
                {
                    url: "/new-collection/new-collection-3/new-collection-2.png",
                    alt: t('collections.new-light-collection.gallery.image2') as string
                },
                {
                    url: "/new-collection/new-collection-3/new-collection-3.png",
                    alt: t('collections.new-light-collection.gallery.image3') as string
                },
                {
                    url: "/new-collection/new-collection-3/new-collection-4.png",
                    alt: t('collections.new-light-collection.gallery.image4') as string
                }
            ],
            specifications: [
                {
                    label: t('collections.new-light-collection.specifications.brand') as string,
                    value: t('collections.new-light-collection.specifications.brandValue') as string
                },
                {
                    label: t('collections.new-light-collection.specifications.craftsmanship') as string,
                    value: t('collections.new-light-collection.specifications.craftsmanshipValue') as string
                },
                {
                    label: t('collections.new-light-collection.specifications.pattern') as string,
                    value: t('collections.new-light-collection.specifications.patternValue') as string
                },
                {
                    label: t('collections.new-light-collection.specifications.applications') as string,
                    value: t('collections.new-light-collection.specifications.applicationsValue') as string
                }
            ]
        },
        {
            id: "4",
            slug: "organic-table-floor-lamps",
            imageUrl: "/new-collection/new-collection-4/new-collection-1.png",
            imageAlt: t('collections.organic-table-floor-lamps.imageAlt') as string,
            title: t('collections.organic-table-floor-lamps.title') as string,
            shortDescription: t('collections.organic-table-floor-lamps.shortDescription') as string,
            fullDescription: t('collections.organic-table-floor-lamps.fullDescription') as string,
            actionLabel: t('collections.organic-table-floor-lamps.actionLabel') as string,
            aspectRatio: "square",
            category: t('categories.Artisan Crafted') as string,
            tags: getRaw('collections.organic-table-floor-lamps.tags'),
            featured: false,
            publishedDate: "2024-12-22",
            relatedIds: ["1", "3"],
            gallery: [
                {
                    url: "/new-collection/new-collection-4/new-collection-1.png",
                    alt: t('collections.organic-table-floor-lamps.gallery.image1') as string
                },
                {
                    url: "/new-collection/new-collection-4/new-collection-2.png",
                    alt: t('collections.organic-table-floor-lamps.gallery.image2') as string
                },
                {
                    url: "/new-collection/new-collection-4/new-collection-3.png",
                    alt: t('collections.organic-table-floor-lamps.gallery.image3') as string
                },
            ],
            specifications: [
                {
                    label: t('collections.organic-table-floor-lamps.specifications.types') as string,
                    value: t('collections.organic-table-floor-lamps.specifications.typesValue') as string
                },
                {
                    label: t('collections.organic-table-floor-lamps.specifications.baseOptions') as string,
                    value: t('collections.organic-table-floor-lamps.specifications.baseOptionsValue') as string
                },
                {
                    label: t('collections.organic-table-floor-lamps.specifications.shadeStyle') as string,
                    value: t('collections.organic-table-floor-lamps.specifications.shadeStyleValue') as string
                }
            ]
        }
    ];
};

export const getCollectionById = (collections: CollectionCard[], id: string): CollectionCard | undefined => {
    return collections.find(card => card.id === id);
};

export const getCollectionBySlug = (collections: CollectionCard[], slug: string): CollectionCard | undefined => {
    return collections.find(card => card.slug === slug);
};

export const getFeaturedCollections = (collections: CollectionCard[]): CollectionCard[] => {
    return collections.filter(card => card.featured);
};

export const getCollectionsByCategory = (collections: CollectionCard[], category: string): CollectionCard[] => {
    return collections.filter(card => card.category === category);
};

export const getRelatedCollections = (collections: CollectionCard[], id: string, limit: number = 3): CollectionCard[] => {
    const collection = getCollectionById(collections, id);
    if (!collection || !collection.relatedIds) return [];

    return collection.relatedIds
        .map(relatedId => getCollectionById(collections, relatedId))
        .filter((card): card is CollectionCard => card !== undefined)
        .slice(0, limit);
};

export const getAllCategories = (t: TranslationFunction | TranslationObject): string[] => {
    return [
        t('categories.Natural Woven') as string,
        t('categories.Rattan Collection') as string,
        t('categories.Organic Lighting') as string,
        t('categories.Artisan Crafted') as string
    ];
};

export const getAllTags = (collections: CollectionCard[]): string[] => {
    return Array.from(new Set(collections.flatMap(card => card.tags)));
};