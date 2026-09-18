/** N players → N-1 chairs, numbered 1..N-1 then shuffled for reveal order. */
export function generateChairNumbers(count: number): number[] {
  const nums = Array.from({ length: count }, (_, i) => i + 1);
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j]!, nums[i]!];
  }
  return nums;
}

export function msElapsed(from: Date): number {
  return Date.now() - from.getTime();
}
