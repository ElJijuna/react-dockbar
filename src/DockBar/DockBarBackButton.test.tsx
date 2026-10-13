import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DOCKBAR_BACK_ID } from '../constants';
import { DockBarBackButton, type DockBarBackButtonProps } from './DockBarBackButton';

function props(overrides: Partial<DockBarBackButtonProps> = {}): DockBarBackButtonProps {
  return {
    skipIntro: false,
    item: { id: DOCKBAR_BACK_ID, label: 'Back', icon: <span>Back icon</span> },
    ariaLabel: 'Back to Settings',
    leaving: false,
    tabIndex: 0,
    animationDuration: 260,
    onActivate: jest.fn(),
    ...overrides,
  };
}

const backButton = () => screen.getByRole('button', { name: 'Back to Settings' });

function backArea(container: HTMLElement) {
  const area = container.querySelector<HTMLElement>('[data-dockbar-part="back-area"]');
  if (!area) {
    throw new Error('Back area missing');
  }
  return area;
}

describe('DockBarBackButton', () => {
  it('renders the custom icon, accessible name, tab stop and transition duration', () => {
    const initial = props({ itemClassName: 'custom-back' });
    const { container, rerender } = render(<DockBarBackButton {...initial} />);
    const button = backButton();
    expect(screen.getByText('Back icon')).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('tabindex', '0');
    expect(button).toHaveClass('custom-back', 'back');
    expect(button).not.toHaveAttribute('aria-current');
    expect(button).not.toHaveAttribute('data-dockbar-active');
    expect(button.style.getPropertyValue('--dockbar-magnify-transition')).toBe('0ms');
    expect(backArea(container).style.getPropertyValue('--dockbar-transition-duration')).toBe(
      '260ms',
    );
    rerender(
      <DockBarBackButton {...initial} tabIndex={-1} animationDuration={0} ariaLabel="Return" />,
    );
    expect(screen.getByRole('button', { name: 'Return' })).toHaveAttribute('tabindex', '-1');
    expect(backArea(container).style.getPropertyValue('--dockbar-transition-duration')).toBe('0ms');
  });

  it('tracks hover on its bubble and reports the back state to itemClassName', () => {
    const itemClassName = jest.fn(() => 'back-state');
    const initial = props({ itemClassName });
    const { container } = render(<DockBarBackButton {...initial} />);
    expect(backButton()).not.toHaveAttribute('data-dockbar-hovered');
    fireEvent.mouseEnter(backArea(container));
    expect(backButton()).toHaveAttribute('data-dockbar-hovered', 'true');
    expect(itemClassName).toHaveBeenLastCalledWith(initial.item, {
      hovered: true,
      isBack: true,
      active: false,
      containsActive: false,
      pressed: false,
    });
    fireEvent.mouseLeave(backArea(container));
    expect(backButton()).not.toHaveAttribute('data-dockbar-hovered');
    expect(itemClassName).toHaveBeenLastCalledWith(initial.item, {
      hovered: false,
      isBack: true,
      active: false,
      containsActive: false,
      pressed: false,
    });
  });

  it.each([true, false])('keeps skipIntro=%s fixed for the lifetime of the bubble', (skipIntro) => {
    const initial = props({ skipIntro });
    const { container, rerender } = render(<DockBarBackButton {...initial} />);
    expect(backArea(container).hasAttribute('data-dockbar-static')).toBe(skipIntro);
    rerender(<DockBarBackButton {...initial} skipIntro={!skipIntro} leaving />);
    expect(backArea(container).hasAttribute('data-dockbar-static')).toBe(skipIntro);
    expect(backArea(container)).toHaveAttribute('data-dockbar-leaving', 'true');
    rerender(<DockBarBackButton {...initial} leaving={false} />);
    expect(backArea(container)).not.toHaveAttribute('data-dockbar-leaving');
  });

  it('resets the entrance decision when a new bubble mounts', () => {
    const initial = props({ skipIntro: true });
    const { container, rerender } = render(<DockBarBackButton key="initial" {...initial} />);
    expect(backArea(container)).toHaveAttribute('data-dockbar-static');
    rerender(<DockBarBackButton key="new" {...initial} skipIntro={false} />);
    expect(backArea(container)).not.toHaveAttribute('data-dockbar-static');
  });

  it.each(['click', 'Enter', 'Space'])('forwards %s activation exactly once', async (action) => {
    const user = userEvent.setup();
    const initial = props();
    render(<DockBarBackButton {...initial} />);
    if (action === 'click') {
      await user.click(backButton());
    } else {
      await user.tab();
      await user.keyboard(action === 'Enter' ? '{Enter}' : ' ');
    }
    expect(initial.onActivate).toHaveBeenCalledTimes(1);
    expect(initial.onActivate).toHaveBeenCalledWith(
      initial.item,
      expect.objectContaining({ type: 'click' }),
    );
  });

  it('accepts keyboard focus and blur without magnifying or activating', () => {
    const initial = props();
    render(<DockBarBackButton {...initial} />);
    const button = backButton();
    // jsdom cannot infer keyboard focus visibility; expose the native focus-visible branch.
    const matches = jest.spyOn(button, 'matches').mockReturnValue(true);
    try {
      act(() => button.focus());
      expect(button).toHaveFocus();
      fireEvent.blur(button);
      expect(button.style.getPropertyValue('--dockbar-item-scale')).toBe('');
      expect(initial.onActivate).not.toHaveBeenCalled();
    } finally {
      matches.mockRestore();
    }
  });

  it('does not activate a disabled Back item', async () => {
    const user = userEvent.setup();
    const initial = props();
    initial.item.disabled = true;
    render(<DockBarBackButton {...initial} />);
    expect(backButton()).toBeDisabled();
    await user.click(backButton());
    expect(initial.onActivate).not.toHaveBeenCalled();
  });
});
