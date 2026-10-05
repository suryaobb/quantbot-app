#!/bin/bash
cd ~/Desktop/quantbot-app
rm -f .git/index.lock
git add -A
git commit -m "feat: wire dashboard to live qb_alerts + qb_trades from Supabase

- signals/page.tsx: reads from qb_alerts (tier GO/WATCH/SUPPRESSED, score bar, message preview)
- portfolio/page.tsx: reads from qb_trades (real P&L, equity curve, open positions)
- page.tsx: hero stats from qb_trades (balance, win rate, today P&L, alert count)
- lib/supabase.ts: QbAlert + QbTrade types added
- globals.css: pill-yellow for WATCH tier"
git push origin main
echo ""
echo "✅ Pushed! Vercel will deploy in ~40s."
read -p "Press Enter to close..."
