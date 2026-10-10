export default function QuestionScreen({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-extrabold mb-2 leading-snug" style={{ color: '#1A2233' }}>{title}</h1>
      {subtitle && <p className="text-sm mb-6" style={{ color: '#6B7585' }}>{subtitle}</p>}
      <div className={subtitle ? '' : 'mt-5'}>{children}</div>
    </div>
  );
}
