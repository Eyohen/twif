import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const stats = [
  { label: 'Total Connections', value: '47', change: '+5 this week', color: 'text-accent' },
  { label: 'Pending Requests', value: '12', change: '3 new today', color: 'text-amber-500' },
  { label: 'Active Opportunities', value: '8', change: '2 matches found', color: 'text-green-500' },
  { label: 'Messages', value: '23', change: '3 unread', color: 'text-purple-500' },
];

const recentMatches = [
  { name: 'TechVentures Inc.', type: 'Technology Partner', match: 92, avatar: 'TV' },
  { name: 'GreenScale Solutions', type: 'Service Provider', match: 87, avatar: 'GS' },
  { name: 'Atlas Capital Group', type: 'Investor', match: 85, avatar: 'AC' },
  { name: 'Bloom Strategy', type: 'Consultant', match: 81, avatar: 'BS' },
];

const recentActivity = [
  { text: 'TechVentures Inc. accepted your connection request', time: '2 hours ago', type: 'connection' },
  { text: 'New opportunity posted: "Looking for SaaS integration partner"', time: '4 hours ago', type: 'opportunity' },
  { text: 'Sarah Chen sent you a message', time: '5 hours ago', type: 'message' },
  { text: 'Your profile was viewed 15 times this week', time: '1 day ago', type: 'profile' },
  { text: 'Atlas Capital Group wants to connect', time: '1 day ago', type: 'connection' },
];

const upcomingEvents = [
  { title: 'B2B Networking Mixer', date: 'Apr 5, 2025', time: '2:00 PM WAT' },
  { title: 'AI in Business Webinar', date: 'Apr 8, 2025', time: '11:00 AM WAT' },
];

const DashboardHome = () => {
  const { user, profile } = useAuth();
  const firstName = user?.accountType === 'personal'
    ? profile?.firstName || profile?.displayName?.split(' ')[0]
    : profile?.contactName?.split(' ')[0] || profile?.businessName || 'there';

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {firstName}</h1>
        <p className="text-gray-500 mt-1">
          {user?.accountType === 'business'
            ? 'Here is a snapshot of your business network activity.'
            : 'Here is a snapshot of your personal network activity.'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-5 border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Matches */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">AI-Recommended Matches</h2>
            <Link to="/dashboard/discover" className="text-sm text-accent hover:text-accent-dark font-medium">
              View All
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentMatches.map((match) => (
              <div key={match.name} className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent text-sm font-bold">
                    {match.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{match.name}</p>
                    <p className="text-xs text-gray-500">{match.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-green-600">{match.match}% match</span>
                  <button className="px-3 py-1.5 text-xs font-medium text-accent border border-accent rounded-full hover:bg-accent hover:text-white transition-all">
                    Connect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Activity */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Recent Activity</h2>
            </div>
            <div className="p-4 space-y-4">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    item.type === 'connection' ? 'bg-accent' :
                    item.type === 'opportunity' ? 'bg-green-500' :
                    item.type === 'message' ? 'bg-purple-500' : 'bg-gray-300'
                  }`} />
                  <div>
                    <p className="text-sm text-gray-700">{item.text}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Upcoming Events</h2>
            </div>
            <div className="p-4 space-y-3">
              {upcomingEvents.map((event) => (
                <div key={event.title} className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">{event.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{event.date} &middot; {event.time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
