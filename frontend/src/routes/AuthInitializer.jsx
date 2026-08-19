import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { bootstrapAuth } from '../redux/slices/authSlice';

export default function AuthInitializer({ children }) {
  const dispatch = useDispatch();
  const { bootstrapped, status } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!bootstrapped && status === 'idle') {
      dispatch(bootstrapAuth());
    }
  }, [bootstrapped, dispatch, status]);

  return children;
}
