"use client";

import CustomBreadcrumb from "@/components/breadcrumb/custom-breadcrumb";
import { Container } from "@/components/container";
import { newCollectionProducts } from "@/constants";
import { motion } from "framer-motion";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function CollectionSection() {
  const t = useTranslations();

  const variants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        delay: 0.3,
      },
    },
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={variants}>
      <CustomBreadcrumb />
      <section className="py-8 sm:py-10 md:py-12 lg:py-14 xl:py-16">
        <Container>
          <h2 className="font-bold text-xl md:text-2xl lg:text-3xl tracking-tight mb-5">
            {t('collection.title')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {newCollectionProducts.map((product) => (
              <div className="text-center" key={product.id}>
                <Link href={`/collection/${product.id}`}>
                  <div className="rounded-md shadow-md overflow-hidden">
                    <Image
                      src={product.image}
                      alt={t(product.nameKey)}
                      width={475}
                      height={475}
                      className="w-full h-72 object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg mb-2">{t(product.nameKey)}</h3>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </motion.div>
  );
}