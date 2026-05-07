import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, handleFirestoreError as handleDatabaseError, OperationType } from '../lib/firebase';
import { doc, getDoc, updateDoc, onSnapshot, increment, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useAuth } from '../AuthContext';
import { motion } from 'motion/react';
import { CheckCircle, Clock, Info, User } from 'lucide-react';
import { CrownIcon } from './GDSComponents';

export default function PetitionDetail() {
  const { id } = useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [petition, setPetition] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasSigned, setHasSigned] = useState(false);
  const [signing, setSigning] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  useEffect(() => {
    if (!id) return;

    const petitionRef = doc(db, 'petitions', id);
    const unsub = onSnapshot(petitionRef, (snapshot) => {
      if (snapshot.exists()) {
        setPetition({ id, ...snapshot.data() });
      } else {
        setPetition(null);
      }
      setLoading(false);
    });

    if (user) {
      const sigRef = doc(db, `petitions/${id}/signatures`, user.uid);
      getDoc(sigRef).then(snap => setHasSigned(snap.exists()));
    }

    return () => unsub();
  }, [id, user]);

  const handleSign = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!id || hasSigned || signing) return;

    setSigning(true);
    try {
      const batch = writeBatch(db);
      
      batch.set(doc(db, `petitions/${id}/signatures`, user.uid), {
        signedAt: serverTimestamp(),
        name: user.displayName || user.email?.split('@')[0] || 'Anonymous'
      });
      
      batch.update(doc(db, 'petitions', id), {
        signatureCount: increment(1)
      });
      
      await batch.commit();

      setHasSigned(true);
    } catch (e: any) {
      console.error('Signing failed:', e);
      try {
        handleDatabaseError(e, OperationType.UPDATE, `petitions/${id}/signatures/${user?.uid}`);
      } catch (err: any) {
        alert(`Failed to sign petition: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setSigning(false);
    }
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !adminResponse) return;
    setIsSubmittingResponse(true);

    try {
      await updateDoc(doc(db, 'petitions', id), {
        response: {
          text: adminResponse,
          respondedAt: new Date().toISOString(),
          responderName: user?.displayName || 'Government Spokesperson',
          responderRole: role
        }
      });
      setAdminResponse('');
    } catch (e) {
      console.error('Response failed:', e);
      alert('Failed to submit response.');
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  if (loading) return (
    <div className="govuk-width-container govuk-main-wrapper text-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-parliament-green mx-auto"></div>
    </div>
  );

  if (!petition) return (
    <div className="govuk-width-container govuk-main-wrapper text-center">
      <h1 className="govuk-heading-l">Petition not found</h1>
      <button onClick={() => navigate('/petitions')} className="govuk-button">Back to petitions</button>
    </div>
  );

  const PROGRESS_15 = Math.min((petition.signatureCount / 15) * 100, 100);
  const PROGRESS_20 = Math.min((petition.signatureCount / 20) * 100, 100);

  const canRespond = role === 'admin' || role === 'owner' || role === 'standard staff';

  return (
    <div className="govuk-width-container govuk-main-wrapper">
      <div className="mb-4">
        <button onClick={() => navigate('/petitions')} className="text-parliament-green font-bold hover:underline py-2 block">
          ← All petitions
        </button>
      </div>

      <div className="flex items-center gap-3 mb-12 bg-parliament-green text-white p-6 shadow-md">
        <CrownIcon width={48} height={48} className="shrink-0 text-white fill-current" />
        <div>
          <h1 className="text-4xl font-bold m-0 text-white italic">Petitions</h1>
          <p className="text-base font-medium m-0 opacity-90">UK Government and Parliament</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <header>
            <h1 className="govuk-heading-xl mb-6">{petition.title}</h1>
            <div className="flex flex-wrap gap-4 items-center text-govuk-grey-dark govuk-body-s">
              <span className="flex items-center gap-1"><Clock size={16} /> Created {(petition.createdAt?.toDate ? petition.createdAt.toDate() : new Date(petition.createdAt)).toLocaleDateString()}</span>
              <span className="flex items-center gap-1"><User size={16} /> Created by {petition.creatorName}</span>
              <span className="bg-parliament-green-light text-parliament-green px-2 py-0.5 font-bold uppercase tracking-wide">Status: {petition.status}</span>
            </div>
          </header>

          <div className="bg-white p-8 border-l-8 border-parliament-green shadow-sm">
            <h2 className="govuk-heading-m mb-4">Petition description</h2>
            <div className="govuk-body whitespace-pre-wrap leading-relaxed text-govuk-grey-dark">
              {petition.description}
            </div>
          </div>

          {petition.response && (
            <section className="bg-parliament-green-light p-10 border-t-8 border-parliament-green">
              <h2 className="govuk-heading-l mb-6 flex items-center gap-3">
                <CheckCircle className="text-parliament-green" size={32} /> Government response
              </h2>
              <div className="govuk-body text-govuk-black font-bold mb-4">
                This response was given on {new Date(petition.response.respondedAt).toLocaleDateString()}
              </div>
              <div className="govuk-body whitespace-pre-wrap leading-relaxed mb-6 italic">
                "{petition.response.text}"
              </div>
              <p className="govuk-body-s text-govuk-grey-dark border-t border-parliament-green/20 pt-4">
                Response provided by {petition.response.responderName} ({petition.response.responderRole})
              </p>
            </section>
          )}

          {canRespond && (
            <section className="bg-white p-8 border-2 border-govuk-grey shadow-sm">
              <h2 className="govuk-heading-m mb-4">Official Staff Response</h2>
              <form onSubmit={handleSubmitResponse} className="space-y-4">
                <textarea 
                  className="govuk-textarea focus:border-parliament-green"
                  rows={5}
                  placeholder="Enter the official government response here..."
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  required
                />
                <button 
                  type="submit" 
                  disabled={isSubmittingResponse}
                  className="bg-parliament-green text-white px-6 py-3 font-bold hover:bg-parliament-green-dark transition-colors"
                >
                  {isSubmittingResponse ? 'Posting...' : (petition.response ? 'Update Response' : 'Post Response')}
                </button>
              </form>
            </section>
          )}
        </div>

        <div className="space-y-8">
          <div className="bg-parliament-green text-white p-8 shadow-xl">
            <p className="govuk-heading-xl mb-0 text-white">{(petition.signatureCount || 0).toLocaleString()}</p>
            <p className="govuk-body-l font-bold uppercase tracking-widest text-white/90 border-b border-white/20 pb-4 mb-8">signatures</p>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm font-bold mb-2">
                  <span>15 signatures threshold</span>
                  <span>{PROGRESS_15.toFixed(0)}%</span>
                </div>
                <div className="h-4 bg-white/20 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${PROGRESS_15}%` }}
                    className="h-full bg-white"
                  />
                </div>
                <p className="text-xs mt-2 opacity-80">At 15 signatures, the government will respond to this petition.</p>
              </div>

              <div>
                <div className="flex justify-between text-sm font-bold mb-2">
                  <span>20 signatures threshold</span>
                  <span>{PROGRESS_20.toFixed(0)}%</span>
                </div>
                <div className="h-4 bg-white/20 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${PROGRESS_20}%` }}
                    className="h-full bg-white opacity-60"
                  />
                </div>
                <p className="text-xs mt-2 opacity-80">At 20 signatures, this petition will be considered for debate in Parliament.</p>
              </div>
            </div>

            <button 
              onClick={handleSign}
              disabled={hasSigned || signing}
              className={`w-full mt-8 py-4 px-6 text-lg font-bold transition-all shadow-lg ${
                hasSigned 
                  ? 'bg-govuk-green text-white cursor-default' 
                  : (signing ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-white text-parliament-green hover:bg-parliament-green-light')
              }`}
            >
              {hasSigned ? (
                <span className="flex items-center justify-center gap-2"><CheckCircle size={24} /> You've signed this</span>
              ) : (
                signing ? 'Signing...' : 'Sign this petition'
              )}
            </button>
            {!user && (
              <p className="text-center text-xs mt-4 opacity-80">You must be signed in to sign petitions.</p>
            )}
          </div>

          <div className="bg-parliament-green-light p-6">
            <div className="flex items-start gap-2">
              <Info className="text-parliament-green shrink-0" size={20} />
              <div className="govuk-body-s text-govuk-grey-dark">
                <strong>Government Digital Service</strong>
                <p className="mt-1">Petitions are monitored 24/7 for compliance with our standards. Obscene or abusive petitions will be removed.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
