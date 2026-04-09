import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function LoginPage() {
  const { login, isLoggingIn } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email required';
    if (!form.password) e.password = 'Password required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) login(form);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Welcome back</h2>
        <p className="text-dark-400 mt-1">Sign in to your MeterFlow account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@company.com"
          icon={Mail}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={errors.email}
          autoComplete="email"
        />

        <div>
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            icon={Lock}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={errors.password}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-dark-400 hover:text-white"
            style={{ position: 'relative', float: 'right', marginTop: '-2rem', marginRight: '0.75rem' }}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="rounded border-dark-600 bg-dark-800 text-brand-600" />
            <span className="text-sm text-dark-400">Remember me</span>
          </label>
          <Link to="/forgot-password" className="text-sm text-brand-400 hover:text-brand-300">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full justify-center" loading={isLoggingIn} size="lg">
          Sign in
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-dark-400 text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">
            Create one free
          </Link>
        </p>
      </div>

      {/* Demo credentials */}
      <div className="mt-6 p-4 bg-dark-800/50 border border-dark-700 rounded-xl">
        <p className="text-xs text-dark-400 font-medium mb-2">Demo credentials</p>
        <p className="text-xs text-dark-300 font-mono">demo@meterflow.io / Demo1234</p>
      </div>
    </motion.div>
  );
}
