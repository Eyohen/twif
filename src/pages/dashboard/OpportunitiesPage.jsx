import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';

const categories = ['All', 'Partnerships', 'Contracts', 'Joint Ventures', 'Vendor Sourcing', 'Investment', 'Jobs'];
const contactOptions = ['Email', 'Platform Message'];

const getErrorMessage = (error, fallback) => error.response?.data?.message || error.message || fallback;

const defaultOpportunityForm = {
  title: '',
  category: 'Partnerships',
  description: '',
  budget: '',
  location: '',
};

const OpportunitiesPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [opportunityForm, setOpportunityForm] = useState(defaultOpportunityForm);
  const [interestForm, setInterestForm] = useState({ message: '', contactPreference: 'Platform Message' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const loadOpportunities = async () => {
    setError('');
    setIsLoading(true);

    try {
      const response = await api.get('/opportunities');
      setOpportunities(response.data.data || []);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Failed to load opportunities'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
  }, []);

  const filtered = useMemo(() => (
    selectedCategory === 'All'
      ? opportunities
      : opportunities.filter((opportunity) => opportunity.category === selectedCategory)
  ), [opportunities, selectedCategory]);

  const handleOpportunityChange = (event) => {
    const { name, value } = event.target;
    setOpportunityForm((current) => ({ ...current, [name]: value }));
  };

  const handleInterestChange = (event) => {
    const { name, value } = event.target;
    setInterestForm((current) => ({ ...current, [name]: value }));
  };

  const createOpportunity = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    setIsSubmitting(true);

    try {
      await api.post('/opportunities', opportunityForm);
      setStatus('Opportunity posted successfully.');
      setShowPostModal(false);
      setOpportunityForm(defaultOpportunityForm);
      await loadOpportunities();
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Failed to post opportunity'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitInterest = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    setIsSubmitting(true);

    try {
      await api.post(`/opportunities/${selectedOpportunity.id}/interest`, interestForm);
      setStatus('Interest submitted successfully.');
      setSelectedOpportunity(null);
      setInterestForm({ message: '', contactPreference: 'Platform Message' });
      await loadOpportunities();
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Failed to submit interest'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const postedDate = (createdAt) => {
    if (!createdAt) return 'Recently';
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(createdAt));
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opportunity Board</h1>
          <p className="text-gray-500 mt-1">Discover partnerships, contracts, jobs, and growth opportunities.</p>
        </div>
        <button
          onClick={() => setShowPostModal(true)}
          className="px-4 py-2.5 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-dark transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Post Opportunity
        </button>
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

      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-accent text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-accent hover:text-accent'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
          Loading opportunities...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <h3 className="font-semibold text-gray-900">No opportunities found</h3>
          <p className="text-sm text-gray-500 mt-1">Try another category or post the first opportunity.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((opportunity) => (
            <div key={opportunity.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{opportunity.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {opportunity.owner?.name} &middot; {opportunity.location} &middot; {postedDate(opportunity.createdAt)}
                  </p>
                </div>
                <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                  {opportunity.category}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-4">{opportunity.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-900">{opportunity.budget || 'Negotiable'}</span>
                  <span className="text-xs text-gray-400">{opportunity.responsesCount} responses</span>
                </div>
                <button
                  onClick={() => setSelectedOpportunity(opportunity)}
                  className="px-4 py-2 text-sm font-medium text-accent border border-accent rounded-lg hover:bg-accent hover:text-white transition-all"
                >
                  Express Interest
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedOpportunity && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedOpportunity(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Express Interest</h2>
              <button onClick={() => setSelectedOpportunity(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-5">
              <h3 className="text-sm font-semibold text-gray-900">{selectedOpportunity.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{selectedOpportunity.owner?.name} &middot; {selectedOpportunity.location}</p>
              <p className="text-xs font-medium text-gray-700 mt-2">{selectedOpportunity.budget || 'Negotiable'}</p>
            </div>

            <form className="space-y-4" onSubmit={submitInterest}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Message / Proposal</label>
                <textarea
                  name="message"
                  value={interestForm.message}
                  onChange={handleInterestChange}
                  rows={4}
                  required
                  placeholder="Describe how you can help or what you bring to this opportunity..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Preference</label>
                <div className="flex gap-3">
                  {contactOptions.map((option) => (
                    <label key={option} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="contactPreference"
                        value={option}
                        checked={interestForm.contactPreference === option}
                        onChange={handleInterestChange}
                        className="accent-accent"
                      />
                      <span className="text-sm text-gray-600">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent-dark disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Interest'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showPostModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPostModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Post an Opportunity</h2>
              <button onClick={() => setShowPostModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form className="space-y-4" onSubmit={createOpportunity}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  name="title"
                  value={opportunityForm.title}
                  onChange={handleOpportunityChange}
                  required
                  placeholder="What are you looking for?"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="category"
                  value={opportunityForm.category}
                  onChange={handleOpportunityChange}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  {categories.filter((category) => category !== 'All').map((category) => <option key={category}>{category}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={opportunityForm.description}
                  onChange={handleOpportunityChange}
                  rows={4}
                  required
                  placeholder="Describe the opportunity in detail..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                  <input name="budget" value={opportunityForm.budget} onChange={handleOpportunityChange} type="text" placeholder="e.g. $10k - $25k" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input name="location" value={opportunityForm.location} onChange={handleOpportunityChange} type="text" placeholder="e.g. Remote" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent-dark disabled:opacity-70 disabled:cursor-not-allowed transition-colors">
                {isSubmitting ? 'Posting...' : 'Post Opportunity'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpportunitiesPage;
