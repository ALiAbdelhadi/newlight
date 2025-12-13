"use client";
import { Container } from "@/components/container";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslations } from 'next-intl';
import Image from "next/image";
import { useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

export function NewCollection() {
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
                                src="https://images.unsplash.com/photo-1600210492493-0946911123ea?w=800&q=80"
                                alt="Modern architectural interior"
                                className="h-full w-full object-cover"
                                width={1000}
                                height={1000}
                            />
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-4xl md:text-5xl font-light tracking-tight text-foreground">
                                {t('livingTomorrowTitle')}
                            </h2>
                            <p className="text-muted-foreground text-sm md:text-base font-light tracking-wide">
                                {t('livingTomorrowReport')}
                            </p>
                            <div className="flex items-center gap-2 pt-2">
                                <span className="text-foreground text-sm font-medium tracking-wider uppercase hover:text-muted-foreground transition-colors">
                                    {t('exploreAction')}
                                </span>
                                <svg
                                    className="w-5 h-5 text-foreground rtl:rotate-180"
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
                    </div>
                    <div ref={rightCardRef}>
                        <div className="relative overflow-hidden rounded-none aspect-4/3  mb-6 flex justify-center items-center bg-muted">
                            <Image
                                ref={rightImageRef}
                                src="https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80"
                                alt="Premium product finishes detail"
                                className="h-full w-full object-cover"
                                width={1000}
                                height={1000}
                            />
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-4xl md:text-5xl font-light tracking-tight text-foreground">
                                {t('finishesTitle')}
                            </h2>
                            <p className="text-muted-foreground text-sm md:text-base font-light tracking-wide">
                                {t('finishesExplore')}
                            </p>
                            <div className="flex items-center gap-2 pt-2">
                                <span className="text-foreground text-sm font-medium tracking-wider uppercase hover:text-muted-foreground transition-colors">
                                    {t('discoverAction')}
                                </span>
                                <svg
                                    className="w-5 h-5 text-foreground rtl:rotate-180"
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
                    </div>
                </div>
            </Container>
        </section>
    );
};