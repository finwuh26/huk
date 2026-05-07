import React from 'react';
import { Breadcrumbs } from './GDSComponents';

export default function Terms() {
  return (
    <div className="govuk-width-container">
      <div className="govuk-main-wrapper">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, 'Terms and conditions']} />
        <h1 className="text-4xl font-bold mb-8">Terms and conditions</h1>
        <div className="markdown-body">
          <div className="p-4 bg-orange-100 border-l-4 border-orange-500 mb-6 text-orange-900">
            <strong>Disclaimer:</strong> This website is a satirical, roleplay project. It is <strong>not</strong> affiliated with, endorsed by, or representative of the real UK Government, or any real-world political entity or government body.
          </div>

          <p>By using this website you agree to these terms and conditions.</p>
          
          <h2>1. Nature of the Service</h2>
          <p>All services, forms, news, and petitions on this site are entirely fictional and for roleplaying/entertainment purposes only. No real public services are provided.</p>
          
          <h2>2. User Conduct</h2>
          <p>Users must not use this platform to impersonate real individuals, commit fraud, or engage in any real-world illegal activities. All content submitted should be clearly understood as fictional and part of the roleplay environment.</p>

          <h2>3. Liability</h2>
          <p>While we make every effort to keep this website functional for its intended entertainment purpose, we don't provide any guarantees, conditions or warranties as to the accuracy of the information on the site. We are not liable for any loss or damage that may come from using this site.</p>

          <h2>4. Intellectual Property</h2>
          <p>This site may use design patterns inspired by the Government Digital Service (GDS) under fair use for parody and educational purposes. Copyrighted assets remain the property of their respective owners.</p>
        </div>
      </div>
    </div>
  );
}
