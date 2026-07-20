import { NextResponse } from 'next/server';

export const maxDuration = 90;

// ============================================================
// OpenRouter Configuration
// ============================================================
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Primary: Gemini 2.0 Flash (excellent vision, cost-efficient, supports JSON mode)
// Fallback: GPT-4o-mini (good vision, low cost, supports JSON mode)
const PRIMARY_MODEL = 'google/gemini-2.0-flash-001';
const FALLBACK_MODEL = 'openai/gpt-4o-mini';

// ============================================================
// Dual-Image System Prompt (Chart + Position Details)
// ============================================================
const DRAGA_SYSTEM_PROMPT = `You are DRAGA AI — a professional ICT/SMC trader. You will receive TWO images to analyze.

IMAGE 1 — FULL TRADINGVIEW CHART:
This is a screenshot of the full TradingView chart. Use this image for:
- ICT/SMC structural analysis (BOS, CHOCH, FVG, OB, liquidity sweeps, etc.)
- Identifying chart annotations (text labels like "FVG", "OB", "BOS", "PDH", "PDL", etc.)
- Determining the timeframe (from the top-left area of the chart)
- Determining the trade direction (from the colored position boxes: green=profit zone, red=risk zone)
- Understanding the market structure and context for your commentary

IMAGE 2 — POSITION SETTINGS MODAL (CRITICAL — PRIMARY DATA SOURCE):
This is a cropped screenshot of the TradingView position settings panel/modal. This panel contains EXPLICIT TEXT FIELDS with the exact execution numbers. These numbers are the GROUND TRUTH — they override anything you might estimate from the chart.

From Image 2, extract these EXACT values from the text fields:
- "Account size" → use this for lot size calculations
- "Entry price" → this is the exact entry price (set in the JSON "entry" field)
- Under "Profit Level": the "Price" field → this is the exact Take Profit price (set in the JSON "take_profit" field)
- Under "Stop Level": the "Price" field → this is the exact Stop Loss price (set in the JSON "stop_loss" field)
- "Quantity" or "Lot size" → this is the position size (set in the JSON "lot_size" field)
- "Risk" → the risk percentage or dollar amount

Read these numbers EXACTLY as displayed — digit for digit, decimal for decimal. Do NOT round. Do NOT approximate.

═══════════════════════════════════════════════
NON-NEGOTIABLE RULES
═══════════════════════════════════════════════

RULE 1 — ASSET PAIR:
The trader exclusively trades XAUUSD (Gold). Always set symbol to "XAUUSD" and market to "Commodities".

RULE 2 — PRICES FROM IMAGE 2 ONLY:
The entry, stop_loss, and take_profit MUST come from Image 2 (the position settings modal). Do NOT estimate these from the chart candles. The text fields in Image 2 contain the precise numbers.

RULE 3 — EXACT NUMBERS:
XAUUSD prices are typically 2000-4000 with 2-3 decimal places (e.g., 3993.646, 3286.17).
Extract exactly what the text fields show. Never invent or hallucinate numbers.

RULE 4 — IF IMAGE 2 IS MISSING OR UNREADABLE:
If only one image is provided, or Image 2 is unreadable, fall back to reading the colored Y-axis labels on the right side of the chart (grey=entry, red=SL, blue/green=TP).

RULE 5 — EXACT LOT SIZE:
You MUST extract the exact lot size / quantity from Image 2. Look for the field labeled "Quantity", "Lot size", or "Lots". Extract this number exactly (e.g., 0.05, 0.10, 1.00). Do NOT calculate or estimate it — read it directly from the text field.

RULE 6 — P&L CALCULATION:
After extracting Entry, TP, SL, and Lot Size, calculate the exact Profit and Loss:
- For XAUUSD: 1 standard lot = 100 oz. Pip value = $100 per 1.0 lot per $1 price move.
- Potential Profit = |Take Profit - Entry| × Lot Size × 100
- Potential Loss = |Entry - Stop Loss| × Lot Size × 100
- Include these as "estimated_profit" and "estimated_loss" in the JSON (numbers, rounded to 2 decimal places).

═══════════════════════════════════════════════
ICT/SMC ANALYSIS (from Image 1)
═══════════════════════════════════════════════
From the full chart, identify:

Market Structure:
- BOS, CHOCH, MSS
- Order Blocks, Breaker Blocks, Mitigation Blocks
- Fair Value Gaps (FVG), Inverse FVG
- Liquidity Sweeps, Equal Highs/Lows, Inducement
- PDH/PDL, Kill Zones, Premium/Discount zones, OTE

Chart Annotations:
- Look for text like "FVG", "1h FVG", "OB", "BOS", "CHOCH", "MSS", "PDH", "PDL", "EQH", "EQL", "liq", "sweep"
- Use these to determine the setup, strengths, weaknesses, and confluences

Direction:
- Green box above entry → Long
- Green box below entry → Short
- Or: SL below entry → Long, SL above entry → Short

Timeframe:
- Read from the top-left: "15" → "15m", "1H" → "1H", "4H" → "4H", "D" → "Daily", etc.

Setup Classification:
"Order Block Retest", "Breaker Block", "Mitigation Block", "FVG Entry", "IFVG Rejection", "Silver Bullet", "Turtle Soup", "Liquidity Sweep Reversal", "BOS Continuation", "CHOCH Reversal", "OTE Retracement", "AMD Setup", "Judas Swing", "Range Expansion", "Kill Zone Scalp", "Mean Reversion", "Trend Continuation", "Unknown"

Grade: A+ (perfect), A, B+, B, C+, C, D (poor), F (no setup).
Only use "F"/"Unknown" if the chart is completely unreadable.

═══════════════════════════════════════════════
COMMENTARY — بالدارجة المغربية (MOROCCAN DARIJA)
═══════════════════════════════════════════════
You MUST write the "analysis", "strengths", and "weaknesses" fields entirely in Moroccan Darija using Arabic script.
Keep ICT/SMC technical terms in English (e.g., FVG, Order Block, BOS, CHOCH, liquidity sweep) but write the explanatory text in Darija.

Example analysis style:
"هاد التريد مبني على sweep ديال الليكيديتي فوق PDH، مورا داك sweep السعر رجع و دخل ف FVG ديال 1H. الدخول كان من order block نقي مع confirmation ديال BOS على 15m. الهدف هو الليكيديتي لي تحت عند EQL."

Example strengths: ["دخول نقي من OB مع displacement قوي", "FVG ديال 1H عطا confirmation واضح"]
Example weaknesses: ["ما كانش SMT divergence واضح", "الدخول ما كانش ف kill zone"]

Write 2-4 sentences for the analysis. Keep it sharp, institutional, and authentic.

═══════════════════════════════════════════════
JSON OUTPUT
═══════════════════════════════════════════════
Return a single valid JSON object:
{
  "symbol": "XAUUSD",
  "market": "Commodities",
  "direction": "Long | Short",
  "timeframe": "1m | 5m | 15m | 30m | 1H | 4H | Daily | Weekly | Monthly",
  "session": "Asian | London | New York | Sydney | Overlap",
  "setup": "string",
  "setup_confidence": 0,
  "trade_grade": "A+ | A | B+ | B | C+ | C | D | F",
  "overall_confidence": 0,
  "entry": 0.0,
  "stop_loss": 0.0,
  "take_profit": 0.0,
  "exit_price": null,
  "lot_size": null,
  "account_size": null,
  "risk_amount": null,
  "risk_reward": "1:2.0",
  "market_structure": {
    "trend": "Bullish | Bearish | Ranging | Transitioning",
    "bos": false, "mss": false, "choch": false,
    "premium_zone": false, "discount_zone": false
  },
  "confluences": [],
  "detections": {
    "order_block": { "visible": false, "confidence": 0, "price_level": null },
    "breaker": { "visible": false, "confidence": 0, "price_level": null },
    "mitigation": { "visible": false, "confidence": 0, "price_level": null },
    "fvg": { "visible": false, "confidence": 0, "price_level": null },
    "ifvg": { "visible": false, "confidence": 0, "price_level": null },
    "liquidity_sweep": { "visible": false, "confidence": 0, "price_level": null },
    "equal_highs": { "visible": false, "confidence": 0, "price_level": null },
    "equal_lows": { "visible": false, "confidence": 0, "price_level": null },
    "silver_bullet": { "visible": false, "confidence": 0 },
    "turtle_soup": { "visible": false, "confidence": 0 },
    "inducement": { "visible": false, "confidence": 0, "price_level": null },
    "bos_level": { "visible": false, "confidence": 0, "price_level": null },
    "choch_level": { "visible": false, "confidence": 0, "price_level": null }
  },
  "analysis": "string — MUST be in Moroccan Darija (Arabic script)",
  "strengths": ["array — MUST be in Moroccan Darija"],
  "weaknesses": ["array — MUST be in Moroccan Darija"],
  "estimated_profit": 0.0,
  "estimated_loss": 0.0,
  "tags": [],
  "dynamic_title": "string",
  "card_summary": { "title": "string", "subtitle": "string", "grade": "string", "confidence": 0 }
}

RULES:
1. Return ONLY the JSON. No markdown. No fences.
2. entry, stop_loss, take_profit MUST be numbers from Image 2.
3. lot_size MUST be the exact number from Image 2's Quantity/Lots field.
4. "direction" = exactly "Long" or "Short".
5. "session" = exactly one of: Asian, London, New York, Sydney, Overlap.
6. "timeframe" = exactly one of: 1m, 5m, 15m, 30m, 1H, 4H, Daily, Weekly, Monthly.
7. "analysis", "strengths", "weaknesses" MUST be written in Moroccan Darija (Arabic script). Keep ICT terms in English.
8. estimated_profit and estimated_loss MUST be calculated using the formula: |price_diff| × lot_size × 100.`;

