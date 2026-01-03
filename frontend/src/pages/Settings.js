import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Palette, Trash2, Moon, Sun, Monitor, AlertTriangle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import api from '@/api/axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [colorTheme, setColorTheme] = useState(localStorage.getItem('colorTheme') || 'neon-green');
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchUser();
    applyTheme();
  }, []);

  useEffect(() => {
    applyTheme();
  }, [theme, colorTheme]);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
      setName(response.data.name);
    } catch (error) {
      toast.error('Failed to load user data');
    }
  };

  const applyTheme = () => {
    const root = document.documentElement;
    
    // Apply light/dark mode
    if (theme === 'light') {
      root.style.setProperty('--background', '0 0% 100%');
      root.style.setProperty('--foreground', '240 10% 3.9%');
      root.style.setProperty('--card', '0 0% 100%');
      root.style.setProperty('--card-foreground', '240 10% 3.9%');
      root.style.setProperty('--muted', '240 4.8% 95.9%');
      root.style.setProperty('--muted-foreground', '240 3.8% 46.1%');
      root.style.setProperty('--border', '240 5.9% 90%');
    } else {
      root.style.setProperty('--background', '240 10% 3.9%');
      root.style.setProperty('--foreground', '0 0% 98%');
      root.style.setProperty('--card', '240 10% 9.8%');
      root.style.setProperty('--card-foreground', '0 0% 98%');
      root.style.setProperty('--muted', '240 3.7% 15.9%');
      root.style.setProperty('--muted-foreground', '240 5% 64.9%');
      root.style.setProperty('--border', '240 3.7% 15.9%');
    }

    // Apply color theme
    const themes = {
      'neon-green': { primary: '142 76% 51%', accent: '217 91% 60%', destructive: '0 84.2% 60.2%' },
      'electric-blue': { primary: '217 91% 60%', accent: '142 76% 51%', destructive: '0 84.2% 60.2%' },
      'cyber-purple': { primary: '271 81% 56%', accent: '142 76% 51%', destructive: '0 84.2% 60.2%' },
      'sunset-orange': { primary: '25 95% 53%', accent: '142 76% 51%', destructive: '0 84.2% 60.2%' },
      'ocean-teal': { primary: '173 58% 39%', accent: '217 91% 60%', destructive: '0 84.2% 60.2%' }
    };

    const selectedTheme = themes[colorTheme] || themes['neon-green'];
    root.style.setProperty('--primary', selectedTheme.primary);
    root.style.setProperty('--accent', selectedTheme.accent);
    root.style.setProperty('--destructive', selectedTheme.destructive);

    localStorage.setItem('theme', theme);
    localStorage.setItem('colorTheme', colorTheme);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Note: You'll need to add this endpoint to backend
      await api.put('/auth/update-profile', { name });
      toast.success('Profile updated successfully!');
      fetchUser();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    
    try {
      await api.delete('/auth/delete-account');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      toast.success('Account deleted successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to delete account');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
      data-testid="settings-page"
    >
      <h1 className="text-4xl font-heading font-bold">Settings</h1>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="appearance" data-testid="tab-appearance">
            <Palette className="w-4 h-4 mr-2" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="danger" data-testid="tab-danger">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Danger Zone
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6 mt-6">
          <Card className="border-border/50 max-w-2xl">
            <CardHeader>
              <CardTitle className="font-heading">Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="mt-2"
                    data-testid="name-input"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={user?.email || ''}
                    disabled
                    className="mt-2 opacity-50"
                    data-testid="email-input"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <Label>Member Since</Label>
                  <p className="text-sm text-muted-foreground mt-2">
                    {user ? new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : ''}
                  </p>
                </div>

                <Button type="submit" disabled={loading} data-testid="update-profile-btn">
                  {loading ? 'Updating...' : 'Update Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6 mt-6">
          <Card className="border-border/50 max-w-2xl">
            <CardHeader>
              <CardTitle className="font-heading">Theme Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Light/Dark Mode</Label>
                <div className="flex items-center gap-4">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    onClick={() => setTheme('light')}
                    className="flex-1"
                    data-testid="theme-light-btn"
                  >
                    <Sun className="w-4 h-4 mr-2" />
                    Light
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    onClick={() => setTheme('dark')}
                    className="flex-1"
                    data-testid="theme-dark-btn"
                  >
                    <Moon className="w-4 h-4 mr-2" />
                    Dark
                  </Button>
                  <Button
                    variant={theme === 'system' ? 'default' : 'outline'}
                    onClick={() => setTheme('system')}
                    className="flex-1"
                    data-testid="theme-system-btn"
                  >
                    <Monitor className="w-4 h-4 mr-2" />
                    System
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <Label htmlFor="color-theme">Color Theme</Label>
                <Select value={colorTheme} onValueChange={setColorTheme}>
                  <SelectTrigger data-testid="color-theme-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="neon-green">⚡ Neon Green (Default)</SelectItem>
                    <SelectItem value="electric-blue">💙 Electric Blue</SelectItem>
                    <SelectItem value="cyber-purple">💜 Cyber Purple</SelectItem>
                    <SelectItem value="sunset-orange">🧡 Sunset Orange</SelectItem>
                    <SelectItem value="ocean-teal">💚 Ocean Teal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 rounded-lg border border-border bg-card">
                <p className="text-sm text-muted-foreground mb-3">Preview:</p>
                <div className="flex gap-2">
                  <div className="h-12 w-12 rounded-lg" style={{ backgroundColor: 'hsl(var(--primary))' }} />
                  <div className="h-12 w-12 rounded-lg" style={{ backgroundColor: 'hsl(var(--accent))' }} />
                  <div className="h-12 w-12 rounded-lg" style={{ backgroundColor: 'hsl(var(--destructive))' }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="space-y-6 mt-6">
          <Card className="border-destructive/50 max-w-2xl">
            <CardHeader>
              <CardTitle className="font-heading text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/5">
                <h3 className="font-semibold mb-2">Delete Account</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Once you delete your account, there is no going back. All your trades, analytics, and data will be permanently deleted.
                </p>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" data-testid="delete-account-btn">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account
                        and remove all your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        className="bg-destructive text-destructive-foreground"
                        disabled={deleteLoading}
                      >
                        {deleteLoading ? 'Deleting...' : 'Delete Account'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}