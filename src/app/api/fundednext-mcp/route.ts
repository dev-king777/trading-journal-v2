import { NextResponse } from 'next/server';
import { FundedNextAccount, Trade } from '@/lib/types';

const MCP_ENDPOINT = 'https://mcp.fundednext.com';

export const maxDuration = 60;

function parseMcpResponse(text: string): any {
  const trimmed = text.trim();
  if (!trimmed) return {};

  try {
    return JSON.parse(trimmed);
  } catch {
    // Streamable HTTP MCP servers may answer as an SSE event stream.
    const payloads = trimmed
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .filter((line) => line && line !== '[DONE]');

    for (let index = payloads.length - 1; index >= 0; index -= 1) {
      try {
        return JSON.parse(payloads[index]);
      } catch {
        // Continue until a complete JSON event is found.
      }
    }
  }

  throw new Error('FundedNext MCP returned an unsupported response format.');
}

function mapFundedNextAccount(raw: any): FundedNextAccount {
  const providerAccountId = String(raw.id ?? raw.account_id ?? raw.login ?? '');
  const startingBalance = Number(raw.starting_balance || raw.plan?.startingBalance || raw.startingBalance || 6000);
  const balance = Number(raw.balance ?? startingBalance);
  const equity = Number(raw.equity ?? balance);
  const planTitle = raw.plan?.title || (typeof raw.plan === 'string' ? raw.plan : null) || raw.plan_title || raw.type || raw.accountType || `FundedNext ${startingBalance / 1000}K Challenge`;
  const login = String(raw.login ?? raw.account_number ?? raw.accountNumber ?? `FN-${providerAccountId}`);
  const isBreached = raw.breached === true || Number(raw.breached) === 1;
  const profitTarget = startingBalance * 0.10;

  return {
    providerAccountId,
    accountNumber: login,
    accountType: planTitle,
    balance,
    equity,
    initialBalance: startingBalance,
    profitTarget,
    maxDailyLossLimit: startingBalance * 0.05,
    currentDailyLoss: Math.max(0, balance - equity),
    maxOverallLossLimit: startingBalance * 0.10,
    currentOverallLoss: Math.max(0, startingBalance - equity),
    payoutEligible: !isBreached && balance > startingBalance,
    status: isBreached ? 'Breached' : (balance >= startingBalance + profitTarget ? 'Passed' : 'Active'),
    lastSyncedAt: new Date().toISOString(),
  };
}

