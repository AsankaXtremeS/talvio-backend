export type ProviderType = "gemini" | "openai";
export interface ProviderConfig {
    name: string;
    type: ProviderType;
    baseURL?: string;
    apiKey?: string;
    model: string;
}
export declare const PROVIDERS: ProviderConfig[];
//# sourceMappingURL=provider.config.d.ts.map