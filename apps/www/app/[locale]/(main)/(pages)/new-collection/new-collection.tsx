"use client"

import { Container } from '@/components/container';
import Image from 'next/image';
interface CollectionCard {
    slug: string;
    title: string;
    shortDescription: string;
    imageUrl: string;
    imageAlt: string;
    category: string;
    tags: string[];
    featured?: boolean;
}

interface NewCollectionClientProps {
    filteredCollections: CollectionCard[];
    allCollectionsCount: number;
    featuredCollection?: CollectionCard;
    translations: {
        heroTitle: string;
        heroDescription: string;
        ctaTitle: string;
        ctaDescription: string;
        ctaButton: string;
    };
}

export default function NewCollectionClient({
    filteredCollections,
    translations: t,
}: NewCollectionClientProps) {
    return (
        <main className="min-h-screen bg-background">
            <section className="py-20 lg:py-32">
                <Container>
                    <div className="text-center max-w-4xl mx-auto animate-fadeIn">
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-light tracking-tight mb-6 text-foreground">
                            {t.heroTitle}
                        </h1>
                        <p className="text-xl md:text-2xl text-muted-foreground font-light tracking-wide">
                            {t.heroDescription}
                        </p>
                    </div>
                </Container>
            </section>
            <section className="py-16">
                <Container>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredCollections.map((collection, index) => (
                            <div
                                key={collection.slug}
                                className="group relative overflow-hidden bg-card"
                                style={{
                                    opacity: 0,
                                    animation: `fadeInUp 0.6s ease-out forwards ${index * 0.1}s`
                                }}
                            >
                                <div className="aspect-4/3 overflow-hidden">
                                    <Image
                                        src={collection.imageUrl}
                                        alt={collection.imageAlt}
                                        width={1000}
                                        height={700}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                </div>
                                <div className="p-6 border-t border-border">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-xs text-muted-foreground font-light tracking-wider uppercase">
                                            {collection.category}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-light tracking-tight mb-2 text-foreground">
                                        {collection.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground font-light leading-relaxed tracking-wide">
                                        {collection.shortDescription}
                                    </p>
                                    {collection.tags && collection.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-4">
                                            {collection.tags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="text-xs px-3 py-1 bg-muted/50 text-muted-foreground font-light tracking-wide"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </Container>
            </section>
            <section className="bg-card text-card-foreground py-20 border-t border-border">
                <Container>
                    <div className="text-center">
                        <h2 className="text-4xl md:text-5xl font-light tracking-tight mb-6">
                            {t.ctaTitle}
                        </h2>
                        <p className="text-xl text-muted-foreground font-light mb-8 max-w-2xl mx-auto tracking-wide">
                            {t.ctaDescription}
                        </p>
                    </div>
                </Container>
            </section>

            <style jsx>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .animate-fadeIn {
                    animation: fadeIn 1s ease-out forwards;
                }
            `}</style>
        </main>
    );
}