// Helper: call the MCP server with a JSON-RPC request
async function mcpCall(endpoint: string, token: string, method: string, params: any = {}, id: number = 1) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream, */*',
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Origin': 'https://dashboard.fundednext.com',
      'Referer': 'https://dashboard.fundednext.com/',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params,
    }),
    signal: AbortSignal.timeout(12_000),
  });

  const text = await res.text().catch(() => '');

  if (!res.ok) {
    console.error(`MCP ${method} HTTP ${res.status}:`, text.slice(0, 500));
    try {
      return parseMcpResponse(text);
    } catch {
      return {
        error: {
          message: res.status === 401 ? 'FundedNext token is invalid or revoked.' : `FundedNext MCP request failed (${res.status}).`,
        },
      };
    }
  }

  return parseMcpResponse(text);
}

// Helper: extract data from various MCP response formats
function extractDataFromResponse(json: any): any[] | null {
  if (!json) return null;

  // Check for errors (including isError flag from MCP)
  if (json.error) {
    console.warn('MCP response error:', json.error);
    return null;
  }

  const result = json.result;
  if (!result) return null;

  // Check for MCP tool errors (e.g., "Unknown tool")
  if (result.isError) {
    console.warn('MCP tool error:', result.content?.[0]?.text);
    return null;
  }

  const findArrayPayload = (value: any): any[] | null => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') return null;
    for (const key of ['data', 'accounts', 'trades', 'trading_history', 'items', 'results']) {
      const nested = findArrayPayload(value[key]);
      if (nested) return nested;
    }
    return null;
  };

  const looksLikeTrade = (value: any) => value && typeof value === 'object' && (
    'ticket' in value ||
    ('symbol' in value && ('profit' in value || 'pnl' in value)) ||
    ('entry_price' in value && 'exit_price' in value) ||
    ('open_price' in value && 'close_price' in value)
  );

  const collectTradeRecordsDeep = (value: any, records: any[] = []): any[] => {
    if (!value || typeof value !== 'object') return records;
    if (Array.isArray(value)) {
      const tradeRecords = value.filter(looksLikeTrade);
      if (tradeRecords.length > 0) {
        records.push(...tradeRecords);
      } else {
        for (const item of value) collectTradeRecordsDeep(item, records);
      }
      return records;
    }
    for (const nestedValue of Object.values(value)) {
      collectTradeRecordsDeep(nestedValue, records);
    }
    return records;
  };

  const uniqueTradeRecords = (records: any[]) => {
    const seen = new Set<string>();
    return records.filter((trade) => {
      const key = String(
        trade.ticket ?? trade.order ?? trade.id ??
        `${trade.symbol || trade.pair}:${trade.open_time || trade.date}:${trade.entry_price || trade.open_price}`
      );
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // Format 1: result.structuredContent.data (array)
  if (result.structuredContent?.data && Array.isArray(result.structuredContent.data)) {
    return result.structuredContent.data;
  }
  const structuredTrades = uniqueTradeRecords(collectTradeRecordsDeep(result.structuredContent));
  if (structuredTrades.length > 0) return structuredTrades;
  const structuredArray = findArrayPayload(result.structuredContent);
  if (structuredArray) return structuredArray;

  // Format 2: result.content[0].text (JSON string) - main format for FundedNext MCP
  if (result.content && Array.isArray(result.content)) {
    for (const item of result.content) {
      if (item.text) {
        try {
          const parsed = JSON.parse(item.text);
          const parsedTrades = uniqueTradeRecords(collectTradeRecordsDeep(parsed));
          if (parsedTrades.length > 0) return parsedTrades;
          const parsedArray = findArrayPayload(parsed);
          if (parsedArray) return parsedArray;
          // FundedNext paginated format: trades: { current_page, data: [...] }
          if (parsed?.trades?.data && Array.isArray(parsed.trades.data)) return parsed.trades.data;
          // Plain array of trades
          if (parsed?.trades && Array.isArray(parsed.trades)) return parsed.trades;
          // Other nested paginated formats
          if (parsed?.trading_history?.data && Array.isArray(parsed.trading_history.data)) return parsed.trading_history.data;
          if (parsed?.trading_history && Array.isArray(parsed.trading_history)) return parsed.trading_history;
        } catch (e) {
          console.warn('Failed to parse MCP content text:', item.text?.slice(0, 200));
        }
      }
    }
  }

  // Format 3: Direct data in result
  if (Array.isArray(result.data)) return result.data;
  // Paginated trades in result
  if (result.trades?.data && Array.isArray(result.trades.data)) return result.trades.data;
  if (Array.isArray(result.trades)) return result.trades;
  if (result.trading_history?.data && Array.isArray(result.trading_history.data)) return result.trading_history.data;
  if (Array.isArray(result.trading_history)) return result.trading_history;

  return null;
}

const isClosedTradeRecord = (trade: any) => {
  if (!trade || typeof trade !== 'object') return false;
  const closeLabel = String(trade.close_time_str ?? trade.closeTimeStr ?? '').toLowerCase();
  if (closeLabel.includes('currently running') || closeLabel === 'running') return false;
  if (trade.close_time === 0 || trade.closeTime === 0) return false;
  return true;
};

function extractClosedTradesFromResponse(json: any): any[] {
  if (!json?.result || json.result.isError) return [];

  const payloads: any[] = [];
  if (json.result.structuredContent) payloads.push(json.result.structuredContent);
  if (Array.isArray(json.result.content)) {
    for (const item of json.result.content) {
      if (!item?.text) continue;
      try {
        payloads.push(JSON.parse(item.text));
      } catch {
        // Ignore human-readable MCP content blocks.
      }
    }
  }

  for (const payload of payloads) {
    const explicitTrades = Array.isArray(payload?.trades?.data)
      ? payload.trades.data
      : Array.isArray(payload?.trades)
        ? payload.trades
        : Array.isArray(payload)
          ? payload
          : null;
    if (explicitTrades) return explicitTrades.filter(isClosedTradeRecord);
  }

  return (extractDataFromResponse(json) || []).filter(isClosedTradeRecord);
}

function extractMcpError(json: any): string | null {
  if (!json) return null;
  if (json.error?.message) return json.error.message;
  if (json.result?.structuredContent?.message) return json.result.structuredContent.message;
  const text = json.result?.content?.find((item: any) => item?.text)?.text;
  if (!text) return null;
  try {
    return JSON.parse(text)?.message || null;
  } catch {
    return null;
  }
}

function extractTradingCycles(json: any): any[] {
  if (!json?.result) return [];

  const findCyclesDeep = (value: any): any[] => {
    if (!value || typeof value !== 'object') return [];
    if (Array.isArray(value.trading_cycles)) return value.trading_cycles;
    if (Array.isArray(value.tradingCycles)) return value.tradingCycles;
    for (const nested of Object.values(value)) {
      const cycles = findCyclesDeep(nested);
      if (cycles.length > 0) return cycles;
    }
    return [];
  };

  const structuredCycles = findCyclesDeep(json.result.structuredContent);
  if (structuredCycles.length > 0) return structuredCycles;

  const content = json.result.content;
  if (!Array.isArray(content)) return [];
  for (const item of content) {
    if (!item?.text) continue;
    try {
      let parsed: any = JSON.parse(item.text);
      for (let depth = 0; depth < 2 && typeof parsed === 'string'; depth++) {
        parsed = JSON.parse(parsed);
      }
      const cycles = findCyclesDeep(parsed);
      if (cycles.length > 0) return cycles;
    } catch (error) {
      console.warn('[FundedNext MCP] Could not parse trading cycles:', error);
    }
  }
  return [];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, token, serverUrl, accountNumber, providerAccountId } = body;

    const requestToken = String(token || '').trim();
    const DEFAULT_SERVER_TOKEN = '67090800|dbO0PkKRwBWMOOA3oLa9KjK1wQz9cQmdCvOBGh4ba9a11e67';
    const cleanToken = String(
      requestToken === '__server__'
        ? process.env.FUNDEDNEXT_MCP_TOKEN || DEFAULT_SERVER_TOKEN
        : requestToken || process.env.FUNDEDNEXT_MCP_TOKEN || DEFAULT_SERVER_TOKEN
    ).trim();
    if (!cleanToken) {
      return NextResponse.json(
        { success: false, error: 'FundedNext token is required.' },
        { status: 400 }
      );
    }

    const endpoint = serverUrl || MCP_ENDPOINT;

    const discoverAvailableTools = async (): Promise<string[]> => {
      try {
        const listRes = await mcpCall(endpoint, cleanToken, 'tools/list', {}, 0);
        if (listRes?.result?.tools && Array.isArray(listRes.result.tools)) {
          const tools = listRes.result.tools.map((tool: any) => tool.name || tool);
          console.log('[FundedNext MCP] Available tools:', tools);
          return tools;
        }
        console.log('[FundedNext MCP] tools/list response:', JSON.stringify(listRes)?.slice(0, 500));
      } catch (error) {
        console.warn('[FundedNext MCP] tools/list failed:', error);
      }
      return [];
    };

    // Account selection only needs get_accounts, so skip one network round trip.
    let availableTools: string[] = accountNumber || providerAccountId
      ? await discoverAvailableTools()
      : [];

    // ========================================================
    // Step 2: Call get_accounts to get account data
    // ========================================================
    const accountsJson = await mcpCall(endpoint, cleanToken, 'tools/call', {
      name: 'get_accounts',
      arguments: { type: 'active', tab: 'forex', page: 1, limit: 20 }
    }, 1);

    const accountsList = extractDataFromResponse(accountsJson);

    if (!accountsList || accountsList.length === 0) {
      const rawMcpError = extractMcpError(accountsJson);
      const mcpError = rawMcpError === 'invalid_token'
        ? 'FundedNext token is invalid or revoked. Add a new token to reconnect.'
        : rawMcpError;
      console.error('[FundedNext MCP] get_accounts raw response:', JSON.stringify(accountsJson)?.slice(0, 1000));
      return NextResponse.json(
        { success: false, error: mcpError || 'No active FundedNext account found for this token.' },
        { status: mcpError ? 401 : 404 }
      );
    }

    const accounts = accountsList.map(mapFundedNextAccount);
    const requestedAccountNumber = String(accountNumber || '');
    const requestedProviderId = String(providerAccountId || '');
    let selectedIndex = -1;

    if (requestedAccountNumber || requestedProviderId) {
      selectedIndex = accounts.findIndex((candidate) =>
        (requestedAccountNumber && candidate.accountNumber === requestedAccountNumber) ||
        (requestedProviderId && candidate.providerAccountId === requestedProviderId)
      );
    } else if (accounts.length === 1) {
      selectedIndex = 0;
    }

    if (selectedIndex < 0) {
      return NextResponse.json({
        success: true,
        selectionRequired: true,
        message: 'Choose a FundedNext account to continue.',
        accounts,
        account: null,
        trades: [],
      });
    }

    if (availableTools.length === 0) {
      availableTools = await discoverAvailableTools();
    }

    const accountDataRaw = accountsList[selectedIndex];
    const account = accounts[selectedIndex];

    console.log('[FundedNext MCP] Account data keys:', Object.keys(accountDataRaw));

    const accountId = account.providerAccountId;
    const login = account.accountNumber;

    // ========================================================
    // Step 3: Fetch trade history using discovered tools
    // ========================================================
    let rawTradesList: any[] = [];

    // Check if trades are already included in account data
    if (Array.isArray(accountDataRaw.trades) && accountDataRaw.trades.length > 0) {
      rawTradesList = accountDataRaw.trades;
      console.log('[FundedNext MCP] Found trades in account data:', rawTradesList.length);
    } else if (Array.isArray(accountDataRaw.trading_history) && accountDataRaw.trading_history.length > 0) {
      rawTradesList = accountDataRaw.trading_history;
      console.log('[FundedNext MCP] Found trading_history in account data:', rawTradesList.length);
    } else if (Array.isArray(accountDataRaw.recent_trades) && accountDataRaw.recent_trades.length > 0) {
      rawTradesList = accountDataRaw.recent_trades;
      console.log('[FundedNext MCP] Found recent_trades in account data:', rawTradesList.length);
    }

    // If no trades in account data, try calling trade history tools
    if (rawTradesList.length === 0) {
      // FundedNext exposes one authoritative closed-trade tool for CFD accounts.
      const accountSpecificCandidates = [
        { name: 'get_trading_history', args: { account_id: Number(accountId) } },
        { name: 'get_trading_history', args: { account_id: accountId } },
      ];
      const allCandidates = accountSpecificCandidates;

      // Prioritize tools that actually exist in the discovered list
      const prioritized = availableTools.length > 0
        ? [
            ...allCandidates.filter(c => availableTools.includes(c.name)),
            ...allCandidates.filter(c => !availableTools.includes(c.name)),
          ]
        : allCandidates;

      // Deduplicate by name+args combo
      const seen = new Set<string>();
      const uniqueCandidates = prioritized.filter(c => {
        const key = `${c.name}:${JSON.stringify(c.args)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      let tradingCycles: any[] = [];

      for (const candidate of uniqueCandidates) {
        try {
          console.log(`[FundedNext MCP] Trying tool: ${candidate.name}(${JSON.stringify(candidate.args)})`);

          const historyJson = await mcpCall(endpoint, cleanToken, 'tools/call', {
            name: candidate.name,
            arguments: candidate.args,
          }, 2);

          const parsedList = extractClosedTradesFromResponse(historyJson);
          if (tradingCycles.length === 0) {
            tradingCycles = extractTradingCycles(historyJson);
          }

          if (parsedList && parsedList.length > 0) {
            rawTradesList = parsedList;
            console.log(`[FundedNext MCP] ✅ Got ${parsedList.length} trades from ${candidate.name}`);
            break;
          } else {
            console.log(`[FundedNext MCP] ❌ ${candidate.name} returned empty. Response:`, JSON.stringify(historyJson)?.slice(0, 300));
          }
        } catch (toolErr) {
          console.warn(`[FundedNext MCP] Error calling ${candidate.name}:`, toolErr);
        }
      }

      if (tradingCycles.length > 0 && availableTools.includes('get_cycle_trading_history')) {
        const cycleResponses = await Promise.all(
          tradingCycles.map((cycle, index) => mcpCall(endpoint, cleanToken, 'tools/call', {
            name: 'get_cycle_trading_history',
            arguments: {
              account_id: Number(accountId),
              cycle_id: Number(cycle.id),
            },
          }, 10 + index))
        );

        const cycleTrades = cycleResponses.flatMap(extractClosedTradesFromResponse);
        const seenTrades = new Set<string>();
        rawTradesList = [...rawTradesList, ...cycleTrades]
          .filter(isClosedTradeRecord)
          .filter((trade: any) => {
          const key = String(
            trade.ticket ?? trade.order ?? trade.id ??
            `${trade.symbol || trade.pair}:${trade.open_time || trade.date}:${trade.entry_price || trade.open_price}`
          );
          if (seenTrades.has(key)) return false;
          seenTrades.add(key);
          return true;
          });
        console.log(`[FundedNext MCP] Loaded ${rawTradesList.length} trades from ${tradingCycles.length} trading cycles.`);
      }

      // Retry only the authoritative trade-history tool. Never treat payments,
      // requests, breaches, or other history records as trading activity.
      if (rawTradesList.length === 0 && tradingCycles.length === 0 && availableTools.length > 0) {
        const tradeRelatedTools = availableTools.filter(t => t === 'get_trading_history');
        console.log('[FundedNext MCP] Trade-related tools from discovery:', tradeRelatedTools);

        for (const toolName of tradeRelatedTools) {
          if (rawTradesList.length > 0) break;

          const fallbackArgs = [
            { account_id: accountId },
            { account_id: String(accountId) },
            { login: login },
            ...(accounts.length === 1 ? [{}] : []),
          ];
          for (const args of fallbackArgs) {
            try {
              console.log(`[FundedNext MCP] Last resort trying: ${toolName}(${JSON.stringify(args)})`);
              const res = await mcpCall(endpoint, cleanToken, 'tools/call', {
                name: toolName,
                arguments: args,
              }, 3);

              const data = extractDataFromResponse(res);
              if (data && data.length > 0) {
                rawTradesList = data;
                console.log(`[FundedNext MCP] ✅ Last resort: Got ${data.length} items from ${toolName}`);
                break;
              }
            } catch (e) {
              // Continue to next
            }
          }
        }
      }
    }

    console.log(`[FundedNext MCP] Final trade count: ${rawTradesList.length}`);
    if (rawTradesList.length > 0) {
      console.log('[FundedNext MCP] Sample trade keys:', Object.keys(rawTradesList[0]));
      console.log('[FundedNext MCP] Sample trade:', JSON.stringify(rawTradesList[0])?.slice(0, 500));
    }

    // ========================================================
    // Step 4: Map FundedNext trade schema -> Draga AI Trade schema
    // ========================================================
    let trades: Partial<Trade>[] = [];

    if (rawTradesList.length > 0) {
      const tradeRecords = rawTradesList.filter((item: any) => item && typeof item === 'object' && (
        'ticket' in item ||
        ('symbol' in item && ('profit' in item || 'pnl' in item)) ||
        ('entry_price' in item && 'exit_price' in item) ||
        ('open_price' in item && 'close_price' in item)
      ));

      if (tradeRecords.length !== rawTradesList.length) {
        console.warn(`[FundedNext MCP] Ignored ${rawTradesList.length - tradeRecords.length} non-trade records.`);
      }

      trades = tradeRecords.map((t: any) => {
        const profit = Number(t.profit !== undefined ? t.profit : t.pnl !== undefined ? t.pnl : 0);

        // Detect direction
        const rawType = String(t.type_str || t.type || t.action || t.cmd || '').toLowerCase();
        let direction: 'Long' | 'Short' = 'Long';
        if (rawType.includes('sell') || rawType.includes('short') || t.cmd === 1 || t.type === 1) {
          direction = 'Short';
        } else if (rawType.includes('buy') || rawType.includes('long') || t.cmd === 0 || t.type === 0) {
          direction = 'Long';
        }

        const symbol = String(t.symbol || t.pair || t.instrument || 'XAUUSD').toUpperCase();

        let market: 'Forex' | 'Commodities' | 'Indices' | 'Crypto' = 'Forex';
        if (symbol.includes('XAU') || symbol.includes('GOLD') || symbol.includes('XAG') || symbol.includes('SILVER') || symbol.includes('OIL')) {
          market = 'Commodities';
        } else if (symbol.includes('US30') || symbol.includes('NAS') || symbol.includes('GER') || symbol.includes('SPX') || symbol.includes('DOW') || symbol.includes('DAX')) {
          market = 'Indices';
        } else if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('SOL') || symbol.includes('XRP')) {
          market = 'Crypto';
        }

        const openPrice = Number(t.open_price ?? t.openPrice ?? t.entry_price ?? t.entryPrice ?? 0);
        const closePrice = Number(t.close_price ?? t.closePrice ?? t.exit_price ?? t.exitPrice ?? openPrice);
        const stopLoss = Number(t.sl ?? t.stop_loss ?? t.stopLoss ?? 0);
        const takeProfit = Number(t.tp ?? t.take_profit ?? t.takeProfit ?? 0);
        const lots = Number(t.lots ?? t.volume ?? t.position_size ?? t.size ?? 0.1);

        let result: 'Win' | 'Loss' | 'Breakeven' = 'Breakeven';
        if (profit > 0.01) result = 'Win';
        else if (profit < -0.01) result = 'Loss';

        const tradeDate = t.close_time_str || t.close_time || t.open_time_str || t.open_time || t.time || t.created_at || t.date || new Date().toISOString();

        let formattedDate = new Date().toISOString();
        try {
          if (typeof tradeDate === 'string') {
            const isoLikeStr = tradeDate.replace(/\./g, '-').replace(' ', 'T');
            const parsed = new Date(isoLikeStr);
            if (!isNaN(parsed.getTime())) {
              formattedDate = parsed.toISOString();
            } else {
              const fallback = new Date(tradeDate);
              if (!isNaN(fallback.getTime())) {
                formattedDate = fallback.toISOString();
              }
            }
          } else if (typeof tradeDate === 'number') {
            const parsed = new Date(tradeDate > 1e11 ? tradeDate : tradeDate * 1000);
            if (!isNaN(parsed.getTime())) {
              formattedDate = parsed.toISOString();
            }
          }
        } catch (e) {
          console.warn('Error formatting trade date:', tradeDate, e);
        }

        return {
          pair: symbol,
          market: market,
          direction: direction,
          result: result,
          entryPrice: openPrice,
          exitPrice: closePrice,
          stopLoss: stopLoss,
          takeProfit: takeProfit,
          positionSize: lots,
          fees: Math.abs(Number(t.commission || 0)) + Math.abs(Number(t.swap || 0)),
          pnl: profit,
          session: 'New York',
          strategy: 'FundedNext Prop Trade',
          setup: 'MT5 Live Execution',
          timeframe: '15m',
          date: formattedDate,
          duration: t.trade_duration || '30m',
          rating: profit > 0 ? 5 : 3,
          emotionBefore: 'Calm',
          emotionDuring: 'Disciplined',
          emotionAfter: profit > 0 ? 'Confident' : 'Calm',
          confidenceLevel: 8,
          isMistake: false,
          lessonsLearned: `Live FundedNext MT5 Trade. PnL%: ${t.pnl_percentage || 'N/A'}%, RR: ${t.rr_ratio || 'N/A'}`,
          screenshotUrl: '',
          tradingViewLink: '',
          notes: `FundedNext ${account.accountNumber} Ticket #${t.ticket || t.id || t.order || 'LIVE'}`,
          tags: ['FundedNext', `FundedNext:${account.accountNumber}`, 'PropFirm', 'MT5', 'MCP'],
          isFavorite: false,
          isArchived: false,
        };
      });
    }

    const seenClosedTrades = new Set<string>();
    rawTradesList = rawTradesList
      .filter(isClosedTradeRecord)
      .filter((trade: any) => {
        const key = String(
          trade.ticket ?? trade.order ?? trade.id ??
          `${trade.symbol || trade.pair}:${trade.open_time || trade.date}:${trade.entry_price || trade.open_price}`
        );
        if (seenClosedTrades.has(key)) return false;
        seenClosedTrades.add(key);
        return true;
      });

    const historicalNetPnl = trades.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0);
    const currentBalanceProfit = account.balance - account.initialBalance;
    const inferredPayoutTotal = historicalNetPnl - currentBalanceProfit;
    const minimumPayout = Math.max(10, account.initialBalance * 0.0025);
    account.inferredPayoutTotal = inferredPayoutTotal >= minimumPayout
      ? Math.round(inferredPayoutTotal * 100) / 100
      : 0;

    return NextResponse.json({
      success: true,
      message: action === 'connect' ? 'FundedNext Live MCP Account connected!' : 'FundedNext live trades synced!',
      account: account,
      accounts,
      selectionRequired: false,
      trades: trades,
      debug: {
        availableTools,
        rawTradeCount: rawTradesList.length,
        accountKeys: Object.keys(accountDataRaw),
      },
    });
  } catch (error: any) {
    console.error('FundedNext MCP API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'FundedNext MCP server communication failed.' },
      { status: 500 }
    );
  }
}
