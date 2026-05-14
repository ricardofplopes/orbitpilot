import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { User, Shield, Info, Save, Ruler, Link2 } from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { settings as settingsApi, integrations } from '@/api/services';
import type { JiraField, JiraFieldMapping } from '@/types';

const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [saved, setSaved] = useState(false);

  // T-shirt size map state
  const [tShirtMap, setTShirtMap] = useState<Record<string, number>>({});
  const [tShirtSaving, setTShirtSaving] = useState(false);
  const [tShirtMsg, setTShirtMsg] = useState<string | null>(null);

  // Jira field mapping state
  const [jiraFields, setJiraFields] = useState<JiraField[]>([]);
  const [fieldMap, setFieldMap] = useState<JiraFieldMapping>({});
  const [fieldMapSaving, setFieldMapSaving] = useState(false);
  const [fieldMapMsg, setFieldMapMsg] = useState<string | null>(null);
  const [jiraConnected, setJiraConnected] = useState(false);

  useEffect(() => {
    settingsApi.getTShirtMap().then(setTShirtMap).catch(() => {});
    integrations.getJiraConfig().then((cfg: any) => {
      const isActive = !!cfg?.isActive;
      setJiraConnected(isActive);
      if (isActive) {
        Promise.all([integrations.getJiraFields(), integrations.getJiraFieldMapping()])
          .then(([fields, mapping]) => {
            setJiraFields(fields);
            setFieldMap(mapping);
          })
          .catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const handleSaveName = async () => {
    setEditingName(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSaveTShirtMap = async () => {
    setTShirtSaving(true);
    setTShirtMsg(null);
    try {
      const updated = await settingsApi.updateTShirtMap(tShirtMap);
      setTShirtMap(updated);
      setTShirtMsg('Saved');
      setTimeout(() => setTShirtMsg(null), 2500);
    } catch (e: any) {
      setTShirtMsg(e?.response?.data?.message || 'Failed to save');
    } finally {
      setTShirtSaving(false);
    }
  };

  const handleSaveFieldMap = async () => {
    setFieldMapSaving(true);
    setFieldMapMsg(null);
    try {
      const result = await integrations.updateJiraFieldMapping(fieldMap);
      setFieldMap(result.fieldMapping);
      setFieldMapMsg('Saved. Run Jira sync to apply.');
      setTimeout(() => setFieldMapMsg(null), 4000);
    } catch (e: any) {
      setFieldMapMsg(e?.response?.data?.message || 'Failed to save');
    } finally {
      setFieldMapSaving(false);
    }
  };

  // Filter to custom fields only for tShirtSize / quarter dropdowns (story points / sprint / epic link have known defaults)
  const fieldOptions = jiraFields.slice().sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
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

      {/* T-Shirt Size → Story Points Mapping */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-orbit-purple" />
            <h3 className="text-lg font-semibold text-orbit-light">T-Shirt Size Mapping</h3>
          </div>
          {tShirtMsg && <span className="text-xs text-emerald-400">{tShirtMsg}</span>}
        </div>
        <p className="text-sm text-orbit-slate mb-4">
          Map t-shirt size labels to story-point estimates. Used to compute capacity impact on the Planning page.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TSHIRT_SIZES.map((size) => (
            <div key={size} className="flex items-center gap-2 p-3 rounded-lg bg-orbit-navy">
              <span className="w-10 text-sm font-bold text-orbit-light">{size}</span>
              <span className="text-xs text-orbit-slate">=</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={tShirtMap[size] ?? ''}
                onChange={(e) => setTShirtMap({ ...tShirtMap, [size]: Number(e.target.value) })}
                className="input flex-1"
              />
              <span className="text-xs text-orbit-slate">SP</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSaveTShirtMap} loading={tShirtSaving}>
            <Save className="w-4 h-4" /> Save Mapping
          </Button>
        </div>
      </div>

      {/* Jira Field Mapping */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-orbit-blue" />
            <h3 className="text-lg font-semibold text-orbit-light">Jira Field Mapping</h3>
          </div>
          {fieldMapMsg && <span className="text-xs text-emerald-400">{fieldMapMsg}</span>}
        </div>
        {!jiraConnected ? (
          <p className="text-sm text-orbit-slate">Connect Jira on the Integrations page to configure field mapping.</p>
        ) : (
          <>
            <p className="text-sm text-orbit-slate mb-4">
              Pick which Jira custom field stores each piece of data. <span className="text-orbit-light">T-Shirt Size</span> and <span className="text-orbit-light">Quarter</span> are required for the Planning page.
            </p>
            <div className="space-y-3">
              {(['storyPoints', 'sprint', 'epicLink', 'tShirtSize', 'quarter'] as const).map((key) => (
                <div key={key} className="grid grid-cols-3 gap-3 items-center">
                  <label className="text-sm text-orbit-light capitalize">
                    {key === 'tShirtSize' ? 'T-Shirt Size' : key === 'epicLink' ? 'Epic Link' : key === 'storyPoints' ? 'Story Points' : key}
                  </label>
                  <select
                    className="input col-span-2"
                    value={fieldMap[key] || ''}
                    onChange={(e) => setFieldMap({ ...fieldMap, [key]: e.target.value })}
                  >
                    <option value="">— Not configured —</option>
                    {fieldOptions.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.id}){f.custom ? '' : ' [system]'}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleSaveFieldMap} loading={fieldMapSaving}>
                <Save className="w-4 h-4" /> Save Field Mapping
              </Button>
            </div>
          </>
        )}
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
        </div>
      </div>

      {/* Sign out */}
      <Button variant="danger" onClick={logout}>Sign Out</Button>
    </div>
  );
};

export default SettingsPage;
