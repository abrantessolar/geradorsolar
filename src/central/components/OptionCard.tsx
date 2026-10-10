import * as Icons from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { OptionDef } from '../types';

export default function OptionCard({ option, onSelect }: { option: OptionDef; onSelect: (option: OptionDef) => void }) {
  const IconComp = option.icon ? (Icons as unknown as Record<string, Icons.LucideIcon>)[option.icon] : null;

  return (
    <button onClick={() => onSelect(option)} className="ca-opt">
      {IconComp && (
        <span className="ca-ico">
          <IconComp className="w-5 h-5" />
        </span>
      )}
      <span className="ca-txt">
        <span className="ca-lbl">{option.label}</span>
        {option.sublabel && <span className="ca-hint">{option.sublabel}</span>}
      </span>
      <ChevronRight className="w-4 h-4 ca-chevron" />
    </button>
  );
}
