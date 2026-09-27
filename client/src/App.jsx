import { StoreProvider, useStore } from './store/useStore';
import LanguageSelect   from './components/LanguageSelect';
import FormUpload       from './components/FormUpload';
import DetectingScreen  from './components/DetectingScreen';
import VoiceCard        from './components/VoiceCard';
import ReviewScreen     from './components/ReviewScreen';
import SessionHistory   from './components/SessionHistory';
import './index.css';

function Router() {
  const { state } = useStore();

  switch (state.currentScreen) {
    case 'language': return <LanguageSelect />;
    case 'upload':   return <FormUpload />;
    case 'detecting':return <DetectingScreen />;
    case 'voice':    return <VoiceCard />;
    case 'review':   return <ReviewScreen />;
    case 'history':  return <SessionHistory />;
    default:         return <LanguageSelect />;
  }
}

export default function App() {
  return (
    <StoreProvider>
      <Router />
    </StoreProvider>
  );
}
