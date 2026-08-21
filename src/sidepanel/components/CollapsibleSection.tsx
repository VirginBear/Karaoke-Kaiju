import { ChevronDown, ChevronRight } from 'lucide-react';
import { type ReactNode, useState } from 'react';

interface CollapsibleSectionProps {
  id: string;
  title: string;
  icon: ReactNode;
  badge?: string | ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  icon,
  badge,
  defaultOpen = false,
  isOpen: controlledOpen,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const handleToggle = () => {
    const next = !isOpen;
    if (controlledOpen === undefined) {
      setInternalOpen(next);
    }
    onToggle?.(next);
  };

  return (
    <div className={`collapsible-section${isOpen ? ' is-open' : ' is-collapsed'}`}>
      <button
        type="button"
        className="collapsible-header"
        onClick={handleToggle}
        aria-expanded={isOpen}
      >
        <div className="collapsible-title-group">
          <span className="collapsible-icon">{icon}</span>
          <span className="collapsible-title">{title}</span>
        </div>
        <div className="collapsible-meta-group">
          {badge ? <span className="collapsible-badge">{badge}</span> : null}
          <span className="collapsible-chevron">
            {isOpen ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
          </span>
        </div>
      </button>
      {isOpen ? <div className="collapsible-content">{children}</div> : null}
    </div>
  );
}
