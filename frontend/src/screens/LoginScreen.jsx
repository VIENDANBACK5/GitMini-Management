import { GitBranch, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Form } from '../components/ui/simple-form';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';

export function LoginScreen({ onLogin, loading, loginError, demoUsers }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background blobs for aesthetics */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />

      <Card className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border-slate-800 shadow-2xl relative z-10">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
              <GitBranch className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">GitMini</CardTitle>
          <CardDescription className="text-slate-400">
            Enterprise Source Control powered by PostgreSQL
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form layout="vertical" initialValues={{ username: 'alice' }} onFinish={onLogin} className="space-y-4">
            <Form.Item 
              label={<span className="text-slate-300 text-sm font-medium">Demo Account</span>} 
              name="username" 
              rules={[{ required: true }]}
            >
              <Select
                className="w-full h-11 bg-slate-800 border-slate-700 rounded-md"
                options={demoUsers.map((user) => ({
                  value: user.username,
                  label: `${user.label} (@${user.username})`,
                }))}
              />
            </Form.Item>
            <Form.Item 
              label={<span className="text-slate-300 text-sm font-medium">Password</span>} 
              name="password" 
              rules={[{ required: true, message: 'Enter the demo password' }]}
            >
              <Input.Password 
                className="h-11 bg-slate-800 border-slate-700 rounded-md text-white" 
                placeholder="gitmini_password" 
              />
            </Form.Item>
            
            {loginError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-md flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                {loginError}
              </div>
            )}

            <Button type="submit" className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20" loading={loading}>
              Sign In to Workspace
            </Button>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 border-t border-slate-800 pt-6">
          <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest font-bold">
            System Status: PostgreSQL 12 · HA Active
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
