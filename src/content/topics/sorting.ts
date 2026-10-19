import { BUBBLE_IMPL } from "@/features/sorting/content/code/bubble";
import { COUNTING_IMPL } from "@/features/sorting/content/code/counting";
import { INSERTION_IMPL } from "@/features/sorting/content/code/insertion";
import { MERGE_IMPL } from "@/features/sorting/content/code/merge";
import { QUICK_IMPL } from "@/features/sorting/content/code/quick";
import { RADIX_IMPL } from "@/features/sorting/content/code/radix";
import { SELECTION_IMPL } from "@/features/sorting/content/code/selection";
import { SHELL_IMPL } from "@/features/sorting/content/code/shell";
import type { TopicContent } from "../types";

/*
 * Sorting: the hub (/sorting) and one page per algorithm (/sorting/<slug>). Every number in the
 * worked examples comes from the visualizer's own recorders on the array that page opens with
 * (src/features/sorting/shared/presets.ts → exampleFor), so readers can replay them step by step.
 * The Python code is the same verified snippet the visualizer's Code panel shows.
 */

const UPDATED = "2026-10-19";

/** Body markup helpers: paragraphs are separated by blank lines, bullets start with "- ". */
const body = (...blocks: string[]) => blocks.join("\n\n");
const bullets = (...items: string[]) => items.map((i) => `- ${i}`).join("\n");
const python = (impl: { python?: string }) => ({ language: "python" as const, source: impl.python ?? "" });

const HUB: TopicContent = {
  path: "/sorting",
  name: "Sorting Algorithms",
  title: "Sorting Algorithm Visualizer — Compare 8 Sorts",
  h1: "Sorting Algorithm Visualizer",
  description:
    "Sorting algorithm visualizer: watch bubble, selection, insertion, shell, counting, radix, merge and quick sort step by step, then race them in Compare mode.",
  keywords: [
    "sorting algorithm visualizer",
    "sorting algorithms",
    "sorting algorithms comparison",
    "sorting algorithm time complexity",
    "stable sorting algorithms",
    "sorting visualizer",
  ],
  question: "What are sorting algorithms?",
  summary:
    "A sorting algorithm rearranges a list into order — for numbers, usually smallest to largest — by comparing, swapping, shifting or counting its elements. " +
    "Sorting algorithms differ in speed (O(n²) simple sorts, O(n log n) merge and quick sort, O(n + k) counting sort), in the extra memory they need and in whether they are **stable**. " +
    "This visualizer animates eight of them step by step and races them side by side in Compare mode.",
  sections: [
    {
      heading: "The three families of sorting algorithms",
      body: body(
        bullets(
          "**Simple sorts — bubble, selection, insertion.** Two nested loops that fix one element or one pair at a time: O(n²) on average, but tiny, in-place and, for insertion sort, very fast on nearly sorted data. **Shell sort** runs insertion sort over shrinking gaps and lands between O(n²) and O(n log n).",
          "**Divide and conquer — merge sort and quick sort.** Split, solve the parts recursively, combine. Both average O(n log n): merge sort does its real work when combining, quick sort when splitting.",
          "**Non-comparison sorts — counting and radix sort.** They never ask “is a < b?” but use the keys as array indices, so they run in linear time on integers with a small range or few digits.",
        ),
        "The table at the bottom of this page lists each algorithm's time as best · average · worst case.",
      ),
    },
    {
      heading: "Which sorting algorithm should you use?",
      body: body(
        bullets(
          "**General-purpose, in memory:** quick sort with a random or median-of-three pivot — the fastest on average.",
          "**Stability or a guaranteed O(n log n):** merge sort, also the natural choice for linked lists and data too big for memory.",
          "**Small or nearly sorted arrays:** insertion sort, whose cost is O(n + inversions).",
          "**Integers from a small range** (scores, ages, bytes): counting sort, O(n + k).",
          "**Many fixed-width keys** (32-bit integers, IDs, dates): radix sort, O(d·(n + b)).",
          "**Tiny code, no recursion, no extra memory:** shell sort.",
        ),
        "Real libraries combine these ideas. Python's `sorted()`, Java's object sort and V8's `Array.prototype.sort` use **Timsort** (merge sort plus insertion sort on short runs); C++ `std::sort` is **introsort**, a quick sort that falls back to heap sort on deep recursion and finishes small ranges with insertion sort.",
      ),
    },
    {
      heading: "Stable vs unstable, in-place vs out-of-place",
      body: body(
        "A sort is **stable** if equal keys keep their original order. That matters when you sort by several fields: sort students by name, then stably by grade, and students with the same grade stay alphabetical. Bubble, insertion, merge, counting and radix sort are stable; selection, shell and quick sort are not, because their long jumps can carry one copy of a value past another.",
        "A sort is **in-place** if it needs only O(1) extra memory (quick sort's O(log n) stack is conventionally included). Merge sort needs an O(n) buffer, counting sort a count array and an output array, radix sort its buckets. In the visualizer, the **Dupes** preset tags repeated values *a*, *b*, … so you can watch which algorithms keep them in order.",
      ),
    },
    {
      heading: "Compare mode: race the algorithms",
      body: body(
        "The **Step-by-step** view explains one algorithm at a time with pseudocode, live variables and counters. **Compare** races up to nine algorithms on four inputs of the same size — random, nearly sorted, reversed and few unique — on a shared clock where each comparison or write costs one tick, so it measures work, not hardware. Watch for:",
        bullets(
          "Insertion sort wins the **nearly sorted** row by a wide margin, yet is one of the slowest on **reversed** input.",
          "Quick sort with a last-element pivot is fast on random input but slides towards O(n²) on nearly sorted and reversed input; add the median-of-three variant to see the fix.",
          "Merge sort takes almost the same number of ticks on every row.",
          "Counting and radix sort ignore the input order; with the race's two-digit keys they beat every comparison sort on random, reversed and few-unique input.",
        ),
      ),
    },
  ],
  complexity: [
    { label: "Bubble sort", time: "O(n) · O(n²) · O(n²)", space: "O(1)", note: "Stable, in-place. O(n) best case needs the early-exit check." },
    { label: "Selection sort", time: "O(n²) · O(n²) · O(n²)", space: "O(1)", note: "Not stable, in-place. At most n − 1 swaps." },
    { label: "Insertion sort", time: "O(n) · O(n²) · O(n²)", space: "O(1)", note: "Stable, in-place. Cost grows with the inversions." },
    { label: "Shell sort", time: "O(n log n) · ≈ n^1.25–1.5 · O(n²)", space: "O(1)", note: "Not stable, in-place. Depends on the gaps." },
    { label: "Counting sort", time: "O(n + k) in every case", space: "O(n + k)", note: "Stable, not in-place. k = range of the values." },
    { label: "Radix sort (LSD)", time: "O(d·(n + b)) in every case", space: "O(n + b)", note: "Stable, not in-place. d digits in base b." },
    { label: "Merge sort", time: "O(n log n) in every case", space: "O(n)", note: "Stable, not in-place. No bad inputs." },
    { label: "Quick sort", time: "O(n log n) · O(n log n) · O(n²)", space: "O(log n)", note: "Not stable, in-place. Bad pivots cause the worst case." },
  ],
  faqs: [
    {
      q: "Which sorting algorithm is the fastest?",
      a: "For general data in memory, a well-tuned quick sort or a hybrid such as introsort is usually fastest. Timsort wins on partly sorted data, and counting or radix sort beat both on small integer keys — no single sort is fastest on every input.",
    },
    {
      q: "Which sorting algorithms are stable?",
      a: "Bubble, insertion, merge, counting and radix sort are stable. Selection, shell, quick and heap sort are not.",
    },
    {
      q: "What is the difference between O(n²) and O(n log n) sorting?",
      a: "For 1,000 elements, n² is a million steps while n log₂ n is about 10,000. Quadratic sorts are fine for a few dozen items but unusable on large inputs.",
    },
    {
      q: "Can a sorting algorithm be faster than O(n log n)?",
      a: "Not with comparisons alone: n elements have n! possible orders, and telling them apart takes at least log₂(n!) ≈ n log₂ n comparisons. Counting and radix sort run in linear time because they index arrays with the keys instead of comparing them.",
    },
    {
      q: "What sorting algorithm does Python use?",
      a: "`list.sort()` and `sorted()` use Timsort, a stable merge sort / insertion sort hybrid that detects already-sorted runs, so nearly sorted input sorts in close to linear time.",
    },
  ],
  related: [
    "/sorting/merge-sort",
    "/sorting/quick-sort",
    "/sorting/insertion-sort",
    "/sorting/bubble-sort",
    "/sorting/selection-sort",
    "/sorting/shell-sort",
    "/sorting/counting-sort",
    "/sorting/radix-sort",
    "/heap/heap-sort",
  ],
  updated: UPDATED,
};

