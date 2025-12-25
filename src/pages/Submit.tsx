import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCreateSubmission } from '@/hooks/use-submissions';
import { useMosque } from '@/hooks/use-mosques';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/use-translation';
import { SkipLink } from '@/components/SkipLink';
import { AuthGuard } from '@/components/Auth/AuthGuard';
import { toast } from 'sonner';

const createMosqueSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(2, t('form.name_required')),
  name_bm: z.string().optional(),
  address: z.string().min(5, t('form.address_min')),
  state: z.string().min(1, t('form.state_required')),
  lat: z.number()
    .min(-90, t('form.lat_range'))
    .max(90, t('form.lat_range')),
  lng: z.number()
    .min(-180, t('form.lng_range'))
    .max(180, t('form.lng_range')),
  description: z.string().optional(),
  description_bm: z.string().optional(),
});

const Submit = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editId = searchParams.get('edit');
  const { data: existingMosque } = useMosque(editId);
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const createSubmission = useCreateSubmission();
  const [error, setError] = useState<string | null>(null);

  const mosqueSchema = createMosqueSchema(t);
  type MosqueFormData = z.infer<typeof mosqueSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<MosqueFormData>({
    resolver: zodResolver(mosqueSchema),
    defaultValues: {
      lat: 3.1390,
      lng: 101.6869,
    },
  });

  useEffect(() => {
    if (existingMosque) {
      setValue('name', existingMosque.name);
      setValue('name_bm', existingMosque.name_bm || '');
      setValue('address', existingMosque.address);
      setValue('state', existingMosque.state);
      setValue('lat', existingMosque.lat);
      setValue('lng', existingMosque.lng);
      setValue('description', existingMosque.description || '');
      setValue('description_bm', existingMosque.description_bm || '');
    }
  }, [existingMosque, setValue]);

  const onSubmit = async (data: MosqueFormData) => {
    if (!user) {
      setError(t('submit.must_login'));
      return;
    }

    try {
      setError(null);
      await createSubmission.mutateAsync({
        type: editId ? 'edit_mosque' : 'new_mosque',
        mosque_id: editId || undefined,
        data,
        status: 'pending',
        submitted_by: user.id,
        submitted_at: new Date().toISOString(),
      });
      
      toast.success(t('submit.success'));
      navigate('/explore');
    } catch (err: any) {
      setError(err.message || t('submit.error'));
    }
  };

  return (
    <AuthGuard>
      <SkipLink />
      <Helmet>
        <title>{editId ? t('meta.edit_title') : t('meta.submit_title')} - lepakmasjid</title>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main id="main-content" className="flex-1">
          <div className="container-main py-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-8">
              {editId ? t('submit.edit_title') : t('submit.title')}
            </h1>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('submit.name_en')} *</Label>
                  <Input id="name" {...register('name')} />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name_bm">{t('submit.name_bm')}</Label>
                  <Input id="name_bm" {...register('name_bm')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">{t('submit.address')} *</Label>
                <Input id="address" {...register('address')} />
                {errors.address && (
                  <p className="text-sm text-destructive">{errors.address.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">{t('submit.state')} *</Label>
                <Input id="state" {...register('state')} placeholder={t('submit.state_placeholder')} />
                {errors.state && (
                  <p className="text-sm text-destructive">{errors.state.message}</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lat">{t('submit.latitude')} *</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="any"
                    {...register('lat', { valueAsNumber: true })}
                  />
                  {errors.lat && (
                    <p className="text-sm text-destructive">{errors.lat.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lng">{t('submit.longitude')} *</Label>
                  <Input
                    id="lng"
                    type="number"
                    step="any"
                    {...register('lng', { valueAsNumber: true })}
                  />
                  {errors.lng && (
                    <p className="text-sm text-destructive">{errors.lng.message}</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="description">{t('submit.description_en')}</Label>
                  <Textarea id="description" {...register('description')} rows={4} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description_bm">{t('submit.description_bm')}</Label>
                  <Textarea id="description_bm" {...register('description_bm')} rows={4} />
                </div>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={createSubmission.isPending}>
                  {createSubmission.isPending ? t('submit.submitting') : t('common.submit')}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/explore')}>
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </div>
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
};

export default Submit;