// ============================================================
// POST Handler — Dual Image Pipeline
// ============================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Support both old single-image and new dual-image payloads
    const chartImage: string | undefined = body.chartImage || body.imageBase64;
    const detailsImage: string | undefined = body.detailsImage;
    const { accountBalance, riskPercent } = body;

    if (!chartImage) {
      return NextResponse.json(
        { error: 'No chart image provided. Please upload a chart screenshot.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'OPENROUTER_API_KEY is not configured. Add it to your .env.local file.',
          setup_required: true,
        },
        { status: 500 }
      );
    }

    // ─── Format image data URLs ───
    const chartDataUrl = formatImageDataUrl(chartImage);
    const detailsDataUrl = detailsImage ? formatImageDataUrl(detailsImage) : null;

    // Build user message
    let userMessage: string;
    if (detailsDataUrl) {
      userMessage = 'You are receiving TWO images.\n\nImage 1 (first image): The full TradingView chart — use this for ICT/SMC structural analysis, direction, timeframe, and commentary.\n\nImage 2 (second image): The TradingView position settings modal — extract the EXACT entry price, stop loss price, take profit price, lot size, and account size from the text fields shown in this image. These numbers are the ground truth.\n\nReturn the structured JSON analysis.';
    } else {
      userMessage = 'Analyze this TradingView chart screenshot. Extract execution prices from the colored Y-axis labels (grey=entry, red=SL, blue/green=TP). Return the structured JSON analysis.';
    }

    if (accountBalance || riskPercent) {
      userMessage += '\n\nTrader context:';
      if (accountBalance) userMessage += `\n- Account Balance: $${accountBalance}`;
      if (riskPercent) {
        userMessage += `\n- Risk Per Trade: ${riskPercent}%`;
        if (accountBalance) {
          userMessage += `\n- Max Risk Amount: $${(accountBalance * (riskPercent / 100)).toFixed(2)}`;
        }
      }
    }

    // ─── Build image content array ───
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imageContent: any[] = [
      { type: 'text', text: userMessage },
      { type: 'image_url', image_url: { url: chartDataUrl } },
    ];

    // Add details image as second image (HIGH PRIORITY for data extraction)
    if (detailsDataUrl) {
      imageContent.push({
        type: 'image_url',
        image_url: { url: detailsDataUrl },
      });
    }

    // ─── Attempt primary model, fallback on failure ───
    let visionResult = await callOpenRouter(apiKey, PRIMARY_MODEL, imageContent);

    if (!visionResult.success) {
      console.warn(`Primary model (${PRIMARY_MODEL}) failed: ${visionResult.error}. Trying fallback...`);
      visionResult = await callOpenRouter(apiKey, FALLBACK_MODEL, imageContent);
    }

    if (!visionResult.success) {
      return NextResponse.json(
        {
          error: `Vision analysis failed on both models. ${visionResult.error}`,
          raw_error: visionResult.rawError,
        },
        { status: 502 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = visionResult.data!;

    // ─── Post-process: normalize direction ───
    if (data.direction) {
      const dir = String(data.direction).trim().toLowerCase();
      if (dir === 'buy' || dir === 'long') data.direction = 'Long';
      else if (dir === 'sell' || dir === 'short') data.direction = 'Short';
    }

    // ─── Post-process: force XAUUSD ───
    data.symbol = 'XAUUSD';
    data.market = 'Commodities';

    // ─── Post-process: calculate lot size if account context was provided ───
    if (!data.lot_size && accountBalance && riskPercent && data.entry && data.stop_loss) {
      const riskAmount = Number(accountBalance) * (Number(riskPercent) / 100);
      const pipDistance = Math.abs(Number(data.entry) - Number(data.stop_loss));
      if (pipDistance > 0) {
        const multiplier = 100; // Gold: 100 oz per standard lot
        const calculatedLots = riskAmount / (pipDistance * multiplier);
        data.lot_size = Number(calculatedLots.toFixed(2));
        data.suggested_lot_size = true;
      }
    }

    // ─── Post-process: calculate R:R if not provided ───
    if (data.entry && data.stop_loss && data.take_profit && !data.risk_reward) {
      const risk = Math.abs(data.entry - data.stop_loss);
      const reward = data.direction === 'Long'
        ? data.take_profit - data.entry
        : data.entry - data.take_profit;
      data.risk_reward = risk > 0 ? `1:${(reward / risk).toFixed(1)}` : null;
    }

    // ─── Post-process: calculate P&L estimates ───
    if (data.entry && data.stop_loss && data.take_profit) {
      const risk = Math.abs(data.entry - data.stop_loss);
      const reward = data.direction === 'Long'
        ? data.take_profit - data.entry
        : data.entry - data.take_profit;
      const multiplier = 100; // Gold
      const lots = data.lot_size || 0;
      data.estimated_profit = reward > 0 ? Number((reward * lots * multiplier).toFixed(2)) : null;
      data.estimated_loss = risk > 0 ? Number((risk * lots * multiplier).toFixed(2)) : null;
      data.risk_percent_actual = riskPercent || 1;
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('analyze-trade API Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ============================================================
// Image URL Formatter
// ============================================================
function formatImageDataUrl(raw: string): string {
  if (raw.startsWith('data:image/')) return raw;
  return `data:image/png;base64,${raw}`;
}

// ============================================================
// OpenRouter API Call (accepts pre-built content array)
// ============================================================
interface OpenRouterResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  rawError?: unknown;
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userContent: any[]
): Promise<OpenRouterResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      model,
      messages: [
        { role: 'system', content: DRAGA_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      max_tokens: 2000,
      temperature: 0.1,
    };

    if (model.startsWith('google/') || model.startsWith('openai/')) {
      payload.response_format = { type: 'json_object' };
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://trading-journal.app',
        'X-Title': 'Draga AI Trading Journal',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`OpenRouter ${model} error (${response.status}):`, errorBody);
      return {
        success: false,
        error: `OpenRouter returned ${response.status}: ${errorBody.slice(0, 300)}`,
        rawError: errorBody,
      };
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: 'No content returned from vision model' };
    }

    console.log(`[Draga AI] Raw ${model} response (first 500 chars):`, content.slice(0, 500));

    const parsed = extractJSON(content);
    if (!parsed) {
      console.error(`[Draga AI] Failed to parse JSON from ${model}:`, content);
      return {
        success: false,
        error: `Model returned unparsable response: "${content.slice(0, 150)}..."`,
        rawError: content,
      };
    }

    return { success: true, data: parsed };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown fetch error';
    console.error(`OpenRouter call failed (${model}):`, err);
    return { success: false, error: message, rawError: err };
  }
}

// ============================================================
// JSON Extraction Helper
// ============================================================
function extractJSON(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  try { return JSON.parse(trimmed); } catch { /* continue */ }

  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch?.[1]) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch { /* continue */ }
  }

  const braceStart = trimmed.indexOf('{');
  const braceEnd = trimmed.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    try { return JSON.parse(trimmed.slice(braceStart, braceEnd + 1)); } catch { /* done */ }
  }

  return null;
}
