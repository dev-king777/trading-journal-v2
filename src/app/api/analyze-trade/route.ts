import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 90;

// ============================================================
// Dual-Image System Prompt (Chart + Position Details)
// With isValidChart guardrail & dynamic Darija commentary
// ============================================================
const DRAGA_SYSTEM_PROMPT = `You are DRAGA AI — a professional ICT/SMC trader and chart analyst. You will receive TWO images to analyze.

═══════════════════════════════════════════════
CRITICAL GUARDRAIL — IMAGE VALIDATION (MUST DO FIRST)
═══════════════════════════════════════════════

BEFORE doing any analysis, you MUST validate Image 1.
Image 1 MUST be a legitimate financial chart (candlestick chart, line chart, bar chart from TradingView, MetaTrader, or any trading platform).

If Image 1 is ANY of the following, you MUST immediately return {"isValidChart": false} and STOP:
- A meme, joke image, or cartoon
- A YouTube video screenshot or video player
- A selfie, photo of a person, or social media screenshot
- A desktop screenshot unrelated to trading
- A blank image, text document, or code editor
- ANY image that is NOT a financial price chart

When Image 1 is NOT a valid chart, return ONLY this exact JSON:
{
  "isValidChart": false,
  "symbol": null,
  "market": null,
  "direction": null,
  "timeframe": null,
  "session": null,
  "setup": null,
  "setup_confidence": 0,
  "trade_grade": null,
  "overall_confidence": 0,
  "entry": null,
  "stop_loss": null,
  "take_profit": null,
  "exit_price": null,
  "lot_size": null,
  "account_size": null,
  "risk_amount": null,
  "risk_reward": null,
  "estimated_profit": null,
  "estimated_loss": null,
  "analysis": null,
  "strengths": [],
  "weaknesses": [],
  "confluences": [],
  "tags": [],
  "dynamic_title": null,
  "card_summary": null
}

If Image 1 IS a valid financial chart, set "isValidChart": true and proceed with the full analysis below.

═══════════════════════════════════════════════
IMAGE 1 — FULL TRADINGVIEW CHART
═══════════════════════════════════════════════

This is a screenshot of the full TradingView chart. Use this image for:
- ICT/SMC structural analysis (BOS, CHOCH, FVG, OB, liquidity sweeps, etc.)
- Identifying chart annotations (text labels like "FVG", "OB", "BOS", "PDH", "PDL", etc.)
- Determining the timeframe (from the top-left area of the chart)
- Determining the trade direction (from the colored position boxes: green=profit zone, red=risk zone)
- Understanding the market structure and context for your commentary

═══════════════════════════════════════════════
IMAGE 2 — POSITION SETTINGS MODAL (CRITICAL — PRIMARY DATA SOURCE)
═══════════════════════════════════════════════

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
- If LONG:  Profit = (Take Profit - Entry) × Lot Size × 100
- If LONG:  Loss   = (Entry - Stop Loss) × Lot Size × 100
- If SHORT: Profit = (Entry - Take Profit) × Lot Size × 100
- If SHORT: Loss   = (Stop Loss - Entry) × Lot Size × 100
- Include these as "estimated_profit" and "estimated_loss" in the JSON (numbers, rounded to 2 decimal places).

RULE 7 — DIRECTIONAL LOSS & WIN DETECTION (CRITICAL — STRICT ENFORCEMENT):
You MUST inspect the actual price candles on Image 1 relative to the position box to determine the trade outcome.
DO NOT assume every trade hit Take Profit.

1. LONG (Buy) TRADES:
- If price dropped and hit, touched, or crossed BELOW the Stop Loss level → the trade is a LOSS.
  * You MUST set "outcome": "LOSS".
  * You MUST set "exit_price" equal to the exact "stop_loss" value from Image 2. NEVER set it to take_profit!
  * You MUST calculate "estimated_profit" as a NEGATIVE number: -(|entry - stop_loss| × lot_size × 100) (e.g. -150.00).
- If price reached or exceeded the Take Profit line without hitting SL first → WIN.
  * Set "outcome": "WIN", "exit_price": take_profit value, "estimated_profit": positive number.

2. SHORT (Sell) TRADES:
- If price rallied and hit, touched, or crossed ABOVE the Stop Loss level → the trade is a LOSS.
  * You MUST set "outcome": "LOSS".
  * You MUST set "exit_price" equal to the exact "stop_loss" value from Image 2. NEVER set it to take_profit!
  * You MUST calculate "estimated_profit" as a NEGATIVE number: -(|stop_loss - entry| × lot_size × 100) (e.g. -150.00).
- If price fell to or below the Take Profit line without hitting SL first → WIN.
  * Set "outcome": "WIN", "exit_price": take_profit value, "estimated_profit": positive number.

3. OPEN TRADES:
If price hasn't hit either level yet, set "outcome": "OPEN" and "exit_price": null.

4. MATH & SIGN ENFORCEMENT:
Whenever "outcome" is "LOSS", "estimated_profit" MUST be strictly NEGATIVE (e.g. -$150.00, NOT +$150.00). "exit_price" MUST be equal to "stop_loss".

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

ABSOLUTELY FORBIDDEN: Generic, template-style, or boilerplate commentary.
You MUST NOT write things like "هاد التريد مزيان" or "دخول جيد" without specific evidence from the chart.

MANDATORY: You must actively READ the specific market structure visible and drawn on the chart.
Look at the actual annotations, the actual price action, the actual candle formations, the actual drawn zones.
Your analysis must reference SPECIFIC elements you can see: specific FVG levels, specific OB zones, specific BOS breaks, specific liquidity sweeps, specific PDH/PDL levels.

The entire "analysis", "strengths", and "weaknesses" fields MUST be written in authentic Moroccan Darija (Arabic script), using professional ICT trading terms in English where appropriate.

Example of GOOD, dynamic analysis:
"هاد التريد مبني على sweep ديال الليكيديتي فوق PDH عند 3345.50، مورا داك sweep السعر رجع و دخل ف FVG ديال 1H لي كان بين 3340-3337. الدخول كان من order block نقي مع confirmation ديال BOS على 15m. الهدف هو الليكيديتي لي تحت عند EQL فاش كاين equal lows عند 3320."

Example of BAD analysis (FORBIDDEN):
"هاد التريد مزيان، الدخول كان نقي و الهدف واضح." ← TOO GENERIC, NO EVIDENCE

Write 2-4 sentences for the analysis. Every sentence MUST reference a specific structure or level visible on the chart.

Example strengths: ["دخول نقي من OB مع displacement قوي بعد sweep ديال PDH", "FVG ديال 1H عطا confirmation واضح مع reaction قوية"]
Example weaknesses: ["ما كانش SMT divergence واضح قبل الدخول", "الدخول ما كانش ف kill zone — بعيد على NY open"]

═══════════════════════════════════════════════
JSON OUTPUT
═══════════════════════════════════════════════
Return a single valid JSON object matching this structure:
{
  "isValidChart": true,
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
  "analysis": "string — MUST be in Moroccan Darija (Arabic script) — MUST reference specific chart evidence",
  "strengths": ["array — MUST be in Moroccan Darija — each item references specific chart evidence"],
  "weaknesses": ["array — MUST be in Moroccan Darija — each item references specific chart evidence"],
  "estimated_profit": 0.0,
  "estimated_loss": 0.0,
  "outcome": "WIN | LOSS | OPEN",
  "tags": [],
  "dynamic_title": "string",
  "card_summary": { "title": "string", "subtitle": "string", "grade": "string", "confidence": 0 }
}

RULES:
1. Return ONLY the JSON.
2. "isValidChart" MUST be the first field. Set to true only if Image 1 is a real financial chart.
3. entry, stop_loss, take_profit MUST be numbers from Image 2.
4. lot_size MUST be the exact number from Image 2's Quantity/Lots field.
5. "direction" = exactly "Long" or "Short".
6. "session" = exactly one of: Asian, London, New York, Sydney, Overlap.
7. "timeframe" = exactly one of: 1m, 5m, 15m, 30m, 1H, 4H, Daily, Weekly, Monthly.
8. "analysis", "strengths", "weaknesses" MUST be written in Moroccan Darija (Arabic script). Keep ICT terms in English.
9. estimated_profit and estimated_loss MUST be calculated using the formula: |price_diff| × lot_size × 100.
10. NEVER write generic/template commentary. Every sentence must reference specific visible chart evidence.
11. "outcome" MUST be exactly "WIN", "LOSS", or "OPEN". If LOSS, exit_price = stop_loss and estimated_profit MUST be negative.`;