const BUBBLE: TopicContent = {
  path: "/sorting/bubble-sort",
  parent: "/sorting",
  name: "Bubble Sort",
  title: "Bubble Sort Visualizer — Step-by-Step Animation",
  h1: "Bubble Sort Visualizer",
  description:
    "Bubble sort repeatedly swaps adjacent out-of-order elements until a pass makes no swaps. Watch it step by step, with Python code and O(n²) complexity explained.",
  keywords: ["bubble sort", "bubble sort visualizer", "bubble sort algorithm", "bubble sort time complexity", "bubble sort example", "bubble sort python"],
  summary:
    "Bubble sort is a simple comparison sort that walks through the array comparing each pair of neighbours and swapping them when they are out of order. " +
    "After each pass the largest remaining element has “bubbled” to the end, so the sorted region grows from the right, and a pass with no swaps means the array is sorted. " +
    "It runs in O(n²) time on average and in the worst case, O(n) on already sorted input, with O(1) extra space.",
  steps: [
    "Start at the left end of the unsorted part with `j = 0`.",
    "Compare `A[j]` with `A[j + 1]`; if `A[j] > A[j + 1]`, swap them.",
    "Move one position right and repeat until the end of the unsorted part. The largest unsorted value is now in its final place.",
    "Shrink the unsorted part by one and start the next pass from the left.",
    "Stop as soon as a whole pass makes no swaps (or after n − 1 passes): every neighbouring pair is in order, so the array is sorted.",
  ],
  sections: [
    {
      heading: "Worked example: sorting [38, 27, 43, 3, 9, 82, 10]",
      body: body(
        "This is the array the visualizer above opens with. Watch where the largest values go:",
        bullets(
          "**Pass 1:** 38 and 27 swap, 43 is carried past 3 and 9, then 82 takes over and is carried past 10: `[27, 38, 3, 9, 43, 10, 82]`. 6 comparisons, 4 swaps, and **82 is final**.",
          "**Pass 2:** `[27, 3, 9, 38, 10, 43, 82]` — 3 swaps, 43 is final.",
          "**Pass 3:** `[3, 9, 27, 10, 38, 43, 82]` — 3 swaps, 38 is final.",
          "**Pass 4:** `[3, 9, 10, 27, 38, 43, 82]` — 1 swap.",
          "**Pass 5:** no swaps, so the `swapped` flag stops the sort one pass before the maximum of n − 1 = 6.",
        ),
        "Total: **20 comparisons and 11 swaps**. Eleven is exactly the number of **inversions** in the input — pairs that are in the wrong order — because each swap of two neighbours fixes exactly one inversion and nothing else.",
      ),
    },
    {
      heading: "Why bubble sort is O(n²)",
      body: body(
        "In the worst case, a reversed array, every pair is an inversion. Pass 1 makes n − 1 comparisons, pass 2 makes n − 2, and so on, for n(n − 1)/2 comparisons and just as many swaps — 499,500 of each for 1,000 elements. On random input about half of all pairs are inverted, so the average is still around n²/4 swaps: quadratic.",
        "The best case is an already sorted array. With the `swapped` flag, the first pass makes n − 1 comparisons, sees no swaps and stops: O(n). Without the flag bubble sort makes all n(n − 1)/2 comparisons even on sorted input, which is why textbooks sometimes disagree about its best case.",
      ),
    },
    {
      heading: "Rabbits and turtles",
      body: body(
        "Large values move fast: a big value can travel the whole array in a single pass (a “rabbit”). Small values near the end move slowly, because each pass carries them only one step left (a “turtle”). In the example, 10 starts at the last index and needs four passes to reach its place.",
        "Turtles are why bubble sort stays slow even on nearly sorted data when a small value sits near the end. **Cocktail shaker sort** bubbles in both directions, and **comb sort** compares elements a gap apart (the same idea as shell sort) — both attack exactly this problem.",
      ),
    },
    {
      heading: "Bubble sort vs insertion and selection sort",
      body: body(
        "All three are O(n²), in-place and short, but they are not equally good:",
        bullets(
          "**Insertion sort** also makes one move per inversion, but a shift is a single write instead of a swap, and its scan stops at the first smaller element — about half of bubble sort's comparisons on random input. Libraries use it for small arrays.",
          "**Selection sort** makes at most n − 1 swaps, which helps when writes are expensive, but always n(n − 1)/2 comparisons, even on sorted input.",
          "**Bubble sort** is stable and notices a sorted array in one pass, but does the most swaps of the three. Its real value is teaching passes, loop invariants and inversions.",
        ),
      ),
    },
    {
      heading: "Common mistakes and interview tips",
      body: bullets(
        "Running the inner loop to `n − 1` on every pass instead of `n − 1 − i`. It still sorts, but re-checks the finished tail.",
        "Leaving out the `swapped` flag and still claiming an O(n) best case.",
        "Writing `>=` instead of `>`: equal neighbours get swapped and the sort is no longer **stable**.",
        "A common follow-up is “how many swaps does bubble sort make?” — the number of inversions — and then “count the inversions faster”, which a modified merge sort does in O(n log n).",
      ),
    },
  ],
  complexity: [
    { label: "Best", time: "O(n)", space: "O(1)", note: "Already sorted: one pass, no swaps, and the `swapped` flag stops it." },
    { label: "Average", time: "O(n²)", space: "O(1)", note: "About n²/4 swaps — roughly half of all pairs are inverted." },
    { label: "Worst", time: "O(n²)", space: "O(1)", note: "Reversed input: n(n − 1)/2 comparisons and n(n − 1)/2 swaps." },
  ],
  code: python(BUBBLE_IMPL),
  faqs: [
    {
      q: "Is bubble sort stable?",
      a: "Yes. It only swaps neighbours when the left one is strictly greater, so equal elements never pass each other. Changing `>` to `>=` would break that.",
    },
    {
      q: "What is the best-case time complexity of bubble sort?",
      a: "O(n) on an already sorted array — but only with the early-exit `swapped` flag. Without it, bubble sort always makes n(n − 1)/2 comparisons.",
    },
    {
      q: "How many swaps does bubble sort make?",
      a: "Exactly the number of inversions in the input, because every swap of two neighbours removes one inversion. That ranges from 0 for sorted input to n(n − 1)/2 for reversed input.",
    },
    {
      q: "Why is it called bubble sort?",
      a: "On every pass the largest remaining value rises to the end of the array, like a bubble rising to the surface.",
    },
    {
      q: "Is bubble sort used in practice?",
      a: "Rarely. Insertion sort is just as simple and faster, so real libraries use it for small arrays instead. Bubble sort survives mainly as a teaching tool.",
    },
  ],
  related: ["/sorting/insertion-sort", "/sorting/selection-sort", "/sorting/shell-sort", "/sorting/merge-sort", "/sorting"],
  updated: UPDATED,
};

