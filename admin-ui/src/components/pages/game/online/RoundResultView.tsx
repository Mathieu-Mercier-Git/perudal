import React from 'react';
import { Button, Icon } from '@mui/material';
import classNames from '../../../../lib/class-names/ClassNames';
import useMessages from '../../../../i18n/hooks/messagesHook';
import { Translations } from '../../../../i18n/translations/Translations';
import {
  ChallengeType, Game, Player, playerDisplayName, RoundResult,
} from '../../../../services/game/GameTypes';
import { PERUDO } from '../../../../services/game/BidRules';
import ActionStyle from '../../../../lib/plume-admin-theme/action/ActionStyle';
import { ActionButton } from '../../../theme/action/Actions';
import PlayerName from '../../../theme/player/PlayerName';
import Dice from '../dice/Dice';
import BidLabel from './BidLabel';
import { positionOf } from './OnlineGameUtils';

const FACES: number[] = [1, 2, 3, 4, 5, 6];

type VerdictTone = 'win' | 'lose' | 'neutral';

type Verdict = {
  tone: VerdictTone,
  title: string,
  emoji?: string,
};

type Props = {
  result: RoundResult,
  // Partie après résolution : sert à l'ordre des joueurs
  game: Game,
  playerId?: string,
  isAdmin: boolean,
  onNext: () => void,
};

/** Verdict de la manche, du point de vue du joueur de l'appareil */
function computeVerdict(
  messages: Translations,
  result: RoundResult,
  playerId: string | undefined,
  nameOf: (id: string) => string,
): Verdict {
  const texts: Translations['online_game'] = messages.online_game;
  const won: Verdict = { tone: 'win', title: texts.verdict_won, emoji: '👑' };
  const lost: Verdict = { tone: 'lose', title: texts.verdict_lost, emoji: '🫤' };
  const isChallenger: boolean = result.challengerId === playerId;
  const isBidder: boolean = result.bidderId === playerId;
  const myChange: number = playerId ? (result.diceChanges[playerId] ?? 0) : 0;
  const challenger: string = nameOf(result.challengerId);

  if (result.type === ChallengeType.LIAR) {
    if (isChallenger) {
      return result.challengerWon ? won : lost;
    }
    if (isBidder) {
      return result.challengerWon ? lost : won;
    }
    const loserId: string = result.challengerWon ? result.bidderId : result.challengerId;
    const title: string = result.diceChanges[loserId] === undefined // le perdant a quitté la partie
      ? texts.verdict_nobody
      : texts.verdict_loses(nameOf(loserId));
    return { tone: 'neutral', title };
  }

  // Chiffre exact
  if (!result.challengerWon) {
    return isChallenger ? lost : { tone: 'neutral', title: texts.verdict_loses(challenger) };
  }
  if (isChallenger) {
    return won;
  }
  if (myChange < 0) {
    return lost;
  }
  // Gagné : +1 dé, ou -1 dé à tous les autres si le joueur avait déjà le maximum
  const othersLose: boolean = result.diceChanges[result.challengerId] === undefined;
  return {
    tone: 'neutral',
    title: othersLose ? texts.verdict_others_lose(challenger) : texts.verdict_gains(challenger),
  };
}

