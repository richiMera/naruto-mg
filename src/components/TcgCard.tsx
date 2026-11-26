import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { IconBox, IconCards } from '@tabler/icons-react';
import { isHolo, placeholderArt, rarityTier, TIER_COLOR } from '../lib/rarity';
import type { ItemKind } from '../lib/types';

type Props = {
  seed: string;
  kind: ItemKind;
  title: string;
  subtitle?: string;
  rarity?: string | null;
  image?: string | null;
  badge?: ReactNode;
  footer?: ReactNode;
  onClick?: () => void;
};

function tilt(e: MouseEvent<HTMLDivElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  el.style.setProperty('--rx', `${(0.5 - y) * 14}deg`);
  el.style.setProperty('--ry', `${(x - 0.5) * 16}deg`);
  el.style.setProperty('--gx', `${x * 100}%`);
}

function reset(e: MouseEvent<HTMLDivElement>) {
  const el = e.currentTarget;
  el.style.removeProperty('--rx');
  el.style.removeProperty('--ry');
  el.style.removeProperty('--gx');
}

export function TcgCard({ seed, kind, title, subtitle, rarity, image, badge, footer, onClick }: Props) {
  const tier = rarityTier(rarity, kind);
  const style = { '--r': TIER_COLOR[tier], '--art': placeholderArt(seed) } as CSSProperties;
  const Icon = kind === 'card' ? IconCards : IconBox;
  return (
    <div className="tcg" onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => onClick && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick())}>
      <div className={`tcg-card${isHolo(tier) ? ' holo' : ''}`} style={style} onMouseMove={tilt} onMouseLeave={reset}>
        {image ? (
          <img className="tcg-img" src={image} alt={title} loading="lazy" />
        ) : (
          <div className="tcg-art"><Icon size={42} stroke={1.3} /></div>
        )}
        {badge && <div className="tcg-badge">{badge}</div>}
        <div className="tcg-info">
          <div className="tcg-name">{title}</div>
          {subtitle && <div className="tcg-meta">{subtitle}</div>}
        </div>
      </div>
      {footer && <div className="tcg-footer">{footer}</div>}
    </div>
  );
}
