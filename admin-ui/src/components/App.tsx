import React, { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { getGlobalInstance } from 'plume-ts-di';
import { Logger } from 'simple-logging-system';
import GlobalErrorBoundary from './theme/GlobalErrorBoundary';
import { useOnComponentMounted } from '../lib/react-hooks-alias/ReactHooksAlias';
import { GAME, HOME, LOBBY } from './Routes';
import Home from './pages/home/Home';
import Lobby from './pages/lobby/Lobby';
import LandingPage from './pages/LandingPage';
import { addOnConnected, initSocket, removeOnConnected } from '../services/socket/SocketEngineService';
import Game from './pages/game/Game';
import Rules from './pages/rules/Rules';
import GameService from '../services/game/GameService';

const logger: Logger = new Logger('App');
// To make the application have a base path that starts with /admin:
// - Replace the line bellow by: const basePath = '/admin';
// - Add the base attribute in the vite.config.ts file
const basePath: string = '/';

// react router redirection is not made anymore :(, see https://github.com/remix-run/react-router/issues/8427
if (window && !window.location.pathname.startsWith(basePath)) {
  window.history.replaceState('', '', basePath + window.location.pathname);
}

export default function App() {
  const gameService = getGlobalInstance(GameService);
  const [isSocketInitLoading, setIsSocketInitLoading] = useState<boolean>(false);
  const [isSocktetInitSuccess, setIsSocktetInitSuccess] = useState<boolean>(false);
  const [hasSocketError, setHasSocketError] = useState<boolean>(false);

  useOnComponentMounted(() => {
    // Déclenché à chaque connexion établie, reconnexions comprises : on ne repasse
    // donc jamais par l'écran de chargement une fois la partie démarrée
    const onSocketConnected = () => {
      setIsSocktetInitSuccess(true);
      setHasSocketError(false);
      gameService.restoreSession();
    };
    addOnConnected(onSocketConnected);

    initSocket().catch(() => setHasSocketError(true));

    return () => removeOnConnected(onSocketConnected);
  });

  logger.info('Render App');

  if (!isSocktetInitSuccess) {
    return (<LandingPage isLoading={isSocketInitLoading} hasSocketError={hasSocketError} />)
  }

  return (
    <GlobalErrorBoundary>
      <ToastContainer />
      <BrowserRouter basename={basePath}>
        <Routes>
          <Route path={HOME} element={<Home />} />
          <Route path={LOBBY} element={<Lobby />} />
          <Route path={GAME} element={<Game />} />
          <Route path="*" element={<Navigate to={{ pathname: HOME }} />} />
        </Routes>
        <Rules />
      </BrowserRouter>
    </GlobalErrorBoundary>
  );
}
