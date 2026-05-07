import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Link, useNavigate } from 'react-router-dom';

export default function ApplyCitizenship() {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [formStep, setFormStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    { text: 'Roleplay Name' },
    { text: 'How did you find us?' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      const data: any = {};
      const formData = new FormData(e.target as HTMLFormElement);
      formData.forEach((value, key) => {
        data[key] = value;
      });

      // Inject linked data
      if (userData?.discordLinked) {
        data['Discord Username'] = userData.discordUsername || '';
        data['Discord ID'] = userData.discordId || '';
      }
      if (userData?.robloxLinked) {
        data['ROBLOX Username'] = userData.robloxUsername || '';
        data['ROBLOX ID'] = userData.robloxId || '';
        data['Link to ROBLOX profile'] = userData.robloxId ? `https://www.roblox.com/users/${userData.robloxId}/profile` : '';
      }

      const refId = `HUK-CTZ-${Math.floor(Math.random() * 90000) + 10000}`;
      await addDoc(collection(db, `pages/citizenship/submissions`), {
        authorId: user.uid,
        createdAt: serverTimestamp(),
        referenceId: refId,
        data
      });
      setFormStep(2);
    } catch (err: any) {
      setError(err.message || 'An error occurred during submission.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="govuk-width-container govuk-main-wrapper flex flex-col items-center">
      <div className="w-full max-w-3xl">
        {formStep === 0 && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <h1 className="text-4xl font-bold mb-4">Apply for HUK citizenship</h1>
            <div className="prose prose-slate max-w-none text-lg">
              <p>If you wish to become a recognised citizen of the HUK and gain full legal rights and responsibilities, you can apply for full citizenship here.</p>
              <br/>
              <p>This service allows eligible individuals to submit an application, provide required documentation, and begin the process of formal citizenship approval.</p>
            </div>
            
            <div className="pt-8 border-t border-govuk-grey">
              {!user ? (
                <div className="bg-blue-50 p-6 border-l-4 border-govuk-blue shadow-sm">
                  <h3 className="font-bold text-xl mb-4">You must be signed in to apply</h3>
                  <p className="mb-4">Please log in or create a Government Gateway account to continue.</p>
                </div>
              ) : (
                <button 
                  onClick={() => setFormStep(1)}
                  className="bg-govuk-green text-white px-8 py-3 font-bold hover:bg-govuk-green-hover shadow-md text-xl flex items-center"
                >
                  Start application <span className="ml-2">→</span>
                </button>
              )}
            </div>
          </div>
        )}

        {formStep === 1 && (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
            <h1 className="text-3xl font-bold mb-6">Citizenship Application Form</h1>
            {error && <div className="bg-red-50 border-l-4 border-govuk-error p-4 text-govuk-error font-bold mb-6">{error}</div>}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="bg-gray-100 p-6 border-l-4 border-govuk-blue mb-4">
                <h3 className="font-bold text-xl mb-4">Required Linked Accounts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    {userData?.discordLinked ? (
                      <div className="text-green-700 font-bold flex items-center bg-green-50 p-3 border border-green-200"><span className="text-xl mr-2">✓</span> Discord: {userData.discordUsername}</div>
                    ) : (
                      <div className="bg-white p-4 border border-govuk-error">
                        <p className="text-sm mb-2 text-govuk-error font-bold">Discord account required</p>
                        <Link to="/profile" className="bg-[#5865F2] text-white px-4 py-2 font-bold inline-block hover:opacity-90">Connect Discord</Link>
                      </div>
                    )}
                  </div>
                  <div>
                    {userData?.robloxLinked ? (
                      <div className="text-green-700 font-bold flex items-center bg-green-50 p-3 border border-green-200"><span className="text-xl mr-2">✓</span> Roblox: {userData.robloxUsername}</div>
                    ) : (
                      <div className="bg-white p-4 border border-govuk-error">
                        <p className="text-sm mb-2 text-govuk-error font-bold">Roblox account required</p>
                        <Link to="/profile" className="bg-govuk-green text-white px-4 py-2 font-bold inline-block hover:bg-govuk-green-hover">Connect Roblox</Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {steps.map((q, i) => (
                <div key={i} className="bg-white p-6 border-2 border-govuk-grey shadow-sm">
                  <label className="block font-bold mb-2 text-xl">{q.text}</label>
                  <input 
                    name={q.text}
                    type="text" 
                    required
                    className="w-full md:w-2/3 border-2 border-govuk-black p-2 focus:outline-govuk-focus" 
                  />
                </div>
              ))}
              
              <div className="pt-6 border-t-4 border-govuk-blue mt-8 flex flex-col md:flex-row gap-4 items-center">
                {(!userData?.discordLinked || !userData?.robloxLinked) ? (
                  <p className="text-govuk-error font-bold text-sm">Please complete all required verifications in your Profile to submit this application.</p>
                ) : (
                  <button 
                    type="submit"
                    disabled={loading}
                    className="bg-govuk-green text-white px-8 py-3 font-bold hover:bg-govuk-green-hover transition-colors shadow-md text-xl"
                  >
                    {loading ? 'Submitting...' : 'Submit application'}
                  </button>
                )}
                <button type="button" onClick={() => setFormStep(0)} className="underline text-govuk-blue hover:text-govuk-blue-hover mt-4 md:mt-0">Cancel and return</button>
              </div>
            </form>
          </div>
        )}

        {formStep === 2 && (
          <div className="space-y-8 animate-in zoom-in duration-500">
            <div className="bg-govuk-green text-white p-12 text-center shadow-lg">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                  <span className="text-govuk-green text-4xl font-bold">✓</span>
                </div>
              </div>
              <h2 className="text-4xl font-bold mb-4">Application Complete</h2>
              <p className="text-xl">Your application for HUK citizenship has been submitted.</p>
            </div>
            
            <div className="bg-white p-8 border-2 border-govuk-grey shadow-md text-center">
              <h3 className="text-2xl font-bold mb-4">What happens next</h3>
              <p className="text-lg mb-8 max-w-lg mx-auto">We've sent your application to the appropriate government department. You will be contacted via Discord if further action is required.</p>
              
              <button onClick={() => navigate('/')} className="bg-govuk-blue text-white px-8 py-3 font-bold hover:bg-govuk-blue-hover mx-auto block shadow-sm">
                Return to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
