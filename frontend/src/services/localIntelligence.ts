export type LocalMetric = {
  label: string;
  value: string;
  tone: string;
};



export function getLocalMetrics(code: string): LocalMetric[] {
  const lines = code.split('\n');
  const nonEmpty = lines.filter((line) => line.trim()).length;
  const loops = (code.match(/\b(for|while)\b/g) || []).length;
  const branches = (code.match(/\b(if|elif|else if|switch|case|catch)\b/g) || []).length;
  const functions = (code.match(/\b(def|function|void|int|public|private|protected|static)\b/g) || []).length;
  const comments = lines.filter((line) => /^(\s*#|\s*\/\/|\s*\/\*|\s*\*)/.test(line)).length;
  const complexity = Math.max(1, loops + branches + 1);
  const commentRatio = nonEmpty ? Math.round((comments / nonEmpty) * 100) : 0;

  return [
    { label: 'Lines', value: String(nonEmpty), tone: 'text-cyan-300' },
    { label: 'Flow Paths', value: String(complexity), tone: complexity > 8 ? 'text-amber-300' : 'text-emerald-300' },
    { label: 'Loops', value: String(loops), tone: loops > 3 ? 'text-amber-300' : 'text-indigo-300' },
    { label: 'Structure', value: String(functions), tone: functions === 0 && nonEmpty > 12 ? 'text-amber-300' : 'text-emerald-300' },
    { label: 'Comments', value: `${commentRatio}%`, tone: commentRatio < 5 && nonEmpty > 15 ? 'text-amber-300' : 'text-slate-300' },
  ];
}

export type ComplexityResult = {
  timeComplexity: string;
  spaceComplexity: string;
  explanation: string;
};

export function estimateComplexity(code: string, language: string): ComplexityResult {
  if (!code || !code.trim()) {
    return {
      timeComplexity: 'O(1)',
      spaceComplexity: 'O(1)',
      explanation: 'No code to analyze. Complexity is constant.'
    };
  }

  const normalized = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*|#.*/g, ''); // strip comments
  
  // Heuristic detections
  const hasRecursion = (
    /(\w+)\s*\(.*?\)\s*\{[\s\S]*?\b\1\s*\(/.test(normalized) || // JS/C/C++/Java self call
    /def\s+(\w+)\s*\(.*?\):[\s\S]*?\b\1\s*\(/.test(normalized) || // Python self call
    /recursion/i.test(code)
  );

  const hasBinarySearch = /binary[-_\s]?search/i.test(code) || /(low|lo)\s*<=\s*(high|hi)/i.test(normalized) || /(mid\s*=\s*|divided)/i.test(normalized);
  const hasDivideConquer = hasBinarySearch || /divide/i.test(code) || /merge[-_\s]?sort/i.test(code) || /quick[-_\s]?sort/i.test(code);
  const hasExponentialPattern = /fib(onacci)?/i.test(code) || /backtrack/i.test(code) || /permute/i.test(code) || /subsets/i.test(code) || /n\s*-\s*1.*n\s*-\s*2/i.test(normalized);

  // Count loops and nesting
  const lines = code.split('\n');
  let maxLoopNesting = 0;
  
  // Indentation-based nesting for Python, bracket-based for others
  if (language === 'python') {
    let loopIndents: number[] = [];
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      const indent = line.length - line.trimStart().length;
      // remove loop indents that are no longer active
      loopIndents = loopIndents.filter(li => li < indent);
      
      if (/^\s*\b(for|while)\b/.test(line)) {
        loopIndents.push(indent);
        maxLoopNesting = Math.max(maxLoopNesting, loopIndents.length);
      }
    });
  } else {
    // Brackets-based loop nesting estimation
    const bracketStack: { isLoop: boolean }[] = [];
    lines.forEach(line => {
      const hasLoop = /\b(for|while)\b/.test(line);
      for (const char of line) {
        if (char === '{') {
          bracketStack.push({ isLoop: hasLoop });
        } else if (char === '}') {
          bracketStack.pop();
        }
      }
      // calculate nested loop depth in current stack
      const currentLoopDepth = bracketStack.filter(b => b.isLoop).length;
      maxLoopNesting = Math.max(maxLoopNesting, currentLoopDepth);
    });
    
    // Fallback simple regex counting if bracket structures aren't matched well
    if (maxLoopNesting === 0) {
      const loopCount = (normalized.match(/\b(for|while)\b/g) || []).length;
      if (loopCount > 0) {
        maxLoopNesting = Math.min(loopCount, 2); // default estimation
      }
    }
  }

  // Time Complexity heuristic
  let timeComplexity = 'O(1)';
  let timeExplanation = 'The code runs in constant time as it contains no loop iterations or recursive calls.';
  
  if (hasRecursion) {
    if (hasExponentialPattern) {
      timeComplexity = 'O(2^N)';
      timeExplanation = 'Detected branching recursion (e.g. Fibonacci, backtracking) which leads to exponential time complexity.';
    } else if (hasDivideConquer) {
      timeComplexity = 'O(log N)';
      timeExplanation = 'Detected divide-and-conquer recursion structure, typical of logarithmic time complexity.';
    } else {
      timeComplexity = 'O(N)';
      timeExplanation = 'Detected linear recursion structure running in linear time relative to call depth.';
    }
  } else if (maxLoopNesting > 0) {
    if (maxLoopNesting === 1) {
      if (hasDivideConquer) {
        timeComplexity = 'O(log N)';
        timeExplanation = 'Detected single loop implementing a binary search / divide-and-conquer traversal.';
      } else {
        timeComplexity = 'O(N)';
        timeExplanation = 'Detected a single loop structure iterating linearly over input size N.';
      }
    } else if (maxLoopNesting === 2) {
      if (hasDivideConquer) {
        timeComplexity = 'O(N log N)';
        timeExplanation = 'Detected nested loops with divide-and-conquer partitioning (e.g. sorting algorithms).';
      } else {
        timeComplexity = 'O(N^2)';
        timeExplanation = 'Detected nested loops of depth 2, typical of quadratic complexity algorithms.';
      }
    } else {
      timeComplexity = `O(N^${maxLoopNesting})`;
      timeExplanation = `Detected deep nested loops of depth ${maxLoopNesting}, yielding polynomial time complexity.`;
    }
  }

  // Space Complexity heuristic
  let spaceComplexity = 'O(1)';
  let spaceExplanation = 'The code executes with constant auxiliary space, utilizing only scalar variables.';

  // Check storage patterns
  const hasDynamicStorage = (
    /append\s*\(|push\(_|push_back\s*\(|insert\s*\(|add\s*\(|\[\s*\]|\{\s*\}/i.test(normalized) ||
    /vector|list|deque|map|set|dict|collection/i.test(normalized) ||
    /\w+\[\w+\]\s*=/i.test(normalized)
  );
  
  const has2DArray = (
    /\[\s*\[.*?\]\s*\]/i.test(normalized) || // Python list of lists
    /new\s+\w+\[\w+\]\[\w+\]/i.test(normalized) || // Java/C++ 2D array
    /\[\w+\]\[\w+\]/i.test(normalized) // C-style 2D array
  );

  if (hasRecursion) {
    if (hasDivideConquer) {
      spaceComplexity = 'O(log N)';
      spaceExplanation = 'Space is bounded by the O(log N) depth of the recursive call stack.';
    } else {
      spaceComplexity = 'O(N)';
      spaceExplanation = 'Space complexity is O(N) due to the depth of the recursive call stack.';
    }
  } else if (hasDynamicStorage) {
    if (has2DArray || (maxLoopNesting >= 2 && /matrix|grid|table/i.test(normalized))) {
      spaceComplexity = 'O(N^2)';
      spaceExplanation = 'Detected dynamic allocation of a two-dimensional grid or matrix structure.';
    } else {
      spaceComplexity = 'O(N)';
      spaceExplanation = 'Detected linear dynamic container scaling (e.g., list, array, or vector allocation).';
    }
  }

  return {
    timeComplexity,
    spaceComplexity,
    explanation: `${timeExplanation} ${spaceExplanation}`
  };
}
