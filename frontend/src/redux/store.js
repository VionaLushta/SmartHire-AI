import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import jobReducer from './slices/jobSlice';
import companyReducer from './slices/companySlice';
import candidateReducer from './slices/candidateSlice';
import applicationReducer from './slices/applicationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    jobs: jobReducer,
    companies: companyReducer,
    candidate: candidateReducer,
    applications: applicationReducer,
  },
});
