import { useState } from 'react';
import { GitBranch, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function LoginScreen({ onLogin, loading, loginError, demoUsers }) {
  const [username, setUsername] = useState('alice');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin({ username, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-xl opacity-70" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-70" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-70" />

      <Card className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border-slate-800 shadow-2xl relative z-10">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
              <GitBranch className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-white">GitMini</CardTitle>
          <CardDescription className="text-slate-400">
            Enterprise Source Control powered by PostgreSQL
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm font-medium">Demo Account</Label>
              <Select value={username} onValueChange={setUsername}>
                <SelectTrigger className="h-11 bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {demoUsers.map((user) => (
                    <SelectItem key={user.username} value={user.username}>
                      {user.label} (@{user.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 text-sm font-medium">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="gitmini_password"
                  className="h-11 bg-slate-800 border-slate-700 text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-md flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                {loginError}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full h-11 text-base font-semibold bg-white text-black hover:bg-white/90">
              {loading ? 'Signing in...' : 'Sign In to Workspace'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}