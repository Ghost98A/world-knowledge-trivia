import { SubscribeDevProvider, useSubscribeDev } from '@subscribe.dev/react';
import { ThemeProvider } from './contexts/ThemeContext';
import { SignInScreen } from './components/SignInScreen';
import { TriviaGame } from './components/TriviaGame';
import './App.css';

function AppContent() {
  const { isSignedIn, signIn } = useSubscribeDev();

  if (!isSignedIn) {
    return <SignInScreen signIn={signIn} />;
  }

  return <TriviaGame />;
}

function App() {
  return (
    <SubscribeDevProvider projectToken={import.meta.env.VITE_SUBSCRIBE_DEV_PROJECT_TOKEN}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SubscribeDevProvider>
  );
}

export default App;
