"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROVIDERS = void 0;
const env_1 = require("../../config/env");
exports.PROVIDERS = [
    {
        name: "openrouter",
        type: "openai",
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: env_1.env.OPENROUTER_API_KEY,
        model: "meta-llama/llama-3.3-70b-instruct:free",
    },
    {
        name: "gemini",
        type: "gemini",
        model: "gemini-2.0-flash",
        apiKey: env_1.env.GEMINI_API_KEY,
    },
];
//# sourceMappingURL=provider.config.js.map