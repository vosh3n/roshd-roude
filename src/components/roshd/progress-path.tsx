"use client";

import { Check, Clock, RotateCcw } from "lucide-react";
import { MISSION_STATUS_TEXT, MissionStatus } from "@/store/roshd";
import { MISSION_KIND_TEXT, MissionKind } from "@/lib/missions-data";

export interface PathItem {
  key: string;
  label: string;
  title: string;
  status: MissionStatus | "none";
  kind: MissionKind;
}

/**
 * مسیر تصویری ماموریت‌های امروز — چهار ایستگاه که وضعیت هر ماموریت را
 * با رنگ و نشانه نشان می‌دهد (به‌جای فقط درصد).
 */
export default function ProgressPath({
  items,
  onOpen,
}: {
  items: PathItem[];
  onOpen: (key: string) => void;
}) {
  const approved = items.filter((i) => i.status === "approved").length;

  return (
    <div className="progress-path" aria-label="مسیر ماموریت‌های امروز">
      <div className="path-rail" aria-hidden="true" />
      <div className="path-steps">
        {items.map((it, i) => {
          const state = it.status;
          return (
            <button
              key={it.key}
              type="button"
              className={"path-step " + state}
              onClick={() => onOpen(it.key)}
              aria-label={`ماموریت ${i + 1}: ${it.title} — ${MISSION_STATUS_TEXT[state]}`}
            >
              <span className="path-node">
                {state === "approved" ? (
                  <Check size={18} />
                ) : state === "pending" ? (
                  <Clock size={17} />
                ) : state === "revision" ? (
                  <RotateCcw size={16} />
                ) : (
                  <span className="path-num">{i + 1}</span>
                )}
              </span>
              <span className="path-label">
                <b>{MISSION_KIND_TEXT[it.kind]}</b>
                <small>{MISSION_STATUS_TEXT[state]}</small>
              </span>
            </button>
          );
        })}
      </div>
      <div className="path-caption">
        {approved === items.length && items.length > 0
          ? "همهٔ ایستگاه‌های امروز تایید شد — عالی بود!"
          : `${approved} از ${items.length} ایستگاه تایید شده`}
      </div>
    </div>
  );
}
