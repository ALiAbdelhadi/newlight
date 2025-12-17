// components/collection-gallery.tsx
'use client';

import Image from 'next/image';
import { useState } from 'react';

interface GalleryImage {
    url: string;
    alt: string;
}

interface CollectionGalleryProps {
    images: GalleryImage[];
}

export function CollectionGallery({ images }: CollectionGalleryProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    return (
        <div className="space-y-4">
            <div className="relative aspect-video bg-gray-100 overflow-hidden">
                <Image
                    src={images[selectedIndex].url}
                    alt={images[selectedIndex].alt}
                    fill
                    className="object-cover"
                />
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {images.map((image, index) => (
                    <button
                        key={index}
                        onClick={() => setSelectedIndex(index)}
                        className={`relative aspect-square overflow-hidden transition-opacity ${index === selectedIndex ? 'ring-2 ring-black' : 'opacity-60 hover:opacity-100'
                            }`}
                    >
                        <Image
                            src={image.url}
                            alt={image.alt}
                            fill
                            className="object-cover"
                        />
                    </button>
                ))}
            </div>
        </div>
    );
}
