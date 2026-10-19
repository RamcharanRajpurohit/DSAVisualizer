/* Real implementations of the four stack applications — same structure and names as APP_CODE. */
import type { Lang } from "../shared/code";
import type { AppKind } from "./core";

export const APP_IMPL: Record<AppKind, Record<Lang, string>> = {
  brackets: {
    python: `
def is_balanced(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in "([{":
            stack.append(ch)          # push
        elif ch in ")]}":
            if not stack:
                return False          # nothing open
            top = stack.pop()
            if top != pairs[ch]:
                return False          # crossed, e.g. "([)]"
    return not stack                  # all closed?
`,
    cpp: `
#include <stack>
#include <string>

bool isBalanced(const std::string& s) {
    std::stack<char> stack;
    for (char ch : s) {
        if (ch == '(' || ch == '[' || ch == '{') {
            stack.push(ch);
        } else if (ch == ')' || ch == ']' || ch == '}') {
            if (stack.empty()) return false;   // nothing open
            char top = stack.top();
            stack.pop();
            char want = ch == ')' ? '(' : ch == ']' ? '[' : '{';
            if (top != want) return false;     // crossed, e.g. "([)]"
        }
    }
    return stack.empty();                      // all closed?
}
`,
    java: `
import java.util.ArrayDeque;
import java.util.Deque;

class Brackets {
    static boolean isBalanced(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (char ch : s.toCharArray()) {
            if (ch == '(' || ch == '[' || ch == '{') {
                stack.push(ch);
            } else if (ch == ')' || ch == ']' || ch == '}') {
                if (stack.isEmpty()) return false;  // nothing open
                char top = stack.pop();
                char want = ch == ')' ? '(' : ch == ']' ? '[' : '{';
                if (top != want) return false;      // crossed, e.g. "([)]"
            }
        }
        return stack.isEmpty();                     // all closed?
    }
}
`,
    javascript: `
function isBalanced(s) {
  const pairs = { ")": "(", "]": "[", "}": "{" };
  const stack = [];
  for (const ch of s) {
    if ("([{".includes(ch)) {
      stack.push(ch);
    } else if (")]}".includes(ch)) {
      if (stack.length === 0) return false; // nothing open
      const top = stack.pop();
      if (top !== pairs[ch]) return false; // crossed, e.g. "([)]"
    }
  }
  return stack.length === 0; // all closed?
}
`,
  },

  infix: {
    python: `
PREC = {"^": 3, "*": 2, "/": 2, "%": 2, "+": 1, "-": 1}
RIGHT_ASSOC = {"^"}


def to_postfix(tokens):
    """Shunting-yard. tokens like ["(", "3", "+", "4", ")", "*", "2"]; assumes a valid expression."""
    output, stack = [], []
    for t in tokens:
        if t not in PREC and t not in ("(", ")"):  # t is an operand
            output.append(t)
        elif t == "(":
            stack.append(t)
        elif t == ")":
            while stack[-1] != "(":
                output.append(stack.pop())
            stack.pop()                             # discard "("
        else:                                       # t is an operator
            while stack and stack[-1] in PREC and (
                PREC[stack[-1]] > PREC[t]
                or (PREC[stack[-1]] == PREC[t] and t not in RIGHT_ASSOC)
            ):
                output.append(stack.pop())
            stack.append(t)
    while stack:
        output.append(stack.pop())
    return output
`,
    cpp: `
#include <map>
#include <stack>
#include <string>
#include <vector>

const std::map<std::string, int> PREC = {{"^", 3}, {"*", 2}, {"/", 2}, {"%", 2}, {"+", 1}, {"-", 1}};

// Shunting-yard; assumes a valid expression, e.g. {"(", "3", "+", "4", ")", "*", "2"}.
std::vector<std::string> toPostfix(const std::vector<std::string>& tokens) {
    std::vector<std::string> output;
    std::stack<std::string> stack;
    for (const std::string& t : tokens) {
        if (!PREC.count(t) && t != "(" && t != ")") {  // t is an operand
            output.push_back(t);
        } else if (t == "(") {
            stack.push(t);
        } else if (t == ")") {
            while (stack.top() != "(") {
                output.push_back(stack.top());
                stack.pop();
            }
            stack.pop();  // discard "("
        } else {          // t is an operator
            while (!stack.empty() && PREC.count(stack.top())) {
                int top = PREC.at(stack.top()), cur = PREC.at(t);
                if (!(top > cur || (top == cur && t != "^"))) break;  // ^ is right-associative
                output.push_back(stack.top());
                stack.pop();
            }
            stack.push(t);
        }
    }
    while (!stack.empty()) {
        output.push_back(stack.top());
        stack.pop();
    }
    return output;
}
`,
    java: `
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;

class InfixToPostfix {
    static final Map<String, Integer> PREC = Map.of("^", 3, "*", 2, "/", 2, "%", 2, "+", 1, "-", 1);

    // Shunting-yard; assumes a valid expression, e.g. ["(", "3", "+", "4", ")", "*", "2"].
    static List<String> toPostfix(List<String> tokens) {
        List<String> output = new ArrayList<>();
        Deque<String> stack = new ArrayDeque<>();
        for (String t : tokens) {
            if (!PREC.containsKey(t) && !t.equals("(") && !t.equals(")")) {  // t is an operand
                output.add(t);
            } else if (t.equals("(")) {
                stack.push(t);
            } else if (t.equals(")")) {
                while (!stack.peek().equals("("))
                    output.add(stack.pop());
                stack.pop();  // discard "("
            } else {          // t is an operator
                while (!stack.isEmpty() && PREC.containsKey(stack.peek())) {
                    int top = PREC.get(stack.peek()), cur = PREC.get(t);
                    if (!(top > cur || (top == cur && !t.equals("^")))) break;  // ^ is right-associative
                    output.add(stack.pop());
                }
                stack.push(t);
            }
        }
        while (!stack.isEmpty())
            output.add(stack.pop());
        return output;
    }
}
`,
    javascript: `
const PREC = new Map([["^", 3], ["*", 2], ["/", 2], ["%", 2], ["+", 1], ["-", 1]]);
const RIGHT_ASSOC = new Set(["^"]);

// Shunting-yard; assumes a valid expression, e.g. ["(", "3", "+", "4", ")", "*", "2"].
function toPostfix(tokens) {
  const output = [];
  const stack = [];
  const top = () => stack[stack.length - 1];
  for (const t of tokens) {
    if (!PREC.has(t) && t !== "(" && t !== ")") {
      output.push(t); // t is an operand
    } else if (t === "(") {
      stack.push(t);
    } else if (t === ")") {
      while (top() !== "(") output.push(stack.pop());
      stack.pop(); // discard "("
    } else {
      // t is an operator
      while (stack.length && PREC.has(top())) {
        const pt = PREC.get(top()), pc = PREC.get(t);
        if (!(pt > pc || (pt === pc && !RIGHT_ASSOC.has(t)))) break;
        output.push(stack.pop());
      }
      stack.push(t);
    }
  }
  while (stack.length) output.push(stack.pop());
  return output;
}
`,
  },

  postfix: {
    python: `
import math

APPLY = {
    "+": lambda a, b: a + b,
    "-": lambda a, b: a - b,
    "*": lambda a, b: a * b,
    "/": lambda a, b: a / b,
    "%": math.fmod,  # sign of a, like C++ / Java / JS
    "^": math.pow,
}


def evaluate(tokens):
    """tokens like ["5", "1", "2", "+", "4", "*", "+", "3", "-"]."""
    stack = []
    for t in tokens:
        if t not in APPLY:            # t is a number
            stack.append(float(t))
        else:                         # t is an operator
            if len(stack) < 2:
                raise ValueError("missing operand for " + t)
            b = stack.pop()           # right operand (pushed last)
            a = stack.pop()           # left operand
            stack.append(APPLY[t](a, b))
    result = stack.pop()
    if stack:
        raise ValueError("too many operands")  # the stack must now be empty
    return result
`,
    cpp: `
#include <cmath>
#include <stack>
#include <stdexcept>
#include <string>
#include <vector>

double applyOp(double a, const std::string& op, double b) {
    if (op == "+") return a + b;
    if (op == "-") return a - b;
    if (op == "*") return a * b;
    if (op == "/") return a / b;
    if (op == "%") return std::fmod(a, b);  // sign of a
    return std::pow(a, b);                  // "^"
}

double evaluate(const std::vector<std::string>& tokens) {
    std::stack<double> stack;
    for (const std::string& t : tokens) {
        bool isOp = t == "+" || t == "-" || t == "*" || t == "/" || t == "%" || t == "^";
        if (!isOp) {                          // t is a number
            stack.push(std::stod(t));
        } else {                              // t is an operator
            if (stack.size() < 2) throw std::invalid_argument("missing operand for " + t);
            double b = stack.top(); stack.pop();  // right operand (pushed last)
            double a = stack.top(); stack.pop();  // left operand
            stack.push(applyOp(a, t, b));
        }
    }
    double result = stack.top();
    stack.pop();
    if (!stack.empty()) throw std::invalid_argument("too many operands");  // must be empty now
    return result;
}
`,
    java: `
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Set;

class PostfixEval {
    static final Set<String> OPS = Set.of("+", "-", "*", "/", "%", "^");

    static double applyOp(double a, String op, double b) {
        switch (op) {
            case "+": return a + b;
            case "-": return a - b;
            case "*": return a * b;
            case "/": return a / b;
            case "%": return a % b;          // sign of a
            default:  return Math.pow(a, b); // "^"
        }
    }

    static double evaluate(List<String> tokens) {
        Deque<Double> stack = new ArrayDeque<>();
        for (String t : tokens) {
            if (!OPS.contains(t)) {              // t is a number
                stack.push(Double.parseDouble(t));
            } else {                             // t is an operator
                if (stack.size() < 2) throw new IllegalArgumentException("missing operand for " + t);
                double b = stack.pop();          // right operand (pushed last)
                double a = stack.pop();          // left operand
                stack.push(applyOp(a, t, b));
            }
        }
        double result = stack.pop();
        if (!stack.isEmpty()) throw new IllegalArgumentException("too many operands");  // must be empty now
        return result;
    }
}
`,
    javascript: `
const OPS = new Set(["+", "-", "*", "/", "%", "^"]);

function applyOp(a, op, b) {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return a / b;
    case "%": return a % b; // sign of a
    default: return a ** b; // "^"
  }
}

function evaluate(tokens) {
  const stack = [];
  for (const t of tokens) {
    if (!OPS.has(t)) {
      stack.push(Number(t)); // t is a number
    } else {
      // t is an operator
      if (stack.length < 2) throw new Error("missing operand for " + t);
      const b = stack.pop(); // right operand (pushed last)
      const a = stack.pop(); // left operand
      stack.push(applyOp(a, t, b));
    }
  }
  const result = stack.pop();
  if (stack.length) throw new Error("too many operands"); // the stack must now be empty
  return result;
}
`,
  },

  nge: {
    python: `
def next_greater(A):
    n = len(A)
    result = [-1] * n
    stack = []  # indices; their values decrease from bottom to top
    for i in range(n):
        while stack and A[stack[-1]] < A[i]:
            result[stack.pop()] = A[i]  # first larger value to the right
        stack.append(i)
    return result  # indices left on the stack keep -1
`,
    cpp: `
#include <stack>
#include <vector>

std::vector<int> nextGreater(const std::vector<int>& A) {
    int n = static_cast<int>(A.size());
    std::vector<int> result(n, -1);
    std::stack<int> stack;  // indices; their values decrease from bottom to top
    for (int i = 0; i < n; i++) {
        while (!stack.empty() && A[stack.top()] < A[i]) {
            result[stack.top()] = A[i];  // first larger value to the right
            stack.pop();
        }
        stack.push(i);
    }
    return result;  // indices left on the stack keep -1
}
`,
    java: `
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Deque;

class NextGreater {
    static int[] nextGreater(int[] A) {
        int n = A.length;
        int[] result = new int[n];
        Arrays.fill(result, -1);
        Deque<Integer> stack = new ArrayDeque<>();  // indices; values decrease bottom to top
        for (int i = 0; i < n; i++) {
            while (!stack.isEmpty() && A[stack.peek()] < A[i])
                result[stack.pop()] = A[i];  // first larger value to the right
            stack.push(i);
        }
        return result;  // indices left on the stack keep -1
    }
}
`,
    javascript: `
function nextGreater(A) {
  const n = A.length;
  const result = new Array(n).fill(-1);
  const stack = []; // indices; their values decrease from bottom to top
  for (let i = 0; i < n; i++) {
    while (stack.length && A[stack[stack.length - 1]] < A[i]) {
      result[stack.pop()] = A[i]; // first larger value to the right
    }
    stack.push(i);
  }
  return result; // indices left on the stack keep -1
}
`,
  },
};
