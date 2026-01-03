import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload } from 'lucide-react';
import api from '@/api/axios';
import { toast } from 'sonner';

export default function AddTrade() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [formData, setFormData] = useState({
    currency_pair: '',
    direction: 'long',
    entry_price: '',
    exit_price: '',
    lot_size: '',
    entry_time: new Date().toISOString().slice(0, 16),
    exit_time: '',
    stop_loss: '',
    take_profit: '',
    notes: '',
    strategy: ''
  });
  const [screenshot, setScreenshot] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value) => {
    setFormData(prev => ({ ...prev, direction: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tradeData = {
        currency_pair: formData.currency_pair,
        direction: formData.direction,
        entry_price: parseFloat(formData.entry_price),
        exit_price: formData.exit_price ? parseFloat(formData.exit_price) : null,
        lot_size: parseFloat(formData.lot_size),
        entry_time: new Date(formData.entry_time).toISOString(),
        exit_time: formData.exit_time ? new Date(formData.exit_time).toISOString() : null,
        stop_loss: formData.stop_loss ? parseFloat(formData.stop_loss) : null,
        take_profit: formData.take_profit ? parseFloat(formData.take_profit) : null,
        notes: formData.notes || null,
        strategy: formData.strategy || null
      };

      const response = await api.post('/trades', tradeData);
      
      // Upload screenshot if provided
      if (screenshot) {
        setUploadingScreenshot(true);
        const formDataFile = new FormData();
        formDataFile.append('file', screenshot);
        await api.post(`/trades/${response.data.id}/upload-screenshot`, formDataFile, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      toast.success('Trade added successfully!');
      navigate('/trades');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add trade');
    } finally {
      setLoading(false);
      setUploadingScreenshot(false);
    }
  };

  const currencyPairs = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
    'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'AUDJPY', 'CADJPY'
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      data-testid="add-trade-page"
    >
      <h1 className="text-4xl font-heading font-bold mb-6">Add Trade</h1>

      <Card className="border-border/50 max-w-3xl">
        <CardHeader>
          <CardTitle className="font-heading">Trade Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Entry Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Entry Details</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Currency Pair</label>
                  <Select onValueChange={(value) => setFormData(prev => ({ ...prev, currency_pair: value }))} required>
                    <SelectTrigger data-testid="currency-pair-select">
                      <SelectValue placeholder="Select pair" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyPairs.map(pair => (
                        <SelectItem key={pair} value={pair}>{pair}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Direction</label>
                  <Select value={formData.direction} onValueChange={handleSelectChange}>
                    <SelectTrigger data-testid="direction-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="long">Long</SelectItem>
                      <SelectItem value="short">Short</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Entry Price</label>
                  <Input
                    type="number"
                    step="0.00001"
                    name="entry_price"
                    value={formData.entry_price}
                    onChange={handleChange}
                    placeholder="1.08500"
                    required
                    data-testid="entry-price-input"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Lot Size</label>
                  <Input
                    type="number"
                    step="0.01"
                    name="lot_size"
                    value={formData.lot_size}
                    onChange={handleChange}
                    placeholder="0.10"
                    required
                    data-testid="lot-size-input"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Entry Time</label>
                  <Input
                    type="datetime-local"
                    name="entry_time"
                    value={formData.entry_time}
                    onChange={handleChange}
                    required
                    data-testid="entry-time-input"
                  />
                </div>
              </div>
            </div>

            {/* Risk Management */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Risk Management</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Stop Loss</label>
                  <Input
                    type="number"
                    step="0.00001"
                    name="stop_loss"
                    value={formData.stop_loss}
                    onChange={handleChange}
                    placeholder="1.08000"
                    data-testid="stop-loss-input"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Take Profit</label>
                  <Input
                    type="number"
                    step="0.00001"
                    name="take_profit"
                    value={formData.take_profit}
                    onChange={handleChange}
                    placeholder="1.09500"
                    data-testid="take-profit-input"
                  />
                </div>
              </div>
            </div>

            {/* Exit Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Exit Details (Optional)</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Exit Price</label>
                  <Input
                    type="number"
                    step="0.00001"
                    name="exit_price"
                    value={formData.exit_price}
                    onChange={handleChange}
                    placeholder="1.09250"
                    data-testid="exit-price-input"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Exit Time</label>
                  <Input
                    type="datetime-local"
                    name="exit_time"
                    value={formData.exit_time}
                    onChange={handleChange}
                    data-testid="exit-time-input"
                  />
                </div>
              </div>
            </div>

            {/* Notes & Strategy */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Strategy</label>
                <Input
                  type="text"
                  name="strategy"
                  value={formData.strategy}
                  onChange={handleChange}
                  placeholder="e.g., Breakout, Trend Following"
                  data-testid="strategy-input"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Notes</label>
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Add your trade notes..."
                  rows={3}
                  data-testid="notes-input"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Screenshot</label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="screenshot-upload"
                    data-testid="screenshot-input"
                  />
                  <label htmlFor="screenshot-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {screenshot ? screenshot.name : 'Click to upload screenshot'}
                    </p>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                className="profit-glow"
                disabled={loading || uploadingScreenshot}
                data-testid="submit-trade-btn"
              >
                {loading ? (uploadingScreenshot ? 'Uploading screenshot...' : 'Adding trade...') : 'Add Trade'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/trades')}
                data-testid="cancel-trade-btn"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}