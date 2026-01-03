import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Eye, TrendingUp, TrendingDown, Search, Filter } from 'lucide-react';
import api from '@/api/axios';
import { toast } from 'sonner';

export default function Trades() {
  const [trades, setTrades] = useState([]);
  const [filteredTrades, setFilteredTrades] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrades();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = trades.filter(trade =>
        trade.currency_pair.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (trade.strategy && trade.strategy.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredTrades(filtered);
    } else {
      setFilteredTrades(trades);
    }
  }, [searchTerm, trades]);

  const fetchTrades = async () => {
    try {
      const response = await api.get('/trades');
      setTrades(response.data);
      setFilteredTrades(response.data);
    } catch (error) {
      toast.error('Failed to load trades');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="trades-loading">
        <div className="text-muted-foreground">Loading trades...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
      data-testid="trades-page"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-heading font-bold">Trade History</h1>
        <Link to="/trades/add">
          <Button className="profit-glow" data-testid="add-trade-header-btn">
            Add Trade
          </Button>
        </Link>
      </div>

      {/* Search and Filter */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by pair or strategy..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="trades-search-input"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trades Table */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          {filteredTrades.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No trades found</p>
              <p className="text-sm mt-2">Start by adding your first trade</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTrades.map((trade) => (
                <motion.div
                  key={trade.id}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                  data-testid={`trade-row-${trade.id}`}
                >
                  <Link to={`/trades/${trade.id}`}>
                    <Card className="border-border/50 hover:border-primary/50 transition-colors cursor-pointer">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${
                              trade.direction === 'long' ? 'bg-primary/10' : 'bg-accent/10'
                            }`}>
                              {trade.direction === 'long' ? (
                                <TrendingUp className="w-5 h-5 text-primary" />
                              ) : (
                                <TrendingDown className="w-5 h-5 text-accent" />
                              )}
                            </div>
                            
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-mono font-bold text-lg">{trade.currency_pair}</h3>
                                <Badge variant={trade.direction === 'long' ? 'default' : 'secondary'}>
                                  {trade.direction.toUpperCase()}
                                </Badge>
                                {trade.strategy && (
                                  <Badge variant="outline">{trade.strategy}</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                Entry: {new Date(trade.entry_time).toLocaleDateString()} at {trade.entry_price}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            {trade.profit_loss !== null && trade.profit_loss !== undefined ? (
                              <>
                                <p className={`text-xl font-mono font-bold ${
                                  trade.profit_loss >= 0 ? 'text-primary' : 'text-destructive'
                                }`}>
                                  {trade.profit_loss >= 0 ? '+' : ''}
                                  ${trade.profit_loss.toFixed(2)}
                                </p>
                                <p className={`text-sm ${
                                  trade.profit_loss >= 0 ? 'text-primary' : 'text-destructive'
                                }`}>
                                  {trade.profit_loss_pct >= 0 ? '+' : ''}
                                  {trade.profit_loss_pct?.toFixed(2)}%
                                </p>
                              </>
                            ) : (
                              <Badge variant="outline">Open</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}