import React from 'react';
import { Breadcrumbs } from './GDSComponents';

export default function Accessibility() {
  return (
    <div className="govuk-width-container">
      <div className="govuk-main-wrapper">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, 'Accessibility statement']} />
        <h1 className="text-4xl font-bold mb-8">Accessibility statement for HUK.GOV</h1>
        <div className="markdown-body">
          <p>This accessibility statement applies to the HUK.GOV website, a roleplay and parody project.</p>
          <p>We want as many people as possible to be able to use this website. For example, that means you should be able to:</p>
          <ul>
            <li>change colours, contrast levels and fonts via browser settings</li>
            <li>zoom in up to 300% without the text spilling off the screen</li>
            <li>navigate much of the website using just a keyboard</li>
          </ul>
          <p>We've also made the website text as simple as possible to understand.</p>
          
          <h2>How accessible this website is</h2>
          <p>Because this is an independent, non-commercial roleplay project, we may not meet full WCAG 2.1 AA accessibility standards required by real public sector bodies. Some parts of this website might not be fully accessible, and we lack the resources to perform comprehensive accessibility audits.</p>
          
          <h2>Reporting accessibility problems</h2>
          <p>If you find any problems not listed on this page or think we're not meeting accessibility requirements, please reach out to the project administrators via our community channels (e.g., Discord). We will do our best to implement fixes where possible, within the limits of our resources.</p>
        </div>
      </div>
    </div>
  );
}
