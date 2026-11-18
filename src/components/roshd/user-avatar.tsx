/**
 * آواتار کاربر — عکس آپلودشده؛ اگر عکسی نباشد، حرف اول نام نمایش داده می‌شود.
 * اندازه/قاب را کلاس والد تعیین می‌کند (avatar-circle، lb-avatar، parent-avatar…)
 */
export default function UserAvatar({
  src,
  name,
  className,
}: {
  src?: string;
  name?: string;
  className?: string;
}) {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  const initials = words
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  return (
    <span className={"user-avatar" + (className ? " " + className : "")}>
      {src ? (
        <img src={src} alt="" loading="lazy" />
      ) : (
        <span className="user-avatar-initials">{initials || "؟"}</span>
      )}
    </span>
  );
}
