import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Star, Bug, Lightbulb, MessageCircle, X, CheckCircle2, Send } from 'lucide-react';
import { apiRequest } from '../services/api';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId?: string;
  defaultPlayerName?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  gameId,
  defaultPlayerName = '',
}) => {
  const [rating, setRating] = useState<number>(5);
  const [category, setCategory] = useState<'suggestion' | 'bug' | 'general'>('suggestion');
  const [message, setMessage] = useState('');
  const [playerName, setPlayerName] = useState(defaultPlayerName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Please enter your feedback message.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await apiRequest('/feedback', {
        method: 'POST',
        body: JSON.stringify({
          rating,
          category,
          message: message.trim(),
          player_name: playerName.trim() || undefined,
          game_id: gameId || undefined,
        }),
      });

      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setMessage('');
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-purple-100 relative overflow-hidden text-left"
          >
            {/* Top decorative glow */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#4A10A8] via-[#7016E6] to-[#8625FF]" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {isSubmitted ? (
              <div className="py-8 text-center flex flex-col items-center justify-center">
                <CheckCircle2 className="w-14 h-14 text-emerald-500 animate-bounce mb-3 stroke-[2.2]" />
                <h3 className="text-xl font-black text-[#1E1B4B]">Thank You!</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-[220px]">
                  Your feedback helps make ScoreSync even better for everyone! ❤️
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#1E1B4B]">Share Feedback</h3>
                    <p className="text-[11px] text-slate-400 font-semibold">We read every single review!</p>
                  </div>
                </div>

                {/* Rating Stars */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Your Rating
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        className="p-1 transition-transform active:scale-90 hover:scale-110 cursor-pointer"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= rating
                              ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                              : 'text-slate-200'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-slate-600 ml-2">
                      {rating === 5 ? 'Amazing! 🔥' : rating === 4 ? 'Great 👍' : rating === 3 ? 'Okay 😐' : rating === 2 ? 'Needs work 😕' : 'Poor 😞'}
                    </span>
                  </div>
                </div>

                {/* Category Pills */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCategory('suggestion')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer border ${
                        category === 'suggestion'
                          ? 'bg-purple-100 text-purple-900 border-purple-300 shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-purple-600" />
                      <span>Idea</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategory('bug')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer border ${
                        category === 'bug'
                          ? 'bg-rose-100 text-rose-900 border-rose-300 shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Bug className="w-3.5 h-3.5 text-rose-600" />
                      <span>Bug</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategory('general')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer border ${
                        category === 'general'
                          ? 'bg-indigo-100 text-indigo-900 border-indigo-300 shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-indigo-600" />
                      <span>General</span>
                    </button>
                  </div>
                </div>

                {/* Feedback Message */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Your Message
                  </label>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what you liked or what went wrong..."
                    className="w-full bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#1E1B4B] font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                  />
                  <div className="flex justify-end text-[10px] text-slate-400 font-semibold mt-0.5">
                    {message.length}/500
                  </div>
                </div>

                {/* Optional Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={30}
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="e.g. Alex"
                    className="w-full bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-[#1E1B4B] font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}

                {/* Submit CTA */}
                <button
                  type="submit"
                  disabled={isSubmitting || !message.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#4A10A8] via-[#7016E6] to-[#8625FF] text-white font-bold text-xs shadow-md shadow-purple-600/30 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Sending...' : 'Submit Feedback'}</span>
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
