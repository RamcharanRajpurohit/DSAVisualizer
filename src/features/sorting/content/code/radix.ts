import type { Implementations } from "@/components/visualizer";

/**
 * LSD radix sort, base 10 — same names and structure as RADIX_CODE (basic/pseudocode.ts).
 * Negative inputs are shifted by off = −min(A) so every key is ≥ 0, exactly like the animation.
 */
export const RADIX_IMPL: Implementations = {
  python: `def radix_sort_lsd(A):
    # LSD radix sort (base 10) of integers, in place. Stable.
    # O(d * (n + 10)) time for d digits, O(n) extra space.
    # Negative numbers: every key is shifted by off = -min(A) first.
    n = len(A)
    if n == 0:
        return
    off = max(0, -min(A))               # keys must be >= 0
    max_key = max(A) + off
    exp = 1
    while exp <= max_key:               # one pass per digit
        bucket = [[] for _ in range(10)]    # 10 empty queues
        for i in range(n):
            d = (A[i] + off) // exp % 10
            bucket[d].append(A[i])      # append to the END: stable
        # A <- bucket[0] ++ bucket[1] ++ ... ++ bucket[9]
        A[:] = [x for b in bucket for x in b]
        exp *= 10
`,
  cpp: `#include <algorithm>
#include <vector>

// LSD radix sort (base 10) of ints, in place. Stable.
// O(d * (n + 10)) time for d digits, O(n) extra space.
// Negative numbers: every key is shifted by off = -min(A) first
// (64-bit keys, so even INT_MIN can't overflow).
void radixSortLSD(std::vector<int>& A) {
    int n = static_cast<int>(A.size());
    if (n == 0) return;
    long long lo = *std::min_element(A.begin(), A.end());
    long long off = std::max(0LL, -lo);     // keys must be >= 0
    long long maxKey = *std::max_element(A.begin(), A.end()) + off;
    for (long long exp = 1; exp <= maxKey; exp *= 10) {
        std::vector<std::vector<int>> bucket(10);   // 10 empty queues
        for (int i = 0; i <= n - 1; i++) {
            int d = static_cast<int>((A[i] + off) / exp % 10);
            bucket[d].push_back(A[i]);      // append to the END: stable
        }
        int k = 0;                          // A <- bucket[0] ++ ... ++ [9]
        for (const auto& b : bucket)
            for (int x : b) A[k++] = x;
    }
}
`,
  java: `import java.util.ArrayList;
import java.util.List;

public class RadixSort {
    // LSD radix sort (base 10) of ints, in place. Stable.
    // O(d * (n + 10)) time for d digits, O(n) extra space.
    // Negative numbers: every key is shifted by off = -min(A) first
    // (long keys, so even Integer.MIN_VALUE can't overflow).
    public static void radixSortLSD(int[] A) {
        int n = A.length;
        if (n == 0) return;
        long lo = A[0], hi = A[0];
        for (int x : A) {
            lo = Math.min(lo, x);
            hi = Math.max(hi, x);
        }
        long off = Math.max(0, -lo);        // keys must be >= 0
        for (long exp = 1; exp <= hi + off; exp *= 10) {
            List<List<Integer>> bucket = new ArrayList<>(); // 10 queues
            for (int b = 0; b < 10; b++) bucket.add(new ArrayList<>());
            for (int i = 0; i <= n - 1; i++) {
                int d = (int) ((A[i] + off) / exp % 10);
                bucket.get(d).add(A[i]);    // append to the END: stable
            }
            int k = 0;                      // A <- bucket[0] ++ ... ++ [9]
            for (List<Integer> b : bucket)
                for (int x : b) A[k++] = x;
        }
    }
}
`,
  javascript: `// LSD radix sort (base 10) of integers, in place. Stable.
// O(d * (n + 10)) time for d digits, O(n) extra space.
// Negative numbers: every key is shifted by off = -min(A) first.
function radixSortLSD(A) {
    const n = A.length;
    if (n === 0) return;
    let lo = A[0], hi = A[0];
    for (const x of A) {
        if (x < lo) lo = x;
        if (x > hi) hi = x;
    }
    const off = Math.max(0, -lo);           // keys must be >= 0
    for (let exp = 1; exp <= hi + off; exp *= 10) {
        const bucket = Array.from({ length: 10 }, () => []); // 10 queues
        for (let i = 0; i <= n - 1; i++) {
            const d = Math.floor((A[i] + off) / exp) % 10;
            bucket[d].push(A[i]);           // append to the END: stable
        }
        let k = 0;                          // A <- bucket[0] ++ ... ++ [9]
        for (const b of bucket)
            for (const x of b) A[k++] = x;
    }
}
`,
};
