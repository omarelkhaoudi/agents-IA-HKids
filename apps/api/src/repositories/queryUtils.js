export function buildInClause(values = []) {
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
  return {
    clause: placeholders ? `IN (${placeholders})` : 'IN (NULL)',
    values,
  };
}
