import React, { useState } from 'react';
import { CheckCircle, XCircle, Loader2, ExternalLink, Unplug } from 'lucide-react';
import Button from '@/components/common/Button';

interface OAuthIntegrationCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  isConnected: boolean;
  isOAuthConfigured: boolean;
  connectedAccount?: string | null;
  lastSyncAt?: string;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}

const IntegrationCard: React.FC<OAuthIntegrationCardProps> = ({
  title,
  description,
  icon,
  isConnected,
  isOAuthConfigured,
  connectedAccount,
  lastSyncAt,
  onConnect,
  onDisconnect,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConnect();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to start OAuth flow');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await onDisconnect();
    } catch {
      setError('Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orbit-navy flex items-center justify-center">{icon}</div>
          <div>
            <h3 className="font-semibold text-orbit-light">{title}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isConnected ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-emerald-400">Connected</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 text-orbit-slate" />
                  <span className="text-xs text-orbit-slate">Not connected</span>
                </>
              )}
            </div>
          </div>
        </div>
        {lastSyncAt && (
          <span className="text-xs text-orbit-slate">Last sync: {new Date(lastSyncAt).toLocaleString()}</span>
        )}
      </div>

      <p className="text-sm text-orbit-slate mb-5">{description}</p>

      {isConnected && connectedAccount && (
        <div className="flex items-center gap-2 p-3 rounded-lg mb-4 bg-emerald-500/10 text-emerald-400 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>Connected as <strong>{connectedAccount}</strong></span>
        </div>
      )}

      {!isOAuthConfigured && !isConnected && (
        <div className="flex items-center gap-2 p-3 rounded-lg mb-4 bg-amber-500/10 text-amber-400 text-sm">
          <span>OAuth not configured. Set <code className="font-mono text-xs">{title.toUpperCase().replace(/\s/g, '_')}_CLIENT_ID</code> and <code className="font-mono text-xs">{title.toUpperCase().replace(/\s/g, '_')}_CLIENT_SECRET</code> environment variables.</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg mb-4 bg-red-500/10 text-red-400 text-sm">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        {isConnected ? (
          <Button variant="secondary" onClick={handleDisconnect} loading={loading}>
            <Unplug className="w-4 h-4 mr-2" />
            Disconnect
          </Button>
        ) : (
          <Button onClick={handleConnect} loading={loading} disabled={!isOAuthConfigured}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Connect to {title}
          </Button>
        )}
      </div>
    </div>
  );
};

export default IntegrationCard;
