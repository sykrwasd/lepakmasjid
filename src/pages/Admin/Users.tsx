import { AdminLayout } from '@/components/Admin/AdminLayout';
import { AuthGuard } from '@/components/Auth/AuthGuard';
import { useUsers, useBanUser, useUnbanUser, useUpdateUser } from '@/hooks/use-users';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const Users = () => {
  const { t } = useTranslation();
  const { data: users = [], isLoading } = useUsers();
  const banUser = useBanUser();
  const unbanUser = useUnbanUser();
  const updateUser = useUpdateUser();

  const handleBan = async (id: string) => {
    try {
      await banUser.mutateAsync(id);
      toast.success(t('admin.user_banned'));
    } catch (error) {
      toast.error(t('admin.ban_failed'));
    }
  };

  const handleUnban = async (id: string) => {
    try {
      await unbanUser.mutateAsync(id);
      toast.success(t('admin.user_unbanned'));
    } catch (error) {
      toast.error(t('admin.unban_failed'));
    }
  };

  const handleVerifiedToggle = async (id: string, currentVerified: boolean) => {
    try {
      await updateUser.mutateAsync({ id, data: { verified: !currentVerified } });
      toast.success(
        !currentVerified 
          ? t('admin.user_verified') || 'User verified'
          : t('admin.user_unverified') || 'User unverified'
      );
    } catch (error) {
      toast.error(t('admin.update_failed') || 'Failed to update user');
    }
  };

  return (
    <AuthGuard requireAdmin>
      <AdminLayout>
        <div>
          <h1 className="font-display text-3xl font-bold mb-8">{t('admin.users')}</h1>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <Card key={user.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{user.name || user.email}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={user.verified ? 'default' : 'destructive'}>
                          {user.verified ? t('admin.active') : t('admin.banned')}
                        </Badge>
                        <Badge variant="secondary">{t('admin.trust')}: {user.trust_score}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{user.email}</p>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`verified-${user.id}`} className="text-sm font-medium">
                          {t('admin.verified') || 'Verified'}
                        </Label>
                        <Switch
                          id={`verified-${user.id}`}
                          checked={user.verified}
                          onCheckedChange={() => handleVerifiedToggle(user.id, user.verified)}
                          disabled={updateUser.isPending}
                        />
                      </div>
                      <div className="flex gap-2">
                        {user.verified ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleBan(user.id)}
                            disabled={banUser.isPending}
                          >
                            {t('admin.ban')}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleUnban(user.id)}
                            disabled={unbanUser.isPending}
                          >
                            {t('admin.unban')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </AdminLayout>
    </AuthGuard>
  );
};

export default Users;

