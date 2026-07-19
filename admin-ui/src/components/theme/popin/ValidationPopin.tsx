import React from 'react';
import { getGlobalInstance } from 'plume-ts-di';
import PlumeAdminTheme from '../../../lib/plume-admin-theme/PlumeAdminTheme';
import ActionStyle from '../../../lib/plume-admin-theme/action/ActionStyle';
import { Popin } from './Popin';
import useMessages from '../../../i18n/hooks/messagesHook';

type Props = {
  title: string,
  onValidation: () => void,
  onClose: () => void,
  description?: string,
  children?: React.ReactNode;
  submitMessage?: string,
  secondaryButtonLabel?: string,
  zIndex?: number,
  isLoading?: boolean,
};

export default function ValidationPopin({
  onClose, onValidation, title, description, submitMessage, secondaryButtonLabel, zIndex, isLoading, children,
}: Props) {
  const { messages } = useMessages();
  const theme = getGlobalInstance(PlumeAdminTheme);

  return (
    <Popin zIndex={zIndex || 105}>
      <div className="popin-title">
        {title}
      </div>
      {!!description && (<p className="popin-message">{description}</p>)}
      {!!children && (<div className="popin-content">{children}</div>)}
      <div className="popin-buttons">
        <theme.actionsContainer>
          <theme.actionButton
            style={ActionStyle.PRIMARY}
            onClick={onValidation}
          >
            {submitMessage || messages.action.confirm}
          </theme.actionButton>
          <theme.actionButton
            style={ActionStyle.SECONDARY}
            onClick={onClose}
            isLoading={isLoading}
          >
            {secondaryButtonLabel || messages.action.close}
          </theme.actionButton>
        </theme.actionsContainer>
      </div>
    </Popin>
  );
}
