import React from 'react';
import { Button } from '@mui/material';
import classNames from '../../../../lib/class-names/ClassNames';
import useMessages from '../../../../i18n/hooks/messagesHook';
import { ChallengeType, Game, Player } from '../../../../services/game/GameTypes';
import ActionStyle from '../../../../lib/plume-admin-theme/action/ActionStyle';
import { ActionButton } from '../../../theme/action/Actions';
import PlayerName from '../../../theme/player/PlayerName';
import Dice from '../dice/Dice';
import { isExactAllowed } from '../../../../services/game/BidRules';
import BidLabel from './BidLabel';
import { findPlayer, positionOf } from './OnlineGameUtils';
import useCancellableCountdown, { CancellableCountdown } from './useCancellableCountdown';

// Délai (ms) pendant lequel « Menteur ! » et « Chiffre exact » peuvent être annulés
export const CHALLENGE_COUNTDOWN_MS: number = 2000;

type Props = {
  game: Game,
  mainPlayer: Player,
  isChallenging: boolean,
  onBid: () => void,
  onChallenge: (type: ChallengeType) => void,
};

// Écran « mon tour » : la mise à battre, mes dés et les trois choix
export default function MyTurnPanel({
  game, mainPlayer, isChallenging, onBid, onChallenge,
}: Props) {
  const { messages } = useMessages();
  const countdown: CancellableCountdown<ChallengeType> = useCancellableCountdown<ChallengeType>(
    CHALLENGE_COUNTDOWN_MS,
    onChallenge,
  );

  const { currentBid } = game;
  const bidder: Player | undefined = findPlayer(game, currentBid?.playerId);
  // Pas de chiffre exact en planificato ni quand il ne reste que deux joueurs
  const canCallExact: boolean = isExactAllowed(!!game.isPlanificato, game.players);

  const renderChallengeButton = (type: ChallengeType, label: string, modifier: string) => {
    const isPending: boolean = countdown.pending === type;
    return (
      <div
        className={classNames(
          'action-container',
          'reveal-button',
          'online-challenge',
          `online-challenge--${modifier}`,
          { 'reveal-button--pending': isPending },
        )}
      >
        <Button
          variant="contained"
          color="secondary"
          disabled={isChallenging || (countdown.pending !== undefined && !isPending)}
          onClick={() => countdown.toggle(type)}
        >
          {isPending && (
            <span className="reveal-button__progress" style={{ animationDuration: `${CHALLENGE_COUNTDOWN_MS}ms` }} />
          )}
          <span className="reveal-button__label">{isPending ? messages.online_game.cancel : label}</span>
        </Button>
      </div>
    );
  };

  return (
    <div className="online-panel">
      {currentBid
        ? (
          <div className="online-panel__to-beat">
            <div className="online-panel__to-beat-who">
              <span className="online-label">{messages.online_game.bid_to_beat}</span>
              {bidder && (
                <span className="online-panel__bidder">
                  <span className="online-position online-position--sm">{positionOf(game, bidder.id) ?? '–'}</span>
                  <PlayerName player={bidder} />
                </span>
              )}
            </div>
            <BidLabel
              quantity={currentBid.quantity}
              face={currentBid.face}
              isPlanificato={game.isPlanificato}
              diceSize="sm"
              className="bid-label--large"
            />
          </div>
        )
        : (<div className="online-panel__to-beat online-panel__opening">{messages.online_game.you_open}</div>)}

      <div className="game__mydice">
        <span className="game__mydice-label">{messages.online_game.my_dice}</span>
        <div className="game__mydice-list">
          {mainPlayer.dices.map((dice: number, index: number) => (
            <Dice key={index} number={dice} show isPlanificato={game.isPlanificato} />
          ))}
        </div>
      </div>

      <ActionButton
        style={ActionStyle.PRIMARY}
        icon="arrow_upward"
        disabled={isChallenging || countdown.pending !== undefined}
        onClick={onBid}
      >
        {messages.online_game.bid}
      </ActionButton>
      {currentBid && (
        <div className={classNames('online-panel__challenges', { 'online-panel__challenges--single': !canCallExact })}>
          {renderChallengeButton(ChallengeType.LIAR, messages.online_game.liar, 'liar')}
          {canCallExact && renderChallengeButton(ChallengeType.EXACT, messages.online_game.exact, 'exact')}
        </div>
      )}
    </div>
  );
}
