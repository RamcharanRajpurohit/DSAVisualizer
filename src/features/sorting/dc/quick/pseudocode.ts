/** Quick sort pseudocode per partition scheme; recorded steps reference these 1-based line numbers. */
export const LOMUTO_PSEUDOCODE = [
  "quickSort(A, lo, hi):",
  "  if lo >= hi: return          ▹ 0 or 1 element",
  "  p = partition(A, lo, hi)     ▹ pivot lands at p",
  "  quickSort(A, lo, p - 1)",
  "  quickSort(A, p + 1, hi)",
  "",
  "partition(A, lo, hi):          ▹ Lomuto",
  "  choose a pivot, swap it into A[hi]",
  "  pivot = A[hi]",
  "  i = lo - 1                   ▹ end of the ≤ region",
  "  for j = lo to hi - 1:",
  "    if A[j] <= pivot:",
  "      i = i + 1",
  "      swap A[i], A[j]",
  "  swap A[i + 1], A[hi]         ▹ pivot to its final spot",
  "  return i + 1",
] as const;

export const HOARE_PSEUDOCODE = [
  "quickSort(A, lo, hi):",
  "  if lo >= hi: return          ▹ 0 or 1 element",
  "  p = partition(A, lo, hi)",
  "  quickSort(A, lo, p)",
  "  quickSort(A, p + 1, hi)",
  "",
  "partition(A, lo, hi):          ▹ Hoare",
  "  choose a pivot, swap it into A[lo]",
  "  pivot = A[lo]",
  "  i = lo - 1;  j = hi + 1",
  "  loop forever:",
  "    do i = i + 1 while A[i] < pivot",
  "    do j = j - 1 while A[j] > pivot",
  "    if i >= j: return j        ▹ pointers crossed",
  "    swap A[i], A[j]",
] as const;

/** Shared line numbers (the first 10 lines line up in both schemes). */
export const QL = {
  call: 1,
  base: 2,
  partition: 3,
  recurseLeft: 4,
  recurseRight: 5,
  choose: 8,
  pivot: 9,
  init: 10,
  // Lomuto
  loop: 11,
  test: 12,
  inc: 13,
  swap: 14,
  place: 15,
  ret: 16,
  // Hoare
  hLoop: 11,
  scanI: 12,
  scanJ: 13,
  cross: 14,
  hSwap: 15,
} as const;
