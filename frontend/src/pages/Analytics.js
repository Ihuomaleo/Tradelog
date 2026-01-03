import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Target, Award, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/api/axios';
import { toast } from 'sonner';

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, tradesRes] = await Promise.all([
        api.get('/analytics/stats'),
        api.get('/trades?limit=500')
      ]);
      setStats(statsRes.data);
      setTrades(tradesRes.data);
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const calculateLossMetrics = () => {
    const closedTrades = trades.filter(t => t.exit_price !== null);
    const losingTrades = closedTrades.filter(t => t.profit_loss < 0);
    
    // Calculate losing streak
    let maxStreak = 0;
    let currentStreak = 0;
    closedTrades.sort((a, b) => new Date(a.exit_time) - new Date(b.exit_time)).forEach(trade => {
      if (trade.profit_loss < 0) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    // Loss by currency pair
    const lossByPair = {};
    losingTrades.forEach(trade => {
      if (!lossByPair[trade.currency_pair]) {
        lossByPair[trade.currency_pair] = { count: 0, total: 0 };
      }
      lossByPair[trade.currency_pair].count++;
      lossByPair[trade.currency_pair].total += trade.profit_loss;
    });

    return {
      totalLosses: losingTrades.length,
      longestStreak: maxStreak,
      lossByPair: Object.entries(lossByPair).map(([pair, data]) => ({
        pair,
        count: data.count,
        total: data.total
      })).sort((a, b) => a.total - b.total).slice(0, 5),
      recentLosses: losingTrades.sort((a, b) => 
        new Date(b.exit_time) - new Date(a.exit_time)
      ).slice(0, 5)
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="analytics-loading">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  const winLossData = [
    { name: 'Wins', value: stats.total_trades * (stats.win_rate / 100), fill: 'hsl(var(--primary))' },
    { name: 'Losses', value: stats.total_trades * (1 - stats.win_rate / 100), fill: 'hsl(var(--destructive))' }
  ];

  const directionData = [
    { name: 'Long', winRate: stats.long_win_rate, fill: 'hsl(var(--primary))' },
    { name: 'Short', winRate: stats.short_win_rate, fill: 'hsl(var(--accent))' }
  ];

  const avgData = [
    { name: 'Avg Win', value: stats.average_win, fill: 'hsl(var(--primary))' },
    { name: 'Avg Loss', value: Math.abs(stats.average_loss), fill: 'hsl(var(--destructive))' }
  ];

  const lossMetrics = stats ? calculateLossMetrics() : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
      data-testid="analytics-page"
    >
      <h1 className="text-4xl font-heading font-bold">Analytics</h1>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2" data-testid="analytics-tabs">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="losses" data-testid="tab-losses">Losses Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50" data-testid="metric-win-rate">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                  Win Rate
                </p>
                <p className="text-3xl font-mono font-bold mt-2 text-primary">
                  {stats.win_rate.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <Target className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50" data-testid="metric-total-pl">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                  Total P&L
                </p>
                <p className={`text-3xl font-mono font-bold mt-2 ${
                  stats.total_profit_loss >= 0 ? 'text-primary' : 'text-destructive'
                }`}>
                  ${stats.total_profit_loss.toFixed(2)}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${
                stats.total_profit_loss >= 0 ? 'bg-primary/10' : 'bg-destructive/10'
              }`}>
                {stats.total_profit_loss >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-primary" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-destructive" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 profit-glow" data-testid="metric-best-trade">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                  Best Trade
                </p>
                <p className="text-3xl font-mono font-bold mt-2 text-primary">
                  ${stats.best_trade.toFixed(2)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <Award className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 loss-glow" data-testid="metric-worst-trade">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                  Worst Trade
                </p>
                <p className="text-3xl font-mono font-bold mt-2 text-destructive">
                  ${stats.worst_trade.toFixed(2)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10">
                <TrendingDown className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Win/Loss Distribution */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-heading">Win/Loss Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={winLossData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {winLossData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Direction Performance */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-heading">Win Rate by Direction</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={directionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                />
                <Bar dataKey="winRate" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Average Win/Loss */}
        <Card className="border-border/50 md:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading">Average Win vs Average Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={avgData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                />
                <Bar dataKey="value">
                  {avgData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      </TabsContent>

      <TabsContent value="losses" className="space-y-6 mt-6">
        {lossMetrics && lossMetrics.totalLosses > 0 ? (
          <>
            {/* Loss Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-border/50 loss-glow" data-testid="loss-metric-total">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                        Total Losses
                      </p>
                      <p className="text-3xl font-mono font-bold mt-2 text-destructive">
                        {lossMetrics.totalLosses}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {((lossMetrics.totalLosses / stats.total_trades) * 100).toFixed(1)}% of trades
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-destructive/10">
                      <TrendingDown className="w-6 h-6 text-destructive" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 loss-glow" data-testid="loss-metric-streak">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                        Longest Losing Streak
                      </p>
                      <p className="text-3xl font-mono font-bold mt-2 text-destructive">
                        {lossMetrics.longestStreak}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Consecutive losses
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-destructive/10">
                      <AlertTriangle className="w-6 h-6 text-destructive" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 loss-glow" data-testid="loss-metric-avg">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                        Average Loss
                      </p>
                      <p className="text-3xl font-mono font-bold mt-2 text-destructive">
                        ${Math.abs(stats.average_loss).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Per losing trade
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-destructive/10">
                      <TrendingDown className="w-6 h-6 text-destructive" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Worst Performing Pairs */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="font-heading">Worst Performing Currency Pairs</CardTitle>
              </CardHeader>
              <CardContent>
                {lossMetrics.lossByPair.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={lossMetrics.lossByPair}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="pair" 
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: '12px' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                        formatter={(value) => [`$${value.toFixed(2)}`, 'Total Loss']}
                      />
                      <Bar dataKey="total" fill="hsl(var(--destructive))" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No loss data by currency pair</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Losses Table */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="font-heading">Recent Losing Trades</CardTitle>
              </CardHeader>
              <CardContent>
                {lossMetrics.recentLosses.length > 0 ? (
                  <div className="space-y-3">
                    {lossMetrics.recentLosses.map((trade) => (
                      <Card key={trade.id} className="border-destructive/30 bg-destructive/5" data-testid={`recent-loss-${trade.id}`}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-2 rounded-lg bg-destructive/10">
                                <TrendingDown className="w-5 h-5 text-destructive" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-mono font-bold text-lg">{trade.currency_pair}</h3>
                                  <span className="text-sm text-muted-foreground">
                                    {trade.direction.toUpperCase()}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Exit: {new Date(trade.exit_time).toLocaleDateString()} at {trade.exit_price}
                                </p>
                                {trade.strategy && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Strategy: {trade.strategy}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-xl font-mono font-bold text-destructive">
                                ${trade.profit_loss.toFixed(2)}
                              </p>
                              <p className="text-sm text-destructive">
                                {trade.profit_loss_pct?.toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No recent losses</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Loss Insights */}
            <Card className="border-border/50 bg-destructive/5">
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Loss Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-destructive">•</span>
                    <p>
                      Your worst trade lost <span className="font-mono font-bold text-destructive">${Math.abs(stats.worst_trade).toFixed(2)}</span>. 
                      Consider reviewing your risk management for similar setups.
                    </p>
                  </div>
                  {lossMetrics.longestStreak > 2 && (
                    <div className="flex items-start gap-2">
                      <span className="text-destructive">•</span>
                      <p>
                        You experienced a losing streak of <span className="font-mono font-bold">{lossMetrics.longestStreak}</span> trades. 
                        Consider taking a break or reviewing your strategy after consecutive losses.
                      </p>
                    </div>
                  )}
                  {stats.average_loss < -50 && (
                    <div className="flex items-start gap-2">
                      <span className="text-destructive">•</span>
                      <p>
                        Your average loss is significant. Tightening stop-loss levels or reducing position sizes might help manage risk better.
                      </p>
                    </div>
                  )}
                  {lossMetrics.lossByPair.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-destructive">•</span>
                      <p>
                        <span className="font-mono font-bold">{lossMetrics.lossByPair[0].pair}</span> has been your most challenging pair. 
                        Consider avoiding it temporarily or adjusting your approach for this instrument.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="border-border/50">
            <CardContent className="pt-12 pb-12">
              <div className="text-center text-muted-foreground">
                <Award className="w-16 h-16 mx-auto mb-4 text-primary" />
                <p className="text-lg font-semibold">Perfect Record!</p>
                <p className="mt-2">You haven't recorded any losses yet. Keep up the excellent trading!</p>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>
      </Tabs>
    </motion.div>
  );
}