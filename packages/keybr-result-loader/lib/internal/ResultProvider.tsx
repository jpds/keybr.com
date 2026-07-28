import { type Result, ResultContext } from "@keybr/result";
import { type ReactNode, useState } from "react";
import { catchError } from "./debug.tsx";
import { type ResultStorage } from "./types.ts";

export function ResultProvider({
  storage,
  initialResults,
  children,
}: {
  readonly storage: ResultStorage;
  readonly initialResults: readonly Result[];
  readonly children: ReactNode;
}): ReactNode {
  const [results, setResults] = useState(() => byTimeStamp(initialResults));
  return (
    <ResultContext.Provider
      value={{
        results,
        appendResults: (newResults) => {
          setResults(byTimeStamp([...results, ...newResults]));
          storage.append(newResults).catch(catchError);
        },
        clearResults: () => {
          setResults([]);
          storage.clear().catch(catchError);
        },
      }}
    >
      {children}
    </ResultContext.Provider>
  );
}

// Per-key stats fold results in array order, so it must stay chronological.
function byTimeStamp(results: readonly Result[]): Result[] {
  return [...results].sort((a, b) => a.timeStamp - b.timeStamp);
}
