import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { MobileContainer } from '../components/MobileContainer';
import { useGameStore } from '../store/useGameStore';
import { ArrowLeft, ArrowRight, User, QrCode, Eye, Gamepad2, Sparkles, X, Lock, AlertTriangle } from 'lucide-react';
import { GameControllerAccent } from '../components/Illustrations';
import { QrScannerModal } from '../components/QrScannerModal';
import { apiRequest } from '../services/api';

interface JoinGameScreenProps {
  defaultMode?: 'player' | 'audience';
}

export const JoinGameScreen: React.FC<JoinGameScreenProps> = ({ defaultMode }) => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Determine initial mode from query param or prop
  const urlMode = searchParams.get('mode') as 'player' | 'audience' | null;
  const [mode, setMode] = useState<'player' | 'audience' | null>(urlMode || defaultMode || null);

  const currentGame = useGameStore((state) => state.currentGame);
  const currentPlayerId = useGameStore((state) => state.currentPlayerId);
  const isHost = useGameStore((state) => state.isHost);
  const isSpectator = useGameStore((state) => state.isSpectator);
  const joinGame = useGameStore((state) => state.joinGame);
  const joinAsSpectator = useGameStore((state) => state.joinAsSpectator);
  const addToast = useGameStore((state) => state.addToast);
  const connectWebSocket = useGameStore((state) => state.connectWebSocket);

  // Persistent Device Lock: If device is already part of this game, skip joining!
  useEffect(() => {
    if (currentGame && currentGame.id && (!id || id.toUpperCase() === currentGame.id.toUpperCase())) {
      const isStillInGame = isSpectator || (currentPlayerId && currentGame.players?.some((p) => p.id === currentPlayerId));
      if (!isStillInGame) {
        return;
      }

      connectWebSocket(currentGame.id);
      if (isSpectator) {
        if (currentGame.status === 'completed') {
          navigate(`/results/${currentGame.id}`, { replace: true });
        } else {
          navigate(`/leaderboard/${currentGame.id}`, { replace: true });
        }
        return;
      }

      if (currentGame.status === 'in_progress') {
        if (isHost) {
          navigate(`/host-dashboard/${currentGame.id}`, { replace: true });
        } else {
          navigate(`/leaderboard/${currentGame.id}`, { replace: true });
        }
      } else if (currentGame.status === 'waiting') {
        navigate(`/lobby/${currentGame.id}`, { replace: true });
      } else if (currentGame.status === 'completed') {
        navigate(`/results/${currentGame.id}`, { replace: true });
      }
    }
  }, [currentGame, currentPlayerId, id, isHost, isSpectator, connectWebSocket, navigate]);

  const [gameId, setGameId] = useState(id || '');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isWaitingForHost, setIsWaitingForHost] = useState(false);

  // Ongoing Game Selection Modal State (Only used when scanned from camera/neutral QR)
  const [isOngoingModalOpen, setIsOngoingModalOpen] = useState(false);
  const [detectedGameCode, setDetectedGameCode] = useState('');

  // Host Access Restrictions Redirect Modal
  const [redirectModal, setRedirectModal] = useState<{
    isOpen: boolean;
    type: 'player_restricted' | 'audience_restricted' | 'room_locked';
    targetCode: string;
  } | null>(null);

  // If user arrived via direct link (e.g. phone camera QR /join/:id) without explicit mode
  useEffect(() => {
    const checkDirectQrScan = async (code: string) => {
      if (!code || code.length < 6 || mode !== null) return;
      try {
        const game = await apiRequest(`/api/games/${code.toUpperCase()}`);
        const allowP = game.allow_players ?? true;
        const allowV = game.allow_viewers ?? true;

        if (!allowP && !allowV) {
          setRedirectModal({ isOpen: true, type: 'room_locked', targetCode: code.toUpperCase() });
          return;
        }

        if (allowP && !allowV) {
          setMode('player');
          setGameId(code.toUpperCase());
          addToast('info', 'Host has restricted access to audience. You can join as a player.');
          return;
        }

        if (!allowP && allowV) {
          await joinAsSpectator(code.toUpperCase());
          addToast('info', 'Host has restricted access to join as player. You are connected as a viewer.');
          navigate(`/leaderboard/${code.toUpperCase()}`);
          return;
        }

        if (game.status === 'in_progress') {
          setDetectedGameCode(code.toUpperCase());
          setIsOngoingModalOpen(true);
        } else {
          setMode('player');
        }
      } catch (err: any) {
        if (err.message?.includes('locked')) {
          setRedirectModal({ isOpen: true, type: 'room_locked', targetCode: code.toUpperCase() });
        }
      }
    };

    if (id && id.length === 6 && !mode) {
      checkDirectQrScan(id);
    }
  }, [id, mode, addToast, joinAsSpectator, navigate]);

  const handleScanSuccess = async (decodedText: string) => {
    setIsScannerOpen(false);
    let code = decodedText.trim();
    if (code.includes('/join/')) {
      code = code.split('/join/').pop()?.substring(0, 6) || code;
    } else if (code.includes('/')) {
      code = code.split('/').pop()?.substring(0, 6) || code;
    }
    const cleanCode = code.toUpperCase();
    setGameId(cleanCode);

    try {
      const game = await apiRequest(`/api/games/${cleanCode}`);
      const allowP = game.allow_players ?? true;
      const allowV = game.allow_viewers ?? true;

      // 1. Both locked:
      if (!allowP && !allowV) {
        setRedirectModal({ isOpen: true, type: 'room_locked', targetCode: cleanCode });
        return;
      }

      // If user clicked "Join as Audience", direct join as audience on scan!
      if (mode === 'audience') {
        if (!allowV) {
          setRedirectModal({ isOpen: true, type: 'audience_restricted', targetCode: cleanCode });
          return;
        }
        setIsLoading(true);
        setError('');
        await joinAsSpectator(cleanCode);
        navigate(`/leaderboard/${cleanCode}`);
        return;
      }

      // If user clicked "Join Game", keep player mode and let them enter name
      if (mode === 'player') {
        if (!allowP) {
          setRedirectModal({ isOpen: true, type: 'player_restricted', targetCode: cleanCode });
          return;
        }
        return;
      }

      // Neutral scan from camera / generic button:
      if (allowP && !allowV) {
        setMode('player');
        addToast('info', 'Host has restricted access to audience. You can join as a player.');
        return;
      }

      if (!allowP && allowV) {
        setIsLoading(true);
        await joinAsSpectator(cleanCode);
        addToast('info', 'Host has restricted access to join as player. You are connected as a viewer.');
        navigate(`/leaderboard/${cleanCode}`);
        return;
      }

      if (game.status === 'in_progress') {
        setDetectedGameCode(cleanCode);
        setIsOngoingModalOpen(true);
      } else {
        setMode('player');
      }
    } catch (err: any) {
      if (err.message?.includes('locked')) {
        setRedirectModal({ isOpen: true, type: 'room_locked', targetCode: cleanCode });
      } else {
        setError(err.message || 'Game not found');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinPlayer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    const targetCode = gameId.trim().toUpperCase() || 'A7K9D2';
    try {
      setIsLoading(true);
      setError('');
      await joinGame(targetCode, playerName.trim());
      navigate(`/lobby/${targetCode}`);
    } catch (err: any) {
      if (err.message && err.message.includes('Host is entering scores')) {
        setIsWaitingForHost(true);
      } else if (err.message && err.message.includes('closed entry for new players')) {
        setRedirectModal({ isOpen: true, type: 'player_restricted', targetCode });
      } else if (err.message && err.message.includes('locked')) {
        setRedirectModal({ isOpen: true, type: 'room_locked', targetCode });
      } else {
        setError(err.message || 'Game code not found or error joining');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinAudienceDirect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetCode = (detectedGameCode || gameId).trim().toUpperCase() || 'A7K9D2';
    if (!targetCode) {
      setError('Please enter a 6-character game code');
      return;
    }
    try {
      setIsLoading(true);
      setError('');
      await joinAsSpectator(targetCode);
      setIsOngoingModalOpen(false);
      navigate(`/leaderboard/${targetCode}`);
    } catch (err: any) {
      if (err.message && err.message.includes('restricted audience entry')) {
        setRedirectModal({ isOpen: true, type: 'audience_restricted', targetCode });
      } else if (err.message && err.message.includes('locked')) {
        setRedirectModal({ isOpen: true, type: 'room_locked', targetCode });
      } else {
        setError(err.message || 'Failed to join as audience');
        setIsOngoingModalOpen(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChoosePlayerFromModal = () => {
    setIsOngoingModalOpen(false);
    setMode('player');
    if (detectedGameCode) {
      setGameId(detectedGameCode);
    }
  };

  // If waiting for host admission lock to lift, auto-retry every 2.5s
  React.useEffect(() => {
    if (!isWaitingForHost) return;
    const interval = setInterval(async () => {
      const targetCode = gameId.trim().toUpperCase() || 'A7K9D2';
      try {
        await joinGame(targetCode, playerName.trim());
        setIsWaitingForHost(false);
        navigate(`/lobby/${targetCode}`);
      } catch (err: any) {
        if (!err.message?.includes('Host is entering scores')) {
          setIsWaitingForHost(false);
          setError(err.message);
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isWaitingForHost, gameId, playerName, joinGame, navigate]);

  // Default to player if mode is neutral
  const isAudienceMode = mode === 'audience';

  return (
    <MobileContainer>
      <div className="flex-1 flex flex-col justify-between p-6 pt-8 pb-8 relative">
        {/* Top Header */}
        <div>
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 rounded-xl text-slate-700 hover:bg-white/60 transition cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
          </button>

          <div className="mt-4 mb-8">
            <h1 className="text-2xl font-bold text-[#1E1B4B]">
              {isAudienceMode ? 'Join as Audience' : 'Join Game'}
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              {isAudienceMode
                ? 'Enter the game code to spectate live scores...'
                : 'Enter your name to join as player...'}
            </p>
          </div>

          {/* Waiting for Host Admission Banner */}
          {isWaitingForHost && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2.5 my-4 animate-pulse">
              <span className="text-lg">⏳</span>
              <span>Host is entering scores right now. You will automatically join as soon as the new round starts!</span>
            </div>
          )}

          {/* Form */}
          {isAudienceMode ? (
            /* AUDIENCE JOIN FORM (Zero name input required) */
            <form onSubmit={handleJoinAudienceDirect} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Game Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={gameId}
                  onChange={(e) => {
                    setGameId(e.target.value.toUpperCase());
                    if (error) setError('');
                  }}
                  placeholder="e.g. A7K9D2"
                  className="w-full bg-white px-4 py-3.5 rounded-2xl border border-slate-200/80 text-[#1E1B4B] font-bold tracking-widest placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 shadow-xs uppercase"
                />
              </div>

              {error && <p className="text-xs text-rose-500 font-semibold mt-1.5 ml-1">{error}</p>}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#4A10A8] via-[#7016E6] to-[#8625FF] text-white font-bold text-base shadow-lg shadow-purple-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Eye className="w-5 h-5 stroke-[2.5]" />
                  <span>{isLoading ? 'Joining Audience...' : 'Watch Game'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* PLAYER JOIN FORM */
            <form onSubmit={handleJoinPlayer} className="space-y-4">
              {/* If no ID in URL, ask for Game ID */}
              {!id && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Game Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={gameId}
                    onChange={(e) => {
                      setGameId(e.target.value.toUpperCase());
                      if (error) setError('');
                    }}
                    placeholder="e.g. A7K9D2"
                    className="w-full bg-white px-4 py-3.5 rounded-2xl border border-slate-200/80 text-[#1E1B4B] font-bold tracking-widest placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-xs uppercase"
                  />
                </div>
              )}

              {/* Name Input */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Your Name
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-slate-400">
                    <User className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => {
                      setPlayerName(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Your Name"
                    className="w-full bg-white pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200/80 text-[#1E1B4B] font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-xs"
                  />
                </div>
                {error && <p className="text-xs text-rose-500 font-semibold mt-1.5 ml-1">{error}</p>}
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#4A10A8] via-[#7016E6] to-[#8625FF] text-white font-bold text-base shadow-lg shadow-purple-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <span>{isLoading ? 'Joining...' : 'Join as Player'}</span>
                  <ArrowRight className="w-5 h-5 ml-1 stroke-[2.5]" />
                </button>
              </div>
            </form>
          )}

          {/* Or Divider & QR Scanner */}
          <div className="my-6 flex items-center justify-center relative">
            <div className="w-full border-t border-slate-200" />
            <span className="bg-[#F8F9FE] px-3 text-xs text-slate-400 font-semibold uppercase absolute">or</span>
          </div>

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="w-full py-3.5 px-6 rounded-2xl bg-white text-slate-700 font-semibold text-sm shadow-xs border border-slate-200/80 hover:bg-slate-50 transition flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-indigo-600" />
            <span>Scan QR Code</span>
          </button>
        </div>

        {/* QR Scanner Camera Modal */}
        <QrScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={handleScanSuccess}
        />

        {/* Ongoing Game Mode Selector Modal (Only shown for neutral QR scans from camera/in-app) */}
        {isOngoingModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white w-full max-w-sm rounded-[32px] p-6 relative flex flex-col shadow-2xl border border-slate-100">
              <button
                onClick={() => {
                  setIsOngoingModalOpen(false);
                  setMode('player');
                }}
                className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Match in Progress
                </span>
                <span className="text-xs font-bold text-slate-400">#{detectedGameCode || gameId}</span>
              </div>

              <h3 className="font-extrabold text-xl text-[#1E1B4B] mb-1">How would you like to join?</h3>
              <p className="text-xs text-slate-500 mb-5 font-medium leading-relaxed">
                This game is already underway! You can play along or sit back and spectate live.
              </p>

              <div className="space-y-3 w-full">
                {/* Option 1: Join as Player */}
                <button
                  onClick={handleChoosePlayerFromModal}
                  className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/40 text-left transition active:scale-[0.98] cursor-pointer group flex items-start gap-3.5"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition">
                    <Gamepad2 className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-[#1E1B4B] flex items-center justify-between">
                      <span>Join as Player</span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition" />
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Enter your name to play, record scores, and compete on the podium.
                    </p>
                  </div>
                </button>

                {/* Option 2: Join as Audience (Spectator) */}
                <button
                  onClick={handleJoinAudienceDirect}
                  disabled={isLoading}
                  className="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 border-2 border-indigo-400/80 text-left transition active:scale-[0.98] cursor-pointer group flex items-start gap-3.5 shadow-xs hover:shadow-md"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/25">
                    <Eye className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-indigo-950 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>Join as Audience</span>
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                      </span>
                      <ArrowRight className="w-4 h-4 text-indigo-600 group-hover:translate-x-0.5 transition" />
                    </div>
                    <p className="text-[11px] text-indigo-900/70 font-medium mt-0.5">
                      Instant entry! Watch live scores & leaderboard without entering a name.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Host Admission Restriction Redirection Modal */}
        {redirectModal?.isOpen && (
          <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white w-full max-w-sm rounded-[32px] p-6 relative flex flex-col shadow-2xl border border-slate-100 text-center items-center">
              {redirectModal.type === 'room_locked' ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
                    <Lock className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <h3 className="font-extrabold text-lg text-[#1E1B4B] mb-1">Game Room Locked</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium">
                    The host has locked this game room. No new players or viewers are currently being admitted.
                  </p>
                  <button
                    onClick={() => {
                      setRedirectModal(null);
                      navigate('/');
                    }}
                    className="w-full py-3.5 rounded-2xl bg-slate-900 text-white font-bold text-xs shadow-md active:scale-[0.98] transition cursor-pointer"
                  >
                    Back to Home
                  </button>
                </>
              ) : redirectModal.type === 'player_restricted' ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-3">
                    <Eye className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <h3 className="font-extrabold text-lg text-[#1E1B4B] mb-1">Player Entry Closed</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium">
                    The host has closed entry for new players in this match, but you can still watch as an audience member!
                  </p>
                  <div className="space-y-2.5 w-full">
                    <button
                      onClick={async () => {
                        const target = redirectModal.targetCode;
                        setRedirectModal(null);
                        try {
                          await joinAsSpectator(target);
                          navigate(`/leaderboard/${target}`);
                        } catch (err: any) {
                          setError(err.message || 'Failed to connect');
                        }
                      }}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-md active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Watch as Audience</span>
                    </button>
                    <button
                      onClick={() => {
                        setRedirectModal(null);
                        navigate('/');
                      }}
                      className="w-full py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
                    >
                      Back to Home
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                    <Gamepad2 className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <h3 className="font-extrabold text-lg text-[#1E1B4B] mb-1">Audience Restricted</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium">
                    The host has restricted spectator access for this match, but you can still join as a player to participate!
                  </p>
                  <div className="space-y-2.5 w-full">
                    <button
                      onClick={() => {
                        const target = redirectModal.targetCode;
                        setRedirectModal(null);
                        setMode('player');
                        setGameId(target);
                      }}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs shadow-md active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Gamepad2 className="w-4 h-4" />
                      <span>Join as Player</span>
                    </button>
                    <button
                      onClick={() => {
                        setRedirectModal(null);
                        navigate('/');
                      }}
                      className="w-full py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
                    >
                      Back to Home
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Bottom Accent */}
        <div className="relative">
          <GameControllerAccent className="absolute -bottom-4 right-0" />
        </div>
      </div>
    </MobileContainer>
  );
};
