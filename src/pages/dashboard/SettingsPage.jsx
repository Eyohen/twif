import { useState } from 'react';

const tabs = ['Account', 'Notifications', 'Privacy', 'Billing'];

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('Account');
  const [notifications, setNotifications] = useState({
    newConnections: true,
    messages: true,
    opportunities: true,
    events: false,
    marketing: false,
    weeklyDigest: true,
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account preferences and settings.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Account */}
      {activeTab === 'Account' && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-5">Personal Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                  <input type="text" defaultValue="John" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                  <input type="text" defaultValue="Doe" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" defaultValue="john@acmecorp.com" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <input type="text" defaultValue="CEO & Co-Founder" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
              </div>
            </div>
            <button className="mt-5 px-4 py-2 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-dark transition-colors">
              Save Changes
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-5">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
                <input type="password" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                <input type="password" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
                <input type="password" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
              </div>
            </div>
            <button className="mt-5 px-4 py-2 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-dark transition-colors">
              Update Password
            </button>
          </div>

          <div className="bg-white rounded-xl border border-red-100 p-6">
            <h3 className="text-base font-semibold text-red-600 mb-2">Danger Zone</h3>
            <p className="text-sm text-gray-500 mb-4">Permanently delete your account and all associated data.</p>
            <button className="px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              Delete Account
            </button>
          </div>
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'Notifications' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-5">Email Notifications</h3>
            <div className="space-y-5">
              {[
                { key: 'newConnections', label: 'New connection requests', desc: 'When someone sends you a connection request' },
                { key: 'messages', label: 'New messages', desc: 'When you receive a new message' },
                { key: 'opportunities', label: 'Opportunity matches', desc: 'When new opportunities match your profile' },
                { key: 'events', label: 'Events & webinars', desc: 'Notifications about upcoming events' },
                { key: 'marketing', label: 'Marketing & updates', desc: 'Product updates and promotional content' },
                { key: 'weeklyDigest', label: 'Weekly digest', desc: 'A weekly summary of your network activity' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => setNotifications((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                    className={`w-10 h-6 rounded-full relative transition-colors ${
                      notifications[item.key] ? 'bg-accent' : 'bg-gray-200'
                    }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                      notifications[item.key] ? 'translate-x-5' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Privacy */}
      {activeTab === 'Privacy' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-5">Privacy Settings</h3>
            <div className="space-y-5">
              {[
                { label: 'Show my profile in search results', enabled: true },
                { label: 'Allow connection requests from anyone', enabled: true },
                { label: 'Show my email to connections', enabled: false },
                { label: 'Show my phone to connections', enabled: false },
                { label: 'Allow messages from non-connections', enabled: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <div className={`w-10 h-6 rounded-full relative cursor-pointer ${item.enabled ? 'bg-accent' : 'bg-gray-200'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 ${item.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Billing */}
      {activeTab === 'Billing' && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Current Plan</h3>
              <span className="px-3 py-1 bg-accent/10 text-accent text-sm font-semibold rounded-full">Free Plan</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">You&apos;re on the Free plan. Upgrade to unlock advanced features.</p>
            <button className="px-4 py-2 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-dark transition-colors">
              Upgrade to Premium
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Billing History</h3>
            <p className="text-sm text-gray-500">No billing history yet. Upgrade your plan to get started.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
