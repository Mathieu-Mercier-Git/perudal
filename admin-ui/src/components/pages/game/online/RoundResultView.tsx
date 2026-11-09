import React, { useEffect, useState } from 'react';
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
const COUNTDOWN_TICK_MS: number = 250;
// Durée totale de l'écran de résultat : doit rester alignée sur NEXT_ROUND_DELAY côté serveur (GameService.java)
const NEXT_ROUND_DELAY_MS: number = 10_000;

type NextRoundCountdown = {
  seconds: number,
  // Temps déjà écoulé à l'arrivée du résultat (reconnexion en cours de décompte) : la jauge part de là
  elapsedMs: number,
};

/**
 * Décompte avant le lancement automatique de la manche suivante, décidé par le
 * serveur. L'échéance est recalculée à partir du temps restant à chaque nouveau résultat,
 * l'horloge du téléphone pouvant différer de celle du serveur.
 */
function useNextRoundCountdown(result: RoundResult, nextRoundInMs?: number | null): NextRoundCountdown | undefined {
  const [deadline, setDeadline] = useState<number | undefined>(undefined);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const hasTimer: boolean = nextRoundInMs !== undefined && nextRoundInMs !== null;
    setDeadline(hasTimer ? Date.now() + (nextRoundInMs as number) : undefined);
    setElapsedMs(hasTimer ? Math.max(0, NEXT_ROUND_DELAY_MS - (nextRoundInMs as number)) : 0);
    setNow(Date.now());
    // Le temps restant ne sert qu'à l'arrivée du résultat : les autres mises à jour de la partie ne le recalent pas
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  useEffect(() => {
    if (deadline === undefined) {
      return undefined;
    }
    const interval: ReturnType<typeof setInterval> = setInterval(() => setNow(Date.now()), COUNTDOWN_TICK_MS);
    return () => clearInterval(interval);
  }, [deadline]);

  return deadline === undefined
    ? undefined
    : { seconds: Math.max(0, Math.ceil((deadline - now) / 1000)), elapsedMs };
}

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
  const wasPlanificato: boolean = result.planificato;
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
  const countdown: NextRoundCountdown | undefined = useNextRoundCountdown(result, game.nextRoundInMs);
  // Le fond du bouton se remplit pendant le décompte, comme les boutons « Menteur ! » / « Chiffre exact »
  const buttonContent = (label: string): React.ReactNode => (
    <>
      {countdown && (
        <span
          className="reveal-button__progress"
          style={{ animationDuration: `${NEXT_ROUND_DELAY_MS}ms`, animationDelay: `-${countdown.elapsedMs}ms` }}
        />
      )}
      <span className="reveal-button__label">
        {label}
        {countdown && (<span className="online-result__countdown">{`${countdown.seconds}s`}</span>)}
      </span>
    </>
  );

  const faceCount = (face: number): number => result.faceCounts[String(face)] ?? 0;
  // Aucun perudo sur la table : rien à mettre en avant sur cette face
  const isFaceHighlighted = (face: number): boolean => countsForBid(face)
    && !(face === PERUDO && !wasPlanificato && faceCount(face) === 0);

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
                className={classNames('online-faces__item', {
                  'online-faces__item--highlight': isFaceHighlighted(face),
                })}
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
                  {/* Le départ est écrit sous le pseudo : à côté, il était écrasé par les dés */}
                  <div className="online-player__identity">
                    <PlayerName player={player} className="online-player__name" />
                    {position === undefined && (<span className="online-player__status">{texts.departed}</span>)}
                  </div>
                  {change < 0 && (<span className="online-badge online-badge--minus">{texts.minus_one}</span>)}
                  {change > 0 && (<span className="online-badge online-badge--plus">{texts.plus_one}</span>)}
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
              <div className="action-container reveal-button">
                <Button
                  variant="contained"
                  color="primary"
                  onClick={onNext}
                  endIcon={<Icon className="reveal-button__label">arrow_forward</Icon>}
                >
                  {buttonContent(texts.next_round)}
                </Button>
              </div>
            )
            : (
              <ActionButton style={ActionStyle.PRIMARY} cssClasses="reveal-button online-result__waiting" disabled>
                {buttonContent(texts.next_round_soon)}
              </ActionButton>
            )}
        </div>
      </div>
    </>
  );
}
