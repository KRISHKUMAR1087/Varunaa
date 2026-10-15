import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  Mail,
  Building,
  Radio,
  KeyRound,
  Trash2,
  Lock,
  Edit3,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOperations } from '../../context/OperationsContext';

export const ShippingProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, updateEmail, updatePassword, updateProfile, deleteAccount } = useAuth();
  const { showToast } = useOperations();

  const [ediAlerts, setEdiAlerts] = useState(true);
  const [demurrageSms, setDemurrageSms] = useState(true);
  const [pilotageUpdates, setPilotageUpdates] = useState(true);

  // Profile fields
  const [profileName, setProfileName] = useState(user?.name || '');
  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setEmailInput(user.email || '');
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const handleSavePreferences = () => {
    showToast('success', 'Agency Preferences Saved', 'Notification thresholds and VHF telemetry channels updated.');
  };

  const handleSaveProfileName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      showToast('error', 'Validation Error', 'Name cannot be empty.');
      return;
    }
    setIsUpdatingProfile(true);
    try {
      await updateProfile(profileName.trim());
      showToast('success', 'Profile Updated', 'Your display name has been saved.');
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message || 'Failed to update name.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !emailInput.includes('@')) {
      showToast('error', 'Validation Error', 'Please enter a valid email address.');
      return;
    }
    setIsUpdatingEmail(true);
    try {
      await updateEmail(emailInput.trim());
      showToast('success', 'Email Updated', `Email address set to ${emailInput}.`);
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message || 'Could not update email.');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('error', 'Validation Error', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'Validation Error', 'Passwords do not match.');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      showToast('success', 'Password Changed', 'Your password has been updated.');
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message || 'Could not change password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteAccountConfirm = async () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'DELETE') {
      showToast('error', 'Confirmation Error', 'Type DELETE to confirm account removal.');
      return;
    }
    setIsDeleting(true);
    try {
      await deleteAccount();
      showToast('info', 'Account Deleted', 'Your account has been removed.');
      navigate('/', { replace: true });
    } catch (err: any) {
      showToast('error', 'Deletion Failed', err.message || 'Failed to delete account.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8 min-w-0 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-main">
            Shipping Agent Profile & Account Settings
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Manage your agency credentials, email address, password, and port notification channels.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors shadow-[0_8px_30px_rgb(0,0,0,0.04)] self-start sm:self-auto cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-surface rounded-3xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 space-y-5">
        <div className="flex items-center gap-4 border-b border-border-subtle pb-5">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover border border-border-subtle shadow-xs"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-sky-100 border border-sky-200 text-sky-800 flex items-center justify-center font-bold text-xl shadow-xs">
              SA
            </div>
          )}

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-text-main">
                {user?.name || 'Shipping Agent'}
              </h2>
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                Ship Agent
              </span>
            </div>
            <p className="text-xs text-text-muted flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-text-caption" />
              <span>{user?.email || 'agent@Varunaa.demo'}</span>
            </p>
          </div>
        </div>

        {/* Agency Information Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-surface-subtle border border-border-subtle space-y-1">
            <span className="text-text-muted flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-text-caption" />
              Registered Shipping Line Agency:
            </span>
            <div className="font-semibold text-text-main text-sm">
              Mediterranean & North Sea Agency Ltd.
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-subtle border border-border-subtle space-y-1">
            <span className="text-text-muted flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-text-caption" />
              Port Communications Frequency:
            </span>
            <div className="font-semibold text-text-main text-sm">
              VHF Channel 14 / EDI Gateway Active
            </div>
          </div>
        </div>
      </div>

      {/* Security & Account Management Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form 1: Edit Profile Name & Email */}
        <div className="bg-surface rounded-3xl border border-border-subtle p-5 space-y-4 shadow-xs">
          <h3 className="text-sm font-semibold text-text-main border-b border-border-subtle pb-2.5 flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-sky-600" />
            <span>Update Profile Details</span>
          </h3>

          <form onSubmit={handleSaveProfileName} className="space-y-2">
            <label className="text-text-muted block font-medium">Agent Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                className="flex-1 bg-surface-subtle border border-border-subtle rounded-xl px-3 py-2 text-text-main focus:outline-hidden focus:border-sky-500"
              />
              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 cursor-pointer"
              >
                Save
              </button>
            </div>
          </form>

          <form onSubmit={handleUpdateEmail} className="space-y-2 pt-2">
            <label className="text-text-muted block font-medium">Email Address</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                className="flex-1 bg-surface-subtle border border-border-subtle rounded-xl px-3 py-2 text-text-main focus:outline-hidden focus:border-sky-500"
              />
              <button
                type="submit"
                disabled={isUpdatingEmail}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 cursor-pointer"
              >
                Update Email
              </button>
            </div>
          </form>
        </div>

        {/* Form 2: Change Password */}
        <form onSubmit={handleChangePassword} className="bg-surface rounded-3xl border border-border-subtle p-5 space-y-3 shadow-xs">
          <h3 className="text-sm font-semibold text-text-main border-b border-border-subtle pb-2.5 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-600" />
            <span>Change Password</span>
          </h3>

          <div>
            <label className="text-text-muted block mb-1 font-medium">New Password</label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-text-caption absolute left-3 top-2.5" />
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface-subtle border border-border-subtle rounded-xl pl-8 pr-3 py-2 text-text-main focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-text-muted block mb-1 font-medium">Confirm New Password</label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-text-caption absolute left-3 top-2.5" />
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface-subtle border border-border-subtle rounded-xl pl-8 pr-3 py-2 text-text-main focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isUpdatingPassword}
            className="w-full py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
          >
            {isUpdatingPassword ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Notification Preferences */}
      <div className="bg-surface rounded-3xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 space-y-4">
        <h3 className="text-sm font-semibold text-text-main border-b border-border-subtle pb-3">
          Agency Dispatch Alerts & Notification Preferences
        </h3>

        <div className="space-y-3.5 text-xs">
          <div className="flex items-center justify-between py-2 border-b border-border-subtle">
            <div>
              <div className="font-semibold text-text-main">Direct Berth Reallocation Notices</div>
              <div className="text-text-muted text-[11px]">
                Receive immediate notice when Port Authority adjusts assigned berths.
              </div>
            </div>
            <input
              type="checkbox"
              checked={ediAlerts}
              onChange={e => setEdiAlerts(e.target.checked)}
              className="accent-brand-teal w-4 h-4 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border-subtle">
            <div>
              <div className="font-semibold text-text-main">Demurrage Risk Threshold Advisories</div>
              <div className="text-text-muted text-[11px]">
                Notify operational superintendents when predicted wait time exceeds 8 hours.
              </div>
            </div>
            <input
              type="checkbox"
              checked={demurrageSms}
              onChange={e => setDemurrageSms(e.target.checked)}
              className="accent-brand-teal w-4 h-4 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="font-semibold text-text-main">Pilotage & Tug Fast Telemetry</div>
              <div className="text-text-muted text-[11px]">
                Transmit real-time boarding confirmations from Pilot Station Alpha.
              </div>
            </div>
            <input
              type="checkbox"
              checked={pilotageUpdates}
              onChange={e => setPilotageUpdates(e.target.checked)}
              className="accent-brand-teal w-4 h-4 cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSavePreferences}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-teal hover:bg-teal-700 transition-all cursor-pointer"
          >
            Save Notification Preferences
          </button>
        </div>
      </div>

      {/* Danger Zone: Delete Account */}
      <div className="p-5 rounded-3xl border border-rose-200 bg-rose-50/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-700">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Delete Shipping Agency Account</span>
          </div>
          <p className="text-rose-900/80 text-xs mt-1">
            Permanently delete your agency profile, credentials, and dispatch permissions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setDeleteConfirmationText('');
            setIsDeleteModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Account</span>
        </button>
      </div>

      {/* Delete Account Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-rose-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-main">Confirm Account Deletion</h3>
                <p className="text-xs text-text-muted">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Deleting your account will remove your access permissions and active sessions.
            </p>

            <div>
              <label className="text-text-main text-xs block mb-1 font-medium">
                Type <strong className="text-rose-600 font-bold">DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={e => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-surface-subtle border border-rose-300 rounded-xl px-3 py-2 text-text-main text-xs focus:outline-hidden focus:border-rose-600"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text-main hover:bg-surface-subtle border border-border-subtle cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccountConfirm}
                disabled={deleteConfirmationText.trim().toUpperCase() !== 'DELETE' || isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 transition-all cursor-pointer shadow-sm"
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
