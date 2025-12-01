"use client";

import CustomBreadcrumb from "@/components/breadcrumb/custom-breadcrumb";
import { newCollectionProducts } from "@/constants";
import { Container } from "@/components/container";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useParams } from "next/navigation";

const CollectionPage = () => {
  const { collectionId } = useParams() as { collectionId: string };
  const t = useTranslations();

  const collection = newCollectionProducts.find(
    (product) => product.id === collectionId,
  );

  if (!collection) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        {t('collection.notFound')}
      </div>
    );
  }

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

  const collectionName = t(collection.nameKey);

  return (
    <>
      <CustomBreadcrumb />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={variants}
        className="py-8 sm:py-10 md:py-12 lg:py-14 xl:py-16"
      >
        <div className="max-w-2xl flex items-center">
          <Container>
            <Image
              src={collection.image}
              alt={collectionName}
              width={600}
              height={600}
              className="w-full h-auto rounded-lg shadow-lg mb-6"
            />
            <h1 className="text-3xl font-bold mb-4">{collectionName}</h1>
            <p className="text-muted-foreground">
              {t('collection.description', { name: collectionName })}
            </p>
          </Container>
        </div>
      </motion.div>
    </>
  );
};

export default CollectionPage;