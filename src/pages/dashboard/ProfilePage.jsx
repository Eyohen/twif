import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const personalFields = [
  'firstName',
  'lastName',
  'headline',
  'bio',
  'phone',
  'website',
  'country',
  'state',
  'city',
  'address',
];

const businessFields = [
  'businessName',
  'contactName',
  'businessType',
  'industry',
  'description',
  'phone',
  'website',
  'country',
  'state',
  'city',
  'address',
];

const getInitialFormData = (profile, accountType) => {
  const fields = accountType === 'business' ? businessFields : personalFields;

  return fields.reduce((values, field) => {
    values[field] = profile?.[field] ?? '';
    return values;
  }, {});
};

const pickEditableFields = (values, accountType) => {
  const fields = accountType === 'business' ? businessFields : personalFields;

  return fields.reduce((payload, field) => {
    payload[field] = values[field] ?? '';
    return payload;
  }, {});
};

const getInitials = (name) =>
  (name || 'CN')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

const TextInput = ({ label, name, value, onChange, placeholder, type = 'text', helper }) => (
  <label className="block">
    <span className="block text-sm font-semibold text-gray-800 mb-1.5">{label}</span>
    <input
      type={type}
      name={name}
      value={value ?? ''}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10"
    />
    {helper ? <span className="mt-1.5 block text-xs text-gray-500">{helper}</span> : null}
  </label>
);

const TextArea = ({ label, name, value, onChange, placeholder, rows = 5, helper }) => (
  <label className="block">
    <span className="block text-sm font-semibold text-gray-800 mb-1.5">{label}</span>
    <textarea
      name={name}
      value={value ?? ''}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-y rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10"
    />
    {helper ? <span className="mt-1.5 block text-xs text-gray-500">{helper}</span> : null}
  </label>
);

