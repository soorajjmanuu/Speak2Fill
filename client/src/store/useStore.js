import { createContext, createElement, useContext, useReducer, useEffect } from 'react';

const SCREENS = ['language', 'upload', 'detecting', 'voice', 'review', 'history'];

const initialState = {
  currentScreen: 'language',
  language: 'en',
  textSize: 'normal',      // 'normal' | 'large' | 'xlarge'
  darkMode: false,
  activeTemplate: null,    // FormTemplate object from DB
  activeSession: null,     // FillSession object from DB
  currentFieldIndex: 0,
  userId: null,
  detectionProgress: 0,    // 0-100 for detecting screen
  detectionError: null,
  answers: {},             // fieldId → answer string (local cache before save)
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, currentScreen: action.payload };
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    case 'SET_TEXT_SIZE':
      return { ...state, textSize: action.payload };
    case 'TOGGLE_DARK_MODE':
      return { ...state, darkMode: !state.darkMode };
    case 'SET_TEMPLATE':
      return { ...state, activeTemplate: action.payload, currentFieldIndex: 0, answers: {} };
    case 'SET_SESSION':
      return { ...state, activeSession: action.payload };
    case 'SET_FIELD_INDEX':
      return { ...state, currentFieldIndex: action.payload };
    case 'NEXT_FIELD': {
      const next = state.currentFieldIndex + 1;
      const fields = state.activeTemplate?.fields || [];
      if (next >= fields.length) {
        return { ...state, currentScreen: 'review' };
      }
      return { ...state, currentFieldIndex: next };
    }
    case 'PREV_FIELD': {
      const prev = Math.max(0, state.currentFieldIndex - 1);
      return { ...state, currentFieldIndex: prev };
    }
    case 'SET_ANSWER': {
      return {
        ...state,
        answers: { ...state.answers, [action.fieldId]: action.answer }
      };
    }
    case 'SET_DETECTION_PROGRESS':
      return { ...state, detectionProgress: action.payload };
    case 'SET_DETECTION_ERROR':
      return { ...state, detectionError: action.payload };
    case 'SET_USER_ID':
      return { ...state, userId: action.payload };
    case 'RESET_FORM':
      return {
        ...state,
        activeTemplate: null,
        activeSession: null,
        currentFieldIndex: 0,
        answers: {},
        detectionProgress: 0,
        detectionError: null,
      };
    default:
      return state;
  }
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Persist userId across sessions
  useEffect(() => {
    let uid = localStorage.getItem('speak2fill_userId');
    if (!uid) {
      uid = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      localStorage.setItem('speak2fill_userId', uid);
    }
    dispatch({ type: 'SET_USER_ID', payload: uid });

    const savedLang = localStorage.getItem('speak2fill_lang');
    if (savedLang) dispatch({ type: 'SET_LANGUAGE', payload: savedLang });

    const savedDark = localStorage.getItem('speak2fill_dark');
    if (savedDark === 'true') dispatch({ type: 'TOGGLE_DARK_MODE' });

    const savedSize = localStorage.getItem('speak2fill_textSize');
    if (savedSize) dispatch({ type: 'SET_TEXT_SIZE', payload: savedSize });
  }, []);

  // Persist preferences
  useEffect(() => {
    localStorage.setItem('speak2fill_lang', state.language);
  }, [state.language]);

  useEffect(() => {
    localStorage.setItem('speak2fill_dark', state.darkMode);
    document.documentElement.classList.toggle('dark', state.darkMode);
  }, [state.darkMode]);

  useEffect(() => {
    localStorage.setItem('speak2fill_textSize', state.textSize);
    document.documentElement.dataset.textSize = state.textSize;
  }, [state.textSize]);

  return createElement(StoreContext.Provider, { value: { state, dispatch } }, children);
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
