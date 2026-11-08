import React, { useEffect, useRef } from 'react';
import { ActionButton, ActionsContainer } from '../action/Actions';
import ActionStyle from '../../../lib/plume-admin-theme/action/ActionStyle';
import { PopinCloseWithoutSavingProps, PopinProps } from '../../../lib/plume-admin-theme/popin/PopinProps';
import { Panel } from '../layout/Panel';
import useMessages from '../../../i18n/hooks/messagesHook';
import classNames from '../../../lib/class-names/ClassNames';

// Le geste de défilement part-il d'une zone de la popin qui peut réellement défiler (ex. liste d'emojis) ?
const isInsideScrollableArea = (target: EventTarget | null, popinElement: HTMLElement): boolean => {
  let element: HTMLElement | null = target instanceof HTMLElement ? target : null;
  while (element && element !== popinElement) {
    const { overflowY } = window.getComputedStyle(element);
    if ((overflowY === 'auto' || overflowY === 'scroll') && element.scrollHeight > element.clientHeight) {
      return true;
    }
    element = element.parentElement;
  }
  return false;
};

export function Popin({
  children, zIndex, height, width, className,
}: PopinProps) {
  const popinRef: React.RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);

  // Sur iOS, quand le clavier est ouvert, un glissé du doigt sur la popin fait défiler
  // la page derrière elle : on bloque ce geste, sauf dans les zones de la popin qui défilent.
  // L'écouteur doit être non passif pour pouvoir appeler preventDefault (impossible via onTouchMove de React)
  useEffect(() => {
    const popinElement: HTMLDivElement | null = popinRef.current;
    if (!popinElement) {
      return undefined;
    }
    const onTouchMove = (event: TouchEvent) => {
      if (!isInsideScrollableArea(event.target, popinElement)) {
        event.preventDefault();
      }
    };
    popinElement.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => popinElement.removeEventListener('touchmove', onTouchMove);
  }, []);

  return (
    <div ref={popinRef} className={classNames('popin', className)} style={{ zIndex: zIndex ?? 100 }}>
      <div className="popin-container" style={{ height, width }}>
        {children}
      </div>
    </div>
  );
}

export function PopinCloseWithoutSaving(
  { confirmCloseWithoutSaving, closeWithoutSavingAction }: PopinCloseWithoutSavingProps,
) {
  const { messages } = useMessages();

  return confirmCloseWithoutSaving.shouldAskConfirmation
    ? (
      <Popin zIndex={101}>
        <Panel>
          {messages.message.unsaved_data}
        </Panel>
        <ActionsContainer>
          <ActionButton
            style={ActionStyle.DANGER}
            onClick={confirmCloseWithoutSaving.confirm(closeWithoutSavingAction)}
          >
            {messages.action.close_without_saving}
          </ActionButton>
          <ActionButton
            style={ActionStyle.SECONDARY}
            onClick={confirmCloseWithoutSaving.reset}
          >
            {messages.action.keep_editing}
          </ActionButton>
        </ActionsContainer>
      </Popin>
    )
    : null;
}
