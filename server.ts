import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { parseLocalCommand } from './src/services/ruleParser';
import type { BusinessId } from './src/types/database';
import { timingSafeEqual } from 'node:crypto';
import { generatePosterBackground, validatePosterRequest } from './src/server/posterProvider';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/api/poster', express.json({ limit: '13mb' }));
app.use(express.json());

// This endpoint is fail-closed until an owner-authenticating reverse proxy is configured.
let posterRequestInFlight = false;
let lastPosterRequest = 0;
app.post('/api/poster/generate', async (req, res) => {
  const secret = process.env.POSTER_TRUSTED_PROXY_SECRET;
  const key = process.env.POSTER_IMAGE_API_KEY;
  if (!secret || !key) return res.status(503).json({ error: 'Poster generation is not configured. No image was generated.' });
  const supplied = req.get('X-GopalAI-Verified-Owner') || '';
  const expected = Buffer.from(secret), actual = Buffer.from(supplied);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return res.status(403).json({ error: 'Owner authentication is required.' });
  let request;
  try { request = validatePosterRequest(req.body); }
  catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid design request.' }); }
  if (posterRequestInFlight || Date.now() - lastPosterRequest < 10000) return res.status(429).json({ error: 'Please wait before generating another design.' });
  posterRequestInFlight = true; lastPosterRequest = Date.now();
  try {
    const image = await generatePosterBackground(request, key);
    return res.json({ image });
  } catch {
    return res.status(502).json({ error: 'Image generation failed. Please try again later.' });
  } finally { posterRequestInFlight = false; }
});

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// API endpoint for Intelligent AI Agent action processing
app.post('/api/ai-agent', async (req, res) => {
  try {
    const { prompt, context } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt string is required' });
    }

    const systemInstruction = `
You are the intelligent AI Voice & Text Agent for "GopalAI Assistant", a complete Android Personal AI Agent & Business Management System for owner Gopal.
The app manages 4 businesses:
1. "Jain Sweets" (id: 'jain-sweets')
2. "Paan Bai Canteen" (id: 'paan-bai')
3. "Kesarwadi Canteen" (id: 'kesarwadi')
4. "Gopal Caterers" (id: 'gopal-caterers')
And Personal Finance (id: 'personal')

The user speaks in Hindi, English, or Hinglish (e.g., "Jain Sweets mein kitne staff hain?", "Paan Bai mein kitne bande kam hain?", "Kis employee ki salary baaki hai?", "Kal ke catering order ke liye kitne waiters available hain?", "Is event ke liye staff assign karo").

STRICT RULE: PROFIT AND LOSS MUST NOT EXIST. Do NOT calculate or mention Profit or Loss anywhere. Only report sales, expenses, purchases, balances, receivables, payables, staff counts, and catering order details.

Your task is to analyze the command and classify it into an action object.

Available Actions:
- "ADD_SALE": Record a sale. Parameters: amount (number), business ('jain-sweets'|'paan-bai'|'kesarwadi'|'gopal-caterers'), date (YYYY-MM-DD), payment_method, items.
- "ADD_EXPENSE": Record an expense.
- "ADD_PURCHASE": Record a stock purchase.
- "ADD_INVENTORY": Add or update inventory stock.
- "PAY_SUPPLIER": Pay supplier.
- "ADD_REMINDER": Set a reminder.
- "CALL_CONTACT": Call phone number or contact.
- "QUERY_STAFF_COUNT": Query staff count for a business workspace. Parameters: business_id ('jain-sweets'|'paan-bai'|'kesarwadi'|'gopal-caterers').
- "QUERY_STAFF_SHORTAGE": Query staff shortage for a business workspace. Parameters: business_id.
- "QUERY_PENDING_SALARY": Query pending employee salary or unpaid advances.
- "QUERY_CATERING_AVAILABILITY": Query staff or waiter availability for catering order dates.
- "ASSIGN_CATERING_STAFF": Assign staff to catering event.
- "ADD_CATERING_ORDER": Add new catering booking order.
- "OPEN_APP": Open app intent.
- "SEARCH_WEB": Web search query.
- "OPEN_MAPS": Open map location.
- "GET_SUMMARY": Query database summary.
- "ADD_PERSONAL_TRANSACTION": Personal income or expense.
- "UNKNOWN_QUERY": General conversational response or query.

Output MUST follow JSON schema.
Requires owner confirmation = true for any monetary changes or phone call/app launch actions.
Never invent missing details. Exclude coding or programming assistance. Respond in the language used by the user.
`;

    let parsedResult;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `User Command: "${prompt}". Context: ${JSON.stringify(context || {})}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              action: { type: Type.STRING, description: 'Action type identifier' },
              business_id: { type: Type.STRING, description: 'Matched business ID or empty' },
              business_name: { type: Type.STRING, description: 'Matched business label' },
              requires_owner_confirmation: { type: Type.BOOLEAN, description: 'Whether owner confirmation dialog is required' },
              speech_response: { type: Type.STRING, description: 'Friendly Hindi/English voice response to read back' },
              parameters: {
                type: Type.OBJECT,
                properties: {
                  amount: { type: Type.NUMBER },
                  date: { type: Type.STRING, description: 'Explicit transaction date, YYYY-MM-DD' },
                  item_name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  category: { type: Type.STRING },
                  payment_method: { type: Type.STRING },
                  supplier_name: { type: Type.STRING },
                  contact_name: { type: Type.STRING },
                  phone_number: { type: Type.STRING },
                  app_name: { type: Type.STRING },
                  query: { type: Type.STRING },
                  location: { type: Type.STRING },
                  reminder_title: { type: Type.STRING },
                  reminder_time: { type: Type.STRING },
                  target: { type: Type.STRING },
                  period: { type: Type.STRING },
                  transaction_type: { type: Type.STRING },
                  notes: { type: Type.STRING }
                }
              }
            },
            required: ['action', 'requires_owner_confirmation', 'speech_response']
          }
        }
      });

      const rawText = response.text || '';
      const cleanedText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
      parsedResult = JSON.parse(cleanedText || '{}');
    } catch (aiErr: any) {
      console.warn('Gemini API call warning, using server rule parser:', aiErr?.message || aiErr);
      const candidate = context?.currentBusinessId;
      const business: BusinessId = ['jain-sweets', 'paan-bai', 'kesarwadi', 'gopal-caterers', 'personal'].includes(candidate) ? candidate : 'jain-sweets';
      parsedResult = parseLocalCommand(prompt, business);
    }

    return res.json({ success: true, result: parsedResult });

  } catch (err: any) {
    console.error('AI Agent Endpoint Error:', err);
    return res.status(200).json({
      success: true,
      result: {
        action: 'UNKNOWN_QUERY',
        requires_owner_confirmation: false,
        speech_response: 'Command received. Kripya details confirm karein.',
        parameters: {}
      }
    });
  }
});

// Setup Vite Dev server middleware or static serve in production
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`GopalAI Assistant Server listening on port ${PORT}`);
});
