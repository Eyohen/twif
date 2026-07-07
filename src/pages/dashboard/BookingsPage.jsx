import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const tabs = ['Received', 'Sent', 'Accepted'];

const getErrorMessage = (error, fallback) => error.response?.data?.message || error.message || fallback;

const BookingCard = ({ booking, actions }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
            {booking.otherUser?.avatar || 'CN'}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{booking.otherUser?.name || 'Twif user'}</p>
            <p className="text-xs text-gray-500">{booking.otherUser?.type || 'Professional'} &middot; {booking.otherUser?.location || 'Remote'}</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-900">
            {booking.slotDay ? `${booking.slotDay}, ` : ''}{booking.slotDate} at {booking.slotTime}
          </p>
          <p className="text-xs text-gray-500 mt-1">{booking.durationMinutes || 30} minute meeting</p>
          <p className="text-sm text-gray-600 mt-3 leading-relaxed">{booking.agenda}</p>
          {booking.attachmentName ? (
            <p className="text-xs text-gray-500 mt-3">Attachment: {booking.attachmentName}</p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2 lg:flex-shrink-0">{actions}</div>
    </div>
  </div>
);

const BookingsPage = () => {
  const [activeTab, setActiveTab] = useState('Received');
  const [groups, setGroups] = useState({ received: [], sent: [], accepted: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const loadBookings = async () => {
    setError('');
    setIsLoading(true);

    try {
      const response = await api.get('/bookings');
      setGroups(response.data.data || { received: [], sent: [], accepted: [] });
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Failed to load bookings'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const respond = async (bookingId, action) => {
    setActionId(bookingId);
    setError('');
    setStatus('');

    try {
      await api.patch(`/bookings/${bookingId}/${action}`);
      setStatus(`Booking ${action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'cancelled'}.`);
      await loadBookings();
    } catch (responseError) {
      setError(getErrorMessage(responseError, `Failed to ${action} booking`));
    } finally {
      setActionId('');
    }
  };

  const renderEmpty = (message) => (
    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
      {message}
    </div>
  );

  const currentItems = activeTab === 'Received'
    ? groups.received
    : activeTab === 'Sent'
      ? groups.sent
      : groups.accepted;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-gray-500 mt-1">Manage meeting requests and confirmed bookings.</p>
      </div>

      {error ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {status ? (
        <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {status}
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
            {tab === 'Received' && groups.received.length > 0 && (
              <span className="ml-1.5 bg-accent text-white text-xs px-1.5 py-0.5 rounded-full">{groups.received.length}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        renderEmpty('Loading bookings...')
      ) : currentItems.length === 0 ? (
        renderEmpty(`No ${activeTab.toLowerCase()} bookings yet.`)
      ) : (
        <div className="space-y-4">
          {currentItems.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              actions={(
                <>
                  {activeTab === 'Received' && booking.status === 'pending' ? (
                    <>
                      <button
                        disabled={actionId === booking.id}
                        onClick={() => respond(booking.id, 'accept')}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-accent rounded-lg hover:bg-accent-dark disabled:opacity-70 transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        disabled={actionId === booking.id}
                        onClick={() => respond(booking.id, 'decline')}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-70 transition-colors"
                      >
                        Decline
                      </button>
                    </>
                  ) : null}
                  {activeTab === 'Sent' && ['pending', 'accepted'].includes(booking.status) ? (
                    <button
                      disabled={actionId === booking.id}
                      onClick={() => respond(booking.id, 'cancel')}
                      className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-70 transition-colors"
                    >
                      Cancel
                    </button>
                  ) : null}
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full capitalize">
                    {booking.status}
                  </span>
                </>
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingsPage;
