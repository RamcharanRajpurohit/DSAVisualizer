import type { Implementations } from "@/components/visualizer";

/** Bubble sort — same names and structure as BUBBLE_CODE (basic/pseudocode.ts). */
export const BUBBLE_IMPL: Implementations = {
  python: `def bubble_sort(A):
    # Sorts list A in place, ascending. Stable, O(1) extra space.
    n = len(A)
    for i in range(n - 1):              # i = 0 .. n-2
        swapped = False
        for j in range(n - 1 - i):      # j = 0 .. n-2-i
            if A[j] > A[j + 1]:         # strict > keeps it stable
                A[j], A[j + 1] = A[j + 1], A[j]
                swapped = True
        # A[n-1-i] is now final
        if not swapped:                 # no swaps: already sorted
            break
`,
  cpp: `#include <utility>
#include <vector>

// Sorts A in place, ascending. Stable, O(1) extra space.
void bubbleSort(std::vector<int>& A) {
    int n = static_cast<int>(A.size());
    for (int i = 0; i <= n - 2; i++) {
        bool swapped = false;
        for (int j = 0; j <= n - 2 - i; j++) {
            if (A[j] > A[j + 1]) {          // strict > keeps it stable
                std::swap(A[j], A[j + 1]);
                swapped = true;
            }
        }
        // A[n-1-i] is now final
        if (!swapped) break;                // no swaps: already sorted
    }
}
`,
  java: `public class BubbleSort {
    // Sorts A in place, ascending. Stable, O(1) extra space.
    public static void bubbleSort(int[] A) {
        int n = A.length;
        for (int i = 0; i <= n - 2; i++) {
            boolean swapped = false;
            for (int j = 0; j <= n - 2 - i; j++) {
                if (A[j] > A[j + 1]) {      // strict > keeps it stable
                    int t = A[j];
                    A[j] = A[j + 1];
                    A[j + 1] = t;
                    swapped = true;
                }
            }
            // A[n-1-i] is now final
            if (!swapped) break;            // no swaps: already sorted
        }
    }
}
`,
  javascript: `// Sorts array A in place, ascending. Stable, O(1) extra space.
function bubbleSort(A) {
    const n = A.length;
    for (let i = 0; i <= n - 2; i++) {
        let swapped = false;
        for (let j = 0; j <= n - 2 - i; j++) {
            if (A[j] > A[j + 1]) {          // strict > keeps it stable
                [A[j], A[j + 1]] = [A[j + 1], A[j]];
                swapped = true;
            }
        }
        // A[n-1-i] is now final
        if (!swapped) break;                // no swaps: already sorted
    }
}
`,
};
