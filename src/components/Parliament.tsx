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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RoleCard role="Prime Minister" name={cabinetMap["Prime Minister"] || "Vacant"} />
          <RoleCard role="Deputy Prime Minister" name={cabinetMap["Deputy Prime Minister"] || "Vacant"} />
          <RoleCard role="Chancellor of the Exchequer" name={cabinetMap["Chancellor of the Exchequer"] || "Vacant"} />
          <RoleCard role="Secretary of State for Wales" name={cabinetMap["Secretary of State for Wales"] || "Vacant"} />
          <RoleCard role="Minister for DCMS" name={cabinetMap["Minister for DCMS"] || "Vacant"} />
          <RoleCard role="Home Secretary" name={cabinetMap["Home Secretary"] || "Vacant"} />
          <RoleCard role="Defence Secretary" name={cabinetMap["Defence Secretary"] || "Vacant"} />
          <RoleCard role="Justice Secretary" name={cabinetMap["Justice Secretary"] || "Vacant"} />
          <RoleCard role="Foreign Secretary" name={cabinetMap["Foreign Secretary"] || "Vacant"} />
          <RoleCard role="Health & Social Secretary" name={cabinetMap["Health & Social Secretary"] || "Vacant"} />
          <RoleCard role="Leader of the House of Commons" name={cabinetMap["Leader of the House of Commons"] || "Vacant"} />
          <RoleCard role="Speaker of the House of Commons" name={cabinetMap["Speaker of the House of Commons"] || "Vacant"} />
        </div>
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
