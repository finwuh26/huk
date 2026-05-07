import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumbs } from './GDSComponents';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ArrowRight } from 'lucide-react';

export default function News() {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const pagesRef = collection(db, 'pages');
        const snapshot = await getDocs(pagesRef);
        if (!snapshot.empty) {
          const allPages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          // Sort by timestamp or updatedAt, fallback to order
          const sortedNews = allPages.sort((a: any, b: any) => {
             const timeA = a.updatedAt || a.id; // Using ID as fallback for order
             const timeB = b.updatedAt || b.id;
             return timeB > timeA ? 1 : -1;
          });
          setNews(sortedNews);
        }
      } catch (e) {
        console.error("News fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  return (
    <div className="govuk-width-container py-8">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, 'News']} />
      
      <div className="max-w-3xl mt-8">
        <h1 className="text-4xl font-bold mb-8">Latest news and announcements</h1>
        <p className="text-xl text-govuk-text mb-12">
          Stay informed with the latest updates from the Government of HUK.
        </p>

        {loading ? (
          <div className="space-y-12">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse border-t border-govuk-grey pt-6">
                <div className="h-4 bg-gray-200 w-24 mb-4"></div>
                <div className="h-8 bg-gray-300 w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 w-full mb-2"></div>
                <div className="h-4 bg-gray-200 w-2/3"></div>
              </div>
            ))}
          </div>
        ) : news.length === 0 ? (
          <div className="border-t border-govuk-grey pt-6">
            <p className="text-xl">No news stories found at this time.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {news.map((item) => (
              <article key={item.id} className="border-t border-govuk-grey pt-6 group">
                <p className="text-sm text-govuk-text mb-2">
                  {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Recently updated'}
                </p>
                <Link to={`/browse/${item.categoryId}/${item.slug}`} className="no-underline">
                  <h2 className="text-2xl font-bold text-govuk-blue underline group-hover:no-underline decoration-2 mb-3">
                    {item.title}
                  </h2>
                </Link>
                <p className="text-base text-govuk-text leading-relaxed line-clamp-3">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
