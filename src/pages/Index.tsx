import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import FeaturedMosques from '@/components/FeaturedMosques';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';
import { SkipLink } from '@/components/SkipLink';
import { useTranslation } from '@/hooks/use-translation';

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate('/explore');
    }
  };

  return (
    <>
      <SkipLink />
      <Helmet>
        <title>{t('meta.home_title')}</title>
        <meta 
          name="description" 
          content={t('meta.home_description')} 
        />
        <meta name="keywords" content="mosque, masjid, Malaysia, prayer space, WiFi, working space, accessibility, halal, Muslim" />
        <link rel="canonical" href="https://lepakmasjid.my" />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main id="main-content" className="flex-1">
          <HeroSection 
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSearch={handleSearch}
          />
          <FeaturedMosques />
          <CTASection />
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Index;
