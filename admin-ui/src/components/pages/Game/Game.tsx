import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getGlobalInstance } from 'plume-ts-di';
import { Panel } from '../../theme/layout/Panel';
import useMessages from '../../../i18n/hooks/messagesHook';
import GameService from '../../../services/game/GameService';

export default function Game() {
  const gameService = getGlobalInstance(GameService);

  const { messages } = useMessages();
  const navigate = useNavigate();

  return (
    <Panel>
      Game
    </Panel>
  );
}
