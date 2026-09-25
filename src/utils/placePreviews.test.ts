import { placePreviews, resolvePreviewSide } from './placePreviews';

describe('resolvePreviewSide', () => {
  it('opens above a horizontal dock unless it is pinned to the top', () => {
    expect(resolvePreviewSide('bottom-center', 'horizontal')).toBe('top');
    expect(resolvePreviewSide('inline', 'horizontal')).toBe('top');
    expect(resolvePreviewSide('top-left', 'horizontal')).toBe('bottom');
  });

  it('opens to the right of a vertical dock unless it is pinned to the right', () => {
    expect(resolvePreviewSide('left-center', 'vertical')).toBe('right');
    expect(resolvePreviewSide('right-center', 'vertical')).toBe('left');
    expect(resolvePreviewSide('bottom-right', 'vertical')).toBe('left');
  });
});

describe('placePreviews', () => {
  const viewport = { width: 1000, height: 800 };
  const panel = { width: 200, height: 100 };
  const anchor = { left: 490, top: 700, width: 20, height: 20 };

  it('centers the panel above the anchor', () => {
    expect(placePreviews(anchor, panel, 'top', viewport)).toEqual({ left: 400, top: 588 });
  });

  it('places the panel below the anchor', () => {
    expect(placePreviews({ ...anchor, top: 20 }, panel, 'bottom', viewport)).toEqual({
      left: 400,
      top: 52,
    });
  });

  it('keeps the panel inside the viewport near a corner', () => {
    expect(placePreviews({ ...anchor, left: 5 }, panel, 'top', viewport).left).toBe(8);
    expect(placePreviews({ ...anchor, left: 990 }, panel, 'top', viewport).left).toBe(792);
  });

  it('places the panel beside a vertical dock', () => {
    const side = { left: 16, top: 390, width: 20, height: 20 };
    expect(placePreviews(side, panel, 'right', viewport)).toEqual({ left: 48, top: 350 });
    expect(placePreviews({ ...side, left: 964 }, panel, 'left', viewport)).toEqual({
      left: 752,
      top: 350,
    });
  });
});