const SELECTION: TopicContent = {
  path: "/sorting/selection-sort",
  parent: "/sorting",
  name: "Selection Sort",
  title: "Selection Sort Visualizer — Step-by-Step Animation",
  h1: "Selection Sort Visualizer",
  description:
    "Selection sort finds the smallest unsorted element and swaps it to the front, one position per pass. See every comparison animated, with code and complexity.",
  keywords: ["selection sort", "selection sort visualizer", "selection sort algorithm", "selection sort time complexity", "is selection sort stable", "selection sort python"],
  summary:
    "Selection sort builds the sorted array from the left: on each pass it scans the unsorted part for the smallest element and swaps it into the first unsorted position. " +
    "It always makes n(n − 1)/2 comparisons, so it is O(n²) in every case, but it performs at most n − 1 swaps and needs only O(1) extra memory. It is not stable.",
  steps: [
    "Treat `A[0..i−1]` as sorted (empty at first) and `A[i..n−1]` as unsorted.",
    "Set `min = i`, then scan `j` from `i + 1` to the end; whenever `A[j] < A[min]`, set `min = j`.",
    "Swap `A[i]` with `A[min]` (skip it when `min == i`). The smallest unsorted value is now in its final place.",
    "Increase `i` and repeat until one element is left — it must be the largest.",
  ],
  sections: [
    {
      heading: "Worked example: sorting [38, 27, 43, 3, 9, 82, 10]",
      body: body(
        "The visualizer above opens on this array. Each pass scans the rest of the array and makes at most one swap:",
        bullets(
          "**i = 0:** the scan finds 3 → swap it with 38: `[3, 27, 43, 38, 9, 82, 10]`.",
          "**i = 1:** minimum 9 → swap with 27: `[3, 9, 43, 38, 27, 82, 10]`.",
          "**i = 2:** minimum 10 → swap with 43: `[3, 9, 10, 38, 27, 82, 43]`.",
          "**i = 3:** minimum 27 → swap with 38: `[3, 9, 10, 27, 38, 82, 43]`.",
          "**i = 4:** 38 is already the minimum — no swap.",
          "**i = 5:** minimum 43 → swap with 82: `[3, 9, 10, 27, 38, 43, 82]`.",
        ),
        "That is 6 + 5 + 4 + 3 + 2 + 1 = **21 comparisons** but only **5 swaps**. Bubble sort needs 11 swaps on the same input.",
      ),
    },
    {
      heading: "Why it is always O(n²), even on sorted input",
      body: body(
        "The inner loop can never stop early: to be sure `A[min]` is the smallest, it has to look at every remaining element. Pass i always makes n − 1 − i comparisons, for n(n − 1)/2 in total, whether the input is sorted, reversed or random.",
        "That makes selection sort **non-adaptive**. An already sorted array of 1,000 elements still costs 499,500 comparisons (it just makes zero swaps), while insertion sort would finish it in 999. Load the **Sorted** preset above and watch the scans happen anyway.",
      ),
    },
    {
      heading: "Why selection sort is not stable",
      body: body(
        "The long-distance swap is the culprit. Take `[5a, 5b, 2]`: the first pass swaps 5a with 2, giving `[2, 5b, 5a]`, and the two 5s have changed order for good.",
        "You can make selection sort stable by inserting the minimum and shifting the elements in between one place right instead of swapping, but that turns its O(n) writes into O(n²) — and the low write count was its main advantage. The **Dupes** preset tags repeated values *a*, *b*, … so you can watch them get reordered.",
      ),
    },
    {
      heading: "When selection sort makes sense",
      body: body(
        "Its one real strength is the write count: **at most n − 1 swaps**, whatever the input. That matters when writing is much more expensive than reading — flash memory with limited write cycles, or records that are expensive to move. (Cycle sort takes the idea further and writes each element at most once.) For anything else, insertion sort is the better simple sort.",
        "Selection sort is also the idea behind **heap sort**. Heap sort repeatedly selects the maximum too, but a binary heap finds it in O(log n) instead of an O(n) scan, which brings the total down to O(n log n).",
      ),
    },
    {
      heading: "Common mistakes and interview tips",
      body: bullets(
        "Swapping inside the inner loop every time a smaller value turns up. That is a different, slower algorithm; selection sort swaps once per pass.",
        "Running the outer loop to `n` instead of `n − 1`: the last element is already in place.",
        "Claiming an O(n) best case. The comparisons don't depend on the input order at all.",
        "Follow-up: “find the k smallest elements”. Stopping selection sort after k passes costs O(nk); a heap does it in O(n log k).",
      ),
    },
  ],
  complexity: [
    { label: "Best", time: "O(n²)", space: "O(1)", note: "Sorted input still needs n(n − 1)/2 comparisons; it makes 0 swaps." },
    { label: "Average", time: "O(n²)", space: "O(1)", note: "Comparisons never change; swaps stay at most n − 1." },
    { label: "Worst", time: "O(n²)", space: "O(1)", note: "n(n − 1)/2 comparisons and n − 1 swaps." },
  ],
  code: python(SELECTION_IMPL),
  faqs: [
    {
      q: "Is selection sort stable?",
      a: "No. Swapping the minimum into place can jump an element over an equal one: `[5a, 5b, 2]` becomes `[2, 5b, 5a]`.",
    },
    {
      q: "What is the time complexity of selection sort?",
      a: "O(n²) in the best, average and worst case, because it always makes n(n − 1)/2 comparisons. Only the number of swaps (0 to n − 1) depends on the input.",
    },
    {
      q: "How many swaps does selection sort make?",
      a: "At most n − 1, one per pass, and fewer when an element is already in place. Bubble and insertion sort instead move elements once per inversion, up to n(n − 1)/2 times.",
    },
    {
      q: "What is the difference between selection sort and bubble sort?",
      a: "Both are O(n²), but selection sort makes one swap per pass while bubble sort swaps every out-of-order pair of neighbours. Bubble sort is stable and can stop early on sorted input; selection sort is neither.",
    },
    {
      q: "Is selection sort in-place?",
      a: "Yes. It only needs a few index variables, so its extra space is O(1).",
    },
  ],
  related: ["/sorting/insertion-sort", "/sorting/bubble-sort", "/heap/heap-sort", "/sorting/quick-sort", "/sorting"],
  updated: UPDATED,
};

