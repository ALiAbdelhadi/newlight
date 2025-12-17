
import { CollectionCard } from '@/constants/collections';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';

interface CollectionGridProps {
    collections: CollectionCard[];
}

export function CollectionGrid({ collections }: CollectionGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {collections.map((collection) => (
                <Link
                    key={collection.id}
                    href={`/new-collection/${collection.slug}`}
                    className="group"
                >
                    <div className={`relative ${collection.aspectRatio === '4/3' ? 'aspect-[4/3]' : 'aspect-square'
                        } mb-4 overflow-hidden bg-gray-100`}>
                        <Image
                            src={collection.imageUrl}
                            alt={collection.imageAlt}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {collection.featured && (
                            <div className="absolute top-4 right-4 px-3 py-1 bg-yellow-500 text-xs font-medium tracking-wider uppercase">
                                Featured
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 uppercase tracking-wider">
                                {collection.category}
                            </span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-light tracking-tight group-hover:text-gray-600 transition-colors">
                            {collection.title}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                            {collection.shortDescription}
                        </p>
                        <div className="flex items-center gap-2 pt-2">
                            <span className="text-sm font-medium tracking-wider uppercase text-gray-900 group-hover:text-gray-600 transition-colors">
                                {collection.actionLabel}
                            </span>
                            <svg
                                className="w-4 h-4 text-gray-900 group-hover:translate-x-1 transition-transform"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                                />
                            </svg>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
}
