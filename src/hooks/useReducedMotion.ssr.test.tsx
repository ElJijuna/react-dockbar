/**
 * @jest-environment node
 */
import { renderToString } from 'react-dom/server';
import { useReducedMotion } from './useReducedMotion';

const Preference = () => {
  const reduced = useReducedMotion();
  return <span>{String(reduced)}</span>;
};

it('renders a false server snapshot without window or browser APIs', () => {
  expect(typeof window).toBe('undefined');
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    expect(renderToString(<Preference />)).toBe('<span>false</span>');
    expect(error).not.toHaveBeenCalled();
  } finally {
    error.mockRestore();
  }
});