const INSERTION: TopicContent = {
  path: "/sorting/insertion-sort",
  parent: "/sorting",
  name: "Insertion Sort",
  title: "Insertion Sort Visualizer — Step-by-Step Animation",
  h1: "Insertion Sort Visualizer",
  description:
    "Insertion sort takes each element and slides it left into place in the sorted prefix. Watch every shift animated, with Python code and O(n²) complexity.",
  keywords: ["insertion sort", "insertion sort visualizer", "insertion sort algorithm", "insertion sort time complexity", "insertion sort best case", "insertion sort python"],
  summary:
    "Insertion sort builds the sorted array one element at a time, the way most people sort a hand of cards: take the next element (the key), shift every larger element of the sorted prefix one place right, and drop the key into the gap. " +
    "It is O(n²) on average and in the worst case but O(n) on nearly sorted input, and it is stable, in-place and online — which is why real sorting libraries use it for small arrays.",
  steps: [
    "Treat `A[0]` as a sorted prefix of length one.",
    "Lift out the next element, `key = A[i]`, leaving a gap at index i.",
    "Walk left with `j = i − 1`: while `A[j] > key`, shift `A[j]` one slot right into the gap.",
    "When `A[j] ≤ key` (or `j` runs off the front), drop `key` into the gap at `j + 1`. The prefix `A[0..i]` is sorted again.",
    "Repeat for `i = 1 … n − 1`.",
  ],
  sections: [
    {
      heading: "Worked example: sorting [38, 27, 43, 3, 9, 82, 10]",
      body: body(
        "The visualizer above opens on this array:",
        bullets(
          "**key 27:** 38 shifts right and 27 goes to the front: `[27, 38, 43, 3, 9, 82, 10]`.",
          "**key 43:** already larger than 38 — one comparison, no shifts.",
          "**key 3:** 43, 38 and 27 all shift: `[3, 27, 38, 43, 9, 82, 10]`.",
          "**key 9:** 43, 38 and 27 shift, then 3 ≤ 9 stops the scan: `[3, 9, 27, 38, 43, 82, 10]`.",
          "**key 82:** larger than 43, stays where it is.",
          "**key 10:** 82, 43, 38 and 27 shift: `[3, 9, 10, 27, 38, 43, 82]`.",
        ),
        "Total: **15 comparisons and 11 shifts**. Eleven is the number of inversions in the input — insertion sort makes exactly one shift per inversion.",
      ),
    },
    {
      heading: "Why insertion sort is fast on nearly sorted data",
      body: body(
        "The work is easy to count: every shift removes exactly one inversion, and every key needs at most one extra comparison to stop. So insertion sort runs in **O(n + I)** time, where I is the number of inversions. Sorted input has I = 0 and costs n − 1 comparisons. Reversed input has I = n(n − 1)/2, the quadratic worst case. Random input has I ≈ n²/4, so the average is still quadratic.",
        "That makes insertion sort **adaptive**: the closer the input is to sorted, the faster it runs. In the visualizer's Compare mode it wins the nearly-sorted race outright, far ahead of merge sort and quick sort.",
      ),
    },
    {
      heading: "Why libraries use it inside faster sorts",
      body: body(
        "On small arrays constant factors beat Big-O. Insertion sort has no recursion, no extra memory and a tiny inner loop, so for a few dozen elements it outruns merge sort and quick sort. That is why:",
        bullets(
          "**Timsort** (Python, Java objects, V8's `Array.prototype.sort`) uses binary insertion sort to grow short runs to a minimum length of 32–64 elements before merging them.",
          "**Introsort** (C++ `std::sort` in libstdc++) stops the quick-sort recursion at partitions of 16 elements and finishes with insertion sort.",
          "**Shell sort** is insertion sort run over shrinking gaps, so far-apart elements move early.",
        ),
        "Insertion sort is also **online**: it can keep a list sorted while items arrive one at a time.",
      ),
    },
    {
      heading: "Insertion sort vs bubble and selection sort",
      body: bullets(
        "**vs bubble sort:** both make one move per inversion, but insertion sort shifts (one write) instead of swapping, and its scan stops at the first smaller element — about half as many comparisons on random input.",
        "**vs selection sort:** selection sort makes fewer writes (at most n − 1 swaps) but always n(n − 1)/2 comparisons; insertion sort compares less and adapts to presorted input.",
        "**Binary insertion sort** finds each key's slot with binary search (O(log n) comparisons), but still shifts the elements, so it remains O(n²) moves.",
      ),
    },
    {
      heading: "Common mistakes and interview tips",
      body: bullets(
        "Writing `A[j] >= key` in the loop condition: equal elements shift past each other and the sort is no longer stable.",
        "Testing `A[j] > key` before `j >= 0`. In Python, `A[-1]` silently reads the last element when the key belongs at the front.",
        "Swapping the key down step by step instead of shifting and writing it once — correct, but up to three times the writes.",
        "Interview angle: “sort an array where every element is at most k places from its final position.” Insertion sort does it in O(nk); a min-heap of size k + 1 in O(n log k).",
      ),
    },
  ],
  complexity: [
    { label: "Best", time: "O(n)", space: "O(1)", note: "Sorted input: each key needs one comparison and no shifts." },
    { label: "Average", time: "O(n²)", space: "O(1)", note: "About n²/4 shifts — one per inversion." },
    { label: "Worst", time: "O(n²)", space: "O(1)", note: "Reversed input: every key shifts past the whole prefix, n(n − 1)/2 shifts." },
  ],
  code: python(INSERTION_IMPL),
  faqs: [
    {
      q: "Is insertion sort stable?",
      a: "Yes. A key stops at the first element that is less than or equal to it, so equal elements keep their original order.",
    },
    {
      q: "What is the best case of insertion sort?",
      a: "An already sorted array: n − 1 comparisons, no shifts, O(n) time. Nearly sorted input is almost as fast, because the cost is O(n + number of inversions).",
    },
    {
      q: "Is insertion sort better than bubble sort?",
      a: "Yes, in practice. Both are O(n²) and stable, but insertion sort makes about half the comparisons on random input and shifts elements instead of swapping them.",
    },
    {
      q: "Why does Timsort use insertion sort?",
      a: "On short runs insertion sort is faster than merging because it has almost no overhead, and real data often contains partly sorted stretches. Timsort uses binary insertion sort to build sorted runs, then merges the runs.",
    },
    {
      q: "Is insertion sort an online algorithm?",
      a: "Yes. It only needs the elements seen so far, so it can keep a growing list sorted as new items arrive, inserting each one into place.",
    },
  ],
  related: ["/sorting/shell-sort", "/sorting/bubble-sort", "/sorting/selection-sort", "/sorting/merge-sort", "/sorting"],
  updated: UPDATED,
};

