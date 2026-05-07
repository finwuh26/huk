import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError as handleDatabaseError, OperationType } from '../lib/firebase';
import { Plus, Edit, Trash2, Save, X, UserCog, FileText, Image as ImageIcon, Layout, FileQuestion, Inbox, ChevronLeft, Globe } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';
import { useAuth } from '../AuthContext';

export default function AdminPanel() {
  const { role, user, categories, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'pages' | 'users' | 'settings' | 'petitions' | 'feedback' | 'parliament'>('pages');
  const [pages, setPages] = useState<any[]>([]);
  const [editingPage, setEditingPage] = useState<any>(null);
  const [editingUserAccount, setEditingUserAccount] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', displayName: '', role: 'standard staff' as 'user' | 'admin' | 'owner' | 'standard staff' });
  const [viewingSubmissionsId, setViewingSubmissionsId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [allPetitions, setAllPetitions] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [parliamentData, setParliamentData] = useState<any>({ sessionDate: '', agenda: '' });

  useEffect(() => {
    if (!viewingSubmissionsId) {
      setSubmissions([]);
      return;
    }

    const submissionsRef = collection(db, `pages/${viewingSubmissionsId}/submissions`);
    const unsub = onSnapshot(submissionsRef, (snapshot) => {
      if (!snapshot.empty) {
        setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else {
        setSubmissions([]);
      }
    }, (error) => {
      handleDatabaseError(error, OperationType.LIST, `pages/${viewingSubmissionsId}/submissions`);
    });

    return () => unsub();
  }, [viewingSubmissionsId]);

  useEffect(() => {
    if (activeTab !== 'petitions') return;

    const petitionsRef = collection(db, 'petitions');
    const unsub = onSnapshot(petitionsRef, (snapshot) => {
      if (!snapshot.empty) {
        setAllPetitions(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } else {
        setAllPetitions([]);
      }
    }, (error) => {
      handleDatabaseError(error, OperationType.LIST, 'petitions');
    });

    return () => unsub();
  }, [activeTab]);

  useEffect(() => {
    if (role === 'user' || !role) return;

    // Snapshot for pages (Firestore)
    const pagesRef = collection(db, 'pages');
    const unsubPages = onSnapshot(pagesRef, (snapshot) => {
      if (!snapshot.empty) {
        setPages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else {
        setPages([]);
      }
    }, (error) => {
      handleDatabaseError(error, OperationType.LIST, 'pages');
    });

    let unsubUsers: any = null;
    let unsubFeedback: any = null;
    let unsubParliament: any = null;
    if (role !== 'user') {
      const usersRef = collection(db, 'users');
      unsubUsers = onSnapshot(usersRef, (snapshot) => {
        if (!snapshot.empty) {
          setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        } else {
          setUsers([]);
        }
      }, (error) => {
        handleDatabaseError(error, OperationType.LIST, 'users');
      });

      const fbRef = collection(db, 'feedback');
      unsubFeedback = onSnapshot(fbRef, (snapshot) => {
        setFeedbacks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      unsubParliament = onSnapshot(doc(db, 'settings', 'parliament'), (docSnap) => {
        if (docSnap.exists()) setParliamentData(docSnap.data());
      });
    }

    return () => {
      unsubPages();
      if (unsubUsers) unsubUsers();
      if (unsubFeedback) unsubFeedback();
      if (unsubParliament) unsubParliament();
    };
  }, [role]);

  const savePage = async (page: any) => {
    if (!page.title || !page.categoryId) {
      alert('Please provide a title and select a section.');
      return;
    }
    try {
      const slug = page.slug || page.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
      const pageData: any = {
        title: page.title || 'Untitled Page',
        content: page.content || '',
        categoryId: page.categoryId,
        description: page.description || '',
        order: (typeof page.order === 'number' && !isNaN(page.order)) ? Number(page.order) : 0,
        slug,
        imageUrl: page.imageUrl || '',
        pageType: page.pageType || 'article',
        questions: page.questions || [],
        updatedAt: new Date().toISOString(),
        authorId: page.authorId || user?.uid || 'system'
      };
      
      if (page.id) {
        await updateDoc(doc(db, 'pages', page.id), pageData);
      } else {
        const newRef = await addDoc(collection(db, 'pages'), { 
          ...pageData, 
          createdAt: new Date().toISOString() 
        });
        
        // ping webhook for new pages
        try {
          const categoryName = categories.find(c => c.id === pageData.categoryId)?.name;
          await fetch('/api/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: pageData.title, // just the title
              description: pageData.description,
              url: `https://huk.finwuh.uk/page/${slug}`, // using the real domain as base maybe? Or just location origin if available but window.location might be the preview server, so using huk.finwuh.uk is probably better
              imageUrl: pageData.imageUrl,
              targetSection: categoryName
            }) 
          });
        } catch (e) {
          console.error("Webhook trigger failed", e);
        }
      }
      alert('Content published successfully!');
      setEditingPage(null);
    } catch (e: any) {
      console.error('Failed to save page:', e);
      handleDatabaseError(e, OperationType.WRITE, 'pages');
    }
  };

  const deletePage = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await deleteDoc(doc(db, 'pages', id));
    } catch (e) {
      handleDatabaseError(e, OperationType.DELETE, `pages/${id}`);
    }
  };

  const saveUserAccount = async () => {
    if (!editingUserAccount) return;
    try {
      await updateDoc(doc(db, 'users', editingUserAccount.id), {
        email: editingUserAccount.email,
        displayName: editingUserAccount.displayName,
        role: editingUserAccount.role,
        roles: editingUserAccount.roles || [],
        discordLinked: editingUserAccount.discordLinked || false,
        discordUsername: editingUserAccount.discordUsername || '',
        discordId: editingUserAccount.discordId || '',
        robloxLinked: editingUserAccount.robloxLinked || false,
        robloxUsername: editingUserAccount.robloxUsername || '',
        robloxId: editingUserAccount.robloxId || '',
      });
      setEditingUserAccount(null);
    } catch (e) {
      handleDatabaseError(e, OperationType.UPDATE, `users/${editingUserAccount.id}`);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    if (role === 'user') return; // only admins/owners
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      
      // Full sync logic using updated users
      const updatedUsers = users.map(u => u.id === userId ? { ...u, role: newRole } : u);
      const newCabinetMap: Record<string, string> = {};
      updatedUsers.forEach(u => {
        if (u.role && u.role !== 'user' && u.role !== 'admin' && u.role !== 'owner' && u.role !== 'standard staff') {
          const name = u.displayName || u.email;
          if (newCabinetMap[u.role]) {
            newCabinetMap[u.role] = `${newCabinetMap[u.role]}, ${name}`;
          } else {
            newCabinetMap[u.role] = name;
          }
        }
      });
      await setDoc(doc(db, 'settings', 'parliament'), { cabinetMap: newCabinetMap }, { merge: true });

    } catch (e) {
      handleDatabaseError(e, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    if (userId === user?.uid) {
      alert('You cannot delete yourself.');
      return;
    }
    if (role !== 'owner') return;
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (e) {
      handleDatabaseError(e, OperationType.DELETE, `users/${userId}`);
    }
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.displayName) {
      alert('Please provide an email and display name.');
      return;
    }
    if (role !== 'owner') return;
    try {
      await addDoc(collection(db, 'users'), {
        ...newUser,
        createdAt: new Date().toISOString()
      });
      setNewUser({ email: '', displayName: '', role: 'user' });
      alert('User record created.');
    } catch (e) {
      handleDatabaseError(e, OperationType.CREATE, 'users');
    }
  };

  const toggleMaintenanceMode = async () => {
    // Logic removed
  };

  if (loading || (role === null && user !== null)) {
    return <div className="govuk-width-container govuk-main-wrapper text-center animate-pulse py-20">
      <p className="text-xl">Verifying administrator permissions...</p>
    </div>;
  }

  if (role === 'user' || !role) {
    return <div className="govuk-width-container govuk-main-wrapper text-center">
      <h1 className="text-govuk-error">Access Denied</h1>
      <p>You do not have permission to view this page.</p>
    </div>;
  }

  return (
    <div className="govuk-width-container govuk-main-wrapper flex flex-col md:flex-row gap-8">
      
      <div className="w-full md:w-64 flex-shrink-0">
        <h1 className="text-2xl font-bold mb-6 text-govuk-blue mt-0">Admin Portal</h1>
        <div className="flex flex-col space-y-2 bg-gray-50 border border-gray-200 p-4 shadow-sm">
          <button 
            onClick={() => setActiveTab('pages')}
            className={`text-left px-4 py-3 font-bold focus:outline-none transition-colors border-l-4 ${activeTab === 'pages' ? 'border-govuk-blue bg-white text-govuk-blue shadow-sm' : 'border-transparent text-govuk-text hover:bg-gray-200'}`}
          >
            <FileText className="inline-block mr-2 w-4 h-4" /> Content Builder
          </button>
          <button 
            onClick={() => setActiveTab('petitions')}
            className={`text-left px-4 py-3 font-bold focus:outline-none transition-colors border-l-4 ${activeTab === 'petitions' ? 'border-parliament-green bg-white text-parliament-green shadow-sm' : 'border-transparent text-govuk-text hover:bg-gray-200'}`}
          >
            <Inbox className="inline-block mr-2 w-4 h-4" /> Petitions & Decs
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`text-left px-4 py-3 font-bold focus:outline-none transition-colors border-l-4 ${activeTab === 'users' ? 'border-govuk-blue bg-white text-govuk-blue shadow-sm' : 'border-transparent text-govuk-text hover:bg-gray-200'}`}
          >
            <UserCog className="inline-block mr-2 w-4 h-4" /> Personnel
          </button>
          <button 
            onClick={() => setActiveTab('feedback')}
            className={`text-left px-4 py-3 font-bold focus:outline-none transition-colors border-l-4 ${activeTab === 'feedback' ? 'border-govuk-blue bg-white text-govuk-blue shadow-sm' : 'border-transparent text-govuk-text hover:bg-gray-200'}`}
          >
            <Inbox className="inline-block mr-2 w-4 h-4" /> Feedback
          </button>
          <button 
            onClick={() => setActiveTab('parliament')}
            className={`text-left px-4 py-3 font-bold focus:outline-none transition-colors border-l-4 ${activeTab === 'parliament' ? 'border-govuk-blue bg-white text-govuk-blue shadow-sm' : 'border-transparent text-govuk-text hover:bg-gray-200'}`}
          >
            <Globe className="inline-block mr-2 w-4 h-4" /> Parliament
          </button>
          {role === 'owner' && (
            <button 
              onClick={() => setActiveTab('settings')}
              className={`text-left px-4 py-3 font-bold focus:outline-none transition-colors border-l-4 ${activeTab === 'settings' ? 'border-govuk-blue bg-white text-govuk-blue shadow-sm' : 'border-transparent text-govuk-text hover:bg-gray-200'}`}
            >
              <Save className="inline-block mr-2 w-4 h-4" /> Settings
            </button>
          )}
        </div>
      </div>

      <div className="flex-grow min-w-0">
        {activeTab === 'petitions' && (
        <div className="space-y-6">
          <div className="bg-white p-6 border-l-4 border-parliament-green shadow-sm">
            <h2 className="text-2xl font-bold mb-4 italic text-parliament-green">Trending Petitions</h2>
            <p className="text-sm text-govuk-text-secondary mb-8">Review and respond to petitions with high signature counts.</p>

            <div className="space-y-4">
              {allPetitions.length === 0 ? (
                <p className="italic text-gray-500">No petitions found.</p>
              ) : (
                allPetitions
                  .sort((a, b) => (b.signatureCount || 0) - (a.signatureCount || 0))
                  .map(petition => (
                    <div key={petition.id} className="border-2 border-gray-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center bg-white hover:border-parliament-green transition-all shadow-sm group">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                           <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${petition.signatureCount >= 30 ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                             {petition.signatureCount >= 30 ? 'Threshold Reached' : 'Active'}
                           </span>
                           {petition.response && (
                             <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-green-100 text-green-700 border border-green-200">
                               Responded
                             </span>
                           )}
                        </div>
                        <h3 className="text-lg font-bold m-0 group-hover:text-parliament-green transition-colors">{petition.title}</h3>
                        <p className="text-sm text-govuk-text-secondary line-clamp-1">{petition.description}</p>
                      </div>
                      <div className="mt-4 md:mt-0 flex flex-col items-end gap-2">
                        <div className="text-right">
                          <span className="text-2xl font-black text-parliament-green">{(petition.signatureCount || 0).toLocaleString()}</span>
                          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Signatures</span>
                        </div>
                        <div className="flex gap-2">
                          <a 
                            href={`/petitions/${petition.id}`}
                            className="bg-parliament-green text-white px-4 py-2 text-xs font-bold hover:bg-parliament-green-dark transition-colors no-underline block text-center"
                          >
                            View & Respond
                          </a>
                          <button
                            onClick={async () => {
                              if (window.confirm("Are you sure you want to delete this petition?")) {
                                await deleteDoc(doc(db, 'petitions', petition.id));
                              }
                            }}
                            className="bg-red-600 text-white px-4 py-2 text-xs font-bold hover:bg-red-700 transition-colors block text-center"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && role === 'owner' && (
        <div className="space-y-6">
          <div className="bg-white p-6 border-l-4 border-govuk-blue shadow-sm space-y-8">
            <div>
              <h2 className="text-2xl mb-4 font-bold">System Status (Realtime Database)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 border border-govuk-grey">
                  <p className="text-sm text-govuk-text-secondary">Categories Loaded</p>
                  <p className="text-3xl font-bold">{categories.length}</p>
                </div>
                <div className="p-4 bg-gray-50 border border-govuk-grey">
                  <p className="text-sm text-govuk-text-secondary">Pages Loaded</p>
                  <p className="text-3xl font-bold">{pages.length}</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-8">
              <h3 className="text-xl font-bold mb-2">Current Sections</h3>
              <p className="text-sm text-govuk-text-secondary mb-4 italic">
                Note: Standard categories are automatically provided. Database values will take precedence if provided.
              </p>
              {categories.length === 0 ? (
                <p className="text-govuk-error italic">Loading categories...</p>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {categories.map(c => (
                    <div key={c.id || c.slug} className="p-2 border border-govuk-grey bg-gray-50 flex justify-between">
                      <span className="font-bold">{c.name}</span>
                      <span className="text-xs text-govuk-text-secondary font-mono">{c.id || c.slug}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pages' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 border-l-4 border-govuk-blue shadow-sm">
            <div>
              <h2 className="text-3xl m-0 font-bold">Content Builder</h2>
              <p className="text-sm text-govuk-text-secondary">Manage HUK.GOV posts with images and interactive features.</p>
            </div>
            <button 
              onClick={() => setEditingPage({ title: '', content: '', categoryId: categories[0]?.id || '', description: '', slug: '', order: 0, imageUrl: '', pageType: 'article' })}
              className="bg-govuk-green text-white px-8 py-3 font-bold flex items-center hover:bg-govuk-green-hover shadow-md transition-all active:scale-95"
            >
              <Plus className="mr-2 w-5 h-5" /> Create New Post
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {pages.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-govuk-grey bg-gray-50">
                <FileText className="w-12 h-12 mx-auto text-govuk-grey mb-4" />
                <p className="font-bold">No posts created yet</p>
                <p className="text-sm">Click "Create New Post" to start building content.</p>
              </div>
            ) : (
              pages.sort((a,b) => (a.order || 0) - (b.order || 0)).map(p => {
                const category = categories.find(c => c.id === p.categoryId);
                const isHO = p.categoryId === 'home-office';
                return (
                  <div key={p.id} className="border-2 border-govuk-grey p-4 flex justify-between items-center bg-white hover:border-govuk-blue transition-colors group shadow-sm">
                    <div className="flex items-center space-x-4">
                      {p.imageUrl && (
                        <div className="w-16 h-16 bg-gray-100 border overflow-hidden flex-shrink-0">
                          <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${isHO ? 'bg-ho-purple text-white' : 'bg-govuk-blue text-white'}`}>
                            {category?.name || 'Unassigned'}
                          </span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${p.pageType === 'form' ? 'bg-orange-500 text-white' : 'bg-gray-500 text-white'}`}>
                            {p.pageType || 'article'}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold m-0 group-hover:text-govuk-blue transition-colors">{p.title}</h3>
                        <p className="text-sm text-govuk-text-secondary m-0 line-clamp-1">{p.description || 'No description provided'}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      {(role === 'owner' || role === 'admin') && p.pageType === 'form' && (
                        <button onClick={() => setViewingSubmissionsId(p.id)} className="p-3 text-orange-600 hover:bg-orange-50 rounded" title="View Responses"><Inbox className="w-6 h-6" /></button>
                      )}
                      <button onClick={() => setEditingPage(p)} className="p-3 text-govuk-blue hover:bg-govuk-grey-light rounded" title="Edit Content"><Edit className="w-6 h-6" /></button>
                      <button onClick={() => deletePage(p.id)} className="p-3 text-govuk-error hover:bg-red-50 rounded" title="Delete Post"><Trash2 className="w-6 h-6" /></button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'feedback' && (
        <section>
          <h2 className="text-2xl font-bold mb-6">Feedback & Support</h2>
          <div className="bg-white p-6 shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="p-3 font-bold text-sm uppercase">Type</th>
                  <th className="p-3 font-bold text-sm uppercase">Details</th>
                  <th className="p-3 font-bold text-sm uppercase">Submitter</th>
                  <th className="p-3 font-bold text-sm uppercase">Date</th>
                  <th className="p-3 font-bold text-sm uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.map(f => (
                  <tr key={f.id} className="border-b border-gray-200">
                    <td className="p-3 font-bold">{f.type}</td>
                    <td className="p-3 text-sm">{f.details}</td>
                    <td className="p-3 text-sm">{f.submitterEmail}</td>
                    <td className="p-3 text-xs">{new Date(f.createdAt).toLocaleString()}</td>
                    <td className="p-3">
                      <button 
                        onClick={() => deleteDoc(doc(db, 'feedback', f.id))}
                        className="text-red-600 font-bold hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {feedbacks.length === 0 && (
                  <tr><td colSpan={5} className="p-4 text-center">No feedback yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'parliament' && (
        <section>
          <h2 className="text-2xl font-bold mb-6">Parliament Settings</h2>
          <div className="bg-white p-6 shadow-sm max-w-xl">
            <div className="space-y-4">
              <div>
                <label className="block font-bold mb-1">Next Session Date</label>
                <input 
                  type="date" 
                  value={parliamentData.sessionDate} 
                  onChange={(e) => setParliamentData({...parliamentData, sessionDate: e.target.value})}
                  className="w-full border-2 border-govuk-grey p-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Agenda</label>
                <input 
                  type="text" 
                  value={parliamentData.agenda} 
                  onChange={(e) => setParliamentData({...parliamentData, agenda: e.target.value})}
                  className="w-full border-2 border-govuk-grey p-2"
                />
              </div>
              <button 
                onClick={async () => {
                  const newCabinetMap: Record<string, string> = {};
                  users.forEach(u => {
                    if (u.role && u.role !== 'user' && u.role !== 'admin' && u.role !== 'owner' && u.role !== 'standard staff') {
                      const name = u.displayName || u.email;
                      if (newCabinetMap[u.role]) {
                        newCabinetMap[u.role] = `${newCabinetMap[u.role]}, ${name}`;
                      } else {
                        newCabinetMap[u.role] = name;
                      }
                    }
                  });
                  const toSave = { ...parliamentData, cabinetMap: newCabinetMap };
                  await setDoc(doc(db, 'settings', 'parliament'), toSave, { merge: true });
                  alert('Saved parliament settings');
                }}
                className="bg-govuk-blue text-white px-4 py-2 font-bold"
              >
                Save Parliament Settings
              </button>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="bg-white p-6 border-l-4 border-govuk-blue shadow-sm">
            <h2 className="text-2xl font-bold mb-4">Staff & Administrator Access</h2>
            <p className="text-sm text-govuk-text-secondary mb-6">Manage roles and permissions for HUK.GOV personnel.</p>
            <div className="mb-4">
              <button 
                className="bg-govuk-blue text-white px-4 py-2 font-bold"
                onClick={async () => {
                  const newCabinetMap: Record<string, string> = {};
                  users.forEach(u => {
                    if (u.role && u.role !== 'user' && u.role !== 'admin' && u.role !== 'owner' && u.role !== 'standard staff') {
                      const name = u.displayName || u.email;
                      if (newCabinetMap[u.role]) {
                        newCabinetMap[u.role] = `${newCabinetMap[u.role]}, ${name}`;
                      } else {
                        newCabinetMap[u.role] = name;
                      }
                    }
                  });
                  await setDoc(doc(db, 'settings', 'parliament'), { cabinetMap: newCabinetMap }, { merge: true });
                  alert('Synced roles to Parliament');
                }}
              >
                Sync Roles to Parliament Page
              </button>
            </div>
            
            <div className="bg-gray-50 p-6 border border-govuk-grey mb-8">
              <h3 className="text-lg font-bold mb-4">Pre-authorize New Staff Member</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input 
                  type="email" 
                  placeholder="Staff Email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="border-2 border-govuk-grey p-2"
                />
                <input 
                  type="text" 
                  placeholder="Full Name"
                  value={newUser.displayName}
                  onChange={(e) => setNewUser({...newUser, displayName: e.target.value})}
                  className="border-2 border-govuk-grey p-2"
                />
                <select 
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                  className="border-2 border-govuk-grey p-2"
                >
                  <option value="user">Public User</option>
                  <option value="standard staff">Standard Staff</option>
                  <option value="admin">Administrator</option>
                  <option value="Prime Minister">Prime Minister</option>
                  <option value="Deputy Prime Minister">Deputy Prime Minister</option>
                  <option value="Chancellor of the Exchequer">Chancellor</option>
                  <option value="Secretary of State for Wales">Welsh Secretary</option>
                  <option value="Minister for DCMS">DCMS Minister</option>
                  <option value="Home Secretary">Home Secretary</option>
                  <option value="Defence Secretary">Defence Secretary</option>
                  <option value="Justice Secretary">Justice Secretary</option>
                  <option value="Foreign Secretary">Foreign Secretary</option>
                  <option value="Health & Social Secretary">Health Secretary</option>
                  <option value="Leader of the House of Commons">Leader of the Commons</option>
                  <option value="Speaker of the House of Commons">Speaker</option>
                  <option value="Member of Parliament">Member of Parliament</option>
                  <option value="owner">System Owner</option>
                </select>
                <button 
                  onClick={createUser}
                  className="bg-govuk-blue text-white font-bold py-2 px-4 hover:bg-govuk-blue-hover"
                >
                  Add Staff Member
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-govuk-grey">
                    <th className="py-2 px-4">User</th>
                    <th className="py-2 px-4">Role</th>
                    <th className="py-2 px-4">Linked Accounts</th>
                    <th className="py-2 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-govuk-grey hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold">{u.displayName}</div>
                        <div className="text-xs text-govuk-text-secondary">{u.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${u.role === 'owner' ? 'bg-purple-100 text-purple-800 border border-purple-300' : u.role === 'admin' ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-gray-100 text-gray-800 border border-gray-300'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs space-y-1">
                        {u.discordLinked && <div><span className="font-bold text-[#5865F2]">Discord:</span> {u.discordUsername} ({u.discordId})</div>}
                        {u.robloxLinked && <div><span className="font-bold">Roblox:</span> <a href={`https://www.roblox.com/users/${u.robloxId}/profile`} target="_blank" rel="noopener noreferrer" className="text-govuk-blue hover:underline">{u.robloxUsername} ({u.robloxId})</a></div>}
                        {!u.discordLinked && !u.robloxLinked && <span className="text-gray-400 italic">None</span>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <button onClick={() => setEditingUserAccount({...u})} className="text-govuk-blue hover:underline font-bold text-sm">Edit User</button>
                          {u.email !== 'jimstke@gmail.com' && u.id !== user?.uid && (
                            <>
                              <select 
                                value={u.role || 'user'} 
                                onChange={(e) => updateUserRole(u.id, e.target.value)}
                                className="text-sm border-2 border-govuk-grey p-1 focus:border-govuk-blue outline-none"
                              >
                                <option value="user">User</option>
                                <option value="standard staff">Standard Staff</option>
                                <option value="admin">Administrator</option>
                                <option value="Prime Minister">Prime Minister</option>
                                <option value="Deputy Prime Minister">Deputy Prime Minister</option>
                                <option value="Chancellor of the Exchequer">Chancellor</option>
                                <option value="Secretary of State for Wales">Welsh Secretary</option>
                                <option value="Minister for DCMS">DCMS Minister</option>
                                <option value="Home Secretary">Home Secretary</option>
                                <option value="Defence Secretary">Defence Secretary</option>
                                <option value="Justice Secretary">Justice Secretary</option>
                                <option value="Foreign Secretary">Foreign Secretary</option>
                                <option value="Health & Social Secretary">Health Secretary</option>
                                <option value="Leader of the House of Commons">Leader of the Commons</option>
                                <option value="Speaker of the House of Commons">Speaker</option>
                                <option value="Member of Parliament">Member of Parliament</option>
                                {role === 'owner' && <option value="owner">Owner</option>}
                              </select>
                              <button 
                                onClick={() => deleteUser(u.id)}
                                className="p-2 text-govuk-error hover:bg-red-50 rounded"
                                title="Delete user"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {(u.email === 'jimstke@gmail.com' || u.id === user?.uid) && (
                            <span className="text-xs italic text-govuk-text-secondary">Self / Protected</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {viewingSubmissionsId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[1001] backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-5xl p-8 shadow-2xl space-y-6 my-8 rounded-lg"
          >
            <div className="flex justify-between items-center border-b-2 border-govuk-black pb-4">
              <div className="flex items-center space-x-3">
                <button onClick={() => setViewingSubmissionsId(null)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="p-2 bg-orange-500 text-white rounded">
                   <Inbox className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="m-0 text-2xl font-bold">Form Submissions</h2>
                  <p className="text-sm text-gray-500">{pages.find(p => p.id === viewingSubmissionsId)?.title}</p>
                </div>
              </div>
              <button onClick={() => setViewingSubmissionsId(null)} className="hover:bg-gray-100 p-2 rounded-full transition-colors">
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="bg-gray-50 p-6 border border-govuk-grey min-h-[400px]">
              {submissions.length === 0 ? (
                <div className="text-center py-20 flex flex-col items-center">
                  <Inbox className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-xl font-bold text-gray-400 italic">No responses received yet for this form.</p>
                </div>
              ) : (
                <div className="overflow-x-auto bg-white border border-govuk-grey rounded shadow-inner">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-govuk-grey">
                        <th className="py-3 px-4 text-xs uppercase font-bold text-gray-600 w-48">Submission Info</th>
                        <th className="py-3 px-4 text-xs uppercase font-bold text-gray-600">Response Data</th>
                        <th className="py-3 px-4 w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.sort((a,b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()).map(s => (
                        <tr key={s.id} className="border-b border-govuk-grey hover:bg-orange-50 transition-colors align-top">
                          <td className="py-4 px-4 space-y-2">
                             <div className="font-mono text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded inline-block">
                                {s.referenceId || 'N/A'}
                             </div>
                             <div className="text-[10px] text-gray-400">
                                {new Date(s.submittedAt).toLocaleString()}
                             </div>
                          </td>
                          <td className="py-4 px-4">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                               {Object.entries(s.data || {}).map(([key, val]: [string, any]) => (
                                 <div key={key} className="space-y-1">
                                   <dt className="text-[10px] uppercase font-bold text-govuk-blue">{key}</dt>
                                   <dd className="text-sm text-govuk-text block border-l-2 border-orange-200 pl-3 leading-relaxed whitespace-pre-wrap">{val}</dd>
                                 </div>
                               ))}
                             </div>
                          </td>
                          <td className="py-4 px-4">
                            <button 
                              onClick={async () => {
                                if (confirm('Delete this submission?')) {
                                  try {
                                    await deleteDoc(doc(db, `pages/${viewingSubmissionsId}/submissions`, s.id));
                                  } catch (e) {
                                    handleDatabaseError(e, OperationType.DELETE, `pages/${viewingSubmissionsId}/submissions/${s.id}`);
                                  }
                                }
                              }}
                              className="text-govuk-error hover:bg-red-50 p-2 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="flex justify-end pt-4">
              <button 
                onClick={() => setViewingSubmissionsId(null)}
                className="govuk-button bg-govuk-blue text-white px-8 py-3 font-bold hover:bg-govuk-blue-hover shadow-md transition-all active:scale-95"
              >
                Close Submissions
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {editingUserAccount && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[1001] backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-2xl p-8 shadow-2xl space-y-6 my-8 rounded-lg"
          >
            <div className="flex justify-between items-center border-b-2 border-govuk-black pb-4">
              <h2 className="m-0 text-2xl font-bold">Edit User Details</h2>
              <button onClick={() => setEditingUserAccount(null)} className="p-2 hover:bg-gray-100"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-1 text-sm">Display Name</label>
                <input 
                  type="text" 
                  value={editingUserAccount.displayName || ''} 
                  onChange={e => setEditingUserAccount({...editingUserAccount, displayName: e.target.value})}
                  className="w-full border-2 border-govuk-grey p-2 outline-none focus:border-govuk-blue"
                />
              </div>
              <div>
                <label className="block font-bold mb-1 text-sm">Email</label>
                <input 
                  type="email" 
                  value={editingUserAccount.email || ''} 
                  onChange={e => setEditingUserAccount({...editingUserAccount, email: e.target.value})}
                  className="w-full border-2 border-govuk-grey p-2 outline-none focus:border-govuk-blue"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-sm">Discord Linking</label>
                <label className="flex items-center space-x-2 text-sm mb-2">
                  <input 
                    type="checkbox" 
                    checked={editingUserAccount.discordLinked || false}
                    onChange={e => setEditingUserAccount({...editingUserAccount, discordLinked: e.target.checked})}
                  />
                  <span>Discord Account Linked</span>
                </label>
                <input 
                  type="text" 
                  placeholder="Discord Username"
                  value={editingUserAccount.discordUsername || ''} 
                  onChange={e => setEditingUserAccount({...editingUserAccount, discordUsername: e.target.value})}
                  className="w-full border-2 border-govuk-grey p-2 outline-none focus:border-govuk-blue mb-2"
                />
                <input 
                  type="text" 
                  placeholder="Discord ID"
                  value={editingUserAccount.discordId || ''} 
                  onChange={e => setEditingUserAccount({...editingUserAccount, discordId: e.target.value})}
                  className="w-full border-2 border-govuk-grey p-2 outline-none focus:border-govuk-blue"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-sm">Roblox Linking</label>
                <label className="flex items-center space-x-2 text-sm mb-2">
                  <input 
                    type="checkbox" 
                    checked={editingUserAccount.robloxLinked || false}
                    onChange={e => setEditingUserAccount({...editingUserAccount, robloxLinked: e.target.checked})}
                  />
                  <span>Roblox Account Linked</span>
                </label>
                <input 
                  type="text" 
                  placeholder="Roblox Username"
                  value={editingUserAccount.robloxUsername || ''} 
                  onChange={e => setEditingUserAccount({...editingUserAccount, robloxUsername: e.target.value})}
                  className="w-full border-2 border-govuk-grey p-2 outline-none focus:border-govuk-blue mb-2"
                />
                <input 
                  type="text" 
                  placeholder="Roblox ID"
                  value={editingUserAccount.robloxId || ''} 
                  onChange={e => setEditingUserAccount({...editingUserAccount, robloxId: e.target.value})}
                  className="w-full border-2 border-govuk-grey p-2 outline-none focus:border-govuk-blue"
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block font-bold mb-1 text-sm">Primary Access Level</label>
                <select 
                  value={editingUserAccount.role || 'user'} 
                  onChange={(e) => setEditingUserAccount({...editingUserAccount, role: e.target.value})}
                  className="w-full text-sm border-2 border-govuk-grey p-2 focus:border-govuk-blue outline-none font-bold"
                >
                  <option value="user">User</option>
                  <option value="standard staff">Standard Staff</option>
                  <option value="admin">Administrator</option>
                  <option value="owner">System Owner</option>
                </select>
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block font-bold mb-2 text-sm">Additional Roles/Titles (Optional)</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border-2 border-govuk-grey p-4 bg-gray-50 max-h-48 overflow-y-auto">
                  {['Prime Minister', 'Deputy Prime Minister', 'Chancellor of the Exchequer', 'Secretary of State for Wales', 'Minister for DCMS', 'Home Secretary', 'Defence Secretary', 'Justice Secretary', 'Foreign Secretary', 'Health & Social Secretary', 'Leader of the House of Commons', 'Speaker of the House of Commons', 'Member of Parliament'].map(r => (
                    <label key={r} className="flex items-center space-x-2 text-sm cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={(editingUserAccount.roles || []).includes(r)}
                        onChange={(e) => {
                          const currentRoles = editingUserAccount.roles || [];
                          if (e.target.checked) setEditingUserAccount({...editingUserAccount, roles: [...currentRoles, r]});
                          else setEditingUserAccount({...editingUserAccount, roles: currentRoles.filter((cr: string) => cr !== r)});
                        }}
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
              <button 
                onClick={() => setEditingUserAccount(null)}
                className="px-6 py-2 border-2 border-govuk-grey font-bold hover:bg-gray-100 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button 
                onClick={saveUserAccount} 
                className="px-8 py-2 bg-govuk-blue text-white font-bold hover:bg-govuk-blue-hover flex items-center shadow-md active:scale-95 transition-all"
              >
                <Save className="mr-2 w-5 h-5" /> Save User Profile
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {editingPage && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[1001] backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-6xl p-8 shadow-2xl space-y-6 my-8 rounded-lg"
          >
            <div className="flex justify-between items-center border-b-2 border-govuk-black pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-govuk-blue text-white rounded">
                   <Layout className="w-6 h-6" />
                </div>
                <h2 className="m-0 text-3xl font-bold">{editingPage.id ? 'Edit Content' : 'New Publication'}</h2>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex bg-gray-100 p-1 rounded border border-gray-300">
                   <button 
                     onClick={() => setShowPreview(false)}
                     className={`px-4 py-1 text-xs font-bold rounded ${!showPreview ? 'bg-white shadow-sm text-govuk-blue' : 'text-gray-500 hover:text-gray-700'}`}
                   >
                     Editor
                   </button>
                   <button 
                     onClick={() => setShowPreview(true)}
                     className={`px-4 py-1 text-xs font-bold rounded ${showPreview ? 'bg-white shadow-sm text-govuk-blue' : 'text-gray-500 hover:text-gray-700'}`}
                   >
                     Live Preview
                   </button>
                </div>
                <button 
                  onClick={() => setEditingPage(null)}
                  className="hover:bg-gray-100 p-2 rounded-full transition-colors"
                  title="Discard draft"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Metadata */}
              <div className="lg:col-span-3 space-y-6 bg-gray-50 p-6 border border-govuk-grey rounded-md">
                <h3 className="text-lg font-bold border-b pb-2 flex items-center">
                  <Layout className="w-4 h-4 mr-2" /> Basic Info
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block font-bold mb-1 text-sm">Post Title</label>
                    <input 
                      type="text" 
                      value={editingPage.title}
                      onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                      className="w-full border-2 border-govuk-grey p-2 focus:border-govuk-blue outline-none font-bold"
                      placeholder="e.g. Apply for a HUK Passport"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-sm">URL Slug</label>
                    <div className="flex space-x-1">
                      <input 
                        type="text" 
                        value={editingPage.slug}
                        onChange={(e) => setEditingPage({ ...editingPage, slug: e.target.value })}
                        className="flex-1 border-2 border-govuk-grey p-2 focus:border-govuk-blue outline-none font-mono text-xs"
                      />
                      <button 
                         onClick={() => setEditingPage({ ...editingPage, slug: editingPage.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') })}
                         className="bg-gray-200 px-2 text-[10px] uppercase font-bold border border-gray-400"
                      >
                         Auto
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-sm">Target Section</label>
                    <select 
                      value={editingPage.categoryId}
                      onChange={(e) => setEditingPage({ ...editingPage, categoryId: e.target.value })}
                      className="w-full border-2 border-govuk-grey p-2 focus:border-govuk-blue outline-none font-bold"
                    >
                      <option value="">-- Select Section --</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-sm">Page Type</label>
                    <div className="grid grid-cols-2 gap-2">
                       <button 
                         onClick={() => setEditingPage({ ...editingPage, pageType: 'article' })}
                         className={`p-2 border-2 font-bold text-sm flex items-center justify-center ${editingPage.pageType !== 'form' ? 'bg-govuk-blue text-white border-govuk-blue' : 'bg-white border-govuk-grey'}`}
                       >
                         <FileText className="w-4 h-4 mr-2" /> Article
                       </button>
                       <button 
                         onClick={() => setEditingPage({ ...editingPage, pageType: 'form' })}
                         className={`p-2 border-2 font-bold text-sm flex items-center justify-center ${editingPage.pageType === 'form' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-govuk-grey'}`}
                       >
                         <FileQuestion className="w-4 h-4 mr-2" /> Form
                       </button>
                    </div>
                    {editingPage.pageType === 'form' && (
                      <div className="mt-6 border-t pt-6">
                        <label className="block font-bold mb-4 text-sm flex items-center">
                          <FileQuestion className="w-4 h-4 mr-2" /> Form Question Builder
                        </label>
                        <div className="space-y-4">
                          {(editingPage.questions || []).map((q: any, index: number) => (
                            <div key={index} className="p-4 bg-white border border-govuk-grey rounded shadow-sm relative group">
                              <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  disabled={index === 0}
                                  onClick={() => {
                                    const newQs = [...editingPage.questions];
                                    [newQs[index-1], newQs[index]] = [newQs[index], newQs[index-1]];
                                    setEditingPage({ ...editingPage, questions: newQs });
                                  }}
                                  className="text-gray-400 hover:text-govuk-blue p-1 disabled:opacity-30"
                                >
                                  ↑
                                </button>
                                <button 
                                  disabled={index === editingPage.questions.length - 1}
                                  onClick={() => {
                                    const newQs = [...editingPage.questions];
                                    [newQs[index+1], newQs[index]] = [newQs[index], newQs[index+1]];
                                    setEditingPage({ ...editingPage, questions: newQs });
                                  }}
                                  className="text-gray-400 hover:text-govuk-blue p-1 disabled:opacity-30"
                                >
                                  ↓
                                </button>
                                <button 
                                  onClick={() => {
                                    const newQs = [...editingPage.questions];
                                    newQs.splice(index, 1);
                                    setEditingPage({ ...editingPage, questions: newQs });
                                  }}
                                  className="text-govuk-error hover:bg-red-50 p-1 rounded transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[10px] block font-bold uppercase text-gray-400">Question Text</label>
                                  <input 
                                    type="text" 
                                    value={q.text}
                                    onChange={(e) => {
                                      const newQs = [...editingPage.questions];
                                      newQs[index].text = e.target.value;
                                      setEditingPage({ ...editingPage, questions: newQs });
                                    }}
                                    className="w-full text-sm border-b border-gray-300 focus:border-govuk-blue outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] block font-bold uppercase text-gray-400">Type</label>
                                  <select 
                                    value={q.type}
                                    onChange={(e) => {
                                      const newQs = [...editingPage.questions];
                                      newQs[index].type = e.target.value;
                                      setEditingPage({ ...editingPage, questions: newQs });
                                    }}
                                    className="w-full text-sm border-b border-gray-300 focus:border-govuk-blue outline-none"
                                  >
                                    <option value="text">Short Text</option>
                                    <option value="textarea">Long Text</option>
                                    <option value="select">Dropdown</option>
                                    <option value="verify_discord">Verify with Discord</option>
                                    <option value="verify_roblox">Verify with Roblox</option>
                                  </select>
                                </div>
                              </div>
                              {q.type === 'select' && (
                                <div className="mt-3">
                                  <label className="text-[10px] block font-bold uppercase text-gray-400">Options (Comma separated)</label>
                                  <input 
                                    type="text" 
                                    value={q.options || ''}
                                    onChange={(e) => {
                                      const newQs = [...editingPage.questions];
                                      newQs[index].options = e.target.value;
                                      setEditingPage({ ...editingPage, questions: newQs });
                                    }}
                                    className="w-full text-sm border-b border-gray-300 focus:border-govuk-blue outline-none"
                                    placeholder="Option 1, Option 2, Option 3"
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                          <button 
                            onClick={() => {
                              const newQs = [...(editingPage.questions || []), { text: '', type: 'text', options: '' }];
                              setEditingPage({ ...editingPage, questions: newQs });
                            }}
                            className="w-full py-2 border-2 border-dashed border-govuk-grey text-govuk-text-secondary hover:border-govuk-blue hover:text-govuk-blue transition-colors flex items-center justify-center font-bold text-sm"
                          >
                            <Plus className="w-4 h-4 mr-2" /> Add Question
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-8 space-y-4 pt-6 border-t">
                      <div>
                        <label className="block font-bold mb-1 text-sm">Hero Image URL (Optional)</label>
                        <div className="relative">
                          <ImageIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                          <input 
                            type="text" 
                            value={editingPage.imageUrl || ''}
                            onChange={(e) => setEditingPage({ ...editingPage, imageUrl: e.target.value })}
                            className="w-full border-2 border-govuk-grey p-2 pl-10 focus:border-govuk-blue outline-none text-sm"
                            placeholder="https://example.com/image.jpg"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold mb-1 text-sm">Priority (Order - 1 for Featured)</label>
                        <input 
                          type="number" 
                          value={editingPage.order || 0}
                          onChange={(e) => setEditingPage({ ...editingPage, order: parseInt(e.target.value) })}
                          className="w-80 border-2 border-govuk-grey p-2 focus:border-govuk-blue outline-none"
                        />
                        <p className="text-[10px] text-gray-500 mt-1 italic">Note: Set to 1 to feature this content at the top of the category page.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center Column: Editor / Preview */}
              <div className="lg:col-span-9 flex flex-col space-y-4">
                {showPreview ? (
                  <div className="bg-white border-2 border-govuk-grey p-8 flex flex-col h-[600px] overflow-y-auto">
                    <div className="max-w-3xl mx-auto w-full">
                      {editingPage.imageUrl && (
                        <div className="mb-8 w-full aspect-video bg-gray-100 border">
                          <img src={editingPage.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <h1 className="text-4xl font-bold mb-4">{editingPage.title || 'Untitled Page'}</h1>
                      <div className="prose prose-slate max-w-none markdown-body whitespace-pre-wrap">
                         <ReactMarkdown>{editingPage.content || '_No content yet_'}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center bg-gray-50 p-2 border border-govuk-grey">
                       <h3 className="text-sm font-bold uppercase text-govuk-text-secondary">Main Content Editor</h3>
                       <div className="text-[10px] text-gray-400">Markdown supported</div>
                    </div>
                    <textarea 
                      rows={20}
                      value={editingPage.content}
                      onChange={(e) => setEditingPage({ ...editingPage, content: e.target.value })}
                      className="w-full border-2 border-govuk-grey p-4 focus:border-govuk-blue outline-none font-mono text-sm leading-relaxed grow shadow-inner bg-gray-50/50 min-h-[500px]"
                      placeholder="# Enter your content using Markdown..."
                    />
                  </>
                )}
                
                {!showPreview && (
                  <div className="bg-blue-50 p-4 border border-blue-200 text-sm">
                    <h4 className="font-bold mb-1 flex items-center"><ImageIcon className="w-4 h-4 mr-2" /> Image Config</h4>
                    {editingPage.imageUrl ? (
                      <div className="flex space-x-4 items-center">
                        <div className="h-20 w-32 bg-black/5 flex items-center justify-center overflow-hidden border border-gray-300 rounded">
                           <img src={editingPage.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="text-xs text-blue-800">
                          Image will be displayed at the top of the {editingPage.pageType === 'form' ? 'form' : 'article'}.
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">No image provided for this post.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-8 border-t-2 border-govuk-grey">
              <div className="text-sm text-govuk-text-secondary flex items-center">
                 <div className="w-2 h-2 rounded-full bg-govuk-green animate-pulse mr-2" /> 
                 Draft autosaved to your browser local state (UI only)
              </div>
              <div className="flex space-x-4">
                <button 
                  onClick={() => setEditingPage(null)} 
                  className="px-8 py-3 border-2 border-govuk-grey font-bold hover:bg-gray-100 transition-colors shadow-sm"
                >
                  Discard Changes
                </button>
                <button 
                  onClick={() => savePage(editingPage)} 
                  className="px-12 py-3 bg-govuk-green text-white font-bold hover:bg-govuk-green-hover flex items-center shadow-lg active:scale-95 transition-all text-xl"
                >
                  <Save className="mr-3 w-6 h-6" /> Publish Post
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      </div>
    </div>
  );
}
