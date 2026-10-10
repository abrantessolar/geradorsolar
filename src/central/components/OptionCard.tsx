import * as Icons from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { OptionDef } from '../types';

export default function OptionCard({ option, onSelect }: { option: OptionDef; onSelect: (option: OptionDef) => void }) {
  const IconComp = option.icon ? (Icons as unknown as Record<string, Icons.LucideIcon>)[option.icon] : null;

  return (
    <button
      onClick={() => onSelect(option)}
      className="w-full text-left flex items-center gap-4 p-4 sm:p-5 rounded-2xl border transition-all active:scale-[0.98] hover:shadow-md"
      style={{ borderColor: '#E3E8EF', background: '#FFFFFF' }}
    >
      {IconComp && (
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FFF4E0' }}>
          <IconComp className="w-5 h-5" style={{ color: '#F5A623' }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold leading-snug" style={{ color: '#1A2233' }}>{option.label}</p>
        {option.sublabel && <p className="text-sm mt-0.5" style={{ color: '#6B7585' }}>{option.sublabel}</p>}
      </div>
      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#8891A0' }} />
    </button>
  );
}
