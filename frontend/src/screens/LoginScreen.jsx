import { useState } from 'react';
import { GitBranch, AlertCircle, Eye, EyeOff, Lock, Zap } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center dark bg-[hsl(280,45%,4.5%)] p-4 relative overflow-hidden">
      {/* Deep space ambient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] right-[-10%] w-[55%] h-[55%] rounded-full bg-purple-900/20 blur-[120px]" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[55%] h-[55%] rounded-full bg-pink-900/15 blur-[120px]" />
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(rgba(168,85,247,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.04) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo hero */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-700 shadow-2xl shadow-primary/30 mb-4">
            <GitBranch className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-1">GitMini</h1>
          <p className="text-slate-400 text-sm">Enterprise Source Control powered by <span className="text-primary font-semibold">PostgreSQL</span></p>
        </div>

        {/* Card */}
        <div className="glass-card p-8 animate-slide-up" style={{ animationDelay: '80ms' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Demo account selector */}
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm font-medium flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-primary" /> Demo Account
              </Label>
              <Select value={username} onValueChange={setUsername}>
                <SelectTrigger className="h-11 bg-slate-900/60 border-slate-700 text-white hover:border-primary/40 focus:border-primary/60 transition-colors">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent className="dark bg-slate-900 border-slate-700">
                  {demoUsers.map((user) => (
                    <SelectItem key={user.username} value={user.username} className="text-slate-200 focus:bg-primary/20 focus:text-primary">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary">
                          {user.username[0].toUpperCase()}
                        </div>
                        {user.label} <span className="text-slate-500">@{user.username}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm font-medium flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-slate-500" /> Password
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="gitmini_password"
                  className="h-11 bg-slate-900/60 border-slate-700 text-white pr-10 hover:border-primary/40 focus:border-primary/60 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {loginError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {loginError}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-sm font-bold elastic-transition hover:scale-[1.02] active:scale-[0.98] bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in...
                </span>
              ) : 'Sign In to Workspace'}
            </Button>
          </form>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-600 mt-6 animate-slide-up" style={{ animationDelay: '160ms' }}>
          Protected by Row-Level Security & RBAC · GitMini v1.0
        </p>
      </div>
    </div>
  );
}