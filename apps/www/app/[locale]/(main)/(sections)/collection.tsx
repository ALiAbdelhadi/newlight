"use client";
import { Container } from "@/components/container";
import { Link } from "@/i18n/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslations } from 'next-intl';
import Image from "next/image";
import { useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

export function Collection() {
    const t = useTranslations('collection-section');

    const sectionRef = useRef(null);
    const leftImageRef = useRef<HTMLImageElement>(null);
    const rightImageRef = useRef<HTMLImageElement>(null);
    const leftCardRef = useRef<HTMLDivElement>(null);
    const rightCardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (
            !leftImageRef.current ||
            !rightImageRef.current ||
            !leftCardRef.current ||
            !rightCardRef.current
        ) return;

        gsap.set([leftImageRef.current, rightImageRef.current], {
            filter: "grayscale(60%)",
            opacity: 0.5,
        });

        const animateImage = (element: HTMLElement, trigger: HTMLElement) => {
            gsap.to(element, {
                filter: "grayscale(00%)",
                opacity: 1,
                duration: 1,
                ease: "none",
                scrollTrigger: {
                    trigger,
                    start: "top 20%",
                    end: "top 30%",
                    scrub: 1,
                    markers: false,
                    once: true
                },
            });
        };

        animateImage(leftImageRef.current, leftCardRef.current);
        animateImage(rightImageRef.current, rightCardRef.current);

        return () => {
            ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
        };
    }, []);

    return (
        <section
            ref={sectionRef}
            className="min-h-screen py-20 transition-colors"
        >
            <Container>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                    <div ref={leftCardRef}>
                        <div className="relative overflow-hidden rounded-none aspect-square  mb-6 flex justify-center items-center bg-muted">
                            <Image
                                ref={leftImageRef}
                                src="/new-collection/new-collection-1/nl-new-collection-1.jpg"
                                alt="Modern architectural interior"
                                className="h-full w-full object-cover"
                                width={1000}
                                height={1000}
                            />
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-4xl md:text-5xl font-light tracking-tight text-foreground">
                                {t('living-tomorrowTitle')}
                            </h2>
                            <p className="text-muted-foreground text-sm md:text-base font-light tracking-wide">
                                {t('living-tomorrowDescription')}
                            </p>
                            {/* <span className="text-foreground text-sm font-medium tracking-wider uppercase hover:text-muted-foreground transition-colors">
                                {t('living-tomorrowAction')}
                            </span> */}
                        </div>
                    </div>
                    <div ref={rightCardRef}>
                        <div className="relative overflow-hidden rounded-none aspect-4/3  mb-6 flex justify-center items-center bg-muted">
                            <Image
                                ref={rightImageRef}
                                src="/new-collection/new-collection-2/new-collection-1.jpg"
                                alt="Premium product finishes detail"
                                className="h-full w-full object-cover"
                                width={1000}
                                height={1000}
                            />
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-4xl md:text-5xl font-light tracking-tight text-foreground">
                                {t('premium-finishesTitle')}
                            </h2>
                            <p className="text-muted-foreground text-sm md:text-base font-light tracking-wide">
                                {t('premium-finishesDescription')}
                            </p>
                            {/* <span className="text-foreground text-sm font-medium tracking-wider uppercase hover:text-muted-foreground transition-colors">
                                {t('premium-finishesAction')}
                            </span> */}
                        </div>
                    </div>
                </div>
                <div className="text-center py-12">
                    <Link
                        href="/new-collection"
                        className="inline-block px-8 py-4 bg-primary text-primary-foreground font-light tracking-wider uppercase text-sm transition-all duration-300 hover:scale-105 hover:shadow-lg"
                    >
                        {t('buttonText')}
                    </Link>
                </div>
            </Container>
        </section>
    );
};