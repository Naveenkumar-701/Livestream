// app/store.js
import { configureStore } from '@reduxjs/toolkit';
import interviewReducer from '../redux/interviewSlice';

export const store = configureStore({
    reducer: {
        interview: interviewReducer,
    },
});