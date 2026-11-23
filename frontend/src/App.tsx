import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { CreateGameScreen } from './screens/CreateGameScreen';
import { GameCreatedScreen } from './screens/GameCreatedScreen';
import { JoinGameScreen } from './screens/JoinGameScreen';
import { WaitingRoomScreen } from './screens/WaitingRoomScreen';
import { HostDashboardScreen } from './screens/HostDashboardScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { ResultsScreen } from './screens/ResultsScreen';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomeScreen />} />
        <Route path="/create" element={<CreateGameScreen />} />
        <Route path="/game-created/:id" element={<GameCreatedScreen />} />
        <Route path="/join" element={<JoinGameScreen />} />
        <Route path="/join/:id" element={<JoinGameScreen />} />
        <Route path="/join-audience" element={<JoinGameScreen defaultMode="audience" />} />
        <Route path="/join-audience/:id" element={<JoinGameScreen defaultMode="audience" />} />
        <Route path="/lobby/:id" element={<WaitingRoomScreen />} />
        <Route path="/host-dashboard/:id" element={<HostDashboardScreen />} />
        <Route path="/leaderboard/:id" element={<LeaderboardScreen />} />
        <Route path="/results/:id" element={<ResultsScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
