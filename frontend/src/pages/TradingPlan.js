import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, Calendar, Trophy, CheckCircle2, Plus, Trash2, Sparkles } from 'lucide-react';
import api from '@/api/axios';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

export default function TradingPlan() {
  const [goals, setGoals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    target_amount: '',
    target_date: '',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [goalsRes, statsRes] = await Promise.all([
        api.get('/goals'),
        api.get('/analytics/stats')
      ]);
      setGoals(goalsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Failed to load trading plan');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    
    try {
      await api.post('/goals', {
        title: newGoal.title,
        target_amount: parseFloat(newGoal.target_amount),
        target_date: newGoal.target_date,
        description: newGoal.description
      });
      
      toast.success('Goal added successfully!');
      setShowAddGoal(false);
      setNewGoal({ title: '', target_amount: '', target_date: '', description: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to add goal');
    }
  };

  const handleDeleteGoal = async (goalId) => {
    try {
      await api.delete(`/goals/${goalId}`);
      toast.success('Goal deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete goal');
    }
  };

  const handleCompleteGoal = async (goalId) => {
    try {
      await api.put(`/goals/${goalId}/complete`);
      
      // Celebrate!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#3b82f6', '#eab308']
      });
      
      toast.success('🎉 Congratulations! Goal achieved!', {
        duration: 5000
      });
      
      fetchData();
    } catch (error) {
      toast.error('Failed to complete goal');
    }
  };

  const calculateProgress = (goal) => {
    if (!stats) return 0;
    return Math.min((stats.total_profit_loss / goal.target_amount) * 100, 100);
  };

  const getGoalStatus = (goal) => {
    const progress = calculateProgress(goal);
    const daysLeft = Math.ceil((new Date(goal.target_date) - new Date()) / (1000 * 60 * 60 * 24));
    
    if (goal.completed) return 'completed';
    if (progress >= 100) return 'achieved';
    if (daysLeft < 0) return 'expired';
    if (daysLeft <= 7) return 'urgent';
    return 'active';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="trading-plan-loading">
        <div className="text-muted-foreground">Loading trading plan...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
      data-testid="trading-plan-page"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold">Trading Plan & Goals</h1>
          <p className="text-muted-foreground mt-2">Set financial goals and track your progress</p>
        </div>
        <Button 
          onClick={() => setShowAddGoal(!showAddGoal)} 
          className="profit-glow"
          data-testid="add-goal-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Goal
        </Button>
      </div>

      {/* Current Performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Current P&L</p>
                <p className={`text-2xl font-mono font-bold mt-2 ${
                  stats?.total_profit_loss >= 0 ? 'text-primary' : 'text-destructive'
                }`}>
                  ${stats?.total_profit_loss?.toFixed(2) || '0.00'}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Win Rate</p>
                <p className="text-2xl font-mono font-bold mt-2 text-primary">
                  {stats?.win_rate?.toFixed(1) || '0.0'}%
                </p>
              </div>
              <Target className="w-8 h-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Active Goals</p>
                <p className="text-2xl font-mono font-bold mt-2">
                  {goals.filter(g => !g.completed).length}
                </p>
              </div>
              <Trophy className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Goal Form */}
      {showAddGoal && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card className="border-primary/50 profit-glow">
            <CardHeader>
              <CardTitle className="font-heading">Add New Goal</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddGoal} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Goal Title</label>
                    <Input
                      value={newGoal.title}
                      onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                      placeholder="e.g., Reach $10,000 profit"
                      required
                      data-testid="goal-title-input"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Target Amount ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newGoal.target_amount}
                      onChange={(e) => setNewGoal({...newGoal, target_amount: e.target.value})}
                      placeholder="10000"
                      required
                      data-testid="goal-amount-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Target Date</label>
                  <Input
                    type="date"
                    value={newGoal.target_date}
                    onChange={(e) => setNewGoal({...newGoal, target_date: e.target.value})}
                    required
                    data-testid="goal-date-input"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
                  <Textarea
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                    placeholder="Describe your goal and strategy..."
                    rows={3}
                    data-testid="goal-description-input"
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="submit" className="profit-glow" data-testid="submit-goal-btn">
                    Add Goal
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddGoal(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Goals List */}
      {goals.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="pt-12 pb-12">
            <div className="text-center text-muted-foreground">
              <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold">No goals yet</p>
              <p className="mt-2">Start by adding your first trading goal!</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {goals.map((goal) => {
            const progress = calculateProgress(goal);
            const status = getGoalStatus(goal);
            const daysLeft = Math.ceil((new Date(goal.target_date) - new Date()) / (1000 * 60 * 60 * 24));
            
            return (
              <Card 
                key={goal.id} 
                className={`border-border/50 ${
                  status === 'achieved' || status === 'completed' ? 'profit-glow border-primary/50' : ''
                } ${status === 'expired' ? 'opacity-60' : ''}`}
                data-testid={`goal-${goal.id}`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-heading font-bold">{goal.title}</h3>
                        {status === 'completed' && (
                          <Badge className="bg-primary text-primary-foreground">
                            <Trophy className="w-3 h-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                        {status === 'achieved' && !goal.completed && (
                          <Badge className="bg-primary text-primary-foreground animate-pulse">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Goal Achieved!
                          </Badge>
                        )}
                        {status === 'urgent' && (
                          <Badge variant="destructive">Urgent</Badge>
                        )}
                        {status === 'expired' && (
                          <Badge variant="outline">Expired</Badge>
                        )}
                      </div>
                      
                      {goal.description && (
                        <p className="text-sm text-muted-foreground mb-3">{goal.description}</p>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-muted-foreground">Target</p>
                          <p className="font-mono font-bold">${goal.target_amount}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Current</p>
                          <p className="font-mono font-bold">${stats?.total_profit_loss?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Remaining</p>
                          <p className="font-mono font-bold">
                            ${(goal.target_amount - (stats?.total_profit_loss || 0)).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Days Left</p>
                          <p className="font-mono font-bold">
                            {daysLeft > 0 ? daysLeft : 0} days
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-mono font-bold">{progress.toFixed(1)}%</span>
                        </div>
                        <Progress value={progress} className="h-3" />
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      {(status === 'achieved' && !goal.completed) && (
                        <Button
                          size="sm"
                          onClick={() => handleCompleteGoal(goal.id)}
                          className="profit-glow"
                          data-testid={`complete-goal-${goal.id}`}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteGoal(goal.id)}
                        data-testid={`delete-goal-${goal.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Target date: {new Date(goal.target_date).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}