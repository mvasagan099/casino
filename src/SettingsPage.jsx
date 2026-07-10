import React, { useState } from 'react';
import { Settings, X, Check, Copy, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from './api/client';
import { useAuth } from './context/AuthContext';
import './index.css';

export default function SettingsPage({ onClose }) {
  const { user, fetchUser } = useAuth();
  const [activeTab, setActiveTab] = useState('Account');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [countryCode, setCountryCode] = useState(user?.countryCode || '+1 Virgin Islands (U.S.), Canada, United States of Ame');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const res = await api.put('/auth/profile', { phoneNumber, countryCode });
      if (res.data.success) {
        if (fetchUser) {
          fetchUser();
        }
        toast.success('Profile updated successfully!');
      }
    } catch (err) {
      console.error('Failed to update profile', err);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="settings-page">
      <div className="settings-container">
        <div className="settings-header">
          <div className="settings-title">
            <Settings size={20} /> Settings
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="settings-content">
        <div className="settings-sidebar">
          <button className={`settings-nav-item ${activeTab === 'Account' ? 'active' : ''}`} onClick={() => setActiveTab('Account')}>Account</button>
          <button className={`settings-nav-item ${activeTab === 'Security' ? 'active' : ''}`} onClick={() => setActiveTab('Security')}>Security</button>

        </div>

          <div className="settings-main">
            {activeTab === 'Account' && (
              <>
            {/* Email Section */}
            <div className="settings-section">
              <div className="settings-section-header">
                <h3>Email</h3>
                <span className="badge-verified"><Check size={12} /> VERIFIED</span>
              </div>
              <p className="settings-desc">Your Email will be used for all official communication and account security purposes.</p>
              
              <div className="input-group">
                <label>Email</label>
                <input type="text" value={user?.email || ''} readOnly />
              </div>
            </div>

            {/* Phone Number Section */}
            <div className="settings-section">
              <div className="settings-section-header">
                <h3>Phone Number</h3>
              </div>
              <p className="settings-desc">We only service areas that are listed in the available country code list.</p>
              
              <div className="input-group">
                <label>Country Code <span className="text-danger">*</span></label>
                <select value={countryCode} onChange={e => setCountryCode(e.target.value)}>
                  <option value="+1 Virgin Islands (U.S.), Canada, United States of Ame">+1 Virgin Islands (U.S.), Canada, United States of Ame</option>
                  <option value="+44 United Kingdom">+44 United Kingdom</option>
                  <option value="+61 Australia">+61 Australia</option>
                  <option value="+91 India">+91 India</option>
                </select>
              </div>

              <div className="input-group">
                <label>Phone Number <span className="text-danger">*</span></label>
                <input type="text" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="Enter your phone number" />
              </div>

              <div className="settings-section-footer">
                <button className="btn-primary" onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
              </>
            )}

            {activeTab === 'Security' && (
              <>
                {/* Reset Password Section */}
                <div className="settings-section">
                  <div className="settings-section-header">
                    <h3>Reset Password</h3>
                  </div>
                  <p className="settings-desc">Keep your account secure by using a strong and unique password.</p>
                  
                  <div className="input-group">
                    <label>Current Password <span className="text-danger">*</span></label>
                    <input type="password" placeholder="Enter current password" />
                  </div>
                  <div className="input-group">
                    <label>New Password <span className="text-danger">*</span></label>
                    <input type="password" placeholder="Enter new password" />
                  </div>
                  <div className="input-group">
                    <label>Confirm New Password <span className="text-danger">*</span></label>
                    <input type="password" placeholder="Confirm new password" />
                  </div>
                  
                  <div className="settings-section-footer">
                    <button className="btn-primary">Update Password</button>
                  </div>
                </div>

                {/* Change Mail ID Section */}
                <div className="settings-section">
                  <div className="settings-section-header">
                    <h3>Change Mail ID</h3>
                  </div>
                  <p className="settings-desc">Update your registered email address.</p>
                  
                  <div className="input-group">
                    <label>Current Email</label>
                    <input type="text" value={user?.email || ''} readOnly />
                  </div>
                  <div className="input-group">
                    <label>New Email <span className="text-danger">*</span></label>
                    <input type="email" placeholder="Enter new email address" />
                  </div>
                  
                  <div className="settings-section-footer">
                    <button className="btn-primary">Update Email</button>
                  </div>
                </div>

                {/* Change Mobile No Section */}
                <div className="settings-section">
                  <div className="settings-section-header">
                    <h3>Change Mobile No</h3>
                  </div>
                  <p className="settings-desc">Update your registered mobile number for notifications and security.</p>
                  
                  <div className="input-group">
                    <label>Country Code <span className="text-danger">*</span></label>
                    <select value={countryCode} onChange={e => setCountryCode(e.target.value)}>
                      <option value="+1 Virgin Islands (U.S.), Canada, United States of Ame">+1 Virgin Islands (U.S.), Canada, United States of Ame</option>
                      <option value="+44 United Kingdom">+44 United Kingdom</option>
                      <option value="+61 Australia">+61 Australia</option>
                      <option value="+91 India">+91 India</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label>Mobile Number <span className="text-danger">*</span></label>
                    <input type="text" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="Enter your mobile number" />
                  </div>

                  <div className="settings-section-footer">
                    <button className="btn-primary" onClick={handleSaveProfile} disabled={isSaving}>
                      {isSaving ? 'Updating...' : 'Update Mobile'}
                    </button>
                  </div>
                </div>
            </>
          )}



          </div>
        </div>
      </div>
    </div>
  );
}
