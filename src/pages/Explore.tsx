import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Filter, Grid, List, MapIcon, Map as MapIcon2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FilterSidebar from '@/components/FilterSidebar';
import MosqueCard from '@/components/MosqueCard';
import { MapView } from '@/components/Map/MapView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMosques } from '@/hooks/use-mosques';
import { useTranslation } from '@/hooks/use-translation';
import { Skeleton } from '@/components/ui/skeleton';
import { SkipLink } from '@/components/SkipLink';
import type { MosqueFilters } from '@/types';

const Explore = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedState, setSelectedState] = useState(searchParams.get('state') || '');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [sortBy, setSortBy] = useState<'nearest' | 'most_amenities' | 'alphabetical'>('alphabetical');

  const filters: MosqueFilters = useMemo(() => ({
    state: selectedState || undefined,
    amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined,
    search: searchQuery || undefined,
    sortBy,
  }), [searchQuery, selectedState, selectedAmenities, sortBy]);

  const { data: mosques = [], isLoading, error } = useMosques(filters);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedState('');
    setSelectedAmenities([]);
    navigate('/explore', { replace: true });
  };

  const activeFilterCount = (selectedState ? 1 : 0) + selectedAmenities.length + (searchQuery ? 1 : 0);

  return (
    <>
      <SkipLink />
      <Helmet>
        <title>{t('explore.title')} - lepakmasjid</title>
        <meta 
          name="description" 
          content={t('explore.subtitle')}
        />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main id="main-content" className="flex-1">
          {/* Page header */}
          <div className="bg-secondary/30 border-b border-border">
            <div className="container-main py-8">
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
                {t('explore.title')}
              </h1>
              <p className="text-muted-foreground text-lg">
                {t('explore.subtitle')}
              </p>
            </div>
          </div>

          <div className="container-main py-8">
            <div className="flex gap-8">
              {/* Sidebar */}
              <FilterSidebar
                selectedState={selectedState}
                onStateChange={setSelectedState}
                selectedAmenities={selectedAmenities}
                onAmenitiesChange={setSelectedAmenities}
                onClear={clearFilters}
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                sortBy={sortBy}
                onSortChange={setSortBy}
              />

              {/* Main content */}
              <div className="flex-1 min-w-0">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <Input
                      type="search"
                      placeholder={t('explore.search_placeholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="lg:hidden"
                      onClick={() => setIsFilterOpen(true)}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      {t('common.filter')}
                      {activeFilterCount > 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs">
                          {activeFilterCount}
                        </span>
                      )}
                    </Button>
                    <div className="hidden sm:flex border border-border rounded-lg overflow-hidden">
                      <Button
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => setViewMode('grid')}
                        className="rounded-none"
                        aria-label={t('explore.grid_view')}
                      >
                        <Grid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => setViewMode('list')}
                        className="rounded-none"
                        aria-label={t('explore.list_view')}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'map' ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => setViewMode('map')}
                        className="rounded-none"
                        aria-label={t('explore.map_view')}
                      >
                        <MapIcon2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Error state */}
                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertDescription>
                      {error instanceof Error ? error.message : t('featured.error')}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Results count */}
                {!error && (
                  <p className="text-sm text-muted-foreground mb-6">
                    {t('explore.showing')} <span className="font-medium text-foreground">{mosques.length}</span> {t('explore.mosques')}
                    {activeFilterCount > 0 && (
                      <button 
                        onClick={clearFilters}
                        className="ml-2 text-primary hover:underline"
                      >
                        {t('explore.clear_filters')}
                      </button>
                    )}
                  </p>
                )}

                {/* Results */}
                {isLoading ? (
                  <div className={`grid gap-6 ${viewMode === 'grid' ? 'md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Skeleton key={i} className="h-64 w-full" />
                    ))}
                  </div>
                ) : error ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                      <MapIcon className="h-8 w-8 text-destructive" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{t('explore.connection_error')}</h3>
                    <p className="text-muted-foreground mb-4">
                      {t('explore.connection_error_message')}
                    </p>
                    <Button variant="outline" onClick={() => window.location.reload()}>
                      {t('explore.retry')}
                    </Button>
                  </div>
                ) : viewMode === 'map' ? (
                  <MapView mosques={mosques} className="h-[600px] w-full" />
                ) : mosques.length > 0 ? (
                  <div className={`grid gap-6 ${viewMode === 'grid' ? 'md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
                    {mosques.map((mosque, index) => (
                      <div
                        key={mosque.id}
                        className="animate-fade-up"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <MosqueCard mosque={mosque} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                      <MapIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{t('explore.no_results')}</h3>
                    <p className="text-muted-foreground mb-4">
                      {t('explore.adjust_search')}
                    </p>
                    <Button variant="outline" onClick={clearFilters}>
                      {t('explore.clear_filters')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Explore;
