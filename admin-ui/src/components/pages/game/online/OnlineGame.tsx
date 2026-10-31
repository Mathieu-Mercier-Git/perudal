import React, { useEffect, useState } from 'react';
import { useObservable } from 'micro-observables';
import { getGlobalInstance } from 'plume-ts-di';
import { HttpError } from 'simple-http-rest-client';
import { Icon } from '@mui/material';
import useMessages from '../../../../i18n/hooks/messagesHook';
import { Translations } from '../../../../i18n/translations/Translations';
import GameService from '../../../../services/game/GameService';
import TurnAlertService from '../../../../services/game/TurnAlertService';
import {
  ChallengeType, Game, Player, playerDisplayName, RoundResult,
} from '../../../../services/game/GameTypes';
import { BidValue } from '../../../../services/game/BidRules';
import NotificationEngine from '../../../../lib/plume-notification/NotificationEngine';
import useBackButtonHandler from '../../../navigation/useBackButtonHandler';
import RulesOverlayService from '../../../../services/rules/RulesOverlayService';
import ActionStyle from '../../../../lib/plume-admin-theme/action/ActionStyle';
import { ActionButton } from '../../../theme/action/Actions';
import ValidationPopin from '../../../theme/popin/ValidationPopin';
import Dice from '../dice/Dice';
import GameMenuPopin from '../popin/GameMenuPopin';
import FinishGamePopin from '../popin/FinishGamePopin';
import PlayerOrderList from './PlayerOrderList';
import MyTurnPanel from './MyTurnPanel';
import BidSelector from './BidSelector';
import RoundResultView from './RoundResultView';
import {
  findPlayer, isAlive, positionOf, totalDiceInPlay,
} from './OnlineGameUtils';

type ConfirmAction = {
  title: string,
  onValidation: () => void,
};

type Props = {
  game: Game,
  playerId?: string,
};

