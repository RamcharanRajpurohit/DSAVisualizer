import type { Implementations } from "@/components/visualizer";

/**
 * Quick sort with both partition schemes the page animates (Lomuto and Hoare) and every
 * pivot rule (last / first / middle / random / median of three) — same names and structure
 * as LOMUTO_PSEUDOCODE / HOARE_PSEUDOCODE (dc/quick/pseudocode.ts).
 */
export const QUICK_IMPL: Implementations = {
  python: `import random


def quick_sort(A, lo=0, hi=None, scheme="lomuto", rule="last"):
    # Sorts A[lo..hi] (inclusive) in place. NOT stable.
    # O(n log n) on average, O(n^2) worst case (bad pivots).
    # scheme: "lomuto" | "hoare"
    # rule:   "last" | "first" | "middle" | "random" | "median3"
    if hi is None:
        hi = len(A) - 1
    if lo >= hi:                        # 0 or 1 element
        return
    if scheme == "lomuto":
        p = partition_lomuto(A, lo, hi, rule)   # pivot lands at p
        quick_sort(A, lo, p - 1, scheme, rule)
        quick_sort(A, p + 1, hi, scheme, rule)
    else:
        p = partition_hoare(A, lo, hi, rule)    # A[lo..p] <= A[p+1..hi]
        quick_sort(A, lo, p, scheme, rule)
        quick_sort(A, p + 1, hi, scheme, rule)


def choose_pivot(A, lo, hi, rule):
    # Index of the pivot for A[lo..hi].
    mid = (lo + hi) // 2
    if rule == "first":
        return lo
    if rule == "middle":
        return mid
    if rule == "random":
        return random.randint(lo, hi)   # lo..hi inclusive
    if rule == "median3":               # median of A[lo], A[mid], A[hi]
        return sorted((lo, mid, hi), key=lambda k: A[k])[1]
    return hi                           # "last"


def partition_lomuto(A, lo, hi, rule="last"):
    k = choose_pivot(A, lo, hi, rule)
    A[k], A[hi] = A[hi], A[k]           # park the pivot at A[hi]
    pivot = A[hi]
    i = lo - 1                          # end of the <= region
    for j in range(lo, hi):             # j = lo .. hi-1
        if A[j] <= pivot:
            i += 1
            A[i], A[j] = A[j], A[i]
    A[i + 1], A[hi] = A[hi], A[i + 1]   # pivot to its final spot
    return i + 1


def partition_hoare(A, lo, hi, rule="last"):
    k = choose_pivot(A, lo, hi, rule)
    A[k], A[lo] = A[lo], A[k]           # park the pivot at A[lo]
    pivot = A[lo]
    i, j = lo - 1, hi + 1
    while True:
        i += 1                          # do i = i + 1 while A[i] < pivot
        while A[i] < pivot:
            i += 1
        j -= 1                          # do j = j - 1 while A[j] > pivot
        while A[j] > pivot:
            j -= 1
        if i >= j:                      # pointers crossed
            return j
        A[i], A[j] = A[j], A[i]
`,
  cpp: `#include <random>
#include <utility>
#include <vector>

enum class Scheme { Lomuto, Hoare };
enum class Pivot { Last, First, Middle, Random, Median3 };

// Index of the pivot for A[lo..hi].
int choosePivot(const std::vector<int>& A, int lo, int hi, Pivot rule) {
    int mid = lo + (hi - lo) / 2;
    switch (rule) {
        case Pivot::First:  return lo;
        case Pivot::Middle: return mid;
        case Pivot::Random: {
            static std::mt19937 rng(std::random_device{}());
            return std::uniform_int_distribution<int>(lo, hi)(rng);
        }
        case Pivot::Median3: {              // median of A[lo], A[mid], A[hi]
            int a = A[lo], b = A[mid], c = A[hi];
            if ((a <= b && b <= c) || (c <= b && b <= a)) return mid;
            if ((b <= a && a <= c) || (c <= a && a <= b)) return lo;
            return hi;
        }
        default: return hi;                 // Pivot::Last
    }
}

int partitionLomuto(std::vector<int>& A, int lo, int hi, Pivot rule) {
    int k = choosePivot(A, lo, hi, rule);
    std::swap(A[k], A[hi]);                 // park the pivot at A[hi]
    int pivot = A[hi];
    int i = lo - 1;                         // end of the <= region
    for (int j = lo; j <= hi - 1; j++) {
        if (A[j] <= pivot) {
            i++;
            std::swap(A[i], A[j]);
        }
    }
    std::swap(A[i + 1], A[hi]);             // pivot to its final spot
    return i + 1;
}

int partitionHoare(std::vector<int>& A, int lo, int hi, Pivot rule) {
    int k = choosePivot(A, lo, hi, rule);
    std::swap(A[k], A[lo]);                 // park the pivot at A[lo]
    int pivot = A[lo];
    int i = lo - 1, j = hi + 1;
    while (true) {
        do i++; while (A[i] < pivot);
        do j--; while (A[j] > pivot);
        if (i >= j) return j;               // pointers crossed
        std::swap(A[i], A[j]);
    }
}

// Sorts A[lo..hi] (inclusive) in place. NOT stable.
// O(n log n) on average, O(n^2) worst case (bad pivots).
void quickSort(std::vector<int>& A, int lo, int hi,
               Scheme scheme = Scheme::Lomuto, Pivot rule = Pivot::Last) {
    if (lo >= hi) return;                   // 0 or 1 element
    if (scheme == Scheme::Lomuto) {
        int p = partitionLomuto(A, lo, hi, rule);   // pivot lands at p
        quickSort(A, lo, p - 1, scheme, rule);
        quickSort(A, p + 1, hi, scheme, rule);
    } else {
        int p = partitionHoare(A, lo, hi, rule);    // A[lo..p] <= A[p+1..hi]
        quickSort(A, lo, p, scheme, rule);
        quickSort(A, p + 1, hi, scheme, rule);
    }
}

void quickSort(std::vector<int>& A) {
    quickSort(A, 0, static_cast<int>(A.size()) - 1);
}
`,
  java: `import java.util.concurrent.ThreadLocalRandom;

public class QuickSort {
    public enum Scheme { LOMUTO, HOARE }
    public enum Pivot { LAST, FIRST, MIDDLE, RANDOM, MEDIAN3 }

    public static void quickSort(int[] A) {
        quickSort(A, 0, A.length - 1, Scheme.LOMUTO, Pivot.LAST);
    }

    // Sorts A[lo..hi] (inclusive) in place. NOT stable.
    // O(n log n) on average, O(n^2) worst case (bad pivots).
    public static void quickSort(int[] A, int lo, int hi,
                                 Scheme scheme, Pivot rule) {
        if (lo >= hi) return;               // 0 or 1 element
        if (scheme == Scheme.LOMUTO) {
            int p = partitionLomuto(A, lo, hi, rule);   // pivot lands at p
            quickSort(A, lo, p - 1, scheme, rule);
            quickSort(A, p + 1, hi, scheme, rule);
        } else {
            int p = partitionHoare(A, lo, hi, rule);    // A[lo..p] <= A[p+1..hi]
            quickSort(A, lo, p, scheme, rule);
            quickSort(A, p + 1, hi, scheme, rule);
        }
    }

    // Index of the pivot for A[lo..hi].
    static int choosePivot(int[] A, int lo, int hi, Pivot rule) {
        int mid = lo + (hi - lo) / 2;
        switch (rule) {
            case FIRST:  return lo;
            case MIDDLE: return mid;
            case RANDOM: return ThreadLocalRandom.current().nextInt(lo, hi + 1);
            case MEDIAN3: {                 // median of A[lo], A[mid], A[hi]
                int a = A[lo], b = A[mid], c = A[hi];
                if ((a <= b && b <= c) || (c <= b && b <= a)) return mid;
                if ((b <= a && a <= c) || (c <= a && a <= b)) return lo;
                return hi;
            }
            default: return hi;             // LAST
        }
    }

    static int partitionLomuto(int[] A, int lo, int hi, Pivot rule) {
        int k = choosePivot(A, lo, hi, rule);
        swap(A, k, hi);                     // park the pivot at A[hi]
        int pivot = A[hi];
        int i = lo - 1;                     // end of the <= region
        for (int j = lo; j <= hi - 1; j++) {
            if (A[j] <= pivot) {
                i++;
                swap(A, i, j);
            }
        }
        swap(A, i + 1, hi);                 // pivot to its final spot
        return i + 1;
    }

    static int partitionHoare(int[] A, int lo, int hi, Pivot rule) {
        int k = choosePivot(A, lo, hi, rule);
        swap(A, k, lo);                     // park the pivot at A[lo]
        int pivot = A[lo];
        int i = lo - 1, j = hi + 1;
        while (true) {
            do i++; while (A[i] < pivot);
            do j--; while (A[j] > pivot);
            if (i >= j) return j;           // pointers crossed
            swap(A, i, j);
        }
    }

    static void swap(int[] A, int a, int b) {
        int t = A[a];
        A[a] = A[b];
        A[b] = t;
    }
}
`,
  javascript: `// Sorts A[lo..hi] (inclusive) in place. NOT stable.
// O(n log n) on average, O(n^2) worst case (bad pivots).
// scheme: "lomuto" | "hoare"
// rule:   "last" | "first" | "middle" | "random" | "median3"
function quickSort(A, lo = 0, hi = A.length - 1,
                   scheme = "lomuto", rule = "last") {
    if (lo >= hi) return;                   // 0 or 1 element
    if (scheme === "lomuto") {
        const p = partitionLomuto(A, lo, hi, rule);   // pivot lands at p
        quickSort(A, lo, p - 1, scheme, rule);
        quickSort(A, p + 1, hi, scheme, rule);
    } else {
        const p = partitionHoare(A, lo, hi, rule);    // A[lo..p] <= A[p+1..hi]
        quickSort(A, lo, p, scheme, rule);
        quickSort(A, p + 1, hi, scheme, rule);
    }
}

// Index of the pivot for A[lo..hi].
function choosePivot(A, lo, hi, rule) {
    const mid = Math.floor((lo + hi) / 2);
    switch (rule) {
        case "first":  return lo;
        case "middle": return mid;
        case "random": return lo + Math.floor(Math.random() * (hi - lo + 1));
        case "median3": {                   // median of A[lo], A[mid], A[hi]
            const a = A[lo], b = A[mid], c = A[hi];
            if ((a <= b && b <= c) || (c <= b && b <= a)) return mid;
            if ((b <= a && a <= c) || (c <= a && a <= b)) return lo;
            return hi;
        }
        default: return hi;                 // "last"
    }
}

function partitionLomuto(A, lo, hi, rule) {
    const k = choosePivot(A, lo, hi, rule);
    [A[k], A[hi]] = [A[hi], A[k]];          // park the pivot at A[hi]
    const pivot = A[hi];
    let i = lo - 1;                         // end of the <= region
    for (let j = lo; j <= hi - 1; j++) {
        if (A[j] <= pivot) {
            i++;
            [A[i], A[j]] = [A[j], A[i]];
        }
    }
    [A[i + 1], A[hi]] = [A[hi], A[i + 1]];  // pivot to its final spot
    return i + 1;
}

function partitionHoare(A, lo, hi, rule) {
    const k = choosePivot(A, lo, hi, rule);
    [A[k], A[lo]] = [A[lo], A[k]];          // park the pivot at A[lo]
    const pivot = A[lo];
    let i = lo - 1, j = hi + 1;
    while (true) {
        do i++; while (A[i] < pivot);
        do j--; while (A[j] > pivot);
        if (i >= j) return j;               // pointers crossed
        [A[i], A[j]] = [A[j], A[i]];
    }
}
`,
};