const SHELL: TopicContent = {
  path: "/sorting/shell-sort",
  parent: "/sorting",
  name: "Shell Sort",
  title: "Shell Sort Visualizer — Gaps, Passes and Code",
  h1: "Shell Sort Visualizer",
  description:
    "Shell sort runs insertion sort on elements a gap apart, shrinking the gap to 1 so values move far in one jump. Watch every gap pass animated, with Python code.",
  keywords: ["shell sort", "shell sort visualizer", "shellsort algorithm", "shell sort gap sequence", "shell sort time complexity", "shell sort example"],
  summary:
    "Shell sort is insertion sort with a head start: it first sorts elements that are a large **gap** apart, then repeats with smaller and smaller gaps, finishing with gap 1 — an ordinary insertion sort on an array that is by then almost sorted. " +
    "Because far-away values move in one long jump, it is much faster than insertion sort on larger inputs. It sorts in place with O(1) extra memory, is not stable, and its running time depends on the gap sequence.",
  steps: [
    "Pick a gap. This visualizer uses Shell's original sequence: start at `gap = ⌊n/2⌋` and halve it after every pass.",
    "For every `i` from `gap` to `n − 1`, lift out `tmp = A[i]`.",
    "While `j ≥ gap` and `A[j − gap] > tmp`, shift `A[j − gap]` a whole gap to the right and move `j` back by `gap`.",
    "Write `tmp` into the hole at `A[j]`. Every interleaved sub-sequence `A[r], A[r + gap], A[r + 2·gap], …` is now sorted.",
    "Halve the gap and repeat. The final pass with gap 1 is plain insertion sort and guarantees a sorted array.",
  ],
  sections: [
    {
      heading: "Worked example: sorting [62, 83, 18, 53, 7, 17, 95, 86, 47, 69]",
      body: body(
        "The visualizer above opens on this 10-element array, so the gaps are 5, 2 and 1.",
        bullets(
          "**Gap 5** sorts five pairs that are 5 apart: (62, 17), (83, 95), (18, 86), (53, 47) and (7, 69). Two pairs are out of order, so 17 and 47 jump five places left in a single move: `[17, 83, 18, 47, 7, 62, 95, 86, 53, 69]`.",
          "**Gap 2** sorts the even positions (17, 18, 7, 95, 53 → 7, 17, 18, 53, 95) and the odd positions (83, 47, 62, 86, 69 → 47, 62, 69, 83, 86) independently: `[7, 47, 17, 62, 18, 69, 53, 83, 95, 86]`.",
          "**Gap 1** is insertion sort on that almost-sorted array and finishes the job: `[7, 17, 18, 47, 53, 62, 69, 83, 86, 95]`.",
        ),
        "The visualizer counts **15 shifts** in total, against **21** for plain insertion sort on the same input. On an array this small shell sort actually makes a few more comparisons (33 against 28) — the savings appear and grow quickly as n gets larger.",
      ),
    },
    {
      heading: "Why the gaps help",
      body: body(
        "Insertion sort is slow because each shift moves an element one position and fixes exactly one inversion. A shift across a gap of h moves an element h positions at once and can remove many inversions with a single write. The large gaps do the coarse work cheaply; by the time the gap is 1, every element is close to its final position, which is exactly where insertion sort is at its best.",
        "Earlier passes are never undone: an array that is h-sorted stays h-sorted after you sort it with a smaller gap. So the work of every pass accumulates.",
      ),
    },
    {
      heading: "Gap sequences and complexity",
      body: body(
        "Shell sort's speed depends almost entirely on the gaps:",
        bullets(
          "**Shell, 1959: n/2, n/4, …, 1** — used here because it is easy to follow. Worst case **Θ(n²)**: when n is a power of two every gap except the last is even, so values in odd and even positions are never compared until the final pass.",
          "**Hibbard: 1, 3, 7, 15, … (2^k − 1)** — worst case O(n^1.5).",
          "**Knuth: 1, 4, 13, 40, … ((3^k − 1)/2)** — O(n^1.5), simple and popular.",
          "**Pratt: all numbers 2^p·3^q (1, 2, 3, 4, 6, 8, 9, 12, …)** — O(n log² n), but with many passes.",
          "**Ciura, 2001: 1, 4, 10, 23, 57, 132, 301, 701** — found by experiment and the fastest known in practice.",
        ),
        "No known gap sequence gives O(n log n) in the worst case, and the average-case complexity is still an open problem for most sequences — which is why the table below gives a range.",
      ),
    },
    {
      heading: "Stability and memory",
      body: body(
        "Shell sort is **in-place**: it needs only `tmp`, `i`, `j` and `gap`, and no recursion. That small, stack-free footprint is why some C libraries for embedded systems (uClibc, for example) implement `qsort` with it.",
        "It is **not stable**. Elements in different sub-sequences move independently, so a long jump can carry one copy of a value past another. With `[2a, 2b, 1, 3]`, the gap-2 pass swaps 2a with 1, giving `[1, 2b, 2a, 3]`, and the final pass never swaps equal values back.",
      ),
    },
    {
      heading: "When to use shell sort",
      body: body(
        "Choose shell sort when you need something much faster than insertion sort on medium-sized arrays — hundreds to a few thousand elements — with tiny code, no recursion and no extra memory. For large general-purpose sorting, quick sort, merge sort or your language's library sort will be faster, and if you need stability use merge sort or insertion sort.",
        "In interviews, be ready to explain why the last gap must be 1 (otherwise some pairs of elements are never compared) and why shell sort is not stable.",
      ),
    },
  ],
  complexity: [
    { label: "Best", time: "O(n log n)", space: "O(1)", note: "Sorted input: about log₂ n passes of roughly n comparisons each, no shifts." },
    { label: "Average", time: "≈ O(n^1.25) – O(n^1.5)", space: "O(1)", note: "Depends on the gaps; measured rather than proven for most sequences." },
    { label: "Worst (Knuth / Hibbard gaps)", time: "O(n^1.5)", space: "O(1)", note: "Gaps without common factors keep the passes doing useful work." },
    { label: "Worst (Shell's n/2 gaps)", time: "O(n²)", space: "O(1)", note: "Small and large values interleaved when n is a power of two." },
  ],
  code: python(SHELL_IMPL),
  faqs: [
    {
      q: "Is shell sort stable?",
      a: "No. Elements in different gap sub-sequences move independently, so a long jump can carry one copy of a value past an equal one.",
    },
    {
      q: "What is the time complexity of shell sort?",
      a: "It depends on the gap sequence: Θ(n²) worst case with Shell's original n/2, n/4, … gaps, O(n^1.5) with Hibbard's or Knuth's gaps, and O(n log² n) with Pratt's. On sorted input it is O(n log n).",
    },
    {
      q: "Why must the last gap in shell sort be 1?",
      a: "Only a gap-1 pass compares every pair of neighbours. With a larger final gap, elements in different sub-sequences are never compared with each other, so the array can stay unsorted.",
    },
    {
      q: "Is shell sort faster than insertion sort?",
      a: "On anything beyond a few dozen elements, yes — often dramatically, because big gaps remove many inversions per move. On tiny arrays the extra passes can cost more than they save.",
    },
    {
      q: "Who invented shell sort?",
      a: "Donald L. Shell published it in 1959, and it is named after him. Later gap sequences showed that it can run in sub-quadratic time.",
    },
  ],
  related: ["/sorting/insertion-sort", "/sorting/quick-sort", "/sorting/merge-sort", "/sorting/bubble-sort", "/sorting"],
  updated: UPDATED,
};

const COUNTING: TopicContent = {
  path: "/sorting/counting-sort",
  parent: "/sorting",
  name: "Counting Sort",
  title: "Counting Sort Visualizer — Counts and Prefix Sums",
  h1: "Counting Sort Visualizer",
  description:
    "Counting sort sorts integers in O(n + k) time by counting each value and placing elements with prefix sums, with no comparisons. Watch every phase animated.",
  keywords: ["counting sort", "counting sort visualizer", "counting sort algorithm", "counting sort time complexity", "counting sort example", "is counting sort stable"],
  summary:
    "Counting sort sorts integers without comparing them: it counts how many times each value occurs, turns the counts into running totals (prefix sums) that say where each value's block ends, then places every element straight into its slot in an output array. " +
    "It runs in **O(n + k)** time and space, where k is the range of values, and it is stable — the right tool when keys are integers from a small range.",
  steps: [
    "Find the smallest value `lo` and the range `k = max − lo + 1`; create a count array `C` of k zeros.",
    "Count: for each element, add 1 to `C[A[i] − lo]`.",
    "Prefix sums: for v = 1 … k − 1, `C[v] += C[v − 1]`. Now `C[v]` is how many elements are ≤ that value — one past the last slot the value will occupy.",
    "Place: walk `A` from right to left; for each element, decrement its counter and write the element to `B[C[v]]`.",
    "Copy the output array `B` back into `A`.",
  ],
  sections: [
    {
      heading: "Worked example: sorting [5, 2, 7, 2, 4, 5, 1, 3]",
      body: body(
        "The visualizer above opens on this array: eight values from 1 to 7, so k = 7.",
        bullets(
          "**Count:** C for the values 1…7 is `[1, 2, 1, 1, 2, 0, 1]` — two 2s, two 5s and no 6.",
          "**Prefix sums:** `[1, 3, 4, 5, 7, 7, 8]`. Read it as “3 elements are ≤ 2”, so the two 2s fill output slots 1 and 2 (0-based).",
          "**Place, right to left:** 3 → slot 3, 1 → slot 0, the second 5 → slot 6, 4 → slot 4, the second 2 → slot 2, 7 → slot 7, the first 2 → slot 1, the first 5 → slot 5.",
          "**Output:** `[1, 2, 2, 3, 4, 5, 5, 7]` after 8 writes and zero comparisons.",
        ),
        "Look at the duplicates: the second 2 is placed first, into the later of the two slots, so the two 2s keep their input order. That is the whole reason the placing loop runs right to left.",
      ),
    },
    {
      heading: "How counting sort beats O(n log n)",
      body: body(
        "The Ω(n log n) lower bound only applies to algorithms that learn about the order by comparing pairs of elements. Counting sort never compares: it uses each value as an index into C, so one array access does the work that would otherwise take about log n comparisons.",
        "The cost moves into the size of C instead. Counting is O(n), the prefix sums O(k) and placing O(n), so the total is **O(n + k)** in every case, whatever the order of the input.",
      ),
    },
    {
      heading: "When counting sort is — and isn't — a good idea",
      body: body(
        "Counting sort shines when k is no bigger than about n: exam scores 0–100, ages, star ratings, bytes 0–255, small enum values. It is a poor choice when the range dwarfs the number of elements — sorting five arbitrary 32-bit integers could need a count array with over four billion entries. Floating-point numbers and strings don't fit directly either.",
        "When the range is too wide to draw, the visualizer switches to a **sparse** view that hides zero counts, but the algorithm still allocates and scans all k counters — that is the hidden cost.",
      ),
    },
    {
      heading: "Stability, memory and radix sort",
      body: body(
        "As written here counting sort is **stable**: placing from right to left puts the last copy of each value into the last slot of its block. Stability is more than a nicety — it is what lets a counting pass serve as the per-digit step inside **radix sort**, which sorts large integers one digit at a time.",
        "It is **not in-place**: it needs the count array (O(k)) and an output array (O(n)). A simpler variant just writes each value C[v] times and needs no output array, but it only works for bare integers — it can't carry along the record each key belongs to.",
      ),
    },
    {
      heading: "Common mistakes and interview tips",
      body: bullets(
        "Sizing C as `max + 1` instead of `max − min + 1`. It wastes memory and breaks on negative numbers; offsetting by `lo` fixes both.",
        "Placing from left to right with the prefix sums. The output is still sorted, but equal keys come out reversed — unstable, which silently breaks radix sort.",
        "An off-by-one in the place step: decrement the counter before writing, because the prefix sum points one past the block's last slot.",
        "Interview angle: “sort an array of 0s, 1s and 2s” or “sort a million ages” — counting sort is the O(n) answer.",
      ),
    },
  ],
  complexity: [
    { label: "Best", time: "O(n + k)", space: "O(n + k)", note: "Count n elements, prefix-sum k counters, place n elements." },
    { label: "Average", time: "O(n + k)", space: "O(n + k)", note: "No comparisons, so the input order doesn't matter." },
    { label: "Worst", time: "O(n + k)", space: "O(n + k)", note: "Only expensive when the value range k is much larger than n." },
  ],
  code: python(COUNTING_IMPL),
  faqs: [
    {
      q: "Is counting sort stable?",
      a: "Yes, when the placing loop walks the input from right to left and fills each value's block from its end. Radix sort relies on exactly that.",
    },
    {
      q: "What is k in counting sort's O(n + k)?",
      a: "k is the size of the value range, max − min + 1. Sorting 1,000 exam scores between 0 and 100 means n = 1,000 and k = 101.",
    },
    {
      q: "Why isn't counting sort used everywhere if it runs in linear time?",
      a: "It only works for integer keys from a known, small range. When k is much larger than n, the count array dominates both the time and the memory.",
    },
    {
      q: "Is counting sort a comparison sort?",
      a: "No. It never compares two elements; it uses the values as array indices. That is how it escapes the Ω(n log n) lower bound for comparison sorts.",
    },
    {
      q: "Can counting sort handle negative numbers?",
      a: "Yes, by offsetting every value by the minimum — index C with `A[i] − min` — as the Python code on this page does.",
    },
  ],
  related: ["/sorting/radix-sort", "/sorting/merge-sort", "/sorting/insertion-sort", "/sorting"],
  updated: UPDATED,
};

