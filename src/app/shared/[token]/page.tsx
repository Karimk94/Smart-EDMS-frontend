'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function SharedDocumentPage() {
  const params = useParams();
  const token = params.token as string;
  const [status, setStatus] = useState<'loading' | 'auth_required' | 'success' | 'error'>('loading');
  const [documentData, setDocumentData] = useState<any>(null);
  const [ssoEmail, setSsoEmail] = useState('');

  // Function to access the document via API
  const accessDocument = async (email?: string) => {
    setStatus('loading');
    try {
      const headers: any = {
        'Content-Type': 'application/json',
      };
      
      // If we have an EDMS token in localStorage, use it
      const localToken = localStorage.getItem('token');
      if (localToken) {
        headers['Authorization'] = `Bearer ${localToken}`;
      }

      // Query params for SSO email if applicable
      const queryParams = email ? `?viewer_email=${encodeURIComponent(email)}` : '';

      const response = await fetch(`/api/documents/share/access/${token}${queryParams}`, {
        method: 'POST',
        headers: headers,
      });

      if (response.status === 401) {
        setStatus('auth_required');
        return;
      }

      if (!response.ok) {
        throw new Error('Invalid Link');
      }

      const data = await response.json();
      setDocumentData(data);
      setStatus('success');
    } catch (err) {
      setStatus('error');
    }
  };

  useEffect(() => {
    if (token) {
      accessDocument();
    }
  }, [token]);

  const handleSSOLoginMock = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would redirect to Azure AD / Okta
    // Here we simulate the callback by just calling the API with the email
    if (ssoEmail) {
      accessDocument(ssoEmail);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Link Expired or Invalid</h1>
          <p className="text-gray-600 dark:text-gray-400">Please request a new link from the owner.</p>
        </div>
      </div>
    );
  }

  if (status === 'auth_required') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">
            Secure Document Access
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-8">
            You need to verify your identity to view this document.
          </p>

          <div className="space-y-4">
            {/* Option 1: Existing EDMS Login (Redirects to main login) */}
            <button 
                onClick={() => window.location.href = `/login?redirect=/shared/${token}`}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Login with EDMS Account
            </button>

            <div className="relative flex py-5 items-center">
                <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400">OR</span>
                <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
            </div>

            {/* Option 2: SSO Simulation */}
            <form onSubmit={handleSSOLoginMock} className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                External / Active Directory Login
              </label>
              <input 
                type="email" 
                required
                placeholder="Enter your organization email"
                className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={ssoEmail}
                onChange={(e) => setSsoEmail(e.target.value)}
              />
              <button 
                type="submit"
                className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors font-medium"
              >
                Sign in with SSO
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Success State - Show Document or Download
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6 flex flex-col items-center">
       <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                {documentData.name}
            </h1>
            <a 
                href={documentData.path} // Assuming API returns a path or download url
                download
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm flex items-center gap-2"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
            </a>
          </div>
          
          <div className="p-10 flex flex-col items-center justify-center min-h-[400px] bg-gray-50 dark:bg-gray-900/50">
             <div className="text-center">
                <p className="text-gray-500 mb-4">Preview available below (if supported)</p>
                {/* If it's an image/pdf, you can render an iframe or img tag here.
                   Using the path returned from the API.
                */}
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800 inline-block">
                    This file has been accessed successfully.
                    <br/>
                    Access Log ID: {new Date().toISOString()}
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}