// Partie en mode « En ligne » : chacun joue à son tour dans l'appli, le serveur calcule le résultat
export default function OnlineGame({ game, playerId }: Props) {
  const gameService: GameService = getGlobalInstance(GameService);
  const turnAlertService: TurnAlertService = getGlobalInstance(TurnAlertService);
  const rulesOverlayService: RulesOverlayService = getGlobalInstance(RulesOverlayService);
  const notificationEngine: NotificationEngine = getGlobalInstance(NotificationEngine);
  const { messages, httpError } = useMessages();
  const texts: Translations['online_game'] = messages.online_game;

  const roundResult: RoundResult | undefined = useObservable(gameService.getRoundResult());
  const isSoundEnabled: boolean = useObservable(turnAlertService.isSoundEnabled());

  const [showMyDices, setShowMyDices] = useState<boolean>(false);
  const [isBidding, setIsBidding] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showMenuPopin, setShowMenuPopin] = useState<boolean>(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | undefined>(undefined);

  const mainPlayer: Player | undefined = game.players.find((player: Player) => player.id === playerId);
  const isAdmin: boolean = !!mainPlayer?.isAdmin;
  const isMyTurn: boolean = !!playerId && game.currentPlayerId === playerId && !!mainPlayer && isAlive(mainPlayer);
  const currentPlayer: Player | undefined = findPlayer(game, game.currentPlayerId);
  const alivePlayers: Player[] = game.players.filter(isAlive);
  const winner: Player | undefined = alivePlayers.length === 1 ? alivePlayers[0] : undefined;
  // Le serveur désigne déjà le prochain joueur pendant l'écran de résultat : le tour commence à sa fermeture
  const canPlayNow: boolean = isMyTurn && !roundResult && !winner;

  useEffect(() => {
    if (canPlayNow) {
      turnAlertService.alert();
    }
  }, [canPlayNow, turnAlertService]);

  // À chaque changement de main ou de manche, on revient à l'écran de base et les dés repartent masqués
  useEffect(() => {
    setIsBidding(false);
    setIsSubmitting(false);
  }, [game.currentPlayerId, game.currentBid?.quantity, game.currentBid?.face]);

  useEffect(() => {
    setShowMyDices(false);
  }, [roundResult]);

  // Précédent du navigateur : ferme ce qui est ouvert, sinon ouvre le menu qui permet de quitter la partie.
  // La popin de fin de partie n'a qu'une seule issue : le retour y est sans effet.
  useBackButtonHandler(() => {
    if (winner && !roundResult) {
      return;
    }
    if (rulesOverlayService.isRulesOpen().get()) {
      rulesOverlayService.close();
    } else if (confirmAction) {
      setConfirmAction(undefined);
    } else if (showMenuPopin) {
      setShowMenuPopin(false);
    } else if (isBidding) {
      setIsBidding(false);
    } else {
      setShowMenuPopin(true);
    }
  });

  const notifyError = (error: HttpError) => notificationEngine.addDanger(httpError(error));

  const placeBid = (bid: BidValue) => {
    setIsSubmitting(true);
    // En cas de succès, l'évènement BID_PLACED passe la main au joueur suivant
    gameService.placeBid(game.gameCode, bid.quantity, bid.face)
      .catch((error: HttpError) => {
        setIsSubmitting(false);
        notifyError(error);
      });
  };

  const challenge = (type: ChallengeType) => {
    setIsSubmitting(true);
    // En cas de succès, l'évènement ROUND_RESULT affiche le verdict
    gameService.challenge(game.gameCode, type)
      .catch((error: HttpError) => {
        setIsSubmitting(false);
        notifyError(error);
      });
  };

  const openRulesFromMenu = () => {
    setShowMenuPopin(false);
    rulesOverlayService.open();
  };

  // Admin : annule la partie pour tout le monde ; joueur : quitte la partie
  const leaveGame = () => {
    setConfirmAction(isAdmin
      ? { title: texts.confirm_cancel_game, onValidation: () => gameService.cancelGame(game.gameCode) }
      : { title: texts.confirm_quit_game, onValidation: () => gameService.quitGame(game.gameCode) });
  };

  const resultIntro = (result: RoundResult): string => {
    const nameOf = (id: string): string => {
      const player: Player | undefined = result.revealedPlayers.find((revealed: Player) => revealed.id === id)
        ?? findPlayer(game, id);
      return player?.name ?? '';
    };
    const isLiar: boolean = result.type === ChallengeType.LIAR;
    const challenger: string = nameOf(result.challengerId);
    const bidder: string = nameOf(result.bidderId);
    if (result.challengerId === playerId) {
      return isLiar ? texts.liar_by_you(bidder) : texts.exact_by_you(bidder);
    }
    if (result.bidderId === playerId) {
      return isLiar ? texts.liar_on_you(challenger) : texts.exact_on_you(challenger);
    }
    return isLiar ? texts.liar_by(challenger, bidder) : texts.exact_by(challenger, bidder);
  };

  const title = (): string => {
    if (roundResult) {
      return texts.title_result;
    }
    return game.isPlanificato ? texts.title_planificato : texts.title;
  };

  const renderInfo = () => {
    if (roundResult) {
      return (<div className="game__info">{resultIntro(roundResult)}</div>);
    }
    if (isMyTurn) {
      return (
        <div className="game__info online-game__my-turn">{isBidding ? texts.your_turn_bid : texts.your_turn}</div>
      );
    }
    return (
      <div className="game__info">
        {texts.turn_of}
        {' '}
        <strong className="online-game__current">{currentPlayer ? playerDisplayName(currentPlayer) : ''}</strong>
      </div>
    );
  };

  const renderWaitingTray = () => (
    <div className="game__tray">
      <div className="game__mydice">
        <div className="online-game__mydice-head">
          <span className="game__mydice-label">{texts.my_dice}</span>
          {positionOf(game, playerId) !== undefined && (
            <span className="online-game__my-position">
              {texts.my_position}
              <span className="online-position online-position--sm">{positionOf(game, playerId)}</span>
            </span>
          )}
        </div>
        {mainPlayer && (
          mainPlayer.dices.length > 0
            ? (
              <div className="game__mydice-list">
                {mainPlayer.dices.map((dice: number, index: number) => (
                  <Dice key={index} number={dice} show={showMyDices} isPlanificato={game.isPlanificato} />
                ))}
              </div>
            )
            : (<div className="game__mydice-empty">{texts.no_dice}</div>)
        )}
      </div>
      {!!mainPlayer?.dices.length && (
        <div className="game__tray-actions">
          <ActionButton
            style={ActionStyle.PRIMARY}
            icon={showMyDices ? 'visibility_off' : 'visibility'}
            onClick={() => setShowMyDices(!showMyDices)}
          >
            {showMyDices ? texts.hide_my_dice : texts.show_my_dice}
          </ActionButton>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    if (roundResult) {
      return (
        <RoundResultView
          result={roundResult}
          game={game}
          playerId={playerId}
          isAdmin={isAdmin}
          onNext={() => gameService.nextRound(game.gameCode).catch(notifyError)}
        />
      );
    }
    if (isMyTurn && mainPlayer && isBidding) {
      return (
        <BidSelector
          game={game}
          mainPlayer={mainPlayer}
          isSubmitting={isSubmitting}
          onBack={() => setIsBidding(false)}
          onSubmit={placeBid}
        />
      );
    }
    if (isMyTurn && mainPlayer) {
      return (
        <>
          <div className="game__scroll">
            <PlayerOrderList game={game} playerId={playerId} compact />
          </div>
          <MyTurnPanel
            game={game}
            mainPlayer={mainPlayer}
            isChallenging={isSubmitting}
            onBid={() => setIsBidding(true)}
            onChallenge={challenge}
          />
        </>
      );
    }
    return (
      <>
        <div className="game__scroll">
          <PlayerOrderList game={game} playerId={playerId} />
        </div>
        {renderWaitingTray()}
      </>
    );
  };

  return (
    <>
      <div className="game online-game">
        <header className="game__header">
          <div className="game__header-top">
            <h1 className="game__title">{title()}</h1>
            <div className="game__header-actions">
              <div className="game__total">
                <span className="game__total-num">{totalDiceInPlay(game)}</span>
                <span className="game__total-label">{texts.dice_unit}</span>
              </div>
              <button
                type="button"
                className="game__rules-link"
                onClick={() => setShowMenuPopin(true)}
                aria-label={texts.menu}
              >
                <Icon>menu</Icon>
              </button>
            </div>
          </div>
          {renderInfo()}
        </header>
        {renderContent()}
      </div>
      {showMenuPopin && (
        <GameMenuPopin
          isAdmin={isAdmin}
          canRollDices={false}
          onShowRules={openRulesFromMenu}
          onLeaveGame={leaveGame}
          onRollDices={() => undefined}
          isSoundEnabled={isSoundEnabled}
          onToggleSound={() => turnAlertService.toggleSound()}
          onClose={() => setShowMenuPopin(false)}
        />
      )}
      {confirmAction && (
        <ValidationPopin
          zIndex={115}
          title={confirmAction.title}
          onValidation={() => {
            confirmAction.onValidation();
            setConfirmAction(undefined);
            setShowMenuPopin(false);
          }}
          onClose={() => setConfirmAction(undefined)}
        />
      )}
      {/* La fin de partie s'affiche après l'écran de résultat, au clic de l'admin sur « Tour suivant » */}
      {!!winner && !roundResult && (
        <FinishGamePopin onClick={() => gameService.cancelGame(game.gameCode)} player={winner} />
      )}
    </>
  );
}
