import React from 'react';
import useMessages from '../../i18n/hooks/messagesHook';
import { Panel } from '../theme/layout/Panel';
import AnimatedLoader from '../layout/AnimatedLoader';

type props = {
  isLoading: boolean,
  hasSocketError: boolean,
};
export default function LandingPage({ isLoading, hasSocketError }: props) {
  const { messages } = useMessages();

  return (
    <Panel>
      <h1>{messages.home.title}</h1>
      {hasSocketError && (<div>Une erreur est survenue lors de la connexion au serveur</div>)}
      {isLoading && (<AnimatedLoader/>)}
    </Panel>
  );
}
