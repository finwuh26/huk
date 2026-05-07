import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, collection, getDocs, setDoc, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Breadcrumbs, StartButton } from './GDSComponents';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../AuthContext';
import { CheckCircle2, ChevronRight, Info } from 'lucide-react';

export default function ContentPage() {
  const { pageSlug } = useParams();
  const { categories, userData } = useAuth();
  const [page, setPage] = useState<any>(null);
  const [latestPages, setLatestPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formStep, setFormStep] = useState(0); // 0: content, 1: form start, 2: success
  const [referenceId, setReferenceId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!pageSlug) return;
      try {
        const pagesRef = collection(db, 'pages');
        const snapshot = await getDocs(pagesRef);
        
        if (!snapshot.empty) {
          const allPages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          const currentPage = allPages.find(p => p.slug === pageSlug);
          if (currentPage) setPage(currentPage);

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
        console.error("Error fetching content page:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pageSlug]);

  const category = page ? categories.find(c => c.id === page.categoryId) : null;
  const isHomeOffice = page?.categoryId === 'home-office';

  if (loading) return (
    <div className="govuk-width-container govuk-main-wrapper animate-pulse">
      <div className="h-4 bg-gray-200 w-1/4 mb-8"></div>
      <div className="h-10 bg-gray-200 w-1/2 mb-12"></div>
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 w-full"></div>
        <div className="h-4 bg-gray-200 w-full"></div>
        <div className="h-4 bg-gray-200 w-3/4"></div>
      </div>
    </div>
  );

  if (!page) return (
    <div className="govuk-width-container govuk-main-wrapper text-center py-20">
      <h1 className="text-govuk-text text-4xl mb-4">Page not found</h1>
      <p className="text-xl">The content you are looking for does not exist or has been moved.</p>
    </div>
  );

  return (
    <div className="govuk-width-container govuk-main-wrapper">
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: category?.name || 'Category', href: category ? `/browse/${category.id}` : '#' },
        page.title
      ]} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          {formStep === 0 && (
            <>
              {page.imageUrl && (
                <div className="w-full h-80 mb-8 bg-gray-100 overflow-hidden border-b-4 border-govuk-blue shadow-lg">
                  <img src={page.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              <h1 className={`text-govuk-text text-5xl mb-8 font-bold ${isHomeOffice ? 'text-ho-purple-dark' : ''}`}>
                {page.title}
              </h1>
              
              <div className={`markdown-body prose max-w-none mb-12 prose-headings:font-bold prose-lg leading-relaxed whitespace-pre-wrap ${isHomeOffice ? 'prose-a:text-ho-purple hover:prose-a:text-ho-purple-dark prose-headings:text-ho-purple-dark' : ''}`}>
                <ReactMarkdown>{page.content}</ReactMarkdown>
              </div>

              {page.pageType === 'form' ? (
                <div className="bg-gray-50 border-2 border-govuk-grey p-8 mb-12 shadow-sm">
                  <h2 className="text-2xl font-bold mb-4">Interactive Application</h2>
                  <p className="mb-6 text-govuk-text-secondary">This digital service allows you to submit your request directly to {category?.name || 'the department'}.</p>
                  <StartButton 
                    onClick={() => setFormStep(1)}
                    className={isHomeOffice ? 'bg-ho-purple hover:bg-ho-purple-dark shadow-ho-purple/20' : ''}
                  >
                    Start application
                  </StartButton>
                </div>
              ) : (
                <div className="bg-blue-50 border-l-4 border-govuk-blue p-6 mb-12 flex space-x-4">
                  <Info className="w-8 h-8 text-govuk-blue flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-lg mb-1">Standard Guidance</h3>
                    <p className="text-sm">This is an informational post. Follow the instructions above or contact the relevant department for assistance.</p>
                  </div>
                </div>
              )}
            </>
          )}

          {formStep === 1 && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h1 className="text-4xl font-bold">{page.title} - Application</h1>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const data: Record<string, any> = {};
                  formData.forEach((value, key) => {
                    data[key] = value;
                  });

                  // Add automatically fetched values for admin view
                  if (userData?.discordLinked) {
                    data['Discord Username'] = userData.discordUsername || '';
                    data['Discord ID'] = userData.discordId || '';
                  }
                  if (userData?.robloxLinked) {
                    data['ROBLOX Username'] = userData.robloxUsername || '';
                    data['ROBLOX ID'] = userData.robloxId || '';
                    data['Link to ROBLOX profile'] = userData.robloxId ? `https://www.roblox.com/users/${userData.robloxId}/profile` : '';
                  }
                  
                  try {
                    const refId = `HUK-${Math.floor(Math.random() * 90000) + 10000}`;
                    const submissionsRef = collection(db, `pages/${page.id}/submissions`);
                    await addDoc(submissionsRef, {
                      referenceId: refId,
                      data,
                      submittedAt: new Date().toISOString()
                    });
                    setReferenceId(refId);
                    setFormStep(2);
                  } catch (err) {
                    console.error("Submission failed:", err);
                    alert("Failed to submit form. Please try again.");
                    handleFirestoreError(err, OperationType.WRITE, `pages/${page.id}/submissions`);
                  }
                }} className="bg-white border-2 border-govuk-grey p-8 space-y-6">
                   {page.questions && page.questions.length > 0 ? (
                     page.questions.map((q: any, i: number) => (
                       <div key={i}>
                          <label className="block font-bold mb-2">{q.text}</label>
                          {q.type === 'textarea' ? (
                            <textarea 
                              name={q.text}
                              required
                              className="w-full border-2 border-govuk-black p-2 focus:outline-govuk-focus" 
                              rows={4} 
                            />
                          ) : q.type === 'select' ? (
                            <select 
                              name={q.text}
                              required
                              className="w-full md:w-2/3 border-2 border-govuk-black p-2 focus:outline-govuk-focus"
                            >
                               <option value="">Select an option</option>
                               {q.options?.split(',').map((opt: string) => (
                                 <option key={opt} value={opt.trim()}>{opt.trim()}</option>
                               ))}
                            </select>
                          ) : q.type === 'verify_discord' ? (
                            <div className="bg-gray-100 p-4 flex items-center justify-between border-l-4 border-[#5865F2]">
                               <div className="flex items-center gap-3">
                                 <svg className="w-6 h-6 text-[#5865F2]" fill="currentColor" viewBox="0 0 127.14 96.36">
                                   <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
                                 </svg>
                                 <span>{userData?.discordLinked ? 'Discord account verified ✓' : 'Verification required'}</span>
                               </div>
                               <input type="hidden" name={q.text} value={userData?.discordLinked ? 'verified' : ''} required />
                               {!userData?.discordLinked && (
                                 <Link to="/profile" className="text-govuk-blue underline text-sm font-bold">Go to Profile</Link>
                               )}
                            </div>
                          ) : q.type === 'verify_roblox' ? (
                            <div className="bg-gray-100 p-4 flex items-center justify-between border-l-4 border-black">
                               <div className="flex items-center gap-3">
                                 <img src="https://upload.wikimedia.org/wikipedia/commons/3/3a/Roblox_player_icon_black.svg" alt="Roblox" className="w-6 h-6 object-contain" />
                                 <span>{userData?.robloxLinked ? 'Roblox account verified ✓' : 'Verification required'}</span>
                               </div>
                               <input type="hidden" name={q.text} value={userData?.robloxLinked ? 'verified' : ''} required />
                               {!userData?.robloxLinked && (
                                 <Link to="/profile" className="text-govuk-blue underline text-sm font-bold">Go to Profile</Link>
                               )}
                            </div>
                          ) : ['ROBLOX ID', 'Link to ROBLOX profile', 'Discord Username', 'Discord ID', 'ROBLOX Username'].includes(q.text) ? (
                            <div className="bg-gray-100 p-4 border-l-4 border-govuk-blue mb-4">
                              <div className="font-bold mb-2">{q.text}</div>
                              {['Discord Username', 'Discord ID'].includes(q.text) ? (
                                userData?.discordLinked ? (
                                  <div className="text-green-700 font-bold flex items-center"><span className="text-xl mr-2">✓</span> Retrieved securely from Discord</div>
                                ) : (
                                  <div>
                                    <p className="text-sm mb-2 text-govuk-text-secondary">This information is required. Please link your Discord account in your profile.</p>
                                    <Link to="/profile" className="bg-[#5865F2] text-white px-4 py-2 font-bold inline-block hover:opacity-90">Connect Discord</Link>
                                    <input type="hidden" required />
                                  </div>
                                )
                              ) : (
                                userData?.robloxLinked ? (
                                  <div className="text-green-700 font-bold flex items-center"><span className="text-xl mr-2">✓</span> Retrieved securely from Roblox</div>
                                ) : (
                                  <div>
                                    <p className="text-sm mb-2 text-govuk-text-secondary">This information is required. Please link your Roblox account in your profile.</p>
                                    <Link to="/profile" className="bg-govuk-green text-white px-4 py-2 font-bold inline-block hover:bg-govuk-green-hover">Connect Roblox</Link>
                                    <input type="hidden" required />
                                  </div>
                                )
                              )}
                            </div>
                          ) : (
                            <input 
                              name={q.text}
                              type="text" 
                              required
                              className="w-full md:w-2/3 border-2 border-govuk-black p-2 focus:outline-govuk-focus" 
                            />
                          )}
                       </div>
                     ))
                   ) : (
                     <>
                       <div>
                          <label className="block font-bold mb-2">What is your full legal name?</label>
                          <input name="Full Name" required type="text" className="w-full md:w-2/3 border-2 border-govuk-black p-2 focus:outline-govuk-focus" />
                       </div>
                       <div>
                          <label className="block font-bold mb-2">What is your date of birth?</label>
                          <div className="flex space-x-4">
                             <div className="w-16">
                                <span className="text-sm block">Day</span>
                                <input name="DOB Day" required type="text" className="w-full border-2 border-govuk-black p-2" />
                             </div>
                             <div className="w-16">
                                <span className="text-sm block">Month</span>
                                <input name="DOB Month" required type="text" className="w-full border-2 border-govuk-black p-2" />
                             </div>
                             <div className="w-24">
                                <span className="text-sm block">Year</span>
                                <input name="DOB Year" required type="text" className="w-full border-2 border-govuk-black p-2" />
                             </div>
                          </div>
                       </div>
                     </>
                   )}
                   <div className="pt-4 flex items-center space-x-4">
                      {page.questions && page.questions.some((q: any) => 
                        (q.type === 'verify_discord' && !userData?.discordLinked) || 
                        (q.type === 'verify_roblox' && !userData?.robloxLinked)
                      ) ? (
                        <p className="text-govuk-error font-bold text-sm">Please complete all required verifications in your Profile to submit this application.</p>
                      ) : (
                        <button 
                          type="submit"
                          className="bg-govuk-green text-white px-8 py-3 font-bold hover:bg-govuk-green-hover transition-colors shadow-md"
                        >
                           Submit application
                        </button>
                      )}
                      <button type="button" onClick={() => setFormStep(0)} className="underline text-govuk-blue hover:text-govuk-blue-hover">Cancel and return</button>
                   </div>
                </form>
             </div>
          )}

          {formStep === 2 && (
             <div className="space-y-8 animate-in zoom-in duration-500">
                <div className="bg-govuk-green text-white p-12 text-center shadow-lg">
                   <div className="flex justify-center mb-6">
                      <CheckCircle2 className="w-24 h-24" />
                   </div>
                   <h1 className="text-4xl font-bold mb-4">Application complete</h1>
                   <p className="text-xl">Your reference number is <span className="font-mono bg-white/20 px-2">{referenceId}</span></p>
                </div>
                
                <h2 className="text-2xl font-bold">What happens next</h2>
                <p>We've sent a confirmation email to your registered address.</p>
                <p>We will check your details and contact you if we need more information. This usually takes up to 4 weeks.</p>
                
                <div className="bg-gray-50 border border-gray-200 p-6 rounded">
                   <h3 className="font-bold mb-2">Give feedback on this service</h3>
                   <p className="text-sm mb-4">It only takes 2 minutes and helps us improve GOV.HUK</p>
                   <Link to="/" className="text-govuk-blue underline">Go back to home</Link>
                </div>
             </div>
          )}
        </div>

        <aside className="space-y-8">
           <div className={`border-t-4 pt-4 ${isHomeOffice ? 'border-ho-purple' : 'border-govuk-blue'}`}>
            <h3 className="text-xl font-bold mb-4">Recently added</h3>
            <ul className="space-y-4 text-sm font-bold">
              {latestPages.length > 0 ? (
                latestPages.map(lp => (
                  <li key={lp.id}>
                    <Link to={`/browse/${lp.categoryId}/${lp.slug}`} className={`underline transition-colors flex items-center group ${isHomeOffice ? 'text-ho-purple hover:text-ho-purple-dark' : 'text-govuk-blue hover:text-govuk-blue-hover'}`}>
                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span>{lp.title}</span>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="text-govuk-text-secondary italic font-normal">No recent updates.</li>
              )}
            </ul>
          </div>
          
          <div className="bg-govuk-grey-light p-4 border border-govuk-grey">
             <h4 className="font-bold mb-2">Help and support</h4>
             <p className="text-xs text-govuk-text-secondary mb-3 font-mono">ID: {page?.id}</p>
             <Link to="/contact" className="text-sm text-govuk-blue underline block">Contact {category?.name || 'the department'}</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
