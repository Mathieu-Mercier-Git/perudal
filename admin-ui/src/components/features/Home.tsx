import React, { useCallback } from 'react';
import { Panel } from '../theme/layout/Panel';
import useMessages from '../../i18n/hooks/messagesHook';
import { ActionButton } from '../theme/action/Actions';
import { useOnComponentMounted } from '../../lib/react-hooks-alias/ReactHooksAlias';
import { getGlobalInstance } from 'plume-ts-di';
import SessionApi from '../../api/session/SessionApi';
import { addOnMessage, removeOnMessage, socketListener } from '../../services/socketService';


export default function Home() {
  const sessionApi = getGlobalInstance(SessionApi);

  const { messages } = useMessages();

  const listenerSwitchPhase = useCallback(
    socketListener("position_joueur", ([x, y]: string[]) => {
      console.log('Display X', x);
      console.log('Display Y', y);
    }),
    [],
  );

  useOnComponentMounted(() => {
    addOnMessage(listenerSwitchPhase);

    return () => {
      removeOnMessage(listenerSwitchPhase);
    };
  });

  const createLobby = () => {
    sessionApi.test();
  };

  return (
    <Panel>
      <h1>{messages.home.title}</h1>
      <ActionButton onClick={createLobby}>
        Créer une partie
      </ActionButton>
    </Panel>
  );
}
