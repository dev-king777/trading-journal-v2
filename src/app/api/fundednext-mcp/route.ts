import { NextResponse } from 'next/server';
import { FundedNextAccount, Trade } from '@/lib/types';

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

    const endpoint = serverUrl || 'https://mcp.fundednext.com';

    // Step 1: Call `get_accounts` on FundedNext MCP Server
    const accountsRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'get_accounts',
          arguments: {}
        }
      }),
    });

    if (!accountsRes.ok) {
      return NextResponse.json(
        { success: false, error: `FundedNext MCP Server error HTTP ${accountsRes.status}` },
        { status: accountsRes.status }
      );
    }

    const accountsJson = await accountsRes.json();
    let accountDataRaw: any = null;

    if (accountsJson?.result?.structuredContent?.data && Array.isArray(accountsJson.result.structuredContent.data)) {
      accountDataRaw = accountsJson.result.structuredContent.data[0];
    } else if (accountsJson?.result?.content?.[0]?.text) {
      try {
        const parsedText = JSON.parse(accountsJson.result.content[0].text);
        if (parsedText?.data && Array.isArray(parsedText.data)) {
          accountDataRaw = parsedText.data[0];
        }
      } catch (e) {}
    }

    if (!accountDataRaw) {
      return NextResponse.json(
        { success: false, error: 'No active FundedNext account found for this token.' },
        { status: 404 }
      );
    }

    const accountId = accountDataRaw.id;
    const startingBalance = Number(accountDataRaw.starting_balance || accountDataRaw.plan?.startingBalance || 6000);
    const balance = Number(accountDataRaw.balance || startingBalance);
    const equity = Number(accountDataRaw.equity || balance);
    const planTitle = accountDataRaw.plan?.title || accountDataRaw.type || `FundedNext ${startingBalance / 1000}K Challenge`;
    const login = accountDataRaw.login || 'FN-' + accountId;
    const isBreached = Boolean(accountDataRaw.breached);

    // Calculate realistic rules thresholds based on starting balance
    const maxDailyLossLimit = startingBalance * 0.05; // 5% daily loss limit
    const maxOverallLossLimit = startingBalance * 0.10; // 10% overall loss limit
    const profitTarget = startingBalance * 0.10; // 10% target
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

    // Step 2: Call `get_trading_history` for this specific accountId
    let trades: Partial<Trade>[] = [];
    try {
      const historyRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanToken}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'get_trading_history',
            arguments: { account_id: accountId }
          }
        }),
      });

      if (historyRes.ok) {
        const historyJson = await historyRes.json();
        let rawTradesList: any[] = [];

        if (historyJson?.result?.structuredContent?.data && Array.isArray(historyJson.result.structuredContent.data)) {
          rawTradesList = historyJson.result.structuredContent.data;
        } else if (historyJson?.result?.content?.[0]?.text) {
          try {
            const parsed = JSON.parse(historyJson.result.content[0].text);
            if (parsed?.data && Array.isArray(parsed.data)) {
              rawTradesList = parsed.data;
            }
          } catch (e) {}
        }

        // Map FundedNext trade schema to Draga AI Trade schema
        trades = rawTradesList.map((t: any) => {
          const profit = Number(t.profit || 0);
          const rawType = (t.type_str || '').toLowerCase();
          const direction: 'Long' | 'Short' = rawType.includes('sell') ? 'Short' : 'Long';
          const symbol = (t.symbol || 'XAUUSD').toUpperCase();

          let market: 'Forex' | 'Commodities' | 'Indices' | 'Crypto' = 'Forex';
          if (symbol.includes('XAU') || symbol.includes('GOLD') || symbol.includes('XAG')) {
            market = 'Commodities';
          } else if (symbol.includes('US30') || symbol.includes('NAS') || symbol.includes('GER') || symbol.includes('SPX')) {
            market = 'Indices';
          } else if (symbol.includes('BTC') || symbol.includes('ETH')) {
            market = 'Crypto';
          }

          const openPrice = Number(t.open_price || 0);
          const closePrice = Number(t.close_price || 0);
          const stopLoss = Number(t.sl || 0);
          const takeProfit = Number(t.tp || 0);
          const lots = Number(t.lots || t.volume / 100 || 0.1);

          let result: 'Win' | 'Loss' | 'Breakeven' = 'Breakeven';
          if (profit > 0.01) result = 'Win';
          else if (profit < -0.01) result = 'Loss';

          const tradeDate = t.close_time_str || t.open_time_str || t.created_at || new Date().toISOString();

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
              const parsed = new Date(tradeDate);
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
            fees: Math.abs(Number(t.commission || 0)),
            pnl: profit,
            session: 'New York',
            strategy: 'FundedNext Prop Trade',
            setup: 'MT5 Live Execution',
            timeframe: '15m',
            date: formattedDate,
            duration: '30m',
            rating: profit > 0 ? 5 : 3,
            emotionBefore: 'Calm',
            emotionDuring: 'Disciplined',
            emotionAfter: profit > 0 ? 'Confident' : 'Calm',
            confidenceLevel: 8,
            isMistake: false,
            lessonsLearned: 'Live FundedNext MT5 Trade imported via MCP.',
            screenshotUrl: '',
            tradingViewLink: '',
            notes: `FundedNext Ticket #${t.ticket || t.id}`,
            tags: ['FundedNext', 'PropFirm', 'MT5', 'MCP'],
            isFavorite: false,
            isArchived: false,
          };
        });
      }
    } catch (e) {
      console.warn('Error fetching FundedNext trade history:', e);
    }

    return NextResponse.json({
      success: true,
      message: action === 'connect' ? 'FundedNext Live MCP Account connected!' : 'FundedNext live trades synced!',
      account: account,
      trades: trades,
    });
  } catch (error: any) {
    console.error('FundedNext MCP API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'FundedNext MCP server communication failed.' },
      { status: 500 }
    );
  }
}
