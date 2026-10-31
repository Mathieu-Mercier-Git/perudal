import React from 'react';
import { act } from 'react-dom/test-utils';
import { mount, ReactWrapper } from 'enzyme';
import useBackButtonHandler from '../../../src/components/navigation/useBackButtonHandler';

type Props = {
  onBack: () => void,
  isEnabled?: boolean,
};

function BackButtonComponent({ onBack, isEnabled }: Props) {
  useBackButtonHandler(onBack, isEnabled);
  return null;
}

function pressBack(): void {
  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

describe('useBackButtonHandler', () => {
  let wrapper: ReactWrapper | undefined;
  let pushState: jest.SpyInstance;

  beforeEach(() => {
    window.history.replaceState(null, '');
    pushState = jest.spyOn(window.history, 'pushState');
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    pushState.mockRestore();
  });

  test('ajoute une entrée à l\'historique au montage', () => {
    wrapper = mount(<BackButtonComponent onBack={jest.fn()} />);

    expect(pushState).toHaveBeenCalledTimes(1);
  });

  test('appelle la fonction et remet une entrée à chaque appui sur Précédent', () => {
    const onBack: jest.Mock = jest.fn();
    wrapper = mount(<BackButtonComponent onBack={onBack} />);

    pressBack();
    pressBack();

    expect(onBack).toHaveBeenCalledTimes(2);
    expect(pushState).toHaveBeenCalledTimes(3);
  });

  test('utilise la dernière fonction reçue', () => {
    const firstOnBack: jest.Mock = jest.fn();
    const lastOnBack: jest.Mock = jest.fn();
    wrapper = mount(<BackButtonComponent onBack={firstOnBack} />);

    wrapper.setProps({ onBack: lastOnBack });
    pressBack();

    expect(firstOnBack).not.toHaveBeenCalled();
    expect(lastOnBack).toHaveBeenCalledTimes(1);
  });

  test('n\'empile pas d\'entrée si la page courante en est déjà une', () => {
    window.history.replaceState({ backGuard: true }, '');

    wrapper = mount(<BackButtonComponent onBack={jest.fn()} />);

    expect(pushState).not.toHaveBeenCalled();
  });

  test('conserve l\'état du routeur dans l\'entrée ajoutée', () => {
    window.history.replaceState({ key: 'abc', usr: null }, '');

    wrapper = mount(<BackButtonComponent onBack={jest.fn()} />);

    expect(window.history.state).toEqual({ key: 'abc', usr: null, backGuard: true });
  });

  test('n\'intercepte rien tant qu\'il est désactivé', () => {
    const onBack: jest.Mock = jest.fn();
    wrapper = mount(<BackButtonComponent onBack={onBack} isEnabled={false} />);

    pressBack();

    expect(pushState).not.toHaveBeenCalled();
    expect(onBack).not.toHaveBeenCalled();
  });

  test('n\'intercepte plus rien après le démontage', () => {
    const onBack: jest.Mock = jest.fn();
    wrapper = mount(<BackButtonComponent onBack={onBack} />);

    wrapper.unmount();
    wrapper = undefined;
    pressBack();

    expect(onBack).not.toHaveBeenCalled();
  });
});
