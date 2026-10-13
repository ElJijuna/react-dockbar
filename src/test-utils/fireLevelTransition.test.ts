import { endLevelTransition } from './fireLevelTransition';

function createLevel() {
  const level = document.createElement('div');
  level.setAttribute('data-dockbar-part', 'level');
  return level;
}

describe('endLevelTransition', () => {
  it('fires one bubbling animationend on the level itself, rather than its child item', () => {
    const container = document.createElement('div');
    const level = createLevel();
    const child = document.createElement('button');
    level.append(child);
    container.append(level);
    const onLevel = jest.fn((event: Event) => ({
      type: event.type,
      target: event.target,
      currentTarget: event.currentTarget,
      bubbles: event.bubbles,
    }));
    const onChild = jest.fn();
    const onContainer = jest.fn();
    level.addEventListener('animationend', onLevel);
    child.addEventListener('animationend', onChild);
    container.addEventListener('animationend', onContainer);

    endLevelTransition(container);

    expect(onLevel).toHaveBeenCalledTimes(1);
    expect(onLevel).toHaveReturnedWith({
      type: 'animationend',
      target: level,
      currentTarget: level,
      bubbles: true,
    });
    expect(onChild).not.toHaveBeenCalled();
    expect(onContainer).toHaveBeenCalledTimes(1);
  });

  it('targets only the first level within the supplied container', () => {
    const container = document.createElement('div');
    const first = createLevel();
    const second = createLevel();
    const outside = createLevel();
    const onFirst = jest.fn();
    const onSecond = jest.fn();
    const onOutside = jest.fn();
    first.addEventListener('animationend', onFirst);
    second.addEventListener('animationend', onSecond);
    outside.addEventListener('animationend', onOutside);
    container.append(first, second);
    const outer = document.createElement('div');
    outer.append(outside, container);

    endLevelTransition(container);

    expect(onFirst).toHaveBeenCalledTimes(1);
    expect(onSecond).not.toHaveBeenCalled();
    expect(onOutside).not.toHaveBeenCalled();
  });

  it('supports a DocumentFragment and emits a separate event on each call', () => {
    const fragment = document.createDocumentFragment();
    const level = createLevel();
    fragment.append(level);
    const listener = jest.fn<void, [Event]>();
    level.addEventListener('animationend', listener);

    endLevelTransition(fragment);
    endLevelTransition(fragment);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[0][0]).not.toBe(listener.mock.calls[1][0]);
  });

  it('throws a descriptive error without emitting an event when the level is missing', () => {
    const container = document.createElement('div');
    const unrelated = document.createElement('div');
    unrelated.setAttribute('data-dockbar-part', 'item');
    container.append(unrelated);
    const listener = jest.fn();
    container.addEventListener('animationend', listener);

    expect(() => endLevelTransition(container)).toThrow(
      'endLevelTransition: no [data-dockbar-part="level"] element found',
    );
    expect(listener).not.toHaveBeenCalled();
  });
});