const RADIX: TopicContent = {
  path: "/sorting/radix-sort",
  parent: "/sorting",
  name: "Radix Sort",
  title: "Radix Sort Visualizer — LSD Digit Buckets Animated",
  h1: "Radix Sort Visualizer",
  description:
    "Radix sort orders integers digit by digit — ones, then tens, then hundreds — using stable bucket passes. Watch LSD radix sort animated, with Python code.",
  keywords: ["radix sort", "radix sort visualizer", "lsd radix sort", "radix sort algorithm", "radix sort time complexity", "radix sort example"],
  summary:
    "Radix sort sorts integers one digit at a time without comparing them. The LSD (least significant digit) version shown here deals the numbers into ten buckets by their ones digit, collects them back in bucket order, then repeats for the tens, the hundreds and so on; because every pass is stable, the array is fully sorted after the last digit. " +
    "It takes **O(d·(n + b))** time for d digits in base b and O(n + b) extra space.",
  steps: [
    "Find the largest key to know how many digits `d` it has (shift every key by −min first if there are negative numbers).",
    "Start with `exp = 1`, the ones digit.",
    "Distribute: for each element in order, compute its digit `⌊A[i] / exp⌋ mod 10` and append the element to the end of that bucket.",
    "Collect: concatenate buckets 0 through 9 back into `A`, each in first-in, first-out order.",
    "Multiply `exp` by 10 and repeat until every digit of the largest key has been used.",
  ],
  sections: [
    {
      heading: "Worked example: sorting [170, 45, 75, 90, 802, 24, 2, 66]",
      body: body(
        "The visualizer above opens on this classic example. The largest key, 802, has three digits, so there are three passes.",
        bullets(
          "**Ones digit:** bucket 0 gets 170, 90 · bucket 2: 802, 2 · bucket 4: 24 · bucket 5: 45, 75 · bucket 6: 66 → `[170, 90, 802, 2, 24, 45, 75, 66]`.",
          "**Tens digit:** 0: 802, 2 · 2: 24 · 4: 45 · 6: 66 · 7: 170, 75 · 9: 90 → `[802, 2, 24, 45, 66, 170, 75, 90]`.",
          "**Hundreds digit:** 0: 2, 24, 45, 66, 75, 90 · 1: 170 · 8: 802 → `[2, 24, 45, 66, 75, 90, 170, 802]`.",
        ),
        "Look at bucket 0 in the last pass: six numbers whose hundreds digit is 0 arrive already ordered by their last two digits, because the earlier passes sorted them and each pass keeps that order. The visualizer counts 48 moves: 8 elements × 3 passes × (one move into a bucket + one move back).",
      ),
    },
    {
      heading: "Why least-significant-digit first works",
      body: body(
        "After pass p the array is sorted by its last p digits. The next pass sorts by digit p + 1, and when two numbers share that digit, a **stable** pass leaves them in the order the earlier passes established — sorted by their lower digits. By induction, after d passes the array is sorted by all d digits.",
        "So every pass must be stable; with an unstable pass the earlier work would be scrambled. MSD (most significant digit first) radix sort works the other way round: it splits by the top digit and recursively sorts each bucket, which suits variable-length keys such as strings.",
      ),
    },
    {
      heading: "Time complexity: O(d·(n + b))",
      body: body(
        "Each pass moves every element into a bucket and back and walks b = 10 buckets, so one pass is O(n + b). With d passes the total is **O(d·(n + b))** in every case — the order of the input doesn't matter.",
        "Is that faster than O(n log n)? When d is a small constant, yes: sorting a million 32-bit integers one byte at a time (base 256) takes 4 passes, while a comparison sort needs around 20 million comparisons. But d grows with the key size — n distinct keys need at least log_b n digits — so radix sort wins when keys are short compared with the number of elements, not always.",
      ),
    },
    {
      heading: "Radix sort vs counting sort and comparison sorts",
      body: bullets(
        "**Counting sort** needs a counter for every possible value (O(k) memory). Radix sort runs a counting-style pass on one digit at a time, so it handles huge ranges with only b buckets.",
        "**Quick sort and merge sort** work on any keys that can be compared; radix sort needs keys that split into digits — integers, fixed-length strings, dates, IP addresses.",
        "Production implementations usually use base 256 (one byte per pass) and a counting-sort pass instead of bucket lists, which is faster and avoids allocating lists.",
        "Radix sort is stable and needs O(n + b) extra memory, so the simple version shown here is not in-place.",
      ),
    },
    {
      heading: "Common mistakes and interview tips",
      body: bullets(
        "Starting this algorithm from the most significant digit. LSD must start with the ones digit; MSD needs a recursive sort per bucket.",
        "Using an unstable pass for a digit, for example pushing elements to the front of a bucket.",
        "Stopping too early: the number of passes comes from the **largest** key's digit count, not from the first element.",
        "Negative numbers: shift every key by −min first (as the code here does) or sort negatives separately; plain digit extraction breaks on them.",
        "Interview angle: “sort n integers in the range 0 … n³ − 1 in linear time.” Radix sort in base n needs just 3 passes of O(n) each.",
      ),
    },
  ],
  complexity: [
    { label: "Best", time: "O(d·(n + b))", space: "O(n + b)", note: "d passes, each moving n elements through b buckets." },
    { label: "Average", time: "O(d·(n + b))", space: "O(n + b)", note: "No comparisons, so the input order doesn't matter." },
    { label: "Worst", time: "O(d·(n + b))", space: "O(n + b)", note: "Grows with the number of digits d in the largest key." },
  ],
  code: python(RADIX_IMPL),
  faqs: [
    {
      q: "Is radix sort stable?",
      a: "Yes. LSD radix sort has to be: each digit pass keeps elements with equal digits in their previous order, which is what makes the earlier passes count.",
    },
    {
      q: "What is the time complexity of radix sort?",
      a: "O(d·(n + b)), where d is the number of digits and b the base (10 here). For fixed-size keys such as 32-bit integers d is a constant, so it runs in linear time.",
    },
    {
      q: "What is the difference between LSD and MSD radix sort?",
      a: "LSD starts with the least significant digit and makes d stable passes over the whole array. MSD starts with the most significant digit and recursively sorts each bucket, which suits strings of different lengths and can stop early.",
    },
    {
      q: "Is radix sort faster than quick sort?",
      a: "For many short integer keys it can be, because it makes a few linear passes instead of about n log n comparisons. For general or long keys, quick sort usually wins thanks to in-place work and better cache use.",
    },
    {
      q: "Can radix sort handle negative numbers?",
      a: "Not directly, because digit extraction doesn't order negative numbers correctly. Shift every key by −min first, as this page's code does, or sort negatives and positives separately.",
    },
  ],
  related: ["/sorting/counting-sort", "/sorting/merge-sort", "/sorting/quick-sort", "/sorting"],
  updated: UPDATED,
};

