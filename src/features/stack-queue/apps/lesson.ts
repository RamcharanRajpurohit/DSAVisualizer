import type { Lesson } from "@/lib/lesson";

export const APPS_LESSON: Lesson = {
  id: "sq.apps",
  title: "Stack applications",
  slides: [
    {
      title: "Why a stack?",
      body: "Use a stack whenever the most recent unfinished thing must be handled first. Brackets, expressions and \"next greater\" problems all have that shape.",
    },
    {
      title: "Balanced brackets",
      body: "Push every opener. A closer must match the **top**, or the brackets cross. At the end the stack must be empty.",
      tryIt: [
        { label: "Check {[()()]}", action: "brOk" },
        { label: "Check ([)]", action: "brCross" },
      ],
    },
    {
      title: "Infix → postfix",
      body: "Operands go straight to the output; operators wait on a stack. An operator pops the top while it binds tighter — or equally tight, if left-associative.",
      tryIt: [
        { label: "Convert (3+4)*2", action: "inParen" },
        { label: "Convert 2^3^2", action: "inRight" },
      ],
    },
    {
      title: "Postfix evaluation",
      body: "Push numbers. An operator pops **b** (the top), then **a**, and pushes `a op b`. The one value left is the answer.",
      tryIt: [{ label: "Evaluate 5 1 2 + 4 * + 3 -", action: "pfEval" }],
    },
    {
      title: "Next greater element",
      body: "Keep the indices still waiting on a stack, values decreasing upward. A larger value pops — and answers — every smaller one below it.",
      tryIt: [{ label: "Find NGE of 4 5 2 25 7 8", action: "nge" }],
    },
    {
      title: "Amortized O(n)",
      body: "Each element is pushed once and popped at most once. So the inner while-loops add up to O(n) in total, not O(n²).",
      tryIt: [{ label: "Decreasing input", action: "ngeDec" }],
    },
    {
      title: "Interview tips",
      body: "The same patterns solve stock span, daily temperatures and the largest rectangle in a histogram. In postfix, mind the order: `a − b`, not `b − a`.",
    },
  ],
};
