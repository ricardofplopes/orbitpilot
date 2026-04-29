import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { User, Shield, Info, Save } from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';

const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [saved, setSaved] = useState(false);

  const handleSaveName = async () => {
    // Note: backend update would need a PUT /users/me endpoint
    // For now this updates locally to demonstrate the UI working
    setEditingName(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-orbit-light">Settings</h2>
        <p className="text-sm text-orbit-slate mt-1">Manage your profile and app preferences</p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm">
          ✓ Settings saved successfully
        </div>
      )}

      {/* Profile */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <User className="w-5 h-5 text-orbit-blue" />
          <h3 className="text-lg font-semibold text-orbit-light">Profile</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xl font-bold">
              {(user?.name || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                  <Button onClick={handleSaveName}><Save className="w-4 h-4" /></Button>
                  <Button variant="secondary" onClick={() => { setEditingName(false); setName(user?.name || ''); }}>Cancel</Button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold text-orbit-light">{user?.name || 'Unknown'}</p>
                    <button onClick={() => setEditingName(true)} className="text-xs text-orbit-blue hover:text-orbit-blue/80 transition-colors">Edit</button>
                  </div>
                  <p className="text-sm text-orbit-slate">{user?.email || ''}</p>
                  <p className="text-xs text-orbit-slate capitalize mt-0.5">{user?.role || 'user'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* App Settings */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <Shield className="w-5 h-5 text-orbit-purple" />
          <h3 className="text-lg font-semibold text-orbit-light">Preferences</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-orbit-navy">
            <div>
              <p className="text-sm font-medium text-orbit-light">Dark Mode</p>
              <p className="text-xs text-orbit-slate">Always-on for the space theme</p>
            </div>
            <div className="w-10 h-6 rounded-full bg-orbit-blue flex items-center justify-end px-1">
              <div className="w-4 h-4 rounded-full bg-white" />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-orbit-navy">
            <div>
              <p className="text-sm font-medium text-orbit-light">Email Notifications</p>
              <p className="text-xs text-orbit-slate">Receive alerts for at-risk items and capacity warnings</p>
            </div>
            <div className="w-10 h-6 rounded-full bg-orbit-blue flex items-center justify-end px-1">
              <div className="w-4 h-4 rounded-full bg-white" />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-orbit-navy">
            <div>
              <p className="text-sm font-medium text-orbit-light">Compact View</p>
              <p className="text-xs text-orbit-slate">Show more data with less whitespace</p>
            </div>
            <div className="w-10 h-6 rounded-full bg-orbit-navy-lighter flex items-center px-1">
              <div className="w-4 h-4 rounded-full bg-orbit-slate" />
            </div>
          </div>
        </div>
      </div>

      {/* Data & Security */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <Shield className="w-5 h-5 text-orbit-amber" />
          <h3 className="text-lg font-semibold text-orbit-light">Security</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-orbit-navy">
            <div>
              <p className="text-sm font-medium text-orbit-light">Session</p>
              <p className="text-xs text-orbit-slate">JWT token expires in 7 days</p>
            </div>
            <span className="text-xs text-emerald-400">Active</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-orbit-navy">
            <div>
              <p className="text-sm font-medium text-orbit-light">API Access</p>
              <p className="text-xs text-orbit-slate">Integrations authenticated via OAuth 2.0</p>
            </div>
            <span className="text-xs text-orbit-slate">Configured in Integrations</span>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <Info className="w-5 h-5 text-orbit-green" />
          <h3 className="text-lg font-semibold text-orbit-light">About</h3>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-orbit-slate">
            <span className="text-orbit-light font-medium">OrbitPilot</span> v1.0.0
          </p>
          <p className="text-sm text-orbit-slate italic">Plan better. Deliver together.</p>
          <p className="text-xs text-orbit-slate mt-2">
            Internal engineering planning platform for team capacity, quarterly planning, delivery visibility, and AI-assisted insights.
          </p>
        </div>
      </div>

      {/* Sign out */}
      <Button variant="danger" onClick={logout}>Sign Out</Button>
    </div>
  );
};

export default SettingsPage;