// Écran de fin de manche après « Menteur ! » ou « Chiffre exact »
export default function RoundResultView({
  result, game, playerId, isAdmin, onNext,
}: Props) {
  const { messages } = useMessages();
  const texts: Translations['online_game'] = messages.online_game;

  const { bid } = result;
  // Les perudos ne sont pas des jokers en planificato : ils s'affichent alors comme un « 1 » classique
  const wasPlanificato: boolean = !result.jokersCounted && bid.face !== PERUDO;
  const countsForBid = (dice: number): boolean => dice === bid.face || (result.jokersCounted && dice === PERUDO);

  const revealed: Player[] = result.revealedPlayers.filter((player: Player) => player.dices.length > 0);
  // Ordre fixe de la partie, puis les joueurs partis pendant la manche
  const sortedRevealed: Player[] = [...revealed].sort(
    (a: Player, b: Player) => (positionOf(game, a.id) ?? Infinity) - (positionOf(game, b.id) ?? Infinity),
  );

  // Colonne de dés de même largeur partout, pour que les badges « −1 dé » restent alignés d'un joueur à l'autre
  const diceColumn: React.CSSProperties = {
    '--dice-slots': Math.max(...revealed.map((player: Player) => player.dices.length)),
  } as React.CSSProperties;

  const nameOf = (id: string): string => {
    const player: Player | undefined = result.revealedPlayers.find((revealedPlayer: Player) => revealedPlayer.id === id)
      ?? game.players.find((gamePlayer: Player) => gamePlayer.id === id);
    return player ? playerDisplayName(player) : '';
  };

  const verdict: Verdict = computeVerdict(messages, result, playerId, nameOf);

  const faceCount = (face: number): number => result.faceCounts[String(face)] ?? 0;

  return (
    <>
      <div className="game__scroll online-result">
        <div className={classNames('online-verdict', `online-verdict--${verdict.tone}`)}>
          <div className="online-verdict__head">
            {verdict.tone !== 'neutral' && (
              <span className={classNames('online-verdict__icon', `online-verdict__icon--${verdict.tone}`)}>
                <Icon>{verdict.tone === 'win' ? 'check' : 'close'}</Icon>
              </span>
            )}
            <span className="online-verdict__title">
              {verdict.title}
              {verdict.emoji && (
                <>
                  {' '}
                  <span className={`online-verdict__emoji--${verdict.tone}`}>{verdict.emoji}</span>
                </>
              )}
            </span>
          </div>
          <div className="online-verdict__figures">
            <span className="online-label">{texts.bid_label}</span>
            <BidLabel quantity={bid.quantity} face={bid.face} isPlanificato={wasPlanificato} />
            <span className="online-label online-verdict__table-label">{texts.on_table}</span>
            <BidLabel quantity={result.actualCount} face={bid.face} isPlanificato={wasPlanificato} />
          </div>
        </div>

        <div className="online-faces">
          <span className="online-label">{texts.round_result}</span>
          <div className="online-faces__grid">
            {FACES.map((face: number) => (
              <div
                key={face}
                className={classNames('online-faces__item', { 'online-faces__item--highlight': countsForBid(face) })}
              >
                <Dice number={face} show isPlanificato={wasPlanificato} size="sm" />
                <span className="online-faces__count">×{faceCount(face)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="online-players online-players--compact" style={diceColumn}>
          {sortedRevealed.map((player: Player) => {
            const change: number = result.diceChanges[player.id] ?? 0;
            const position: number | undefined = positionOf(game, player.id);
            return (
              <div
                key={player.id}
                className={classNames('online-player', 'online-player--result', {
                  'online-player--loser': change < 0,
                })}
              >
                <div className="online-player__head">
                  <span className="online-position">{position ?? '–'}</span>
                  <PlayerName player={player} className="online-player__name" />
                  {change < 0 && (<span className="online-badge online-badge--minus">{texts.minus_one}</span>)}
                  {change > 0 && (<span className="online-badge online-badge--plus">{texts.plus_one}</span>)}
                  {position === undefined && (<span className="online-player__status">{texts.departed}</span>)}
                  <div className="online-player__aside online-player__revealed">
                    {player.dices.map((dice: number, index: number) => (
                      <Dice
                        key={index}
                        number={dice}
                        show
                        isPlanificato={wasPlanificato}
                        size="xs"
                        className={countsForBid(dice) ? 'dice--highlight' : 'dice--dim'}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="game__tray">
        <span className="online-result__next">
          {result.nextStarterId === playerId
            ? texts.next_starter_you
            : texts.next_starter(nameOf(result.nextStarterId))}
        </span>
        <div className="action-container">
          {isAdmin
            ? (
              <Button variant="contained" color="primary" onClick={onNext} endIcon={<Icon>arrow_forward</Icon>}>
                {texts.next_round}
              </Button>
            )
            : (
              <ActionButton style={ActionStyle.PRIMARY} disabled>
                {texts.waiting_for_host}
              </ActionButton>
            )}
        </div>
      </div>
    </>
  );
}
