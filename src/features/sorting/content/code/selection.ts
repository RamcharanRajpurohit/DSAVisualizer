import type { Implementations } from "@/components/visualizer";

/** Selection sort — same names and structure as SELECTION_CODE (basic/pseudocode.ts). */
export const SELECTION_IMPL: Implementations = {
  python: `def selection_sort(A):
    # Sorts list A in place, ascending. NOT stable, O(1) extra space.
    n = len(A)
    for i in range(n - 1):              # i = 0 .. n-2
        min_idx = i                     # "min" in the pseudocode
        for j in range(i + 1, n):       # scan the unsorted part
            if A[j] < A[min_idx]:
                min_idx = j
        if min_idx != i:                # at most one swap per pass
            A[i], A[min_idx] = A[min_idx], A[i]
        # A[0..i] is now final
`,
  cpp: `#include <utility>
#include <vector>

// Sorts A in place, ascending. NOT stable, O(1) extra space.
void selectionSort(std::vector<int>& A) {
    int n = static_cast<int>(A.size());
    for (int i = 0; i <= n - 2; i++) {
        int min = i;
        for (int j = i + 1; j <= n - 1; j++) {  // scan the unsorted part
            if (A[j] < A[min]) min = j;
        }
        if (min != i) {                         // at most one swap per pass
            std::swap(A[i], A[min]);
        }
        // A[0..i] is now final
    }
}
`,
  java: `public class SelectionSort {
    // Sorts A in place, ascending. NOT stable, O(1) extra space.
    public static void selectionSort(int[] A) {
        int n = A.length;
        for (int i = 0; i <= n - 2; i++) {
            int min = i;
            for (int j = i + 1; j <= n - 1; j++) {  // scan the unsorted part
                if (A[j] < A[min]) min = j;
            }
            if (min != i) {                     // at most one swap per pass
                int t = A[i];
                A[i] = A[min];
                A[min] = t;
            }
            // A[0..i] is now final
        }
    }
}
`,
  javascript: `// Sorts array A in place, ascending. NOT stable, O(1) extra space.
function selectionSort(A) {
    const n = A.length;
    for (let i = 0; i <= n - 2; i++) {
        let min = i;
        for (let j = i + 1; j <= n - 1; j++) {  // scan the unsorted part
            if (A[j] < A[min]) min = j;
        }
        if (min !== i) {                        // at most one swap per pass
            [A[i], A[min]] = [A[min], A[i]];
        }
        // A[0..i] is now final
    }
}
`,
};
