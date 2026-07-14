import { cn, getInitials } from '@/lib/utils';

// Paleta fija por hash de nombre, hex literal en vez de utilidades bg-*-500:
// esas ya son parte de la escala semántica del sistema oscuro (verde-500 es
// el lima de "autorizado", por ejemplo) y no deben reutilizarse aquí. Son 7
// tonos desaturados pensados para leerse bien sobre #171512 (avatar) con
// iniciales claras encima — ver handoff verdefosfo/README.md §MemberAvatar.
const colors = ['#5b6b7a', '#8a7a4a', '#4a7a72', '#8a5a48', '#6b7a94', '#7a628a', '#6a7a4a'];

function getColor(name: string): string {
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

interface MemberAvatarProps {
  firstName: string;
  lastName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-xl' };

export function MemberAvatar({ firstName, lastName, size = 'md', className }: MemberAvatarProps) {
  const initials = getInitials(firstName, lastName);
  const color = getColor(firstName + lastName);
  return (
    <div
      className={cn('rounded-full flex items-center justify-center text-[#f3f1ea] font-semibold shrink-0', sizes[size], className)}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}
