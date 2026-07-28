import { ApiError, GoogleGenAI } from "@google/genai";
import {
  ClothingAnalysis,
  clothingAnalysisJsonSchema,
  parseClothingAnalysis,
} from "../domain/clothing-analysis.js";

const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";

const ANALYSIS_PROMPT = `Analyse uniquement le vêtement principal, c'est-à-dire le vêtement le plus centré et le plus visible sur l'image.
Retourne sa catégorie, sa couleur dominante, sa matière la plus probable, sa saison principale et son style principal.
N'invente pas une matière que l'image ne permet pas de distinguer : utilise UNKNOWN dans ce cas.
Utilise également UNKNOWN lorsqu'une autre caractéristique n'est pas raisonnablement identifiable.`;

export type GeminiAnalysisFailure = "MISSING_CONFIGURATION" | "QUOTA_EXCEEDED" | "INVALID_RESPONSE" | "UNAVAILABLE";

export class GeminiAnalysisError extends Error {
  constructor(public readonly reason: GeminiAnalysisFailure) {
    super(reason);
    this.name = "GeminiAnalysisError";
  }
}

export async function analyzeClothingImage(image: Buffer, mimeType: string): Promise<ClothingAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiAnalysisError("MISSING_CONFIGURATION");
  }

  const client = new GoogleGenAI({ apiKey });

  try {
    const response = await client.models.generateContent({
      model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
      contents: [
        { text: ANALYSIS_PROMPT },
        {
          inlineData: {
            data: image.toString("base64"),
            mimeType,
          },
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: clothingAnalysisJsonSchema,
        temperature: 0,
        maxOutputTokens: 300,
      },
    });

    if (!response.text) {
      throw new GeminiAnalysisError("INVALID_RESPONSE");
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(response.text);
    } catch {
      throw new GeminiAnalysisError("INVALID_RESPONSE");
    }

    const analysis = parseClothingAnalysis(decoded);
    if (!analysis) {
      throw new GeminiAnalysisError("INVALID_RESPONSE");
    }

    return analysis;
  } catch (error) {
    if (error instanceof GeminiAnalysisError) {
      throw error;
    }

    if (error instanceof ApiError && error.status === 429) {
      throw new GeminiAnalysisError("QUOTA_EXCEEDED");
    }

    throw new GeminiAnalysisError("UNAVAILABLE");
  }
}
