import type { Implementations } from "@/components/visualizer";

/** Shell sort (Shell's gaps n/2, n/4, …, 1) — same names and structure as SHELL_CODE (basic/pseudocode.ts). */
export const SHELL_IMPL: Implementations = {
  python: `def shell_sort(A):
    # Sorts list A in place, ascending. NOT stable, O(1) extra space.
    # Shell's gaps n/2, n/4, ..., 1 (the last pass is insertion sort).
    n = len(A)
    gap = n // 2
    while gap > 0:
        # insertion sort on elements that are gap apart
        for i in range(gap, n):
            tmp = A[i]
            j = i
            while j >= gap and A[j - gap] > tmp:
                A[j] = A[j - gap]       # shift by a whole gap
                j -= gap
            A[j] = tmp
        gap //= 2
`,
  cpp: `#include <vector>

// Sorts A in place, ascending. NOT stable, O(1) extra space.
// Shell's gaps n/2, n/4, ..., 1 (the last pass is insertion sort).
void shellSort(std::vector<int>& A) {
    int n = static_cast<int>(A.size());
    for (int gap = n / 2; gap > 0; gap /= 2) {
        // insertion sort on elements that are gap apart
        for (int i = gap; i <= n - 1; i++) {
            int tmp = A[i];
            int j = i;
            while (j >= gap && A[j - gap] > tmp) {
                A[j] = A[j - gap];          // shift by a whole gap
                j -= gap;
            }
            A[j] = tmp;
        }
    }
}
`,
  java: `public class ShellSort {
    // Sorts A in place, ascending. NOT stable, O(1) extra space.
    // Shell's gaps n/2, n/4, ..., 1 (the last pass is insertion sort).
    public static void shellSort(int[] A) {
        int n = A.length;
        for (int gap = n / 2; gap > 0; gap /= 2) {
            // insertion sort on elements that are gap apart
            for (int i = gap; i <= n - 1; i++) {
                int tmp = A[i];
                int j = i;
                while (j >= gap && A[j - gap] > tmp) {
                    A[j] = A[j - gap];      // shift by a whole gap
                    j -= gap;
                }
                A[j] = tmp;
            }
        }
    }
}
`,
  javascript: `// Sorts array A in place, ascending. NOT stable, O(1) extra space.
// Shell's gaps n/2, n/4, ..., 1 (the last pass is insertion sort).
function shellSort(A) {
    const n = A.length;
    for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
        // insertion sort on elements that are gap apart
        for (let i = gap; i <= n - 1; i++) {
            const tmp = A[i];
            let j = i;
            while (j >= gap && A[j - gap] > tmp) {
                A[j] = A[j - gap];          // shift by a whole gap
                j -= gap;
            }
            A[j] = tmp;
        }
    }
}
`,
};
