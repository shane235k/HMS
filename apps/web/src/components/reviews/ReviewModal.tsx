// apps/web/src/components/reviews/ReviewModal.tsx
'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { apiFetch, ApiError } from '@/lib/api';
import { Star, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  hotelId: string;
  hotelName?: string;
  reservationId?: string;
  roomTypeId?: string;
  onSuccess?: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  hotelId,
  hotelName,
  reservationId,
  roomTypeId,
  onSuccess,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim().length < 5) {
      setError('Please provide at least 5 characters in your review comment.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiFetch(`/hotels/${hotelId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          rating,
          title: title.trim() || undefined,
          comment: comment.trim(),
          reservationId: reservationId || undefined,
          roomTypeId: roomTypeId || undefined,
        }),
      });

      setSubmitted(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setError(null);
    setTitle('');
    setComment('');
    setRating(5);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={submitted ? 'Review Submitted' : `Rate Your Stay at ${hotelName || 'Hotel'}`}
    >
      {submitted ? (
        <div className="text-center py-6 space-y-4 font-normal">
          <div className="w-12 h-12 bg-neutral-100 text-black rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-black" />
          </div>
          <div>
            <h4 className="text-base text-neutral-900 font-normal">Thank You for Your Review!</h4>
            <p className="text-xs text-neutral-500 font-normal mt-1">
              Your verified review helps future travelers make confident booking decisions.
            </p>
          </div>
          <div className="pt-2">
            <Button variant="primary" onClick={handleClose} className="w-full text-xs font-normal">
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 font-normal">
          {error && (
            <div className="p-3 bg-neutral-100 text-neutral-900 border border-neutral-300 rounded-lg text-xs font-normal">
              {error}
            </div>
          )}

          {/* Verified Stay Banner */}
          <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center gap-2 text-xs text-neutral-700">
            <ShieldCheck className="w-4 h-4 text-black shrink-0" />
            <span className="font-normal text-[11px]">
              Verified Stay Rating &bull; Visible publicly to prospective guests
            </span>
          </div>

          {/* Interactive Star Rating */}
          <div className="space-y-1.5 text-center py-2">
            <label className="text-xs text-neutral-600 block font-normal">Overall Score</label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating ?? rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1 focus:outline-none transition-transform hover:scale-110 cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        isFilled
                          ? 'fill-black text-black'
                          : 'fill-transparent text-neutral-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] font-mono text-neutral-500 block">
              {rating} of 5 Stars &mdash;{' '}
              {rating === 5
                ? 'Exceptional'
                : rating === 4
                ? 'Very Good'
                : rating === 3
                ? 'Average'
                : rating === 2
                ? 'Below Expectations'
                : 'Poor'}
            </span>
          </div>

          {/* Review Title */}
          <div>
            <label className="text-xs text-neutral-700 block mb-1 font-normal">
              Review Headline (Optional)
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Wonderful stay in the heart of the city"
              maxLength={120}
              className="text-xs font-normal"
            />
          </div>

          {/* Review Comment */}
          <div>
            <label className="text-xs text-neutral-700 block mb-1 font-normal">
              Your Review Experience *
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share what you liked, room comfort, cleanliness, and staff hospitality..."
              required
              minLength={5}
              maxLength={2000}
              rows={4}
              className="w-full text-xs font-normal p-3 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:border-black resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
            <Button type="button" variant="ghost" onClick={handleClose} className="text-xs font-normal">
              Cancel
            </Button>
            <Button type="submit" isLoading={loading} className="text-xs font-normal bg-black text-white hover:bg-neutral-800">
              Submit Verified Review
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

