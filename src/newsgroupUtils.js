function parseNewsgroups(value, maxGroups = 3) {
  const parts = String(value || '')
    .split(/[\n,]+/)
    .map(group => group.trim())
    .filter(Boolean);

  const unique = [];
  for (const group of parts) {
    if (!unique.includes(group)) {
      unique.push(group);
    }
  }

  return unique.slice(0, maxGroups);
}

function formatNewsgroups(value, maxGroups = 3, fallback = 'alt.binaries.multimedia') {
  const groups = Array.isArray(value)
    ? parseNewsgroups(value.join(','), maxGroups)
    : parseNewsgroups(value, maxGroups);

  return groups.length > 0 ? groups : [fallback];
}

function formatNewsgroupsHeader(value, maxGroups = 3, fallback = 'alt.binaries.multimedia') {
  return formatNewsgroups(value, maxGroups, fallback).join(',');
}

module.exports = {
  parseNewsgroups,
  formatNewsgroups,
  formatNewsgroupsHeader
};
