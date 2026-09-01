import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { bootstrapAuth, hydrateAuth } from '../redux/slices/authSlice';

export default function AuthInitializer({ children }) {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { bootstrapped, status } = useSelector((state) => state.auth);

  useEffect(() => {
    if (status !== 'idle' || bootstrapped) {
      return;
    }

    const params = new URLSearchParams(location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const rememberMe = params.get('remember_me');

    if (accessToken) {
      dispatch(
        hydrateAuth({
          token: accessToken,
          refreshToken: refreshToken || null,
          rememberMe: rememberMe !== 'false',
          user: null,
        }),
      );
      dispatch(bootstrapAuth());
      navigate(location.pathname, { replace: true, state: location.state });
      return;
    }

    dispatch(bootstrapAuth());
  }, [bootstrapped, dispatch, location.pathname, location.search, location.state, navigate, status]);

  return children;
}
