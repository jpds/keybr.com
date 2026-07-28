import { recoverResults, type Result, useResults } from "@keybr/result";
import { resultFromDownloadJson } from "@keybr/result-io";
import {
  Alert,
  Button,
  ErrorAlert,
  Field,
  FieldList,
  Icon,
  toast,
} from "@keybr/widget";
import { mdiDeleteForever, mdiDownload, mdiUpload } from "@mdi/js";
import { useRef } from "react";
import { useIntl } from "react-intl";

const maxUploadSize = 64 * 1024 * 1024;

function resultKey(result: Result): string {
  return [
    result.timeStamp,
    result.layout.id,
    result.textType.id,
    result.length,
    result.time,
    result.errors,
  ].join("|");
}

export function FooterSection() {
  const { formatMessage } = useIntl();
  const importRef = useRef<HTMLInputElement>(null);
  const { handleDownloadData, handleUploadData, handleResetData } =
    useCommands();

  return (
    <FieldList>
      <Field>
        <Button
          size={16}
          icon={<Icon shape={mdiDownload} />}
          label={formatMessage({
            id: "t_Download_data",
            defaultMessage: "Download data",
          })}
          title={formatMessage({
            id: "profile.download.description",
            defaultMessage: "Download all your typing data in JSON format.",
          })}
          onClick={() => {
            handleDownloadData();
          }}
        />
      </Field>
      <Field>
        <input
          ref={importRef}
          type="file"
          accept="application/json"
          hidden={true}
          style={{ inlineSize: 0, blockSize: 0, overflow: "hidden" }}
          onChange={() => {
            const el = importRef.current!;
            const file = el.files?.[0] ?? null;
            if (file != null) {
              handleUploadData(file).finally(() => {
                el.value = "";
              });
            }
          }}
        />
        <Button
          size={16}
          icon={<Icon shape={mdiUpload} />}
          label={formatMessage({
            id: "t_Upload_data",
            defaultMessage: "Upload data",
          })}
          title={formatMessage({
            id: "profile.upload.description",
            defaultMessage:
              "Import typing data from a previously downloaded JSON file.",
          })}
          onClick={() => {
            importRef.current!.click();
          }}
        />
      </Field>
      <Field.Filler />
      <Field>
        <Button
          size={16}
          icon={<Icon shape={mdiDeleteForever} />}
          label={formatMessage({
            id: "t_Reset_statistics",
            defaultMessage: "Reset statistics",
          })}
          title={formatMessage({
            id: "profile.reset.description",
            defaultMessage:
              "Permanently delete all of your typing data and reset statistics.",
          })}
          onClick={() => {
            handleResetData();
          }}
        />
      </Field>
    </FieldList>
  );
}

function useCommands() {
  const { formatMessage } = useIntl();
  const { results, appendResults, clearResults } = useResults();
  return {
    handleDownloadData: () => {
      const json = JSON.stringify(results);
      const blob = new Blob([json], { type: "application/json" });
      download(blob, "typing-data.json");
    },
    handleUploadData: async (file: File) => {
      if (file.size > maxUploadSize) {
        ErrorAlert.report(
          formatMessage({
            id: "profile.upload.error.tooLarge",
            defaultMessage: "This file is too large to import.",
          }),
        );
        return;
      }
      let json: unknown;
      try {
        json = JSON.parse(await file.text());
      } catch {
        json = null;
      }
      if (!Array.isArray(json)) {
        ErrorAlert.report(
          formatMessage({
            id: "profile.upload.error.invalidFile",
            defaultMessage: "This file is not a valid typing data export.",
          }),
        );
        return;
      }
      const parsed = json
        .map((item) => resultFromDownloadJson(item))
        .filter((result): result is Result => result != null);
      const existingKeys = new Set(results.map(resultKey));
      const newResults = parsed
        .filter((result) => !existingKeys.has(resultKey(result)))
        .sort((a, b) => a.timeStamp - b.timeStamp);
      const imported = recoverResults(newResults);
      const skippedInvalid = json.length - parsed.length;
      const skippedDuplicate = parsed.length - newResults.length;
      if (imported.length === 0) {
        ErrorAlert.report(
          formatMessage(
            {
              id: "profile.upload.error.nothingToImport",
              defaultMessage:
                "No new typing data was found in this file " +
                "(invalid entries: {skippedInvalid}, duplicates: {skippedDuplicate}).",
            },
            { skippedInvalid, skippedDuplicate },
          ),
        );
        return;
      }
      appendResults(imported);
      toast(
        <Alert severity="success">
          {formatMessage(
            {
              id: "profile.upload.success",
              defaultMessage:
                "Imported {imported} typing results " +
                "(invalid entries skipped: {skippedInvalid}, duplicates skipped: {skippedDuplicate}).",
            },
            {
              imported: imported.length,
              skippedInvalid,
              skippedDuplicate,
            },
          )}
        </Alert>,
      );
    },
    handleResetData: () => {
      const message = formatMessage({
        id: "profile.reset.message",
        defaultMessage:
          "Are you sure you want to delete all data and reset your profile? " +
          "This operation is permanent and cannot be undone!",
      });
      if (window.confirm(message)) {
        clearResults();
      }
    },
  };
}

function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.setAttribute("href", URL.createObjectURL(blob));
  a.setAttribute("download", name);
  a.setAttribute("hidden", "");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
