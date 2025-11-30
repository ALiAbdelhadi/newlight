"use client"

import { Container } from "@/components/container"
import { ProductCard } from "@/components/product-card"

const SAMPLE_PRODUCTS = [
    {
        id: "1",
        image: "/products/image-1.png",
        title: "Pendant Light",
        category: "Residential",
        price: 299,
        badge: "New",
    },
    {
        id: "2",
        image: "/products/image-2.png",
        title: "Wall Sconce",
        category: "Indoor",
        price: 149,
    },
    {
        id: "3",
        image: "/products/image-3.png",
        title: "Floor Lamp",
        category: "Residential",
        price: 399,
        badge: "Featured",
    },
    {
        id: "4",
        image: "/products/image-4.png",
        title: "Table Lamp",
        category: "Indoor",
        price: 199,
    },
    {
        id: "5",
        image: "/products/image-5.png",
        title: "Ceiling Fixture",
        category: "Residential",
        price: 549,
    },
    {
        id: "6",
        image: "/products/image-5.png",
        title: "Outdoor Light",
        category: "Outdoor",
        price: 179,
        badge: "Sale",
    },
]

export function Products() {
    const handleProductClick = (productId: string) => {
        console.log(`Clicked product: ${productId}`)
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Container>
                <section className="pt-12 pb-6">
                    <div>
                        <div className="mb-16">
                            <h2 className="text-5xl md:text-6xl font-light tracking-tight mb-4">Our Collection</h2>
                            <p className="text-lg text-muted-foreground font-light max-w-2xl">
                                Premium residential lighting designed with elegance and functionality in mind. Each piece reflects our
                                commitment to quality and aesthetic excellence.
                            </p>
                        </div>
                    </div>
                </section>
                <section className="pb-20">
                    <div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-12">
                            {SAMPLE_PRODUCTS.map((product) => (
                                <ProductCard key={product.id} {...product} onClick={() => handleProductClick(product.id)} />
                            ))}
                        </div>
                    </div>
                </section>
            </Container>
        </div>
    )
}