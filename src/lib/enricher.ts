import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';

const PROMPT = `
  Extract company information from the following job posting text:
  
  Text: {TEXT}
  
  Return a JSON object with:
  - industry (e.g. Fintech, Healthcare, AI)
  - company_size (e.g. 1-50, 51-200, 201-500, 500+)
  - company_stage (e.g. Seed, Series A, Series B, Public)
  - summary (A 2-sentence summary of the job description)
  
  Return ONLY valid JSON.
`;

/**
 * Key-aware version: accepts an explicit Gemini API key (supports BYOK).
 */
export async function enrichJobWithKey(url: string, apiKey: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    $('script, style').remove();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 10000);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent(PROMPT.replace('{TEXT}', bodyText));
    const content = result.response.text();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error(`Error enriching job at ${url}:`, error);
    return null;
  }
}

/** Backward-compatible wrapper (reads from env). */
export async function enrichJob(url: string) {
  return enrichJobWithKey(url, process.env.GEMINI_API_KEY || '');
}