// ============================================================
// POST Handler — Google Gemini Pro Vision Pipeline
// ============================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const chartImage: string | undefined = body.chartImage || body.imageBase64;
    const detailsImage: string | undefined = body.detailsImage;
    const { accountBalance, riskPercent } = body;

    if (!chartImage) {
      return NextResponse.json(
        { error: 'No chart image provided. Please upload a chart screenshot.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'GEMINI_API_KEY is not configured. Add it to your .env.local file.',
          setup_required: true,
        },
        { status: 500 }
      );
    }

    // Initialize Google Generative AI with gemini-3.5-flash (free-tier vision)
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      systemInstruction: DRAGA_SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    // Build user prompt instructions
    let userMessage: string;
    if (detailsImage) {
      userMessage = 'You are receiving TWO images.\n\nImage 1 (first image): The full TradingView chart — FIRST validate that this is a real financial chart. If it is NOT a chart, return {"isValidChart": false} immediately. If it IS a chart, use it for ICT/SMC structural analysis, direction, timeframe, and commentary.\n\nImage 2 (second image): The TradingView position settings modal — extract the EXACT entry price, stop loss price, take profit price, lot size, and account size from the text fields shown in this image. These numbers are the ground truth.\n\nReturn the structured JSON analysis.';
    } else {
      userMessage = 'Analyze this TradingView chart screenshot. FIRST validate that this is a real financial chart. If it is NOT a chart, return {"isValidChart": false} immediately. If it IS a chart, extract execution prices from the colored Y-axis labels (grey=entry, red=SL, blue/green=TP). Return the structured JSON analysis.';
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

    // Format content array for Gemini inlineData
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contents: any[] = [userMessage];

    // Image 1: Chart
    contents.push(parseBase64Image(chartImage));

    // Image 2: Position Details (if available)
    if (detailsImage) {
      contents.push(parseBase64Image(detailsImage));
    }

    // Call Gemini Pro
    const result = await model.generateContent(contents);
    const responseText = result.response.text();

    if (!responseText) {
      return NextResponse.json({ error: 'No content returned from Gemini Pro vision model' }, { status: 500 });
    }

    const data = extractJSON(responseText);
    if (!data) {
      console.error('[Draga AI Gemini] Failed to parse JSON:', responseText);
      return NextResponse.json(
        { error: 'Gemini Pro returned an invalid JSON response structure.' },
        { status: 502 }
      );
    }

    // ─── GUARDRAIL: Check isValidChart ───
    if (data.isValidChart === false) {
      return NextResponse.json(
        {
          isValidChart: false,
          error: 'The uploaded image does not appear to be a financial trading chart. Please upload a valid TradingView chart screenshot.',
        },
        { status: 400 }
      );
    }

    data.isValidChart = true;

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
      const risk = Math.abs(Number(data.entry) - Number(data.stop_loss));
      const reward = data.direction === 'Long'
        ? Number(data.take_profit) - Number(data.entry)
        : Number(data.entry) - Number(data.take_profit);
      data.risk_reward = risk > 0 ? `1:${(reward / risk).toFixed(1)}` : null;
    }

    // ─── Post-process: Outcome-aware P&L calculation ───
    if (data.entry && data.stop_loss && data.take_profit) {
      const entry = parseFloat(String(data.entry));
      const tp = parseFloat(String(data.take_profit));
      const sl = parseFloat(String(data.stop_loss));
      const lots = parseFloat(String(data.lot_size)) || 0;
      const multiplier = 100; // Gold: 100 oz per standard lot

      const outcome = String(data.outcome || '').toUpperCase();

      if (outcome === 'LOSS') {
        // Enforce exit_price equal to Stop Loss level
        data.exit_price = sl;
        data.outcome = 'LOSS';
        // Enforce strictly negative profit number for LOSS
        const lossAmount = Math.abs(entry - sl) * lots * multiplier;
        data.estimated_profit = parseFloat((-lossAmount).toFixed(2));
        data.estimated_loss = parseFloat(lossAmount.toFixed(2));
      } else if (outcome === 'WIN') {
        // Enforce exit_price equal to Take Profit level
        data.exit_price = tp;
        data.outcome = 'WIN';
        const winAmount = Math.abs(tp - entry) * lots * multiplier;
        const lossAmount = Math.abs(entry - sl) * lots * multiplier;
        data.estimated_profit = parseFloat(winAmount.toFixed(2));
        data.estimated_loss = parseFloat(lossAmount.toFixed(2));
      } else {
        data.outcome = 'OPEN';
        const winAmount = Math.abs(tp - entry) * lots * multiplier;
        const lossAmount = Math.abs(entry - sl) * lots * multiplier;
        data.estimated_profit = parseFloat(winAmount.toFixed(2));
        data.estimated_loss = parseFloat(lossAmount.toFixed(2));
      }

      data.risk_percent_actual = riskPercent || 1;
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('analyze-trade Gemini Pro API Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ============================================================
// Helper: Convert Base64 data URL to Gemini inlineData object
// ============================================================
function parseBase64Image(dataUrl: string): { inlineData: { data: string; mimeType: string } } {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (match) {
    return {
      inlineData: {
        mimeType: match[1],
        data: match[2],
      },
    };
  }
  return {
    inlineData: {
      mimeType: 'image/jpeg',
      data: dataUrl,
    },
  };
}

// ============================================================
// Helper: Extract JSON from model text response
// ============================================================
function extractJSON(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    /* continue */
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      /* continue */
    }
  }

  const braceStart = trimmed.indexOf('{');
  const braceEnd = trimmed.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    try {
      return JSON.parse(trimmed.slice(braceStart, braceEnd + 1));
    } catch {
      /* continue */
    }
  }

  return null;
}
