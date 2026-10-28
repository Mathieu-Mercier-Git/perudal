import React from 'react';
import { Popin } from '../../../theme/popin/Popin';
import ActionStyle from '../../../../lib/plume-admin-theme/action/ActionStyle';
import { ActionButton, ActionsContainer } from '../../../theme/action/Actions';
import { Player } from '../../../../services/game/GameTypes';
import PlayerName from '../../../theme/player/PlayerName';

const toucanImage: string = '/assets/images/toucan_blanc.png';

type Props = {
  onClick: () => void,
  player: Player,
};

export default function FinishGamePopin({ onClick, player }: Props) {
  return (
    <Popin>
      <div className="finish-popin">
        <img className="finish-popin__toucan" src={toucanImage} alt="" />
        <span className="finish-popin__label">Partie terminée</span>
        <div className="finish-popin__winner"><PlayerName player={player} /></div>
        <p className="finish-popin__subtitle">
          Grand vainqueur. Les autres peuvent rentrer se coucher.
        </p>
      </div>
      <div className="popin-buttons">
        <ActionsContainer>
          <ActionButton
            style={ActionStyle.PRIMARY}
            onClick={onClick}
          >
            Retour à l'accueil
          </ActionButton>
        </ActionsContainer>
      </div>
    </Popin>
  );
}
