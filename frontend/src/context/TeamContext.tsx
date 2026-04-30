import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { teams as teamsApi } from '@/api/services';
import { useAuth } from '@/context/AuthContext';

interface Team {
  id: string;
  name: string;
  color?: string;
}

interface TeamContextType {
  teams: Team[];
  selectedTeamId: string | null;
  selectedTeam: Team | null;
  setSelectedTeamId: (id: string | null) => void;
  refreshTeams: () => Promise<void>;
  loading: boolean;
}

const TeamContext = createContext<TeamContextType>({
  teams: [],
  selectedTeamId: null,
  selectedTeam: null,
  setSelectedTeamId: () => {},
  refreshTeams: async () => {},
  loading: true,
});

export const useTeam = () => useContext(TeamContext);

export const TeamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamIdState] = useState<string | null>(
    localStorage.getItem('orbitpilot_selected_team')
  );
  const [loading, setLoading] = useState(true);

  const refreshTeams = useCallback(async () => {
    try {
      const data = await teamsApi.getTeams();
      setTeams(data || []);
      // If selected team no longer exists, select first available
      if (data && data.length > 0) {
        const savedId = localStorage.getItem('orbitpilot_selected_team');
        if (!savedId || !data.find((t: Team) => t.id === savedId)) {
          setSelectedTeamIdState(data[0].id);
          localStorage.setItem('orbitpilot_selected_team', data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load teams', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      refreshTeams();
    } else {
      setTeams([]);
      setLoading(false);
    }
  }, [isAuthenticated, refreshTeams]);

  const setSelectedTeamId = (id: string | null) => {
    setSelectedTeamIdState(id);
    if (id) {
      localStorage.setItem('orbitpilot_selected_team', id);
    } else {
      localStorage.removeItem('orbitpilot_selected_team');
    }
  };

  const selectedTeam = teams.find(t => t.id === selectedTeamId) || null;

  return (
    <TeamContext.Provider value={{ teams, selectedTeamId, selectedTeam, setSelectedTeamId, refreshTeams, loading }}>
      {children}
    </TeamContext.Provider>
  );
};
