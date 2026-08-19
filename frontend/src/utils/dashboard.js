export function unwrapResponse(payload) {
  return payload?.data?.data ?? payload?.data ?? payload ?? null;
}

export function unwrapItems(payload) {
  const data = unwrapResponse(payload);

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
}

export function getDisplayName(person = {}) {
  return [person.first_name, person.last_name].filter(Boolean).join(' ').trim() || 'Candidate';
}

export function getInitials(person = {}) {
  const parts = [person.first_name, person.last_name].filter(Boolean);
  if (!parts.length && person.email) {
    return person.email.slice(0, 2).toUpperCase();
  }
  return (
    parts
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'SH'
  );
}

export function formatDateShort(value) {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatDateTimeShort(value) {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatSalaryRange(job = {}) {
  const { salary_min: min, salary_max: max } = job;
  if (min == null && max == null) return 'Salary on request';
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  if (min != null && max != null) {
    return `${formatter.format(min)} - ${formatter.format(max)}`;
  }
  if (min != null) return `From ${formatter.format(min)}`;
  return `Up to ${formatter.format(max)}`;
}

export function clampPercent(value) {
  const number = Number(value ?? 0);
  if (Number.isNaN(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

export function formatMetricPercent(value) {
  return `${clampPercent(value)}%`;
}

export function toReadableLabel(value) {
  return String(value || '')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
