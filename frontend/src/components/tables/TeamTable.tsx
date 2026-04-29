import React from 'react';
import type { TeamMember } from '@/types';

interface TeamTableProps {
  members: TeamMember[];
}

const TeamTable: React.FC<TeamTableProps> = ({ members }) => {
  const thClass = 'px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase tracking-wider';

  return (
    <div className="overflow-x-auto rounded-xl border border-orbit-navy-lighter/50">
      <table className="w-full">
        <thead className="bg-orbit-navy-light">
          <tr>
            <th className={thClass}>Name</th>
            <th className={thClass}>Role</th>
            <th className={thClass}>Weekly Capacity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-orbit-navy-lighter/30">
          {members.map((member) => (
            <tr key={member.id} className="hover:bg-orbit-navy-light/50 transition-colors">
              <td className="px-4 py-3 text-sm text-orbit-light font-medium">{member.user?.name || member.userId}</td>
              <td className="px-4 py-3 text-sm text-orbit-slate capitalize">{member.role}</td>
              <td className="px-4 py-3 text-sm text-orbit-slate">{member.weeklyCapacity}h</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TeamTable;
