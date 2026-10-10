export default function QuestionScreen({
  title, subtitle, eyebrow, kicker, children,
}: { title: string; subtitle?: string; eyebrow?: string; kicker?: string; children: React.ReactNode }) {
  return (
    <div>
      {eyebrow && <p className="ca-eyebrow">{eyebrow}</p>}
      {kicker && <p className="ca-kicker">{kicker}</p>}
      <h1 className="ca-title" style={{ marginBottom: subtitle ? 8 : 20 }}>{title}</h1>
      {subtitle && <p className="ca-sub" style={{ marginBottom: 20 }}>{subtitle}</p>}
      {children}
    </div>
  );
}