const MERGE: TopicContent = {
  path: "/sorting/merge-sort",
  parent: "/sorting",
  name: "Merge Sort",
  title: "Merge Sort Visualizer — Step-by-Step Animation",
  h1: "Merge Sort Visualizer",
  description:
    "Merge sort splits the array in half, sorts each half recursively and merges the sorted halves, in O(n log n) time. Watch every split and merge animated.",
  keywords: ["merge sort", "merge sort visualizer", "merge sort algorithm", "merge sort time complexity", "is merge sort stable", "merge sort python", "merge sort vs quick sort"],
  summary:
    "Merge sort is a divide-and-conquer sorting algorithm: it splits the array into two halves, sorts each half recursively, then **merges** the two sorted halves by repeatedly taking the smaller front element. " +
    "It runs in O(n log n) time in the best, average and worst case and it is stable, but the usual array version needs O(n) extra memory for merging.",
  steps: [
    "If the range `A[lo..hi]` has 0 or 1 elements, it is already sorted — return.",
    "Split it at `mid = ⌊(lo + hi) / 2⌋`.",
    "Recursively sort the left half `A[lo..mid]`.",
    "Recursively sort the right half `A[mid + 1..hi]`.",
    "Merge: copy the halves out as `L` and `R`, repeatedly write the smaller of `L[i]` and `R[j]` back into `A[k]` (taking from `L` on ties), then copy whatever is left over.",
  ],
  sections: [
    {
      heading: "Worked example: sorting [38, 27, 43, 3, 9, 82, 10]",
      body: body(
        "The visualizer above opens on this array and draws the recursion as a tree of boxes:",
        bullets(
          "**Split** at mid = 3 into `[38, 27, 43, 3]` and `[9, 82, 10]`, and keep halving until every piece is a single element.",
          "**Merge pairs:** `[38] + [27] → [27, 38]`, `[43] + [3] → [3, 43]`, `[9] + [82] → [9, 82]`.",
          "**Merge runs:** `[27, 38] + [3, 43] → [3, 27, 38, 43]` and `[9, 82] + [10] → [9, 10, 82]`.",
          "**Final merge:** 3 vs 9 takes 3, 27 vs 9 takes 9, 27 vs 10 takes 10, then 27, 38 and 43 each beat 82, and the leftover 82 is copied: `[3, 9, 10, 27, 38, 43, 82]`.",
        ),
        "In total **14 comparisons and 20 writes**. Each element is written once for every merge it takes part in — three times for most of them, twice for 10, which became a single-element piece one level sooner.",
      ),
    },
    {
      heading: "Why merge sort is O(n log n) in every case",
      body: body(
        "Halving again and again gives a recursion tree with ⌈log₂ n⌉ levels. On each level the merges together touch every element once, which is O(n) work per level. Multiply the two: **O(n log n)**. As a recurrence, T(n) = 2T(n/2) + O(n), which solves to Θ(n log n).",
        "The split never looks at the values, so there is no bad input: sorted, reversed and random arrays all take Θ(n log n) time. Only the comparison count varies a little, because a merge stops comparing as soon as one run is used up. For n = 1,000 that is about 10,000 element moves, where insertion sort could need up to 500,000.",
      ),
    },
    {
      heading: "The merge step and stability",
      body: body(
        "Merging two sorted runs is the heart of the algorithm. Keep a pointer at the front of each run: the smaller of the two front elements is the smallest one remaining overall, so it goes next. Every comparison outputs one element, so merging runs with m elements in total takes at most m − 1 comparisons.",
        "On a tie the code takes from the **left** run (`L[i] <= R[j]`). The left run came earlier in the input, so equal elements keep their original order — that is what makes merge sort **stable**. Write `<` instead and it quietly stops being stable.",
      ),
    },
    {
      heading: "Merge sort vs quick sort",
      body: body(
        bullets(
          "**Worst case:** merge sort is always O(n log n); quick sort is O(n²) with consistently bad pivots.",
          "**Memory:** merge sort needs an O(n) buffer for arrays; quick sort sorts in place with an O(log n) stack.",
          "**Stability:** merge sort is stable; quick sort is not.",
          "**Speed on arrays in RAM:** quick sort is usually faster, thanks to its tight, cache-friendly partition loop.",
          "**Linked lists and huge files:** merge sort wins. It reads runs sequentially, so it merges linked lists with O(1) extra space and sorts files far larger than memory (external merge sort).",
        ),
        "That is why stable library sorts are merge-based: Python's `sorted()`, Java's object sort and V8's `Array.prototype.sort` use Timsort, and C++ offers `std::stable_sort`.",
      ),
    },
    {
      heading: "Common mistakes and interview tips",
      body: bullets(
        "Computing `mid = (lo + hi) / 2` with fixed-size integers can overflow on huge arrays; `lo + (hi − lo) / 2` is safe.",
        "Forgetting to copy the leftovers once one run is exhausted.",
        "Allocating new arrays in every call. It works, but one buffer allocated up front is much faster.",
        "Classic follow-ups: **count inversions** in O(n log n) (add the number of elements left in L whenever you take from R), **merge k sorted lists** with a heap, and **sort a linked list** in O(n log n).",
      ),
    },
  ],
  complexity: [
    { label: "Best", time: "O(n log n)", space: "O(n)", note: "Still splits all the way down; each merge compares at least as often as its shorter run is long." },
    { label: "Average", time: "O(n log n)", space: "O(n)", note: "About log₂ n levels × O(n) merging per level." },
    { label: "Worst", time: "O(n log n)", space: "O(n)", note: "There is no bad input: the split never looks at the values." },
  ],
  code: python(MERGE_IMPL),
  faqs: [
    {
      q: "Is merge sort stable?",
      a: "Yes. When the two front elements are equal, the merge takes the one from the left run first, so equal keys keep their input order.",
    },
    {
      q: "What is the time complexity of merge sort?",
      a: "O(n log n) in the best, average and worst case: about log₂ n levels of splitting, with O(n) merging work on each level.",
    },
    {
      q: "Why does merge sort need O(n) extra space?",
      a: "Merging two halves of an array in place is hard, so the standard version copies the halves into temporary arrays first. In-place merging exists but is complicated and slower; on linked lists merge sort needs no extra buffer.",
    },
    {
      q: "Is merge sort better than quick sort?",
      a: "It is safer — guaranteed O(n log n) and stable — but usually a bit slower on arrays in memory and it needs O(n) extra space. Use merge sort for linked lists, external sorting or when stability matters, and quick sort for fast in-place sorting.",
    },
    {
      q: "Can merge sort be written without recursion?",
      a: "Yes. Bottom-up merge sort merges runs of size 1, then 2, 4, 8, … in loops until one run covers the whole array; it does the same O(n log n) work as the recursive version.",
    },
  ],
  related: ["/sorting/quick-sort", "/sorting/insertion-sort", "/sorting/counting-sort", "/linked-list", "/sorting"],
  updated: UPDATED,
};

