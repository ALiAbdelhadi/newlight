export declare const PACKAGE_ROOT: string
export declare const PRODUCTION_ENDPOINT: string
export declare const BRANCH_ENDPOINT: string

export declare function loadEnv(): void
export declare function describe(url: string | undefined): string
export declare function assertWritable(names: string[]): void
export declare function assertTransformTargets(options: { sourceName: string; destinationName: string }): void
export declare function requireFile(relativePath: string): string
