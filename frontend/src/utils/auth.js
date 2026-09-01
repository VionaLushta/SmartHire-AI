export function getDashboardPathForRole(role) {
  const normalized = String(role ?? '').toLowerCase();
  if (normalized === 'admin' || normalized === 'administrator' || normalized === 'role_admin') {
    return '/admin/dashboard';
  }
  if (normalized === 'company' || normalized === 'recruiter') {
    return '/company/dashboard';
  }
  return '/candidate/dashboard';
}

export function getSafeInternalPath(value, fallback = '/candidate/dashboard') {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://')) {
    return fallback;
  }

  if (trimmed.startsWith('/login') || trimmed.startsWith('/register') || trimmed.startsWith('/candidate/login') || trimmed.startsWith('/candidate/register') || trimmed.startsWith('/admin/login')) {
    return fallback;
  }

  return trimmed;
}

export function normalizeAuthResponse(payload) {
  const response = payload?.data ?? payload ?? {};
  const data = response?.data ?? response;
  const user = data?.user ?? data?.account ?? data?.profile ?? null;
  const role = user?.role ?? user?.role_name ?? data?.role ?? data?.role_name ?? data?.userRole ?? null;

  return {
    user: user || (role ? { role, role_name: role } : null),
    token: data?.access_token ?? data?.accessToken ?? data?.token ?? null,
    refreshToken: data?.refresh_token ?? data?.refreshToken ?? null,
    rememberMe: data?.remember_me ?? data?.rememberMe ?? null,
    raw: data,
  };
}

export function getAuthErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const response = error?.response?.data;
  const status = error?.response?.status;

  if (typeof response === 'string') {
    return status ? `${status} ${response}` : response;
  }

  if (response?.message) {
    return status ? `${status} ${response.message}` : response.message;
  }

  if (Array.isArray(response?.errors) && response.errors.length > 0) {
    const firstError = response.errors[0];
    const location = Array.isArray(firstError?.loc)
      ? firstError.loc.filter((part) => part !== 'body').join('.')
      : '';
    const message = firstError?.msg || firstError?.message || firstError?.detail || fallback;
    const formattedError = location ? `${location}: ${message}` : message;
    return status ? `${status} ${formattedError}` : formattedError;
  }

  if (response?.detail) {
    return status ? `${status} ${response.detail}` : response.detail;
  }

  if (error?.message) {
    return error.message;
  }

  return fallback;
}
