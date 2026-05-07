import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError as handleDatabaseError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useAuth } from '../AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, Filter, MessageSquare, ChevronRight } from 'lucide-react';
import { CrownIcon } from './GDSComponents';

export default function Petitions() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [petitions, setPetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPetition, setNewPetition] = useState({ title: '', description: '' });

  useEffect(() => {
    const petitionsRef = collection(db, 'petitions');
    return onSnapshot(petitionsRef, (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPetitions(list.sort((a: any, b: any) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (new Date(a.createdAt).getTime() || 0);
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (new Date(b.createdAt).getTime() || 0);
            return timeB - timeA;
        }));
      } else {
        setPetitions([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Petitions sync error:', error);
      setLoading(false);
    });
  }, []);

  const handleCreatePetition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('You must be signed in to start a petition.');
      navigate('/login');
      return;
    }

    setCreating(true);
    try {
      const petitionsRef = collection(db, 'petitions');
      const newRef = doc(petitionsRef);
      const petitionKey = newRef.id;

      if (!petitionKey) throw new Error('Failed to generate petition ID');

      const batch = writeBatch(db);

      batch.set(newRef, {
        title: newPetition.title,
        description: newPetition.description,
        creatorId: user.uid,
        creatorName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        createdAt: serverTimestamp(),
        status: 'open',
        signatureCount: 1
      });

      batch.set(doc(db, `petitions/${petitionKey}/signatures`, user.uid), {
        signedAt: serverTimestamp(),
        name: user.displayName || user.email?.split('@')[0] || 'Anonymous'
      });

      await batch.commit();

      setShowCreateModal(false);
      setNewPetition({ title: '', description: '' });
      navigate(`/petitions/${petitionKey}`);
    } catch (error: any) {
      console.error('Error creating petition:', error);
      const msg = error.message || '';
      if (msg.includes('PERMISSION_DENIED')) {
        alert('Permission Denied: Your account doesn\'t have permission to start a petition, or your session may have expired. Please try signing out and in again.');
      } else {
        alert(`Failed to start petition: ${msg}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const filteredPetitions = petitions.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="govuk-width-container govuk-main-wrapper">
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6 bg-parliament-green text-white p-4">
          <CrownIcon width={40} height={40} className="shrink-0 text-white fill-current" />
          <div>
            <h1 className="text-3xl font-bold m-0 text-white italic">Petitions</h1>
            <p className="text-sm font-medium m-0 opacity-90">UK Government and Parliament</p>
          </div>
        </div>



        <div className="flex flex-col md:flex-row gap-4 mb-12">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-govuk-grey-dark" size={20} />
            <input 
              type="text"
              placeholder="Search petitions..."
              className="w-full pl-12 pr-4 py-4 border-4 border-parliament-green focus:outline-none focus:ring-4 focus:ring-govuk-focus text-lg font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-parliament-green text-white px-8 py-4 text-lg font-bold hover:bg-parliament-green-dark transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={24} /> Start a petition
          </button>
        </div>

        <div className="space-y-8">
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-parliament-green mx-auto mb-4"></div>
              <p className="govuk-body">Loading petitions...</p>
            </div>
          ) : filteredPetitions.length > 0 ? (
            filteredPetitions.map(petition => (
              <Link 
                key={petition.id} 
                to={`/petitions/${petition.id}`}
                className="block bg-white p-8 border-l-8 border-parliament-green shadow-md hover:shadow-lg transition-all group no-underline"
              >
                <div className="flex justify-between items-start mb-4">
                  <h2 className="govuk-heading-l mb-0 group-hover:text-parliament-green transition-colors underline underline-offset-8 decoration-2">{petition.title}</h2>
                  <div className="text-right">
                    <p className="govuk-heading-m mb-0 text-parliament-green">{(petition.signatureCount || 0).toLocaleString()}</p>
                    <p className="govuk-body-s text-govuk-grey-dark font-bold uppercase tracking-wider">signatures</p>
                  </div>
                </div>
                <p className="govuk-body text-govuk-grey-dark line-clamp-3 mb-6 max-w-3xl">
                  {petition.description}
                </p>
                <div className="flex items-center text-parliament-green font-bold">
                  View petition <ChevronRight size={20} className="ml-1" />
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-20 bg-govuk-grey-light border-4 border-dashed border-govuk-grey">
              <p className="govuk-heading-m text-govuk-grey-dark">No petitions found</p>
              <p className="govuk-body text-govuk-grey-dark">Try searching for something else or start your own petition.</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-2xl p-8 shadow-2xl border-t-8 border-parliament-green"
            >
              <h2 className="govuk-heading-xl mb-8">Start a new petition</h2>
              <form onSubmit={handleCreatePetition} className="space-y-6">
                <div className="space-y-8">
                  <div>
                    <label className="block text-2xl font-black mb-2 text-govuk-black tracking-tight">What do you want the government to do?</label>
                    <p className="text-govuk-text mt-1 mb-4 opacity-75">Be specific about who you want to act and what you want them to do.</p>
                    <input 
                      type="text"
                      required
                      maxLength={100}
                      placeholder="e.g. Stop the proposed development on Green Lane"
                      className="w-full text-2xl font-bold p-5 border-4 border-govuk-black bg-white focus:outline-none focus:ring-8 focus:ring-govuk-focus transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] focus:shadow-none placeholder:text-gray-300"
                      value={newPetition.title}
                      onChange={(e) => setNewPetition({...newPetition, title: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-2xl font-black mb-2 text-govuk-black tracking-tight">Why is this important?</label>
                    <p className="text-govuk-text mt-1 mb-4 opacity-75">Provide more detail on the issue and what outcomes you're looking for.</p>
                    <textarea 
                      required
                      rows={10}
                      placeholder="Explain the background and your reasons for this petition. Include any evidence or examples that support your case..."
                      className="w-full text-xl p-5 border-4 border-govuk-black bg-white focus:outline-none focus:ring-8 focus:ring-govuk-focus transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] focus:shadow-none placeholder:text-gray-300"
                      value={newPetition.description}
                      onChange={(e) => setNewPetition({...newPetition, description: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 pt-8">
                  <button 
                    type="submit"
                    disabled={creating}
                    className="bg-govuk-green text-white px-10 py-5 text-xl font-bold hover:bg-govuk-green-dark transition-all flex-grow shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                  >
                    {creating ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Launching...
                      </span>
                    ) : 'Launch petition'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="bg-white text-govuk-black border-4 border-govuk-black px-8 py-5 text-xl font-bold hover:bg-gray-100 transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
