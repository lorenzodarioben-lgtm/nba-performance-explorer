import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BarChart } from './BarChart';

const scaleOf = (rect: SVGRectElement) =>
  Number(/scaleY\(([^)]+)\)/.exec(rect.style.transform)?.[1] ?? NaN);

describe('BarChart', () => {
  it('shows each value as a scale of its side of the baseline and never draws a missing value', async () => {
    // Domain −4…8 on a 176 px plot (220 high, 16 top and 28 bottom padding): the baseline sits
    // at y = 133.33, the top of the domain at 16 and the bottom at 192.
    const { container } = render(
      <BarChart
        label="Margins"
        format={(value) => value.toFixed(0)}
        yDomain={[-4, 8]}
        data={[
          { key: 'a', label: 'A', value: 6 },
          { key: 'b', label: 'B', value: -3 },
          { key: 'c', label: 'C', value: null },
        ]}
      />,
    );
    const bars = [...container.querySelectorAll<SVGRectElement>('.bchart__bar')];
    expect(bars).toHaveLength(2);
    const [up, down] = bars as [SVGRectElement, SVGRectElement];

    // The positive bar spans baseline → domain top and is scaled to 6/8 of it.
    expect(Number(up.getAttribute('y'))).toBeCloseTo(16, 2);
    expect(Number(up.getAttribute('height'))).toBeCloseTo(117.33, 2);
    // The negative bar spans baseline → domain bottom and is scaled to 3/4 of it.
    expect(Number(down.getAttribute('y'))).toBeCloseTo(133.33, 2);
    expect(Number(down.getAttribute('height'))).toBeCloseTo(58.67, 2);
    await waitFor(() => {
      expect(scaleOf(up)).toBeCloseTo(0.75, 6);
      expect(scaleOf(down)).toBeCloseTo(0.75, 6);
    });

    // A missing value is a "not recorded" mark on the baseline, not a zero-height bar.
    expect(container.querySelectorAll('.bchart__missing')).toHaveLength(1);
  });
});
