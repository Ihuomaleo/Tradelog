import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Target, Award } from 'lucide-react';
import api from '@/api/axios';
import { toast } from 'sonner';

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/analytics/stats');
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
      data-testid="analytics-page"
    >
      <h1 className="text-4xl font-heading font-bold">Analytics</h1>

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
    </motion.div>
  );
}