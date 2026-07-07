/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

const tabs = ['All Connections', 'Pending', 'Sent'];

const getErrorMessage = (error, fallback) => error.response?.data?.message || error.message || fallback;

const ConnectionRow = ({ item, actions }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
    <div className="flex items-center gap-4">
      <div className="w-11 h-11 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
        {item.avatar}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900">{item.name}</p>
          {item.verified && (
            <svg className="w-3.5 h-3.5 text-accent" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          )}
        </div>
        <p className="text-xs text-gray-500">{item.type} &middot; {item.location}</p>
      </div>
    </div>
    <div className="flex items-center gap-2">{actions}</div>
  </div>
);

const ConnectionsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All Connections');
  const [groups, setGroups] = useState({ connected: [], pendingReceived: [], pendingSent: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState('');
  const [error, setError] = useState('');

  const loadConnections = async () => {
    setError('');
    setIsLoading(true);
    try {
      const response = await api.get('/connections');
      setGroups(response.data.data || { connected: [], pendingReceived: [], pendingSent: [] });
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Failed to load connections'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const respond = async (connectionId, action) => {
    setActionId(connectionId);
    setError('');

    try {
      await api.patch(`/connections/${connectionId}/${action}`);
      await loadConnections();
    } catch (responseError) {
      setError(getErrorMessage(responseError, `Failed to ${action} request`));
    } finally {
      setActionId('');
    }
  };

  const renderEmpty = (message) => (
    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
      {message}
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Connections</h1>
        <p className="text-gray-500 mt-1">Manage your network and connection requests.</p>
      </div>

      {error ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
            {tab === 'Pending' && groups.pendingReceived.length > 0 && (
              <span className="ml-1.5 bg-accent text-white text-xs px-1.5 py-0.5 rounded-full">{groups.pendingReceived.length}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        renderEmpty('Loading connections...')
      ) : (
        <>
          {activeTab === 'All Connections' && (
            <div className="space-y-3">
              {groups.connected.length === 0
                ? renderEmpty('No connected users yet.')
                : groups.connected.map((item) => (
                    <ConnectionRow
                      key={item.id}
                      item={item}
                      actions={(
                        <button
                          onClick={() => navigate(`/dashboard/messages?userId=${item.userId}`)}
                          className="px-3 py-1.5 text-xs font-medium text-accent border border-accent rounded-lg hover:bg-accent hover:text-white transition-all"
                        >
                          Message
                        </button>
                      )}
                    />
                  ))}
            </div>
          )}

          {activeTab === 'Pending' && (
            <div className="space-y-3">
              {groups.pendingReceived.length === 0
                ? renderEmpty('No pending requests.')
                : groups.pendingReceived.map((item) => (
                    <ConnectionRow
                      key={item.id}
                      item={item}
                      actions={(
                        <>
                          <button
                            disabled={actionId === item.id}
                            onClick={() => respond(item.id, 'accept')}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-accent rounded-lg hover:bg-accent-dark disabled:opacity-70 transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            disabled={actionId === item.id}
                            onClick={() => respond(item.id, 'decline')}
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-70 transition-colors"
                          >
                            Decline
                          </button>
                        </>
                      )}
                    />
                  ))}
            </div>
          )}

          {activeTab === 'Sent' && (
            <div className="space-y-3">
              {groups.pendingSent.length === 0
                ? renderEmpty('No sent requests pending.')
                : groups.pendingSent.map((item) => (
                    <ConnectionRow
                      key={item.id}
                      item={item}
                      actions={<span className="text-xs text-amber-500 font-medium bg-amber-50 px-2.5 py-1 rounded-full">Pending</span>}
                    />
                  ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ConnectionsPage;
