import React, { useState } from 'react';
import { Mail, Send, CheckCircle, Phone } from 'lucide-react';

interface ContactFormProps {
  onSuccess: () => void;
  success: boolean;
}

export default function ContactForm({ onSuccess, success }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    setError('');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, phone, message } = formData;
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() && !phone.trim()) {if (!phone.trim()) {
  setError('Please enter your Phone Number.');
  return;
}
if (!email.trim() && !phone.trim()) {
  setError('Please enter at least one contact — Email or Phone Number.');
  return;
}
      setError('Please enter at least one contact — Email or Phone Number.');
      return;
    }
    if (!message.trim()) {
      setError('Please write your message before submitting.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, contact: email, phone: phone })
      });
      const resData = await response.json();
      if (resData.success) {
        onSuccess();
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      } else {
        setError(resData.error || 'Failed to submit query. Please try again.');
      }
    } catch (e) {
      setError('Connection failure. Check if your server is online.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lg:col-span-3 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
      <div className="flex items-center gap-2 mb-6">
        <Mail className="text-blue-600" size={18} />
        <span className="text-sm font-bold text-slate-800">Send an Official Message</span>
      </div>

      <form onSubmit={handleSend} className="space-y-4">

        {/* Row 1: Name + Email */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">
              Your Full Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={handleInput}
              disabled={loading}
              className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-sm focus:outline-hidden focus:border-blue-500 font-medium"
              placeholder="Amit Sharma"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={handleInput}
              disabled={loading}
              className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-sm focus:outline-hidden focus:border-blue-500 font-medium"
              placeholder="amit@gmail.com"
            />
          </div>
        </div>

        {/* Row 2: Phone + Subject */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
              <Phone size={11} className="text-slate-400" />
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              required
              value={formData.phone}
              onChange={handleInput}
              disabled={loading}
              className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-sm focus:outline-hidden focus:border-blue-500 font-medium font-mono"
              placeholder="9876543210"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">
              Subject Line
            </label>
            <input
              type="text"
              id="subject"
              value={formData.subject}
              onChange={handleInput}
              disabled={loading}
              className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-sm focus:outline-hidden focus:border-blue-500 font-medium"
              placeholder="Query regarding FS-3 plan"
            />
          </div>
        </div>

        {/* Row 3: Message */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-2">
            Message Content
          </label>
          <textarea
            id="message"
            rows={4}
            value={formData.message}
            onChange={handleInput}
            disabled={loading}
            className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-sm focus:outline-hidden focus:border-blue-500 font-medium"
            placeholder="Write your details or specific investment request here..."
          />
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-100">
            {error}
          </div>
        )}

        {/* Submit */}
        {success ? (
          <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold border border-emerald-100 flex items-center gap-2 animate-fade-in">
            <CheckCircle className="text-emerald-600" size={18} />
            <span>Thank you! Your message has been saved in our ledger. We will contact you soon.</span>
          </div>
        ) : (
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            <Send size={15} />
            {loading ? 'Submitting secure connection...' : 'Send Message'}
          </button>
        )}

      </form>
    </div>
  );
}