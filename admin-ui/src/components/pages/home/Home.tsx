import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGlobalInstance } from 'plume-ts-di';
import { Panel } from '../../theme/layout/Panel';
import useMessages from '../../../i18n/hooks/messagesHook';
import { ActionButton } from '../../theme/action/Actions';
import { useOnComponentMounted } from '../../../lib/react-hooks-alias/ReactHooksAlias';
import { LOBBY } from '../../Routes';
import SocketService from '../../../services/socket/SocketService';


export default function Home() {
  const socketService = getGlobalInstance(SocketService);

  const { messages } = useMessages();
  const navigate = useNavigate();

  const listenerSwitchPhase = useCallback(
    socketService.socketListener("position_joueur", ([x, y]: string[]) => {
      console.log('Display X', x);
      console.log('Display Y', y);
    }),
    [],
  );

  useOnComponentMounted(() => {
    socketService.addOnMessage(listenerSwitchPhase);

    return () => {
      socketService.removeOnMessage(listenerSwitchPhase);
    };
  });

  const createLobby = () => {
    // TODO emit event lobby
    navigate(LOBBY);
  };

  const joinLobby = () => {
    // TODO open popup
  };

  return (
    <Panel>
      <h1>{messages.home.title}</h1>
      <ActionButton onClick={createLobby}>
        {messages.action.create_game}
      </ActionButton>
      <ActionButton onClick={joinLobby}>
        {messages.action.join_game}
      </ActionButton>
    </Panel>
  );
}