const QUICK: TopicContent = {
  path: "/sorting/quick-sort",
  parent: "/sorting",
  name: "Quick Sort",
  title: "Quick Sort Visualizer — Lomuto and Hoare Partition",
  h1: "Quick Sort Visualizer",
  description:
    "Quick sort picks a pivot, moves smaller values left and larger ones right, then recurses: O(n log n) on average. Watch Lomuto and Hoare partitioning animated.",
  keywords: ["quick sort", "quicksort visualizer", "quick sort algorithm", "quick sort time complexity", "quick sort worst case", "lomuto vs hoare partition", "quick sort python"],
  summary:
    "Quick sort is a divide-and-conquer sorting algorithm that picks a **pivot**, partitions the array so smaller elements end up on its left and larger ones on its right, and then sorts the two sides recursively. " +
    "It runs in O(n log n) time on average and sorts in place, which makes it one of the fastest general-purpose sorts in practice, but consistently bad pivots — such as the last element of an already sorted array — degrade it to O(n²). It is not stable.",
  steps: [
    "If the range `A[lo..hi]` has fewer than two elements, return.",
    "Choose a pivot: last, first, middle, random element or median of three — the visualizer offers all five.",
    "Partition. **Lomuto:** park the pivot at `A[hi]`, scan `j` from `lo` to `hi − 1` and swap every element ≤ pivot into a growing left region, then swap the pivot in right after that region — it is now in its final position `p`. **Hoare:** two pointers move inward from both ends and swap each pair that is on the wrong side.",
    "Recursively sort both parts: `lo..p − 1` and `p + 1..hi` for Lomuto, `lo..p` and `p + 1..hi` for Hoare.",
    "There is no combine step: once both sides are sorted, the whole range is sorted.",
  ],
  sections: [
    {
      heading: "Worked example: sorting [38, 27, 43, 3, 9, 82, 10]",
      body: body(
        "With the visualizer's default settings — Lomuto partition, last-element pivot:",
        bullets(
          "**Partition A[0..6] around 10.** Only 3 and 9 are ≤ 10, so they are swapped to the front and 10 lands at index 2: `[3, 9, 10, 38, 27, 82, 43]`. 10 is now in its final place.",
          "**Left side A[0..1], pivot 9:** 3 ≤ 9 and nothing moves; 9 is final.",
          "**Right side A[3..6], pivot 43:** 38 and 27 are ≤ 43 and already in front, 82 isn't, so 43 swaps with 82: `[3, 9, 10, 38, 27, 43, 82]`.",
          "**A[3..4], pivot 27:** 38 > 27, so 27 swaps to the front of the range: `[3, 9, 10, 27, 38, 43, 82]`.",
        ),
        "That is **11 comparisons and 5 swaps** — fewer comparisons than merge sort's 14 on the same input. Switch to Hoare partitioning or another pivot rule in the Options panel and watch the recursion tree change shape.",
      ),
    },
    {
      heading: "Why the pivot decides everything",
      body: body(
        "If every pivot splits its range roughly in half, the recursion is about log₂ n levels deep and each level partitions n elements: **O(n log n)**. Even a consistent 90/10 split is still O(n log n), with a bigger constant.",
        "The disaster is a pivot that is always the smallest or largest element. Each partition then peels off a single element, the recursion is n levels deep and the comparisons add up to n(n − 1)/2: **O(n²)**. With a last-element pivot that is exactly what an already sorted or reversed array does. In the visualizer a sorted array of 16 values costs 120 comparisons with the last-element pivot and 38 with the middle one — load the **Sorted** preset and watch the recursion tree turn into a long chain.",
      ),
    },
    {
      heading: "Choosing a pivot",
      body: body(
        bullets(
          "**Last or first element:** simplest, but O(n²) on sorted or reversed input, which is common in real data.",
          "**Middle element:** fine on sorted and reversed input; crafted inputs can still defeat it.",
          "**Random element:** expected O(n log n) on every input; the worst case still exists but is astronomically unlikely.",
          "**Median of three** (first, middle and last): cheap, avoids the sorted-input trap and gives more balanced splits. Production quick sorts use it or a larger sample.",
        ),
        "Libraries add one more safety net: **introsort** (C++ `std::sort`) tracks the recursion depth and switches to heap sort once it exceeds about 2·log₂ n, which guarantees O(n log n).",
      ),
    },
    {
      heading: "Lomuto vs Hoare partitioning",
      body: body(
        "**Lomuto** (the default here, as in CLRS) keeps one boundary `i`: everything left of it is ≤ pivot. It is easy to get right and leaves the pivot in its final position, so the recursive calls can skip it. Its weakness is duplicates: if all keys are equal, every element is ≤ pivot, each split is n − 1 against 0, and the sort goes quadratic — 120 comparisons for 16 equal values in the visualizer.",
        "**Hoare** (Tony Hoare's original scheme) moves two pointers towards each other and swaps a pair only when both elements are on the wrong side. It usually swaps less, and because both pointers stop on keys equal to the pivot, an array of equal values splits down the middle. The pivot does not necessarily end in its final position, so the recursion uses `lo..p` and `p + 1..hi`.",
        "For inputs with many duplicates, **three-way partitioning** (< pivot, = pivot, > pivot — Dijkstra's Dutch national flag problem) is better still: all keys equal to the pivot are finished after one pass.",
      ),
    },
    {
      heading: "Stability, memory and quickselect",
      body: body(
        "Quick sort is **not stable**: partition swaps move elements across long distances, so equal keys can change order. It is **in-place** apart from the recursion stack, which is O(log n) deep on average but O(n) in the worst case; recursing into the smaller side first and looping over the larger side caps it at O(log n).",
        "A favourite interview follow-up is “find the k-th smallest element”: **quickselect** partitions once and recurses into one side only, O(n) on average.",
      ),
    },
  ],
  complexity: [
    { label: "Best", time: "O(n log n)", space: "O(log n)", note: "Every pivot splits its range in half." },
    { label: "Average", time: "O(n log n)", space: "O(log n)", note: "About 1.39·n log₂ n comparisons on random input." },
    { label: "Worst", time: "O(n²)", space: "O(n)", note: "The pivot is always the minimum or maximum, e.g. sorted input with a last-element pivot." },
  ],
  code: python(QUICK_IMPL),
  faqs: [
    {
      q: "Why is quick sort O(n²) on sorted input?",
      a: "With the first or last element as pivot, a sorted array always hands quick sort its smallest or largest element. Each partition then removes only one element, so there are n levels of recursion and n(n − 1)/2 comparisons. A random, middle or median-of-three pivot avoids this.",
    },
    {
      q: "Is quick sort stable?",
      a: "No. Partitioning swaps elements across long distances, so equal keys can change their relative order. Use merge sort when you need a stable O(n log n) sort.",
    },
    {
      q: "Is quick sort faster than merge sort?",
      a: "Usually, for arrays in memory: it sorts in place with a tight, cache-friendly loop. Merge sort wins when you need stability, a guaranteed O(n log n), linked lists or external sorting.",
    },
    {
      q: "What is the difference between Lomuto and Hoare partition?",
      a: "Lomuto scans with one pointer and leaves the pivot in its final position; it is simpler but slow when there are many duplicates. Hoare moves two pointers inward, usually swaps less and handles equal keys well, but the pivot does not necessarily end in its final position.",
    },
    {
      q: "What is the space complexity of quick sort?",
      a: "O(log n) on average for the recursion stack and O(n) in the worst case. Recursing into the smaller part first and looping over the larger one guarantees O(log n).",
    },
    {
      q: "What is the best pivot for quick sort?",
      a: "The true median gives perfect splits but is costly to find. In practice median of three or a random pivot gives near-balanced splits cheaply and avoids the sorted-input worst case.",
    },
  ],
  related: ["/sorting/merge-sort", "/heap/heap-sort", "/sorting/insertion-sort", "/sorting/selection-sort", "/sorting"],
  updated: UPDATED,
};

/** Hub first, then one page per algorithm (also the order of /sorting/[slug] static params). */
export const SORTING_TOPICS: TopicContent[] = [HUB, BUBBLE, SELECTION, INSERTION, SHELL, COUNTING, RADIX, MERGE, QUICK];
