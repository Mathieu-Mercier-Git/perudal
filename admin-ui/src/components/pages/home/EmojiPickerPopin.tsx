import React from 'react';
import { Popin } from '../../theme/popin/Popin';
import { ActionButton, ActionsContainer } from '../../theme/action/Actions';
import ActionStyle from '../../../lib/plume-admin-theme/action/ActionStyle';
import classNames from '../../../lib/class-names/ClassNames';
import { PLAYER_EMOJIS } from '../../../services/user/PlayerEmojis';

type Props = {
  selectedEmoji: string,
  onSelect: (emoji: string) => void,
  onClose: () => void,
};

export default function EmojiPickerPopin({ selectedEmoji, onSelect, onClose }: Props) {
  return (
    <Popin>
      <div className="popin-title">Choisis ton emoji</div>
      <div className="popin-content emoji-picker">
        {PLAYER_EMOJIS.map((emoji: string) => (
          <button
            key={emoji}
            type="button"
            className={classNames('emoji-picker__item', { 'emoji-picker__item--selected': emoji === selectedEmoji })}
            onClick={() => onSelect(emoji)}
            aria-label={`Choisir ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
      <div className="popin-buttons">
        <ActionsContainer>
          <ActionButton style={ActionStyle.DANGER} onClick={onClose}>
            Fermer
          </ActionButton>
        </ActionsContainer>
      </div>
    </Popin>
  );
}
