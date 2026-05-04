import { createClient } from '@libsql/client'

const db = createClient({ url: 'file:./dev.db' })

async function dump(label, sql) {
  const result = await db.execute(sql)
  console.log(`\n=== ${label} (${result.rows.length} rows) ===`)
  if (result.rows.length === 0) {
    console.log('(empty)')
    return
  }
  for (const row of result.rows) {
    const obj = Object.fromEntries(
      result.columns.map((c, i) => [c, row[i]])
    )
    console.log(JSON.stringify(obj))
  }
}

await dump('Settings', 'SELECT id, startingBalance, currency FROM Settings')
await dump('Transaction', 'SELECT id, date, amount, type, category, payee, status, isSubscription, isRecurring, recurringRuleId FROM "Transaction" ORDER BY date DESC')
await dump('RecurringRule', 'SELECT id, frequency, startDate, endDate FROM RecurringRule')
await dump('Subscription', 'SELECT id, transactionId, billingCycle, nextRenewal, annualCost, status FROM Subscription')
await dump('Budget', 'SELECT id, category, monthlyLimit, active FROM Budget')
await dump('Position', 'SELECT id, ticker, shares, costBasisPerShare, lotLabel FROM Position')
await dump('PriceCache', 'SELECT ticker, closePrice, priceDate, fetchedAt FROM PriceCache')
await dump('PortfolioSnapshot', 'SELECT id, date, totalValue FROM PortfolioSnapshot ORDER BY date DESC')
await dump('Goal', 'SELECT id, name, targetAmount, balance, targetDate FROM Goal')

await db.close()
