import { test } from "node:test";
import { ResultFaker } from "@keybr/result";
import { deepEqual, isFalse, isNull, isTrue } from "rich-assert";
import {
  histogramFromDownloadJson,
  resultFromDownloadJson,
} from "./downloadjson.ts";

test("deserialize valid JSON", () => {
  const faker = new ResultFaker();
  const result = faker.nextResult();

  const json = JSON.parse(JSON.stringify(result));

  const copy = resultFromDownloadJson(json);

  deepEqual(copy, result);
  deepEqual([...copy!.histogram], [...result.histogram]);
});

test("deserialize JSON with legacy layout and text type ids", () => {
  const faker = new ResultFaker();
  const result = faker.nextResult();

  const json = {
    ...JSON.parse(JSON.stringify(result)),
    layout: "us",
    textType: "guided",
  };

  const copy = resultFromDownloadJson(json);

  isTrue(copy != null);
  deepEqual(copy!.layout, result.layout);
  deepEqual(copy!.textType, result.textType);
});

test("ignore invalid result JSON", () => {
  const faker = new ResultFaker();
  const json = JSON.parse(JSON.stringify(faker.nextResult()));

  isNull(resultFromDownloadJson(undefined));
  isNull(resultFromDownloadJson(null));
  isNull(resultFromDownloadJson(""));
  isNull(resultFromDownloadJson(0));
  isNull(resultFromDownloadJson([]));
  isNull(resultFromDownloadJson({}));
  isNull(resultFromDownloadJson({ ...json, layout: "x" }));
  isNull(resultFromDownloadJson({ ...json, textType: "x" }));
  isNull(resultFromDownloadJson({ ...json, timeStamp: "not a date" }));
  isNull(resultFromDownloadJson({ ...json, timeStamp: "1969-01-01" }));
  isNull(resultFromDownloadJson({ ...json, length: 0.1 }));
  isNull(resultFromDownloadJson({ ...json, length: -1 }));
  isNull(resultFromDownloadJson({ ...json, time: 0.1 }));
  isNull(resultFromDownloadJson({ ...json, time: -1 }));
  isNull(resultFromDownloadJson({ ...json, errors: 0.1 }));
  isNull(resultFromDownloadJson({ ...json, errors: -1 }));
  isNull(resultFromDownloadJson({ ...json, errors: json.length + 1 }));
  isNull(resultFromDownloadJson({ ...json, histogram: null }));
});

test("ignore invalid histogram JSON", () => {
  const faker = new ResultFaker();
  const json = JSON.parse(JSON.stringify(faker.nextResult()));
  const sample = json.histogram[0];

  isNull(histogramFromDownloadJson(undefined));
  isNull(histogramFromDownloadJson(null));
  isNull(histogramFromDownloadJson(""));
  isNull(histogramFromDownloadJson(0));
  isNull(histogramFromDownloadJson([{}]));
  isNull(histogramFromDownloadJson([{ ...sample, codePoint: 0 }]));
  isNull(histogramFromDownloadJson([{ ...sample, codePoint: 65536 }]));
  isNull(histogramFromDownloadJson([{ ...sample, hitCount: 0.1 }]));
  isNull(histogramFromDownloadJson([{ ...sample, hitCount: -1 }]));
  isNull(histogramFromDownloadJson([{ ...sample, missCount: -1 }]));
  isNull(histogramFromDownloadJson([{ ...sample, hitCount: 1, missCount: 2 }]));
  isNull(histogramFromDownloadJson([{ ...sample, timeToType: NaN }]));
  isNull(histogramFromDownloadJson([{ ...sample, timeToType: -1 }]));

  isFalse(histogramFromDownloadJson([]) == null);
});
