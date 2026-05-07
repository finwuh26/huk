import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { Link } from 'react-router-dom';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Home() {
  const { categories, loading: authLoading } = useAuth();
  const [featuredPages, setFeaturedPages] = useState<any[]>([]);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const pagesRef = collection(db, 'pages');
        const snapshot = await getDocs(pagesRef);
        if (!snapshot.empty) {
          const allPages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          const featured = allPages
            .sort((a,b) => (a.order || 0) - (b.order || 0))
            .slice(0, 3);
          setFeaturedPages(featured);
        }
      } catch (e) {
        console.error("Home featured fetch error:", e);
      }
    };
    fetchFeatured();
  }, []);

  return (
    <div className="govuk-width-container govuk-main-wrapper">
      <div className="md:flex md:items-end md:justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-4">Welcome to HUK.GOV</h1>
          <p className="text-xl text-govuk-text mb-8">The best place to find government services and information.</p>
        </div>
      </div>

      {featuredPages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {featuredPages.map(page => (
             <Link key={page.id} to={`/browse/${page.categoryId}/${page.slug}`} className="group no-underline">
                <div className="bg-white border-2 border-govuk-grey hover:border-govuk-blue transition-colors h-full overflow-hidden flex flex-col shadow-sm">
                   {page.imageUrl ? (
                     <div className="h-40 overflow-hidden">
                        <img src={page.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                     </div>
                   ) : (
                     <div className="h-40 bg-govuk-blue/5 flex items-center justify-center">
                        <span className="text-govuk-blue opacity-20 font-bold text-4xl italic">GOV.HUK</span>
                     </div>
                   )}
                   <div className="p-4 flex-1 border-t-2 border-govuk-blue">
                      <h3 className="text-xl font-bold text-govuk-blue underline group-hover:no-underline">{page.title}</h3>
                      <p className="text-sm text-govuk-text mt-2 line-clamp-2">{page.description}</p>
                      <div className="mt-4 flex items-center text-govuk-blue font-bold text-xs uppercase tracking-wider">
                         Read guidance <ArrowRight className="ml-2 w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </div>
                   </div>
                </div>
             </Link>
          ))}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 bg-[#f3f2f1] p-8 min-h-[300px] border-t-4 border-govuk-blue">
        <div className="col-span-full mb-4">
          <h2 className="text-3xl font-bold">Services and information</h2>
        </div>
        
        {authLoading && categories.length === 0 ? (
          <>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse space-y-3">
                <div className="h-6 bg-gray-300 w-3/4 rounded"></div>
                <div className="h-4 bg-gray-200 w-full rounded"></div>
              </div>
            ))}
          </>
        ) : categories.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xl">
            <p>No services currently available.</p>
            <p className="text-sm mt-4 text-govuk-text-secondary">If you are an admin, please ensure categories are seeded.</p>
          </div>
        ) : (
          categories.map((category) => {
            const isHO = category.id === 'home-office';
            const isPetitions = category.id === 'petitions';
            return (
              <div key={category.id} className="group">
                <Link 
                  to={isPetitions ? '/petitions' : `/browse/${category.id}`} 
                  className="no-underline block"
                >
                  <h3 className={`decoration-1 underline group-hover:decoration-2 m-0 text-xl font-bold ${isHO ? 'text-ho-purple-dark decoration-ho-purple' : 'text-govuk-blue'}`}>
                    {category.name}
                  </h3>
                </Link>
                <p className="text-sm mt-2 text-govuk-text-secondary leading-normal">
                  {category.description}
                </p>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-12 border-t-2 border-govuk-grey pt-12 mb-12">
        <div className="bg-govuk-grey-light p-6 border-l-4 border-govuk-blue max-w-2xl">
          <h2 className="text-xl font-bold mb-2">Government news</h2>
          <p className="text-sm">Stay up to date with the latest official announcements from HUK.GOV.</p>
          <Link to="/news" className="text-govuk-blue underline font-bold mt-4 block flex items-center">
             Read all news <ChevronRight className="ml-1 w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
