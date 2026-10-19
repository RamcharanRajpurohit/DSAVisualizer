import type { Implementations } from "@/components/visualizer";

/** Top-down merge sort — same names and structure as MERGE_PSEUDOCODE (dc/merge/pseudocode.ts). */
export const MERGE_IMPL: Implementations = {
  python: `def merge_sort(A, lo=0, hi=None):
    # Sorts A[lo..hi] (inclusive) in place. Stable.
    # O(n log n) time in every case, O(n) extra space.
    if hi is None:
        hi = len(A) - 1
    if lo >= hi:                        # 0 or 1 element
        return
    mid = (lo + hi) // 2
    merge_sort(A, lo, mid)              # sort left half
    merge_sort(A, mid + 1, hi)          # sort right half
    merge(A, lo, mid, hi)


def merge(A, lo, mid, hi):
    L = A[lo:mid + 1]                   # copies of the two sorted runs
    R = A[mid + 1:hi + 1]
    i = j = 0
    k = lo
    while i < len(L) and j < len(R):
        if L[i] <= R[j]:                # <= keeps it stable
            A[k] = L[i]
            i += 1
        else:
            A[k] = R[j]
            j += 1
        k += 1
    while i < len(L):                   # leftovers (only one loop runs)
        A[k] = L[i]
        i += 1
        k += 1
    while j < len(R):
        A[k] = R[j]
        j += 1
        k += 1
`,
  cpp: `#include <vector>

void merge(std::vector<int>& A, int lo, int mid, int hi) {
    // copies of the two sorted runs
    std::vector<int> L(A.begin() + lo, A.begin() + mid + 1);
    std::vector<int> R(A.begin() + mid + 1, A.begin() + hi + 1);
    size_t i = 0, j = 0;
    int k = lo;
    while (i < L.size() && j < R.size()) {
        if (L[i] <= R[j]) {                 // <= keeps it stable
            A[k] = L[i]; i++;
        } else {
            A[k] = R[j]; j++;
        }
        k++;
    }
    while (i < L.size()) A[k++] = L[i++];   // leftovers (only one loop runs)
    while (j < R.size()) A[k++] = R[j++];
}

// Sorts A[lo..hi] (inclusive). Stable.
// O(n log n) time in every case, O(n) extra space.
void mergeSort(std::vector<int>& A, int lo, int hi) {
    if (lo >= hi) return;                   // 0 or 1 element
    int mid = lo + (hi - lo) / 2;           // = (lo + hi) / 2 without overflow
    mergeSort(A, lo, mid);                  // sort left half
    mergeSort(A, mid + 1, hi);              // sort right half
    merge(A, lo, mid, hi);
}

void mergeSort(std::vector<int>& A) {
    mergeSort(A, 0, static_cast<int>(A.size()) - 1);
}
`,
  java: `import java.util.Arrays;

public class MergeSort {
    public static void mergeSort(int[] A) {
        mergeSort(A, 0, A.length - 1);
    }

    // Sorts A[lo..hi] (inclusive). Stable.
    // O(n log n) time in every case, O(n) extra space.
    public static void mergeSort(int[] A, int lo, int hi) {
        if (lo >= hi) return;               // 0 or 1 element
        int mid = lo + (hi - lo) / 2;       // = (lo + hi) / 2 without overflow
        mergeSort(A, lo, mid);              // sort left half
        mergeSort(A, mid + 1, hi);          // sort right half
        merge(A, lo, mid, hi);
    }

    static void merge(int[] A, int lo, int mid, int hi) {
        int[] L = Arrays.copyOfRange(A, lo, mid + 1);   // the two sorted runs
        int[] R = Arrays.copyOfRange(A, mid + 1, hi + 1);
        int i = 0, j = 0, k = lo;
        while (i < L.length && j < R.length) {
            if (L[i] <= R[j]) {             // <= keeps it stable
                A[k] = L[i]; i++;
            } else {
                A[k] = R[j]; j++;
            }
            k++;
        }
        while (i < L.length) A[k++] = L[i++];   // leftovers (only one runs)
        while (j < R.length) A[k++] = R[j++];
    }
}
`,
  javascript: `// Sorts A[lo..hi] (inclusive) in place. Stable.
// O(n log n) time in every case, O(n) extra space.
function mergeSort(A, lo = 0, hi = A.length - 1) {
    if (lo >= hi) return;                   // 0 or 1 element
    const mid = Math.floor((lo + hi) / 2);
    mergeSort(A, lo, mid);                  // sort left half
    mergeSort(A, mid + 1, hi);              // sort right half
    merge(A, lo, mid, hi);
}

function merge(A, lo, mid, hi) {
    const L = A.slice(lo, mid + 1);         // copies of the two sorted runs
    const R = A.slice(mid + 1, hi + 1);
    let i = 0, j = 0, k = lo;
    while (i < L.length && j < R.length) {
        if (L[i] <= R[j]) {                 // <= keeps it stable
            A[k] = L[i]; i++;
        } else {
            A[k] = R[j]; j++;
        }
        k++;
    }
    while (i < L.length) A[k++] = L[i++];   // leftovers (only one loop runs)
    while (j < R.length) A[k++] = R[j++];
}
`,
};
