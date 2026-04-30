import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { integrations } from '@/api/services';
import { useTeam } from '@/context/TeamContext';
import Spinner from '@/components/common/Spinner';
import { CheckCircle, XCircle, ExternalLink, Unplug, Key, Loader2, RefreshCw, FolderOpen } from 'lucide-react';

const JiraIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#2563EB">
    <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 00-.84-.84H11.53zM6.77 6.8a4.362 4.362 0 004.34 4.34h1.8v1.72a4.362 4.362 0 004.34 4.34V7.63a.84.84 0 00-.84-.83H6.77zM2 11.6a4.362 4.362 0 004.35 4.36h1.78v1.7C8.13 20.06 10.1 22 12.48 22V12.44a.84.84 0 00-.84-.84H2z" />
  </svg>
);

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6 text-orbit-light" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

interface IntegrationStatus {
  isActive: boolean;
  isOAuthConfigured: boolean;
  authType?: string;
  connectedAccount?: string | null;
  connectedSite?: string | null;
  connectedUser?: string | null;
  projectKey?: string | null;
  lastSyncAt?: string;
}

/** Sub-component for project selection and sync within connected Jira card */
const JiraProjectSync: React.FC<{
  currentProject: string | null;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
  onStatusChange: () => void;
}> = ({ currentProject, onError, onSuccess, onStatusChange }) => {
  const { refreshTeams } = useTeam();
  const [projects, setProjects] = useState<Array<{ key: string; name: string }>>([]);
  const [selectedProject, setSelectedProject] = useState(currentProject || '');
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; errors: number } | null>(null);

  useEffect(() => {
    setLoadingProjects(true);
    integrations.getJiraProjects()
      .then(setProjects)
      .catch(() => {})
      .finally(() => setLoadingProjects(false));
  }, []);

  useEffect(() => {
    if (currentProject) setSelectedProject(currentProject);
  }, [currentProject]);

  const handleSetProject = async (key: string) => {
    setSelectedProject(key);
    try {
      await integrations.setJiraProject(key);
      onStatusChange();
    } catch (err: any) {
      onError(err?.response?.data?.message || 'Failed to set project');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await integrations.syncJira();
      setSyncResult(result);
      onSuccess(`Synced ${result.synced} issues from Jira${result.errors > 0 ? ` (${result.errors} errors)` : ''}`);
      onStatusChange();
      await refreshTeams();
    } catch (err: any) {
      onError(err?.response?.data?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-orbit-slate mb-1.5">
          <FolderOpen className="w-3.5 h-3.5 inline mr-1" />
          Jira Project
        </label>
        {loadingProjects ? (
          <div className="flex items-center gap-2 text-xs text-orbit-slate"><Loader2 className="w-3 h-3 animate-spin" /> Loading projects...</div>
        ) : (
          <select
            className="input"
            value={selectedProject}
            onChange={(e) => handleSetProject(e.target.value)}
          >
            <option value="">All projects</option>
            {projects.map(p => (
              <option key={p.key} value={p.key}>{p.key} — {p.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSync} disabled={syncing} className="btn-primary flex items-center gap-2">
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {syncing ? 'Syncing...' : 'Sync Issues'}
        </button>
        {syncResult && (
          <span className="text-xs text-orbit-slate">
            {syncResult.synced} issues synced{syncResult.errors > 0 && `, ${syncResult.errors} errors`}
          </span>
        )}
      </div>
    </div>
  );
};

const JiraCard: React.FC<{
  status: IntegrationStatus;
  onStatusChange: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}> = ({ status, onStatusChange, onError, onSuccess }) => {
  const [mode, setMode] = useState<'choose' | 'token'>('choose');
  const [loading, setLoading] = useState(false);
  const [tokenForm, setTokenForm] = useState({ baseUrl: '', email: '', apiToken: '' });

  const handleOAuth = async () => {
    setLoading(true);
    try {
      const { url } = await integrations.getJiraAuthUrl();
      window.location.href = url;
    } catch (err: any) {
      onError(err?.response?.data?.message || 'Failed to start OAuth flow');
      setLoading(false);
    }
  };

  const handleTokenConnect = async () => {
    if (!tokenForm.baseUrl || !tokenForm.email || !tokenForm.apiToken) return;
    setLoading(true);
    try {
      const result = await integrations.connectJiraToken(tokenForm.baseUrl, tokenForm.email, tokenForm.apiToken);
      onSuccess(`Connected to Jira: ${result.siteName}`);
      onStatusChange();
      setMode('choose');
      setTokenForm({ baseUrl: '', email: '', apiToken: '' });
    } catch (err: any) {
      onError(err?.response?.data?.message || 'Failed to connect with API token');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await integrations.disconnectJira();
      onStatusChange();
    } catch {
      onError('Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  if (status.isActive) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orbit-navy flex items-center justify-center"><JiraIcon /></div>
            <div>
              <h3 className="font-semibold text-orbit-light">Jira</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-emerald-400">Connected ({status.authType === 'api-token' ? 'API Token' : 'OAuth'})</span>
              </div>
            </div>
          </div>
          {status.lastSyncAt && <span className="text-xs text-orbit-slate">Last sync: {new Date(status.lastSyncAt).toLocaleString()}</span>}
        </div>
        <div className="flex items-center gap-2 p-3 rounded-lg mb-4 bg-emerald-500/10 text-emerald-400 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>Connected to <strong>{status.connectedSite || 'Jira'}</strong>{status.connectedUser ? ` as ${status.connectedUser}` : ''}</span>
        </div>

        <JiraProjectSync
          currentProject={status.projectKey || null}
          onError={onError}
          onSuccess={onSuccess}
          onStatusChange={onStatusChange}
        />

        <div className="mt-4 pt-4 border-t border-orbit-card">
          <button onClick={handleDisconnect} disabled={loading} className="btn-secondary flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unplug className="w-4 h-4" />}
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-orbit-navy flex items-center justify-center"><JiraIcon /></div>
        <div>
          <h3 className="font-semibold text-orbit-light">Jira</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <XCircle className="w-3.5 h-3.5 text-orbit-slate" />
            <span className="text-xs text-orbit-slate">Not connected</span>
          </div>
        </div>
      </div>
      <p className="text-sm text-orbit-slate mb-5">Connect your Atlassian Jira to sync issues, epics, and sprint data.</p>

      {mode === 'choose' && (
        <div className="space-y-3">
          <button onClick={handleOAuth} disabled={loading || !status.isOAuthConfigured} className="btn-primary w-full flex items-center justify-center gap-2">
            <ExternalLink className="w-4 h-4" />
            Connect with OAuth
          </button>
          {!status.isOAuthConfigured && (
            <p className="text-xs text-orbit-slate text-center">OAuth requires JIRA_CLIENT_ID/SECRET env vars</p>
          )}
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-orbit-card" /></div>
            <div className="relative flex justify-center text-xs"><span className="px-2 bg-orbit-card text-orbit-slate">or</span></div>
          </div>
          <button onClick={() => setMode('token')} className="btn-secondary w-full flex items-center justify-center gap-2">
            <Key className="w-4 h-4" />
            Connect with API Token
          </button>
        </div>
      )}

      {mode === 'token' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-orbit-slate mb-1">Jira Base URL</label>
            <input
              className="input"
              placeholder="https://yoursite.atlassian.net"
              value={tokenForm.baseUrl}
              onChange={(e) => setTokenForm({ ...tokenForm, baseUrl: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-orbit-slate mb-1">Email</label>
            <input
              className="input"
              placeholder="you@company.com"
              value={tokenForm.email}
              onChange={(e) => setTokenForm({ ...tokenForm, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-orbit-slate mb-1">API Token</label>
            <input
              className="input"
              type="password"
              placeholder="Your Jira API token"
              value={tokenForm.apiToken}
              onChange={(e) => setTokenForm({ ...tokenForm, apiToken: e.target.value })}
            />
            <p className="text-xs text-orbit-slate mt-1">
              Create at{' '}
              <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-orbit-blue hover:underline">
                id.atlassian.com → Security → API tokens
              </a>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleTokenConnect}
              disabled={loading || !tokenForm.baseUrl || !tokenForm.email || !tokenForm.apiToken}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Connect
            </button>
            <button onClick={() => setMode('choose')} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

const GithubCard: React.FC<{
  status: IntegrationStatus;
  onStatusChange: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}> = ({ status, onStatusChange, onError, onSuccess }) => {
  const [mode, setMode] = useState<'choose' | 'token'>('choose');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');

  const handleOAuth = async () => {
    setLoading(true);
    try {
      const { url } = await integrations.getGithubAuthUrl();
      window.location.href = url;
    } catch (err: any) {
      onError(err?.response?.data?.message || 'Failed to start OAuth flow');
      setLoading(false);
    }
  };

  const handleTokenConnect = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const result = await integrations.connectGithubToken(token);
      onSuccess(`Connected to GitHub as ${result.login}`);
      onStatusChange();
      setMode('choose');
      setToken('');
    } catch (err: any) {
      onError(err?.response?.data?.message || 'Failed to connect with token');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await integrations.disconnectGithub();
      onStatusChange();
    } catch {
      onError('Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  if (status.isActive) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orbit-navy flex items-center justify-center"><GithubIcon /></div>
            <div>
              <h3 className="font-semibold text-orbit-light">GitHub</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-emerald-400">Connected ({status.authType === 'pat' ? 'Token' : 'OAuth'})</span>
              </div>
            </div>
          </div>
          {status.lastSyncAt && <span className="text-xs text-orbit-slate">Last sync: {new Date(status.lastSyncAt).toLocaleString()}</span>}
        </div>
        <div className="flex items-center gap-2 p-3 rounded-lg mb-4 bg-emerald-500/10 text-emerald-400 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>Connected as <strong>{status.connectedAccount || 'GitHub User'}</strong></span>
        </div>
        <button onClick={handleDisconnect} disabled={loading} className="btn-secondary flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unplug className="w-4 h-4" />}
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-orbit-navy flex items-center justify-center"><GithubIcon /></div>
        <div>
          <h3 className="font-semibold text-orbit-light">GitHub</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <XCircle className="w-3.5 h-3.5 text-orbit-slate" />
            <span className="text-xs text-orbit-slate">Not connected</span>
          </div>
        </div>
      </div>
      <p className="text-sm text-orbit-slate mb-5">Connect your GitHub account to sync repositories, pull requests, and code review data.</p>

      {mode === 'choose' && (
        <div className="space-y-3">
          <button onClick={handleOAuth} disabled={loading || !status.isOAuthConfigured} className="btn-primary w-full flex items-center justify-center gap-2">
            <ExternalLink className="w-4 h-4" />
            Connect with OAuth
          </button>
          {!status.isOAuthConfigured && (
            <p className="text-xs text-orbit-slate text-center">OAuth requires GITHUB_CLIENT_ID/SECRET env vars</p>
          )}
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-orbit-card" /></div>
            <div className="relative flex justify-center text-xs"><span className="px-2 bg-orbit-card text-orbit-slate">or</span></div>
          </div>
          <button onClick={() => setMode('token')} className="btn-secondary w-full flex items-center justify-center gap-2">
            <Key className="w-4 h-4" />
            Connect with Personal Access Token
          </button>
        </div>
      )}

      {mode === 'token' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-orbit-slate mb-1">Personal Access Token</label>
            <input
              className="input"
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <p className="text-xs text-orbit-slate mt-1">
              Create at{' '}
              <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-orbit-blue hover:underline">
                github.com → Settings → Developer settings → Personal access tokens
              </a>
            </p>
            <p className="text-xs text-orbit-slate mt-0.5">Recommended scopes: <code className="text-orbit-light">repo</code>, <code className="text-orbit-light">read:org</code></p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleTokenConnect}
              disabled={loading || !token}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Connect
            </button>
            <button onClick={() => setMode('choose')} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

const IntegrationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jiraStatus, setJiraStatus] = useState<IntegrationStatus>({ isActive: false, isOAuthConfigured: false });
  const [githubStatus, setGithubStatus] = useState<IntegrationStatus>({ isActive: false, isOAuthConfigured: false });
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadStatuses = useCallback(async () => {
    try {
      const [jira, github] = await Promise.allSettled([
        integrations.getJiraConfig(),
        integrations.getGithubConfig(),
      ]);
      if (jira.status === 'fulfilled' && jira.value) {
        setJiraStatus(jira.value as any);
      }
      if (github.status === 'fulfilled' && github.value) {
        setGithubStatus(github.value as any);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    if (connected) {
      setSuccessMessage(`Successfully connected to ${connected === 'jira' ? 'Jira' : 'GitHub'}!`);
      setSearchParams({}, { replace: true });
      loadStatuses();
      setTimeout(() => setSuccessMessage(null), 8000);
    }
    if (error) {
      setErrorMessage(`Connection failed: ${error}`);
      setSearchParams({}, { replace: true });
      setTimeout(() => setErrorMessage(null), 10000);
    }
  }, [searchParams, setSearchParams, loadStatuses]);

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-orbit-light">Integrations</h2>
        <p className="text-sm text-orbit-slate mt-1">Connect your tools using OAuth or API tokens</p>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm">
          ✓ {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-red-400 font-medium">✕ {errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-300">✕</button>
          </div>
          {errorMessage.includes('authorization_code') && (
            <p className="text-red-300/70 text-xs">
              This usually means your Atlassian app needs Jira API scopes configured. Go to{' '}
              <a href="https://developer.atlassian.com/console/myapps/" target="_blank" rel="noopener noreferrer" className="underline hover:text-red-300">
                developer.atlassian.com → My Apps → Permissions
              </a>{' '}
              and add "Jira platform REST API" with classic scopes. Or use the API Token option instead.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <JiraCard
          status={jiraStatus}
          onStatusChange={loadStatuses}
          onError={(msg) => { setErrorMessage(msg); setTimeout(() => setErrorMessage(null), 10000); }}
          onSuccess={(msg) => { setSuccessMessage(msg); setTimeout(() => setSuccessMessage(null), 8000); }}
        />

        <GithubCard
          status={githubStatus}
          onStatusChange={loadStatuses}
          onError={(msg) => { setErrorMessage(msg); setTimeout(() => setErrorMessage(null), 10000); }}
          onSuccess={(msg) => { setSuccessMessage(msg); setTimeout(() => setSuccessMessage(null), 8000); }}
        />
      </div>
    </div>
  );
};

export default IntegrationsPage;