const SectionCard = ({ title, description, children }) => (
  <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
    <div className="border-b border-gray-100 px-6 py-5">
      <h2 className="text-base font-bold text-gray-950">{title}</h2>
      {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
    </div>
    <div className="p-6">{children}</div>
  </section>
);

const ProfilePage = () => {
  const { user, profile, refreshProfile, updateProfile } = useAuth();
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const hydratedProfileIdRef = useRef(null);

  const accountType = user?.accountType || 'personal';
  const isBusiness = accountType === 'business';

  useEffect(() => {
    refreshProfile().catch(() => {
      // Keep the profile already available from login if refresh fails.
    });
  }, []);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const profileKey = `${accountType}:${profile.id || profile.userId || 'profile'}`;
    if (!hasLocalChanges || hydratedProfileIdRef.current !== profileKey) {
      setFormData(getInitialFormData(profile, accountType));
      setHasLocalChanges(false);
      hydratedProfileIdRef.current = profileKey;
    }
  }, [accountType, hasLocalChanges, profile]);

  const title = isBusiness
    ? formData.businessName || profile?.businessName || 'Business profile'
    : [formData.firstName || profile?.firstName, formData.lastName || profile?.lastName].filter(Boolean).join(' ') || 'Personal profile';

  const subtitle = isBusiness
    ? formData.contactName || profile?.contactName || 'Primary contact'
    : formData.headline || profile?.headline || 'Professional profile';

  const completion = useMemo(() => {
    const fields = isBusiness ? businessFields : personalFields;
    const completed = fields.filter((field) => String(formData[field] || '').trim()).length;
    return Math.round((completed / fields.length) * 100);
  }, [formData, isBusiness]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setHasLocalChanges(true);
    setStatus('');
    setError('');
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('');
    setError('');
    setIsSaving(true);

    try {
      const updatedProfile = await updateProfile(pickEditableFields(formData, accountType));
      setFormData(getInitialFormData(updatedProfile, accountType));
      setHasLocalChanges(false);
      setStatus('Profile updated successfully.');
    } catch (submitError) {
      setError(submitError.message || 'Unable to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Profile Management</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-950">
            {isBusiness ? 'Business Profile' : 'Personal Profile'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Keep your Twif profile accurate so the right opportunities, partnerships, vendors, investors, and connections can find you.
          </p>
        </div>
        <button
          type="submit"
          form="profile-form"
          disabled={isSaving}
          className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? 'Saving profile...' : 'Save changes'}
        </button>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-accent/15 bg-accent/10 text-2xl font-black text-accent">
              {getInitials(title)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-gray-950">{title}</h2>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-gray-600">
                  {isBusiness ? 'Business' : 'Personal'}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
              <p className="mt-2 text-sm font-medium text-gray-700">{user?.email}</p>
            </div>
          </div>

          <div className="min-w-full rounded-2xl border border-gray-100 bg-gray-50 p-4 lg:min-w-72">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">Profile completion</span>
              <span className="text-sm font-bold text-accent">{completion}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${completion}%` }} />
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Complete more fields to improve match quality and profile credibility.
            </p>
          </div>
        </div>
      </div>

      <form id="profile-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <SectionCard
            title={isBusiness ? 'Company Identity' : 'Identity'}
            description={isBusiness ? 'Core details people use to understand your business.' : 'Your basic personal information from signup and profile setup.'}
          >
            {isBusiness ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <TextInput label="Business name" name="businessName" value={formData.businessName} onChange={handleChange} placeholder="Acme Technologies" />
                <TextInput label="Contact name" name="contactName" value={formData.contactName} onChange={handleChange} placeholder="Henry Eyo" />
                <TextInput label="Industry" name="industry" value={formData.industry} onChange={handleChange} placeholder="Technology, Finance, Manufacturing..." />
                <label className="block">
                  <span className="block text-sm font-semibold text-gray-800 mb-1.5">Business type</span>
                  <select
                    name="businessType"
                    value={formData.businessType ?? ''}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10"
                  >
                    <option value="">Select business type</option>
                    <option value="startup">Startup</option>
                    <option value="sme">SME</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="agency">Agency</option>
                    <option value="nonprofit">Nonprofit</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <div className="md:col-span-2">
                  <TextArea label="Company description" name="description" value={formData.description} onChange={handleChange} placeholder="Describe what your business does, who you serve, and what opportunities you are open to." />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <TextInput label="First name" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Henry" />
                <TextInput label="Last name" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Eyo" />
                <div className="md:col-span-2">
                  <TextInput label="Professional headline" name="headline" value={formData.headline} onChange={handleChange} placeholder="Partnerships lead, investor, operator, developer..." />
                </div>
                <div className="md:col-span-2">
                  <TextArea label="Bio" name="bio" value={formData.bio} onChange={handleChange} placeholder="Summarize your background, interests, and the opportunities you want to discover on Twif." />
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Contact & Location"
            description="These details help people understand where you operate and how to reach you."
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <TextInput label="Phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="+234 700 000 0000" />
              <TextInput label="Website" name="website" value={formData.website} onChange={handleChange} placeholder="https://example.com" />
              <TextInput label="Country" name="country" value={formData.country} onChange={handleChange} placeholder="Nigeria" />
              <TextInput label="State" name="state" value={formData.state} onChange={handleChange} placeholder="Lagos" />
              <TextInput label="City" name="city" value={formData.city} onChange={handleChange} placeholder="Ikeja" />
              <TextInput label="Address" name="address" value={formData.address} onChange={handleChange} placeholder="Business or contact address" />
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-6">
          <SectionCard title="Profile Quality" description="Enterprise profiles work best when they are complete and specific.">
            <div className="space-y-4">
              {[
                { label: isBusiness ? 'Identity details' : 'Name and headline', done: isBusiness ? formData.businessName && formData.contactName : formData.firstName && formData.lastName },
                { label: isBusiness ? 'Business description' : 'Bio', done: isBusiness ? formData.description : formData.bio },
                { label: 'Contact information', done: formData.phone || formData.website },
                { label: 'Location', done: formData.country || formData.state || formData.city },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.done ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                    {item.done ? 'Done' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            {error ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}
            {status ? (
              <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                {status}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? 'Saving profile...' : 'Save profile'}
            </button>
            <p className="mt-3 text-center text-xs text-gray-500">
              Changes update your Twif profile immediately.
            </p>
          </section>
        </aside>
      </form>
    </div>
  );
};

export default ProfilePage;
