import { useState } from 'react';
import { User, Lock, Bell, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { PlanBadge } from '../components/ui/Badge';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { updateProfile, changePassword } = useAuth();
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    company: user?.company || '',
    website: user?.website || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [pwError, setPwError] = useState('');

  const handleProfileSave = () => {
    updateProfile(profileForm);
  };

  const handlePasswordChange = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPwError('Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPwError('Password must be at least 8 characters');
      return;
    }
    setPwError('');
    changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-dark-400 mt-1">Manage your account preferences</p>
      </div>

      {/* Profile */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-brand-600/10 border border-brand-500/20 flex items-center justify-center">
            <User className="w-4 h-4 text-brand-400" />
          </div>
          <h3 className="text-base font-semibold text-white">Profile</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-dark-900 rounded-xl border border-dark-700">
            <div className="w-12 h-12 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center">
              <span className="text-lg font-bold text-brand-400">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-white">{user?.name}</p>
              <p className="text-sm text-dark-400">{user?.email}</p>
              <div className="mt-1">
                <PlanBadge plan={user?.subscriptionPlan} />
              </div>
            </div>
          </div>

          <Input
            label="Full Name"
            value={profileForm.name}
            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
          />
          <Input
            label="Company"
            placeholder="Your company name"
            value={profileForm.company}
            onChange={(e) => setProfileForm({ ...profileForm, company: e.target.value })}
          />
          <Input
            label="Website"
            placeholder="https://yourwebsite.com"
            value={profileForm.website}
            onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
          />
          <Button onClick={handleProfileSave}>Save Profile</Button>
        </div>
      </motion.div>

      {/* Password */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <Lock className="w-4 h-4 text-yellow-400" />
          </div>
          <h3 className="text-base font-semibold text-white">Change Password</h3>
        </div>

        <div className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
          />
          <Input
            label="New Password"
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            error={pwError}
          />
          <Button onClick={handlePasswordChange} variant="secondary">
            Update Password
          </Button>
        </div>
      </motion.div>

      {/* Account info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-dark-700 border border-dark-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-dark-400" />
          </div>
          <h3 className="text-base font-semibold text-white">Account Info</h3>
        </div>
        <div className="space-y-3 text-sm">
          {[
            { label: 'User ID', value: user?._id },
            { label: 'Tenant ID', value: user?.tenantId },
            { label: 'Role', value: user?.role },
            { label: 'Plan', value: user?.subscriptionPlan },
          ].map((item) => (
            <div key={item.label} className="flex justify-between py-2 border-b border-dark-700 last:border-0">
              <span className="text-dark-400">{item.label}</span>
              <span className="text-dark-200 font-mono text-xs">{item.value}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
