import { Layout } from "@keybr/keyboard";
import { isPlainObject, isString } from "@keybr/lang";
import { Result, TextType } from "@keybr/result";
import { Histogram } from "@keybr/textinput";
import { fixLegacyLayoutId, fixTextTypeId } from "./legacyjson.ts";

const MAX_UINT32 = 0xffffffff;

export type HistogramSampleJson = {
  readonly codePoint: number;
  readonly hitCount: number;
  readonly missCount: number;
  readonly timeToType: number;
};

export type ResultDownloadJson = {
  readonly layout: string;
  readonly textType: string;
  readonly timeStamp: string | number;
  readonly length: number;
  readonly time: number;
  readonly errors: number;
  // Derived from the other fields by the `Result` constructor, ignored here.
  readonly speed?: number;
  readonly histogram: readonly HistogramSampleJson[];
};

/**
 * Parses a `Result` as serialized by `Result.toJSON()`, i.e. an entry of the
 * "Download data" export (typing-data.json).
 */
export function resultFromDownloadJson(json: unknown): Result | null {
  if (!isPlainObject(json)) {
    return null;
  }
  const {
    layout: layoutId,
    textType: textTypeId,
    timeStamp,
    length,
    time,
    errors,
    histogram: histogramJson,
  } = json as ResultDownloadJson;
  if (
    !(
      isString(layoutId) &&
      isString(textTypeId) &&
      (isString(timeStamp) || Number.isFinite(timeStamp)) &&
      Number.isSafeInteger(length) &&
      length >= 0 &&
      length <= MAX_UINT32 &&
      Number.isSafeInteger(time) &&
      time >= 0 &&
      time <= MAX_UINT32 &&
      Number.isSafeInteger(errors) &&
      errors >= 0 &&
      errors <= length
    )
  ) {
    return null;
  }
  const ts = new Date(timeStamp).getTime();
  if (!(Number.isFinite(ts) && ts >= 0 && ts <= MAX_UINT32 * 1000)) {
    return null;
  }
  const histogram = histogramFromDownloadJson(histogramJson);
  if (histogram == null) {
    return null;
  }
  try {
    return new Result(
      Layout.ALL.get(fixLegacyLayoutId(layoutId)),
      TextType.ALL.get(fixTextTypeId(textTypeId)),
      ts,
      length,
      time,
      errors,
      histogram,
    );
  } catch {
    return null;
  }
}

export function histogramFromDownloadJson(json: unknown): Histogram | null {
  if (!Array.isArray(json)) {
    return null;
  }
  const samples = [];
  for (const item of json) {
    if (!isPlainObject(item)) {
      return null;
    }
    const { codePoint, hitCount, missCount, timeToType } =
      item as HistogramSampleJson;
    if (
      !(
        Number.isSafeInteger(codePoint) &&
        codePoint > 0 &&
        codePoint <= 65535 &&
        Number.isSafeInteger(hitCount) &&
        hitCount >= 0 &&
        hitCount <= MAX_UINT32 &&
        Number.isSafeInteger(missCount) &&
        missCount >= 0 &&
        missCount <= hitCount &&
        Number.isFinite(timeToType) &&
        timeToType >= 0 &&
        timeToType <= MAX_UINT32
      )
    ) {
      return null;
    }
    samples.push({
      codePoint,
      hitCount,
      missCount,
      timeToType: Math.round(timeToType),
    });
  }
  return new Histogram(samples);
}
