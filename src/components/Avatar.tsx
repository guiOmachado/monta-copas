import { hueFor, initials } from '../lib/ui';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  const hue = hueFor(name);
  return (
    <span
      className={['avatar', `avatar--${size}`, className].filter(Boolean).join(' ')}
      style={{ '--hue': hue } as React.CSSProperties}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
