import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';
import { z } from 'zod';

const geminiApiKey = process.env.GEMINI_API_KEY;
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

const enrichmentSchema = z.object({
  industry: z.string().optional(),
  company_size: z.string().optional(),
  company_stage: z.string().optional(),
  summary: z.string().optional(),
});

export async function enrichJob(url: string) {
  try {
    if (!genAI) {
      return null;
    }

    const response = await fetch(url, {
      signal: AbortSignal.timeout(12_000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Remove scripts and styles to clean up text for LLM
    $('script, style').remove();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 10000); // Send first 10k chars

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `
      Extract company information from the following job posting text:
      
      Text: ${bodyText}
      
      Return a JSON object with:
      - industry (e.g. Fintech, Healthcare, AI)
      - company_size (e.g. 1-50, 51-200, 201-500, 500+)
      - company_stage (e.g. Seed, Series A, Series B, Public)
      - summary (A 2-sentence summary of the job description)
      
      Return ONLY valid JSON.
    `;

    const result = await model.generateContent(prompt);
    const content = result.response.text();
    
    // Simple json extractor
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    const parsed = JSON.parse(jsonMatch[0]);
    const validated = enrichmentSchema.safeParse(parsed);
    return validated.success ? validated.data : null;
  } catch (error) {
    console.error(`Error enriching job at ${url}:`, error);
    return null;
  }
}
