export function getDashboardPathForRole(role) {
  const normalized = String(role ?? '').toLowerCase();
  if (normalized === 'admin' || normalized === 'administrator' || normalized === 'role_admin') {
    return '/admin/dashboard';
  }
  if (normalized === 'company') {
    return '/company/dashboard';
  }
  return '/candidate/dashboard';
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
    raw: data,
  };
}

export function getAuthErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const response = error?.response?.data;

  if (typeof response === 'string') {
    return response;
  }

  if (response?.detail) {
    return response.detail;
  }

  if (response?.message) {
    return response.message;
  }

  if (Array.isArray(response?.errors) && response.errors.length > 0) {
    return response.errors[0]?.message || response.errors[0]?.detail || fallback;
  }

  if (error?.message) {
    return error.message;
  }

  return fallback;
}
