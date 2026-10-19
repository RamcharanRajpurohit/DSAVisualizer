/** Pseudocode shown next to the canvas. Steps refer to these lines (1-based). */

export const BUBBLE_CODE = [
  "procedure bubbleSort(A, n)",
  "  for i ← 0 to n − 2 do",
  "    swapped ← false",
  "    for j ← 0 to n − 2 − i do",
  "      if A[j] > A[j + 1] then",
  "        swap(A[j], A[j + 1])",
  "        swapped ← true",
  "    // A[n − 1 − i] is now final",
  "    if not swapped then break",
] as const;

export const SELECTION_CODE = [
  "procedure selectionSort(A, n)",
  "  for i ← 0 to n − 2 do",
  "    min ← i",
  "    for j ← i + 1 to n − 1 do",
  "      if A[j] < A[min] then",
  "        min ← j",
  "    if min ≠ i then",
  "      swap(A[i], A[min])",
  "    // A[0..i] is now final",
] as const;

export const INSERTION_CODE = [
  "procedure insertionSort(A, n)",
  "  for i ← 1 to n − 1 do",
  "    key ← A[i]",
  "    j ← i − 1",
  "    while j ≥ 0 and A[j] > key do",
  "      A[j + 1] ← A[j]",
  "      j ← j − 1",
  "    A[j + 1] ← key",
] as const;

export const SHELL_CODE = [
  "procedure shellSort(A, n)",
  "  gap ← ⌊n / 2⌋",
  "  while gap > 0 do",
  "    for i ← gap to n − 1 do",
  "      tmp ← A[i]",
  "      j ← i",
  "      while j ≥ gap ∧ A[j−gap] > tmp do",
  "        A[j] ← A[j − gap]",
  "        j ← j − gap",
  "      A[j] ← tmp",
  "    gap ← ⌊gap / 2⌋",
] as const;

export const COUNTING_CODE = [
  "procedure countingSort(A, n)",
  "  lo ← min(A);  k ← max(A) − lo + 1",
  "  C ← k zeros;  B ← array of size n",
  "  for i ← 0 to n − 1 do",
  "    C[A[i] − lo] ← C[A[i] − lo] + 1",
  "  for v ← 1 to k − 1 do",
  "    C[v] ← C[v] + C[v − 1]",
  "  for i ← n − 1 downto 0 do",
  "    v ← A[i] − lo",
  "    C[v] ← C[v] − 1",
  "    B[C[v]] ← A[i]",
  "  copy B into A",
] as const;

export const RADIX_CODE = [
  "procedure radixSortLSD(A, n)",
  "  off ← max(0, −min(A))  // keys ≥ 0",
  "  for exp ← 1, 10, … ≤ max(A) + off do",
  "    bucket[0..9] ← empty queues",
  "    for i ← 0 to n − 1 do",
  "      d ← ⌊(A[i] + off) / exp⌋ mod 10",
  "      append A[i] to bucket[d]",
  "    A ← bucket[0] ++ … ++ bucket[9]",
  "  return A",
] as const;
