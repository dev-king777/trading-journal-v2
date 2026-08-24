import { NextResponse } from 'next/server';
import { FundedNextAccount, Trade } from '@/lib/types';

const MCP_ENDPOINT = 'https://mcp.fundednext.com';

// Helper: call the MCP server with a JSON-RPC request
async function mcpCall(endpoint: string, token: string, method: string, params: any = {}, id: number = 1) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`MCP ${method} HTTP ${res.status}:`, text.slice(0, 500));
    return null;
  }

  return res.json();
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

  // Format 1: result.structuredContent.data (array)
  if (result.structuredContent?.data && Array.isArray(result.structuredContent.data)) {
    return result.structuredContent.data;
  }

  // Format 2: result.content[0].text (JSON string) - main format for FundedNext MCP
  if (result.content && Array.isArray(result.content)) {
    for (const item of result.content) {
      if (item.text) {
        try {
          const parsed = JSON.parse(item.text);
          if (Array.isArray(parsed)) return parsed;
          if (parsed?.data && Array.isArray(parsed.data)) return parsed.data;
          // FundedNext paginated format: trades: { current_page, data: [...] }
          if (parsed?.trades?.data && Array.isArray(parsed.trades.data)) return parsed.trades.data;
          // Plain array of trades
          if (parsed?.trades && Array.isArray(parsed.trades)) return parsed.trades;
          // Other nested paginated formats
          if (parsed?.trading_history?.data && Array.isArray(parsed.trading_history.data)) return parsed.trading_history.data;
          if (parsed?.trading_history && Array.isArray(parsed.trading_history)) return parsed.trading_history;
          // Single object (like a single account)
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return [parsed];
          }
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, token, serverUrl } = body;

    const cleanToken = (token || '').trim();
    if (!cleanToken) {
      return NextResponse.json(
        { success: false, error: 'FundedNext token is required.' },
        { status: 400 }
      );
    }

    const endpoint = serverUrl || MCP_ENDPOINT;

    // ========================================================
    // Step 1: Discover available tools via tools/list
    // ========================================================
    let availableTools: string[] = [];
    try {
      const listRes = await mcpCall(endpoint, cleanToken, 'tools/list', {}, 0);
      if (listRes?.result?.tools && Array.isArray(listRes.result.tools)) {
        availableTools = listRes.result.tools.map((t: any) => t.name || t);
        console.log('[FundedNext MCP] Available tools:', availableTools);
      } else {
        console.log('[FundedNext MCP] tools/list response:', JSON.stringify(listRes)?.slice(0, 500));
      }
    } catch (e) {
      console.warn('[FundedNext MCP] tools/list failed:', e);
    }

    // ========================================================
    // Step 2: Call get_accounts to get account data
    // ========================================================
    const accountsJson = await mcpCall(endpoint, cleanToken, 'tools/call', {
      name: 'get_accounts',
      arguments: {}
    }, 1);

    let accountDataRaw: any = null;
    const accountsList = extractDataFromResponse(accountsJson);

    if (accountsList && accountsList.length > 0) {
      accountDataRaw = accountsList[0];
    }

    if (!accountDataRaw) {
      console.error('[FundedNext MCP] get_accounts raw response:', JSON.stringify(accountsJson)?.slice(0, 1000));
      return NextResponse.json(
        { success: false, error: 'No active FundedNext account found for this token.' },
        { status: 404 }
      );
    }

    console.log('[FundedNext MCP] Account data keys:', Object.keys(accountDataRaw));

    const accountId = accountDataRaw.id;
    const startingBalance = Number(accountDataRaw.starting_balance || accountDataRaw.plan?.startingBalance || accountDataRaw.startingBalance || 6000);
    const balance = Number(accountDataRaw.balance || startingBalance);
    const equity = Number(accountDataRaw.equity || balance);
    const planTitle = accountDataRaw.plan?.title || accountDataRaw.type || accountDataRaw.accountType || `FundedNext ${startingBalance / 1000}K Challenge`;
    const login = accountDataRaw.login || 'FN-' + accountId;
    const isBreached = Boolean(accountDataRaw.breached);

    // Calculate rules thresholds based on starting balance
    const maxDailyLossLimit = startingBalance * 0.05;
    const maxOverallLossLimit = startingBalance * 0.10;
    const profitTarget = startingBalance * 0.10;
    const currentDailyLoss = Math.max(0, balance - equity);
    const currentOverallLoss = Math.max(0, startingBalance - equity);

    const account: FundedNextAccount = {
      accountNumber: String(login),
      accountType: planTitle,
      balance: balance,
      equity: equity,
      initialBalance: startingBalance,
      profitTarget: profitTarget,
      maxDailyLossLimit: maxDailyLossLimit,
      currentDailyLoss: currentDailyLoss,
      maxOverallLossLimit: maxOverallLossLimit,
      currentOverallLoss: currentOverallLoss,
      payoutEligible: !isBreached && balance > startingBalance,
      status: isBreached ? 'Breached' : (balance >= startingBalance + profitTarget ? 'Passed' : 'Active'),
      lastSyncedAt: new Date().toISOString(),
    };

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
      // Build a prioritized list of tool candidates based on what's actually available
      const allCandidates = [
        // Exact tools from discovery
        { name: 'get_trading_history', args: { account_id: accountId } },
        { name: 'get_trading_history', args: { account_id: Number(accountId) } },
        { name: 'get_trading_history', args: { login: login } },
        { name: 'get_trading_history', args: {} },
        { name: 'get_trades', args: { account_id: accountId } },
        { name: 'get_trades', args: {} },
        { name: 'get_trade_history', args: { account_id: accountId } },
        { name: 'get_trade_history', args: {} },
        { name: 'get_closed_trades', args: { account_id: accountId } },
        { name: 'get_closed_trades', args: {} },
        { name: 'get_account_trades', args: { account_id: accountId } },
        { name: 'get_account_trades', args: {} },
        // Try with string ID
        { name: 'get_trading_history', args: { account_id: String(accountId) } },
        { name: 'get_trades', args: { account_id: String(accountId) } },
      ];

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

      for (const candidate of uniqueCandidates) {
        try {
          console.log(`[FundedNext MCP] Trying tool: ${candidate.name}(${JSON.stringify(candidate.args)})`);

          const historyJson = await mcpCall(endpoint, cleanToken, 'tools/call', {
            name: candidate.name,
            arguments: candidate.args,
          }, 2);

          const parsedList = extractDataFromResponse(historyJson);

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

      // Last resort: Try also listing tools that contain 'trade' or 'history'
      if (rawTradesList.length === 0 && availableTools.length > 0) {
        const tradeRelatedTools = availableTools.filter(
          t => t.includes('trade') || t.includes('history') || t.includes('order') || t.includes('position')
        );
        console.log('[FundedNext MCP] Trade-related tools from discovery:', tradeRelatedTools);

        for (const toolName of tradeRelatedTools) {
          if (rawTradesList.length > 0) break;

          for (const args of [
            { account_id: accountId },
            { account_id: String(accountId) },
            { login: login },
            {},
          ]) {
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
      trades = rawTradesList.map((t: any) => {
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
          notes: `FundedNext Ticket #${t.ticket || t.id || t.order || 'LIVE'}`,
          tags: ['FundedNext', 'PropFirm', 'MT5', 'MCP'],
          isFavorite: false,
          isArchived: false,
        };
      });
    }

    return NextResponse.json({
      success: true,
      message: action === 'connect' ? 'FundedNext Live MCP Account connected!' : 'FundedNext live trades synced!',
      account: account,
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
