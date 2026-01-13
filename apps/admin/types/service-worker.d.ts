declare const self: ServiceWorkerGlobalScope;

export { };

// Extend the ServiceWorkerGlobalScope if needed
declare global {
    interface ServiceWorkerGlobalScope {
        skipWaiting(): Promise<void>;
    }
}