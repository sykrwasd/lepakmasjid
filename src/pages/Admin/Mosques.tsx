import { useState } from 'react';
import { AdminLayout } from '@/components/Admin/AdminLayout';
import { AuthGuard } from '@/components/Auth/AuthGuard';
import { useMosquesAdmin, useUpdateMosque } from '@/hooks/use-mosques';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import type { Mosque } from '@/types';

const Mosques = () => {
  const { t } = useTranslation();
  const { data: mosques = [], isLoading } = useMosquesAdmin();
  const updateMosque = useUpdateMosque();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMosque, setSelectedMosque] = useState<Mosque | null>(null);
  const [editData, setEditData] = useState<Partial<Mosque>>({});

  const handleEditClick = (mosque: Mosque) => {
    setSelectedMosque(mosque);
    setEditData({
      name: mosque.name,
      name_bm: mosque.name_bm,
      address: mosque.address,
      state: mosque.state,
      description: mosque.description,
      description_bm: mosque.description_bm,
      status: mosque.status,
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedMosque) return;
    
    try {
      await updateMosque.mutateAsync({
        id: selectedMosque.id,
        data: editData,
      });
      toast.success(t('admin.mosque_updated') || 'Mosque updated successfully');
      setEditDialogOpen(false);
      setSelectedMosque(null);
      setEditData({});
    } catch (error) {
      toast.error(t('admin.update_failed') || 'Failed to update mosque');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <AuthGuard requireAdmin>
      <AdminLayout>
        <div>
          <h1 className="font-display text-3xl font-bold mb-8">{t('admin.mosques')}</h1>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {mosques.map((mosque) => (
                <Card key={mosque.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle>
                        <Link to={`/mosque/${mosque.id}`} className="hover:underline">
                          {mosque.name}
                        </Link>
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(mosque.status || 'pending')}>
                          {mosque.status || 'pending'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(mosque)}
                          disabled={updateMosque.isPending}
                        >
                          {t('admin.edit') || 'Edit'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{mosque.address}</p>
                    {mosque.state && (
                      <p className="text-sm text-muted-foreground mt-1">{mosque.state}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t('admin.edit_mosque') || 'Edit Mosque'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('mosque.name')} (EN)</Label>
                <Input
                  id="name"
                  value={editData.name || ''}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name_bm">{t('mosque.name')} (BM)</Label>
                <Input
                  id="name_bm"
                  value={editData.name_bm || ''}
                  onChange={(e) => setEditData({ ...editData, name_bm: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">{t('mosque.address')}</Label>
                <Input
                  id="address"
                  value={editData.address || ''}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">{t('mosque.state')}</Label>
                <Input
                  id="state"
                  value={editData.state || ''}
                  onChange={(e) => setEditData({ ...editData, state: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t('mosque.description')} (EN)</Label>
                <Textarea
                  id="description"
                  value={editData.description || ''}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description_bm">{t('mosque.description')} (BM)</Label>
                <Textarea
                  id="description_bm"
                  value={editData.description_bm || ''}
                  onChange={(e) => setEditData({ ...editData, description_bm: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">{t('admin.status') || 'Status'}</Label>
                <Select
                  value={editData.status || 'pending'}
                  onValueChange={(value) => setEditData({ ...editData, status: value as 'pending' | 'approved' | 'rejected' })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{t('admin.pending') || 'Pending'}</SelectItem>
                    <SelectItem value="approved">{t('admin.approved') || 'Approved'}</SelectItem>
                    <SelectItem value="rejected">{t('admin.rejected') || 'Rejected'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={updateMosque.isPending}>
                {t('common.save') || 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </AuthGuard>
  );
};

export default Mosques;

