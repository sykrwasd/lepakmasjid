import { useState } from 'react';
import { AdminLayout } from '@/components/Admin/AdminLayout';
import { AuthGuard } from '@/components/Auth/AuthGuard';
import { useSubmissions, useApproveSubmission, useRejectSubmission } from '@/hooks/use-submissions';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/use-translation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const Submissions = () => {
  const { t } = useTranslation();
  const { data: submissions = [], isLoading } = useSubmissions('pending');
  const { user } = useAuthStore();
  const approveSubmission = useApproveSubmission();
  const rejectSubmission = useRejectSubmission();
  
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    if (!user) return;
    try {
      await approveSubmission.mutateAsync({ id, reviewedBy: user.id });
      toast.success(t('admin.submission_approved'));
    } catch (error) {
      toast.error(t('admin.approve_failed'));
    }
  };

  const handleRejectClick = (id: string) => {
    setSelectedSubmissionId(id);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!user || !selectedSubmissionId || !rejectReason.trim()) return;
    
    // Sanitize input - limit length and trim
    const sanitizedReason = rejectReason.trim().slice(0, 500);
    
    try {
      await rejectSubmission.mutateAsync({ 
        id: selectedSubmissionId, 
        reviewedBy: user.id, 
        reason: sanitizedReason 
      });
      toast.success(t('admin.submission_rejected'));
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedSubmissionId(null);
    } catch (error) {
      toast.error(t('admin.reject_failed'));
    }
  };

  return (
    <AuthGuard requireAdmin>
      <AdminLayout>
        <div>
          <h1 className="font-display text-3xl font-bold mb-8">{t('admin.submissions')}</h1>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : submissions.length === 0 ? (
            <p className="text-muted-foreground">{t('admin.no_pending_submissions')}</p>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <Card key={submission.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>
                        {submission.type === 'new_mosque' ? t('admin.new_mosque') : t('admin.edit_proposal')}
                      </CardTitle>
                      <Badge variant="secondary">{submission.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <p><strong>{t('mosque.name')}:</strong> {(submission.data as any).name}</p>
                      <p><strong>{t('mosque.address')}:</strong> {(submission.data as any).address}</p>
                      <p><strong>{t('mosque.state')}:</strong> {(submission.data as any).state}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprove(submission.id)}
                        disabled={approveSubmission.isPending}
                      >
                        {t('admin.approve')}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleRejectClick(submission.id)}
                        disabled={rejectSubmission.isPending}
                      >
                        {t('admin.reject')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.rejection_reason')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">
                {t('admin.rejection_reason')}
              </Label>
              <Textarea
                id="rejection-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('admin.rejection_reason_placeholder') || 'Please provide a reason for rejection...'}
                maxLength={500}
                rows={4}
              />
              <p className="text-sm text-muted-foreground">
                {rejectReason.length}/500
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setRejectDialogOpen(false);
                setRejectReason('');
                setSelectedSubmissionId(null);
              }}>
                {t('common.cancel')}
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={!rejectReason.trim() || rejectSubmission.isPending}
              >
                {t('admin.reject')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </AuthGuard>
  );
};

export default Submissions;

