import React, { useEffect, useState } from 'react';
import { Breadcrumbs } from './GDSComponents';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Parliament() {
  const [sessionInfo, setSessionInfo] = useState({ sessionDate: '', agenda: 'General Debate and Ministers Questions' });
  const [cabinetMap, setCabinetMap] = useState<Record<string, string>>({});

  useEffect(() => {
    getDoc(doc(db, 'settings', 'parliament')).then(docSnap => {
      if (docSnap.exists()) {
        setSessionInfo({
          sessionDate: docSnap.data().sessionDate || '',
          agenda: docSnap.data().agenda || 'General Debate and Ministers Questions'
        });
        if (docSnap.data().cabinetMap) {
          setCabinetMap(docSnap.data().cabinetMap);
        }
      }
    });
  }, []);

  const nextSession = sessionInfo.sessionDate ? new Date(sessionInfo.sessionDate) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  
  return (
    <div className="govuk-width-container govuk-main-wrapper">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, 'Parliament']} />
      
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold mb-4">UK Parliament</h1>
        
        <p className="govuk-body text-lg mb-8">
          The UK Parliament consists of the House of Commons and the House of Lords. 
          Discover when the next session is scheduled and public matters currently on the agenda.
        </p>

        <section className="bg-white border-l-4 border-govuk-blue p-6 shadow-sm mb-12 flex flex-col items-center text-center">
          <h2 className="text-lg font-bold mb-2 uppercase tracking-wide text-govuk-text-secondary">Next Scheduled Parliament</h2>
          <p className="text-3xl font-bold mb-4">{nextSession.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p className="text-md">Agenda: <span className="font-bold">{sessionInfo.agenda}</span></p>
        </section>

        <h2 className="text-2xl font-bold mb-6">Cabinet Members</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {[
            "Prime Minister", 
            "Deputy Prime Minister", 
            "Chancellor of the Exchequer", 
            "Secretary of State for Wales", 
            "Minister for DCMS", 
            "Home Secretary", 
            "Defence Secretary", 
            "Justice Secretary", 
            "Foreign Secretary", 
            "Health & Social Secretary", 
            "Leader of the House of Commons", 
            "Speaker of the House of Commons"
          ].map(role => (
            <RoleCard key={role} role={role} name={cabinetMap ? cabinetMap[role] || "Vacant" : "Vacant"} />
          ))}
        </div>

        {cabinetMap && Object.entries(cabinetMap).some(([role]) => role === "Member of Parliament") && (
          <>
            <h2 className="text-2xl font-bold mb-6">Members of Parliament</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(cabinetMap)
                .filter(([role]) => role === "Member of Parliament")
                .map(([role, name], idx) => (
                  <RoleCard key={idx} role={role} name={name as string} />
                ))}
            </div>
          </>
        )}
        
        {/* Any other roles not explicitly in the top list or MP list */}
        {cabinetMap && Object.entries(cabinetMap).some(([role]) => 
          ![
            "Prime Minister", "Deputy Prime Minister", "Chancellor of the Exchequer", 
            "Secretary of State for Wales", "Minister for DCMS", "Home Secretary", 
            "Defence Secretary", "Justice Secretary", "Foreign Secretary", 
            "Health & Social Secretary", "Leader of the House of Commons", 
            "Speaker of the House of Commons", "Member of Parliament"
          ].includes(role)
        ) && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Other Appointments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(cabinetMap)
                .filter(([role]) => 
                  ![
                    "Prime Minister", "Deputy Prime Minister", "Chancellor of the Exchequer", 
                    "Secretary of State for Wales", "Minister for DCMS", "Home Secretary", 
                    "Defence Secretary", "Justice Secretary", "Foreign Secretary", 
                    "Health & Social Secretary", "Leader of the House of Commons", 
                    "Speaker of the House of Commons", "Member of Parliament"
                  ].includes(role)
                )
                .map(([role, name]) => (
                  <RoleCard key={role} role={role} name={name as string} />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RoleCard({ role, name }: { role: string, name: string }) {
  return (
    <div className="border border-govuk-border p-4 bg-gray-50 flex flex-col justify-center">
      <h3 className="font-bold text-govuk-blue">{role}</h3>
      <p className="text-govuk-text">{name}</p>
    </div>
  );
}
