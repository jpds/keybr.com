import { test } from "node:test";
import { ResultFaker, useResults } from "@keybr/result";
import { render, waitFor } from "@testing-library/react";
import { deepEqual } from "rich-assert";
import { ResultProvider } from "./ResultProvider.tsx";
import { type ResultStorage } from "./types.ts";

const faker = new ResultFaker();

function fakeStorage(): ResultStorage {
  return {
    async load() {
      return [];
    },
    async append() {},
    async clear() {},
  };
}

test("keeps results sorted by time stamp across out-of-order appends", async () => {
  const older = faker.nextResult({ timeStamp: 1000 });
  const newer = faker.nextResult({ timeStamp: 2000 });
  let onAppend: (results: readonly (typeof older)[]) => void = () => {};

  function TestClient() {
    const { results, appendResults } = useResults();
    onAppend = appendResults;
    return (
      <span title="order">
        {results.map((result) => result.timeStamp).join(",")}
      </span>
    );
  }

  const r = render(
    <ResultProvider storage={fakeStorage()} initialResults={[newer, older]}>
      <TestClient />
    </ResultProvider>,
  );

  await waitFor(() => r.getByTitle("order"));

  // The initial (unsorted) results are sorted immediately.
  deepEqual(r.getByTitle("order").textContent, "1000,2000");

  // Appending an even older result out of order re-sorts the whole set.
  const oldest = faker.nextResult({ timeStamp: 500 });
  onAppend([oldest]);
  await waitFor(() => r.getByTitle("order"));

  deepEqual(r.getByTitle("order").textContent, "500,1000,2000");

  r.unmount();
});
