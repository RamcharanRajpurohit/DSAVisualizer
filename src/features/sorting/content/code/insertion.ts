import type { Implementations } from "@/components/visualizer";

/** Insertion sort — same names and structure as INSERTION_CODE (basic/pseudocode.ts). */
export const INSERTION_IMPL: Implementations = {
  python: `def insertion_sort(A):
    # Sorts list A in place, ascending. Stable, O(1) extra space.
    n = len(A)
    for i in range(1, n):               # A[0..i-1] is already sorted
        key = A[i]                      # lift the next element out
        j = i - 1
        while j >= 0 and A[j] > key:    # strict > keeps it stable
            A[j + 1] = A[j]             # shift the bigger element right
            j -= 1
        A[j + 1] = key                  # drop key into the gap
`,
  cpp: `#include <vector>

// Sorts A in place, ascending. Stable, O(1) extra space.
void insertionSort(std::vector<int>& A) {
    int n = static_cast<int>(A.size());
    for (int i = 1; i <= n - 1; i++) {      // A[0..i-1] is already sorted
        int key = A[i];                     // lift the next element out
        int j = i - 1;
        while (j >= 0 && A[j] > key) {      // strict > keeps it stable
            A[j + 1] = A[j];                // shift the bigger element right
            j--;
        }
        A[j + 1] = key;                     // drop key into the gap
    }
}
`,
  java: `public class InsertionSort {
    // Sorts A in place, ascending. Stable, O(1) extra space.
    public static void insertionSort(int[] A) {
        int n = A.length;
        for (int i = 1; i <= n - 1; i++) {  // A[0..i-1] is already sorted
            int key = A[i];                 // lift the next element out
            int j = i - 1;
            while (j >= 0 && A[j] > key) {  // strict > keeps it stable
                A[j + 1] = A[j];            // shift the bigger element right
                j--;
            }
            A[j + 1] = key;                 // drop key into the gap
        }
    }
}
`,
  javascript: `// Sorts array A in place, ascending. Stable, O(1) extra space.
function insertionSort(A) {
    const n = A.length;
    for (let i = 1; i <= n - 1; i++) {      // A[0..i-1] is already sorted
        const key = A[i];                   // lift the next element out
        let j = i - 1;
        while (j >= 0 && A[j] > key) {      // strict > keeps it stable
            A[j + 1] = A[j];                // shift the bigger element right
            j--;
        }
        A[j + 1] = key;                     // drop key into the gap
    }
}
`,
};
