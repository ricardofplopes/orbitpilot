import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { integrations } from '@/api/services';
import IntegrationCard from '@/components/cards/IntegrationCard';
import Spinner from '@/components/common/Spinner';

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
  connectedAccount?: string | null;
  connectedSite?: string | null;
  lastSyncAt?: string;
}

const IntegrationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jiraStatus, setJiraStatus] = useState<IntegrationStatus>({ isActive: false, isOAuthConfigured: false });
  const [githubStatus, setGithubStatus] = useState<IntegrationStatus>({ isActive: false, isOAuthConfigured: false });
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  // Handle OAuth callback redirect (e.g. /integrations?connected=github)
  useEffect(() => {
    const connected = searchParams.get('connected');
    if (connected) {
      setSuccessMessage(`Successfully connected to ${connected === 'jira' ? 'Jira' : 'GitHub'}!`);
      setSearchParams({}, { replace: true });
      loadStatuses();
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  }, [searchParams, setSearchParams, loadStatuses]);

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-orbit-light">Integrations</h2>
        <p className="text-sm text-orbit-slate mt-1">Connect your tools with one click using OAuth</p>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm">
          ✓ {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IntegrationCard
          title="Jira"
          description="Connect your Atlassian account to sync Jira issues, epics, and sprint data automatically."
          icon={<JiraIcon />}
          isConnected={jiraStatus.isActive}
          isOAuthConfigured={jiraStatus.isOAuthConfigured}
          connectedAccount={jiraStatus.connectedSite}
          lastSyncAt={jiraStatus.lastSyncAt}
          onConnect={async () => {
            const { url } = await integrations.getJiraAuthUrl();
            window.location.href = url;
          }}
          onDisconnect={async () => {
            await integrations.disconnectJira();
            setJiraStatus({ ...jiraStatus, isActive: false, connectedSite: null });
          }}
        />

        <IntegrationCard
          title="GitHub"
          description="Connect your GitHub account to sync repositories, pull requests, and code review data."
          icon={<GithubIcon />}
          isConnected={githubStatus.isActive}
          isOAuthConfigured={githubStatus.isOAuthConfigured}
          connectedAccount={githubStatus.connectedAccount}
          lastSyncAt={githubStatus.lastSyncAt}
          onConnect={async () => {
            const { url } = await integrations.getGithubAuthUrl();
            window.location.href = url;
          }}
          onDisconnect={async () => {
            await integrations.disconnectGithub();
            setGithubStatus({ ...githubStatus, isActive: false, connectedAccount: null });
          }}
        />
      </div>
    </div>
  );
};

export default IntegrationsPage;
