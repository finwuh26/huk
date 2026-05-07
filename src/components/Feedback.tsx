import React, { useState } from 'react';
import { Breadcrumbs } from './GDSComponents';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../AuthContext';

export default function Feedback() {
  const [submitted, setSubmitted] = useState(false);
  const [type, setType] = useState('feedback');
  const [details, setDetails] = useState('');
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        type,
        details,
        createdAt: new Date().toISOString(),
        resolved: false,
        submitterId: user?.uid || 'anonymous',
        submitterEmail: user?.email || 'anonymous'
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert('Failed to submit feedback.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="govuk-width-container govuk-main-wrapper">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, 'Feedback and Support']} />
      
      <div className="max-w-2xl">
        <h1 className="govuk-heading-xl text-4xl font-bold mb-8">Feedback and Support</h1>
        
        {submitted ? (
          <div className="bg-[#1d70b8] text-white p-8">
            <h2 className="text-2xl font-bold mb-4">Request sent</h2>
            <p>Your feedback or support request has been received. We will respond shortly via your registered email or the discord server.</p>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <p className="text-xl text-govuk-text mb-6">
              Use this form to send feedback about the platform, report technical issues, or request assistance with your account.
            </p>
            
            <div className="form-group">
              <label className="block font-bold mb-2">What do you want to contact us about?</label>
              <select 
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="border-2 border-black w-full p-2 text-lg focus:outline-none focus:ring-4 focus:ring-[#ffdd00] focus:border-black"
              >
                <option value="feedback">Feedback about the website</option>
                <option value="support">Technical support</option>
                <option value="account">Account or login issues</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="block font-bold mb-2">Can you provide more details?</label>
              <textarea 
                rows={6} 
                required
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="border-2 border-black w-full p-2 text-lg focus:outline-none focus:ring-4 focus:ring-[#ffdd00] focus:border-black"
              ></textarea>
            </div>

            <button disabled={loading} type="submit" className="bg-[#00703c] text-white px-6 py-2 font-bold text-xl hover:bg-[#005a30] shadow-sm disabled:opacity-50">
              Submit
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
