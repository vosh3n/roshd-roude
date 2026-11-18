"use client";

import { useEffect, useState } from "react";
import { useRoshd, api } from "@/store/roshd";
import { toFa } from "@/lib/jalali";
import { ClipboardCheck, Rocket, Trophy } from "lucide-react";
import UserAvatar from "./user-avatar";

type Row = {
  username: string;
  name: string;
  avatar: string;
  field: string;
  level: string;
  missions: number;
  submissions: number;
  score: number;
  rank: number;
};

/**
 * رتبه‌بندی — امتیاز هر دانش‌آموز از جمع ماموریت‌ها و تکالیف ارسالی
 * هدف: انگیزه گرفتن دانش‌آموزی که عقب‌تر است (فاصله تا نفر بالاتر را می‌بیند)
 */
export default function RankingScreen() {
  const serverUser = useRoshd((s) => s.serverUser);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [points, setPoints] = useState({ mission: 10, submission: 30 });
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api("/api/ranking")
      .then((d) => {
        if (!alive) return;
        setRows(d.rows || []);
        if (d.points) setPoints(d.points);
      })
      .catch((e) => {
        if (alive) setError(e.message || "خواندن رتبه‌ها ممکن نشد.");
      });
    return () => {
      alive = false;
    };
  }, []);

  const list = rows || [];
  const myIndex = list.findIndex((r) => r.username === serverUser?.username);
  const me = myIndex >= 0 ? list[myIndex] : null;
  const above = myIndex > 0 ? list[myIndex - 1] : null;
  const gap = me && above ? Math.max(0, above.score - me.score) : 0;
  const leadGap = gap > 0
    ? `${toFa(gap)} امتیاز با نفر بالاتری فاصله داری؛ یعنی حدود ${toFa(
        Math.max(1, Math.ceil(gap / points.submission))
      )} تکلیف یا ${toFa(Math.max(1, Math.ceil(gap / points.mission)))} ماموریت.`
    : "هم‌امتیاز با نفر بالاتری؛ یک ماموریت یا تکلیف کافی است تا از او جلو بزنی.";

  return (
    <div className="rank-wrap">
      <div className="card hero rank-hero">
        <h1>رتبه‌بندی</h1>
        <p>
          هر ماموریت {toFa(points.mission)} امتیاز و هر تکلیف ارسالی{" "}
          {toFa(points.submission)} امتیاز دارد. ماموریت‌ها و تکالیف با هم جمع
          می‌شوند تا تلاش روزانه دیده شود.
        </p>
      </div>

      {error ? <p className="note">{error}</p> : null}

      {!error && rows === null ? (
        <p className="note">در حال خواندن رتبه‌ها…</p>
      ) : null}

      {me ? (
        <div className="card rank-gap-card">
          <span className="rank-gap-icon" aria-hidden="true">
            {myIndex > 0 ? <Rocket size={20} /> : <Trophy size={20} />}
          </span>
          <div>
            <b>
              تو نفر {toFa(me.rank)} از {toFa(list.length)} هستی.
            </b>
            <p>{myIndex === 0 ? "بالای جدولی! همین روند را نگه دار." : leadGap}</p>
          </div>
        </div>
      ) : null}

      {rows !== null && list.length === 0 ? (
        <p className="note">
          هنوز هیچ دانش‌آموزی ماموریت یا تکلیفی ثبت نکرده است.
        </p>
      ) : null}

      {list.length > 0 ? (
        <div className="card rank-list">
          {list.map((r) => {
            const isMe = r.username === serverUser?.username;
            return (
              <div
                key={r.username}
                className={
                  "rank-row" +
                  (r.rank <= 3 ? " top" : "") +
                  (isMe ? " me" : "")
                }
              >
                <span className={`rank-num n${Math.min(r.rank, 4)}`}>
                  {toFa(r.rank)}
                </span>
                <span className="rank-ava">
                  <UserAvatar src={r.avatar} name={r.name} />
                </span>
                <span className="rank-who">
                  <b>
                    {r.name}
                    {isMe ? <span className="rank-me-tag">تو</span> : null}
                  </b>
                  <small>
                    <ClipboardCheck size={13} aria-hidden="true" />{" "}
                    {toFa(r.missions)} ماموریت · {toFa(r.submissions)} تکلیف
                  </small>
                </span>
                <span className="rank-score">
                  <b>{toFa(r.score)}</b>
                  <small>امتیاز</small>
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      <p className="admin-note">
        رتبه‌ها با هر ماموریت و تکلیف تازه به‌روز می‌شوند.
      </p>
    </div>
  );
}
