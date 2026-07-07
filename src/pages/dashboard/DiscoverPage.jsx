import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import AvailabilityCalendar from '../../components/bookings/AvailabilityCalendar';
import BookingModal from '../../components/bookings/BookingModal';

const industries = ['All', 'Technology', 'Finance', 'Healthcare', 'Education', 'Marketing', 'Manufacturing', 'General'];

const getErrorMessage = (error, fallback) => error.response?.data?.message || error.message || fallback;
const canSendConnectionRequest = (connectionStatus) => !['sent', 'received', 'connected'].includes(connectionStatus);

const DiscoverPage = () => {
  const [selectedIndustry, setSelectedIndustry] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [bookingProfile, setBookingProfile] = useState(null);
  const [bookingSlot, setBookingSlot] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const loadProfiles = async () => {
    setError('');
    setIsLoading(true);

    try {
      const response = await api.get('/discover');
      setProfiles(response.data.data || []);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Failed to load discover profiles'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return profiles.filter((profile) => {
      const matchesIndustry = selectedIndustry === 'All' || profile.industry === selectedIndustry;
      const searchBlob = `${profile.name} ${profile.type} ${profile.industry} ${profile.location} ${profile.bio}`.toLowerCase();
      return matchesIndustry && (!query || searchBlob.includes(query));
    });
  }, [profiles, searchQuery, selectedIndustry]);

  const sendConnectionRequest = async (profile) => {
    setStatus('');
    setError('');
    setActionId(profile.userId);

    try {
      await api.post('/connections/request', {
        recipientId: profile.userId,
        message: 'I would like to connect on Twif.',
      });
      setStatus(`Connection request sent to ${profile.name}.`);
      setProfiles((current) => current.map((item) => (
        item.userId === profile.userId ? { ...item, connectionStatus: 'sent' } : item
      )));
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Failed to send connection request'));
    } finally {
      setActionId('');
    }
  };

  const requestBooking = async ({ slot, agenda, file }) => {
    if (!bookingProfile) return;

    setStatus('');
    setError('');
    setActionId(`booking-${bookingProfile.userId}`);

    try {
      await api.post('/bookings', {
        recipientId: bookingProfile.userId,
        slotDate: slot.date,
        slotDay: slot.day,
        slotTime: slot.time,
        scheduledFor: slot.dateObj?.toISOString?.(),
        agenda,
        attachmentName: file?.name || null,
      });
      setStatus(`Booking request sent to ${bookingProfile.name}.`);
      setBookingSlot(null);
      setBookingProfile(null);
    } catch (bookingError) {
      setError(getErrorMessage(bookingError, 'Failed to request booking'));
    } finally {
      setActionId('');
    }
  };

  const getConnectionLabel = (connectionStatus) => {
    if (connectionStatus === 'connected') return 'Connected';
    if (connectionStatus === 'sent') return 'Request Sent';
    if (connectionStatus === 'received') return 'Respond in Connections';
    return 'Connect';
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Discover</h1>
        <p className="text-gray-500 mt-1">Find people and businesses that match your goals.</p>
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

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search people, businesses, industries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {industries.map((industry) => (
          <button
            key={industry}
            onClick={() => setSelectedIndustry(industry)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedIndustry === industry
                ? 'bg-accent text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-accent hover:text-accent'
            }`}
          >
            {industry}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
          Loading discover profiles...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <h3 className="font-semibold text-gray-900">No profiles found</h3>
          <p className="text-sm text-gray-500 mt-1">Try a different search or industry filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((profile) => (
            <div key={profile.userId} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-bold">
                    {profile.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">{profile.name}</h3>
                      {profile.verified && (
                        <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{profile.type} &middot; {profile.location}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  {profile.match}%
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{profile.bio}</p>
              <div className="flex items-center gap-2">
                <button
                  disabled={!canSendConnectionRequest(profile.connectionStatus) || actionId === profile.userId}
                  onClick={() => sendConnectionRequest(profile)}
                  className="flex-1 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {actionId === profile.userId ? 'Sending...' : getConnectionLabel(profile.connectionStatus)}
                </button>
                <button
                  onClick={() => setSelectedProfile(profile)}
                  className="py-2 px-3 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  View Profile
                </button>
                <button
                  disabled={actionId === `booking-${profile.userId}`}
                  onClick={() => setBookingProfile(profile)}
                  className="py-2 px-3 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 disabled:opacity-60 transition-colors"
                >
                  Book
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedProfile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedProfile(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-bold text-xl">
                  {selectedProfile.avatar}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedProfile.name}</h2>
                  <p className="text-sm text-gray-500">{selectedProfile.type} &middot; {selectedProfile.location}</p>
                  <span className="inline-block mt-2 px-3 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full">
                    {selectedProfile.accountType}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedProfile(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">About</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-5">{selectedProfile.bio}</p>
            <button
              disabled={!canSendConnectionRequest(selectedProfile.connectionStatus)}
              onClick={() => {
                sendConnectionRequest(selectedProfile);
                setSelectedProfile(null);
              }}
              className="w-full py-2.5 text-sm font-semibold text-white bg-accent rounded-lg hover:bg-accent-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {getConnectionLabel(selectedProfile.connectionStatus)}
            </button>
            <button
              onClick={() => {
                setBookingProfile(selectedProfile);
                setSelectedProfile(null);
              }}
              className="w-full mt-3 py-2.5 text-sm font-semibold text-accent border border-accent rounded-lg hover:bg-accent hover:text-white transition-colors"
            >
              Request a Meeting
            </button>
          </div>
        </div>
      )}

      {bookingProfile && !bookingSlot && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setBookingProfile(null)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Book {bookingProfile.name}</h2>
                <p className="text-sm text-gray-500">Choose an available 30-minute slot.</p>
              </div>
              <button onClick={() => setBookingProfile(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <AvailabilityCalendar mode="view" onBook={(slot) => setBookingSlot(slot)} />
          </div>
        </div>
      )}

      {bookingProfile && bookingSlot && (
        <BookingModal
          slot={bookingSlot}
          businessName={bookingProfile.name}
          onClose={() => setBookingSlot(null)}
          onConfirm={requestBooking}
        />
      )}
    </div>
  );
};

export default DiscoverPage;
