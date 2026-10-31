import React, { useState } from 'react';
import { Icon } from '@mui/material';
import classNames from '../../../../lib/class-names/ClassNames';
import useMessages from '../../../../i18n/hooks/messagesHook';
import { Translations } from '../../../../i18n/translations/Translations';
import { Game, Player } from '../../../../services/game/GameTypes';
import {
  BidContext,
  BidValue,
  cycleFace,
  InvalidBid,
  InvalidBidReason,
  invalidReason,
  isPerudo,
  minimalValidBid,
} from '../../../../services/game/BidRules';
import ActionStyle from '../../../../lib/plume-admin-theme/action/ActionStyle';
import { ActionButton } from '../../../theme/action/Actions';
import PlayerName from '../../../theme/player/PlayerName';
import Dice from '../dice/Dice';
import BidLabel from './BidLabel';
import { DiceCountChip } from './PlayerOrderList';
import {
  bidContextOf, findPlayer, OrderedPlayer, orderedPlayers,
} from './OnlineGameUtils';

const DEFAULT_CLASSIC_FACE: number = 2;

type Props = {
  game: Game,
  mainPlayer: Player,
  isSubmitting: boolean,
  onBack: () => void,
  onSubmit: (bid: BidValue) => void,
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

function invalidMessage(messages: Translations, invalid: InvalidBid, context: BidContext): string {
  const texts: Translations['online_game'] = messages.online_game;
  switch (invalid.reason) {
    case InvalidBidReason.OPENING_PERUDO:
      return texts.invalid_opening_perudo;
    case InvalidBidReason.PLANIFICATO_LOCKED_FACE:
      return texts.invalid_planificato(invalid.lockedFace ?? context.previous?.face ?? DEFAULT_CLASSIC_FACE);
    case InvalidBidReason.CLASSIC_TOO_LOW:
      return texts.invalid_classic;
    case InvalidBidReason.TO_PERUDO_TOO_LOW:
      return texts.invalid_to_perudo(invalid.minimumQuantity ?? 1);
    case InvalidBidReason.FROM_PERUDO_TOO_LOW:
      return texts.invalid_from_perudo(invalid.minimumQuantity ?? 1);
    case InvalidBidReason.PERUDO_TOO_LOW:
      return texts.invalid_perudo(context.previous?.quantity ?? 0);
    default:
      return texts.invalid_out_of_range(context.totalDice);
  }
}

// Écran de sélection de la mise : cadenas à deux molettes (nombre de dés × valeur)
export default function BidSelector({
  game, mainPlayer, isSubmitting, onBack, onSubmit,
}: Props) {
  const { messages } = useMessages();
  const texts: Translations['online_game'] = messages.online_game;

  const context: BidContext = bidContextOf(game);
  const { previous } = context;
  const maxQuantity: number = Math.max(context.totalDice, 1);
  // En planificato, la face est verrouillée dès que la manche est ouverte
  const isFaceLocked: boolean = context.planificato && !!previous;

  const [bid, setBid] = useState<BidValue>(() => {
    const minimal: BidValue = minimalValidBid(context);
    return { ...minimal, quantity: clamp(minimal.quantity, 1, maxQuantity) };
  });

  const isBidPerudo: boolean = isPerudo(bid.face);
  const invalid: InvalidBid | undefined = invalidReason(bid, context);

  const changeQuantity = (delta: number) => setBid({ ...bid, quantity: clamp(bid.quantity + delta, 1, maxQuantity) });

  const changeFace = (delta: number) => setBid({ ...bid, face: cycleFace(bid.face, delta) });

  const bidder: Player | undefined = findPlayer(game, previous ? game.currentBid?.playerId : undefined);

  return (
    <>
      <div className="online-strip">
        {orderedPlayers(game).map(({ player, position }: OrderedPlayer) => (
          <div key={player.id} className="online-strip__player">
            <span className={classNames('online-position', { 'online-position--active': player.id === mainPlayer.id })}>
              {position}
            </span>
            <PlayerName player={player} className="online-strip__name" />
            <DiceCountChip count={player.diceNumber} />
          </div>
        ))}
      </div>

      <div className="online-panel online-panel--bidding">
        <div className="online-bid__context">
          {previous && (
            <span className="online-bid__to-beat">
              {bidder && (<PlayerName player={bidder} className="online-bid__bidder" />)}
              <BidLabel quantity={previous.quantity} face={previous.face} isPlanificato={game.isPlanificato} />
            </span>
          )}
          <div className="online-bid__mydice">
            {mainPlayer.dices.map((dice: number, index: number) => (
              <Dice key={index} number={dice} show isPlanificato={game.isPlanificato} size="sm" />
            ))}
          </div>
        </div>

        <div className="online-lock">
          <div className="online-lock__wheel">
            <span className="online-label">{texts.quantity_label}</span>
            <button
              type="button"
              className="online-lock__arrow"
              aria-label={texts.quantity_up}
              disabled={bid.quantity >= maxQuantity}
              onClick={() => changeQuantity(1)}
            >
              <Icon>expand_less</Icon>
            </button>
            <div className="online-lock__value">
              <span className="online-lock__quantity">{bid.quantity}</span>
            </div>
            <button
              type="button"
              className="online-lock__arrow"
              aria-label={texts.quantity_down}
              disabled={bid.quantity <= 1}
              onClick={() => changeQuantity(-1)}
            >
              <Icon>expand_more</Icon>
            </button>
          </div>
          <span className="online-lock__times">×</span>
          <div className="online-lock__wheel">
            <span className="online-label">
              {isBidPerudo && !context.planificato ? texts.face_label_perudo : texts.face_label}
            </span>
            <button
              type="button"
              className="online-lock__arrow"
              aria-label={texts.face_up}
              disabled={isFaceLocked}
              onClick={() => changeFace(1)}
            >
              <Icon>expand_less</Icon>
            </button>
            <div
              className={classNames('online-lock__value', {
                'online-lock__value--perudo': isBidPerudo && !context.planificato,
              })}
            >
              <Dice number={bid.face} show isPlanificato={game.isPlanificato} size="xl" />
            </div>
            <button
              type="button"
              className="online-lock__arrow"
              aria-label={texts.face_down}
              disabled={isFaceLocked}
              onClick={() => changeFace(-1)}
            >
              <Icon>expand_more</Icon>
            </button>
          </div>
        </div>

        <div
          className={classNames('online-validation', invalid ? 'online-validation--ko' : 'online-validation--ok')}
          role="status"
        >
          <Icon>{invalid ? 'error_outline' : 'check'}</Icon>
          <span>{invalid ? invalidMessage(messages, invalid, context) : texts.valid_bid}</span>
        </div>

        <div className="online-bid__buttons">
          <ActionButton style={ActionStyle.SECONDARY} onClick={onBack}>
            {texts.back}
          </ActionButton>
          <ActionButton
            style={ActionStyle.PRIMARY}
            disabled={!!invalid}
            isLoading={isSubmitting}
            onClick={() => onSubmit(bid)}
          >
            {texts.validate_bid}
          </ActionButton>
        </div>
      </div>
    </>
  );
}
