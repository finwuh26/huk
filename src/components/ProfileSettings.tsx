import React, { useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { Header, Footer, PhaseBanner, Breadcrumbs } from './GDSComponents';
import { Link } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function ProfileSettings() {
  const { user, role, userData } = useAuth();

  useEffect(() => {
    const buildProviderUpdate = (provider: string, payload: any = {}) => {
      const update: Record<string, any> = {
        [`${provider}Linked`]: true
      };

      if (provider === 'discord') {
        if (typeof payload.discordId === 'string') update.discordId = payload.discordId;
        if (typeof payload.discordUsername === 'string') update.discordUsername = payload.discordUsername;
      }

      if (provider === 'roblox') {
        if (typeof payload.robloxId === 'string') update.robloxId = payload.robloxId;
        if (typeof payload.robloxUsername === 'string') update.robloxUsername = payload.robloxUsername;
      }

      return update;
    };

    // Handle URL search params if redirected back
    const params = new URLSearchParams(window.location.search);
    const robloxCode = params.get('robloxCode');
    const discordCode = params.get('discordCode');
    const robloxId = params.get('robloxId');
    const robloxUsername = params.get('robloxUsername');
    const discordId = params.get('discordId');
    const discordUsername = params.get('discordUsername');

    if ((robloxCode || discordCode) && user) {
      const provider = robloxCode ? 'roblox' : 'discord';
      updateDoc(
        doc(db, 'users', user.uid),
        buildProviderUpdate(provider, {
          robloxId,
          robloxUsername,
          discordId,
          discordUsername
        })
      ).then(() => {
        alert(`Successfully linked ${provider}!`);
        // Clean up URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }).catch(e => console.error('Failed to update user profile', e));
    }

    const handleMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      // Accept messages from the same origin (production/preview) and known dev environments
      if (
        origin !== window.location.origin &&
        !origin.endsWith('.run.app') &&
        !origin.includes('localhost')
      ) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const provider = event.data?.provider;
        if (user && provider) {
          try {
            await updateDoc(doc(db, 'users', user.uid), buildProviderUpdate(provider, event.data));
            alert(`Successfully linked ${provider}!`);
          } catch (e) {
            console.error('Failed to update user profile', e);
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [user]);

  const handleRobloxConnect = () => {
    const connectUrl = `/api/auth/roblox/url`;
    fetch(connectUrl)
      .then(res => res.json())
      .then(data => {
        if (data.url) {
          const width = 600;
          const height = 700;
          const left = (window.innerWidth / 2) - (width / 2);
          const top = (window.innerHeight / 2) - (height / 2);
          window.open(data.url, 'oauth_popup', `width=${width},height=${height},top=${top},left=${left}`);
        } else if (data.alert) {
          alert(data.alert);
        }
      })
      .catch((e) => alert("Could not contact server for OAuth link."));
  };

  const handleDiscordConnect = () => {
    const connectUrl = `/api/auth/discord/url`;
    fetch(connectUrl)
      .then(res => res.json())
      .then(data => {
        if (data.url) {
          const width = 600;
          const height = 700;
          const left = (window.innerWidth / 2) - (width / 2);
          const top = (window.innerHeight / 2) - (height / 2);
          window.open(data.url, 'oauth_popup', `width=${width},height=${height},top=${top},left=${left}`);
        } else if (data.alert) {
          alert(data.alert);
        }
      })
      .catch((e) => alert("Could not contact server for OAuth link."));
  };

  const isRobloxLinked = userData?.robloxLinked === true;
  const isDiscordLinked = userData?.discordLinked === true;

  return (
    <div className="govuk-width-container govuk-main-wrapper">
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        'Profile Settings'
      ]} />

      <h1 className="text-3xl font-bold mb-6">Profile Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <section className="bg-white p-6 border-t-4 border-govuk-blue shadow-sm">
            <h2 className="text-2xl font-bold mb-4">Account Details</h2>
            <dl className="govuk-summary-list">
              <div className="govuk-summary-list__row border-b border-govuk-border py-4">
                <dt className="govuk-summary-list__key font-bold w-1/3">Display Name</dt>
                <dd className="govuk-summary-list__value flex items-center">
                  <input 
                    type="text" 
                    defaultValue={userData?.displayName || ''} 
                    onBlur={async (e) => {
                      if (user && e.target.value !== userData?.displayName) {
                        try {
                          await updateDoc(doc(db, 'users', user.uid), {
                            displayName: e.target.value
                          });
                        } catch (err) {
                          console.error("Failed to update name", err);
                        }
                      }
                    }}
                    className="border-b border-gray-300 focus:border-govuk-blue outline-none p-1 w-full max-w-xs"
                    placeholder="Enter your name"
                  />
                  <span className="text-xs text-gray-500 ml-2">(Click to edit, unclick to save)</span>
                </dd>
              </div>
              <div className="govuk-summary-list__row border-b border-govuk-border py-4">
                <dt className="govuk-summary-list__key font-bold w-1/3">Email address</dt>
                <dd className="govuk-summary-list__value">{user?.email}</dd>
              </div>
              <div className="govuk-summary-list__row border-b border-govuk-border py-4">
                <dt className="govuk-summary-list__key font-bold w-1/3">System Role</dt>
                <dd className="govuk-summary-list__value uppercase tracking-widest text-sm bg-govuk-grey-light inline-block px-2 py-1 font-bold">{role}</dd>
              </div>
            </dl>
          </section>

          <section className="bg-white p-6 border-t-4 border-govuk-green shadow-sm">
            <h2 className="text-2xl font-bold mb-4">Connected Accounts</h2>
            <p className="govuk-body text-govuk-grey-dark">Connect your third-party accounts to verify your identity. This can be used to speed up form submissions.</p>
            
            <div className="mt-8 space-y-4">
              {/* Roblox Connection */}
              <div className="border border-govuk-border p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/3/3a/Roblox_player_icon_black.svg" alt="Roblox" className="w-8 h-8 object-contain" />
                  <div>
                    <h3 className="font-bold">Roblox</h3>
                    <p className="text-sm text-govuk-text-secondary">
                      {isRobloxLinked ? <span className="text-govuk-green font-bold">Connected</span> : "Not connected"}
                    </p>
                  </div>
                </div>
                {!isRobloxLinked && (
                  <button 
                    onClick={handleRobloxConnect}
                    className="bg-govuk-green text-white px-4 py-2 font-bold hover:bg-govuk-green-hover shadow-sm"
                  >
                    Connect
                  </button>
                )}
              </div>

              {/* Discord Connection */}
              <div className="border border-govuk-border p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <svg className="w-8 h-8 text-[#5865F2]" fill="currentColor" viewBox="0 0 127.14 96.36">
                    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
                  </svg>
                  <div>
                    <h3 className="font-bold">Discord</h3>
                    <p className="text-sm text-govuk-text-secondary">
                      {isDiscordLinked ? <span className="text-govuk-green font-bold">Connected</span> : "Not connected"}
                    </p>
                  </div>
                </div>
                {!isDiscordLinked && (
                  <button 
                    onClick={handleDiscordConnect}
                    className="bg-[#5865F2] text-white px-4 py-2 font-bold hover:opacity-90 shadow-sm"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>

        <aside>
          <div className="bg-govuk-grey-light p-6 border-t-4 border-govuk-black">
            <h3 className="font-bold text-lg mb-2">Need help?</h3>
            <p className="text-sm text-govuk-text-secondary mb-4">Contact support if you need assistance managing your account or connected services.</p>
            <Link to="/contact" className="text-govuk-blue underline">Get support</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
