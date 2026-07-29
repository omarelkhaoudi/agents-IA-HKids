import AgentCard from './AgentCard';

/** Backward-compatible wrapper for legacy ModuleCard usage. */
export default function ModuleCard({ title, description, enabled }) {
  const accentByTitle = {
    'Administrative Assistant': 'blue',
    'Sales Agent': 'orange',
    'HR Agent': 'emerald',
    'Community Manager': 'purple',
  };

  return (
    <AgentCard
      title={title}
      description={description}
      enabled={enabled}
      accent={accentByTitle[title] || 'blue'}
      workspaceTo="/assistant"
      configureTo="/administration/agents"
    />
  );
}
