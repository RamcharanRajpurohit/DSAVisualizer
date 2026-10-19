import type { Implementations } from "@/components/visualizer";

/**
 * Counting sort — same names and structure as COUNTING_CODE (basic/pseudocode.ts).
 * Offsetting by lo = min(A) makes negative integers work too; memory is O(n + k).
 */
export const COUNTING_IMPL: Implementations = {
  python: `def counting_sort(A):
    # Stable counting sort of integers: O(n + k) time and extra space,
    # where k = max(A) - min(A) + 1. Indexing C by A[i] - lo makes
    # negative numbers work too. Only worth it when k is small.
    n = len(A)
    if n == 0:
        return
    lo = min(A)
    k = max(A) - lo + 1
    C = [0] * k                         # C[v] counts the value v + lo
    B = [0] * n                         # output array
    for i in range(n):                  # 1) count every value
        C[A[i] - lo] += 1
    for v in range(1, k):               # 2) prefix sums: end of v's block
        C[v] += C[v - 1]
    for i in range(n - 1, -1, -1):      # 3) place right -> left (stable)
        v = A[i] - lo
        C[v] -= 1
        B[C[v]] = A[i]
    A[:] = B                            # copy B into A
`,
  cpp: `#include <algorithm>
#include <vector>

// Stable counting sort of ints: O(n + k) time and extra space,
// where k = max - min + 1. Indexing C by A[i] - lo makes negative
// numbers work too. Only worth it when k is small.
void countingSort(std::vector<int>& A) {
    int n = static_cast<int>(A.size());
    if (n == 0) return;
    int lo = *std::min_element(A.begin(), A.end());
    int k = *std::max_element(A.begin(), A.end()) - lo + 1;
    std::vector<int> C(k, 0);               // C[v] counts the value v + lo
    std::vector<int> B(n);                  // output array
    for (int i = 0; i <= n - 1; i++)        // 1) count every value
        C[A[i] - lo]++;
    for (int v = 1; v <= k - 1; v++)        // 2) prefix sums: end of v's block
        C[v] += C[v - 1];
    for (int i = n - 1; i >= 0; i--) {      // 3) place right -> left (stable)
        int v = A[i] - lo;
        C[v]--;
        B[C[v]] = A[i];
    }
    A = B;                                  // copy B into A
}
`,
  java: `public class CountingSort {
    // Stable counting sort of ints: O(n + k) time and extra space,
    // where k = max - min + 1. Indexing C by A[i] - lo makes negative
    // numbers work too. Only worth it when k is small.
    public static void countingSort(int[] A) {
        int n = A.length;
        if (n == 0) return;
        int lo = A[0], hi = A[0];
        for (int x : A) {
            lo = Math.min(lo, x);
            hi = Math.max(hi, x);
        }
        int k = hi - lo + 1;
        int[] C = new int[k];               // C[v] counts the value v + lo
        int[] B = new int[n];               // output array
        for (int i = 0; i <= n - 1; i++)    // 1) count every value
            C[A[i] - lo]++;
        for (int v = 1; v <= k - 1; v++)    // 2) prefix sums: end of v's block
            C[v] += C[v - 1];
        for (int i = n - 1; i >= 0; i--) {  // 3) place right -> left (stable)
            int v = A[i] - lo;
            C[v]--;
            B[C[v]] = A[i];
        }
        System.arraycopy(B, 0, A, 0, n);    // copy B into A
    }
}
`,
  javascript: `// Stable counting sort of integers: O(n + k) time and extra space,
// where k = max - min + 1. Indexing C by A[i] - lo makes negative
// numbers work too. Only worth it when k is small.
function countingSort(A) {
    const n = A.length;
    if (n === 0) return;
    let lo = A[0], hi = A[0];
    for (const x of A) {
        if (x < lo) lo = x;
        if (x > hi) hi = x;
    }
    const k = hi - lo + 1;
    const C = new Array(k).fill(0);         // C[v] counts the value v + lo
    const B = new Array(n);                 // output array
    for (let i = 0; i <= n - 1; i++)        // 1) count every value
        C[A[i] - lo]++;
    for (let v = 1; v <= k - 1; v++)        // 2) prefix sums: end of v's block
        C[v] += C[v - 1];
    for (let i = n - 1; i >= 0; i--) {      // 3) place right -> left (stable)
        const v = A[i] - lo;
        C[v]--;
        B[C[v]] = A[i];
    }
    for (let i = 0; i < n; i++) A[i] = B[i];  // copy B into A
}
`,
};
