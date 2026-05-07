import React from 'react';
import { Breadcrumbs } from './GDSComponents';

export default function Privacy() {
  return (
    <div className="govuk-width-container">
      <div className="govuk-main-wrapper">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, 'Privacy policy']} />
        <h1 className="text-4xl font-bold mb-8">Privacy Policy & Cookies</h1>
        <div className="markdown-body">
          <div className="p-4 bg-orange-100 border-l-4 border-orange-500 mb-6 text-orange-900">
            <strong>Important notice:</strong> This is a satirical/parody roleplay application. Do not submit any real personal, sensitive, or confidential information (such as real addresses, national insurance numbers, or financial data).
          </div>
          
          <h2>Privacy Policy</h2>
          <p>This privacy notice is for the HUK.GOV roleplay project. It explains how we handle data within the context of this simulation.</p>
          
          <h3>What data we collect</h3>
          <p>For the purposes of this platform, we may collect and process the following data:</p>
          <ul>
            <li>Your email address (if you create an account to participate).</li>
            <li>Information you provide in forms, petitions, or feedback (which should all be fictional/in-character).</li>
          </ul>
          
          <h3>How we use your data</h3>
          <p>Any data provided is used solely for the operation of this roleplay environment, including authenticating users and associating user accounts with in-game actions (like signing a mock petition).</p>

          <h3>Data sharing</h3>
          <p>We do not share any data with third parties, except as required by the infrastructure providers (like Firebase) to host and maintain this service.</p>
          
          <h2>Cookies</h2>
          <p>We use small files (known as 'cookies' or local storage) to keep you logged in and allow the site to function properly. We do not use third-party tracking or advertising cookies.</p>
        </div>
      </div>
    </div>
  );
}
