import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/api/axios';
import { toast } from 'sonner';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [equityCurve, setEquityCurve] = useState([]);
  const [viewType, setViewType] = useState('$'); // '$' or '%'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, equityRes] = await Promise.all([
        api.get('/analytics/stats'),
        api.get('/analytics/equity-curve')
      ]);
      setStats(statsRes.data);
      setEquityCurve(equityRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="dashboard-loading">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Win Rate',
      value: `${stats?.win_rate?.toFixed(1) || 0}%`,
      icon: Target,
      color: 'text-primary',
      testId: 'stat-win-rate'
    },
    {
      title: 'Total P&L',
      value: `$${(stats?.total_profit_loss || 0).toFixed(2)}`,
      icon: stats?.total_profit_loss >= 0 ? TrendingUp : TrendingDown,
      color: stats?.total_profit_loss >= 0 ? 'text-primary' : 'text-destructive',
      testId: 'stat-total-pl'
    },
    {
      title: 'Total Trades',
      value: stats?.total_trades || 0,
      icon: Activity,
      color: 'text-accent',
      testId: 'stat-total-trades'
    },
    {
      title: 'Avg Win',
      value: `$${(stats?.average_win || 0).toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-primary',
      testId: 'stat-avg-win'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
      data-testid="dashboard-page"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-heading font-bold">Dashboard</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="border-border/50" data-testid={stat.testId}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                      {stat.title}
                    </p>
                    <p className={`text-2xl font-mono font-bold mt-2 ${stat.color}`}>
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg bg-card ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Equity Curve */}
      <Card className="border-border/50 col-span-2" data-testid="equity-curve-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-heading">Equity Curve</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={viewType === '$' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewType('$')}
                data-testid="equity-view-dollar"
              >
                Growth in $
              </Button>
              <Button
                variant={viewType === '%' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewType('%')}
                data-testid="equity-view-percent"
              >
                Growth in %
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {equityCurve.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={equityCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
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
                <Line 
                  type="monotone" 
                  dataKey={viewType === '$' ? 'balance' : 'balance_pct'}
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <p>No trade data yet</p>
                <p className="text-sm mt-2">Start adding trades to see your equity curve</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}