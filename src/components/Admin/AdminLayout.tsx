import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Building2, Users, FileSearch } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { useSubmissions } from '@/hooks/use-submissions';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const { t } = useTranslation();
  const { data: pendingSubmissions = [] } = useSubmissions('pending');

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: t('admin.dashboard') },
    { 
      path: '/admin/submissions', 
      icon: FileText, 
      label: t('admin.submissions'),
      badge: pendingSubmissions.length > 0 ? pendingSubmissions.length : undefined,
    },
    { path: '/admin/mosques', icon: Building2, label: t('admin.mosques') },
    { path: '/admin/users', icon: Users, label: t('admin.users') },
    { path: '/admin/audit', icon: FileSearch, label: t('admin.audit_log') },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card p-6">
        <h2 className="font-display text-xl font-bold mb-6">{t('admin.panel')}</h2>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-primary/20 text-xs">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
};

