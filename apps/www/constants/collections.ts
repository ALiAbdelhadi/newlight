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

// Type for both useTranslations (client) and getTranslations (server)
type TranslationFunction = (key: string, params?: any) => string;
type TranslationObject = {
    (key: string, params?: any): string;
    raw: (key: string) => any;
};

// Function to get collection data with translations
export const getCollectionCards = (t: TranslationFunction | TranslationObject): CollectionCard[] => {
    // Helper to safely get raw values
    const getRaw = (key: string) => {
        if (typeof t === 'function' && 'raw' in t) {
            return (t as TranslationObject).raw(key);
        }
        // Fallback for server-side getTranslations
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
            slug: "living-tomorrow",
            imageUrl: "/new-collection/new-collection-1/nl-new-collection-1.jpg",
            imageAlt: t('collections.living-tomorrow.imageAlt') as string,
            title: t('collections.living-tomorrow.title') as string,
            shortDescription: t('collections.living-tomorrow.shortDescription') as string,
            fullDescription: t('collections.living-tomorrow.fullDescription') as string,
            actionLabel: t('collections.living-tomorrow.actionLabel') as string,
            aspectRatio: "square",
            category: t('categories.Architecture') as string,
            tags: getRaw('collections.living-tomorrow.tags'),
            featured: true,
            publishedDate: "2024-11-15",
            relatedIds: ["3", "4"],
            gallery: [
                {
                    url: "/new-collection/new-collection-1/nl-new-collection-2.jpg",
                    alt: t('collections.living-tomorrow.gallery.image1') as string
                },
                {
                    url: "/new-collection/new-collection-1/nl-new-collection-3.jpg",
                    alt: t('collections.living-tomorrow.gallery.image2') as string
                },
                {
                    url: "/new-collection/new-collection-1/nl-new-collection-4.jpg",
                    alt: t('collections.living-tomorrow.gallery.image3') as string
                }
            ],
            specifications: [
                {
                    label: t('collections.living-tomorrow.specifications.totalArea') as string,
                    value: t('collections.living-tomorrow.specifications.totalAreaValue') as string
                },
                {
                    label: t('collections.living-tomorrow.specifications.energyRating') as string,
                    value: t('collections.living-tomorrow.specifications.energyRatingValue') as string
                },
                {
                    label: t('collections.living-tomorrow.specifications.smartSystems') as string,
                    value: t('collections.living-tomorrow.specifications.smartSystemsValue') as string
                },
                {
                    label: t('collections.living-tomorrow.specifications.sustainabilityScore') as string,
                    value: t('collections.living-tomorrow.specifications.sustainabilityScoreValue') as string
                }
            ]
        },
        {
            id: "2",
            slug: "premium-finishes",
            imageUrl: "/new-collection/new-collection-2/new-collection-1.jpg",
            imageAlt: t('collections.premium-finishes.imageAlt') as string,
            title: t('collections.premium-finishes.title') as string,
            shortDescription: t('collections.premium-finishes.shortDescription') as string,
            fullDescription: t('collections.premium-finishes.fullDescription') as string,
            actionLabel: t('collections.premium-finishes.actionLabel') as string,
            aspectRatio: "4/3",
            category: t('categories.Materials') as string,
            tags: getRaw('collections.premium-finishes.tags'),
            featured: true,
            publishedDate: "2024-10-28",
            relatedIds: ["1", "5"],
            gallery: [
                {
                    url: "/new-collection/new-collection-2/new-collection-2.jpg",
                    alt: t('collections.premium-finishes.gallery.image1') as string
                },
                {
                    url: "/new-collection/new-collection-2/new-collection-3.jpg",
                    alt: t('collections.premium-finishes.gallery.image2') as string
                },
                {
                    url: "/new-collection/new-collection-2/new-collection-4.jpg",
                    alt: t('collections.premium-finishes.gallery.image3') as string
                }
            ],
            specifications: [
                {
                    label: t('collections.premium-finishes.specifications.materialSources') as string,
                    value: t('collections.premium-finishes.specifications.materialSourcesValue') as string
                },
                {
                    label: t('collections.premium-finishes.specifications.qualityGrade') as string,
                    value: t('collections.premium-finishes.specifications.qualityGradeValue') as string
                },
                {
                    label: t('collections.premium-finishes.specifications.warranty') as string,
                    value: t('collections.premium-finishes.specifications.warrantyValue') as string
                },
                {
                    label: t('collections.premium-finishes.specifications.customization') as string,
                    value: t('collections.premium-finishes.specifications.customizationValue') as string
                }
            ]
        },
        {
            id: "3",
            slug: "sustainable-design",
            imageUrl: "/new-collection/new-collection-3/new-collection-1.jpg",
            imageAlt: t('collections.sustainable-design.imageAlt') as string,
            title: t('collections.sustainable-design.title') as string,
            shortDescription: t('collections.sustainable-design.shortDescription') as string,
            fullDescription: t('collections.sustainable-design.fullDescription') as string,
            actionLabel: t('collections.sustainable-design.actionLabel') as string,
            aspectRatio: "square",
            category: t('categories.Sustainability') as string,
            tags: getRaw('collections.sustainable-design.tags'),
            featured: false,
            publishedDate: "2024-09-12",
            relatedIds: ["1", "4"],
            specifications: [
                {
                    label: t('collections.sustainable-design.specifications.carbonFootprint') as string,
                    value: t('collections.sustainable-design.specifications.carbonFootprintValue') as string
                },
                {
                    label: t('collections.sustainable-design.specifications.renewableEnergy') as string,
                    value: t('collections.sustainable-design.specifications.renewableEnergyValue') as string
                },
                {
                    label: t('collections.sustainable-design.specifications.waterConservation') as string,
                    value: t('collections.sustainable-design.specifications.waterConservationValue') as string
                },
                {
                    label: t('collections.sustainable-design.specifications.recycledMaterials') as string,
                    value: t('collections.sustainable-design.specifications.recycledMaterialsValue') as string
                }
            ]
        },
        {
            id: "4",
            slug: "smart-spaces",
            imageUrl: "/new-collection/new-collection-4/new-collection-1.jpg",
            imageAlt: t('collections.smart-spaces.imageAlt') as string,
            title: t('collections.smart-spaces.title') as string,
            shortDescription: t('collections.smart-spaces.shortDescription') as string,
            fullDescription: t('collections.smart-spaces.fullDescription') as string,
            actionLabel: t('collections.smart-spaces.actionLabel') as string,
            aspectRatio: "4/3",
            category: t('categories.Technology') as string,
            tags: getRaw('collections.smart-spaces.tags'),
            featured: false,
            publishedDate: "2024-08-20",
            relatedIds: ["1", "3"],
            specifications: [
                {
                    label: t('collections.smart-spaces.specifications.aiIntegration') as string,
                    value: t('collections.smart-spaces.specifications.aiIntegrationValue') as string
                },
                {
                    label: t('collections.smart-spaces.specifications.iotDevices') as string,
                    value: t('collections.smart-spaces.specifications.iotDevicesValue') as string
                },
                {
                    label: t('collections.smart-spaces.specifications.responseTime') as string,
                    value: t('collections.smart-spaces.specifications.responseTimeValue') as string
                },
                {
                    label: t('collections.smart-spaces.specifications.securityLevel') as string,
                    value: t('collections.smart-spaces.specifications.securityLevelValue') as string
                }
            ]
        },
        {
            id: "5",
            slug: "minimalist-elegance",
            imageUrl: "/new-collection/new-collection-3/new-collection-2.jpg",
            imageAlt: t('collections.minimalist-elegance.imageAlt') as string,
            title: t('collections.minimalist-elegance.title') as string,
            shortDescription: t('collections.minimalist-elegance.shortDescription') as string,
            fullDescription: t('collections.minimalist-elegance.fullDescription') as string,
            actionLabel: t('collections.minimalist-elegance.actionLabel') as string,
            aspectRatio: "square",
            category: t('categories.Design Philosophy') as string,
            tags: getRaw('collections.minimalist-elegance.tags'),
            featured: true,
            publishedDate: "2024-11-01",
            relatedIds: ["2", "6"],
            specifications: [
                {
                    label: t('collections.minimalist-elegance.specifications.designPrinciple') as string,
                    value: t('collections.minimalist-elegance.specifications.designPrincipleValue') as string
                },
                {
                    label: t('collections.minimalist-elegance.specifications.colorPalette') as string,
                    value: t('collections.minimalist-elegance.specifications.colorPaletteValue') as string
                },
                {
                    label: t('collections.minimalist-elegance.specifications.materialCount') as string,
                    value: t('collections.minimalist-elegance.specifications.materialCountValue') as string
                },
                {
                    label: t('collections.minimalist-elegance.specifications.visualNoise') as string,
                    value: t('collections.minimalist-elegance.specifications.visualNoiseValue') as string
                }
            ]
        },
        {
            id: "6",
            slug: "urban-revival",
            imageUrl: "/new-collection/new-collection-3/new-collection-3.jpg",
            imageAlt: t('collections.urban-revival.imageAlt') as string,
            title: t('collections.urban-revival.title') as string,
            shortDescription: t('collections.urban-revival.shortDescription') as string,
            fullDescription: t('collections.urban-revival.fullDescription') as string,
            actionLabel: t('collections.urban-revival.actionLabel') as string,
            aspectRatio: "4/3",
            category: t('categories.Urban Planning') as string,
            tags: getRaw('collections.urban-revival.tags'),
            featured: false,
            publishedDate: "2024-07-15",
            relatedIds: ["3", "5"],
            specifications: [
                {
                    label: t('collections.urban-revival.specifications.historicPreservation') as string,
                    value: t('collections.urban-revival.specifications.historicPreservationValue') as string
                },
                {
                    label: t('collections.urban-revival.specifications.communityImpact') as string,
                    value: t('collections.urban-revival.specifications.communityImpactValue') as string
                },
                {
                    label: t('collections.urban-revival.specifications.investmentReturn') as string,
                    value: t('collections.urban-revival.specifications.investmentReturnValue') as string
                },
                {
                    label: t('collections.urban-revival.specifications.heritageCertification') as string,
                    value: t('collections.urban-revival.specifications.heritageCertificationValue') as string
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
        t('categories.Architecture') as string,
        t('categories.Materials') as string,
        t('categories.Sustainability') as string,
        t('categories.Technology') as string,
        t('categories.Design Philosophy') as string,
        t('categories.Urban Planning') as string
    ];
};

export const getAllTags = (collections: CollectionCard[]): string[] => {
    return Array.from(new Set(collections.flatMap(card => card.tags)));
};