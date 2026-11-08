import React from 'react';
import classNames from '../../../../lib/class-names/ClassNames';
import useMessages from '../../../../i18n/hooks/messagesHook';
import { Bid, Game, Player } from '../../../../services/game/GameTypes';
import PlayerName from '../../../theme/player/PlayerName';
import Dice from '../dice/Dice';
import BidLabel from './BidLabel';
import {
  isAlive, lastBidOf, OrderedPlayer, orderedPlayers,
} from './OnlineGameUtils';

type Props = {
  game: Game,
  playerId?: string,
  // Liste compacte (écran « mon tour ») : une ligne par joueur et le nombre de dés en pastille
  compact?: boolean,
};

export function DiceCountChip({ count }: { count: number }) {
  const { messages } = useMessages();
  return (
    <span className="online-count">
      <span className="online-count__mini" />
      {messages.online_game.dice_count(count)}
    </span>
  );
}

// Joueurs dans l'ordre fixe de la partie, avec leur position et l'état de leur tour
export default function PlayerOrderList({ game, playerId, compact = false }: Props) {
  const { messages } = useMessages();

  return (
    <div className={classNames('online-players', { 'online-players--compact': compact })}>
      {orderedPlayers(game).map(({ player, position }: OrderedPlayer) => {
        const isActive: boolean = player.id === game.currentPlayerId;
        const isMe: boolean = player.id === playerId;
        const isEliminated: boolean = !isAlive(player);
        const lastBid: Bid | undefined = lastBidOf(game, player.id);

        const renderStatus = () => {
          if (isEliminated) {
            return (<span className="online-player__status">{messages.online_game.eliminated}</span>);
          }
          if (isActive) {
            return (
              <span className="online-player__thinking">
                {messages.online_game.thinking}
                <span />
                <span />
                <span />
              </span>
            );
          }
          if (lastBid) {
            return (
              <>
                <span className="online-player__status">{messages.online_game.has_bid}</span>
                <BidLabel quantity={lastBid.quantity} face={lastBid.face} isPlanificato={game.isPlanificato} />
              </>
            );
          }
          return (<span className="online-player__status">{messages.online_game.waiting}</span>);
        };

        return (
          <div
            key={player.id}
            className={classNames('online-player', {
              'online-player--active': isActive && !isEliminated,
              'online-player--me': isMe && !compact,
              'online-player--eliminated': isEliminated,
            })}
          >
            <div className="online-player__head">
              <span className={classNames('online-position', { 'online-position--active': isActive })}>
                {position}
              </span>
              <PlayerName player={player} className="online-player__name" />
              {isMe && (<span className="online-chip">{messages.online_game.you}</span>)}
              <div className="online-player__aside">
                {compact
                  ? (
                    <>
                      {lastBid && (
                        <BidLabel quantity={lastBid.quantity} face={lastBid.face} isPlanificato={game.isPlanificato} />
                      )}
                      {isEliminated
                        ? (<span className="online-player__status">{messages.online_game.eliminated}</span>)
                        : (<DiceCountChip count={player.diceNumber} />)}
                    </>
                  )
                  : renderStatus()}
              </div>
            </div>
            {!compact && !isEliminated && (
              <div className="online-player__dices">
                {Array.from({ length: player.diceNumber }, (_: unknown, index: number) => (
                  <Dice key={index} number={1} size="xs" />
                ))}
              </div>
            )}
          </div>
        );
      })}
      {(game.leftPlayers ?? []).map((player: Player) => {
        // Parti après une mise de la manche : ses dés restent comptés jusqu'à sa résolution
        const departed: Player | undefined = (game.departedPlayers ?? [])
          .find((departedPlayer: Player) => departedPlayer.id === player.id);
        return (
          <div key={player.id} className="online-player online-player--eliminated">
            <div className="online-player__head">
              <span className="online-position">–</span>
              <PlayerName player={player} className="online-player__name" />
              <div className="online-player__aside">
                <span className="online-player__status">{messages.online_game.departed}</span>
                {compact && departed && (<DiceCountChip count={departed.diceNumber} />)}
              </div>
            </div>
            {/* Ses dés, masqués comme ceux des autres joueurs, tant qu'ils comptent dans la manche */}
            {!compact && departed && (
              <div className="online-player__dices">
                {Array.from({ length: departed.diceNumber }, (_: unknown, index: number) => (
                  <Dice key={index} number={1} size="xs" />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
