import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDocs, collection, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Breadcrumbs } from './GDSComponents';
import { useAuth } from '../AuthContext';
import { ArrowRight, Bell } from 'lucide-react';

export default function CategoryDetail() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const { categories, loading: authLoading, user, userData } = useAuth();
  const [pages, setPages] = useState<any[]>([]);
  const [latestPages, setLatestPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  const category = categories.find(c => c.id === categorySlug);

  useEffect(() => {
    if (userData?.following?.includes(categorySlug)) {
      setIsFollowing(true);
    } else {
      setIsFollowing(false);
    }
  }, [userData, categorySlug]);

  const toggleFollow = async () => {
    if (!user) return alert('Please sign in to follow departments.');
    try {
      const userRef = doc(db, 'users', user.uid);
      if (isFollowing) {
        await updateDoc(userRef, { following: arrayRemove(categorySlug) });
        setIsFollowing(false);
      } else {
        await updateDoc(userRef, { following: arrayUnion(categorySlug) });
        setIsFollowing(true);
      }
    } catch (e) {
      console.error('Failed to toggle follow:', e);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!categorySlug) return;
      try {
        const pagesRef = collection(db, 'pages');
        const snapshot = await getDocs(pagesRef);
        
        if (!snapshot.empty) {
          const allPages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          
          // Filter and sort pages for this category
          const categoryPages = allPages
            .filter(p => p.categoryId === categorySlug)
            .sort((a,b) => (a.order || 0) - (b.order || 0));
          setPages(categoryPages);

          // Get latest pages globally
          const sortedLatest = [...allPages]
            .sort((a, b) => {
              const dateA = new Date(a.createdAt || 0).getTime();
              const dateB = new Date(b.createdAt || 0).getTime();
              return dateB - dateA;
            })
            .slice(0, 5);
          setLatestPages(sortedLatest);
        }
      } catch (e) {
        console.error("Error fetching content:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [categorySlug]);

  const isHomeOffice = categorySlug === 'home-office';

  if (loading && pages.length === 0) return (
    <div className="govuk-width-container govuk-main-wrapper">
      <div className="h-4 bg-gray-100 w-1/4 mb-12 animate-pulse"></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <div className="h-12 bg-gray-200 w-1/2 animate-pulse"></div>
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="py-6 border-t border-gray-100 animate-pulse">
                <div className="h-8 bg-gray-200 w-2/3 mb-2"></div>
                <div className="h-4 bg-gray-100 w-full mb-1"></div>
                <div className="h-4 bg-gray-100 w-5/6"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (!category && !authLoading) return <div className="govuk-width-container govuk-main-wrapper text-center py-20">Section not found</div>;
  if (!category) return null;

  return (
    <div className="govuk-width-container govuk-main-wrapper">
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        category.name
      ]} />
      
      <div className={`border-b-8 mb-12 pb-8 ${isHomeOffice ? 'border-ho-purple' : 'border-govuk-blue'}`}>
        <h1 className="text-govuk-text text-5xl mb-4 font-bold">{category.name}</h1>
        <p className="text-2xl text-govuk-text-secondary max-w-3xl leading-relaxed">
          {category.description}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left/Main Column */}
        <div className="lg:col-span-8">
           {/* Featured Section */}
           {pages.filter(p => p.order === 1).length > 0 && (
             <div className="mb-12">
                <h2 className="text-3xl font-bold mb-6 border-b-2 border-govuk-grey pb-2">Featured</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {pages.filter(p => p.order === 1).map(p => (
                     <div key={p.id} className="group flex flex-col">
                        {p.imageUrl && (
                          <div className="aspect-video bg-gray-100 overflow-hidden mb-4 border border-govuk-grey">
                            <img src={p.imageUrl} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                          </div>
                        )}
                        <Link to={`/browse/${categorySlug}/${p.slug}`} className={`text-2xl font-bold hover:underline mb-2 ${isHomeOffice ? 'text-ho-purple-dark' : 'text-govuk-blue'}`}>
                          {p.title}
                        </Link>
                        <p className="text-sm text-govuk-text-secondary line-clamp-3">
                           {p.description || (p.content?.substring(0, 150) + '...')}
                        </p>
                     </div>
                   ))}
                </div>
             </div>
           )}

           {/* Other Publications Section */}
           <div className="space-y-8">
              <h2 className="text-3xl font-bold mb-6 border-b-2 border-govuk-grey pb-2">Latest from {category.name}</h2>
              {pages.filter(p => p.order !== 1).length > 0 ? (
                <div className="space-y-6">
                  {pages.filter(p => p.order !== 1).map(page => (
                    <div key={page.id} className="flex gap-6 py-6 border-b border-govuk-grey items-start">
                       {page.imageUrl && (
                         <div className="w-32 h-20 bg-gray-100 overflow-hidden hidden md:block">
                            <img src={page.imageUrl} alt="" className="w-full h-full object-cover" />
                         </div>
                       )}
                       <div>
                          <Link to={`/browse/${categorySlug}/${page.slug}`} className={`text-xl font-bold hover:underline ${isHomeOffice ? 'text-ho-purple-dark' : 'text-govuk-blue'}`}>
                            {page.title}
                          </Link>
                          <p className="text-sm mt-1 text-govuk-text-secondary line-clamp-2">
                             {page.description || (page.content?.substring(0, 120) + '...')}
                          </p>
                          <div className="mt-2 flex items-center text-[12px] font-bold text-gray-500 uppercase tracking-wide">
                             <span className="mr-3">{page.pageType || 'Publication'}</span>
                             <span>{new Date(page.updatedAt || page.createdAt).toLocaleDateString()}</span>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="italic text-govuk-text-secondary">No other publications found.</p>
              )}
           </div>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 space-y-12">
            {/* Recently Posted Across All Categories */}
            <div className={`p-6 border-t-8 shadow-sm ${isHomeOffice ? 'border-ho-purple bg-purple-50/30' : 'border-govuk-blue bg-blue-50/30'}`}>
                <h3 className="text-xl font-bold mb-6 text-govuk-text">Recently posted</h3>
                <ul className="space-y-6">
                  {latestPages.map(lp => {
                    const lpIsHO = lp.categoryId === 'home-office';
                    return (
                      <li key={lp.id} className="group">
                        <Link to={`/browse/${lp.categoryId}/${lp.slug}`} className={`block hover:underline mb-1 font-bold ${lpIsHO ? 'text-ho-purple-dark' : 'text-govuk-blue'}`}>
                          {lp.title}
                        </Link>
                        <div className="flex items-center text-[10px] font-bold text-gray-400 uppercase">
                           <span className="mr-2">{lp.categoryId?.replace(/-/g, ' ')}</span>
                           <span>• {new Date(lp.createdAt).toLocaleDateString()}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
            </div>

            {/* Department Info Box */}
            <div className="bg-white border-2 border-govuk-grey p-6">
               <h4 className="text-lg font-bold mb-4">About the {category.name}</h4>
               <p className="text-sm mb-6 leading-relaxed">
                  The {category.name} is a ministerial department of the HUK Government. 
                  We are responsible for {category.description.toLowerCase()}
               </p>
               <button 
                  onClick={toggleFollow}
                  className={`flex justify-center items-center w-full py-2 text-white font-bold text-sm shadow-md transition-all active:scale-95 ${isHomeOffice ? 'bg-ho-purple hover:bg-ho-purple-dark' : 'bg-govuk-blue hover:bg-govuk-blue-hover'}`}>
                  {isFollowing ? <span className="flex items-center text-green-100"><Bell className="w-4 h-4 mr-2" /> Following</span> : <span className="flex items-center"><Bell className="w-4 h-4 mr-2" /> Follow this department</span>}
               </button>
            </div>
        </div>
      </div>
    </div>
  );
}
