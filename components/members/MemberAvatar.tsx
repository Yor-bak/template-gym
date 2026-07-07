import { cn, getInitials } from '@/lib/utils';

const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500', 'bg-indigo-500'];

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
    <div className={cn('rounded-full flex items-center justify-center text-white font-semibold shrink-0', sizes[size], color, className)}>
      {initials}
    </div>
  );
}
