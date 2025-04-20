import { useState } from 'react';
import { StarIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackModal = ({ isOpen, onClose }: FeedbackModalProps) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Here you would typically send this to your backend
    console.log('Feedback submitted:', { rating, feedback });
    
    // Show success message
    setSubmitted(true);
    
    // Reset form after 2 seconds and close
    setTimeout(() => {
      setRating(0);
      setFeedback('');
      setSubmitted(false);
      onClose();
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 relative border border-gray-800 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        {submitted ? (
          <div className="text-center py-8">
            <div className="flex justify-center mb-4">
              <div className="bg-green-500/20 p-3 rounded-full">
                <StarIconSolid className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Thank You!</h3>
            <p className="text-gray-400">Your feedback helps us improve PAN Shield.</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              How's your experience with PAN Shield?
            </h2>

            {/* Star Rating */}
            <div className="flex justify-center space-x-2 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="transform transition-transform hover:scale-110 focus:outline-none"
                >
                  {star <= (hoveredRating || rating) ? (
                    <StarIconSolid className="h-10 w-10 text-yellow-500" />
                  ) : (
                    <StarIcon className="h-10 w-10 text-gray-400 hover:text-yellow-500" />
                  )}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="feedback" className="block text-sm font-medium text-gray-300 mb-2">
                  Tell us more about your experience
                </label>
                <textarea
                  id="feedback"
                  rows={4}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="What did you like? What could be improved?"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="flex flex-col space-y-2">
                <button
                  type="submit"
                  disabled={!rating}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg px-4 py-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
                >
                  Submit Feedback
                </button>
                {!rating && (
                  <p className="text-sm text-gray-400 text-center">
                    Please select a rating to continue
                  </p>
                )}
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal; 