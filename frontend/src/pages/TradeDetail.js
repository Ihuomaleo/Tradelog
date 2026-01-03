import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, AlertCircle } from 'lucide-react';
import api from '@/api/axios';
import { toast } from 'sonner';

export default function TradeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrade();
  }, [id]);

  const fetchTrade = async () => {
    try {
      const response = await api.get(`/trades/${id}`);
      setTrade(response.data);
    } catch (error) {
      toast.error('Failed to load trade details');
      navigate('/trades');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="trade-detail-loading">
        <div className="text-muted-foreground">Loading trade...</div>
      </div>
    );
  }

  if (!trade) return null;

  const DetailRow = ({ label, value, mono = false }) => (
    <div className="flex justify-between py-3 border-b border-border/50">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
      data-testid="trade-detail-page"
    >
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/trades')} data-testid="back-to-trades-btn">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-4xl font-heading font-bold">{trade.currency_pair}</h1>
        <Badge variant={trade.direction === 'long' ? 'default' : 'secondary'}>
          {trade.direction.toUpperCase()}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trade Information */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-heading">Trade Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <DetailRow label="Direction" value={trade.direction.toUpperCase()} />
              <DetailRow label="Entry Price" value={trade.entry_price} mono />
              <DetailRow label="Exit Price" value={trade.exit_price || 'Open'} mono />
              <DetailRow label="Lot Size" value={trade.lot_size} mono />
              <DetailRow 
                label="Entry Time" 
                value={new Date(trade.entry_time).toLocaleString()} 
              />
              {trade.exit_time && (
                <DetailRow 
                  label="Exit Time" 
                  value={new Date(trade.exit_time).toLocaleString()} 
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance */}
        <Card className={`border-border/50 ${
          trade.profit_loss !== null && trade.profit_loss >= 0 ? 'profit-glow' : 'loss-glow'
        }`}>
          <CardHeader>
            <CardTitle className="font-heading">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {trade.profit_loss !== null ? (
              <div className="space-y-4">
                <div className="text-center py-6">
                  {trade.profit_loss >= 0 ? (
                    <TrendingUp className="w-12 h-12 mx-auto text-primary mb-3" />
                  ) : (
                    <TrendingDown className="w-12 h-12 mx-auto text-destructive mb-3" />
                  )}
                  <p className={`text-4xl font-mono font-bold ${
                    trade.profit_loss >= 0 ? 'text-primary' : 'text-destructive'
                  }`}>
                    {trade.profit_loss >= 0 ? '+' : ''}${trade.profit_loss.toFixed(2)}
                  </p>
                  <p className={`text-lg mt-2 ${
                    trade.profit_loss >= 0 ? 'text-primary' : 'text-destructive'
                  }`}>
                    {trade.profit_loss_pct >= 0 ? '+' : ''}{trade.profit_loss_pct?.toFixed(2)}%
                  </p>
                </div>
                
                <div className="space-y-1">
                  {trade.risk_reward && (
                    <DetailRow label="Risk:Reward" value={`1:${trade.risk_reward.toFixed(2)}`} mono />
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Trade still open</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk Management */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-heading">Risk Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <DetailRow 
                label="Stop Loss" 
                value={trade.stop_loss || 'Not set'} 
                mono 
              />
              <DetailRow 
                label="Take Profit" 
                value={trade.take_profit || 'Not set'} 
                mono 
              />
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-heading">Additional Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trade.strategy && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Strategy</p>
                  <Badge variant="outline">{trade.strategy}</Badge>
                </div>
              )}
              
              {trade.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm bg-card p-3 rounded-lg border border-border/50">
                    {trade.notes}
                  </p>
                </div>
              )}

              {trade.tagged_events && trade.tagged_events.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Economic Events
                  </p>
                  <div className="space-y-1">
                    {trade.tagged_events.map((event, idx) => (
                      <Badge key={idx} variant="destructive" className="mr-1 mb-1">
                        {event}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Screenshot */}
      {trade.screenshot_url && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-heading">Screenshot</CardTitle>
          </CardHeader>
          <CardContent>
            <img 
              src={trade.screenshot_url} 
              alt="Trade screenshot" 
              className="w-full rounded-lg border border-border/50"
              data-testid="trade-screenshot"
            />
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}