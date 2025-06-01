import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable not set.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateCanonicalPrompts(prompts: string[]): Promise<string[]> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const systemPrompt = `
      You are a creative director for an AI art generation platform.
      Your task is to analyze a list of raw user prompts and identify the top 5 distinct creative themes.
      For each theme, create one single, clear, and inspiring "canonical prompt".
      The user prompts are messy, but contain underlying popular ideas. You must group similar prompts together.
      For example, if you see "a dog on a skateboard," "dog skateboarding," and "a happy dog riding a skateboard," you should identify the theme as "A dog on a skateboard in a vibrant city park, detailed illustration."

      RULES:
      - Return ONLY a JSON array of 5 strings.
      - The strings should be the final, beautiful, canonical prompts.
      - Do not include any explanation or other text.
      - Example Output: ["Prompt 1", "Prompt 2", "Prompt 3", "Prompt 4", "Prompt 5"]
    `;

    const result = await model.generateContent([
      systemPrompt,
      `Here are the user prompts from the last few days: ${JSON.stringify(prompts)}`,
    ]);

    const responseText = result.response.text();

    try {
      const cleanedResponse = responseText.replace(/```json|```/g, '').trim();
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Failed to parse Gemini response:', error);
      return [];
    }
  }
}
