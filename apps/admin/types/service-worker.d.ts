declare const self: ServiceWorkerGlobalScope;

export { };

declare global {
    interface ServiceWorkerGlobalScope {
        skipWaiting(): Promise<void>;
    }
}