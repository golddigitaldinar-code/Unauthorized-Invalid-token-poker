/** Casino chip colours by value, largest first. */
export type ChipColor = 'gold' | 'purple' | 'black' | 'green' | 'red' | 'white' | 'blue';

export const CHIP_DENOMINATIONS: { value: number; color: ChipColor }[] = [
  { value: 1000, color: 'gold' },
  { value: 500, color: 'purple' },
  { value: 100, color: 'black' },
  { value: 25, color: 'green' },
  { value: 5, color: 'red' },
  { value: 1, color: 'white' },
  { value: 0.5, color: 'blue' },
];

export interface ChipColumn {
  value: number;
  color: ChipColor;
  count: number;
}

const MAX_COLUMNS = 3;
const MAX_PER_COLUMN = 6;

/** Splits an amount into stacks of real chip values, like a dealer would, showing the largest few stacks. */
export function chipColumns(amount: number): ChipColumn[] {
  let rest = Math.round(Math.max(0, amount) * 100) / 100;
  const columns: ChipColumn[] = [];
  for (const { value, color } of CHIP_DENOMINATIONS) {
    const count = Math.floor(rest / value + 1e-9);
    if (count > 0) {
      columns.push({ value, color, count: Math.min(count, MAX_PER_COLUMN) });
      rest = Math.round((rest - count * value) * 100) / 100;
    }
    if (columns.length === MAX_COLUMNS) break;
  }
  return columns.length > 0 ? columns : [{ value: 0.5, color: 'blue', count: 1 }];
}
