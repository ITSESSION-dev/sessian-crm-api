// Utilidades de mapeo fila(snake_case) -> DTO(camelCase).
const toCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

function rowToDTO(row) {
  const out = {};
  for (const k in row) out[toCamel(k)] = row[k];
  return out;
}

module.exports = { toCamel, rowToDTO };
